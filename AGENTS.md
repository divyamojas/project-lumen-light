# Lumen — Codex Agent Context

## What This Project Is
Next.js 14 PWA journal app. Entries stay local on-device.
IndexedDB stores entries, with migration from older localStorage data.
No backend, no auth, no analytics. Mobile-first and installable.

## Strict Rules
- No TypeScript
- No <form> tags anywhere — use controlled inputs and button handlers
- No external UI component libraries
- All persistence logic stays in `lib/storage.js`
- Every component must have both a named export and a default export
- Do not hardcode demo or placeholder entries

## File Responsibilities
- `app/layout.js` → root layout, metadata, viewport, app shell
- `app/page.js` → dashboard, filters, feed/calendar/timeline, settings, backups
- `app/entry/[id]/page.js` → detail view, edit/delete/duplicate, follow-up reflections
- `components/AppChrome.js` → offline banner and local passcode lock
- `components/EntryCard.js` → entry cards with state badges and quick actions
- `components/EntryEditor.js` → bottom sheet editor for create/edit/follow-up
- `components/EntryDetail.js` → full entry display plus related-entry surfaces
- `components/ExportButton.js` → plain and encrypted exports
- `components/ImportPreviewModal.js` → import preview before restore
- `lib/storage.js` → IndexedDB, migration, drafts, privacy, import/export
- `lib/journal.mjs` → prompts, templates, filters, summaries, timeline/calendar helpers
- `lib/themes.js` → THEMES map
- `lib/utils.js` → ids, dates, accent colors, appearance helpers

## Scaffolded But NOT Wired
- `entry.theme` still defaults to `"neutral"`
- `THEMES` already drives rendering, but no sentiment detection is active
- Do NOT auto-change themes with AI yet
- Natural-language retrieval and AI reflection generation are not runtime features yet
- This remains reserved for later phases

## Permanently Out of Scope
- AWS, S3, Lambda, Bedrock, Comprehend in the current runtime
- Authentication or user accounts
- Any external database server
- Voice recording
- Analytics or tracking

## Planned Phases (do not implement automatically)
- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 trigger → Lambda → Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection via AWS Comprehend → auto-set `entry.theme`
