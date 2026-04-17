# Lumen

Lumen is a production-minded Progressive Web App journal built with Next.js 14 App Router and Tailwind CSS. It keeps entries entirely on-device in `localStorage`, prioritizing a calm writing experience, installability on Android Chrome, and a clean foundation for later AI-assisted journal features.

## How To Run With Docker

1. Install Docker Desktop or another Docker runtime that supports `docker compose`.
2. Open a terminal in the project root: `/Users/myriad/containers/project-lumen`.
3. Start the development environment with `docker compose up`.
4. Wait for the container to finish installing dependencies and booting Next.js.
5. Open `http://localhost:3000` in your browser.
6. To open the app from another device on the same Wi-Fi or LAN, find your Mac's local IP address and open `http://YOUR_MAC_IP:3000` on that device.
7. On macOS, if the browser on your phone cannot connect, check that Docker Desktop is running and that macOS Firewall is not blocking incoming connections to Docker.
8. Stop the app with `Ctrl+C` in the terminal, then run `docker compose down` if you want to remove the container.

## Local Network Access

- The container is bound to `0.0.0.0:3000`, so the site is reachable from your Mac and other devices on the same network.
- Use a browser on your phone with `http://YOUR_MAC_IP:3000`, for example `http://192.168.0.10:3000`.
- `ping` does not use ports, so `ping 192.168.0.10:3000` is not a valid test. Use the browser URL above instead.
- To find your Mac IP on macOS, run `ipconfig getifaddr en0` for Wi-Fi or `ipconfig getifaddr en1` on some setups.

## Feature List

### Current

- Create journal entries with a title and freeform body text
- Save entries locally in browser `localStorage`
- View saved entries in a responsive home feed
- Open individual entries on a dedicated detail route
- Delete entries with a confirmation click
- Export all entries as a JSON file named with the current date
- Theme-aware UI scaffold using `entry.theme`
- Random accent color assignment at creation time
- Staggered card entrance animation driven by Tailwind animation utilities
- Manual `Auto` / `Light` / `Dark` appearance control with automatic resolution from sunrise, sunset, and device theme
- Softer light and dark visual palettes designed to feel calmer and less severe
- Overflow-safe card and detail text rendering for long unbroken words
- Installable PWA manifest and service worker setup via `next-pwa`
- Mobile-first layout with a floating action button and bottom-sheet editor

### Planned Phases

- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 event trigger to Lambda and Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection with AWS Comprehend to auto-set entry theme

## Data Model

Each journal entry is stored in browser `localStorage` under the key `lumen_entries` as part of a JSON array.

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Eight-character ID generated with `nanoid` |
| `title` | `string` | User-provided title, required, max length 100 characters |
| `body` | `string` | User-provided body text, required, no maximum length |
| `createdAt` | `string` | ISO 8601 timestamp assigned on creation and never mutated |
| `accentColor` | `object` | Random accent color object selected once on creation |
| `theme` | `string` | Theme key, currently always set to `"neutral"` |

## Folder Structure

- `app/` : App Router pages, layout, and global styles
- `components/` : Reusable UI building blocks for cards, editor, detail view, and export
- `lib/` : Theme configuration, storage helpers, and utility functions
- `public/` : PWA manifest and placeholder app icons
- `Dockerfile` : Container image for local development
- `docker-compose.yml` : Docker development orchestration
- `docker-compose.yml` : Docker development orchestration with LAN-exposed port mapping and a named `node_modules` volume
- `.dockerignore` : Docker build exclusions
- `package-lock.json` : npm lockfile used by Docker and production builds
- `README.md` : Human-facing project guide
- `CLAUDE.md` : Dense AI agent context for future coding sessions

## Environment Variables

None yet.
