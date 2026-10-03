"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  FileImage,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutList,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import { legacyMigrationAvailable, migrateLegacyData } from "@/lib/migration";
import {
  deleteRecord,
  formatBytes,
  formatDate,
  getBirthDate,
  listContributions,
  listCollections,
  listRecords,
  recordTypes,
  saveBirthDate,
  saveRecord,
  type CareCollection,
  type DoctorContribution,
  type MedicalRecord,
  type RecordType,
} from "@/lib/records";

type Draft = {
  title: string;
  type: RecordType;
  date: string;
  provider: string;
  notes: string;
  specialty: string;
  tags: string;
  medicines: string;
  findings: string;
  important: boolean;
  sensitive: boolean;
  collectionIds: string[];
};
const emptyDraft = (): Draft => ({
  title: "",
  type: "Laboratory",
  date: new Date().toISOString().slice(0, 10),
  provider: "",
  notes: "",
  specialty: "",
  tags: "",
  medicines: "",
  findings: "",
  important: false,
  sensitive: false,
  collectionIds: [],
});
const acceptedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
type ImportStage = "choose" | "processing" | "review";
type TimelineEntry =
  | { kind: "record"; date: string; item: MedicalRecord }
  | { kind: "contribution"; date: string; item: DoctorContribution };

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

function titleFromFile(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Produces safe fictional suggestions without reading or uploading the file. */
function simulateExtraction(file: File): Draft {
  const fileName = file.name.toLowerCase();
  const draft = emptyDraft();

  if (/prescription|medicine|rx/.test(fileName)) {
    return {
      ...draft,
      title: titleFromFile(file.name),
      type: "Prescription",
      provider: "Dr Ananya Mehta",
      specialty: "General medicine",
      tags: "Follow-up care",
      medicines: "Montelukast · 10 mg · Every evening",
      findings: "Medicine details require verification against the original",
    };
  }

  if (/scan|xray|x-ray|mri|ct|imaging/.test(fileName)) {
    return {
      ...draft,
      title: titleFromFile(file.name),
      type: "Imaging",
      provider: "City Care Imaging",
      specialty: "Radiology",
      tags: "Diagnostic imaging",
      findings: "Imaging impression · Review the original report",
    };
  }

  if (/vaccine|vaccination|immun/.test(fileName)) {
    return {
      ...draft,
      title: titleFromFile(file.name),
      type: "Vaccination",
      provider: "Lotus Clinic",
      specialty: "Preventive care",
      tags: "Immunisation",
      findings: "Dose information · Verify against the original",
    };
  }

  if (/discharge|hospital/.test(fileName)) {
    return {
      ...draft,
      title: titleFromFile(file.name),
      type: "Discharge summary",
      provider: "City Care Hospital",
      specialty: "Inpatient care",
      tags: "Hospital stay\nFollow-up required",
      findings: "Discharge instructions · Review the original document",
    };
  }

  return {
    ...draft,
    title: titleFromFile(file.name),
    type: "Laboratory",
    provider: "Lotus Diagnostics",
    specialty: "Pathology",
    tags: "Routine checkup",
    findings: "Haemoglobin · 13.4 g/dL\nHbA1c · 5.6%",
  };
}

function correctedExtractionFields(draft: Draft, suggested: Draft) {
  const labels: Array<[keyof Draft, string]> = [
    ["title", "Title"],
    ["type", "Record type"],
    ["date", "Date"],
    ["provider", "Provider"],
    ["specialty", "Specialty"],
    ["tags", "Conditions or tags"],
    ["medicines", "Medicines"],
    ["findings", "Tests and notable values"],
  ];
  return labels
    .filter(([field]) => draft[field] !== suggested[field])
    .map(([, label]) => label);
}
function ageAt(date: string, birthDate: string) {
  if (!birthDate || date < birthDate) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  return (
    year -
    birthYear -
    (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0)
  );
}

/**
 * Owns local file persistence, metadata editing, search, the chronological
 * timeline, and document preview/download for the record library.
 */
export function RecordLibrary() {
  // Data loaded from the localhost backend.
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [collections, setCollections] = useState<CareCollection[]>([]);
  const [contributions, setContributions] = useState<DoctorContribution[]>([]);

  // Page controls and temporary editor state are not persisted.
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [migrationAvailable, setMigrationAvailable] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All records");
  const [view, setView] = useState<"library" | "timeline">("library");
  const [birthDate, setBirthDate] = useState("");
  const [birthDateError, setBirthDateError] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [selectedContribution, setSelectedContribution] =
    useState<DoctorContribution | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [importStage, setImportStage] = useState<ImportStage>("choose");
  const [suggestedDraft, setSuggestedDraft] = useState<Draft | null>(null);
  const [verified, setVerified] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [importPreviewUrl, setImportPreviewUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const processingTimer = useRef<number | null>(null);

  // Resources load independently so optional collection or birth-date failures
  // do not prevent the core record list from opening.
  useEffect(() => {
    listRecords()
      .then(setRecords)
      .catch(() =>
        setStorageError(
          "This browser could not open local record storage. Check your browser settings and try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    legacyMigrationAvailable()
      .then(setMigrationAvailable)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    listCollections()
      .then((items) =>
        setCollections(items.sort((a, b) => a.name.localeCompare(b.name))),
      )
      .catch(() => setStorageError("Collections could not be opened."));
  }, []);
  useEffect(() => {
    getBirthDate()
      .then((date) => setBirthDate(date ?? ""))
      .catch(() => setBirthDateError("Could not load your date of birth."));
  }, []);
  useEffect(() => {
    listContributions()
      .then((items) =>
        setContributions(items.filter((item) => item.status === "accepted")),
      )
      .catch(() => setStorageError("Accepted doctor notes could not be opened."));
  }, []);
  useEffect(() => {
    if (!selected || dialog !== "view") return;
    const url = URL.createObjectURL(selected.file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [selected, dialog]);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImportPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setImportPreviewUrl(null);
    };
  }, [file]);
  useEffect(
    () => () => {
      if (processingTimer.current) window.clearTimeout(processingTimer.current);
    },
    [],
  );

  // Both visual modes consume the same searched, filtered, and sorted records.
  const filtered = useMemo(
    () =>
      records
        .filter((record) => {
          const matchType = filter === "All records" || record.type === filter;
          const words =
            `${record.title} ${record.type} ${record.provider} ${record.specialty ?? ""} ${record.tags?.join(" ") ?? ""} ${record.medicines?.join(" ") ?? ""} ${record.findings?.join(" ") ?? ""} ${record.notes} ${record.fileName}`.toLowerCase();
          return matchType && words.includes(query.trim().toLowerCase());
        })
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    [records, filter, query],
  );
  const timelineYears = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const contributionEntries: TimelineEntry[] = contributions
      .filter(() => filter === "All records")
      .filter((item) =>
        `${item.title} ${item.doctorName} ${item.doctorSpecialty} ${item.assessment} ${item.recommendations} ${item.suggestedTests}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .map((item) => ({
        kind: "contribution" as const,
        date: item.consultationDate,
        item,
      }));
    const entries: TimelineEntry[] = [
      ...filtered.map((item) => ({
        kind: "record" as const,
        date: item.date,
        item,
      })),
      ...contributionEntries,
    ].sort((a, b) => b.date.localeCompare(a.date));
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of entries) {
      const year = entry.date.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), entry]);
    }
    return [...groups];
  }, [contributions, filter, filtered, query]);

  // Dialog setup helpers keep add/edit defaults out of the page markup.
  function beginAdd() {
    setSelected(null);
    setDraft(emptyDraft());
    setFile(null);
    setImportStage("choose");
    setSuggestedDraft(null);
    setVerified(false);
    setFormError("");
    setDialog("add");
  }
  function beginEdit(record: MedicalRecord) {
    setSelected(record);
    setDraft({
      title: record.title,
      type: record.type,
      date: record.date,
      provider: record.provider,
      notes: record.notes,
      specialty: record.specialty ?? "",
      tags: record.tags?.join("\n") ?? "",
      medicines: record.medicines?.join("\n") ?? "",
      findings: record.findings?.join("\n") ?? "",
      important: Boolean(record.important),
      sensitive: Boolean(record.sensitive),
      collectionIds: record.collectionIds ?? [],
    });
    setFile(null);
    setFormError("");
    setDialog("edit");
  }
  function closeDialog() {
    if (!saving) {
      if (processingTimer.current) {
        window.clearTimeout(processingTimer.current);
        processingTimer.current = null;
      }
      setDialog(null);
      setSelected(null);
      setFile(null);
      setImportStage("choose");
      setSuggestedDraft(null);
      setVerified(false);
      setFormError("");
    }
  }
  function chooseFile(chosen?: File) {
    if (!chosen) return;
    if (!acceptedTypes.includes(chosen.type)) {
      setFormError("Choose a PDF, JPG, PNG, or WebP file.");
      return;
    }
    if (chosen.size > 25 * 1024 * 1024) {
      setFormError("Choose a file smaller than 25 MB.");
      return;
    }
    if (processingTimer.current) window.clearTimeout(processingTimer.current);
    setFile(chosen);
    setFormError("");
    setVerified(false);
    setSuggestedDraft(null);
    setImportStage("processing");
    processingTimer.current = window.setTimeout(() => {
      const suggestion = simulateExtraction(chosen);
      setSuggestedDraft(suggestion);
      setDraft(suggestion);
      setImportStage("review");
      processingTimer.current = null;
    }, 650);
  }

  // The original Blob and its searchable metadata persist as one record.
  async function save() {
    if (!draft.title.trim()) {
      setFormError("Enter a record title.");
      return;
    }
    if (!draft.date) {
      setFormError("Choose a record date.");
      return;
    }
    if (draft.date > new Date().toISOString().slice(0, 10)) {
      setFormError("The record date cannot be in the future.");
      return;
    }
    if (dialog === "add" && !file) {
      setFormError("Choose a file to add.");
      return;
    }
    if (dialog === "add" && !verified) {
      setFormError(
        "Confirm that you compared the suggested details with the original document.",
      );
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const record: MedicalRecord = {
        id: selected?.id ?? crypto.randomUUID(),
        title: draft.title.trim(),
        type: draft.type,
        date: draft.date,
        provider: draft.provider.trim(),
        notes: draft.notes.trim(),
        specialty: draft.specialty.trim(),
        tags: splitLines(draft.tags),
        medicines: splitLines(draft.medicines),
        findings: splitLines(draft.findings),
        important: draft.important,
        sensitive: draft.sensitive,
        collectionIds: draft.collectionIds,
        fileName: selected?.fileName ?? file!.name,
        fileType: selected?.fileType ?? file!.type,
        fileSize: selected?.fileSize ?? file!.size,
        file: selected?.file ?? file!,
        createdAt: selected?.createdAt ?? new Date().toISOString(),
        extraction:
          selected?.extraction ??
          (suggestedDraft
            ? {
                method: "simulated",
                reviewedAt: new Date().toISOString(),
                correctedFields: correctedExtractionFields(
                  draft,
                  suggestedDraft,
                ),
              }
            : undefined),
      };
      await saveRecord(record);
      setRecords((current) => [
        record,
        ...current.filter((item) => item.id !== record.id),
      ]);
      setDialog(null);
      setSelected(null);
      setFile(null);
    } catch {
      setFormError(
        "Could not save this record. Check available browser storage and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(record: MedicalRecord) {
    if (
      !window.confirm(
        `Remove “${record.title}” and its file from this browser?`,
      )
    )
      return;
    try {
      await deleteRecord(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setDialog(null);
      setSelected(null);
    } catch {
      setStorageError("Could not remove the record. Please try again.");
    }
  }
  function download(record: MedicalRecord) {
    const url = URL.createObjectURL(record.file);
    const link = document.createElement("a");
    link.href = url;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  async function updateBirthDate() {
    if (
      birthDate &&
      (birthDate > new Date().toISOString().slice(0, 10) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
    ) {
      setBirthDateError("Enter a valid date of birth in the past.");
      return;
    }
    try {
      await saveBirthDate(birthDate);
      setBirthDateError("");
    } catch {
      setBirthDateError("Could not save your date of birth.");
    }
  }
  function openRecord(record: MedicalRecord) {
    setSelected(record);
    setDialog("view");
  }
  async function migrateBrowserData() {
    setMigrating(true);
    setStorageError("");
    try {
      await migrateLegacyData();
      window.location.reload();
    } catch {
      setStorageError("Browser data could not be moved to the local backend.");
      setMigrating(false);
    }
  }

  return (
    <main className="library-page">
      <header className="site-header wrap">
        <Brand />
        <DossierNav active="records" />
        <div className="header-actions">
          <Link className="header-back" href="/">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>
      <div className="library-shell wrap">
        <div className="library-heading">
          <div>
            <span className="section-kicker">MY HEALTH DOSSIER</span>
            <h1>Record library</h1>
            <p>A place for the documents that tell your health story.</p>
          </div>
          <button className="button button-primary" onClick={beginAdd}>
            <Plus size={18} /> Add a record
          </button>
        </div>
        <div className="privacy-note">
          <span className="privacy-icon">
            <LockKeyhole size={20} />
          </span>
          <div>
            <strong>Stored by the local backend on this Mac</strong>
            <p>
              JSON data and original files stay in the private local data
              folder. They are not sent to a cloud service.
            </p>
          </div>
        </div>
        {migrationAvailable && (
          <div className="privacy-note migration-note">
            <span className="privacy-icon">
              <UploadCloud size={20} />
            </span>
            <div>
              <strong>Browser records are ready to move</strong>
              <p>
                Copy the previous IndexedDB records and files into this Mac’s
                local backend. The browser copy will remain as a backup.
              </p>
            </div>
            <button
              className="button button-outline"
              onClick={migrateBrowserData}
              disabled={migrating}
            >
              {migrating ? "Moving…" : "Move data to this Mac"}
            </button>
          </div>
        )}
        {storageError && (
          <p className="notice-error" role="alert">
            {storageError}
          </p>
        )}
        <section className="library-panel" aria-label="Medical records">
          <div className="library-toolbar">
            <div>
              <h2>Your documents</h2>
              <p>
                {loading
                  ? "Loading records…"
                  : `${records.length} ${records.length === 1 ? "record" : "records"} saved`}
              </p>
            </div>
            <div className="toolbar-controls">
              <label className="search-box">
                <Search size={18} />
                <span className="sr-only">Search records</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search records"
                />
              </label>
              <label className="filter-box">
                <span className="sr-only">Filter by type</span>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option>All records</option>
                  {recordTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="library-view-bar">
            <div className="view-switch" aria-label="Record view">
              <button
                className={view === "library" ? "active" : ""}
                aria-pressed={view === "library"}
                onClick={() => setView("library")}
              >
                <LayoutList size={16} /> Library
              </button>
              <button
                className={view === "timeline" ? "active" : ""}
                aria-pressed={view === "timeline"}
                onClick={() => setView("timeline")}
              >
                <CalendarDays size={16} /> Timeline
              </button>
            </div>
            {view === "timeline" && (
              <div className="birth-date-control">
                <label htmlFor="birth-date">
                  Date of birth <span>for age labels</span>
                </label>
                <input
                  id="birth-date"
                  type="date"
                  value={birthDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setBirthDate(event.target.value)}
                  onBlur={updateBirthDate}
                />
              </div>
            )}
          </div>
          {birthDateError && view === "timeline" && (
            <p className="notice-error" role="alert">
              {birthDateError}
            </p>
          )}
          {loading ? (
            <div className="empty-state">
              <p>Loading your library…</p>
            </div>
          ) : (view === "library" && filtered.length === 0) ||
            (view === "timeline" && timelineYears.length === 0) ? (
            <div className="empty-state">
              <span className="empty-icon">
                {records.length ? (
                  <Search size={32} />
                ) : (
                  <FolderOpen size={34} />
                )}
              </span>
              <h3>
                {records.length
                  ? "No matching records"
                  : "Your library starts here"}
              </h3>
              <p>
                {records.length
                  ? "Try another search or type filter."
                  : "Add a report, prescription, scan, or other medical document to keep it easy to find."}
              </p>
              {records.length === 0 && (
                <button className="button button-primary" onClick={beginAdd}>
                  <FilePlus2 size={18} /> Add your first record
                </button>
              )}
            </div>
          ) : view === "timeline" ? (
            <div className="timeline">
              {timelineYears.map(([year, yearEntries]) => (
                <section
                  className="timeline-year"
                  key={year}
                  aria-label={`Records from ${year}`}
                >
                  <div className="timeline-year-heading">
                    <h3>{year}</h3>
                    <span>
                      {yearEntries.length}{" "}
                      {yearEntries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="timeline-items">
                    {yearEntries.map((entry) => {
                      if (entry.kind === "contribution") {
                        const contribution = entry.item;
                        return (
                          <article className="timeline-item doctor-note" key={contribution.id}>
                            <span className="timeline-marker" aria-hidden="true" />
                            <div className="timeline-date">
                              <strong>{formatDate(contribution.consultationDate)}</strong>
                              {birthDate && ageAt(contribution.consultationDate, birthDate) !== null && (
                                <span>Age {ageAt(contribution.consultationDate, birthDate)}</span>
                              )}
                            </div>
                            <div className="timeline-card">
                              <div className="timeline-card-top">
                                <span>Doctor note</span>
                                <span className="accepted-note-label">Accepted</span>
                              </div>
                              <button
                                className="record-title"
                                onClick={() => setSelectedContribution(contribution)}
                              >
                                {contribution.title}
                              </button>
                              <p>{contribution.doctorName}</p>
                            </div>
                            <button
                              className="icon-button"
                              aria-label={`Open ${contribution.title}`}
                              onClick={() => setSelectedContribution(contribution)}
                            >
                              <ArrowLeft className="chevron-right" size={19} />
                            </button>
                          </article>
                        );
                      }
                      const record = entry.item;
                      return (
                        <article
                          className={`timeline-item ${record.important ? "important" : ""}`}
                          key={record.id}
                        >
                        <span className="timeline-marker" aria-hidden="true" />
                        <div className="timeline-date">
                          <strong>{formatDate(record.date)}</strong>
                          {birthDate &&
                            ageAt(record.date, birthDate) !== null && (
                              <span>Age {ageAt(record.date, birthDate)}</span>
                            )}
                        </div>
                        <div className="timeline-card">
                          <div className="timeline-card-top">
                            <span>{record.type}</span>
                            {record.important && (
                              <span className="important-label">Important</span>
                            )}
                            {record.sensitive && (
                              <span className="sensitive-label">Sensitive</span>
                            )}
                          </div>
                          <button
                            className="record-title"
                            onClick={() => openRecord(record)}
                          >
                            {record.title}
                          </button>
                          {record.provider && <p>{record.provider}</p>}
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Open ${record.title}`}
                          title="Open record"
                          onClick={() => openRecord(record)}
                        >
                          <ArrowLeft className="chevron-right" size={19} />
                        </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="records-list">
              {filtered.map((record) => (
                <article className="record-row" key={record.id}>
                  <span
                    className={`record-file-icon ${record.fileType.startsWith("image/") ? "image" : ""}`}
                  >
                    {record.fileType.startsWith("image/") ? (
                      <FileImage size={23} />
                    ) : (
                      <FileText size={23} />
                    )}
                  </span>
                  <div className="record-main">
                    <button
                      className="record-title"
                      onClick={() => openRecord(record)}
                    >
                      {record.title}
                    </button>
                    <p>
                      <span>{record.type}</span>
                      <span className="meta-dot">·</span>
                      <span>{formatDate(record.date)}</span>
                      {record.provider && (
                        <>
                          <span className="meta-dot">·</span>
                          <span>{record.provider}</span>
                        </>
                      )}
                      {record.important && (
                        <>
                          <span className="meta-dot">·</span>
                          <span className="important-text">Important</span>
                        </>
                      )}
                      {record.sensitive && (
                        <>
                          <span className="meta-dot">·</span>
                          <span className="sensitive-text">Sensitive</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="record-size">
                    {formatBytes(record.fileSize)}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Download ${record.title}`}
                    title="Download original"
                    onClick={() => download(record)}
                  >
                    <ArrowDownToLine size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Open ${record.title}`}
                    title="Open record"
                    onClick={() => openRecord(record)}
                  >
                    <ArrowLeft className="chevron-right" size={19} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="library-footnote">
          Your records are saved by the local backend on this Mac.
        </p>
      </div>
      {(dialog === "add" || dialog === "edit") && (
        <div className="modal-backdrop" onMouseDown={closeDialog}>
          <div
            className={`record-modal ${dialog === "add" ? "import-modal" : ""} ${dialog === "add" && importStage === "review" ? "import-modal-review" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  {dialog === "add" ? "SMART IMPORT" : "UPDATE DETAILS"}
                </span>
                <h2 id="form-title">
                  {dialog === "edit"
                    ? "Edit record details"
                    : importStage === "choose"
                      ? "Add a medical record"
                      : importStage === "processing"
                        ? "Reading your document"
                        : "Review extracted details"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={closeDialog}
              >
                <X size={21} />
              </button>
            </div>
            <div className="modal-content">
              {dialog === "add" && importStage === "choose" && (
                <div
                  className="upload-zone"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    chooseFile(event.dataTransfer.files[0]);
                  }}
                >
                  <UploadCloud size={30} />
                  <strong>Choose a file or drop it here</strong>
                  <span>PDF, JPG, PNG, or WebP · up to 25 MB</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) => chooseFile(event.target.files?.[0])}
                    className="sr-only"
                    aria-label="Choose medical document"
                  />
                </div>
              )}
              {dialog === "add" && importStage === "processing" && (
                <div className="import-processing" role="status">
                  <span className="processing-icon">
                    <LoaderCircle size={31} />
                  </span>
                  <span className="section-kicker">SIMULATED EXTRACTION</span>
                  <h3>Finding useful details…</h3>
                  <p>
                    Checking the title, date, provider, medicines, and notable
                    values in <strong>{file?.name}</strong>.
                  </p>
                  <div className="processing-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              {(dialog === "edit" || importStage === "review") && (
                <>
                  {dialog === "add" && (
                    <div className="extraction-notice">
                      <Sparkles size={20} />
                      <div>
                        <strong>Suggestions are ready for your review</strong>
                        <p>
                          Extraction is simulated. Compare every medical detail
                          with the original document before saving.
                        </p>
                      </div>
                    </div>
                  )}
                  <div
                    className={
                      dialog === "add" ? "import-review-layout" : undefined
                    }
                  >
                    {dialog === "add" && (
                      <aside className="import-original">
                        <div className="import-original-heading">
                          <div>
                            <span>ORIGINAL DOCUMENT</span>
                            <strong>{file?.name}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInput.current?.click()}
                          >
                            Replace
                          </button>
                        </div>
                        <div className="import-preview">
                          {importPreviewUrl &&
                          file?.type === "application/pdf" ? (
                            <iframe
                              title={`Original document ${file.name}`}
                              src={importPreviewUrl}
                            />
                          ) : importPreviewUrl && file ? (
                            <Image
                              unoptimized
                              width={620}
                              height={720}
                              src={importPreviewUrl}
                              alt={`Original document ${file.name}`}
                            />
                          ) : (
                            <FileText size={42} />
                          )}
                        </div>
                        <p>
                          The original stays unchanged and remains the
                          authoritative source.
                        </p>
                        <input
                          ref={fileInput}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            chooseFile(event.target.files?.[0])
                          }
                          className="sr-only"
                          aria-label="Replace medical document"
                        />
                      </aside>
                    )}
                    <div
                      className={dialog === "add" ? "import-fields" : undefined}
                    >
                      <div className="form-grid">
                        <label className="field field-wide">
                          Title <span>*</span>
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              setDraft({ ...draft, title: event.target.value })
                            }
                            placeholder="e.g. Annual blood test"
                            maxLength={120}
                          />
                        </label>
                        <label className="field">
                          Record type
                          <select
                            value={draft.type}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                type: event.target.value as RecordType,
                              })
                            }
                          >
                            {recordTypes.map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Date <span>*</span>
                          <input
                            type="date"
                            value={draft.date}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(event) =>
                              setDraft({ ...draft, date: event.target.value })
                            }
                          />
                        </label>
                        <label className="field field-wide">
                          Doctor, clinic, or hospital <small>Optional</small>
                          <input
                            value={draft.provider}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                provider: event.target.value,
                              })
                            }
                            placeholder="Where this record came from"
                            maxLength={120}
                          />
                        </label>
                        <label className="field field-wide">
                          Specialty <small>Optional</small>
                          <input
                            value={draft.specialty}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                specialty: event.target.value,
                              })
                            }
                            placeholder="e.g. Cardiology"
                            maxLength={120}
                          />
                        </label>
                        <label className="field">
                          Conditions or tags <small>One per line</small>
                          <textarea
                            rows={4}
                            value={draft.tags}
                            onChange={(event) =>
                              setDraft({ ...draft, tags: event.target.value })
                            }
                            placeholder={"Routine checkup\nHeart health"}
                            maxLength={800}
                          />
                        </label>
                        <label className="field">
                          Medicines <small>One per line</small>
                          <textarea
                            rows={4}
                            value={draft.medicines}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                medicines: event.target.value,
                              })
                            }
                            placeholder="Medicine · dose · schedule"
                            maxLength={1200}
                          />
                        </label>
                        <label className="field field-wide">
                          Tests and notable values <small>One per line</small>
                          <textarea
                            rows={4}
                            value={draft.findings}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                findings: event.target.value,
                              })
                            }
                            placeholder="Test · result · unit"
                            maxLength={1600}
                          />
                        </label>
                        <label className="field field-wide">
                          Notes <small>Optional</small>
                          <textarea
                            rows={3}
                            value={draft.notes}
                            onChange={(event) =>
                              setDraft({ ...draft, notes: event.target.value })
                            }
                            placeholder="Add a detail that will help you find this later"
                            maxLength={1000}
                          />
                        </label>
                        <label className="important-check field-wide">
                          <input
                            type="checkbox"
                            checked={draft.important}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                important: event.target.checked,
                              })
                            }
                          />
                          <span>
                            <strong>Mark as important</strong>
                            <small>
                              Give this record a coral marker in your timeline.
                            </small>
                          </span>
                        </label>
                        <label className="important-check sensitive-check field-wide">
                          <input
                            type="checkbox"
                            checked={draft.sensitive}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                sensitive: event.target.checked,
                              })
                            }
                          />
                          <span>
                            <strong>Mark as sensitive</strong>
                            <small>
                              Exclude this record from broad sharing unless you
                              deliberately include it.
                            </small>
                          </span>
                        </label>
                        <fieldset className="collection-picker field-wide">
                          <legend>
                            Care collections <small>Optional</small>
                          </legend>
                          {collections.length ? (
                            <div className="collection-options">
                              {collections.map((collection) => (
                                <label key={collection.id}>
                                  <input
                                    type="checkbox"
                                    checked={draft.collectionIds.includes(
                                      collection.id,
                                    )}
                                    onChange={(event) =>
                                      setDraft({
                                        ...draft,
                                        collectionIds: event.target.checked
                                          ? [
                                              ...draft.collectionIds,
                                              collection.id,
                                            ]
                                          : draft.collectionIds.filter(
                                              (id) => id !== collection.id,
                                            ),
                                      })
                                    }
                                  />
                                  <span>{collection.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p>
                              No collections yet.{" "}
                              <Link href="/collections">
                                Create a collection
                              </Link>{" "}
                              to organize this record.
                            </p>
                          )}
                        </fieldset>
                      </div>
                      {dialog === "add" && (
                        <label className="verification-check">
                          <input
                            type="checkbox"
                            checked={verified}
                            onChange={(event) => {
                              setVerified(event.target.checked);
                              if (event.target.checked) setFormError("");
                            }}
                          />
                          <CircleCheck size={20} />
                          <span>
                            <strong>
                              I compared these details with the original
                            </strong>
                            <small>
                              I understand the suggestions are simulated and may
                              be incorrect.
                            </small>
                          </span>
                        </label>
                      )}
                      {formError && (
                        <p className="notice-error" role="alert">
                          {formError}
                        </p>
                      )}
                      <div className="modal-actions">
                        <button
                          className="button button-outline"
                          onClick={closeDialog}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          className="button button-primary"
                          onClick={save}
                          disabled={saving || (dialog === "add" && !verified)}
                        >
                          {saving
                            ? "Saving…"
                            : dialog === "add"
                              ? "Save record"
                              : "Save changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {dialog === "add" && importStage !== "review" && formError && (
                <p className="notice-error" role="alert">
                  {formError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {dialog === "view" && selected && (
        <div className="modal-backdrop" onMouseDown={closeDialog}>
          <div
            className="record-modal view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  {selected.type.toUpperCase()}
                </span>
                <h2 id="view-title">{selected.title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={closeDialog}
              >
                <X size={21} />
              </button>
            </div>
            <div className="modal-content">
              <div className="record-details">
                <div>
                  <span>Date</span>
                  <strong>
                    <CalendarDays size={16} />
                    {formatDate(selected.date)}
                  </strong>
                </div>
                <div>
                  <span>Care provider</span>
                  <strong>{selected.provider || "Not specified"}</strong>
                </div>
                <div>
                  <span>Specialty</span>
                  <strong>{selected.specialty || "Not specified"}</strong>
                </div>
                <div>
                  <span>Original file</span>
                  <strong>
                    {selected.fileName} · {formatBytes(selected.fileSize)}
                  </strong>
                </div>
                {selected.extraction && (
                  <div>
                    <span>Import review</span>
                    <strong className="verified-detail">
                      <CircleCheck size={16} /> Verified against original
                    </strong>
                  </div>
                )}
                {selected.tags?.length ? (
                  <div className="details-notes">
                    <span>Conditions or tags</span>
                    <ul className="extracted-tags">
                      {selected.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selected.medicines?.length ? (
                  <div className="details-notes">
                    <span>Medicines</span>
                    <ul className="extracted-list">
                      {selected.medicines.map((medicine) => (
                        <li key={medicine}>{medicine}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selected.findings?.length ? (
                  <div className="details-notes">
                    <span>Tests and notable values</span>
                    <ul className="extracted-list">
                      {selected.findings.map((finding) => (
                        <li key={finding}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selected.extraction?.correctedFields.length ? (
                  <div className="details-notes extraction-history">
                    <span>Corrections made during review</span>
                    <p>{selected.extraction.correctedFields.join(" · ")}</p>
                  </div>
                ) : null}
                {selected.collectionIds?.length ? (
                  <div className="details-notes">
                    <span>Collections</span>
                    <div className="record-collection-tags">
                      {collections
                        .filter((collection) =>
                          selected.collectionIds?.includes(collection.id),
                        )
                        .map((collection) => (
                          <Link
                            key={collection.id}
                            href={`/collections/${collection.id}`}
                          >
                            {collection.name}
                          </Link>
                        ))}
                    </div>
                  </div>
                ) : null}
                {selected.notes && (
                  <div className="details-notes">
                    <span>Notes</span>
                    <p>{selected.notes}</p>
                  </div>
                )}
              </div>
              {previewUrl && (
                <div className="file-preview">
                  {selected.fileType === "application/pdf" ? (
                    <iframe
                      title={`Preview of ${selected.title}`}
                      src={previewUrl}
                    />
                  ) : (
                    <Image
                      unoptimized
                      width={720}
                      height={330}
                      src={previewUrl}
                      alt={`Preview of ${selected.title}`}
                    />
                  )}
                </div>
              )}
              <div className="modal-actions view-actions">
                <button
                  className="button button-outline"
                  onClick={() => beginEdit(selected)}
                >
                  <Pencil size={16} /> Edit details
                </button>
                <button
                  className="button button-danger"
                  onClick={() => remove(selected)}
                >
                  <Trash2 size={16} /> Remove
                </button>
                <button
                  className="button button-primary"
                  onClick={() => download(selected)}
                >
                  <ArrowDownToLine size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedContribution && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedContribution(null)}
        >
          <div
            className="record-modal contribution-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-contribution-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">ACCEPTED DOCTOR NOTE</span>
                <h2 id="timeline-contribution-title">
                  {selectedContribution.title}
                </h2>
                <p>
                  {selectedContribution.doctorName} · {selectedContribution.doctorSpecialty} · {selectedContribution.doctorClinic}
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setSelectedContribution(null)}
              >
                <X size={21} />
              </button>
            </div>
            <div className="contribution-review-details">
              <div>
                <span>Consultation date</span>
                <strong>{formatDate(selectedContribution.consultationDate)}</strong>
              </div>
              {selectedContribution.linkedRecordTitle && (
                <div>
                  <span>Linked record</span>
                  <strong>{selectedContribution.linkedRecordTitle}</strong>
                </div>
              )}
              <section>
                <h3>Assessment</h3>
                <p>{selectedContribution.assessment}</p>
              </section>
              <section>
                <h3>Recommendations</h3>
                <p>{selectedContribution.recommendations}</p>
              </section>
              {selectedContribution.suggestedTests && (
                <section>
                  <h3>Suggested tests</h3>
                  <p>{selectedContribution.suggestedTests}</p>
                </section>
              )}
              {selectedContribution.followUpDate && (
                <div>
                  <span>Suggested follow-up</span>
                  <strong>{formatDate(selectedContribution.followUpDate)}</strong>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <span className="contribution-status accepted">
                <ClipboardCheck size={15} /> Accepted by you
              </span>
              <button
                className="button button-outline"
                onClick={() => setSelectedContribution(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
