# Health Dossier Version 0.1.1 Demo Build Specification

## Purpose

This file is the implementation brief for building Health Dossier Version 0.1.1 as a local website demo. It is intended to be used by Codex and updated as the product changes.

Health Dossier connects patients, doctors, clinics, and hospitals through a patient-controlled medical record. Version 0.1.1 focuses on one problem: patients should not need to carry old reports whenever they change doctors or hospitals.

**Tagline:** One Health Record. Better Connected Care.

## Current build instruction

Build a polished, responsive local demo with fictional data. The medical-report experience must be the only complete product workflow in Version 0.1.1. Appointments, medicines, health alerts, clinic administration, and platform administration may appear in navigation and dashboards, but they should be clearly presented as demo summaries or planned features.

Do not connect production services, collect real patient information, or claim that this demo is ready for clinical use.

## Version

- Product: Health Dossier
- Release: Version 0.1.1
- Release type: Local demo
- Initial market: Hyderabad, India
- Primary language: English
- Future languages: Telugu and Hindi
- Mobile strategy: Responsive web first, followed by mobile applications
- Data policy: Fictional sample data only
- Appearance: Light and dark modes, with the selection saved locally in the browser

## Product goals

Version 0.1.1 should demonstrate that a patient can:

1. Sign in through a realistic but simulated role-based entry flow.
2. See recent reports, upcoming appointments, current medicines, and health alerts.
3. Browse a medical history from birth to the present.
4. Find reports by age, date, doctor, hospital, specialty, condition, and report type.
5. Upload a sample report and review simulated extracted information.
6. Correct extracted metadata while preserving the original report.
7. Share selected reports or the complete history with a doctor.
8. Choose the recipient's permissions and an access-expiry rule.
9. Review an activity log showing how records were accessed.
10. Download or print a medical summary.
11. Switch between light and dark appearance throughout the public site and demo.

The demo should also show that a verified doctor can view shared records and contribute permitted clinical information.

## Non-goals for Version 0.1.1

Do not implement the following as production features:

- Real patient onboarding or identity verification
- Live Google, Apple, SMS, or OTP authentication
- Real National Medical Commission registry integration
- Real AI or OCR processing of medical reports
- Hospital information-system integrations
- Video consultations or real-time messaging
- Payment or subscription processing
- Emergency-access records
- Native iOS or Android applications
- Production cloud storage
- Use of real medical records

These may be represented by safe demo states or marked as planned.

## Approved technology stack

The following stack is approved for Health Dossier Version 0.1.1. Do not replace a listed technology without the founder's approval.

### Website foundation

- Framework: Next.js using the App Router
- Programming language: TypeScript
- User interface library: React
- Styling: Tailwind CSS
- Reusable interface components: shadcn/ui, customized to the Health Dossier visual system
- Icons: Lucide
- Package manager: npm
- Source control: Git and GitHub

### Forms, validation, and testing

- Form and data validation: Zod
- Component and logic tests: Vitest with React Testing Library
- Complete browser-journey tests: Playwright
- Code quality: the linting configuration supplied by Next.js, with consistent formatting

### Version 0.1.1 data and services

- Store fictional users, reports, appointments, medicines, alerts, permissions, and activity events in local TypeScript or JSON fixtures.
- Use React's built-in state tools. Add another state library only if the implemented workflows demonstrate a clear need.
- Use browser storage only for harmless demo preferences and fictional state changes.
- Keep sample document previews on the user's device. Do not upload them to a server or commit user-selected files to Git.
- Simulate Google sign-in, Apple sign-in, phone OTP, report extraction, doctor verification, and record sharing.
- Do not create a database, backend account, cloud-storage bucket, or hosted environment for Version 0.1.1.

### Planned production services

The proposed production direction is Supabase for PostgreSQL, authentication, storage, and permission enforcement. This is a future architectural direction, not part of Version 0.1.1. Before it is adopted for real medical information, the team must separately review hosting location, encryption, consent evidence, access auditing, retention, backups, breach response, Indian privacy requirements, and healthcare governance.

### Planned mobile application

Build the future mobile application with React Native and Expo. Share TypeScript data models, Zod validation rules, API contracts, design tokens, and business rules with the website where practical. Do not assume that web interface components can be reused unchanged on iOS and Android.

### Implementation rules for Version 0.1.1

- Use local fixtures for users, reports, appointments, medicines, alerts, and audit events.
- Use browser storage only for harmless demo preferences or demo changes.
- Do not store uploaded medical documents remotely.
- Clearly label simulated authentication, report extraction, doctor verification, and sharing.
- Include a persistent notice: **Development demo. Do not upload real patient information.**
- Keep the design responsive across phones, tablets, laptops, and desktop displays.

Before writing code, inspect the repository and preserve any existing user work. Do not replace an established stack without confirmation.

## User roles

### Patient

The patient owns the medical dossier and controls access. The patient can browse records, upload sample reports, correct extracted metadata, select reports to share, grant or revoke access, and view access history.

### Doctor

The doctor receives access only after the patient grants it. The doctor can view the permitted material and, when given contribution access, add reports, prescriptions, diagnoses, and notes.

### Clinic or hospital administrator

The organization administrator manages a demo organization profile, affiliated professionals, and verification requests. Version 0.1.1 may use placeholder screens for this role.

### Platform administrator

The platform administrator reviews simulated doctor-verification cases and can view basic demo activity. Version 0.1.1 may use placeholder screens for this role.

## Dependent profiles and caregivers

### Children

- A parent or guardian controls a child's profile until the child turns 18.
- At age 18, the interface should show that control must transfer to the patient.
- The demo does not need a legal identity-transfer process, but it must explain the intended behavior.

### Adults aged 60 and above

- Caregiver access is never automatic.
- The patient or an authorized guardian invites the caregiver.
- The patient selects permissions and can revoke access at any time.
- The caregiver and patient have separate accounts and separate activity-log entries.

## Information architecture

### Public and entry pages

1. Landing page
2. Login page
3. Signup page
4. Role selection page
5. Simulated authentication confirmation

### Patient pages

1. Patient dashboard
2. Medical timeline
3. Report library
4. Upload report
5. Review extracted information
6. Report details
7. Share records
8. Active access and sharing history
9. Activity log
10. Medical summary
11. Profile and dependent profiles
12. Settings and language preference

### Doctor pages

1. Doctor dashboard
2. Verification status
3. Patient access requests
4. Authorized patient list
5. Patient medical timeline
6. Report details
7. Add report, prescription, diagnosis, or note

### Administration pages

1. Clinic or hospital overview
2. Affiliated professionals
3. Verification requests
4. Platform verification queue
5. Basic platform activity

Administration pages may be clearly labeled previews in Version 0.1.1.

## Landing page

The landing page must explain the product without implying that it is publicly available.

### Required sections

1. Header with logo, product name, navigation, and demo login button
2. Hero section with the tagline and a clear explanation of the product
3. Primary action to explore the local demo
4. The patient problem: scattered reports and repeated history-taking
5. How Health Dossier works
6. Patient benefits
7. Doctor and provider benefits
8. Privacy and patient-control explanation
9. Version 0.1.1 demo notice
10. Footer with placeholder links for privacy, terms, and contact

### Suggested hero copy

**Headline:** One Health Record. Better Connected Care.

**Supporting copy:** Keep your medical history organized from birth to today, and share the right information with the right doctor when you choose.

**Primary action:** Explore the Demo

**Secondary action:** See How It Works

Avoid statistics, testimonials, partner logos, or regulatory claims that have not been supplied.

## Authentication and role selection

The login and signup experience should visually support:

- Continue with Google
- Continue with Apple
- Phone number and OTP
- A combination of social sign-in and verified phone number

All authentication must be simulated locally. The user must select Patient, Doctor, or Clinic or Hospital before entering the relevant demo. Platform administration may use a separate internal demo entry.

Use clear text stating that no real account is created.

## Patient dashboard

The dashboard should prioritize:

1. Recent reports
2. Upcoming appointments
3. Current medicines
4. Health alerts

Include a clear action to upload a report and a second action to share records. Appointments, medicines, and alerts use fictional sample data in Version 0.1.1.

## Medical timeline

Age is the primary organization model. The timeline runs continuously from birth to the present.

### Life-stage groups

- Infancy: birth through 2 years
- Early childhood: 3 through 5 years
- Childhood: 6 through 12 years
- Adolescence: 13 through 17 years
- Adulthood: 18 years onward

Each event should show the patient's exact age at the time of the event. Life-stage labels aid navigation and must not replace precise dates or ages.

### Timeline event fields

- Report title
- Report type
- Date
- Patient age at the event
- Doctor
- Hospital or clinic
- Specialty
- Condition or tags
- Source of the report
- Sharing status

### Sorting and filters

Support:

- Age
- Newest and oldest date
- Most recent activity
- Doctor
- Hospital or clinic
- Specialty
- Condition
- Report type
- Family member or dependent profile

Filtering must work together, and the user must be able to clear all filters easily.

## Report types

The demo should include representative examples of:

- Prescriptions
- Laboratory reports
- Imaging and scan reports
- Discharge summaries
- Vaccination records
- Diagnoses
- Allergy records
- Procedure records
- General clinical documents

## Upload and simulated extraction

Allow a user to select a sample PDF or image. Do not send it to an external service.

The demo flow is:

1. Select a file.
2. Display a simulated processing state.
3. Populate sample extracted fields.
4. Ask the patient to review the fields.
5. Allow corrections.
6. Preserve the original preview without alteration.
7. Save only a safe local demo representation.

### Extracted fields

- Document title
- Report type
- Report date
- Doctor name
- Hospital or clinic
- Specialty
- Conditions or tags
- Medicines
- Tests and notable values

Display a visible message that extraction is simulated and medical details must be verified against the original document.

## Record sharing and consent

Patients may share an individual report, a selected collection, or the complete history.

### Sharing methods shown in the demo

- QR code
- Time-limited link
- Doctor search and invitation
- Clinic reception request

These methods may use simulated recipients and links. Do not create publicly accessible health links.

### Permission levels

- **View only:** The recipient can view the selected records.
- **View and contribute:** The recipient can view records and add permitted reports, prescriptions, diagnoses, and notes.

### Expiry choices

- One consultation
- 24 hours
- 7 days
- Custom expiry date
- Until manually revoked
- Until a doctor closes an episode of care and the patient confirms closure

The patient must be able to revoke access immediately from the active-access screen.

### Sensitive records

Patients can mark a record as sensitive and exclude it from broad sharing. The sharing screen must identify excluded records and allow deliberate inclusion when appropriate.

## Activity log

Show who performed an action, what they accessed or changed, and when it happened.

Include sample events for:

- Report viewed
- Report uploaded
- Report downloaded
- Metadata corrected
- Access granted
- Access revoked
- Clinical note contributed

Do not imply that the Version 0.1.1 log is a production-grade legal audit trail.

## Doctor experience

The doctor dashboard should include:

- Verification status
- Patient search within authorized demo data
- Access requests
- Authorized patients
- Medical timeline
- Report viewer
- Upload report
- Write prescription
- Add diagnosis
- Add clinical note

The patient context should always show the current permission level and its expiry.

## Doctor verification design

Version 0.1.1 simulates a multi-step verification process:

1. Verify phone number and email.
2. Collect medical registration number and State Medical Council.
3. Compare the submitted identity with the National Medical Commission or Indian Medical Register.
4. Request professional identification when a match is unavailable.
5. Allow manual review by a platform administrator.
6. Optionally confirm clinic or hospital affiliation.
7. Display a Verified Doctor badge only after approval.

The official registry currently supports searches using details such as doctor name, registration number, registration year, and State Medical Council. It also warns that registry information is being updated. Treat automated matching as a future integration, not as a complete source of truth.

Official reference: [National Medical Commission Indian Medical Register](https://nmc.org.in/information-desk/indian-medical-register)

## Downloadable medical summary

The patient should be able to preview and print or download a demo medical summary containing:

- Patient identity using fictional data
- Allergies
- Current medicines
- Important conditions
- Recent reports
- Treating doctors
- Generated date
- A statement that original reports remain the authoritative source

The exported summary should carry a visible Version 0.1.1 Demo watermark.

## Visual system

The desired character is modern, warm, human, and professional.

### Approved palette

| Role | Color | Hex |
| --- | --- | --- |
| Primary | Trust blue | `#2563EB` |
| Secondary | Healthcare green | `#237A57` |
| Blue surface | Soft sky | `#EAF4FF` |
| Warm surface | Warm cream | `#FFF9F0` |
| Main text | Charcoal | `#27332D` |
| Alert accent | Soft coral | `#F28C7F` |
| Base | White | `#FFFFFF` |

Use blue for primary actions and navigation. Use green for positive health states, verified status, and selected medical contexts. Use coral sparingly for alerts; do not rely on color alone to communicate urgency.

Dark mode uses deep green and blue surfaces with lighter text and adjusted status colors. Keep the original-document sample preview white and the printed medical summary light for legibility. The appearance preference is harmless browser-local data and must not affect medical records, permissions, or sharing.

### Logo direction

Create a consistent logo system based on the supplied hand-drawn concept:

1. A refined winged medical-staff symbol with an HD monogram
2. The symbol paired with the Health Dossier wordmark
3. A compact HD app icon

Preserve the concept while improving symmetry, legibility, spacing, and small-size recognition. The Version 0.1.1 interface may use a clean temporary vector interpretation until final brand assets are approved.

### Interface style

- Generous white space
- Rounded but restrained cards and controls
- Clear headings and readable body text
- Friendly, credible illustrations or icons
- Simple charts only where they improve understanding
- Visible keyboard focus
- Sufficient color contrast
- Large touch targets on mobile
- Light and dark modes with a visible, keyboard-accessible switch on the landing page and in the demo
- Save the appearance choice in browser storage and apply it before the page paints

## Language strategy

Build Version 0.1.1 in English. Structure visible text so Telugu and Hindi translations can be added without rewriting components. A language selector may appear as disabled or labeled Coming Soon, but it must not suggest that incomplete translations are available.

## Demo data and privacy rules

- Use fictional names, dates, hospitals, doctors, registration numbers, and medical information.
- Do not copy a real person's report into fixtures, screenshots, examples, or tests.
- Display the development-demo warning throughout authenticated areas.
- Do not commit uploaded files to the repository.
- Do not create public sharing URLs.
- Do not claim compliance, certification, encryption, or clinical readiness unless those controls have been implemented and reviewed.
- Treat privacy law, security architecture, hosting, consent records, retention, and hospital integration as production decisions outside Version 0.1.1.

## Required demo states

The interface should include polished states for:

- Loading
- Empty list
- No search results
- Upload in progress
- Simulated extraction in progress
- Extraction requires review
- Upload error
- Access granted
- Access expired
- Access revoked
- Verification pending
- Verification approved
- Permission denied
- Offline or unavailable action

## Accessibility and responsive requirements

- Use semantic page structure and properly associated form labels.
- Support keyboard navigation.
- Maintain visible focus indicators.
- Provide meaningful alternative text for informative images.
- Do not use placeholder text as the only field label.
- Ensure status and error messages are understandable without color.
- Design mobile-first and test common phone, tablet, laptop, and desktop widths.
- Keep report filters usable on narrow screens through a drawer or stacked controls.

## Acceptance criteria

Version 0.1.1 is complete when:

- The project runs locally using documented setup steps.
- The landing page explains the product and identifies it as a demo.
- Patient, doctor, clinic or hospital, and platform-admin entry points are visible.
- Authentication and verification are clearly simulated.
- A patient can browse fictional reports from birth to the present.
- Sorting, search, and all agreed filters work on sample data.
- A patient can complete the sample upload and metadata-correction flow.
- The original document preview remains unchanged after metadata corrections.
- A patient can configure report scope, permission level, sharing method, and expiry.
- A patient can revoke access and see the change in the activity log.
- A doctor can open an authorized patient timeline and add a permitted sample contribution.
- A downloadable or printable demo medical summary is available.
- The interface is responsive and keyboard usable.
- Light and dark modes are readable across public and authenticated screens; the choice survives navigation and reloads, while printing remains legible.
- English is complete, while Telugu and Hindi are identified as later additions.
- No feature requires or encourages real medical information.
- Automated checks and a final visual review pass without known critical defects.

## Suggested implementation sequence

1. Establish the design tokens, responsive shell, navigation, and demo warning.
2. Build the landing page and role-based entry flow.
3. Create fictional user and health-record fixtures.
4. Build the patient dashboard and medical timeline.
5. Add report search, sorting, and filters.
6. Build upload, simulated extraction, correction, and report-detail flows.
7. Build sharing, permissions, expiry, revocation, and activity history.
8. Build the doctor dashboard and permitted contribution flow.
9. Add clinic and platform-admin preview screens.
10. Add the medical-summary preview and print or download behavior.
11. Add empty, loading, error, and permission states.
12. Test responsiveness, accessibility, and the complete demo journey.

Implement and verify one coherent slice at a time. Do not silently expand the scope.

## Future roadmap

Candidate future versions may include:

- Real authentication and identity verification
- Secure cloud storage and production database design
- Real report OCR and structured extraction
- Live NMC registry and State Medical Council verification workflows
- Clinic and hospital integrations
- Appointment booking
- Medication reminders
- Health notifications
- Secure messaging
- Video consultations
- Telugu and Hindi translations
- Automatic system-theme matching
- Emergency profile and emergency QR access
- Native mobile applications
- Business model and subscription features

Each new version should define its own scope, non-goals, privacy impact, migration needs, and acceptance criteria before implementation.

## Version history

| Version | Date | Status | Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-09-28 | Approved for local demo build | Landing and role-based demo centered on organized medical reports, patient-controlled sharing, a doctor view, and the approved Next.js and TypeScript stack |
| 0.1.1 | 2026-09-28 | Implemented | Added browser-local light and dark appearance modes across the public site and demo; moved dark mode out of the future roadmap. No new medical data, external service, security control, or integration is required. |

## Update rules

When this specification changes:

1. Update the version number and date.
2. Add a row to Version history.
3. State which requirements were added, changed, or removed.
4. Update acceptance criteria and affected user journeys.
5. Identify any new data, privacy, security, or integration requirements.
6. Keep unbuilt ideas in the roadmap rather than mixing them into the current release.
7. Keep this build specification aligned with `Health_Dossier_Product_Documentation.docx`.
