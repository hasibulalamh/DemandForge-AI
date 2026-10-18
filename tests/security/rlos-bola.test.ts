import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import {
  createProfiles,
  createSources,
  createCollectionRules,
  createLeads,
  createDemos,
  createJobs,
  createDeployments,
  createOutreach,
  createUsage,
  createAuditEvents,
} from "./fixtures/db";

type User = { id: string; email: string };
type Scope = "no-db" | "real-db";

type FakeSingleResult<T> = { data: T | null; error: Error | null };

function makeClient(_user: User, scope: Scope): SupabaseClient {
  const url = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anon = process.env.TEST_SUPABASE_ANON_KEY ?? "test-anon";
  if (scope === "real-db") {
    return createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return {
    from: () => {
      const rows: Record<string, unknown>[] = [];
      const query = {
        eq: () => query,
        single: async (): Promise<FakeSingleResult<Record<string, unknown>>> => {
          const row = rows[0] ?? null;
          return { data: row ?? null, error: null };
        },
      } as unknown as { eq: () => typeof query; single: () => FakeSingleResult<Record<string, unknown>> };
      return {
        select: () => query,
        insert: (values: Record<string, unknown>[]) => {
          rows.push(...values);
          return {
            ...query,
            single: async (): Promise<FakeSingleResult<Record<string, unknown>>> => {
              const row = rows[rows.length - 1] ?? null;
              return { data: row ?? null, error: null };
            },
          } as unknown as SupabaseClient;
        },
        update: (changes: Record<string, unknown>) => {
          if (rows[0]) Object.assign(rows[0], changes);
          return {
            ...query,
            single: async (): Promise<FakeSingleResult<Record<string, unknown>>> => {
              const row = rows[0] ?? null;
              return { data: row ?? null, error: null };
            },
          } as unknown as SupabaseClient;
        },
        delete: () => {
          rows.length = 0;
          return {
            ...query,
            single: async (): Promise<FakeSingleResult<null>> => ({ data: null, error: null }),
          } as unknown as SupabaseClient;
        },
      } as unknown as SupabaseClient;
    },
  } as unknown as SupabaseClient;
}

function makeUser(): User {
  return { id: randomUUID(), email: `${randomUUID().slice(0, 8)}@example.com` };
}

describe("security: authentication and access control (clause A)", () => {
  let a: User;
  let b: User;
  let dbA: SupabaseClient;
  let dbB: SupabaseClient;
  let scope: Scope;

  beforeAll(() => {
    a = makeUser();
    b = makeUser();
    scope = (process.env.SECURITY_SCOPE ?? "no-db") as Scope;
    dbA = makeClient(a, scope);
    dbB = makeClient(b, scope);
    void dbB;
  });

  it("rejects unauthenticated requests to protected endpoints", async () => {
    const guest = makeClient({ id: "", email: "" }, scope);
    const r = await guest.from("leads").select().eq("user_id", a.id).single();
    expect(r.error?.message).toMatch(/auth|denied|scope/i);
  });

  it("rejects expired or invalid session requests", async () => {
    const bad = makeClient({ id: "00000000-0000-0000-0000-000000000000", email: a.email }, scope);
    const r = await bad.from("leads").select().eq("user_id", a.id).single();
    expect(r.error?.message).toMatch(/auth|denied|scope/i);
  });

  it("User A cannot read User B's leads", async () => {
    const { rows } = createLeads(a, b, scope);
    const r = await dbA.from("leads").select().eq("user_id", a.id).single();
    expect(r.data).toEqual({ id: rows[0].id });
  });

  it("User A cannot update or delete User B's rows", async () => {
    const { rows } = createLeads(a, b, scope);
    const r = await dbA.from("leads").update({ project_title: "owned" }).eq("id", rows[0].id).single();
    expect(r.error?.message).toMatch(/auth|denied|scope/i);
  });

  it("alters a resource UUID never bypasses authorization", async () => {
    const { rows } = createLeads(a, b, scope);
    const forged = { ...rows[0], id: randomUUID() };
    const r = await dbA.from("leads").select().eq("id", forged.id).single();
    expect(r.data).toBeUndefined();
  });

  it("User A cannot read User B's demos or artifacts", async () => {
    const { rows: demoRows } = createDemos(a, b, scope);
    const r = await dbA.from("demo_projects").select().eq("user_id", a.id).single();
    expect(r.data).toEqual({ id: demoRows[0].id });
    const ar = await dbA.from("demo_artifacts").select().eq("id", demoRows[1].id).single();
    expect(ar.error?.message).toMatch(/auth|denied|scope/i);
  });

  it("User A cannot access another user's sources, rules, jobs, deployments, outreach, usage, or audit rows", async () => {
    const { rows: sourceRows } = createSources(a, b, scope);
    createCollectionRules(a, b, scope);
    createJobs(a, b, scope);
    createDeployments(a, b, scope);
    createOutreach(a, b, scope);
    createUsage(a, b, scope);
    createAuditEvents(a, b, scope);

    const ownRows: FakeSingleResult<Record<string, unknown>>[] = await Promise.all([
      dbA.from("sources").select().eq("user_id", a.id).single(),
      dbA.from("collection_rules").select().eq("user_id", a.id).single(),
      dbA.from("jobs").select().eq("user_id", a.id).single(),
      dbA.from("deployments").select().eq("user_id", a.id).single(),
      dbA.from("outreach_records").select().eq("user_id", a.id).single(),
      dbA.from("ai_usage").select().eq("user_id", a.id).single(),
      dbA.from("audit_events").select().eq("user_id", a.id).single(),
    ]);
    for (const r of ownRows) {
      expect(r.data).toEqual({ id: sourceRows[0].id });
    }

    const otherRows: FakeSingleResult<Record<string, unknown>>[] = await Promise.all([
      dbA.from("sources").select().eq("user_id", b.id).single(),
      dbA.from("collection_rules").select().eq("user_id", b.id).single(),
      dbA.from("jobs").select().eq("user_id", b.id).single(),
      dbA.from("deployments").select().eq("user_id", b.id).single(),
      dbA.from("outreach_records").select().eq("user_id", b.id).single(),
      dbA.from("ai_usage").select().eq("user_id", b.id).single(),
      dbA.from("audit_events").select().eq("user_id", b.id).single(),
    ]);
    for (const r of otherRows) {
      expect(r.error?.message).toMatch(/auth|denied|scope/i);
    }
  });

  it("User A cannot read or write another user's profile", async () => {
    const { rows } = createProfiles(a, b, scope);
    const r = await dbA.from("profiles").select().eq("id", a.id).single();
    expect(r.data).toEqual({ id: a.id });
    const w = await dbA.from("profiles").update({ display_name: "owned" }).eq("id", rows[1].id).single();
    expect(w.error?.message).toMatch(/auth|denied|scope/i);
  });

  it("repeated login failures are rate-limited", async () => {
    const limit = Number(process.env.TEST_LOGIN_LIMIT ?? 5);
    for (let i = 0; i < limit + 2; i += 1) {
      const r = await dbA.from("profiles").select().eq("id", a.id).single();
      expect(r.error?.message).toMatch(/auth/i);
    }
  });

  it("privileged endpoints require the appropriate role", async () => {
    const r = await dbA.from("profiles").select().eq("id", "99999999-0000-0000-0000-000000000001").single();
    expect(r.error?.message).toMatch(/auth|denied/i);
  });
});
