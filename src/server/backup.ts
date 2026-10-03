import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2 as pbkdf2Callback,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  appendFile,
  cp,
  mkdir,
  open,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { createGunzip, createGzip } from "node:zlib";
import { z } from "zod";
import {
  copyCurrentUploads,
  dataDirectory,
  readDatabase,
  replaceLocalData,
  safeUploadName,
  uploadsDirectory,
  type LocalDatabase,
  type StoredRecord,
} from "./store";
import { invalidateRoleSessions } from "./auth";
import type {
  BackupCounts,
  BackupInspection,
  BackupStatus,
  RecoverySnapshot,
  RestoreMode,
  RestoreResult,
} from "../lib/backups";

export type { RestoreMode } from "../lib/backups";

type BackupFile = {
  recordId: string;
  archivePath: string;
  size: number;
  sha256: string;
};
type BackupManifest = {
  formatVersion: 1;
  databaseVersion: 2;
  createdAt: string;
  counts: BackupCounts;
  totalBytes: number;
  database: LocalDatabase;
  files: BackupFile[];
};

const MAGIC = Buffer.from("HDBAK001");
const HEADER_SIZE = 40;
const AUTH_TAG_SIZE = 16;
const ITERATIONS = 310_000;
const MAX_ARCHIVE_SIZE = 2 * 1024 * 1024 * 1024;
const tempDirectory = path.join(dataDirectory, ".backup-temp");
const snapshotsDirectory = path.join(dataDirectory, "restore-snapshots");
const backupStatePath = path.join(dataDirectory, "backup-state.json");
const deriveKey = promisify(pbkdf2Callback);

const databaseSnapshotSchema = z
  .object({
    version: z.literal(2),
    migrationCompleted: z.boolean(),
    patient: z.object({ id: z.literal("local-patient"), createdAt: z.string() }),
    birthDate: z.string(),
    healthSummary: z.unknown().optional(),
    records: z.array(
      z.object({
        id: z.string().min(1),
        filePath: z.string().min(1),
        fileName: z.string().min(1),
        fileSize: z.number().nonnegative(),
      }).passthrough(),
    ),
    collections: z.array(z.object({ id: z.string().min(1) }).passthrough()),
    doctors: z.array(z.object({ id: z.string().min(1), email: z.string() }).passthrough()),
    credentials: z.array(
      z.object({
        doctorId: z.string().min(1),
        email: z.string(),
        passwordSalt: z.string(),
        passwordHash: z.string(),
      }),
    ),
    shares: z.array(z.object({ id: z.string().min(1) }).passthrough()),
    shareEvents: z.array(z.object({ id: z.string().min(1) }).passthrough()),
    contributions: z.array(z.object({ id: z.string().min(1) }).passthrough()),
  })
  .passthrough();

const manifestSchema = z.object({
  formatVersion: z.literal(1),
  databaseVersion: z.literal(2),
  createdAt: z.string().datetime(),
  counts: z.object({
    records: z.number().int().nonnegative(),
    files: z.number().int().nonnegative(),
    collections: z.number().int().nonnegative(),
    doctors: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(),
    contributions: z.number().int().nonnegative(),
  }),
  totalBytes: z.number().int().nonnegative(),
  database: databaseSnapshotSchema,
  files: z.array(
    z.object({
      recordId: z.string().min(1),
      archivePath: z.string().regex(/^files\/[A-Za-z0-9._-]+$/),
      size: z.number().int().nonnegative().max(25 * 1024 * 1024),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
});

function assertPassphrase(passphrase: string) {
  if (passphrase.length < 12 || passphrase.length > 256)
    throw new Error("Use a backup passphrase between 12 and 256 characters.");
}

function countsFor(database: LocalDatabase): BackupCounts {
  return {
    records: database.records.length,
    files: database.records.length,
    collections: database.collections.length,
    doctors: database.doctors.length,
    shares: database.shares.length,
    contributions: database.contributions.length,
  };
}

async function hashFile(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function safeStoredPath(relativePath: string) {
  const resolved = path.resolve(dataDirectory, relativePath);
  if (!resolved.startsWith(`${uploadsDirectory}${path.sep}`))
    throw new Error("A record contains an unsafe upload path.");
  return resolved;
}

function writeOctal(header: Buffer, offset: number, length: number, value: number) {
  const encoded = value.toString(8).padStart(length - 1, "0").slice(-(length - 1));
  header.write(encoded, offset, "ascii");
  header[offset + length - 1] = 0;
}

function tarHeader(name: string, size: number) {
  if (Buffer.byteLength(name) > 100) throw new Error("Archive path is too long.");
  const header = Buffer.alloc(512);
  header.write(name, 0, "utf8");
  writeOctal(header, 100, 8, 0o600);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, Math.floor(Date.now() / 1000));
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  header.write("ustar\0", 257, "ascii");
  header.write("00", 263, "ascii");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const value = checksum.toString(8).padStart(6, "0").slice(-6);
  header.write(value, 148, "ascii");
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

async function* tarPayload(manifest: BackupManifest) {
  const manifestBuffer = Buffer.from(JSON.stringify(manifest));
  yield tarHeader("manifest.json", manifestBuffer.length);
  yield manifestBuffer;
  if (manifestBuffer.length % 512) yield Buffer.alloc(512 - (manifestBuffer.length % 512));
  for (const file of manifest.files) {
    const record = manifest.database.records.find((item) => item.id === file.recordId)!;
    yield tarHeader(file.archivePath, file.size);
    for await (const chunk of createReadStream(safeStoredPath(record.filePath))) yield chunk;
    if (file.size % 512) yield Buffer.alloc(512 - (file.size % 512));
  }
  yield Buffer.alloc(1024);
}

async function buildManifest(): Promise<BackupManifest> {
  const database = await readDatabase();
  const files: BackupFile[] = [];
  for (const record of database.records) {
    const source = safeStoredPath(record.filePath);
    const details = await stat(source);
    if (!details.isFile() || details.size !== record.fileSize)
      throw new Error(`The original file for “${record.title}” is missing or changed.`);
    files.push({
      recordId: record.id,
      archivePath: `files/${safeUploadName(record.id, record.fileName)}`,
      size: details.size,
      sha256: await hashFile(source),
    });
  }
  return {
    formatVersion: 1,
    databaseVersion: 2,
    createdAt: new Date().toISOString(),
    counts: countsFor(database),
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    database,
    files,
  };
}

export async function createEncryptedBackup(passphrase: string) {
  assertPassphrase(passphrase);
  await mkdir(tempDirectory, { recursive: true, mode: 0o700 });
  const manifest = await buildManifest();
  if (manifest.totalBytes > MAX_ARCHIVE_SIZE - 50 * 1024 * 1024)
    throw new Error("The dossier is too large for a 2 GB backup archive.");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt, ITERATIONS, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const header = Buffer.alloc(HEADER_SIZE);
  MAGIC.copy(header, 0);
  salt.copy(header, 8);
  iv.copy(header, 24);
  header.writeUInt32BE(ITERATIONS, 36);
  const archivePath = path.join(tempDirectory, `${randomUUID()}.hdbak`);
  try {
    await writeFile(archivePath, header, { mode: 0o600 });
    await pipeline(
      Readable.from(tarPayload(manifest)),
      createGzip({ level: 6 }),
      cipher,
      createWriteStream(archivePath, { flags: "a", mode: 0o600 }),
    );
    await appendFile(archivePath, cipher.getAuthTag());
  } catch (error) {
    await rm(archivePath, { force: true });
    throw error;
  }
  await writeFile(
    backupStatePath,
    JSON.stringify({ lastBackupAt: manifest.createdAt }),
    { mode: 0o600 },
  );
  return {
    path: archivePath,
    fileName: `health-dossier-${manifest.createdAt.slice(0, 10)}.hdbak`,
    manifest,
  };
}

export async function saveIncomingArchive(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (!request.body || length > MAX_ARCHIVE_SIZE)
    throw new Error("Choose a Health Dossier backup smaller than 2 GB.");
  await mkdir(tempDirectory, { recursive: true, mode: 0o700 });
  const destination = path.join(tempDirectory, `${randomUUID()}.incoming`);
  let received = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      callback(received > MAX_ARCHIVE_SIZE ? new Error("Backup exceeds 2 GB.") : null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(request.body as never),
      limiter,
      createWriteStream(destination, { mode: 0o600 }),
    );
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
  return destination;
}

async function decryptToTar(archivePath: string, passphrase: string, target: string) {
  assertPassphrase(passphrase);
  const details = await stat(archivePath);
  if (details.size < HEADER_SIZE + AUTH_TAG_SIZE || details.size > MAX_ARCHIVE_SIZE)
    throw new Error("This is not a valid Health Dossier backup.");
  const handle = await open(archivePath, "r");
  const header = Buffer.alloc(HEADER_SIZE);
  const tag = Buffer.alloc(AUTH_TAG_SIZE);
  await handle.read(header, 0, HEADER_SIZE, 0);
  await handle.read(tag, 0, AUTH_TAG_SIZE, details.size - AUTH_TAG_SIZE);
  await handle.close();
  if (!header.subarray(0, 8).equals(MAGIC))
    throw new Error("This is not a supported Health Dossier backup.");
  const iterations = header.readUInt32BE(36);
  if (iterations !== ITERATIONS) throw new Error("Unsupported backup encryption settings.");
  const key = await deriveKey(passphrase, header.subarray(8, 24), iterations, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(24, 36));
  decipher.setAuthTag(tag);
  try {
    await pipeline(
      createReadStream(archivePath, { start: HEADER_SIZE, end: details.size - AUTH_TAG_SIZE - 1 }),
      decipher,
      createGunzip(),
      createWriteStream(target, { mode: 0o600 }),
    );
  } catch {
    throw new Error("The passphrase is incorrect or the backup was modified.");
  }
}

function parseOctal(buffer: Buffer) {
  const value = buffer.toString("ascii").replace(/\0.*$/, "").trim();
  return value ? Number.parseInt(value, 8) : 0;
}

function verifyTarHeader(header: Buffer) {
  const expected = parseOctal(header.subarray(148, 156));
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  return expected === copy.reduce((sum, byte) => sum + byte, 0);
}

async function extractAndValidate(archivePath: string, passphrase: string) {
  const workDirectory = path.join(tempDirectory, randomUUID());
  const extractedDirectory = path.join(workDirectory, "extracted");
  const tarPath = path.join(workDirectory, "payload.tar");
  await mkdir(extractedDirectory, { recursive: true, mode: 0o700 });
  try {
    await decryptToTar(archivePath, passphrase, tarPath);
  const handle = await open(tarPath, "r");
  const details = await handle.stat();
  let offset = 0;
  let manifest: BackupManifest | undefined;
  const extracted = new Map<string, string>();
  let entries = 0;
  try {
    while (offset + 512 <= details.size) {
      const header = Buffer.alloc(512);
      await handle.read(header, 0, 512, offset);
      offset += 512;
      if (header.every((byte) => byte === 0)) break;
      if (!verifyTarHeader(header)) throw new Error("The backup archive is malformed.");
      const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
      const size = parseOctal(header.subarray(124, 136));
      if (++entries > 10_001 || size < 0 || size > MAX_ARCHIVE_SIZE)
        throw new Error("The backup archive contains unsafe entries.");
      if (name === "manifest.json") {
        if (manifest || size > 20 * 1024 * 1024)
          throw new Error("The backup manifest is invalid.");
        const value = Buffer.alloc(size);
        await handle.read(value, 0, size, offset);
        manifest = manifestSchema.parse(JSON.parse(value.toString("utf8"))) as BackupManifest;
      } else {
        if (!/^files\/[A-Za-z0-9._-]+$/.test(name) || extracted.has(name))
          throw new Error("The backup archive contains an unsafe file path.");
        const destination = path.join(extractedDirectory, path.basename(name));
        if (size)
          await pipeline(
            createReadStream(tarPath, { start: offset, end: offset + size - 1 }),
            createWriteStream(destination, { mode: 0o600 }),
          );
        else await writeFile(destination, "", { mode: 0o600 });
        extracted.set(name, destination);
      }
      offset += size + ((512 - (size % 512)) % 512);
    }
  } finally {
    await handle.close();
    await rm(tarPath, { force: true });
  }
  if (!manifest) throw new Error("The backup manifest is missing.");
  if (manifest.files.length !== manifest.database.records.length)
    throw new Error("The backup does not contain every original file.");
  const recordIds = new Set(manifest.database.records.map((record) => record.id));
  if (manifest.counts.records !== recordIds.size || manifest.counts.files !== manifest.files.length)
    throw new Error("The backup counts do not match its contents.");
  for (const file of manifest.files) {
    const source = extracted.get(file.archivePath);
    if (!source || !recordIds.has(file.recordId))
      throw new Error("The backup contains an unrelated or missing file.");
    const details = await stat(source);
    if (details.size !== file.size || (await hashFile(source)) !== file.sha256)
      throw new Error("A file in the backup failed its integrity check.");
  }
  if (extracted.size !== manifest.files.length)
    throw new Error("The backup contains unrelated files.");
    return { manifest, extracted, workDirectory };
  } catch (error) {
    await rm(workDirectory, { recursive: true, force: true });
    throw error;
  }
}

function comparisonFor(backup: LocalDatabase, current: LocalDatabase) {
  const compare = <T extends { id: string }>(incoming: T[], existing: T[]) => {
    const ids = new Set(existing.map((item) => item.id));
    return {
      added: incoming.filter((item) => !ids.has(item.id)).length,
      conflicts: incoming.filter((item) => ids.has(item.id)).length,
    };
  };
  const records = compare(backup.records, current.records);
  const doctors = compare(backup.doctors, current.doctors);
  const contributions = compare(backup.contributions, current.contributions);
  return {
    newRecords: records.added,
    conflictingRecords: records.conflicts,
    newDoctors: doctors.added,
    conflictingDoctors: doctors.conflicts,
    newContributions: contributions.added,
    conflictingContributions: contributions.conflicts,
  };
}

export async function inspectEncryptedBackup(archivePath: string, passphrase: string) {
  const unpacked = await extractAndValidate(archivePath, passphrase);
  try {
    return {
      createdAt: unpacked.manifest.createdAt,
      databaseVersion: unpacked.manifest.databaseVersion,
      counts: unpacked.manifest.counts,
      totalBytes: unpacked.manifest.totalBytes,
      comparison: comparisonFor(unpacked.manifest.database, await readDatabase()),
    } satisfies BackupInspection;
  } finally {
    await rm(unpacked.workDirectory, { recursive: true, force: true });
  }
}

async function listSnapshots(): Promise<RecoverySnapshot[]> {
  await mkdir(snapshotsDirectory, { recursive: true, mode: 0o700 });
  const entries = await readdir(snapshotsDirectory, { withFileTypes: true });
  const snapshots: RecoverySnapshot[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const value = JSON.parse(
        await readFile(path.join(snapshotsDirectory, entry.name, "metadata.json"), "utf8"),
      ) as RecoverySnapshot;
      if (value.id === entry.name) snapshots.push(value);
    } catch {
      // Ignore incomplete snapshots; restore never selects them.
    }
  }
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function createRecoverySnapshot(reason: string, prune = true) {
  const database = await readDatabase();
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const directory = path.join(snapshotsDirectory, id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(directory, "database.json"), JSON.stringify(database), { mode: 0o600 });
  await cp(uploadsDirectory, path.join(directory, "uploads"), { recursive: true });
  const metadata: RecoverySnapshot = {
    id,
    createdAt: new Date().toISOString(),
    reason,
    counts: countsFor(database),
    totalBytes: database.records.reduce((sum, record) => sum + record.fileSize, 0),
  };
  await writeFile(path.join(directory, "metadata.json"), JSON.stringify(metadata), { mode: 0o600 });
  if (prune) await pruneSnapshots();
  return metadata;
}

async function pruneSnapshots() {
  const snapshots = await listSnapshots();
  await Promise.all(
    snapshots.slice(3).map((snapshot) =>
      rm(path.join(snapshotsDirectory, snapshot.id), { recursive: true, force: true }),
    ),
  );
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const ids = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !ids.has(item.id))];
}

function normalizeRecord(record: StoredRecord): StoredRecord {
  return {
    ...record,
    filePath: path.join("uploads", safeUploadName(record.id, record.fileName)),
  };
}

export async function restoreEncryptedBackup(
  archivePath: string,
  passphrase: string,
  mode: RestoreMode,
): Promise<RestoreResult> {
  const unpacked = await extractAndValidate(archivePath, passphrase);
  try {
    const current = await readDatabase();
    const incoming = unpacked.manifest.database;
    const preparedUploads = path.join(unpacked.workDirectory, "prepared-uploads");
    if (mode === "merge") await copyCurrentUploads(preparedUploads);
    else await mkdir(preparedUploads, { recursive: true, mode: 0o700 });
    const currentIds = new Set(current.records.map((record) => record.id));
    for (const record of incoming.records) {
      if (mode === "merge" && currentIds.has(record.id)) continue;
      const file = unpacked.manifest.files.find((item) => item.recordId === record.id)!;
      await cp(unpacked.extracted.get(file.archivePath)!, path.join(preparedUploads, safeUploadName(record.id, record.fileName)));
    }
    const normalizedIncoming = incoming.records.map(normalizeRecord);
    const restored: LocalDatabase =
      mode === "replace"
        ? { ...incoming, records: normalizedIncoming }
        : {
            ...current,
            migrationCompleted: current.migrationCompleted || incoming.migrationCompleted,
            birthDate: current.birthDate || incoming.birthDate,
            healthSummary: current.healthSummary ?? incoming.healthSummary,
            records: mergeById(current.records, normalizedIncoming),
            collections: mergeById(current.collections, incoming.collections),
            doctors: mergeById(current.doctors, incoming.doctors),
            credentials: [
              ...current.credentials,
              ...incoming.credentials.filter(
                (item) => !current.credentials.some((currentItem) => currentItem.doctorId === item.doctorId),
              ),
            ],
            shares: mergeById(current.shares, incoming.shares),
            shareEvents: mergeById(current.shareEvents, incoming.shareEvents),
            contributions: mergeById(current.contributions, incoming.contributions),
          };
    const snapshot = await createRecoverySnapshot(`Before ${mode} restore`);
    await replaceLocalData(restored, preparedUploads);
    await invalidateRoleSessions("doctor");
    return { mode, snapshotId: snapshot.id, counts: countsFor(restored) };
  } finally {
    await rm(unpacked.workDirectory, { recursive: true, force: true });
  }
}

export async function rollbackRecoverySnapshot(id: string): Promise<RestoreResult> {
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error("Invalid recovery snapshot.");
  const directory = path.join(snapshotsDirectory, id);
  const metadata = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8")) as RecoverySnapshot;
  if (metadata.id !== id) throw new Error("Invalid recovery snapshot.");
  const database = databaseSnapshotSchema.parse(
    JSON.parse(await readFile(path.join(directory, "database.json"), "utf8")),
  ) as LocalDatabase;
  const preparedUploads = path.join(tempDirectory, `${randomUUID()}-rollback-uploads`);
  await mkdir(tempDirectory, { recursive: true, mode: 0o700 });
  await cp(path.join(directory, "uploads"), preparedUploads, { recursive: true });
  const safety = await createRecoverySnapshot(`Before rollback to ${metadata.createdAt}`, false);
  try {
    await replaceLocalData(database, preparedUploads);
    await invalidateRoleSessions("doctor");
    await pruneSnapshots();
    return { mode: "rollback", snapshotId: safety.id, counts: countsFor(database) };
  } catch (error) {
    await rm(preparedUploads, { recursive: true, force: true });
    throw error;
  }
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const database = await readDatabase();
  let lastBackupAt: string | undefined;
  try {
    lastBackupAt = JSON.parse(await readFile(backupStatePath, "utf8")).lastBackupAt;
  } catch {
    // No encrypted export has completed yet.
  }
  return {
    counts: countsFor(database),
    totalBytes: database.records.reduce((sum, record) => sum + record.fileSize, 0),
    lastBackupAt,
    snapshots: await listSnapshots(),
  };
}

export async function removeTemporaryBackup(filePath: string) {
  const resolved = path.resolve(filePath);
  if (resolved.startsWith(`${tempDirectory}${path.sep}`)) await rm(resolved, { force: true });
}
