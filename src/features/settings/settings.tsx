"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Database,
  Download,
  FileArchive,
  HardDrive,
  History,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import {
  exportEncryptedBackup,
  getBackupStatus,
  inspectBackup,
  restoreBackup,
  rollbackSnapshot,
  type BackupInspection,
  type BackupStatus,
  type RestoreMode,
} from "@/lib/backups";
import { formatBytes } from "@/lib/records";

export function SettingsPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportConfirmation, setExportConfirmation] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [archive, setArchive] = useState<File | null>(null);
  const [inspection, setInspection] = useState<BackupInspection | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState<"export" | "inspect" | "restore" | "rollback" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function refreshStatus() {
    return getBackupStatus().then(setStatus);
  }

  useEffect(() => {
    refreshStatus().catch(() => setError("Backup status could not be opened."));
  }, []);

  async function exportBackup(event: React.FormEvent) {
    event.preventDefault();
    if (exportPassphrase.length < 12) {
      setError("Use at least 12 characters for the backup passphrase.");
      return;
    }
    if (exportPassphrase !== exportConfirmation) {
      setError("The backup passphrases do not match.");
      return;
    }
    setBusy("export");
    setError("");
    setMessage("");
    try {
      const backup = await exportEncryptedBackup(exportPassphrase);
      const url = URL.createObjectURL(backup.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setExportPassphrase("");
      setExportConfirmation("");
      setMessage("Encrypted backup created and downloaded.");
      await refreshStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Backup could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function inspect(event: React.FormEvent) {
    event.preventDefault();
    if (!archive) {
      setError("Choose a .hdbak file to inspect.");
      return;
    }
    setBusy("inspect");
    setError("");
    setMessage("");
    setInspection(null);
    setAcknowledged(false);
    try {
      setInspection(await inspectBackup(archive, restorePassphrase));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Backup could not be inspected.");
    } finally {
      setBusy(null);
    }
  }

  async function applyRestore() {
    if (!archive || !inspection || !acknowledged) return;
    setBusy("restore");
    setError("");
    try {
      await restoreBackup(archive, restorePassphrase, mode);
      setMessage(
        mode === "merge"
          ? "Backup merged. Current conflicts were kept."
          : "The dossier was replaced from the encrypted backup.",
      );
      setArchive(null);
      setInspection(null);
      setRestorePassphrase("");
      setAcknowledged(false);
      await refreshStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Restore could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  async function rollback(id: string, createdAt: string) {
    if (!window.confirm(`Restore the local snapshot from ${formatDateTime(createdAt)}?`)) return;
    setBusy("rollback");
    setError("");
    setMessage("");
    try {
      await rollbackSnapshot(id);
      setMessage("Recovery snapshot restored. Doctor sessions were signed out.");
      await refreshStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Snapshot could not be restored.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="settings-page">
      <header className="site-header wrap">
        <Brand />
        <DossierNav active="settings" />
        <div className="header-actions">
          <Link className="header-back" href="/">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>
      <div className="settings-shell wrap">
        <div className="settings-heading">
          <div>
            <span className="section-kicker">LOCAL DATA PROTECTION</span>
            <h1>Backup & recovery</h1>
            <p>Create an encrypted copy of the complete dossier before you need it.</p>
          </div>
          <span className="settings-shield"><ShieldCheck size={28} /></span>
        </div>

        <div className="settings-local-note">
          <HardDrive size={20} />
          <div>
            <strong>Designed for this Mac-local demonstration</strong>
            <p>Exports are encrypted. Local recovery snapshots remain inside the private plaintext data folder.</p>
          </div>
        </div>

        {message && <p className="save-message" role="status">{message}</p>}
        {error && <p className="notice-error" role="alert">{error}</p>}

        <section className="backup-overview" aria-label="Dossier backup status">
          <article><Database size={20} /><strong>{status?.counts.records ?? "—"}</strong><span>Records</span></article>
          <article><FileArchive size={20} /><strong>{status?.counts.files ?? "—"}</strong><span>Original files</span></article>
          <article><HardDrive size={20} /><strong>{status ? formatBytes(status.totalBytes) : "—"}</strong><span>File size</span></article>
          <article><History size={20} /><strong>{status?.lastBackupAt ? formatShortDate(status.lastBackupAt) : "Never"}</strong><span>Last export</span></article>
        </section>

        <div className="settings-grid">
          <section className="settings-card">
            <div className="settings-card-heading">
              <span><Download size={21} /></span>
              <div><h2>Export encrypted backup</h2><p>Records, original files, account hashes, grants, and history in one archive.</p></div>
            </div>
            <form onSubmit={exportBackup} className="settings-form">
              <label className="field">
                Backup passphrase
                <input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={exportPassphrase} onChange={(event) => setExportPassphrase(event.target.value)} placeholder="At least 12 characters" />
              </label>
              <label className="field">
                Confirm passphrase
                <input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={exportConfirmation} onChange={(event) => setExportConfirmation(event.target.value)} />
              </label>
              <div className="backup-warning"><KeyRound size={17} /><p><strong>Keep this passphrase safe.</strong> It cannot be recovered or reset.</p></div>
              <button className="button button-primary" disabled={busy !== null}>
                <Download size={17} /> {busy === "export" ? "Encrypting…" : "Create encrypted backup"}
              </button>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span><UploadCloud size={21} /></span>
              <div><h2>Inspect and restore</h2><p>No data changes until validation succeeds and you confirm a restore mode.</p></div>
            </div>
            <form onSubmit={inspect} className="settings-form">
              <label className="backup-file-picker">
                <input type="file" accept=".hdbak,application/octet-stream" onChange={(event) => { setArchive(event.target.files?.[0] ?? null); setInspection(null); }} />
                <FileArchive size={23} />
                <span><strong>{archive?.name ?? "Choose a .hdbak file"}</strong><small>{archive ? formatBytes(archive.size) : "Health Dossier encrypted archive"}</small></span>
              </label>
              <label className="field">
                Backup passphrase
                <input type="password" autoComplete="current-password" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} />
              </label>
              <button className="button button-outline" disabled={busy !== null || !archive}>
                <ShieldCheck size={17} /> {busy === "inspect" ? "Validating…" : "Inspect backup"}
              </button>
            </form>
          </section>
        </div>

        {inspection && (
          <section className="restore-review">
            <div className="settings-card-heading">
              <span><Check size={21} /></span>
              <div><h2>Validated backup</h2><p>Created {formatDateTime(inspection.createdAt)} · {inspection.counts.records} records · {formatBytes(inspection.totalBytes)}</p></div>
            </div>
            <div className="restore-mode-grid">
              <label className={mode === "merge" ? "selected" : ""}>
                <input type="radio" name="restore-mode" checked={mode === "merge"} onChange={() => { setMode("merge"); setAcknowledged(false); }} />
                <Database size={19} /><span><strong>Merge safely</strong><small>Add {inspection.comparison.newRecords} missing records; keep {inspection.comparison.conflictingRecords} current conflicts.</small></span>
              </label>
              <label className={mode === "replace" ? "selected danger" : "danger"}>
                <input type="radio" name="restore-mode" checked={mode === "replace"} onChange={() => { setMode("replace"); setAcknowledged(false); }} />
                <AlertTriangle size={19} /><span><strong>Replace complete dossier</strong><small>Current items absent from this backup will be removed.</small></span>
              </label>
            </div>
            <label className="restore-acknowledgement">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
              <span>I understand a private recovery snapshot will be created before this {mode} restore.</span>
            </label>
            <button className={mode === "replace" ? "button button-danger" : "button button-primary"} disabled={!acknowledged || busy !== null} onClick={applyRestore}>
              <UploadCloud size={17} /> {busy === "restore" ? "Restoring…" : mode === "merge" ? "Merge backup" : "Replace dossier"}
            </button>
          </section>
        )}

        <section className="settings-card recovery-card">
          <div className="settings-card-heading">
            <span><History size={21} /></span>
            <div><h2>Local recovery snapshots</h2><p>The three newest pre-restore states are kept on this Mac.</p></div>
          </div>
          {status?.snapshots.length ? (
            <div className="snapshot-list">
              {status.snapshots.map((snapshot) => (
                <article key={snapshot.id}>
                  <div><strong>{formatDateTime(snapshot.createdAt)}</strong><p>{snapshot.reason} · {snapshot.counts.records} records · {formatBytes(snapshot.totalBytes)}</p></div>
                  <button className="button button-outline" disabled={busy !== null} onClick={() => rollback(snapshot.id, snapshot.createdAt)}><RotateCcw size={15} /> Roll back</button>
                </article>
              ))}
            </div>
          ) : <div className="history-empty">A snapshot will appear before the first restore.</div>}
        </section>
      </div>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}
