export const recordTypes = ["Laboratory", "Prescription", "Imaging", "Vaccination", "Discharge summary", "Clinical note", "Other"] as const;
export type RecordType = typeof recordTypes[number];
export type MedicalRecord = {
  id: string;
  title: string;
  type: RecordType;
  date: string;
  provider: string;
  notes: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  file: Blob;
  createdAt: string;
};

const databaseName = "health-dossier-records";
const storeName = "records";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open record storage."));
  });
}

async function runRequest<T>(mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = execute(transaction.objectStore(storeName));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Record storage failed.")); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Record storage failed.")); };
  });
}

export const listRecords = () => runRequest<MedicalRecord[]>("readonly", store => store.getAll());
export const saveRecord = (record: MedicalRecord) => runRequest<IDBValidKey>("readwrite", store => store.put(record));
export const deleteRecord = (id: string) => runRequest<undefined>("readwrite", store => store.delete(id));
export function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
export function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
