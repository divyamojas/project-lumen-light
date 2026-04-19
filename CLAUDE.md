# Lumen Frontend — Claude Context

## Current State
Feature-complete MVP. Entry creation, editing, duplication, favorites, pinned entries, tags,
collections, feed/calendar/timeline browsing, import preview, encrypted export, local privacy
controls, offline status, install UX, backend-authenticated routing, and a protected admin route.

## Agent Files
`AGENTS.md` is a lean Codex-specific file — not a mirror of this file.
It contains only: project summary, strict rules, file responsibilities, scaffolded-but-not-wired
notes, and out-of-scope items. Do not sync CLAUDE.md content into AGENTS.md.

## File Structure
- `app/globals.css` — global tokens, utility layers, reduced-motion handling, shared visual variables
- `app/layout.js` — root layout, metadata, viewport config, auth provider, route gate, app shell mount
- `app/page.js` — auth-aware landing shell; redirects to `/auth` or `/app`
- `app/app/page.js` — authenticated dashboard: filters, prompts, reflections, feed/calendar/timeline views, restore/export, install UX, privacy settings
- `app/auth/page.js` — authentication UI for login, sign up, reset password, and shared appearance controls
- `app/auth/callback/page.js` — backend callback token finalization and redirect handling
- `app/admin/page.js` — admin route shell
- `app/entry/[id]/page.js` — entry detail: edit, duplicate, delete, follow-up reflection, related-entry surfaces
- `components/AppChrome.js` — offline banner and local passcode lock shell for non-auth screens
- `components/AuthProvider.js` — session state, auth actions, and context
- `components/RouteGate.js` — client-side access control and redirect safety net
- `components/AuthDock.js` — access/status dock outside auth screens
- `components/EntryCard.js` — card UI with tags, pinned/favorite state, mobile quick actions
- `components/EntryDetail.js` — full entry display plus related-entry and on-this-day sections
- `components/EntryEditor.js` — bottom-sheet editor for create/edit/follow-up flows, templates, prompts, markdown-lite actions, draft recovery
- `components/ExportButton.js` — plain and encrypted export actions
- `components/ImportPreviewModal.js` — restore preview before importing backups
- `lib/storage.js` — single persistence boundary: IndexedDB entries, legacy migration, drafts, privacy settings, import/export, preferences, auth session persistence
- `lib/auth.js` — backend auth helpers, callback handling, session resolution, admin identity checks
- `lib/admin.js` — admin API client helpers
- `lib/journal.mjs` — journal-domain helpers: filters, summaries, calendar/timeline shaping, prompts, templates, related-entry logic
- `lib/themes.js` — theme map keyed by journal mood/state
- `lib/utils.js` — `generateId()`, `formatDate()`, `assignAccentColor()`, sunrise/sunset, appearance resolution
- `middleware.js` — cookie-based auth redirect layer for public vs protected routes
- `public/manifest.json` — PWA manifest and shortcuts
- `Dockerfile` — Node 20 Alpine development image
- Local Docker orchestration lives in the root `project-lumen/docker-compose.yml`
- `Caddyfile` — HTTPS reverse proxy config for localhost and LAN installs
- `tests/journal.test.mjs` — Node tests for shared journal helpers

## Field Constraints
- `id` — stable after creation; only generated via `generateId()`
- `title` — trimmed, capped at 100 chars before persistence
- `body` — trimmed, non-empty before persistence
- `createdAt` — written once on creation, never edited
- `updatedAt` — refreshed on every edit
- `accentColor` — never reassigned after initial creation
- `tags` — normalized slug-like strings
- `collection` — short human-readable label
- `theme` — scaffolded; still defaults to `"neutral"`

## Architectural Decisions
- UI is App Router-based; persistence is entirely client-driven
- `lib/storage.js` is the only persistence entry point — never bypass it
- Legacy `localStorage["lumen_entries"]` is migrated into IndexedDB on first load
- Drafts, appearance mode, preview mode, export metadata, and privacy settings are all in `lib/storage.js`
- Auth session state is mirrored into local storage and a cookie so both middleware and the client can gate routes
- `/` is only a landing redirect; the authenticated dashboard now lives at `/app`
- `/auth` is the public authentication screen and `/admin` is auth-protected before any admin-role checks run
- Imports run through a preview step before merge
- Encrypted export uses Web Crypto AES-GCM with a PBKDF2-derived key
- Theme rendering resolves through `getThemePalette(themeKey, appearance)`
- Privacy locking is local-only, implemented in app chrome — not per route
- `next-pwa` is disabled in development, active in production builds

## Scaffolded But Not Yet Wired
- `entry.theme` still defaults to `"neutral"` — no sentiment inference active
- `THEMES` drives rendering but no auto-assignment runs at runtime
- Natural-language retrieval and AI reflection generation are absent from runtime
- All of the above are reserved for later phases

## Frontend-Specific Rules
- No `<form>` tags anywhere — use controlled inputs and `onClick` handlers
- No external UI or component libraries
- All persistence logic must stay inside `lib/storage.js`
- Every React component must expose both a named export and a default export
- Do not seed demo entries or hardcode journal content
- App Router pages that touch browser APIs must be client components
- Keep auth-screen appearance controls consistent with the shared `useAppearance()` system rather than inventing route-specific theming

## Known Gotchas
- `Auto` appearance tries geolocation-based sunrise/sunset first, falls back to `prefers-color-scheme`
- `app/page.js` is no longer the journal home; be careful not to reintroduce dashboard logic there
- `app/app/page.js` moved one directory deeper, so relative imports from that file differ from other app routes
- `next-pwa` does not emit a service worker during `npm run dev`
- For trustworthy PWA verification, run a production build with `NODE_ENV=production`
- The root `project-lumen/docker-compose.yml` sets `NODE_ENV=development` for the dev container — not suitable for production verification
- Android install behavior depends on secure-origin trust and Chrome heuristics
- Annotate any temporary console debugging with `// TODO: remove`
