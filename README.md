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

## What you can do

- Add PDF, JPG, PNG, or WebP records up to 25 MB each.
- Save a title, date, record type, provider, and notes alongside the original file.
- Search and filter your library, then preview or download a document.
- Edit record details or remove a record when you no longer need it.
- Keep a health summary with medications, allergies, conditions, blood type, emergency contact, and care notes.
- Browse records as a searchable library or a year-by-year health timeline.
- Group related records into care collections with private notes and their own timelines.
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
