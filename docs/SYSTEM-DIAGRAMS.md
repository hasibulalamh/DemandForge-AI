# System Diagrams

## Container view

```mermaid
flowchart TB
  subgraph Client
    B[Browser]
    X[Chrome MV3 extension]
  end

  subgraph Vercel
    N[Next.js app]
    CR[Cron: /api/v1/jobs/run]
  end

  subgraph Supabase
    PG[(Postgres + RLS)]
    AU[Auth]
  end

  subgraph External
    GM[Gemini API]
    VC[Vercel Deploy API]
  end

  B -->|HTTPS cookies| N
  X -->|Bearer token| N
  N -->|server client| PG
  N -->|SSR session| AU
  CR -->|CRON_SECRET| N
  N -->|service role| PG
  N -->|structured JSON| GM
  N -->|files + poll| VC
  VC --> URL[demo-*.vercel.app]
```

## Data model

```mermaid
erDiagram
  auth_users ||--|| profiles : has
  auth_users ||--o{ sources : owns
  auth_users ||--o{ collection_rules : owns
  auth_users ||--o{ leads : owns
  sources |o--o{ leads : groups
  leads ||--o{ demo_projects : produces
  demo_projects ||--|| demo_artifacts : stores
  demo_projects ||--o{ deployments : records
  leads ||--o{ outreach_records : tracks
  demo_projects |o--o{ outreach_records : attaches
  auth_users ||--o{ jobs : queues
  jobs ||--o{ job_attempts : attempts
  auth_users ||--o{ ai_usage : records
  auth_users ||--o{ audit_events : audit
  auth_users ||--o{ api_tokens : issues
```

## Lead analysis sequence

```mermaid
sequenceDiagram
  actor U as Operator
  participant A as Next.js API
  participant DB as Postgres
  participant W as Worker
  participant G as Gemini

  U->>A: POST /api/v1/leads/:id/analyze
  A->>DB: enqueue analyze_lead (idempotency key)
  A-->>U: 202 { jobId }
  Note over A,W: after() may run immediately; cron guarantees durability
  W->>DB: claim_jobs(SKIP LOCKED)
  W->>DB: lead status = analyzing
  W->>G: generateContent (responseSchema)
  G-->>W: JSON + usage
  W->>W: Zod validate → normalize budget → score
  W->>DB: update lead + evidence + score; ai_usage; audit
  W->>DB: job succeeded
  U->>A: GET /leads/:id (poll)
  A->>DB: select lead (RLS)
  A-->>U: evidence + score breakdown
```

## Demo generation and deployment sequence

```mermaid
sequenceDiagram
  actor U as Operator
  participant A as Next.js API
  participant DB as Postgres
  participant W as Worker
  participant G as Gemini
  participant V as Vercel

  U->>A: POST /api/v1/demos {leadId, template}
  A->>DB: insert demo (queued) + enqueue generate_demo
  W->>DB: claim job
  W->>G: design specification
  G-->>W: validated spec JSON
  W->>W: render files + validate manifest
  W->>DB: upsert demo_artifacts; demo = ready
  U->>A: GET /api/v1/demos/:id/preview
  A-->>U: sandboxed document (opaque origin)
  U->>A: POST /api/v1/demos/:id/approve
  A->>DB: approved_at = now; lead = demo_generated
  U->>A: POST /api/v1/demos/:id/deploy
  A->>DB: insert deployment (queued) + enqueue deploy_demo
  W->>W: re-validate artifact
  W->>V: POST /v13/deployments (inline files)
  V-->>W: deployment id + url
  W->>V: poll until READY / timeout
  V-->>W: READY + immutable URL
  W->>DB: deployment ready; demo deployed + URL; audit
```

## Job state machine

```mermaid
stateDiagram-v2
  [*] --> queued: enqueue (idempotency key)
  queued --> running: claim_jobs (attempt + 1)
  running --> succeeded: handler resolves
  running --> queued: handler fails and attempts remain (backoff)
  running --> failed: attempts exhausted or non-retryable
  running --> queued: stale lock recovery
  running --> failed: stale lock + attempts exhausted
  queued --> canceled: manual cancel (API not exposed in v1)
```

## Security zones

```mermaid
flowchart TB
  subgraph Public
    LP[/login/]
    HP[/api/v1/health/]
  end
  subgraph Authenticated
    APP[/dashboard, /leads, /demos, /settings/]
    API[/api/v1/* cookies + origin check/]
  end
  subgraph Token
    EXT[/api/v1/import Bearer df_/]
  end
  subgraph Isolated
    PREV[/api/v1/demos/:id/preview sandbox CSP/]
  end
  subgraph Trusted
    WK[Worker: service role, Gemini, Vercel]
  end
```

- Public: login and health only.
- Authenticated: RLS plus ownership filters.
- Token: per-user extension token, hashed at rest.
- Isolated: opaque-origin preview, no cookies/API access.
- Trusted: service role and provider credentials exist only in server worker modules.
