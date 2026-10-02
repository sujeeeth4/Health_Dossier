# Health Dossier code guide

This guide explains how the local demo is organized and where to make common changes. The application is a Next.js App Router project written in TypeScript. It has no backend: all fictional records and workflow state remain in the current browser profile.

## Project map

```text
app/                  Route entry points and global styles
components/           Stateful screens and reusable visual components
components/ui/        Small generic UI primitives
lib/records.ts        Domain models and the complete IndexedDB data layer
tests/e2e/            Playwright tests for complete user journeys
docs/images/          Screenshots used by the README
```

Route files in `app/` are intentionally thin. They import a screen component from `components/`, which keeps routing separate from browser state and workflow logic.

## Main workflows

| Route                                | Component                     | Responsibility                                                                                                    |
| ------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/summary`                           | `HealthSummaryPage`           | Patient details, allergies, conditions, medications, and emergency contact                                        |
| `/records`                           | `RecordLibrary`               | Local file upload, simulated extraction review, structured metadata, search, timeline, and sensitive-record flags |
| `/collections`                       | `CareCollectionsPage`         | Groups records into care journeys                                                                                 |
| `/collections/[id]`                  | `CareCollectionDetail`        | Collection timeline, notes, and membership                                                                        |
| `/visit-pack`                        | `VisitPackPage`               | Builds a print-friendly appointment overview                                                                      |
| `/sharing`                           | `SharingPage`                 | Simulated consent, expiry, revocation, and activity history                                                       |
| `/doctor/login` and `/doctor/signup` | `DoctorLogin`, `DoctorSignup` | Browser-local credentials and simulated professional verification                                                 |
| `/doctor`                            | `DoctorPortal`                | Active patient grants, shared-record access, and doctor activity events                                           |

`DossierNav` is the shared authenticated-area navigation. Add a route there only when it is a top-level patient workflow.

## Data and privacy boundaries

`lib/records.ts` is the only module that should know IndexedDB store names or database versions. UI components call its typed functions instead of opening IndexedDB directly.

The database contains these stores:

- `records`: metadata plus the original local `Blob`.
- `settings`: keyed values such as birth date and health summary.
- `collections`: collection names, descriptions, and private notes.
- `shares`: simulated access grants.
- `share-events`: the browser-local sharing activity log.
- `doctor-profiles`: public professional details shown to patients.
- `doctor-credentials`: salted password hashes kept separate from public profiles.

When changing the schema, increase the database version in `openDatabase` and add a guarded migration inside `onupgradeneeded`. Operations that update related stores should share one transaction so partial state cannot be saved.

No component should create a public URL, upload a document, or imply that simulated access is production security.

Doctor sessions use `sessionStorage` and therefore persist across refreshes only in the current browser tab. The doctor portal must always derive accessible records from active, unexpired grants for the signed-in doctor; it must never expose the complete record library as a fallback.

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

`app/globals.css` is grouped by product area in the same order as the main routes. Shared tokens and primitives appear first; responsive rules and print rules appear last. Reuse the existing CSS variables and shared classes before adding another variant.

The Visit Pack deliberately switches to a light paper design and has dedicated `@media print` rules. Changes to that feature should be checked both on screen and as an A4 print preview.

## Verification

Run these commands after code changes:

```bash
npm run lint
npm run build
npm run test:e2e
```

The browser tests use isolated browser contexts and fictional data. Add or update a journey test when a user-visible workflow changes.
