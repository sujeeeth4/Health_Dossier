export const recordTypes = ["Laboratory", "Prescription", "Imaging", "Vaccination", "Discharge summary", "Clinical note", "Other"] as const;
export type RecordType = typeof recordTypes[number];
export type MedicalRecord = {
  id: string;
  title: string;
  type: RecordType;
  date: string;
  provider: string;
  notes: string;
  important?: boolean;
  collectionIds?: string[];
  fileName: string;
  fileType: string;
  fileSize: number;
  file: Blob;
  createdAt: string;
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

const databaseName = "health-dossier-records";
const storeName = "records";
const settingsStore = "settings";
const collectionsStore = "collections";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(settingsStore)) request.result.createObjectStore(settingsStore);
      if (!request.result.objectStoreNames.contains(collectionsStore)) request.result.createObjectStore(collectionsStore, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open record storage."));
  });
}

async function runRequest<T>(storeName: string, mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = execute(transaction.objectStore(storeName));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Record storage failed.")); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Record storage failed.")); };
  });
}

export const listRecords = () => runRequest<MedicalRecord[]>(storeName, "readonly", store => store.getAll());
export const saveRecord = (record: MedicalRecord) => runRequest<IDBValidKey>(storeName, "readwrite", store => store.put(record));
export async function saveRecords(records: MedicalRecord[]) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    records.forEach(record => store.put(record));
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Record storage failed.")); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Record storage failed.")); };
  });
}
export const deleteRecord = (id: string) => runRequest<undefined>(storeName, "readwrite", store => store.delete(id));
export const listCollections = () => runRequest<CareCollection[]>(collectionsStore, "readonly", store => store.getAll());
export const getCollection = (id: string) => runRequest<CareCollection | undefined>(collectionsStore, "readonly", store => store.get(id));
export const saveCollection = (collection: CareCollection) => runRequest<IDBValidKey>(collectionsStore, "readwrite", store => store.put(collection));
export async function deleteCareCollection(id: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([storeName, collectionsStore], "readwrite");
    const records = transaction.objectStore(storeName);
    const request = records.getAll() as IDBRequest<MedicalRecord[]>;
    request.onsuccess = () => {
      request.result.forEach(record => {
        if (record.collectionIds?.includes(id)) records.put({ ...record, collectionIds: record.collectionIds.filter(collectionId => collectionId !== id) });
      });
      transaction.objectStore(collectionsStore).delete(id);
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Collection storage failed.")); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Collection storage failed.")); };
  });
}
export const getBirthDate = () => runRequest<string | undefined>(settingsStore, "readonly", store => store.get("birthDate"));
export const saveBirthDate = (date: string) => date
  ? runRequest<IDBValidKey>(settingsStore, "readwrite", store => store.put(date, "birthDate"))
  : runRequest<undefined>(settingsStore, "readwrite", store => store.delete("birthDate"));
export const getHealthSummary = () => runRequest<HealthSummary | undefined>(settingsStore, "readonly", store => store.get("healthSummary"));
export const saveHealthSummary = (summary: HealthSummary) => runRequest<IDBValidKey>(settingsStore, "readwrite", store => store.put(summary, "healthSummary"));
export function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
export function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
