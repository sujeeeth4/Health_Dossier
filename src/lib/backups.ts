import { openPatientSession } from "@/lib/records";

export type RestoreMode = "merge" | "replace";
export type BackupCounts = {
  records: number;
  files: number;
  collections: number;
  doctors: number;
  shares: number;
  contributions: number;
  measurements: number;
};
export type RecoverySnapshot = {
  id: string;
  createdAt: string;
  reason: string;
  counts: BackupCounts;
  totalBytes: number;
};
export type BackupStatus = {
  counts: BackupCounts;
  totalBytes: number;
  lastBackupAt?: string;
  snapshots: RecoverySnapshot[];
};
export type BackupInspection = {
  createdAt: string;
  databaseVersion: number;
  counts: BackupCounts;
  totalBytes: number;
  comparison: {
    newRecords: number;
    conflictingRecords: number;
    newDoctors: number;
    conflictingDoctors: number;
    newContributions: number;
    conflictingContributions: number;
    newMeasurements: number;
    conflictingMeasurements: number;
  };
};
export type RestoreResult = {
  mode: RestoreMode | "rollback";
  snapshotId: string;
  counts: BackupCounts;
};

async function checkedFetch(url: string, init?: RequestInit, retry = true) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (response.status === 401 && retry) {
    await openPatientSession();
    return checkedFetch(url, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "The backup request failed.");
  }
  return response;
}

export async function getBackupStatus() {
  return (await (await checkedFetch("/api/backups")).json()) as BackupStatus;
}

export async function exportEncryptedBackup(passphrase: string) {
  const response = await checkedFetch("/api/backups/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  const disposition = response.headers.get("content-disposition") || "";
  const name = disposition.match(/filename="([^"]+)"/)?.[1] || "health-dossier.hdbak";
  return { blob: await response.blob(), name };
}

function archiveHeaders(passphrase: string) {
  return {
    "Content-Type": "application/octet-stream",
    "X-Backup-Passphrase": encodeURIComponent(passphrase),
  };
}

export async function inspectBackup(file: File, passphrase: string) {
  return (await (
    await checkedFetch("/api/backups/inspect", {
      method: "POST",
      headers: archiveHeaders(passphrase),
      body: file,
    })
  ).json()) as BackupInspection;
}

export async function restoreBackup(
  file: File,
  passphrase: string,
  mode: RestoreMode,
) {
  return (await (
    await checkedFetch(`/api/backups/restore?mode=${mode}`, {
      method: "POST",
      headers: archiveHeaders(passphrase),
      body: file,
    })
  ).json()) as RestoreResult;
}

export async function rollbackSnapshot(id: string) {
  return (await (
    await checkedFetch("/api/backups/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  ).json()) as RestoreResult;
}
