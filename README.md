# Lumen

Lumen is a Next.js 14 Progressive Web App journal designed for calm daily writing on desktop and mobile. The current build keeps a single host-backed journal file as the source of truth for entries, while drafts and privacy settings remain local to each device.

## Current Architecture

- UI: Next.js 14 App Router with Tailwind CSS and plain JavaScript
- Storage: host-backed JSON journal file served through Next.js API routes
- Preferences and drafts: still centralized in `lib/storage.js` and remain local to each device
- Networking: LAN-accessible host API for shared entry sync, no auth, no analytics, no cloud sync yet
- PWA: `next-pwa`, manifest, service worker in production builds, install prompt support

## Current Features

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
- Offline status messaging and Android-friendly install support

## How To Run With Docker

1. Install Docker Desktop or another runtime that supports `docker compose`.
2. Open a terminal in `/Users/myriad/containers/project-lumen`.
3. Start the development stack:
   `docker compose up`
4. Open `http://localhost:3000`.
5. For LAN testing, open `http://YOUR_MAC_IP:3000` on your phone.

## Local HTTPS For Android Install Testing

Android Chrome usually needs a secure origin before install behavior becomes reliable.

1. Find your Mac LAN IP:
   `ipconfig getifaddr en0`
2. Start the stack with the IP bound into the proxy:
   `LAN_HOST=YOUR_MAC_IP docker compose up`
3. Visit `https://localhost` once on your Mac and trust the local certificate if prompted.
4. Export Caddy’s local root certificate:
   `docker compose exec proxy cat /data/caddy/pki/authorities/local/root.crt > lumen-local-root.crt`
5. Install `lumen-local-root.crt` as a trusted certificate on Android.
6. Open `https://YOUR_MAC_IP` on the phone.

### Notes

- Production-style PWA behavior should be validated with a production build, not `npm run dev`
- A clean production check inside Docker is:
  `docker compose run --rm -e NODE_ENV=production app npm run build`
- In production mode, the service worker is emitted to `public/sw.js`
- Chrome may still show installation from the browser menu instead of an immediate popup

## Backups And Privacy

- Standard export writes a readable JSON backup
- Encrypted export wraps the same backup with an AES-GCM passphrase envelope
- Restore runs through a preview step before entries are imported
- Privacy settings can store a local passcode hint and enable lock-on-background behavior
- Entry data now lives in `data/journal.json` on the host machine
- Drafts, UI mode, preview mode, and privacy settings still remain device-local
- On first run after this change, legacy local entries from a device are merged into the host store once

## Data Model

Each entry now includes the original journal fields plus richer organization metadata.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Eight-character ID generated with `nanoid` |
| `title` | `string` | Required, trimmed, max 100 characters |
| `body` | `string` | Required freeform text |
| `createdAt` | `string` | ISO timestamp, stable after creation |
| `updatedAt` | `string` | ISO timestamp refreshed on edits |
| `accentColor` | `object` | Random accent object selected once |
| `theme` | `string` | Currently still defaults to `"neutral"` |
| `tags` | `string[]` | Normalized tag slugs |
| `collection` | `string` | Optional simple grouping label |
| `favorite` | `boolean` | Highlighted entry flag |
| `pinned` | `boolean` | Feed-priority entry flag |
| `checklist` | `object[]` | Parsed checklist items derived from body text or saved state |
| `relatedEntryIds` | `string[]` | Optional lightweight entry relationships |

## Folder Structure

- `app/` : routes, layout, and global styles
- `components/` : UI surfaces including editor, cards, detail view, app shell, and import/export controls
- `lib/storage.js` : all persistence, migration, export/import, and privacy helpers
- `lib/journal.mjs` : filtering, summaries, prompts, templates, and view-model utilities
- `lib/themes.js` : theme palette map
- `lib/utils.js` : ID, date, accent, and appearance helpers
- `public/` : manifest, icons, and generated service worker output in production
- `tests/` : lightweight Node tests for journal logic

## Security Notes

- `.next/` is excluded from version control — it is build output only
- Never commit `*.crt`, `*.key`, or `*.pem` files
- Local HTTPS certificates generated by Caddy are for testing only and must never be committed
- Never commit AWS credentials, `.env`, or `.env.local` files
- Environment variable usage begins in Phase 2 for AWS-oriented work

## Planned Phases

- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 event trigger to Lambda and Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection with AWS Comprehend to auto-set entry theme
