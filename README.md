<div align="center">
  <h1>Health Dossier</h1>
  <p><strong>A home for your health story.</strong></p>
  <p>Keep medical documents together, find the one you need, and always have the original close at hand.</p>
</div>

![Health Dossier landing page at desktop size](docs/images/landing-screen.png)

<details>
  <summary>View the complete landing page</summary>
  <br />
  <img src="docs/images/landing-full.png" alt="Full-page screenshot of the Health Dossier landing page" width="100%" />
</details>

## Prepare for an appointment

Build a private, clinician-friendly visit pack from the health summary and selected records. Every section can be reviewed before printing, and care notes stay excluded unless they are deliberately added.

![Health Dossier visit pack builder with a printable patient overview](docs/images/visit-pack-screen.png)

## Control doctor access

Grant a verified demo doctor access to selected records, choose what they can do, set an expiry, and revoke access immediately. Sensitive records stay excluded until they are deliberately reviewed and selected.

![Health Dossier sharing dashboard with active access and activity history](docs/images/sharing-screen.png)

## What you can do

- Add PDF, JPG, PNG, or WebP records up to 25 MB each.
- Save a title, date, record type, provider, and notes alongside the original file.
- Search and filter your library, then preview or download a document.
- Edit record details or remove a record when you no longer need it.
- Keep a health summary with medications, allergies, conditions, blood type, emergency contact, and care notes.
- Browse records as a searchable library or a year-by-year health timeline.
- Group related records into care collections with private notes and their own timelines.
- Prepare a visit pack with selected records, medications, allergies, conditions, and emergency details.
- Print the pack or save it as a PDF without uploading health information.
- Grant simulated, time-limited doctor access with explicit permissions and immediate revocation.
- Mark sensitive records, review sharing activity, and keep those controls stored locally.
- Use the dark theme on desktop and mobile.

## Run locally

Use Node.js 20 or newer:

```bash
npm ci
npm run dev
```

Open **http://localhost:3000** and select **Get started**.

## How this version stores records

Records and files are stored in this browser profile with IndexedDB. They are not uploaded to a server. The Google, Apple, and phone sign-up screens are front-end flows; no account is created and no SMS is sent. Anyone using this browser profile can access its records. Clearing site data removes them, so keep a separate copy of important documents.

## Checks

```bash
npm run lint
npm run build
npm run test:e2e
```

The browser tests use an installed Google Chrome.

## Built with

Next.js, React, TypeScript, CSS, and IndexedDB.
