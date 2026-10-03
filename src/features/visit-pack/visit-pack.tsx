"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HeartPulse,
  LockKeyhole,
  Pill,
  Printer,
  Share2,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import {
  formatDate,
  getBirthDate,
  getHealthSummary,
  listCollections,
  listContributions,
  listRecords,
  type CareCollection,
  type DoctorContribution,
  type HealthSummary,
  type MedicalRecord,
} from "@/lib/records";

type IncludedSections = {
  personal: boolean;
  allergies: boolean;
  conditions: boolean;
  medications: boolean;
  emergencyContact: boolean;
  careNotes: boolean;
};

const defaultSections: IncludedSections = {
  personal: true,
  allergies: true,
  conditions: true,
  medications: true,
  emergencyContact: true,
  careNotes: false,
};

/**
 * Builds an appointment overview entirely in memory. Nothing is uploaded;
 * print/PDF output is delegated to the browser's native print dialog.
 */
export function VisitPackPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [collections, setCollections] = useState<CareCollection[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorContribution[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [source, setSource] = useState("all");
  const [sections, setSections] = useState<IncludedSections>(defaultSections);
  const [includeDoctorNotes, setIncludeDoctorNotes] = useState(true);
  const [visitFor, setVisitFor] = useState("");
  const [clinician, setClinician] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      listRecords(),
      listCollections(),
      listContributions(),
      getHealthSummary(),
      getBirthDate(),
    ])
      .then(
        ([
          storedRecords,
          storedCollections,
          storedContributions,
          storedSummary,
          storedBirthDate,
        ]) => {
          const sortedRecords = [...storedRecords].sort((a, b) =>
            b.date.localeCompare(a.date),
          );
          // Collection deep links preselect records from that care journey.
          const requestedCollection = new URLSearchParams(
            window.location.search,
          ).get("collection");
          const collectionExists = storedCollections.some(
            (collection) => collection.id === requestedCollection,
          );
          setRecords(sortedRecords);
          setCollections(
            [...storedCollections].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setDoctorNotes(
            storedContributions
              .filter((item) => item.status === "accepted")
              .sort((a, b) =>
                b.consultationDate.localeCompare(a.consultationDate),
              ),
          );
          setSummary(storedSummary ?? null);
          setBirthDate(storedBirthDate ?? "");
          setSource(
            collectionExists && requestedCollection
              ? requestedCollection
              : "all",
          );
          setSelectedIds(
            collectionExists && requestedCollection
              ? sortedRecords
                  .filter((record) =>
                    record.collectionIds?.includes(requestedCollection),
                  )
                  .map((record) => record.id)
              : sortedRecords.map((record) => record.id),
          );
        },
      )
      .catch(() =>
        setMessage("Your visit pack could not be prepared from this browser."),
      )
      .finally(() => setLoading(false));
  }, []);

  const sourceRecords = useMemo(
    () =>
      source === "all"
        ? records
        : records.filter((record) => record.collectionIds?.includes(source)),
    [records, source],
  );
  const selectedRecords = useMemo(
    () =>
      records
        .filter((record) => selectedIds.includes(record.id))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, selectedIds],
  );
  const generatedDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Changing the source replaces the selection. Checkbox changes after that
  // remain local to this unsaved Visit Pack.
  function chooseSource(value: string) {
    setSource(value);
    const available =
      value === "all"
        ? records
        : records.filter((record) => record.collectionIds?.includes(value));
    setSelectedIds(available.map((record) => record.id));
  }

  function toggleRecord(id: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((recordId) => recordId !== id),
    );
  }

  const hasSummaryContent = Boolean(summary);

  return (
    <main className="visit-pack-page">
      <header className="site-header wrap no-print">
        <Brand />
        <DossierNav active="visit-pack" />
        <div className="header-actions">
          <Link className="header-back" href="/">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>
      <div className="visit-pack-shell wrap">
        <div className="visit-pack-heading no-print">
          <div>
            <span className="section-kicker">APPOINTMENT READY</span>
            <h1>Prepare a visit pack</h1>
            <p>
              Choose what a clinician should see, then print it or save a
              private PDF.
            </p>
          </div>
          <div className="visit-pack-heading-actions">
            <Link className="button button-outline" href="/sharing">
              <Share2 size={18} /> Share records
            </Link>
            <button
              className="button button-primary"
              onClick={() => window.print()}
              disabled={
                loading || (!hasSummaryContent && selectedRecords.length === 0)
              }
            >
              <Printer size={18} /> Print / save as PDF
            </button>
          </div>
        </div>

        <div className="pack-privacy no-print">
          <LockKeyhole size={20} />
          <div>
            <strong>Nothing leaves this browser</strong>
            <p>
              This preview is created on your device. Private collection notes
              and original files are never included automatically.
            </p>
          </div>
        </div>
        {message && (
          <p className="notice-error no-print" role="alert">
            {message}
          </p>
        )}

        {loading ? (
          <section className="pack-loading">
            <p>Gathering your health details…</p>
          </section>
        ) : (
          <div className="visit-pack-layout">
            <aside
              className="pack-builder no-print"
              aria-label="Visit pack controls"
            >
              <section className="pack-control-section">
                <div className="pack-control-title">
                  <Stethoscope size={18} />
                  <div>
                    <strong>Visit details</strong>
                    <span>Optional context for the first page.</span>
                  </div>
                </div>
                <div className="pack-field-list">
                  <label className="field">
                    Reason for visit
                    <input
                      value={visitFor}
                      onChange={(event) => setVisitFor(event.target.value)}
                      placeholder="e.g. Cardiology follow-up"
                      maxLength={120}
                    />
                  </label>
                  <label className="field">
                    Doctor or clinic
                    <input
                      value={clinician}
                      onChange={(event) => setClinician(event.target.value)}
                      placeholder="e.g. Dr Mehta"
                      maxLength={120}
                    />
                  </label>
                </div>
              </section>

              <section className="pack-control-section">
                <div className="pack-control-title">
                  <ClipboardCheck size={18} />
                  <div>
                    <strong>Accepted doctor notes</strong>
                    <span>Notes you approved for your dossier.</span>
                  </div>
                </div>
                {doctorNotes.length ? (
                  <div className="pack-check-list">
                    <PackCheck
                      label={`${doctorNotes.length} accepted ${doctorNotes.length === 1 ? "note" : "notes"}`}
                      checked={includeDoctorNotes}
                      onChange={setIncludeDoctorNotes}
                    />
                  </div>
                ) : (
                  <div className="pack-missing">
                    <p>No accepted doctor notes yet.</p>
                    <Link href="/sharing">Review contributions</Link>
                  </div>
                )}
              </section>

              <section className="pack-control-section">
                <div className="pack-control-title">
                  <HeartPulse size={18} />
                  <div>
                    <strong>Health summary</strong>
                    <span>Private care notes start excluded.</span>
                  </div>
                </div>
                {summary ? (
                  <div className="pack-check-list">
                    <PackCheck
                      label="Personal details"
                      checked={sections.personal}
                      onChange={(checked) =>
                        setSections({ ...sections, personal: checked })
                      }
                    />
                    <PackCheck
                      label="Allergies"
                      checked={sections.allergies}
                      onChange={(checked) =>
                        setSections({ ...sections, allergies: checked })
                      }
                    />
                    <PackCheck
                      label="Ongoing conditions"
                      checked={sections.conditions}
                      onChange={(checked) =>
                        setSections({ ...sections, conditions: checked })
                      }
                    />
                    <PackCheck
                      label="Current medications"
                      checked={sections.medications}
                      onChange={(checked) =>
                        setSections({ ...sections, medications: checked })
                      }
                    />
                    <PackCheck
                      label="Emergency contact"
                      checked={sections.emergencyContact}
                      onChange={(checked) =>
                        setSections({ ...sections, emergencyContact: checked })
                      }
                    />
                    <PackCheck
                      label="Care notes"
                      detail="Private by default"
                      checked={sections.careNotes}
                      onChange={(checked) =>
                        setSections({ ...sections, careNotes: checked })
                      }
                    />
                  </div>
                ) : (
                  <div className="pack-missing">
                    <p>No health summary has been created yet.</p>
                    <Link href="/summary">Create a summary</Link>
                  </div>
                )}
              </section>

              <section className="pack-control-section">
                <div className="pack-control-title">
                  <ClipboardList size={18} />
                  <div>
                    <strong>Records</strong>
                    <span>
                      {selectedRecords.length} selected for this pack.
                    </span>
                  </div>
                </div>
                <label className="field pack-source">
                  Choose from
                  <select
                    value={source}
                    onChange={(event) => chooseSource(event.target.value)}
                  >
                    <option value="all">All records</option>
                    {collections.map((collection) => (
                      <option value={collection.id} key={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="pack-select-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((current) => [
                        ...new Set([
                          ...current,
                          ...sourceRecords.map((record) => record.id),
                        ]),
                      ])
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((current) =>
                        current.filter(
                          (id) =>
                            !sourceRecords.some((record) => record.id === id),
                        ),
                      )
                    }
                  >
                    Clear
                  </button>
                </div>
                <div className="pack-record-picker">
                  {sourceRecords.length ? (
                    sourceRecords.map((record) => (
                      <label key={record.id}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={(event) =>
                            toggleRecord(record.id, event.target.checked)
                          }
                        />
                        <span>
                          <strong>{record.title}</strong>
                          <small>
                            {record.type} · {formatDate(record.date)}
                          </small>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p>No records in this selection.</p>
                  )}
                </div>
              </section>
            </aside>

            <article
              className="visit-pack-preview"
              aria-label="Visit pack preview"
            >
              <header className="pack-document-header">
                <div className="pack-document-brand">
                  <span className="pack-cross" aria-hidden="true">
                    +
                  </span>
                  <div>
                    <strong>Health Dossier</strong>
                    <span>Visit pack</span>
                  </div>
                </div>
                <div className="pack-created">
                  <span>Prepared</span>
                  <strong>{generatedDate}</strong>
                </div>
              </header>
              <section className="pack-document-intro">
                <span className="pack-document-label">
                  PRIVATE HEALTH OVERVIEW
                </span>
                <h2>{summary?.fullName || "My visit pack"}</h2>
                {(visitFor || clinician) && (
                  <div className="pack-visit-context">
                    {visitFor && (
                      <p>
                        <span>Visit</span>
                        <strong>{visitFor}</strong>
                      </p>
                    )}
                    {clinician && (
                      <p>
                        <span>For</span>
                        <strong>{clinician}</strong>
                      </p>
                    )}
                  </div>
                )}
              </section>

              {summary && sections.personal && (
                <section className="pack-document-section pack-personal">
                  <PackSectionHeading
                    icon={<UserRound size={17} />}
                    title="Personal details"
                  />
                  <div className="pack-fact-grid">
                    <PackFact label="Full name" value={summary.fullName} />
                    <PackFact
                      label="Date of birth"
                      value={birthDate ? formatDate(birthDate) : ""}
                    />
                    <PackFact label="Blood type" value={summary.bloodType} />
                  </div>
                </section>
              )}
              {summary && sections.allergies && (
                <PackListSection
                  icon={<ShieldAlert size={17} />}
                  title="Allergies"
                  items={summary.allergies}
                  empty="No allergies recorded"
                  urgent
                />
              )}
              {summary && sections.conditions && (
                <PackListSection
                  icon={<HeartPulse size={17} />}
                  title="Ongoing conditions"
                  items={summary.conditions}
                  empty="No ongoing conditions recorded"
                />
              )}
              {summary && sections.medications && (
                <section className="pack-document-section">
                  <PackSectionHeading
                    icon={<Pill size={17} />}
                    title="Current medications"
                  />
                  <div className="pack-medication-list">
                    {summary.medications.length ? (
                      summary.medications.map((item) => (
                        <div key={item.id}>
                          <strong>{item.name}</strong>
                          <span>
                            {[item.dosage, item.schedule]
                              .filter(Boolean)
                              .join(" · ") || "Dose and schedule not recorded"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="pack-empty-value">
                        No current medications recorded
                      </p>
                    )}
                  </div>
                </section>
              )}
              {summary && sections.emergencyContact && (
                <section className="pack-document-section">
                  <PackSectionHeading
                    icon={<UserRound size={17} />}
                    title="Emergency contact"
                  />
                  <div className="pack-fact-grid">
                    <PackFact
                      label="Name"
                      value={summary.emergencyContact.name}
                    />
                    <PackFact
                      label="Relationship"
                      value={summary.emergencyContact.relationship}
                    />
                    <PackFact
                      label="Phone"
                      value={summary.emergencyContact.phone}
                    />
                  </div>
                </section>
              )}
              {summary && sections.careNotes && (
                <section className="pack-document-section">
                  <PackSectionHeading
                    icon={<FileText size={17} />}
                    title="Care notes"
                  />
                  <p className="pack-care-notes">
                    {summary.careNotes || "No care notes recorded"}
                  </p>
                </section>
              )}

              {includeDoctorNotes && doctorNotes.length > 0 && (
                <section className="pack-document-section pack-doctor-notes">
                  <PackSectionHeading
                    icon={<ClipboardCheck size={17} />}
                    title={`Accepted doctor notes (${doctorNotes.length})`}
                  />
                  <div className="pack-doctor-note-list">
                    {doctorNotes.map((note) => (
                      <article key={note.id}>
                        <header>
                          <div>
                            <strong>{note.title}</strong>
                            <span>
                              {note.doctorName} · {note.doctorSpecialty} · {formatDate(note.consultationDate)}
                            </span>
                          </div>
                          <em>Patient accepted</em>
                        </header>
                        <div>
                          <strong>Assessment</strong>
                          <p>{note.assessment}</p>
                        </div>
                        <div>
                          <strong>Recommendations</strong>
                          <p>{note.recommendations}</p>
                        </div>
                        {note.suggestedTests && (
                          <div>
                            <strong>Suggested tests</strong>
                            <p>{note.suggestedTests}</p>
                          </div>
                        )}
                        {note.followUpDate && (
                          <p className="pack-note-follow-up">
                            Suggested follow-up: {formatDate(note.followUpDate)}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="pack-document-section pack-record-index">
                <PackSectionHeading
                  icon={<CalendarDays size={17} />}
                  title={`Selected records (${selectedRecords.length})`}
                />
                {selectedRecords.length ? (
                  <div className="pack-document-records">
                    {selectedRecords.map((record) => (
                      <div key={record.id}>
                        <span>{formatDate(record.date)}</span>
                        <div>
                          <strong>{record.title}</strong>
                          <small>
                            {record.type}
                            {record.provider ? ` · ${record.provider}` : ""}
                          </small>
                        </div>
                        {record.important && <em>Important</em>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pack-empty-value">
                    No records selected for this pack
                  </p>
                )}
              </section>
              <footer className="pack-document-footer">
                <p>
                  <strong>Bring the originals.</strong> This overview helps a
                  clinician navigate your history, but original reports remain
                  the authoritative source.
                </p>
                <span>Created privately on this device · Health Dossier</span>
              </footer>
            </article>
          </div>
        )}
      </div>
    </main>
  );
}

function PackCheck({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      {checked && <Check size={15} />}
    </label>
  );
}

function PackSectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="pack-section-heading">
      {icon}
      <h3>{title}</h3>
    </div>
  );
}
function PackFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "Not recorded"}</strong>
    </div>
  );
}
function PackListSection({
  icon,
  title,
  items,
  empty,
  urgent = false,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty: string;
  urgent?: boolean;
}) {
  return (
    <section
      className={`pack-document-section ${urgent ? "pack-alert-section" : ""}`}
    >
      <PackSectionHeading icon={icon} title={title} />
      {items.length ? (
        <ul className="pack-inline-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="pack-empty-value">{empty}</p>
      )}
    </section>
  );
}
