# Lumen Frontend — Claude Context

## Current State
Journal MVP with backend-managed authentication, a full journal type system (6 types), onboarding flow,
public landing page, mood/theme picker, S3 sync status UI, account/data deletion flows, and legal pages.
Entry persistence remains client-driven via `lib/storage.js`, while auth, entry CRUD, and admin access
come from the FastAPI backend. Local startup and HTTPS proxy are owned by the root repo.

## Agent Files
`AGENTS.md` is a lean Codex-specific file and should not mirror this file.
Keep it short: project summary, strict rules, file responsibilities, routing notes, and out-of-scope items.

## File Structure

### App pages
- `app/layout.js` — root layout, metadata, viewport config, auth provider, route gate, app shell mount
- `app/page.js` — root redirect shell; middleware handles actual routing to `/landing` or `/app`
- `app/app/page.js` — authenticated dashboard: journal feed/calendar/timeline, filters (including mood), prompts, settings panel (appearance, privacy, AWS sync, danger zone), import/export
- `app/auth/page.js` — login, signup, reset-password UI, shared appearance controls, auth error messaging
- `app/auth/callback/page.js` — backend callback token finalization and redirect handling
- `app/admin/page.js` — admin route shell
- `app/entry/[id]/page.js` — entry detail: edit, duplicate, delete, follow-up reflection, related-entry surfaces
- `app/landing/page.js` — public marketing page: value prop, 6 journal type cards, Phase 1–5 roadmap timeline, CTA
- `app/onboarding/page.js` — first-login journal type selection; sets `lumen_enabled_journal_types` and `lumen_onboarding` cookie
- `app/legal/privacy/page.js` — fetches privacy policy from `GET /legal/privacy`; falls back to static text
- `app/legal/terms/page.js` — fetches terms from `GET /legal/terms`; falls back to static text

### Components
- `components/AuthProvider.js` — session state, auth actions, and auth context
- `components/RouteGate.js` — client-side access control and redirect safety net
- `components/AuthDock.js` — backend-auth status dock outside auth screens
- `components/AdminPanel.js` — admin UI for dashboard, users, entries, schema, migrations, and SQL console
- `components/EntryEditor.js` — entry editor with journal type picker, TypeMetadataFields, mood picker, markdown toolbar, draft auto-save; exports `TypeMetadataFields` as named export
- `components/EntryDetail.js` — entry detail view with collapsible type_metadata "Details" section and S3 sync indicator (☁/⟳/⚠ from `entry.type_metadata.__sync`)

### Lib
- `lib/storage.js` — persistence boundary: IndexedDB entries, drafts, privacy, import/export, auth session, journal type preferences (`getDefaultJournalType`, `setDefaultJournalType`, `getEnabledJournalTypes`, `setEnabledJournalTypes`), shared request helpers
- `lib/journalTypes.js` — 6 journal type definitions (personal, science, travel, fitness, work, creative) with `extraFields`, `promptLibrary`, `templates`, `icon`, `accentRamp`; helpers: `getJournalType`, `getExtraFields`, `getPrompts`, `getTemplates`, `JOURNAL_TYPE_LIST`
- `lib/themes.js` — 6 mood themes (neutral, calm, energised, reflective, heavy, anxious) with dark/light palettes, `label`, `accent` color; `getThemePalette` helper
- `lib/featureFlags.js` — `hasFeature(key)` scaffold; all features enabled by default (`USER_TIER = "self"`); gates journal types by key like `journal_type_science`
- `lib/auth.js` — backend auth helpers for login, signup, reset, Google start, callback completion, logout, and admin identity resolution
- `lib/admin.js` — backend admin API client helpers
- `lib/journal.mjs` — `filterEntries`, `sortEntries`, `buildCalendarMatrix`, `buildTimelineGroups`, `buildReflectionSummary`, templates, prompts, tag/collection helpers
- `middleware.js` — cookie-based route protection; redirects `/` to `/landing` (unauthed) or `/app` (authed); redirects authenticated users without `lumen_onboarding` cookie from `/app` to `/onboarding`

### Infrastructure
- `Dockerfile` — Node 20 Alpine development image
- `Caddyfile` — local HTTPS reverse proxy config
- `.github/workflows/ci.yml` — GitHub Actions CI: lint → test → build on push/PR to main
- Local Docker orchestration lives in the root `project-lumen/docker-compose.yml`

## Architectural Decisions
- UI is App Router-based (Next.js 14)
- Entry persistence is client-driven via `lib/storage.js`; backend is source of truth
- Auth is backend-managed; frontend does not touch Supabase directly
- Bearer tokens are stored in localStorage and mirrored to a cookie for middleware
- Journal types are user-selected at onboarding and stored in localStorage; editor uses enabled set
- Themes (moods) are user-set per entry via the mood picker; Phase 5 will auto-detect via AWS Comprehend
- Feature flags in `lib/featureFlags.js` are scaffolded for future monetization; all return `true` now
- S3 sync status is surfaced in Settings via `GET /sync/status`; entry sync state stored in `entry.type_metadata.__sync`
- Account deletion calls `DELETE /users/me`; entry deletion calls `DELETE /users/me/entries`
- `/landing` is the public front door; `/auth` is the sign-in screen
- `/onboarding` runs once after first login, guarded by `lumen_onboarding` cookie
- Encrypted export uses Web Crypto AES-GCM with a PBKDF2-derived key

## Routing Rules
- `/` → `/landing` (unauthenticated) or `/app` (authenticated) — handled by middleware
- `/landing` — public marketing page; no auth required
- `/legal/privacy`, `/legal/terms` — public; no auth required
- `/auth` — public sign-in/sign-up/reset screen
- `/auth/callback` — completes backend OAuth callbacks
- `/onboarding` — authenticated but pre-journal; skipped after `lumen_onboarding` cookie is set
- `/app` — authenticated journal home; redirects to `/onboarding` if onboarding cookie missing
- `/admin` — authenticated + backend role approval required
- `/entry/:id` — authenticated

## Entry Shape
```js
{
  id: string,
  title: string,           // trimmed, ≤100 chars
  body: string,            // trimmed, non-empty
  createdAt: string,       // write-once ISO8601
  updatedAt: string,       // refreshed on edit
  accentColor: object,     // stable after creation
  theme: string,           // one of: neutral|calm|energised|reflective|heavy|anxious
  tags: string[],          // ≤8, slug-normalized
  favorite: boolean,
  pinned: boolean,
  collection: string,      // ≤40 chars
  checklist: Array<{ id: string, text: string, checked: boolean }>,
  templateId: string,
  promptId: string,
  relatedEntryIds: string[],
  journal_type: string,    // one of: personal|science|travel|fitness|work|creative
  type_metadata: object,   // type-specific extraField values; __sync key holds S3 state
}
```

## Backend Auth Contract
Frontend expects these backend behaviors:
- `POST /auth/login`, `/auth/sign-up`, `/auth/reset-password`, `/auth/google/start`, `/auth/logout`
- `GET /users/me`
- `DELETE /users/me` — account deletion (body: `{ confirmation: "DELETE MY ACCOUNT" }`)
- `DELETE /users/me/entries` — deletes all entries, keeps account
- `GET /health`
- `GET /legal/privacy`, `GET /legal/terms` — optional; pages fall back to static if absent
- `GET /sync/status` — S3 sync status (`{ enabled, bucket, region, reachable }`)
- `POST /sync/full` — trigger full S3 sync

## Admin UI Reality
Active endpoints:
- `/admin/stats`, `/admin/users`, `/admin/users/{id}`, `/admin/users/{id}/role`
- `/admin/entries`, `/admin/entries/{id}`
- `/admin/schema`, `/admin/schema/migrations`, `/admin/schema/migrations/apply`
- `/admin/sql`

## Journal Types
Six types in `lib/journalTypes.js`:

| ID | Icon | Accent | Extra fields |
|----|------|--------|-------------|
| `personal` | ✦ | purple | none |
| `science` | ⬡ | teal | hypothesis, method, results, conclusion |
| `travel` | ◈ | amber | location, weather, transport_mode |
| `fitness` | ◎ | coral | workout_type, duration_min, rpe |
| `work` | ▣ | blue | project, stakeholders |
| `creative` | ◇ | pink | genre, word_count_target, draft_number |

Enabled types stored in `lumen_enabled_journal_types` (localStorage). Default in `lumen_default_journal_type`.

## Mood Themes
Six themes in `lib/themes.js`:

| Key | Label | Phase 5 sentiment |
|-----|-------|-------------------|
| `neutral` | No mood | — |
| `calm` | Calm | POSITIVE, low arousal |
| `energised` | Energised | POSITIVE, high arousal |
| `reflective` | Reflective | mixed/neutral |
| `heavy` | Heavy | NEGATIVE |
| `anxious` | Anxious | NEGATIVE, high arousal |

User sets manually today. Phase 5 will auto-set via AWS Comprehend.

## Local Orchestration Notes
- No local compose file in this repo
- Root repo bootstraps this repo when missing
- Root repo owns local HTTPS via Caddy; app runs at `http://localhost:3000`

## Frontend-Specific Rules
- No `<form>` tags anywhere — use controlled inputs and button handlers
- No external UI or component libraries
- All journal persistence logic stays inside `lib/storage.js`
- Every React component must expose both a named export and a default export
- Do not seed demo entries or hardcode journal content
- App Router pages that touch browser APIs must be client components

## Not Yet Wired
- `lib/featureFlags.js` is a shipped-vs-planned capability registry, not a monetization or entitlement system
- S3 sync UI is present but `/sync/status` and `/sync/full` are Phase 2 backend work
- `/legal/privacy` and `/legal/terms` backend endpoints are optional; fall back to static text
- Natural-language retrieval and AI reflection generation are Phase 3–4 backend work
- AWS Comprehend sentiment auto-theming is Phase 5

## Permanently Out of Scope
- TypeScript
- External UI libraries
- Voice recording
- Analytics/tracking
- AWS/S3/Lambda/Bedrock/Comprehend implementation unless explicitly requested
