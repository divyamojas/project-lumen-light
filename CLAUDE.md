# Lumen Frontend — Claude Context

## Current State
Feature-complete journal MVP with backend-managed authentication now wired into the app.
The journal still stores and shapes entry data client-side, while authenticated API access, admin access,
and user identity resolution now come from the FastAPI backend.

## Agent Files
`AGENTS.md` is a lean Codex-specific file and should not mirror this file.
Keep it short: project summary, strict rules, file responsibilities, routing notes, and out-of-scope items.

## File Structure
- `app/layout.js` — root layout, metadata, viewport config, auth provider, route gate, app shell mount
- `app/page.js` — auth-aware landing shell; redirects to `/auth` or `/app`
- `app/app/page.js` — authenticated dashboard: filters, prompts, reflections, feed/calendar/timeline views, restore/export, install UX, privacy settings
- `app/auth/page.js` — login, signup, reset-password UI, shared appearance controls, auth error messaging
- `app/auth/callback/page.js` — backend callback token finalization and redirect handling
- `app/admin/page.js` — admin route shell
- `app/entry/[id]/page.js` — entry detail: edit, duplicate, delete, follow-up reflection, related-entry surfaces
- `components/AuthProvider.js` — session state, auth actions, and auth context
- `components/RouteGate.js` — client-side access control and redirect safety net
- `components/AuthDock.js` — backend-auth status dock outside auth screens
- `components/AdminPanel.js` — current admin UI for dashboard, users, entries, schema, migrations, and SQL console
- `lib/storage.js` — persistence boundary: IndexedDB entries, legacy migration, drafts, privacy settings, import/export, auth session persistence, shared request helpers
- `lib/auth.js` — backend auth helpers for login, signup, reset, Google start, callback completion, logout, and admin identity resolution
- `lib/admin.js` — backend admin API client helpers
- `middleware.js` — cookie-based auth redirect layer for public vs protected routes
- `Dockerfile` — Node 20 Alpine development image
- `Caddyfile` — local HTTPS reverse proxy config
- Local Docker orchestration lives in the root `project-lumen/docker-compose.yml`

## Architectural Decisions
- UI is App Router-based
- Entry persistence is still client-driven via `lib/storage.js`
- Auth is backend-managed; the frontend does not authenticate with Supabase directly
- Bearer tokens are stored locally and attached to backend API requests
- Auth session state is mirrored into local storage and a cookie so both middleware and the client can gate routes
- `/` is a landing redirect only; the authenticated journal home is `/app`
- `/auth` is the public entry route
- `/admin` is authenticated first, then verified against backend role info
- Imports run through a preview step before merge
- Encrypted export uses Web Crypto AES-GCM with a PBKDF2-derived key

## Routing Rules
- `/` redirects to `/auth` or `/app` depending on session state
- `/app` is the authenticated journal home
- `/auth` is the public auth screen
- `/auth/callback` completes backend-issued auth callbacks
- `/admin` requires authentication and backend role approval
- Nothing in the journal or admin experience should be reachable without authentication

## Backend Auth Contract
The frontend currently expects these backend behaviors:
- `POST /auth/login`
- `POST /auth/sign-up` and aliases
- `POST /auth/reset-password` and aliases
- `GET /auth/google/start` and aliases
- `POST /auth/logout`
- `GET /users/me`

`lib/auth.js` stores the token, resolves `/users/me`, and treats the backend as the source of truth for auth state.

## Admin UI Reality
The current admin UI actively uses:
- `/admin/stats`
- `/admin/users`
- `/admin/users/{id}`
- `/admin/users/{id}/role`
- `/admin/entries`
- `/admin/entries/{id}`
- `/admin/schema`
- `/admin/schema/migrations`
- `/admin/schema/migrations/apply`
- `/admin/sql`

The backend now also exposes broader superuser APIs for auth-user management and generic table CRUD, but the frontend does not yet have polished UI flows for all of them.

## Field Constraints
- `id` — stable after creation; generated client-side when needed
- `title` — trimmed, capped at 100 chars before persistence
- `body` — trimmed, non-empty before persistence
- `createdAt` — written once on creation, never edited
- `updatedAt` — refreshed on every edit
- `accentColor` — never reassigned after initial creation
- `tags` — normalized slug-like strings
- `collection` — short human-readable label
- `theme` — still defaults to `"neutral"`

## Frontend-Specific Rules
- No `<form>` tags anywhere — use controlled inputs and button handlers
- No external UI or component libraries
- All journal persistence logic stays inside `lib/storage.js`
- Every React component must expose both a named export and a default export
- Do not seed demo entries or hardcode journal content
- App Router pages that touch browser APIs must be client components

## Scaffolded But Not Yet Wired
- `entry.theme` still defaults to `"neutral"`; no sentiment inference is active
- The admin UI is not yet a full visual database/auth editor even though the backend exposes broader admin APIs
- Natural-language retrieval and AI reflection generation are not runtime features yet

## Permanently Out of Scope
- TypeScript
- External UI libraries
- Voice recording
- Analytics/tracking
- AWS/S3/Lambda/Bedrock/Comprehend work unless explicitly requested
