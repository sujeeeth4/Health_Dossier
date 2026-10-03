"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  Download,
  Eye,
  FileText,
  History,
  LogOut,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import {
  doctorDetails,
  formatBytes,
  formatDate,
  getCurrentDoctor,
  listDoctorRecords,
  listDoctorContributions,
  listDoctorShares,
  logoutDoctor,
  saveShareEvent,
  submitDoctorContribution,
  type DoctorContribution,
  type DoctorProfile,
  type MedicalRecord,
  type RecordShare,
  type ShareEvent,
} from "@/lib/records";

type ContributionDraft = {
  title: string;
  consultationDate: string;
  assessment: string;
  recommendations: string;
  suggestedTests: string;
  followUpDate: string;
  linkedRecordId: string;
};

const emptyContribution = (): ContributionDraft => ({
  title: "",
  consultationDate: new Date().toISOString().slice(0, 10),
  assessment: "",
  recommendations: "",
  suggestedTests: "",
  followUpDate: "",
  linkedRecordId: "",
});

export function DoctorPortal() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [shares, setShares] = useState<RecordShare[]>([]);
  const [contributions, setContributions] = useState<DoctorContribution[]>([]);
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [contributingShare, setContributingShare] =
    useState<RecordShare | null>(null);
  const [contributionDraft, setContributionDraft] =
    useState<ContributionDraft>(emptyContribution);
  const [contributionError, setContributionError] = useState("");
  const [savingContribution, setSavingContribution] = useState(false);

  useEffect(() => {
    getCurrentDoctor()
      .then(async (storedDoctor) => {
        if (!storedDoctor) {
          router.replace("/doctor/login");
          return;
        }
        const [storedRecords, storedShares, storedContributions] =
          await Promise.all([
          listDoctorRecords(),
          listDoctorShares(),
          listDoctorContributions(),
        ]);
        setDoctor(storedDoctor);
        setRecords(storedRecords);
        setShares(
          storedShares
            .filter((share) => share.recipientId === storedDoctor.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setContributions(storedContributions);
      })
      .catch(() => setMessage("The doctor inbox could not be opened."))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selected.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selected]);

  const now = Date.now();
  const activeShares = shares.filter(
    (share) =>
      share.status === "active" &&
      (!share.expiresAt || new Date(share.expiresAt).getTime() > now),
  );
  const pastShares = shares.filter(
    (share) => !activeShares.some((active) => active.id === share.id),
  );
  const accessibleIds = new Set(
    activeShares.flatMap((share) => share.recordIds),
  );
  const accessibleRecords = (() => {
    const normalized = query.trim().toLowerCase();
    return records
      .filter((record) => accessibleIds.has(record.id))
      .filter((record) =>
        normalized
          ? [
              record.title,
              record.type,
              record.provider,
              record.specialty,
              ...(record.tags ?? []),
              ...(record.findings ?? []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(normalized)
          : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  })();

  function grantForRecord(recordId: string) {
    return activeShares.find((share) => share.recordIds.includes(recordId));
  }

  async function logAction(
    share: RecordShare,
    record: MedicalRecord,
    action: "viewed" | "downloaded",
  ) {
    if (!doctor) return;
    const event: ShareEvent = {
      id: crypto.randomUUID(),
      shareId: share.id,
      action,
      actor: doctor.name,
      detail: `${record.title} ${action === "viewed" ? "viewed" : "downloaded"}`,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveShareEvent(event);
    } catch {
      setMessage("Activity could not be added to the patient’s history.");
    }
  }

  async function openRecord(record: MedicalRecord) {
    const share = grantForRecord(record.id);
    if (!share) return;
    setSelected(record);
    await logAction(share, record, "viewed");
  }

  async function downloadRecord(record: MedicalRecord) {
    const share = grantForRecord(record.id);
    if (!share) return;
    const url = URL.createObjectURL(record.file);
    const link = document.createElement("a");
    link.href = url;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    await logAction(share, record, "downloaded");
  }

  function logout() {
    logoutDoctor().finally(() => router.replace("/doctor/login"));
  }

  function beginContribution(share: RecordShare) {
    setContributionDraft(emptyContribution());
    setContributionError("");
    setContributingShare(share);
  }

  async function submitContribution(event: React.FormEvent) {
    event.preventDefault();
    if (!contributingShare) return;
    if (
      !contributionDraft.title.trim() ||
      !contributionDraft.assessment.trim() ||
      !contributionDraft.recommendations.trim()
    ) {
      setContributionError(
        "Add a title, assessment, and recommendations before submitting.",
      );
      return;
    }
    if (
      contributionDraft.followUpDate &&
      contributionDraft.followUpDate < contributionDraft.consultationDate
    ) {
      setContributionError(
        "The follow-up date cannot be before the consultation date.",
      );
      return;
    }
    setSavingContribution(true);
    setContributionError("");
    try {
      const contribution = await submitDoctorContribution({
        shareId: contributingShare.id,
        title: contributionDraft.title,
        consultationDate: contributionDraft.consultationDate,
        assessment: contributionDraft.assessment,
        recommendations: contributionDraft.recommendations,
        suggestedTests: contributionDraft.suggestedTests,
        followUpDate: contributionDraft.followUpDate || undefined,
        linkedRecordId: contributionDraft.linkedRecordId || undefined,
      });
      setContributions((current) => [contribution, ...current]);
      setContributingShare(null);
      setMessage("Consultation note sent for patient review.");
    } catch (error) {
      setContributionError(
        error instanceof Error
          ? error.message
          : "The consultation note could not be submitted.",
      );
    } finally {
      setSavingContribution(false);
    }
  }

  if (loading || !doctor)
    return (
      <main className="doctor-portal-page doctor-loading">
        <Stethoscope size={28} />
        <p>Opening your access inbox…</p>
      </main>
    );

  return (
    <main className="doctor-portal-page">
      <header className="site-header wrap doctor-header">
        <Brand />
        <nav aria-label="Doctor navigation" className="doctor-nav">
          <Link className="active" href="/doctor">
            Access inbox
          </Link>
        </nav>
        <button className="header-back" onClick={logout}>
          <LogOut size={16} /> Log out
        </button>
      </header>
      <div className="doctor-portal-shell wrap">
        <section className="doctor-welcome">
          <div>
            <span className="section-kicker">DOCTOR ACCESS INBOX</span>
            <h1>Welcome, {doctor.name.replace(/^Dr\s+/i, "Dr ")}</h1>
            <p>Only active records your patients chose to share appear here.</p>
          </div>
          <div className="doctor-profile-chip">
            <span>
              <Stethoscope size={20} />
            </span>
            <div>
              <strong>{doctorDetails(doctor)}</strong>
              <small>{doctor.registration}</small>
            </div>
            <BadgeCheck size={17} />
          </div>
        </section>

        <div className="doctor-demo-banner">
          <ShieldCheck size={20} />
          <div>
            <strong>Browser-local demonstration</strong>
            <p>
              Authentication and verification are simulated. Patient files never
              leave this Mac’s local backend.
            </p>
          </div>
        </div>
        {message && (
          <p className="notice-error" role="status">
            {message}
          </p>
        )}

        <section className="doctor-metrics" aria-label="Access overview">
          <article>
            <UserRound size={21} />
            <strong>
              {
                new Set(
                  activeShares.map(
                    (share) => share.patientName ?? "Health Dossier patient",
                  ),
                ).size
              }
            </strong>
            <span>Active patients</span>
          </article>
          <article>
            <FileText size={21} />
            <strong>{accessibleIds.size}</strong>
            <span>Shared records</span>
          </article>
          <article>
            <History size={21} />
            <strong>{pastShares.length}</strong>
            <span>Past grants</span>
          </article>
        </section>

        <section className="doctor-access-section">
          <div className="doctor-section-heading">
            <div>
              <ShieldCheck size={21} />
              <h2>Active patient access</h2>
              <span>{activeShares.length}</span>
            </div>
            <p>Each grant remains controlled by the patient.</p>
          </div>
          {activeShares.length ? (
            <div className="doctor-grant-grid">
              {activeShares.map((share) => (
                <article key={share.id} className="doctor-grant-card">
                  <div className="doctor-grant-person">
                    <span>
                      <UserRound size={20} />
                    </span>
                    <div>
                      <strong>
                        {share.patientName ?? "Health Dossier patient"}
                      </strong>
                      <p>{share.scopeLabel}</p>
                    </div>
                    <em>Active</em>
                  </div>
                  <div className="doctor-grant-facts">
                    <span>
                      <Eye size={15} />
                      {share.permission === "view"
                        ? "View only"
                        : "View and contribute"}
                    </span>
                    <span>
                      <Clock3 size={15} /> {share.expiryLabel}
                    </span>
                    <span>
                      <FileText size={15} />
                      {
                        share.recordIds.filter((id) =>
                          records.some((record) => record.id === id),
                        ).length
                      }{" "}
                      records
                    </span>
                  </div>
                  {share.permission === "contribute" && (
                    <button
                      className="doctor-contribution-button"
                      onClick={() => beginContribution(share)}
                    >
                      <ClipboardPlus size={16} /> Add consultation note
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="doctor-inbox-empty">
              <ShieldCheck size={31} />
              <h3>No active patient access</h3>
              <p>
                A patient must select your verified profile and grant access.
              </p>
            </div>
          )}
        </section>

        {contributions.length > 0 && (
          <section className="doctor-access-section">
            <div className="doctor-section-heading">
              <div>
                <CheckCircle2 size={21} />
                <h2>Submitted notes</h2>
                <span>{contributions.length}</span>
              </div>
              <p>Submitted notes are immutable and remain patient-controlled.</p>
            </div>
            <div className="doctor-contribution-history">
              {contributions.map((contribution) => (
                <article key={contribution.id}>
                  <div>
                    <strong>{contribution.title}</strong>
                    <p>
                      {contribution.patientName} · {formatDate(contribution.consultationDate)}
                    </p>
                  </div>
                  <span className={`contribution-status ${contribution.status}`}>
                    {contribution.status === "pending"
                      ? "Awaiting review"
                      : contribution.status === "accepted"
                        ? "Accepted"
                        : "Rejected"}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="doctor-access-section">
          <div className="doctor-section-heading doctor-record-heading">
            <div>
              <FileText size={21} />
              <h2>Shared records</h2>
              <span>{accessibleRecords.length}</span>
            </div>
            <label className="doctor-record-search">
              <Search size={17} />
              <span className="sr-only">Search shared records</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search shared records"
              />
            </label>
          </div>
          {accessibleRecords.length ? (
            <div className="doctor-record-list">
              {accessibleRecords.map((record) => {
                const grant = grantForRecord(record.id)!;
                return (
                  <article key={record.id}>
                    <span className="doctor-record-icon">
                      <FileText size={20} />
                    </span>
                    <div>
                      <strong>{record.title}</strong>
                      <p>
                        {record.type} · {formatDate(record.date)}
                        {record.provider ? ` · ${record.provider}` : ""}
                      </p>
                      <small>
                        Shared by{" "}
                        {grant.patientName ?? "Health Dossier patient"}
                      </small>
                    </div>
                    <button onClick={() => openRecord(record)}>
                      <Eye size={16} /> Open
                    </button>
                    <button onClick={() => downloadRecord(record)}>
                      <Download size={16} /> Download
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="doctor-inbox-empty compact">
              <Search size={27} />
              <h3>
                {query ? "No matching shared records" : "No records available"}
              </h3>
            </div>
          )}
        </section>

        {pastShares.length > 0 && (
          <section className="doctor-access-section">
            <div className="doctor-section-heading">
              <div>
                <History size={21} />
                <h2>Access history</h2>
                <span>{pastShares.length}</span>
              </div>
              <p>Files from inactive grants are no longer available.</p>
            </div>
            <div className="doctor-past-list">
              {pastShares.map((share) => (
                <article key={share.id}>
                  <div>
                    <strong>
                      {share.patientName ?? "Health Dossier patient"}
                    </strong>
                    <p>{share.scopeLabel}</p>
                  </div>
                  <span>
                    {share.status === "revoked" ? "Revoked" : "Expired"}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {selected && (
        <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
          <div
            className="record-modal view-modal doctor-record-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-record-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">SHARED RECORD</span>
                <h2 id="doctor-record-title">{selected.title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                <X size={21} />
              </button>
            </div>
            <div className="record-details-grid">
              <div>
                <span>Type</span>
                <strong>{selected.type}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{formatDate(selected.date)}</strong>
              </div>
              <div>
                <span>Provider</span>
                <strong>{selected.provider || "Not added"}</strong>
              </div>
              <div>
                <span>File</span>
                <strong>
                  {selected.fileName} · {formatBytes(selected.fileSize)}
                </strong>
              </div>
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
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={16} /> Close
              </button>
              <button
                className="button button-primary"
                onClick={() => downloadRecord(selected)}
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {contributingShare && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !savingContribution && setContributingShare(null)}
        >
          <form
            className="record-modal contribution-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contribution-title"
            onSubmit={submitContribution}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">PATIENT-REVIEWED CONTRIBUTION</span>
                <h2 id="contribution-title">Add consultation note</h2>
                <p>
                  For {contributingShare.patientName ?? "Health Dossier patient"}.
                  The patient must accept this note before it enters their dossier.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                disabled={savingContribution}
                onClick={() => setContributingShare(null)}
              >
                <X size={21} />
              </button>
            </div>
            <div className="contribution-form-grid">
              <label className="field field-wide">
                Note title
                <input
                  required
                  maxLength={120}
                  value={contributionDraft.title}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      title: event.target.value,
                    })
                  }
                  placeholder="e.g. Cardiology follow-up"
                />
              </label>
              <label className="field">
                Consultation date
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={contributionDraft.consultationDate}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      consultationDate: event.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                Linked shared record (optional)
                <select
                  value={contributionDraft.linkedRecordId}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      linkedRecordId: event.target.value,
                    })
                  }
                >
                  <option value="">No linked record</option>
                  {records
                    .filter((record) =>
                      contributingShare.recordIds.includes(record.id),
                    )
                    .map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field field-wide">
                Assessment
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={contributionDraft.assessment}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      assessment: event.target.value,
                    })
                  }
                  placeholder="Clinical assessment and relevant findings"
                />
              </label>
              <label className="field field-wide">
                Recommendations
                <textarea
                  required
                  rows={4}
                  maxLength={3000}
                  value={contributionDraft.recommendations}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      recommendations: event.target.value,
                    })
                  }
                  placeholder="Recommended next steps"
                />
              </label>
              <label className="field field-wide">
                Suggested tests (optional)
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={contributionDraft.suggestedTests}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      suggestedTests: event.target.value,
                    })
                  }
                  placeholder="One or more suggested investigations"
                />
              </label>
              <label className="field">
                Follow-up date (optional)
                <input
                  type="date"
                  min={contributionDraft.consultationDate}
                  value={contributionDraft.followUpDate}
                  onChange={(event) =>
                    setContributionDraft({
                      ...contributionDraft,
                      followUpDate: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            {contributionError && (
              <p className="notice-error" role="alert">
                {contributionError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={savingContribution}
                onClick={() => setContributingShare(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingContribution}
              >
                <Send size={16} />
                {savingContribution ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
