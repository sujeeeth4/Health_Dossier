/**
 * Browser-local data layer for the Health Dossier demo.
 *
 * The application intentionally has no backend. Medical documents are stored as
 * Blobs in IndexedDB, while React components consume the typed functions below.
 * Keeping IndexedDB details in this module prevents UI components from depending
 * on object-store names, database versions, or transaction lifecycle events.
 */

// -----------------------------------------------------------------------------
// Domain models
// -----------------------------------------------------------------------------

export const recordTypes = [
  "Laboratory",
  "Prescription",
  "Imaging",
  "Vaccination",
  "Discharge summary",
  "Clinical note",
  "Other",
] as const;
export type RecordType = (typeof recordTypes)[number];
export type MedicalRecord = {
  id: string;
  title: string;
  type: RecordType;
  date: string;
  provider: string;
  notes: string;
  specialty?: string;
  tags?: string[];
  medicines?: string[];
  findings?: string[];
  important?: boolean;
  sensitive?: boolean;
  collectionIds?: string[];
  fileName: string;
  fileType: string;
  fileSize: number;
  file: Blob;
  createdAt: string;
  extraction?: {
    method: "simulated";
    reviewedAt: string;
    correctedFields: string[];
  };
};

export type CareCollection = {
  id: string;
  name: string;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
};

export type HealthSummary = {
  fullName: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: Medication[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  careNotes: string;
  updatedAt: string;
};

export type DoctorProfile = {
  id: string;
  email: string;
  name: string;
  specialty: string;
  clinic: string;
  council: string;
  registration: string;
  verificationStatus: "demo-verified";
  builtIn?: boolean;
  createdAt: string;
  updatedAt: string;
};

type DoctorCredential = {
  doctorId: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
};

export type DoctorSignupInput = Omit<
  DoctorProfile,
  "id" | "email" | "verificationStatus" | "builtIn" | "createdAt" | "updatedAt"
> & {
  email: string;
  password: string;
};

export type SharePermission = "view" | "contribute";
export type RecordShare = {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientDetails: string;
  patientName?: string;
  recordIds: string[];
  scopeLabel: string;
  permission: SharePermission;
  expiryLabel: string;
  expiresAt: string | null;
  accessCode: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt?: string;
};

export type ShareEvent = {
  id: string;
  shareId: string;
  action: "granted" | "viewed" | "downloaded" | "revoked";
  actor: string;
  detail: string;
  createdAt: string;
};

// -----------------------------------------------------------------------------
// IndexedDB schema
// -----------------------------------------------------------------------------

const databaseName = "health-dossier-records";
const storeName = "records";
const settingsStore = "settings";
const collectionsStore = "collections";
const sharesStore = "shares";
const shareEventsStore = "share-events";
const doctorProfilesStore = "doctor-profiles";
const doctorCredentialsStore = "doctor-credentials";

export const demoDoctorPassword = "Doctor123!";
export const builtInDoctors: DoctorProfile[] = [
  {
    id: "ananya-mehta",
    email: "ananya.mehta@healthdossier.demo",
    name: "Dr Ananya Mehta",
    specialty: "Cardiologist",
    clinic: "City Care Hospital",
    council: "Telangana State Medical Council",
    registration: "TSMC 48291",
    verificationStatus: "demo-verified",
    builtIn: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rohan-iyer",
    email: "rohan.iyer@healthdossier.demo",
    name: "Dr Rohan Iyer",
    specialty: "General physician",
    clinic: "Lotus Clinic",
    council: "Telangana State Medical Council",
    registration: "TSMC 57104",
    verificationStatus: "demo-verified",
    builtIn: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sana-khan",
    email: "sana.khan@healthdossier.demo",
    name: "Dr Sana Khan",
    specialty: "Pulmonologist",
    clinic: "Deccan Medical Centre",
    council: "Telangana State Medical Council",
    registration: "TSMC 63918",
    verificationStatus: "demo-verified",
    builtIn: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Increase this version only when adding or migrating object stores.
    const request = indexedDB.open(databaseName, 5);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(settingsStore))
        request.result.createObjectStore(settingsStore);
      if (!request.result.objectStoreNames.contains(collectionsStore))
        request.result.createObjectStore(collectionsStore, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(sharesStore))
        request.result.createObjectStore(sharesStore, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(shareEventsStore))
        request.result.createObjectStore(shareEventsStore, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(doctorProfilesStore))
        request.result.createObjectStore(doctorProfilesStore, {
          keyPath: "id",
        });
      if (!request.result.objectStoreNames.contains(doctorCredentialsStore))
        request.result.createObjectStore(doctorCredentialsStore, {
          keyPath: "doctorId",
        });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open record storage."));
  });
}

/** Run one request and close the database only after its transaction settles. */
async function runRequest<T>(
  storeName: string,
  mode: IDBTransactionMode,
  execute: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = execute(transaction.objectStore(storeName));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Record storage failed."));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Record storage failed."));
    };
  });
}

// -----------------------------------------------------------------------------
// Medical records
// -----------------------------------------------------------------------------

export const listRecords = () =>
  runRequest<MedicalRecord[]>(storeName, "readonly", (store) => store.getAll());
export const saveRecord = (record: MedicalRecord) =>
  runRequest<IDBValidKey>(storeName, "readwrite", (store) => store.put(record));
export async function saveRecords(records: MedicalRecord[]) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    records.forEach((record) => store.put(record));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Record storage failed."));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Record storage failed."));
    };
  });
}

// -----------------------------------------------------------------------------
// Care collections
// -----------------------------------------------------------------------------

export const deleteRecord = (id: string) =>
  runRequest<undefined>(storeName, "readwrite", (store) => store.delete(id));
export const listCollections = () =>
  runRequest<CareCollection[]>(collectionsStore, "readonly", (store) =>
    store.getAll(),
  );
export const getCollection = (id: string) =>
  runRequest<CareCollection | undefined>(
    collectionsStore,
    "readonly",
    (store) => store.get(id),
  );
export const saveCollection = (collection: CareCollection) =>
  runRequest<IDBValidKey>(collectionsStore, "readwrite", (store) =>
    store.put(collection),
  );
export async function deleteCareCollection(id: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    // Detach the collection from every record and delete the collection in one
    // transaction so the browser cannot be left with partial membership data.
    const transaction = database.transaction(
      [storeName, collectionsStore],
      "readwrite",
    );
    const records = transaction.objectStore(storeName);
    const request = records.getAll() as IDBRequest<MedicalRecord[]>;
    request.onsuccess = () => {
      request.result.forEach((record) => {
        if (record.collectionIds?.includes(id))
          records.put({
            ...record,
            collectionIds: record.collectionIds.filter(
              (collectionId) => collectionId !== id,
            ),
          });
      });
      transaction.objectStore(collectionsStore).delete(id);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Collection storage failed."));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Collection storage failed."));
    };
  });
}

// -----------------------------------------------------------------------------
// Patient settings and health summary
// -----------------------------------------------------------------------------

export const getBirthDate = () =>
  runRequest<string | undefined>(settingsStore, "readonly", (store) =>
    store.get("birthDate"),
  );
export const saveBirthDate = (date: string) =>
  date
    ? runRequest<IDBValidKey>(settingsStore, "readwrite", (store) =>
        store.put(date, "birthDate"),
      )
    : runRequest<undefined>(settingsStore, "readwrite", (store) =>
        store.delete("birthDate"),
      );
export const getHealthSummary = () =>
  runRequest<HealthSummary | undefined>(settingsStore, "readonly", (store) =>
    store.get("healthSummary"),
  );
export const saveHealthSummary = (summary: HealthSummary) =>
  runRequest<IDBValidKey>(settingsStore, "readwrite", (store) =>
    store.put(summary, "healthSummary"),
  );

// -----------------------------------------------------------------------------
// Browser-local doctor accounts
// -----------------------------------------------------------------------------

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeRegistration = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function derivePassword(password: string, encodedSalt?: string) {
  const salt = encodedSalt
    ? base64ToBytes(encodedSalt)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 120_000,
    },
    keyMaterial,
    256,
  );
  return {
    passwordSalt: bytesToBase64(salt),
    passwordHash: bytesToBase64(new Uint8Array(hash)),
  };
}

async function seedBuiltInDoctors() {
  const credential = await derivePassword(demoDoctorPassword);
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [doctorProfilesStore, doctorCredentialsStore],
      "readwrite",
    );
    const profiles = transaction.objectStore(doctorProfilesStore);
    const credentials = transaction.objectStore(doctorCredentialsStore);
    builtInDoctors.forEach((doctor) => {
      const profileRequest = profiles.get(doctor.id);
      profileRequest.onsuccess = () => {
        if (!profileRequest.result) profiles.put(doctor);
      };
      const credentialRequest = credentials.get(doctor.id);
      credentialRequest.onsuccess = () => {
        if (!credentialRequest.result)
          credentials.put({
            doctorId: doctor.id,
            email: doctor.email,
            ...credential,
          } satisfies DoctorCredential);
      };
    });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Doctor setup failed."));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Doctor setup failed."));
    };
  });
}

export async function listDoctorProfiles() {
  await seedBuiltInDoctors();
  const profiles = await runRequest<DoctorProfile[]>(
    doctorProfilesStore,
    "readonly",
    (store) => store.getAll(),
  );
  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDoctorProfile(id: string) {
  await seedBuiltInDoctors();
  return runRequest<DoctorProfile | undefined>(
    doctorProfilesStore,
    "readonly",
    (store) => store.get(id),
  );
}

export async function createDoctorAccount(input: DoctorSignupInput) {
  const profiles = await listDoctorProfiles();
  const email = normalizeEmail(input.email);
  if (profiles.some((profile) => profile.email === email))
    throw new Error("An account already uses this email address.");
  if (
    profiles.some(
      (profile) =>
        normalizeRegistration(profile.registration) ===
        normalizeRegistration(input.registration),
    )
  )
    throw new Error("This medical registration is already in use.");

  const timestamp = new Date().toISOString();
  const profile: DoctorProfile = {
    id: crypto.randomUUID(),
    email,
    name: input.name.trim(),
    specialty: input.specialty.trim(),
    clinic: input.clinic.trim(),
    council: input.council.trim(),
    registration: input.registration.trim(),
    verificationStatus: "demo-verified",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const password = await derivePassword(input.password);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [doctorProfilesStore, doctorCredentialsStore],
      "readwrite",
    );
    transaction.objectStore(doctorProfilesStore).put(profile);
    transaction.objectStore(doctorCredentialsStore).put({
      doctorId: profile.id,
      email,
      ...password,
    } satisfies DoctorCredential);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Doctor account could not be saved."),
      );
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Doctor account could not be saved."),
      );
    };
  });
  return profile;
}

export async function authenticateDoctor(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const profiles = await listDoctorProfiles();
  const profile = profiles.find((candidate) => candidate.email === email);
  if (!profile) return undefined;
  const credential = await runRequest<DoctorCredential | undefined>(
    doctorCredentialsStore,
    "readonly",
    (store) => store.get(profile.id),
  );
  if (!credential) return undefined;
  const attempted = await derivePassword(password, credential.passwordSalt);
  return attempted.passwordHash === credential.passwordHash
    ? profile
    : undefined;
}

export function doctorDetails(profile: DoctorProfile) {
  return `${profile.specialty} · ${profile.clinic}`;
}

// -----------------------------------------------------------------------------
// Sharing grants and audit events
// -----------------------------------------------------------------------------

export const listShares = () =>
  runRequest<RecordShare[]>(sharesStore, "readonly", (store) => store.getAll());
export const listShareEvents = () =>
  runRequest<ShareEvent[]>(shareEventsStore, "readonly", (store) =>
    store.getAll(),
  );
export async function saveShareWithEvent(
  share: RecordShare,
  event: ShareEvent,
) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    // A grant and its audit event must either both persist or both fail.
    const transaction = database.transaction(
      [sharesStore, shareEventsStore],
      "readwrite",
    );
    transaction.objectStore(sharesStore).put(share);
    transaction.objectStore(shareEventsStore).put(event);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Sharing could not be saved."));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Sharing could not be saved."));
    };
  });
}
export const saveShareEvent = (event: ShareEvent) =>
  runRequest<IDBValidKey>(shareEventsStore, "readwrite", (store) =>
    store.put(event),
  );
export async function revokeShare(share: RecordShare, event: ShareEvent) {
  return saveShareWithEvent(
    { ...share, status: "revoked", revokedAt: event.createdAt },
    event,
  );
}

// Display helpers shared by record, collection, and sharing screens.
export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
