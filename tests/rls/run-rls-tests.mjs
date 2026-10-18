#!/usr/bin/env node
/**
 * Live Row Level Security harness.
 *
 * Spins up an ephemeral Postgres container (or uses a *local* SUPABASE_DB_URL),
 * applies supabase/migrations in order, then asserts cross-user isolation,
 * constraint behaviour, and queue atomicity against the real database.
 *
 * Remote connection strings are refused: this script creates and deletes rows.
 *
 * Usage:  pnpm test:rls
 * Exit:   0 when every check passes (or when the environment cannot run it),
 *         1 when a check fails.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skip(reason) {
  console.log(`\nSKIPPED: ${reason}`);
  console.log("The RLS suite is skipped, not passed. See docs/TEST-REPORT.md.");
  process.exit(0);
}

function dockerAvailable() {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) return false;
  return true;
}

function ensurePostgresImage() {
  const inspect = spawnSync("docker", ["image", "inspect", "postgres:16-alpine"], { stdio: "ignore" });
  if (inspect.status === 0) return true;
  console.log("Pulling postgres:16-alpine (first run only)…");
  const pull = spawnSync("docker", ["pull", "postgres:16-alpine"], { stdio: "inherit" });
  return pull.status === 0;
}

async function waitForPostgres(connectionString, attempts = 40) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return true;
    } catch {
      try {
        await client.end();
      } catch {
        // ignore
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

function isLocalHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "host.docker.internal";
}

async function main() {
  let containerName = null;
  let connectionString = null;

  const provided = process.env.SUPABASE_DB_URL;
  if (provided) {
    let host = "";
    try {
      host = new URL(provided).hostname;
    } catch {
      skip("SUPABASE_DB_URL is not a valid connection string.");
    }
    if (!isLocalHost(host)) {
      skip(
        `SUPABASE_DB_URL points at a remote host (${host}). This suite creates rows and refuses to run remotely.`,
      );
    }
    connectionString = provided;
    console.log(`Using SUPABASE_DB_URL (local host ${host}).`);
  } else {
    if (!dockerAvailable()) {
      skip("Docker is not available and SUPABASE_DB_URL is not set.");
    }
    if (!ensurePostgresImage()) {
      skip("Could not obtain the postgres:16-alpine image.");
    }

    containerName = `demandforge-rls-${Date.now().toString(36)}`;
    const port = 45000 + Math.floor(Math.random() * 2000);
    console.log(`Starting ephemeral Postgres container ${containerName} on port ${port}…`);
    execFileSync("docker", [
      "run",
      "--rm",
      "-d",
      "--name",
      containerName,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  }

  try {
    const ready = await waitForPostgres(connectionString);
    if (!ready) skip("Postgres did not become ready in time.");

    const client = new pg.Client({ connectionString });
    await client.connect();

    console.log("\nApplying auth bootstrap…");
    await client.query(readFileSync(join(here, "bootstrap.sql"), "utf8"));

    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      console.log(`Applying ${file}…`);
      await client.query(readFileSync(join(migrationsDir, file), "utf8"));
    }

    // ---------------------------------------------------------------------
    // Triggers
    // ---------------------------------------------------------------------
    console.log("\nProfile trigger");
    await client.query(
      `insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
       values ($1, 'owner@example.com', '{"display_name":"Owner One"}', now()),
              ($2, 'member@example.com', '{}', null)`,
      [USER_A, USER_B],
    );
    const claim = await client.query("select public.register_owner_setup_claim($1) as registered", [USER_A]);
    const owner = await client.query("select public.claim_initial_owner($1) as claimed", [USER_A]);
    const profiles = await client.query("select id, display_name, role from public.profiles order by id");
    const ownerProfile = profiles.rows.find((row) => row.id === USER_A);
    const memberProfile = profiles.rows.find((row) => row.id === USER_B);
    check("claimed setup account becomes owner", ownerProfile?.role === "owner");
    check("second pre-initialization signup remains member", memberProfile?.role === "member");
    check("display name comes from user metadata", ownerProfile?.display_name === "Owner One");
    check("initial owner claim is registered", claim.rows[0]?.registered === true);
    check("confirmed setup account claims owner atomically", owner.rows[0]?.claimed === true);

    let signupBlocked = false;
    try {
      await client.query(
        "insert into auth.users (id, email, raw_user_meta_data) values ($1, 'blocked@example.com', '{}')",
        [USER_C],
      );
    } catch {
      signupBlocked = true;
    }
    check("new auth signup is blocked after initialization", signupBlocked);

    // ---------------------------------------------------------------------
    // RLS coverage
    // ---------------------------------------------------------------------
    console.log("\nRLS coverage");
    const userTables = [
      "profiles",
      "sources",
      "collection_rules",
      "leads",
      "demo_projects",
      "demo_artifacts",
      "jobs",
      "job_attempts",
      "deployments",
      "outreach_records",
      "ai_usage",
      "audit_events",
      "api_tokens",
    ];
    const rls = await client.query(
      `select c.relname, c.relrowsecurity, (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    const byName = new Map(rls.rows.map((row) => [row.relname, row]));
    for (const table of userTables) {
      const row = byName.get(table);
      check(`${table} has RLS enabled`, Boolean(row?.relrowsecurity), row ? "" : "table missing");
      check(`${table} has policies`, Number(row?.policies ?? 0) > 0, `${row?.policies ?? 0} policies`);
    }

    // ---------------------------------------------------------------------
    // Ownership isolation
    // ---------------------------------------------------------------------
    console.log("\nOwnership isolation");

    /**
     * Runs a statement as a Supabase role with a specific JWT subject.
     * Successful work is committed so later assertions can see it; failures are
     * rolled back (and rethrown) so denial tests leave no trace.
     */
    async function asUser(userId, role, fn, { commit = true } = {}) {
      await client.query("begin");
      try {
        await client.query(`set local role ${role}`);
        if (userId) {
          await client.query("select set_config('request.jwt.claims', $1, true)", [
            JSON.stringify({ sub: userId, role }),
          ]);
        }

        const result = await fn();
        await client.query(commit ? "commit" : "rollback");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    // Insert data as each user through the real policies.
    const leadA = await asUser(USER_A, "authenticated", async () => {
      const result = await client.query(
        `insert into public.leads (user_id, original_text, normalized_content_hash, canonical_url)
         values ($1, 'Website for a dental clinic with booking', repeat('a', 64), 'https://example.com/a')
         returning id`,
        [USER_A],
      );
      return result.rows[0].id;
    });

    const leadB = await asUser(USER_B, "authenticated", async () => {
      const result = await client.query(
        `insert into public.leads (user_id, original_text, normalized_content_hash, canonical_url)
         values ($1, 'Shopify theme customisation', repeat('b', 64), 'https://example.com/b')
         returning id`,
        [USER_B],
      );
      return result.rows[0].id;
    });

    let anonymousDenied = false;
    await client.query("begin");
    try {
      await client.query("set local role anon");
      const result = await client.query("select id from public.leads");
      anonymousDenied = result.rows.length === 0;
      await client.query("rollback");
    } catch {
      await client.query("rollback");
      anonymousDenied = true;
    }
    check("anonymous users cannot access private leads", anonymousDenied);

    check("each user can insert their own lead", Boolean(leadA && leadB));

    await asUser(USER_A, "authenticated", async () => {
      const visible = await client.query("select id from public.leads");
      check("user A only sees their own leads", visible.rows.length === 1 && visible.rows[0].id === leadA);

      const otherUpdate = await client.query(
        "update public.leads set project_title = 'hijacked' where id = $1 returning id",
        [leadB],
      );
      check("user A cannot update user B's lead", otherUpdate.rows.length === 0);

      const otherDelete = await client.query("delete from public.leads where id = $1 returning id", [leadB]);
      check("user A cannot delete user B's lead", otherDelete.rows.length === 0);
    });

    let spoofFailed = false;
    try {
      await asUser(USER_A, "authenticated", async () => {
        await client.query(
          `insert into public.leads (user_id, original_text, normalized_content_hash)
           values ($1, 'spoofed ownership attempt text', repeat('c', 64))`,
          [USER_B],
        );
      });
    } catch {
      spoofFailed = true;
    }
    check("user A cannot insert a lead owned by user B", spoofFailed);

    let duplicateFailed = false;
    try {
      await asUser(USER_A, "authenticated", async () => {
        await client.query(
          `insert into public.leads (user_id, original_text, normalized_content_hash)
           values ($1, 'another text entirely for the hash check', repeat('a', 64))`,
          [USER_A],
        );
      });
    } catch (error) {
      duplicateFailed = error?.code === "23505";
    }
    check("duplicate content hash is rejected per user", duplicateFailed);

    // Sources and rules
    const sourceA = await asUser(USER_A, "authenticated", async () => {
      const result = await client.query(
        `insert into public.sources (user_id, source_type, source_name) values ($1, 'manual', 'Groups') returning id`,
        [USER_A],
      );
      return result.rows[0].id;
    });
    await asUser(USER_B, "authenticated", async () => {
      await client.query(
        `insert into public.sources (user_id, source_type, source_name) values ($1, 'manual', 'Other')`,
        [USER_B],
      );
    });
    await asUser(USER_A, "authenticated", async () => {
      const visible = await client.query("select id from public.sources");
      check(
        "user A only sees their own sources",
        visible.rows.length === 1 && visible.rows[0].id === sourceA,
      );
    });

    await asUser(USER_A, "authenticated", async () => {
      await client.query(
        `insert into public.collection_rules (user_id, name, keywords) values ($1, 'Websites', array['website'])`,
        [USER_A],
      );
      const visible = await client.query("select id from public.collection_rules");
      check("collection rules are isolated", visible.rows.length === 1);
    });

    // Demos: parent ownership is enforced on insert
    let demoOnForeignLead = false;
    try {
      await asUser(USER_A, "authenticated", async () => {
        await client.query(
          `insert into public.demo_projects (user_id, lead_id, title, slug) values ($1, $2, 'X', 'x-demo')`,
          [USER_A, leadB],
        );
      });
    } catch {
      demoOnForeignLead = true;
    }
    check("a demo cannot reference another user's lead", demoOnForeignLead);

    const demoA = await asUser(USER_A, "authenticated", async () => {
      const result = await client.query(
        `insert into public.demo_projects (user_id, lead_id, title, slug, generation_status)
         values ($1, $2, 'Dental concept', 'dental-concept', 'ready') returning id`,
        [USER_A, leadA],
      );
      return result.rows[0].id;
    });
    check("a demo for an owned lead can be created", Boolean(demoA));

    let artifactInsertDenied = false;
    try {
      await asUser(USER_A, "authenticated", async () => {
        await client.query(
          `insert into public.demo_artifacts (demo_id, files, checksum) values ($1, '{}'::jsonb, repeat('d', 64))`,
          [demoA],
        );
      });
    } catch {
      artifactInsertDenied = true;
    }
    check("generated artifacts can only be written by the trusted worker", artifactInsertDenied);

    await client.query(
      `insert into public.demo_artifacts (demo_id, files, checksum) values ($1, '{"index.html":"<p>x</p>"}'::jsonb, repeat('d', 64))`,
      [demoA],
    );
    await asUser(USER_A, "authenticated", async () => {
      const own = await client.query("select id from public.demo_artifacts");
      check("user A can read their own artifact", own.rows.length === 1);
    });
    await asUser(USER_B, "authenticated", async () => {
      const other = await client.query("select id from public.demo_artifacts");
      check("user B cannot read user A's artifact", other.rows.length === 0);
    });

    // Jobs
    await asUser(USER_A, "authenticated", async () => {
      await client.query(
        `insert into public.jobs (user_id, job_type, payload, idempotency_key)
         values ($1, 'analyze_lead', '{"leadId":"$2"}'::jsonb, 'analyze:one')`,
        [USER_A],
      );
      const visible = await client.query("select id from public.jobs");
      check("user A sees only their own jobs", visible.rows.length === 1);

      const mutation = await client.query(
        "update public.jobs set status = 'succeeded' where user_id = $1 returning id",
        [USER_A],
      );
      check("users cannot mutate job state directly", mutation.rows.length === 0);

      const attempts = await client.query("select id from public.job_attempts");
      check("users can read attempts only for their own jobs", attempts.rows.length === 0);
    });

    let duplicateJobFailed = false;
    try {
      await asUser(USER_A, "authenticated", async () => {
        await client.query(
          `insert into public.jobs (user_id, job_type, idempotency_key) values ($1, 'analyze_lead', 'analyze:one')`,
          [USER_A],
        );
      });
    } catch (error) {
      duplicateJobFailed = error?.code === "23505";
    }
    check("idempotency keys are unique", duplicateJobFailed);

    await asUser(USER_B, "authenticated", async () => {
      const visible = await client.query("select id from public.jobs");
      check("user B cannot see user A's jobs", visible.rows.length === 0);
    });

    // Deployments, outreach, usage, audit, tokens
    await client.query(
      `insert into public.deployments (user_id, demo_project_id, status) values ($1, $2, 'ready')`,
      [USER_A, demoA],
    );
    await asUser(USER_B, "authenticated", async () => {
      const visible = await client.query("select id from public.deployments");
      check("deployments are isolated", visible.rows.length === 0);
    });

    let outreachOnForeignLead = false;
    try {
      await asUser(USER_B, "authenticated", async () => {
        await client.query(
          `insert into public.outreach_records (user_id, lead_id, draft_content) values ($1, $2, 'hi')`,
          [USER_B, leadA],
        );
      });
    } catch {
      outreachOnForeignLead = true;
    }
    check("outreach cannot target another user's lead", outreachOnForeignLead);

    await client.query(
      `insert into public.ai_usage (user_id, model, operation, input_usage, output_usage)
       values ($1, 'gemini-test', 'lead_analysis', 10, 5)`,
      [USER_A],
    );
    await asUser(USER_B, "authenticated", async () => {
      const usage = await client.query("select id from public.ai_usage");
      check("AI usage rows are isolated", usage.rows.length === 0);
      const audit = await client.query("select id from public.audit_events");
      check("audit events are isolated", audit.rows.length === 0);
    });

    await asUser(USER_A, "authenticated", async () => {
      await client.query(
        `insert into public.api_tokens (user_id, name, token_hash, token_prefix) values ($1, 'laptop', repeat('e', 64), 'df_abcdefgh')`,
        [USER_A],
      );
    });
    await asUser(USER_B, "authenticated", async () => {
      const tokens = await client.query("select id from public.api_tokens");
      check("extension tokens are isolated", tokens.rows.length === 0);
    });

    // Anonymous access must be impossible
    let anonDenied = false;
    try {
      await client.query("begin");
      await client.query("set local role anon");
      await client.query("select count(*) from public.leads");
    } catch {
      anonDenied = true;
    } finally {
      await client.query("rollback");
    }
    check("the anon role cannot read leads", anonDenied);

    // ---------------------------------------------------------------------
    // Queue functions
    // ---------------------------------------------------------------------
    console.log("\nQueue behaviour");

    let userClaimDenied = false;
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select * from public.claim_jobs('worker-user', 1)");
    } catch {
      userClaimDenied = true;
    } finally {
      await client.query("rollback");
    }
    check("authenticated users cannot claim jobs", userClaimDenied);

    await client.query("delete from public.jobs");
    await client.query(
      `insert into public.jobs (user_id, job_type, payload) values
        ($1, 'analyze_lead', '{}'::jsonb),
        ($1, 'analyze_lead', '{}'::jsonb),
        ($1, 'generate_demo', '{}'::jsonb)`,
      [USER_A],
    );

    await client.query("begin");
    await client.query("set local role service_role");
    const claimedOne = await client.query(
      "select id, status, attempt_count from public.claim_jobs('worker-1', 2, array['analyze_lead'])",
    );
    check(
      "claim_jobs only returns jobs of the requested type",
      claimedOne.rows.length === 2 && claimedOne.rows.every((row) => row.status === "running"),
    );
    check(
      "claiming increments the attempt counter",
      claimedOne.rows.every((row) => row.attempt_count === 1),
    );

    const claimedTwo = await client.query("select id from public.claim_jobs('worker-2', 5)");
    check("a second worker gets only the unclaimed job", claimedTwo.rows.length === 1);

    const claimedThree = await client.query("select id from public.claim_jobs('worker-3', 5)");
    check("claims are exhaustive and non-overlapping", claimedThree.rows.length === 0);

    await client.query(
      "update public.jobs set locked_at = now() - interval '10 minutes' where status = 'running'",
    );
    const recovered = await client.query("select public.recover_stale_jobs(300) as recovered");
    check("stale locks are recovered", Number(recovered.rows[0].recovered) >= 1);

    const afterRecovery = await client.query("select status from public.jobs order by status");
    check(
      "recovered jobs return to the queue",
      afterRecovery.rows.every((row) => row.status === "queued"),
    );

    await client.query(
      "update public.jobs set status = 'running', attempt_count = max_attempts, locked_at = now() - interval '10 minutes'",
    );
    await client.query("select public.recover_stale_jobs(300)");
    const exhausted = await client.query("select status from public.jobs");
    check(
      "jobs that exhausted their attempts are failed, not retried",
      exhausted.rows.every((row) => row.status === "failed"),
    );
    await client.query("rollback");

    // ---------------------------------------------------------------------
    // Triggers and service role
    // ---------------------------------------------------------------------
    console.log("\nMaintenance behaviour");
    const before = await client.query("select created_at, updated_at from public.leads where id = $1", [
      leadA,
    ]);
    await client.query("select pg_sleep(0.01)");
    await client.query("update public.leads set project_title = 'Updated title' where id = $1", [leadA]);
    const after = await client.query("select created_at, updated_at from public.leads where id = $1", [
      leadA,
    ]);
    check(
      "updated_at is maintained by trigger",
      new Date(after.rows[0].updated_at) > new Date(before.rows[0].updated_at),
    );

    await client.query("begin");
    await client.query("set local role service_role");
    const serviceLeads = await client.query("select id from public.leads");
    check("the service role bypasses RLS for trusted workers", serviceLeads.rows.length === 2);
    await client.query("rollback");

    await client.end();
  } catch (error) {
    console.error("\nHarness error:", error?.message ?? error);
    failed += 1;
    failures.push(`harness error: ${error?.message ?? error}`);
  } finally {
    if (containerName) {
      spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    }
  }

  console.log(`\nRLS checks: ${passed} passed, ${failed} failed.`);
  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
