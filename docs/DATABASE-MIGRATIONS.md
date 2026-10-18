# Database Migrations

Migrations are versioned SQL committed to the repository. The dashboard is never the source of
truth for schema.

## Files (applied in lexical order)

| File                                                           | Contents                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261017090000_extensions_and_tables.sql` | `pgcrypto`, enums, all tables, constraints, indexes, `updated_at` triggers, new-user profile trigger |
| `supabase/migrations/20261017090100_rls.sql`                   | Grants and RLS policies for every user-owned table                                                   |
| `supabase/migrations/20261017090200_job_queue.sql`             | `claim_jobs()` and `recover_stale_jobs()` (`security definer`, `service_role` only)                  |
| `supabase/seed.sql`                                            | Optional sample data attached to the first profile                                                   |

## Commands

```bash
# Apply to the linked project
npx supabase link --project-ref <ref>
pnpm db:push

# Reset a local Supabase stack and re-run migrations + seed
pnpm db:reset

# Regenerate typed definitions after schema changes
pnpm db:types
```

Direct SQL (e.g. a CI database) works too:

```bash
for f in supabase/migrations/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
```

## Rules

1. **Never edit an applied migration in production.** Add a new timestamped file.
2. A schema change requires: migration → `src/types/database.ts` update (or regeneration) →
   feature code → tests → docs (`BACKEND-SCHEMA.md`, `CHANGELOG.md`).
3. RLS must be enabled in the same change that creates a user-owned table. Add policies for
   select/insert/update/delete as appropriate.
4. Keep `security definer` functions minimal, with `set search_path = public`, and revoke execute
   from `public`, `anon`, and `authenticated`.
5. Test every migration against the harness:

```bash
pnpm test:rls
```

The harness starts an ephemeral Postgres 16 container, applies `tests/rls/bootstrap.sql` (auth
schema, roles, `auth.uid()`), then all migrations, then runs 63 assertions covering RLS,
constraints, triggers, and queue atomicity. Remote `SUPABASE_DB_URL` values are refused because
the harness writes and deletes rows.

## Rollback policy

- Forward-only migrations. To undo a change, write a new migration that reverses it.
- Destructive column drops require a documented data-retention decision in
  `docs/SECURITY.md` and `docs/CHANGELOG.md`.
- Account deletion is handled by foreign-key cascades, not by a migration.

## Local Supabase note

`supabase start` uses the Supabase CLI Docker stack (ports 54321/54322). The harness works with
either that stack (when `SUPABASE_DB_URL` points to a local host) or a plain Postgres container.
