# Health Dossier code guide

This guide explains how the local demo is organized and where to make common changes. The application is a Next.js App Router project written in TypeScript, with localhost API routes and JSON/filesystem persistence on the same Mac.

## Project map

```text
src/app/              Next.js route entry points and global styles
src/features/         Complete patient and doctor workflows, grouped by domain
src/components/       Shared brand, navigation, illustration, and UI primitives
src/lib/records.ts    Shared domain types and the browser HTTP client
src/server/           Server-only JSON storage, sessions, and authorization
data/                 Gitignored JSON database, backup, sessions, and uploads
tests/e2e/            Playwright tests for complete user journeys
docs/                 Product documents, code guidance, and README screenshots
```

Route files in `src/app/` are intentionally thin. They import screen components from the matching `src/features/` folder, which keeps routing separate from browser state and workflow logic. Code shared by multiple features belongs in `src/components/` or `src/lib/`; feature-specific code should stay with its domain.

## Main workflows

| Route                                | Component                     | Responsibility                                                                                                    |
| ------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/summary`                           | `HealthSummaryPage`           | Patient details, allergies, conditions, medications, and emergency contact                                        |
| `/records`                           | `RecordLibrary`               | Local file upload, simulated extraction review, structured metadata, search, and a timeline with accepted doctor notes |
| `/collections`                       | `CareCollectionsPage`         | Groups records into care journeys                                                                                 |
| `/collections/[id]`                  | `CareCollectionDetail`        | Collection timeline, notes, and membership                                                                        |
| `/visit-pack`                        | `VisitPackPage`               | Builds a print-friendly appointment overview with patient-controlled accepted doctor notes                        |
| `/sharing`                           | `SharingPage`                 | Simulated consent, expiry, contribution review, revocation, and activity history                                  |
| `/doctor/login` and `/doctor/signup` | `DoctorLogin`, `DoctorSignup` | Browser-local credentials and simulated professional verification                                                 |
| `/doctor`                            | `DoctorPortal`                | Active grants, shared-record access, structured consultation submission, and doctor activity events              |
| `/settings`                          | `SettingsPage`                | Encrypted export, archive inspection, merge/replace restore, and snapshot rollback                                |

`DossierNav` is the shared authenticated-area navigation. Add a route there only when it is a top-level patient workflow.

## Data and privacy boundaries

Feature components call `src/lib/records.ts`; they should not use `fetch` or filesystem paths directly. Server route handlers authorize requests and delegate persistence to `src/server/`.

The local data directory contains:

- `database.json`: patient settings, metadata, collections, doctor profiles and credential hashes, shares, doctor contributions, and activity.
- `database.json.bak`: the previous valid database write.
- `sessions.json`: hashed, expiring session tokens.
- `uploads/`: original PDFs and images, addressed internally by record ID.
- `restore-snapshots/`: the three newest private pre-restore database and upload snapshots.
- `.backup-temp/`: short-lived encrypted, decrypted, and staged restore files.

JSON updates pass through Zod validation and the serialized atomic-write queue. Related changes must happen in one `updateDatabase` callback. Never return `filePath` values through an API.

No component should create a public URL, upload a document, or imply that simulated access is production security.

Patient and doctor sessions use separate HTTP-only cookies. The doctor portal and file routes must always derive access from active, unexpired grants for the signed-in doctor; they must never expose the complete record library as a fallback.

Doctor consultation notes use the dedicated `/api/contributions` route. The server derives doctor identity from the authenticated session, validates the grant and linked record, and writes each submission or patient decision together with its audit event. Submitted notes are immutable; only accepted notes are presented in the patient timeline and Visit Pack.

Backup routes under `/api/backups` require the patient session and same-origin requests. `src/server/backup.ts` writes a versioned gzipped tar stream, encrypts it with AES-256-GCM using a PBKDF2-derived key, verifies authenticated ciphertext and SHA-256 file checksums during inspection, and stages every restore before swapping local data. Archives contain credential hashes but never `sessions.json` or raw passwords.

`src/lib/legacy-indexeddb.ts` exists only for the explicit one-time migration. New feature code must not write to IndexedDB.

The record import demo deliberately derives fictional suggestions from the selected file name. It never reads document contents or sends files to an extraction service. `RecordLibrary` requires the user to compare those suggestions with the original before saving and stores the corrected field names with the record.

## Component conventions

Screen components follow the same order:

1. Local types and static configuration.
2. Persisted and temporary React state.
3. Initial data-loading effect.
4. Derived lists built with `useMemo` when useful.
5. Event handlers and persistence actions.
6. Page markup.
7. Small presentation-only helper components.

Keep business rules in named functions. Comments should explain privacy decisions, transaction boundaries, or non-obvious behavior—not restate JSX or TypeScript syntax.

## Styling

`src/app/globals.css` is grouped by product area in the same order as the main routes. Shared tokens and primitives appear first; responsive rules and print rules appear last. Reuse the existing CSS variables and shared classes before adding another variant.

The Visit Pack deliberately switches to a light paper design and has dedicated `@media print` rules. Changes to that feature should be checked both on screen and as an A4 print preview.

## Verification

Run these commands after code changes:

```bash
npm run lint
npm run build
npm run test:e2e
```

The browser tests use isolated browser contexts and fictional data. Add or update a journey test when a user-visible workflow changes.
