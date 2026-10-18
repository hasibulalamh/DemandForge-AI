/**
 * Minimal in-memory stand-in for the Supabase admin client.
 *
 * Only the query shapes used by the code under test are implemented:
 * from(table).select/insert/update/delete with eq/in/not/order/limit/range and
 * the terminal calls maybeSingle/single or `await` (thenable). Unique-constraint
 * behaviour is emulated for the `leads` table so duplicate detection can be
 * tested — this is a test double, not a Postgres emulator.
 */

export type FakeRow = Record<string, unknown>;
export type FakeTables = Record<string, FakeRow[]>;

export interface FakeAdmin {
  from: (table: string) => unknown;
  auth: { admin: { deleteUser: (id: string) => Promise<{ error: null }> } };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: null }>;
  __inserted: Array<{ table: string; row: FakeRow }>;
  __tables: FakeTables;
}

const UNIQUE_KEYS: Record<string, string[][]> = {
  leads: [
    ["user_id", "normalized_content_hash"],
    ["user_id", "canonical_url"],
  ],
  sources: [["user_id", "source_url"]],
  jobs: [["idempotency_key"]],
  demo_projects: [["user_id", "slug"]],
  demo_artifacts: [["demo_id"]],
  api_tokens: [["token_hash"]],
};

function isUniqueViolation(table: string, rows: FakeRow[], candidate: FakeRow): string | null {
  for (const keys of UNIQUE_KEYS[table] ?? []) {
    // Partial unique indexes: skip when any key column is null.
    if (keys.some((key) => candidate[key] === null || candidate[key] === undefined)) continue;
    const clash = rows.some((row) => keys.every((key) => row[key] === candidate[key]));
    if (clash) return keys.join(",");
  }
  return null;
}

export function createFakeAdmin(initial: FakeTables = {}): FakeAdmin {
  const tables: FakeTables = { ...initial };
  const inserted: Array<{ table: string; row: FakeRow }> = [];

  function rowsFor(table: string): FakeRow[] {
    tables[table] ??= [];
    return tables[table];
  }

  function from(table: string) {
    const data = rowsFor(table);
    const filters: Array<(row: FakeRow) => boolean> = [];
    let mode: "select" | "insert" | "update" | "delete" = "select";
    let payload: FakeRow | null = null;
    let conflictTarget: string | null = null;
    let max = Number.POSITIVE_INFINITY;

    const matches = (row: FakeRow) => filters.every((filter) => filter(row));

    const finish = async (single: boolean) => {
      let working = data.filter(matches);

      if (mode === "insert" && payload) {
        const now = new Date().toISOString();
        // Emulate the column defaults the application relies on.
        const defaults: FakeRow =
          table === "jobs"
            ? {
                status: "queued",
                attempt_count: 0,
                max_attempts: 3,
                scheduled_at: now,
                created_at: now,
                updated_at: now,
              }
            : table === "leads"
              ? { analysis_status: "pending", pipeline_status: "new", created_at: now, updated_at: now }
              : { created_at: now, updated_at: now };
        const row: FakeRow = { ...defaults, id: `fake-${table}-${data.length + 1}`, ...payload };
        row.id ??= `fake-${table}-${data.length + 1}`;
        const violation = isUniqueViolation(table, data, row);
        if (violation) {
          return { data: null, error: { code: "23505", message: `duplicate key value (${violation})` } };
        }
        if (conflictTarget) {
          const keys = conflictTarget.split(",");
          const existing = data.find((candidate) => keys.every((key) => candidate[key] === row[key]));
          if (existing) {
            Object.assign(existing, row);
            return { data: existing, error: null };
          }
        }
        data.push(row);
        inserted.push({ table, row });
        return { data: row, error: null };
      }

      if (mode === "update" && payload) {
        for (const row of working) Object.assign(row, payload);
        // `update` is applied to all matching rows when not single.
        return { data: single ? (working[0] ?? null) : working, error: null };
      }

      if (mode === "delete") {
        for (const row of working) {
          const index = data.indexOf(row);
          if (index >= 0) data.splice(index, 1);
        }
        return { data: null, error: null, count: working.length };
      }

      working = working.slice(0, max);
      if (single) return { data: working[0] ?? null, error: null };
      return { data: working, error: null, count: working.length };
    };

    const api = {
      select() {
        return api;
      },
      insert(row: FakeRow) {
        mode = "insert";
        payload = row;
        return api;
      },
      upsert(row: FakeRow, options?: { onConflict?: string }) {
        mode = "insert";
        payload = row;
        conflictTarget = options?.onConflict ?? null;
        return api;
      },
      update(patch: FakeRow) {
        mode = "update";
        payload = patch;
        return api;
      },
      delete() {
        mode = "delete";
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      is(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      not() {
        return api;
      },
      order() {
        return api;
      },
      limit(value: number) {
        max = value;
        return api;
      },
      range() {
        return api;
      },
      maybeSingle() {
        return finish(true);
      },
      single() {
        return finish(false);
      },
      then<TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return finish(false).then(onfulfilled, onrejected);
      },
    };

    return api;
  }

  return {
    from,
    auth: { admin: { deleteUser: async () => ({ error: null }) } },
    rpc: async (fn: string) => {
      if (fn === "recover_stale_jobs") return { data: 0, error: null };
      if (fn === "claim_jobs") return { data: [], error: null };
      return { data: null, error: null };
    },
    __inserted: inserted,
    __tables: tables,
  } as FakeAdmin;
}
