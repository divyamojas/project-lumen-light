# Lumen AI Context

## Purpose And Current State

Lumen is a local-first Progressive Web App journal built with Next.js 14 App Router, Tailwind CSS, and plain JavaScript. The current implementation is Phase 1 MVP plus quality-of-life upgrades: entry creation, editing, listing, search, filtering, detail view, deletion, JSON import/export, install-prompt wiring, appearance controls, local draft autosave, PWA manifest/service worker setup, and Dockerized development. There is no backend, no database, no authentication, and no analytics. All persistence is browser `localStorage` only.

## Agent Files

AGENTS.md is a lean Codex-specific context file.
It is NOT a mirror of CLAUDE.md.
AGENTS.md contains only: project summary, strict rules,
file responsibilities, scaffolded-but-not-wired notes,
and out-of-scope items.
Do not sync or mirror CLAUDE.md content into AGENTS.md.

## Full File Structure

- `app/globals.css` : Tailwind layers, global CSS variables, and shared utility styles
- `app/layout.js` : Root layout, Google font loading, metadata, and global body shell
- `app/page.js` : Home screen with search, sort, timeframe filters, import/export, install prompt handling, settings, keyboard shortcuts, entry feed, and floating new-entry trigger
- `app/entry/[id]/page.js` : Client-side detail route that reads one entry by ID, handles delete/edit flows, toast feedback, and mirrors appearance controls
- `components/EntryCard.js` : Theme-aware list card with accent dot, preview text, and mount animation
- `components/EntryDetail.js` : Full entry presentation layout with back, edit, delete, and appearance actions
- `components/EntryEditor.js` : Controlled bottom-sheet modal for new entry creation and editing with local draft autosave; no `<form>` usage
- `components/ExportButton.js` : Browser-only JSON export using Blob and temporary anchor download with optional completion callback
- `lib/storage.js` : Single source of truth for every `localStorage` read/write operation, including persisted UI mode, preview mode, drafts, updates, and imports
- `lib/themes.js` : Theme map keyed by journal mood/state
- `lib/utils.js` : `generateId()`, `formatDate()`, `assignAccentColor()`, sunrise/sunset calculation, and appearance resolution helpers
- `public/manifest.json` : PWA manifest for installability
- `public/icons/icon-192.svg` : Placeholder 192x192 SVG app icon
- `public/icons/icon-512.svg` : Placeholder 512x512 SVG app icon
- `Dockerfile` : Node 20 Alpine development image
- `docker-compose.yml` : Compose services for the Next.js app plus a local HTTPS proxy, with named volumes and explicit LAN host binding
- `Caddyfile` : Caddy reverse proxy config for `https://localhost` and `https://$LAN_HOST` using `tls internal`
- `.dockerignore` : Build exclusions for Docker context
- `next.config.js` : `next-pwa` integration and React strict mode
- `tailwind.config.js` : Tailwind content scan and animation/theme extensions
- `postcss.config.js` : Tailwind and Autoprefixer PostCSS wiring
- `package.json` : npm scripts and dependencies
- `package-lock.json` : npm lockfile for reproducible installs and Docker builds
- `README.md` : Human-oriented setup and project overview
- `CLAUDE.md` : AI context snapshot for agent workflows
- `AGENTS.md` : Duplicate AI context snapshot for agent workflows

## Data Model

Entries are stored as a JSON array under `localStorage["lumen_entries"]`.

```js
{
  id: string,           // nanoid, exactly 8 chars
  title: string,        // required, user-provided, max 100 chars
  body: string,         // required, freeform, unlimited length
  createdAt: string,    // ISO 8601 timestamp at creation; immutable afterward
  accentColor: object,  // one object from ACCENT_COLORS, assigned once
  theme: string         // currently always "neutral"
}
```

### Field Constraints

- `id` must remain stable after creation and should be generated only through `generateId()`
- `title` must be trimmed and capped at 100 characters before persistence
- `body` must be trimmed and non-empty before persistence
- `createdAt` is written once on creation and never edited
- `accentColor` must never be reassigned after initial creation
- `theme` is scaffolded for future sentiment logic; current creation path must keep defaulting to `"neutral"`

## Architectural Decisions

- Next.js App Router is used for routing and layout composition while keeping the UI mostly client-driven because persistence depends on browser `localStorage`
- All `localStorage` access is isolated to `lib/storage.js` to keep persistence logic centralized and easy to swap later
- Entry import sanitizes and merges JSON data by entry ID so malformed objects do not poison the stored journal
- Theme rendering reads from `THEMES[entry.theme]` in list/detail components so future theme mutation requires no UI refactor
- Theme rendering now resolves through `getThemePalette(themeKey, appearance)` so entry mood and global light/dark appearance can coexist
- The editor uses controlled inputs and button handlers only because `<form>` tags are explicitly forbidden
- Editor drafts are autosaved by draft key (`new-entry`, `edit-<id>`) and cleared after a successful save
- Entry cards and modal motion are implemented with Tailwind plus inline animation delay, avoiding Framer Motion or other animation libraries
- Entry card visibility depends on the Tailwind `animate-card-in` utility; using only inline `animation` styles can leave cards stuck at `opacity: 0`
- Global appearance uses `document.documentElement.dataset.appearance` plus CSS custom properties, which keeps the App Router structure intact without introducing extra style systems
- Android install prompting is driven by the browser `beforeinstallprompt` event; the app surfaces a custom CTA only when Chrome exposes that event
- PWA support is configured with `next-pwa`; service worker generation is disabled in development and enabled for production builds
- Docker development is first-class so the app can boot with `docker compose up` and no host Node/npm install
- Docker compose binds `0.0.0.0:3000:3000`, which makes the app reachable from other devices on the same local network using the Mac host IP
- Caddy provides local HTTPS on ports `80` and `443`, forwarding to the app service so Android install testing can use a secure origin on the LAN

## Scaffolding Present But Not Yet Wired

- Sentiment/theme system exists only as a theme map plus theme-aware rendering
- All newly created entries still use `theme: "neutral"`
- No automatic sentiment inference or theme assignment is currently active
- Planned cloud sync and semantic retrieval flows are intentionally absent from runtime code
- Light/dark appearance is separate from entry sentiment theming; do not conflate the two systems

## Planned Phases

- Phase 1: MVP (current) — localStorage only
- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 event trigger → Lambda → Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection via AWS Comprehend → auto-set entry theme

## Strict Rules Summary

- JavaScript only; no TypeScript
- No `<form>` tags anywhere
- No external UI/component libraries
- No backend, database, auth, analytics, or tracking
- All `localStorage` logic must stay inside `lib/storage.js`
- Do not seed demo entries or hardcode journal content
- Every React component file must expose both a named export and a default export
- Preserve the requested file structure; do not collapse or reorganize the specified files

## Known Gotchas And Constraints

- App Router pages that read `localStorage` must be client components
- `Auto` appearance tries geolocation-based sunrise/sunset first; if location is unavailable or denied, it falls back to `prefers-color-scheme`
- Search uses deferred query updates on the home screen to keep filtering responsive as the journal grows
- `window.history.length` is used for back-navigation fallback on the detail page
- `next-pwa` does not generate a service worker during `npm run dev`; production build is required for full install/service-worker behavior
- The `build` script sets `NEXT_IGNORE_INCORRECT_LOCKFILE=1` to avoid a known Next 14 lockfile patch failure during Dockerized builds
- Docker compose bind mounts the repo into `/app`; `/app/node_modules` is backed by the named volume `lumen_node_modules` so container-installed packages are not shadowed by the host bind mount
- Local HTTPS requires starting the stack with `LAN_HOST=<mac-lan-ip>` so Caddy can issue a certificate for the IP the phone is using
- LAN testing should use `http://<mac-local-ip>:3000`; `ping` is not a port-aware validation tool
- Android Chrome install prompting usually requires a secure context. `localhost` on the Mac qualifies, but `http://192.168.x.x:3000` on a phone usually does not. For LAN testing, the phone must trust the Caddy local CA and load `https://<mac-local-ip>`. Chrome may still choose to show install from the browser menu instead of an immediate popup.
- `accentColor` is stored as an object, not just a string key, because the current card UI reads its `bg` value directly
- If console debugging is added later, annotate it with `// TODO: remove`
