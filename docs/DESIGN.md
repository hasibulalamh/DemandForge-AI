# Design

## Principles

1. **Explain, don't impress.** Scores, statuses, and evidence are shown with their reasons.
2. **One primary action per screen.** Violet = primary; neutral surfaces stay quiet.
3. **Never fake data.** Empty states say what is missing and link to the action that fills it.
4. **Safety is visible.** Approval gates, sandboxed previews, and "concept demo" labelling are
   part of the interface, not hidden footnotes.

## Visual system

| Token      | Value                   | Usage                                         |
| ---------- | ----------------------- | --------------------------------------------- |
| Background | `#fafafa` (`zinc-50`)   | App canvas                                    |
| Surface    | `#ffffff`               | Cards, header, sidebar                        |
| Text       | `#18181b` (`zinc-900`)  | Headings and body                             |
| Muted text | `zinc-500`              | Descriptions, metadata                        |
| Border     | `zinc-200` / `zinc-100` | Card and table separators                     |
| Brand      | `violet-600` `#7c3aed`  | Primary buttons, active nav, evidence accents |
| Brand soft | `violet-50` `#f5f3ff`   | Active nav, highlighted alerts                |
| Success    | `emerald-50/700`        | Deployed, analysed, approved                  |
| Warning    | `amber-50/700`          | Queued, in progress, config warnings          |
| Danger     | `red-50/700`            | Failures, destructive actions                 |

Typography: Geist (UI) with Geist Mono for hashes, slugs, and env variable names. Sizes:
page title `text-2xl font-semibold tracking-tight`, section `text-sm font-semibold`,
body `text-sm`, metadata `text-xs`.

Spacing: 4px base; page sections `space-y-6`; cards use 16–20px padding; radii `rounded-lg`
(8px) for controls, `rounded-xl` (12px) for cards.

## Layout

- **Desktop ≥1024px:** fixed 240px sidebar, sticky 56px top bar, content max-width 1400px.
- **Tablet:** sidebar collapses behind a menu button in a header bar.
- **Mobile:** single column, tables become horizontally scrollable with a minimum width so
  labels never collapse into ambiguity.

Sidebar groups: _Workspace_ (Dashboard, Leads, Sources, Collection rules), _Delivery_
(Demo studio, Demos, Deployments, Outreach), _Account_ (Settings). Active state uses
`aria-current="page"` and a violet tint.

## Components

| Component                                                    | Location                            | Notes                                                                             |
| ------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------- |
| `Button` / `ButtonLink`                                      | `src/components/ui/primitives.tsx`  | Variants: primary, secondary, ghost, subtle, danger; sizes sm/md; disabled states |
| `Card`, `CardHeader`, `CardBody`                             | same                                | White surface, 1px border, minimal shadow                                         |
| `PageHeader`                                                 | same                                | Eyebrow, title, description, actions                                              |
| `StatCard`                                                   | same                                | Real metric + hint                                                                |
| `Badge`, `Dot`                                               | same                                | Status tones shared with `status-badges.tsx`                                      |
| `Input`, `Textarea`, `Select`, `Label`, `Hint`, `FieldError` | same                                | 40px controls, violet focus ring                                                  |
| `EmptyState`, `Skeleton`, `TableSkeleton`                    | same                                | Loading and empty treatments                                                      |
| `Alert`                                                      | same                                | Inline, tone-matched messaging                                                    |
| `Pagination`                                                 | `src/components/ui/pagination.tsx`  | Preserves filters, disabled states are non-focusable                              |
| `ToastProvider` / `useToast`                                 | `src/components/toast.tsx`          | Bottom-right, max 4, 6s auto-dismiss, `role="status"`                             |
| `ConfirmDialog`                                              | `src/components/confirm-dialog.tsx` | `role="dialog"`, Escape closes, destructive variant                               |
| `AutoRefresh`                                                | `src/components/auto-refresh.tsx`   | Polls server data while a job is active (max 3 min)                               |
| `LeadTable`                                                  | `src/components/lead-table.tsx`     | Score, analysis, pipeline, category, relative time                                |
| `Sidebar`, `Topbar`, `AppShell`                              | `src/components/shell/`             | Navigation, sign-out, integration warnings                                        |

## Page-specific design

### Login

Split screen: violet brand panel (desktop) with product boundaries stated; form on the right
with Sign in / Create account tabs. When Supabase is unconfigured, an amber alert lists the
missing _public_ variables and the form is disabled.

### Dashboard

Four headline metrics, latest leads table, category distribution bars, recent demos with two
status badges, worker activity list. Every value comes from `getDashboardData()`.

### Leads

Search + pipeline/analysis/sort filters in a card header; import panel expands inline; table
rows link to detail. Empty state links to import. Pagination preserves the active filters.

### Lead detail

Two-column layout:

- Left: original post (quoted), extracted requirements with quotes, score breakdown with a
  "Why this score" disclosure, demo projects, outreach drafts.
- Right: actions (analyse, pipeline), signals (budget, urgency, intent, clarity, confidence)
  with source quotes, job history with attempts and errors.

### Demo studio

Analysed leads ranked by score. Each row expands to the generation form. A note explains the
specification→renderer→validation pipeline.

### Demo detail

Large sandboxed preview iframe, artifact manifest (files, sizes, checksum), deployment
history, approval/deploy controls, and a clear label when approval is required.

### Deployments / Outreach

Dense tables/cards with status badges, errors in context, and empty states. Outreach cards
state that messages are sent manually.

## Interaction states

| State          | Treatment                                                           |
| -------------- | ------------------------------------------------------------------- |
| Loading        | Route-level skeleton (`loading.tsx`), disabled buttons with spinner |
| Empty          | Dashed-border card, explanation, next action link                   |
| Error          | Route error boundary with retry; inline alerts for API errors       |
| Unauthorized   | Redirect to `/login`; API returns 401 JSON                          |
| In progress    | Badge + `AutoRefresh` while jobs run                                |
| Destructive    | Confirmation dialog requiring explicit confirmation                 |
| Config missing | Amber banner in shell + per-integration status page                 |

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page.
- Every input has a `<label>`; icon-only buttons have `aria-label`.
- Visible `:focus-visible` ring; interactive targets ≥32px.
- Status text is not colour-only (badge labels are present).
- `prefers-reduced-motion` disables transitions in both dashboard and generated demos.
- Dialogs trap initial focus and close on Escape; toasts use `aria-live="polite"`.
- Generated demos include a skip link, keyboard-accessible FAQ `<details>`, and adequate contrast.
