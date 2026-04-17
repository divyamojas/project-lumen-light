# Lumen — Codex Agent Context

## What This Project Is
Next.js 14 PWA journal app. Entries stored in localStorage only.
No backend, no database, no auth. Mobile-first, dark UI.

## Strict Rules
- No TypeScript
- No <form> tags anywhere — use onClick handlers only
- No external UI component libraries (no shadcn, MUI, Chakra)
- All localStorage logic lives only in lib/storage.js
- Every component must have both a named export and a default export
- Do not hardcode demo or placeholder entries

## File Responsibilities
- app/layout.js          → root layout, fonts, global dark bg
- app/page.js            → home feed, entry list, FAB button
- app/entry/[id]/page.js → entry detail view, delete
- components/EntryCard.js    → card with theme + accent color rendering
- components/EntryEditor.js  → bottom sheet modal, create and edit entries
- components/EntryDetail.js  → full entry display
- components/ExportButton.js → JSON export with dated filename
- lib/storage.js         → all localStorage read/write (isolated here)
- lib/themes.js          → THEMES map and ACCENT_COLORS config
- lib/utils.js           → generateId(), formatDate(), assignAccentColor()

## Scaffolded But NOT Wired
- entry.theme field exists on every entry, always defaults to "neutral"
- THEMES map exists in lib/themes.js — cards already read from it
- Do NOT add sentiment detection, do NOT change theme values
- This is reserved for Phase 5 (AWS Comprehend integration)

## Permanently Out of Scope
- AWS, S3, Lambda, Bedrock, Comprehend
- Authentication or user accounts
- Any external database
- Voice recording

## Planned Phases (do not implement)
- Phase 2: Auto-push entries to AWS S3 on save
- Phase 3: S3 trigger → Lambda → Bedrock Knowledge Base sync
- Phase 4: In-app natural language query over journal entries
- Phase 5: Sentiment detection via AWS Comprehend → auto-set entry.theme
