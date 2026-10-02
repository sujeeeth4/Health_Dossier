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

## Doctor access inbox

Doctors can create a browser-local, demo-verified professional profile or sign in with a seeded demo account. Their inbox contains only active records that a patient explicitly shared with that doctor, and every preview or download is added to the patient-visible activity history.

![Health Dossier doctor portal showing patient-granted records](docs/images/doctor-inbox-screen.png)

## What you can do

- Add PDF, JPG, PNG, or WebP records up to 25 MB each.
- Review simulated smart-import suggestions beside the original document before anything is saved.
- Save a title, date, record type, provider, specialty, tags, medicines, notable values, and notes alongside the original file.
- See which suggested details were corrected during the required review step.
- Search and filter your library, then preview or download a document.
- Edit record details or remove a record when you no longer need it.
- Keep a health summary with medications, allergies, conditions, blood type, emergency contact, and care notes.
- Browse records as a searchable library or a year-by-year health timeline.
- Group related records into care collections with private notes and their own timelines.
- Prepare a visit pack with selected records, medications, allergies, conditions, and emergency details.
- Print the pack or save it as a PDF without uploading health information.
- Grant simulated, time-limited doctor access with explicit permissions and immediate revocation.
- Mark sensitive records, review sharing activity, and keep those controls stored locally.
- Create a demo-verified doctor profile with locally hashed credentials.
- Sign in to a protected doctor inbox and review only active, patient-granted records.
- Use the dark theme on desktop and mobile.

## Run locally

Use Node.js 20 or newer:

```bash
npm ci
npm run dev
```

Open **http://localhost:3000** and select **Get started**.

## How this version stores records

Records and files are stored in this browser profile with IndexedDB. They are not uploaded to a server. Smart-import suggestions are fictional, generated locally from the demo file name, and must be checked against the original document. Patient Google, Apple, and phone sign-up screens are front-end flows; no patient account is created and no SMS is sent. Doctor accounts are also browser-local: passwords are stored only as salted hashes, sessions last for the browser tab, and professional verification is simulated. This is not production authentication or authoritative medical-license verification. Anyone using this browser profile can access its records. Clearing site data removes them, so keep a separate copy of important documents.

## Checks

```bash
npm run lint
npm run build
npm run test:e2e
```

The browser tests use an installed Google Chrome.

For an overview of the routes, components, local storage, and code conventions, see [the code guide](docs/CODE_GUIDE.md).

## Built with

Next.js, React, TypeScript, CSS, and IndexedDB.
