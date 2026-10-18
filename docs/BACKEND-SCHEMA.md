# Backend Schema

Source of truth: `supabase/migrations/20261017090000_extensions_and_tables.sql`.
Typed definitions: `src/types/database.ts`.

## Conventions

- UUID primary keys (`gen_random_uuid()`), `timestamptz` timestamps, `created_at`/`updated_at`
  maintained by `set_updated_at()` triggers.
- Enums for closed vocabularies; JSONB only for evidence, feature lists, and payloads.
- Ownership columns reference `auth.users(id) on delete cascade`, so deleting an account removes
  all owned data.
- Text lengths are constrained at the database level in addition to Zod validation.

## Enums

| Enum                    | Values                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `user_role`             | owner, member                                                                                 |
| `source_type`           | manual, chrome_extension, meta_api (reserved)                                                 |
| `connection_status`     | manual_only, connected, disconnected, error                                                   |
| `budget_status`         | unknown, unclear, stated, range                                                               |
| `signal_level`          | unknown, low, medium, high                                                                    |
| `analysis_status`       | pending, queued, analyzing, analyzed, failed                                                  |
| `pipeline_status`       | new, shortlisted, rejected, demo_generated, deployed, contacted, replied, won, lost, archived |
| `generation_status`     | draft, queued, generating, ready, failed, approved                                            |
| `deployment_status`     | not_deployed, queued, deploying, deployed, failed                                             |
| `job_status`            | queued, running, succeeded, failed, canceled                                                  |
| `job_attempt_status`    | running, succeeded, failed                                                                    |
| `deployment_provider`   | vercel                                                                                        |
| `deployment_run_status` | queued, building, ready, error, canceled                                                      |
| `outreach_channel`      | facebook_message, email, other                                                                |
| `outreach_status`       | draft, ready, sent, replied, no_response, converted, archived                                 |
| `ai_usage_status`       | success, error                                                                                |

## Tables

### `profiles`

| Column                  | Type        | Notes                                           |
| ----------------------- | ----------- | ----------------------------------------------- |
| id                      | uuid PK     | references `auth.users(id)` cascade             |
| display_name            | text        | ≤ 120 chars                                     |
| role                    | user_role   | default `member`; first profile becomes `owner` |
| created_at / updated_at | timestamptz | trigger maintained                              |

Trigger `on_auth_user_created` inserts a profile from `raw_user_meta_data.display_name` (falls
back to the email local part).

### `sources`

`id`, `user_id` (FK cascade), `source_type`, `source_name` (1–160), `source_url` (≤2048,
nullable), `connection_status`, `config` JSONB (object, non-secret only), `last_synced_at`.
Unique `(user_id, source_url)` where URL is not null. Index `(user_id, created_at desc)`.

### `collection_rules`

`id`, `user_id`, `name`, `keywords text[]`, `excluded_keywords text[]`,
`project_categories text[]`, `is_enabled`. Arrays capped: 100 keywords, 50 categories.
Index `(user_id, created_at desc)`.

### `leads`

| Column                                                          | Type                         | Notes                                            |
| --------------------------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| id                                                              | uuid PK                      |                                                  |
| user_id                                                         | uuid                         | FK cascade                                       |
| source_id                                                       | uuid                         | FK `sources` on delete set null                  |
| external_reference                                              | text                         | extension/capture reference                      |
| canonical_url                                                   | text                         | normalized https URL                             |
| original_text                                                   | text                         | 1–20,000 chars                                   |
| normalized_content_hash                                         | text                         | SHA-256 hex, exactly 64 chars                    |
| project_category / title / summary                              | text                         | model output                                     |
| required_features / suggested_features / technology_preferences | jsonb                        | arrays                                           |
| budget_status / budget_amount / budget_currency                 | enum, numeric(12,2), char(3) | amount ≥ 0, currency `^[A-Z]{3}$`                |
| urgency / hiring_intent                                         | signal_level                 | default `unknown`                                |
| requirements_clarity / lead_score / confidence_score            | smallint/integer             | 0–100 checks                                     |
| evidence                                                        | jsonb                        | quotes, score breakdown, next action, timestamps |
| analysis_status / pipeline_status                               | enums                        | defaults `pending` / `new`                       |
| published_at                                                    | timestamptz                  | optional                                         |
| created_at / updated_at                                         | timestamptz                  |                                                  |

Unique `(user_id, normalized_content_hash)`; unique `(user_id, canonical_url)` where URL is not
null. Indexes on `(user_id, created_at desc)`, analysis status, pipeline status, and score.

### `demo_projects`

`id`, `user_id`, `lead_id` (FK cascade), `title`, `slug` (`^[a-z0-9]+(-[a-z0-9]+)*$`, 3–80),
`template_name`, `generation_status`, `artifact_storage_path` (`db://demo_artifacts/<id>`),
`preview_url`, `deployment_status`, `deployment_url`, `vercel_project_reference`,
`deployment_error`, `approved_at`, `deployed_at`, timestamps.
Unique `(user_id, slug)`; index on `lead_id`.

### `demo_artifacts`

`id`, `demo_id` (FK cascade, unique), `files` JSONB (path→content), `manifest` JSONB,
`byte_size` (0–2MB check), `checksum`, `created_at`. One artifact per demo; regeneration
replaces it and clears approval.

### `jobs`

`id`, `user_id`, `job_type`, `status`, `payload` JSONB (objective, no secrets),
`idempotency_key` (≤200, unique where not null), `attempt_count`, `max_attempts` (1–10),
`scheduled_at`, `started_at`, `completed_at`, `last_error`, `locked_by`, `locked_at`,
timestamps.
Indexes: `(status, scheduled_at) where status='queued'`, `(status, locked_at) where status='running'`,
`(user_id, created_at desc)`.

### `job_attempts`

`id`, `job_id` cascade, `attempt` (≥1), `worker_id`, `status`, `started_at`, `finished_at`,
`error`. Unique `(job_id, attempt)`.

### `deployments`

`id`, `user_id`, `demo_project_id` cascade, `provider`, `vercel_deployment_id` (unique where not
null), `vercel_project_reference`, `status`, `url`, `error_message`, `requested_by`,
timestamps, `completed_at`. Indexes on demo and user.

### `outreach_records`

`id`, `user_id`, `lead_id` cascade, `demo_project_id` set null, `channel`, `draft_content`
(1–8000), `status`, `sent_at`, `response_at`, `notes` (≤4000), timestamps.

### `ai_usage`

`id`, `user_id`, `provider` (default `google`), `model`, `operation`, `input_usage`,
`output_usage`, `estimated_cost numeric(12,6)`, `status`, `error_code`, `created_at`.
Index `(user_id, created_at desc)`.

### `audit_events`

`id`, `user_id`, `actor_type`, `action`, `entity_type`, `entity_id`, `metadata` JSONB,
`created_at`. Indexes on user/created and entity.

### `api_tokens`

`id`, `user_id`, `name`, `token_hash` (64 hex, unique), `token_prefix`, `last_used_at`,
`revoked_at`, timestamps. Tokens are shown once at creation; only the hash is stored.

## Functions

| Function                                           | Purpose                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `set_updated_at()`                                 | Trigger helper for `updated_at`                                         |
| `handle_new_user()`                                | Creates a profile and assigns the first user as owner                   |
| `claim_jobs(worker, limit, types[], lock_seconds)` | Atomically claims queued jobs, increments attempts; `service_role` only |
| `recover_stale_jobs(lock_seconds)`                 | Requeues or fails jobs with expired locks; `service_role` only          |

## Retention and deletion

- Account deletion (user-initiated) cascades every owned row, including artifacts, jobs, usage,
  and audit events. There is no soft delete in v1.
- Deleting a lead cascades its demos, artifacts, and outreach records.
- Deleting a source keeps leads (`source_id` becomes null).
- `last_error`, `deployment_error`, and `audit_events.metadata` must never contain secret values;
  the job layer redacts bearer tokens and token-like strings before writing.
