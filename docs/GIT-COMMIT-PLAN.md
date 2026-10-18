# Git Commit Plan

This plan records the intended commit sequence for publishing the current codebase to GitHub.
Generated artifacts such as `.next/`, `test-results/`, `playwright-report/`, and `extension/dist/`
remain excluded from version control.

## 1. `chore(config): add repository tooling and ignore rules`

Files:

- `.gitignore`
- `.prettierignore`
- `.prettierrc.json`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `vercel.json`
- `vitest.config.mts`
- `vitest.security.config.ts`

## 2. `docs: add project documentation and setup guidance`

Files:

- `AGENTS.md`
- `README.md`
- `docs/*.md`
- `.env.example`

## 3. `feat(auth): implement setup, login, callback, and session protection`

Files:

- `src/app/(auth)/`
- `src/app/actions/auth.ts`
- `src/app/auth/callback/`
- `src/app/layout.tsx`
- `src/proxy.ts`
- `src/lib/auth.ts`
- `src/lib/client-api.ts`
- `src/lib/public-config.ts`
- `src/lib/supabase/`
- `tests/e2e/public.spec.ts`
- `tests/unit/secret-exposure.test.ts`

## 4. `feat(database): add Supabase schema, RLS, and queue foundations`

Files:

- `supabase/migrations/`
- `supabase/seed.sql`
- `src/types/database.ts`
- `tests/rls/`

## 5. `feat(app): add dashboard, sources, leads, outreach, and settings workflows`

Files:

- `src/app/(app)/`
- `src/components/`
- `src/features/dashboard/`
- `src/features/leads/`
- `src/features/outreach/`
- `src/features/settings/`
- `src/features/sources/`
- `src/features/usage/`
- `src/lib/api/`
- `src/lib/audit.ts`
- `src/lib/scoring.ts`
- `src/lib/security/`
- `src/lib/slug.ts`
- `src/lib/utils.ts`
- `src/lib/validation/`
- `tests/unit/import.test.ts`
- `tests/unit/scoring.test.ts`
- `tests/unit/security.test.ts`
- `tests/unit/validation.test.ts`

## 6. `feat(ai): add Gemini analysis, jobs, demos, and deployment workflows`

Files:

- `src/features/demo-studio/`
- `src/features/demos/`
- `src/lib/demo/`
- `src/lib/gemini/`
- `src/lib/jobs/`
- `src/lib/vercel/`
- `src/app/api/v1/`
- `tests/unit/demo.test.ts`
- `tests/unit/gemini-analysis.test.ts`
- `tests/unit/gemini-client.test.ts`
- `tests/unit/jobs.test.ts`
- `tests/unit/vercel.test.ts`
- `tests/unit/workflow.test.ts`

## 7. `feat(extension): add Chrome MV3 importer`

Files:

- `extension/`

## Notes

- Stage each commit as a coherent feature slice; do not include generated build outputs.
- Keep secrets out of history; `.env.local` stays ignored and `.env.example` contains placeholders only.
