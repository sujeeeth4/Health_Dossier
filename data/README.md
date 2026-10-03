# Local Health Dossier data

When the app runs, this directory contains plaintext health data for this Mac:

- `database.json` — profiles, record metadata, collections, shares, and activity.
- `database.json.bak` — the previous valid database write.
- `sessions.json` — hashed local session tokens.
- `uploads/` — original PDFs and images.
- `restore-snapshots/` — up to three local pre-restore recovery points.
- `.backup-temp/` — temporary staging files removed after backup operations.
- `backup-state.json` — timestamp of the last completed encrypted export.

Runtime files are intentionally ignored by Git. Anyone who can read files from
this macOS account can read this data. Back up the complete directory together,
and use the Settings page to create or restore an encrypted `.hdbak` archive.
