"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Download,
  Eye,
  FileText,
  History,
  LogOut,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { clearDoctorSession, getDoctorSession } from "@/lib/doctor-session";
import {
  doctorDetails,
  formatBytes,
  formatDate,
  getDoctorProfile,
  listRecords,
  listShares,
  saveShareEvent,
  type DoctorProfile,
  type MedicalRecord,
  type RecordShare,
  type ShareEvent,
} from "@/lib/records";

export function DoctorPortal() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [shares, setShares] = useState<RecordShare[]>([]);
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const doctorId = getDoctorSession();
    if (!doctorId) {
      router.replace("/doctor/login");
      return;
    }
    Promise.all([getDoctorProfile(doctorId), listRecords(), listShares()])
      .then(([storedDoctor, storedRecords, storedShares]) => {
        if (!storedDoctor) {
          clearDoctorSession();
          router.replace("/doctor/login");
          return;
        }
        setDoctor(storedDoctor);
        setRecords(storedRecords);
        setShares(
          storedShares
            .filter((share) => share.recipientId === storedDoctor.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
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
    clearDoctorSession();
    router.replace("/doctor/login");
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
              leave this browser profile.
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
                    <small className="doctor-contribution-note">
                      Contribution tools are not included in this demo.
                    </small>
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
    </main>
  );
}
