# Health Dossier Version 0.1.1

A responsive local demonstration of a patient-controlled medical record. All people, reports, and organizations in the demo are fictional. Do not upload real patient information.

Use the appearance switch in the site header or demo, or the Appearance control in patient Settings, to change between light and dark modes. The choice is saved in this browser. Printed medical summaries use a light page for readability.

## Run locally

Install Node.js 20 or newer and npm. Then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page leads into simulated patient, doctor, clinic, and platform-administration roles. No account, backend, cloud storage, or external sharing link is created.

## Demo journey

Enter as a patient, browse the timeline and report library, upload the built-in fictional sample, and review its metadata. In Sharing & access, grant Dr. Meera Sen view-and-contribute access to a selected report. Switch to the doctor role to view the authorized record and add a fictional note. Switch back to the patient role to see the activity event, revoke access, and print or save the medical summary as a PDF.

Fictional metadata and sharing changes are saved in this browser's local storage. A user-selected document preview stays in browser memory for the current session only; its bytes are not saved or uploaded. Clear the site's storage to reset the demo.

## Checks

```bash
npm run build
npm test
npm run test:e2e
```

The browser test uses an installed Google Chrome. The medical summary uses the browser print dialog; choose “Save as PDF” to download it.

## Scope

Medical reports and sharing are the complete demo flow. Appointments, medicines, alerts, and administration appear as previews. Authentication, report extraction, professional verification, and sharing methods are simulated. This release is not for clinical use.
