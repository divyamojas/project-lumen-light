# Lumen — Codex Agent Context

## What This Project Is
Next.js journal frontend with backend-managed authentication.
Entries still live in client persistence, but authenticated API access and admin access now depend on the FastAPI backend.
Mobile-first and installable.

## Strict Rules
- No TypeScript
- No `<form>` tags anywhere — use controlled inputs and button handlers
- No external UI component libraries
- All journal persistence logic stays in `lib/storage.js`
- Every component must have both a named export and a default export
- Do not hardcode demo or placeholder entries

## File Responsibilities
- `app/layout.js` → root layout, metadata, viewport, app shell, auth provider mount
- `app/page.js` → auth-aware landing redirect shell
- `app/app/page.js` → authenticated dashboard, filters, feed/calendar/timeline, settings, backups
- `app/auth/page.js` → login, signup, reset-password UI
- `app/auth/callback/page.js` → backend auth callback finalization
- `app/admin/page.js` → authenticated admin route shell
- `app/entry/[id]/page.js` → detail view, edit/delete/duplicate, follow-up reflections
- `components/AuthProvider.js` → session state, auth actions, auth context
- `components/RouteGate.js` → client-side route protection and redirects
- `components/AuthDock.js` → backend auth status and Google sign-in entrypoint
- `components/AdminPanel.js` → current admin UI sections
- `lib/storage.js` → IndexedDB, migration, drafts, privacy, import/export, auth session persistence, shared request helpers
- `lib/auth.js` → backend auth helpers, callback handling, session resolution, admin identity resolution
- `lib/admin.js` → backend admin API helpers
- `lib/featureFlags.js` → feature flag scaffold; `hasFeature(name)` gates features by tier (free/pro/self); all return true for now
- `middleware.js` → server-side auth redirects for `/`, `/auth`, `/app`, `/admin`, `/entry`

## Routing Rules
- `/` redirects to `/auth` or `/app`
- `/app` is the authenticated journal home
- `/auth` is the only public entry route
- `/auth/callback` completes backend callback auth
- `/admin` requires authentication and backend role approval
- Nothing in the journal or admin experience should be reachable without authentication

## Backend Contract In Use
- Auth routes: `/auth/login`, `/auth/sign-up`, `/auth/reset-password`, `/auth/google/start`, `/auth/logout`
- Session route: `/users/me`
- Local readiness route expected by the root stack: `/health`
- Admin routes used by the UI: stats, users, entries, schema, migrations, SQL

## Scaffolded But NOT Fully Surfaced In UI
- The backend now exposes broader superuser APIs for auth-user and generic table management
- The frontend admin UI has not yet grown full editors for all of those endpoints
- `entry.theme` still defaults to `"neutral"`
- Natural-language retrieval and AI reflection generation are not runtime features

## Local Dev Note
- This repo is started by the root `project-lumen` orchestrator; do not recreate a second local compose path here

## Permanently Out of Scope
- AWS, S3, Lambda, Bedrock, Comprehend in the current runtime
- Any external database server beyond the current Supabase/Postgres setup
- Voice recording
- Analytics or tracking
