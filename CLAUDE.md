# Lumen AI Context

## Purpose And Current State

Lumen is a local-first Progressive Web App journal built with Next.js 14 App Router, Tailwind CSS, and plain JavaScript. The current implementation is beyond the original MVP: entry creation, editing, duplication, favorites, pinned entries, tags, collections, feed/calendar/timeline browsing, import preview, encrypted export, local privacy controls, offline status, install UX, and Dockerized local development. There is still no backend, no database server, no authentication, and no analytics.

## Agent Files

AGENTS.md is a lean Codex-specific context file.
It is NOT a mirror of CLAUDE.md.
AGENTS.md contains only: project summary, strict rules,
file responsibilities, scaffolded-but-not-wired notes,
and out-of-scope items.
Do not sync or mirror CLAUDE.md content into AGENTS.md.

## Full File Structure

- `app/globals.css` : global tokens, utility layers, reduced-motion handling, and shared visual variables
- `app/layout.js` : root layout, metadata, viewport config, and global app shell mount
- `app/page.js` : home dashboard with filters, prompts, reflections, feed/calendar/timeline views, restore/export, install UX, and privacy settings
- `app/entry/[id]/page.js` : entry detail route with edit, duplicate, delete, follow-up reflection, and related-entry surfaces
- `components/AppChrome.js` : offline banner and local passcode lock shell
- `components/EntryCard.js` : card UI with tags, pinned/favorite state, and mobile quick actions
- `components/EntryDetail.js` : full entry display plus related-entry and on-this-day sections
- `components/EntryEditor.js` : bottom-sheet editor for create/edit/follow-up flows, templates, prompts, markdown-lite actions, and draft recovery
- `components/ExportButton.js` : plain and encrypted export actions
- `components/ImportPreviewModal.js` : restore preview before importing backups
- `lib/storage.js` : single persistence boundary for IndexedDB entries, legacy migration, drafts, privacy settings, import/export, and preferences
- `lib/journal.mjs` : journal-domain helpers for filters, summaries, calendar/timeline shaping, prompts, templates, and related-entry logic
- `lib/themes.js` : theme map keyed by journal mood/state
- `lib/utils.js` : `generateId()`, `formatDate()`, `assignAccentColor()`, sunrise/sunset calculation, and appearance resolution helpers
- `public/manifest.json` : PWA manifest and shortcuts
- `public/icons/icon-192.svg` : current 192 icon asset
- `public/icons/icon-512.svg` : current 512 icon asset
- `Dockerfile` : Node 20 Alpine development image
- `docker-compose.yml` : app container plus local HTTPS proxy
- `Caddyfile` : HTTPS reverse proxy config for localhost and LAN installs
- `tests/journal.test.mjs` : Node tests covering shared journal helpers

## Data Model

Entries are persisted in IndexedDB and migrated from legacy `localStorage` if older data exists.

```js
{
  id: string,
  title: string,
  body: string,
  createdAt: string,
  updatedAt: string,
  accentColor: object,
  theme: string,
  tags: string[],
  favorite: boolean,
  pinned: boolean,
  collection: string,
  checklist: Array<{ id: string, text: string, checked: boolean }>,
  templateId: string,
  promptId: string,
  relatedEntryIds: string[]
}
```

### Field Constraints

- `id` must remain stable after creation and should be generated only through `generateId()`
- `title` must be trimmed and capped at 100 characters before persistence
- `body` must be trimmed and non-empty before persistence
- `createdAt` is written once on creation and never edited
- `updatedAt` should refresh when an entry is edited
- `accentColor` must never be reassigned after initial creation
- `tags` should be normalized slug-like strings
- `collection` is a short human-readable label
- `theme` is scaffolded for future sentiment logic and still defaults to `"neutral"`

## Architectural Decisions

- The UI remains App Router based, but persistence is entirely client-driven
- IndexedDB now holds entry records; `lib/storage.js` remains the only persistence entry point
- Legacy `localStorage["lumen_entries"]` is migrated into IndexedDB on first load
- Drafts, appearance mode, preview mode, export metadata, and privacy settings are still centralized in `lib/storage.js`
- Imports run through a preview step before merge
- Encrypted export uses Web Crypto AES-GCM with a PBKDF2-derived key
- Theme rendering still resolves through `getThemePalette(themeKey, appearance)`
- Privacy locking is local-only and implemented in the shared app chrome, not per route
- `next-pwa` stays disabled in development and active in production builds

## Scaffolding Present But Not Yet Wired

- Sentiment/theme system exists only as a theme map plus theme-aware rendering
- All newly created entries still use `theme: "neutral"`
- No automatic sentiment inference or theme assignment is currently active
- Natural-language retrieval and reflection generation are intentionally absent from runtime logic
- Light/dark appearance remains separate from entry sentiment theming

## Planned Phases

- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 event trigger → Lambda → Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection via AWS Comprehend → auto-set entry theme

## Strict Rules Summary

- JavaScript only; no TypeScript
- No `<form>` tags anywhere
- No external UI/component libraries
- No backend, server database, auth, analytics, or tracking
- All persistence logic must stay inside `lib/storage.js`
- Do not seed demo entries or hardcode journal content
- Every React component file must expose both a named export and a default export
- Preserve the requested file structure; do not collapse or reorganize the specified files

## Known Gotchas And Constraints

- App Router pages that touch browser persistence must be client components
- `Auto` appearance tries geolocation-based sunrise/sunset first, then falls back to `prefers-color-scheme`
- `next-pwa` does not emit a service worker during `npm run dev`
- For trustworthy PWA verification, run a production build with `NODE_ENV=production`
- Docker compose sets `NODE_ENV=development` for the dev container, which is fine for `docker compose up` but not for production verification
- Android install behavior still depends on secure-origin trust and Chrome heuristics
- If console debugging is added later, annotate it with `// TODO: remove`
