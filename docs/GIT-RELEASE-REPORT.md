# Git Release Report

Published branch: `main`

Remote: `origin` → `https://github.com/hasibulalamh/DemandForge-AI.git`

## Commit sequence

| #   | Commit    | Message                                                       | Scope                                                                                                          |
| --- | --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `55b12e4` | `chore(config): add repository tooling and ignore rules`      | Root tooling, package metadata, build/test config, lockfile, placeholder public assets                         |
| 2   | `ecfba23` | `docs: add project documentation and setup guidance`          | README, AGENTS, env template, docs set, commit plan                                                            |
| 3   | `06bfb71` | `feat(auth): add session protection and shared shell`         | Auth flows, protected layout, shell components, session helpers, public route smoke tests                      |
| 4   | `449380d` | `feat(database): add schema, RLS, and queue foundations`      | Supabase migrations, seed data, typed schema, RLS harness                                                      |
| 5   | `ac5cfbc` | `feat(leads): add sources, leads, and account workflows`      | Dashboard, leads, sources, outreach, settings, API routes, shared validation/security helpers, core unit tests |
| 6   | `413f8be` | `feat(ai): add Gemini, jobs, demos, and deployment workflows` | Gemini, job queue, demo rendering, Vercel client, demo/deploy routes, AI unit tests                            |
| 7   | `ae6cf61` | `test(security): add security regression coverage`            | Security regression suite                                                                                      |
| 8   | `8e8a8f8` | `feat(extension): add Chrome MV3 importer`                    | Chrome extension source, manifest, build tooling                                                               |

## Validation results

Executed from the repository root after the code was staged and formatted:

- `pnpm typecheck` ✅
- `pnpm typecheck:extension` ✅
- `pnpm lint` ✅
- `pnpm format:check` ✅
- `pnpm test` ✅
- `pnpm test:rls` ✅
- `pnpm test:e2e` ✅
- `pnpm build` ✅
- `pnpm build:extension` ✅

Notes:

- `.env.local` remains ignored.
- `.env.example` is tracked and contains placeholders only.
- No remote divergence was present before push.
- The push completed successfully with a normal fast-forward update.
