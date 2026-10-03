import { exportLegacySnapshot } from "@/lib/legacy-indexeddb";

export async function legacyMigrationAvailable() {
  const statusResponse = await fetch("/api/data?action=migrationStatus", {
    cache: "no-store",
  });
  if (statusResponse.status === 401) {
    const session = await fetch("/api/auth/patient", { method: "POST" });
    if (!session.ok) return false;
    return legacyMigrationAvailable();
  }
  const status = await statusResponse.json();
  if (status.completed || !status.empty) return false;
  const snapshot = await exportLegacySnapshot();
  return Boolean(
    snapshot.records.length ||
    snapshot.collections.length ||
    snapshot.shares.length ||
    snapshot.healthSummary,
  );
}

export async function migrateLegacyData() {
  const snapshot = await exportLegacySnapshot();
  const form = new FormData();
  const records = snapshot.records.map((record) => {
    const metadata = { ...record } as Partial<typeof record>;
    delete metadata.file;
    return metadata;
  });
  form.set("snapshot", JSON.stringify({ ...snapshot, records }));
  snapshot.records.forEach((record) =>
    form.set(`file:${record.id}`, record.file, record.fileName),
  );
  const response = await fetch("/api/migrate", { method: "POST", body: form });
  if (!response.ok)
    throw new Error("Browser data could not be moved to the local backend.");
}
