/** Shared domain types and the browser HTTP client for the local backend. */

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
  emergencyContact: { name: string; relationship: string; phone: string };
  careNotes: string;
  updatedAt: string;
};
export const measurementCategories = [
  "Laboratory",
  "Vital sign",
  "Body measurement",
  "Other",
] as const;
export type MeasurementCategory = (typeof measurementCategories)[number];
export type HealthMeasurement = {
  id: string;
  name: string;
  value: number;
  unit: string;
  measuredAt: string;
  category: MeasurementCategory;
  referenceLow?: number;
  referenceHigh?: number;
  notes: string;
  sourceRecordId?: string;
  sourceRecordTitle?: string;
  createdAt: string;
  updatedAt: string;
};
export type HealthMeasurementInput = Pick<
  HealthMeasurement,
  | "name"
  | "value"
  | "unit"
  | "measuredAt"
  | "category"
  | "referenceLow"
  | "referenceHigh"
  | "notes"
  | "sourceRecordId"
>;
export type MeasurementRangeStatus = "low" | "within" | "high" | "unknown";

/** Groups only measurements with the same reviewed name and unit. */
export function measurementGroupKey(name: string, unit: string) {
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return `${normalize(name)}::${normalize(unit)}`;
}

/** Interprets only patient-entered report ranges; it is not clinical advice. */
export function measurementRangeStatus(
  measurement: Pick<HealthMeasurement, "value" | "referenceLow" | "referenceHigh">,
): MeasurementRangeStatus {
  if (measurement.referenceLow === undefined && measurement.referenceHigh === undefined)
    return "unknown";
  if (measurement.referenceLow !== undefined && measurement.value < measurement.referenceLow)
    return "low";
  if (measurement.referenceHigh !== undefined && measurement.value > measurement.referenceHigh)
    return "high";
  return "within";
}
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
export type DoctorSignupInput = Omit<
  DoctorProfile,
  "id" | "email" | "verificationStatus" | "builtIn" | "createdAt" | "updatedAt"
> & { email: string; password: string };
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
  action:
    | "granted"
    | "viewed"
    | "downloaded"
    | "revoked"
    | "contribution-submitted"
    | "contribution-accepted"
    | "contribution-rejected";
  actor: string;
  detail: string;
  createdAt: string;
};
export type DoctorContributionStatus = "pending" | "accepted" | "rejected";
export type DoctorContribution = {
  id: string;
  shareId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorClinic: string;
  patientName: string;
  linkedRecordId?: string;
  linkedRecordTitle?: string;
  title: string;
  consultationDate: string;
  assessment: string;
  recommendations: string;
  suggestedTests: string;
  followUpDate?: string;
  status: DoctorContributionStatus;
  submittedAt: string;
  reviewedAt?: string;
};
export type DoctorContributionInput = Pick<
  DoctorContribution,
  | "shareId"
  | "linkedRecordId"
  | "title"
  | "consultationDate"
  | "assessment"
  | "recommendations"
  | "suggestedTests"
  | "followUpDate"
>;

type RecordMetadata = Omit<MedicalRecord, "file">;
export const demoDoctorPassword = "Doctor123!";

let patientSessionPromise: Promise<void> | undefined;
async function patientSession() {
  patientSessionPromise ??= fetch("/api/auth/patient", { method: "POST" }).then(
    (response) => {
      if (!response.ok)
        throw new Error("Could not start the local patient session.");
    },
  );
  try {
    await patientSessionPromise;
  } catch (error) {
    patientSessionPromise = undefined;
    throw error;
  }
}
export const openPatientSession = patientSession;

async function request(
  url: string,
  init?: RequestInit,
  retry = true,
): Promise<Response> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (response.status === 401 && retry && !url.includes("/api/auth/doctor")) {
    await patientSession();
    return request(url, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "The local backend request failed.");
  }
  return response;
}

async function loadRecords(scope: "patient" | "doctor" = "patient") {
  const suffix = scope === "doctor" ? "&scope=doctor" : "";
  const metadata = (await (
    await request(
      `/api/data?action=records${suffix}`,
      undefined,
      scope !== "doctor",
    )
  ).json()) as RecordMetadata[];
  return Promise.all(
    metadata.map(async (record) => ({
      ...record,
      file: await (
        await request(
          `/api/files/${record.id}${scope === "doctor" ? "?scope=doctor" : ""}`,
          undefined,
          scope !== "doctor",
        )
      ).blob(),
    })),
  );
}

export const listRecords = () => loadRecords("patient");
export const listDoctorRecords = () => loadRecords("doctor");
export async function saveRecord(record: MedicalRecord) {
  const { file, ...metadata } = record;
  const form = new FormData();
  form.set("metadata", JSON.stringify(metadata));
  form.set("file", file, record.fileName);
  await request("/api/records", { method: "POST", body: form });
}
export async function saveRecords(records: MedicalRecord[]) {
  for (const record of records) await saveRecord(record);
}
export const deleteRecord = (id: string) =>
  request(`/api/records?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).then(() => undefined);

const getData = async <T>(action: string, doctor = false) =>
  (await (
    await request(
      `/api/data?action=${action}${doctor ? "&scope=doctor" : ""}`,
      undefined,
      !doctor,
    )
  ).json()) as T;
const postData = (action: string, value: unknown) =>
  request("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, value }),
  }).then(() => undefined);

export const listCollections = () => getData<CareCollection[]>("collections");
export const getCollection = async (id: string) =>
  (await listCollections()).find((item) => item.id === id);
export const saveCollection = (value: CareCollection) =>
  postData("saveCollection", value);
export const deleteCareCollection = (id: string) =>
  postData("deleteCollection", id);
export const getBirthDate = () =>
  getData<string>("birthDate").then((value) => value || undefined);
export const saveBirthDate = (value: string) =>
  postData("saveBirthDate", value);
export const getHealthSummary = () =>
  getData<HealthSummary | null>("healthSummary").then(
    (value) => value ?? undefined,
  );
export const saveHealthSummary = (value: HealthSummary) =>
  postData("saveHealthSummary", value);
export const listDoctorProfiles = () => getData<DoctorProfile[]>("doctors");
export const getDoctorProfile = async (id: string) =>
  (await listDoctorProfiles()).find((doctor) => doctor.id === id);
export async function createDoctorAccount(input: DoctorSignupInput) {
  return (await (
    await request(
      "/api/auth/doctor/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      false,
    )
  ).json()) as DoctorProfile;
}
export async function authenticateDoctor(email: string, password: string) {
  const response = await fetch("/api/auth/doctor/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.ok ? ((await response.json()) as DoctorProfile) : undefined;
}
export async function getCurrentDoctor() {
  const response = await fetch("/api/auth/doctor/me", { cache: "no-store" });
  return response.ok ? ((await response.json()) as DoctorProfile) : undefined;
}
export const logoutDoctor = () =>
  fetch("/api/auth/doctor/logout", { method: "POST" }).then(() => undefined);
export const listShares = () => getData<RecordShare[]>("shares");
export const listDoctorShares = () => getData<RecordShare[]>("shares", true);
export const listShareEvents = () => getData<ShareEvent[]>("shareEvents");
export const saveShareWithEvent = (share: RecordShare, event: ShareEvent) =>
  postData("saveShareWithEvent", { share, event });
export const saveShareEvent = (event: ShareEvent) =>
  postData("saveShareEvent", event);
export const revokeShare = (share: RecordShare, event: ShareEvent) =>
  postData("revokeShare", { share, event });
export const listContributions = () =>
  getData<DoctorContribution[]>("contributions");
export const listMeasurements = () =>
  request("/api/measurements")
    .then((response) => response.json())
    .then((value) => value as HealthMeasurement[]);
export const createMeasurement = (value: HealthMeasurementInput) =>
  request("/api/measurements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  }).then((response) => response.json() as Promise<HealthMeasurement>);
export const updateMeasurement = (id: string, value: HealthMeasurementInput) =>
  request("/api/measurements", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...value }),
  }).then((response) => response.json() as Promise<HealthMeasurement>);
export const deleteMeasurement = (id: string) =>
  request(`/api/measurements?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).then(() => undefined);
export const listDoctorContributions = async () =>
  (await (
    await request("/api/contributions?scope=doctor", undefined, false)
  ).json()) as DoctorContribution[];
export const submitDoctorContribution = async (
  value: DoctorContributionInput,
) =>
  (await (
    await request(
      "/api/contributions?scope=doctor",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      },
      false,
    )
  ).json()) as DoctorContribution;
export const reviewDoctorContribution = async (
  id: string,
  decision: "accepted" | "rejected",
) =>
  (await (
    await request("/api/contributions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    })
  ).json()) as DoctorContribution;

export function doctorDetails(profile: DoctorProfile) {
  return `${profile.specialty} · ${profile.clinic}`;
}
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
