# Lumen

Lumen is a Next.js 14 Progressive Web App journal for calm daily writing on desktop and mobile. The current build uses backend-authenticated access for the app shell and backend APIs for journal/admin data, while drafts, appearance settings, export metadata, and privacy lock settings remain local to each device.

## Current Architecture

- UI: Next.js 14 App Router with Tailwind CSS and plain JavaScript
- Auth: backend-managed authentication with a dedicated `/auth` screen and callback flow
- Routing: `/` redirects to `/auth` or `/app` based on session state
- Journal home: `/app`
- Admin: `/admin`, protected by authentication first and then admin-role checks in the UI
- Data access: backend API requests for entries, current user, and admin endpoints
- Local device state: drafts, appearance mode, preview mode, export metadata, and privacy passcode settings stay in `lib/storage.js`
- PWA: `next-pwa`, manifest, production service worker, install prompt support

## Current Features

- Login, sign up, password reset, and backend callback handling
- Auth-gated journal and admin routes
- Create, edit, duplicate, favorite, and pin entries
- Organize entries with tags, collections, and related-entry links
- Search across titles, body text, tags, and collections
- Filter by favorites, pinned state, tags, collections, timeframe, and date range
- Browse entries in feed, calendar, and timeline views
- Draft autosave and restore for new, edited, and follow-up reflections
- Markdown-lite editor actions and checklist-friendly writing
- Writing prompts, calm templates, weekly reflection summaries, and “on this day” surfacing
- Plain and encrypted JSON exports
- Import preview with duplicate and invalid-entry counts before restore
- Local privacy passcode with blur-on-background behavior
- Shared `auto`, `light`, and `dark` appearance controls
- Offline status messaging and Android-friendly install support

## Routes

- `/` : session-aware redirect only
- `/auth` : public authentication screen
- `/auth/callback` : backend auth callback completion
- `/app` : authenticated journal dashboard
- `/entry/[id]` : authenticated entry detail route
- `/admin` : authenticated admin route

## How To Run With Docker

This frontend is started by the root orchestrator repo, not by a local compose file in this directory.

1. Install Docker Desktop or another runtime that supports `docker compose`.
2. Open a terminal in the sibling `project-lumen/` repo.
3. Start the development stack:
   `./start.sh`
4. Open `http://localhost:3000` for the app directly.
5. Open `https://localhost` if you want to exercise the local HTTPS proxy.

## Local HTTPS For Android Install Testing

Android Chrome usually needs a secure origin before install behavior becomes reliable.

1. Find your Mac LAN IP:
   `ipconfig getifaddr en0`
2. Start the stack from `project-lumen/` with the IP bound into the proxy:
   `LAN_HOST=YOUR_MAC_IP ./start.sh`
3. Visit `https://localhost` once on your Mac and trust the local certificate if prompted.
4. Export Caddy’s local root certificate from `project-lumen/`:
   `docker compose exec proxy cat /data/caddy/pki/authorities/local/root.crt > project-lumen-light/lumen-local-root.crt`
5. Install `lumen-local-root.crt` as a trusted certificate on Android.
6. Open `https://YOUR_MAC_IP` on the phone.

### Notes

- `./start.sh` in `project-lumen/` starts both the app container and the local HTTPS proxy
- Production-style PWA behavior should be validated with a production build, not `npm run dev`
- A clean production check inside Docker from `project-lumen/` is:
  `docker compose run --rm -e NODE_ENV=production app npm run build`
- In production mode, the service worker is emitted to `public/sw.js`
- Chrome may still show installation from the browser menu instead of an immediate popup

## Local Development Scripts

- `npm run dev` : start the Next.js development server on port `3000`
- `npm run build` : create a production build
- `npm run start` : run the production server on port `3000`
- `npm run lint` : run Next.js linting
- `npm run test` : run `tests/journal.test.mjs`

## Backups, Privacy, And Local State

- Standard export writes a readable JSON backup
- Encrypted export wraps the same backup with an AES-GCM passphrase envelope
- Restore runs through a preview step before entries are imported
- Privacy settings can store a local passcode hint and enable lock-on-background behavior
- Drafts, UI mode, preview mode, export metadata, and privacy settings remain device-local
- Auth session state is also mirrored locally so middleware and client routing can agree on access state

## Data Model

Each entry includes the journal fields below plus organization metadata used throughout the UI.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Eight-character ID generated with `nanoid` |
| `title` | `string` | Required, trimmed, max 100 characters |
| `body` | `string` | Required freeform text |
| `createdAt` | `string` | ISO timestamp, stable after creation |
| `updatedAt` | `string` | ISO timestamp refreshed on edits |
| `accentColor` | `object` | Accent object selected on creation |
| `theme` | `string` | Currently still defaults to `"neutral"` |
| `tags` | `string[]` | Normalized tag slugs |
| `collection` | `string` | Optional grouping label |
| `favorite` | `boolean` | Highlighted entry flag |
| `pinned` | `boolean` | Feed-priority entry flag |
| `checklist` | `object[]` | Parsed checklist items derived from body text or saved state |
| `promptId` | `string` | Optional prompt reference used by the editor |
| `templateId` | `string` | Optional template reference used by the editor |
| `relatedEntryIds` | `string[]` | Optional lightweight entry relationships |

## Folder Structure

- `app/` : routes, layout, global styles, auth pages, and dashboard pages
- `components/` : UI surfaces including auth, editor, cards, detail view, app shell, and import/export controls
- `hooks/` : shared client hooks such as appearance handling
- `lib/storage.js` : local persistence, drafts, privacy, import/export, preferences, auth session persistence
- `lib/auth.js` : backend auth helpers and callback handling
- `lib/admin.js` : admin API client helpers
- `lib/journal.mjs` : filtering, summaries, prompts, templates, and view-model utilities
- `lib/themes.js` : theme palette map
- `lib/utils.js` : ID, date, accent, and appearance helpers
- `public/` : manifest, icons, and generated service worker output in production
- `tests/` : lightweight Node tests for journal logic
- `middleware.js` : route-level auth redirects

## Security Notes

- `.next/` is excluded from version control because it is build output
- Never commit `*.crt`, `*.key`, or `*.pem` files
- Local HTTPS certificates generated by Caddy are for testing only and must never be committed
- Never commit secrets such as `.env` or `.env.local`
- Admin access should never be exposed through public routing without authentication

## Scaffolded But Not Yet Wired

- `entry.theme` still defaults to `"neutral"`
- `THEMES` drives rendering but no sentiment inference runs at runtime
- Natural-language retrieval and AI reflection generation are not runtime features yet

## Planned Phases

- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 event trigger to Lambda and Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection with AWS Comprehend to auto-set entry theme
