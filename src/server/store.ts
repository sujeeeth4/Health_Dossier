import {
  mkdir,
  readFile,
  rename,
  copyFile,
  writeFile,
  unlink,
  rm,
  cp,
} from "node:fs/promises";
import path from "node:path";
import { pbkdf2 as pbkdf2Callback, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import type {
  CareCollection,
  DoctorContribution,
  DoctorProfile,
  HealthSummary,
  MedicalRecord,
  RecordShare,
  ShareEvent,
} from "@/lib/records";

export type StoredRecord = Omit<MedicalRecord, "file"> & { filePath: string };
export type StoredCredential = {
  doctorId: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
};
export type LocalDatabase = {
  version: 2;
  migrationCompleted: boolean;
  patient: { id: "local-patient"; createdAt: string };
  birthDate: string;
  healthSummary?: HealthSummary;
  records: StoredRecord[];
  collections: CareCollection[];
  doctors: DoctorProfile[];
  credentials: StoredCredential[];
  shares: RecordShare[];
  shareEvents: ShareEvent[];
  contributions: DoctorContribution[];
};

const databaseSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  migrationCompleted: z.boolean(),
  patient: z.object({ id: z.literal("local-patient"), createdAt: z.string() }),
  birthDate: z.string(),
  healthSummary: z.unknown().optional(),
  records: z.array(z.unknown()),
  collections: z.array(z.unknown()),
  doctors: z.array(z.unknown()),
  credentials: z.array(z.unknown()),
  shares: z.array(z.unknown()),
  shareEvents: z.array(z.unknown()),
  contributions: z.array(z.unknown()).optional(),
});

const pbkdf2 = promisify(pbkdf2Callback);
export const dataDirectory = path.resolve(
  process.env.HEALTH_DOSSIER_DATA_DIR || path.join(process.cwd(), "data"),
);
export const uploadsDirectory = path.join(dataDirectory, "uploads");
const databasePath = path.join(dataDirectory, "database.json");
const backupPath = path.join(dataDirectory, "database.json.bak");

export const demoDoctorPassword = "Doctor123!";
const builtInDoctors: DoctorProfile[] = [
  [
    "ananya-mehta",
    "ananya.mehta@healthdossier.demo",
    "Dr Ananya Mehta",
    "Cardiologist",
    "City Care Hospital",
    "TSMC 48291",
  ],
  [
    "rohan-iyer",
    "rohan.iyer@healthdossier.demo",
    "Dr Rohan Iyer",
    "General physician",
    "Lotus Clinic",
    "TSMC 57104",
  ],
  [
    "sana-khan",
    "sana.khan@healthdossier.demo",
    "Dr Sana Khan",
    "Pulmonologist",
    "Deccan Medical Centre",
    "TSMC 63918",
  ],
].map(([id, email, name, specialty, clinic, registration]) => ({
  id,
  email,
  name,
  specialty,
  clinic,
  council: "Telangana State Medical Council",
  registration,
  verificationStatus: "demo-verified" as const,
  builtIn: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

let writeQueue: Promise<unknown> = Promise.resolve();
let schemaMigration: Promise<void> | undefined;

export async function hashPassword(password: string, saltValue?: string) {
  const salt = saltValue ? Buffer.from(saltValue, "base64") : randomBytes(16);
  const hash = await pbkdf2(password, salt, 120_000, 32, "sha256");
  return {
    passwordSalt: salt.toString("base64"),
    passwordHash: hash.toString("base64"),
  };
}

async function freshDatabase(): Promise<LocalDatabase> {
  const hashed = await hashPassword(demoDoctorPassword);
  return {
    version: 2,
    migrationCompleted: false,
    patient: { id: "local-patient", createdAt: new Date().toISOString() },
    birthDate: "",
    records: [],
    collections: [],
    doctors: builtInDoctors,
    credentials: builtInDoctors.map((doctor) => ({
      doctorId: doctor.id,
      email: doctor.email,
      ...hashed,
    })),
    shares: [],
    shareEvents: [],
    contributions: [],
  };
}

let storageInitialization: Promise<void> | undefined;
async function ensureStorage() {
  storageInitialization ??= (async () => {
    await mkdir(uploadsDirectory, { recursive: true, mode: 0o700 });
    try {
      await readFile(databasePath, "utf8");
    } catch {
      await writeDatabase(await freshDatabase(), false);
    }
  })();
  try {
    await storageInitialization;
  } catch (error) {
    storageInitialization = undefined;
    throw error;
  }
}

export async function readDatabase(): Promise<LocalDatabase> {
  await ensureStorage();
  const parsed = databaseSchema.parse(
    JSON.parse(await readFile(databasePath, "utf8")),
  );
  if (parsed.version === 1 || !parsed.contributions) {
    const migrated = {
      ...parsed,
      version: 2 as const,
      contributions: parsed.contributions ?? [],
    } as LocalDatabase;
    schemaMigration ??= writeDatabase(migrated);
    await schemaMigration;
    return migrated;
  }
  return parsed as LocalDatabase;
}

async function writeDatabase(database: LocalDatabase, createBackup = true) {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  databaseSchema.parse(database);
  const temporaryPath = `${databasePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, {
    mode: 0o600,
  });
  if (createBackup) {
    try {
      await copyFile(databasePath, backupPath);
    } catch {
      // The first write has no previous database to back up.
    }
  }
  await rename(temporaryPath, databasePath);
}

/** Replaces the database and upload directory as one serialized store change. */
export function replaceLocalData(
  database: LocalDatabase,
  preparedUploadsDirectory: string,
) {
  const operation = writeQueue.then(async () => {
    databaseSchema.parse(database);
    const previousUploads = path.join(
      dataDirectory,
      `.uploads-previous-${crypto.randomUUID()}`,
    );
    await rename(uploadsDirectory, previousUploads).catch(async () => {
      await mkdir(previousUploads, { recursive: true, mode: 0o700 });
    });
    try {
      await rename(preparedUploadsDirectory, uploadsDirectory);
      await writeDatabase(database);
      await rm(previousUploads, { recursive: true, force: true });
    } catch (error) {
      await rm(uploadsDirectory, { recursive: true, force: true });
      await rename(previousUploads, uploadsDirectory);
      throw error;
    }
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

export async function copyCurrentUploads(destination: string) {
  await mkdir(destination, { recursive: true, mode: 0o700 });
  await cp(uploadsDirectory, destination, { recursive: true, force: true });
}

export function updateDatabase<T>(
  change: (database: LocalDatabase) => T | Promise<T>,
) {
  const operation = writeQueue.then(async () => {
    const database = await readDatabase();
    const result = await change(database);
    await writeDatabase(database);
    return result;
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

export function publicRecord(
  record: StoredRecord,
): Omit<MedicalRecord, "file"> {
  const metadata = { ...record } as Partial<StoredRecord>;
  delete metadata.filePath;
  return metadata as Omit<MedicalRecord, "file">;
}

export function safeUploadName(recordId: string, originalName: string) {
  const extension = path
    .extname(originalName)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, "")
    .slice(0, 10);
  return `${recordId}${extension || ".bin"}`;
}

export async function removeUpload(relativePath: string) {
  try {
    await unlink(path.join(dataDirectory, relativePath));
  } catch {
    // A missing file should not prevent its metadata from being removed.
  }
}

export async function resetLocalDataForTests() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Test reset is disabled.");
  if (
    process.env.HEALTH_DOSSIER_TEST_MODE !== "1" ||
    path.basename(dataDirectory) !== ".playwright-data"
  )
    throw new Error("Refusing to reset a non-test data directory.");
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(backupPath, { force: true }),
    rm(path.join(dataDirectory, "sessions.json"), { force: true }),
    rm(uploadsDirectory, { recursive: true, force: true }),
    rm(path.join(dataDirectory, ".backup-temp"), { recursive: true, force: true }),
    rm(path.join(dataDirectory, "restore-snapshots"), { recursive: true, force: true }),
    rm(path.join(dataDirectory, "backup-state.json"), { force: true }),
  ]);
  storageInitialization = undefined;
  schemaMigration = undefined;
  await readDatabase();
}
