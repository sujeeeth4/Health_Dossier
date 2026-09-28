# Health Dossier

A device-local medical record library built with Next.js. Add PDF or image documents, describe them, search and filter the library, preview originals, download them, edit details, and remove records.

## Run locally

Use Node.js 20 or newer:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and choose **Get started**. The landing page leads to the sign-up interface with Google, Apple, and phone code paths. These front-end flows continue to the device-local record library. No provider or SMS service is connected yet.

## Storage and privacy

Files and details are saved in this browser profile with IndexedDB. They are not uploaded to a Health Dossier server. There is no account, encryption, cloud sync, or sharing yet. Anyone with access to this browser profile can access the library. Clearing site data removes records, so keep independent backups of important documents. Accepted files are PDF, JPG, PNG, and WebP up to 25 MB each.

## Checks

```bash
npm run lint
npm run build
npm run test:e2e
```
