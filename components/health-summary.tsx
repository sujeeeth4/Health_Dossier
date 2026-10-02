"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  FileText,
  HeartPulse,
  Pencil,
  Phone,
  Pill,
  Plus,
  Printer,
  Save,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import {
  getBirthDate,
  getHealthSummary,
  saveBirthDate,
  saveHealthSummary,
  type HealthSummary,
  type Medication,
} from "@/lib/records";

type SummaryDraft = Omit<
  HealthSummary,
  "allergies" | "conditions" | "updatedAt"
> & {
  birthDate: string;
  allergies: string;
  conditions: string;
};

const emptyDraft = (): SummaryDraft => ({
  fullName: "",
  birthDate: "",
  bloodType: "",
  allergies: "",
  conditions: "",
  medications: [],
  emergencyContact: { name: "", relationship: "", phone: "" },
  careNotes: "",
});

const splitItems = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const joinItems = (items: string[]) => items.join("\n");

/** Patient-maintained overview used by the summary screen and Visit Pack. */
export function HealthSummaryPage() {
  // `summary` is saved data; `draft` exists only while editing.
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [draft, setDraft] = useState<SummaryDraft>(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([getHealthSummary(), getBirthDate()])
      .then(([storedSummary, storedBirthDate]) => {
        if (storedSummary) setSummary(storedSummary);
        setBirthDate(storedBirthDate ?? "");
      })
      .catch(() => setMessage("Your health summary could not be opened."))
      .finally(() => setLoading(false));
  }, []);

  // An allocated but empty object is not presented as a completed summary.
  const hasSummary = useMemo(
    () =>
      Boolean(
        summary &&
          (summary.fullName ||
            summary.bloodType ||
            summary.allergies.length ||
            summary.conditions.length ||
            summary.medications.length ||
            summary.emergencyContact.name ||
            summary.emergencyContact.phone ||
            summary.careNotes),
      ),
    [summary],
  );

  function beginEdit() {
    setDraft(
      summary
        ? {
            fullName: summary.fullName,
            birthDate,
            bloodType: summary.bloodType,
            allergies: joinItems(summary.allergies),
            conditions: joinItems(summary.conditions),
            medications: summary.medications,
            emergencyContact: summary.emergencyContact,
            careNotes: summary.careNotes,
          }
        : { ...emptyDraft(), birthDate },
    );
    setMessage("");
    setEditing(true);
  }

  function addMedication() {
    setDraft((current) => ({
      ...current,
      medications: [
        ...current.medications,
        { id: crypto.randomUUID(), name: "", dosage: "", schedule: "" },
      ],
    }));
  }

  function updateMedication(
    id: string,
    field: keyof Omit<Medication, "id">,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      medications: current.medications.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      draft.birthDate &&
      draft.birthDate > new Date().toISOString().slice(0, 10)
    ) {
      setMessage("Date of birth cannot be in the future.");
      return;
    }
    setSaving(true);
    setMessage("");
    // Normalize free-form values before they cross the persistence boundary.
    const nextSummary: HealthSummary = {
      fullName: draft.fullName.trim(),
      bloodType: draft.bloodType,
      allergies: splitItems(draft.allergies),
      conditions: splitItems(draft.conditions),
      medications: draft.medications
        .map((item) => ({
          ...item,
          name: item.name.trim(),
          dosage: item.dosage.trim(),
          schedule: item.schedule.trim(),
        }))
        .filter((item) => item.name),
      emergencyContact: {
        name: draft.emergencyContact.name.trim(),
        relationship: draft.emergencyContact.relationship.trim(),
        phone: draft.emergencyContact.phone.trim(),
      },
      careNotes: draft.careNotes.trim(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await Promise.all([
        saveHealthSummary(nextSummary),
        saveBirthDate(draft.birthDate),
      ]);
      setSummary(nextSummary);
      setBirthDate(draft.birthDate);
      setEditing(false);
      setMessage("Health summary saved.");
    } catch {
      setMessage("Your health summary could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="summary-page">
      <header className="site-header wrap">
        <Brand />
        <DossierNav active="summary" />
        <div className="header-actions">
          <Link className="header-back" href="/">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>

      <div className="summary-shell wrap">
        <div className="summary-heading">
          <div>
            <span className="section-kicker">MY HEALTH DOSSIER</span>
            <h1>Health summary</h1>
            <p>The details you want close at hand.</p>
          </div>
          {hasSummary && !editing && (
            <div className="summary-heading-actions">
              <Link className="button button-outline" href="/visit-pack">
                <Printer size={17} /> Prepare visit pack
              </Link>
              <button className="button button-primary" onClick={beginEdit}>
                <Pencil size={17} /> Edit summary
              </button>
            </div>
          )}
        </div>

        {message && (
          <p
            className={
              message.includes("saved") ? "save-message" : "notice-error"
            }
            role="status"
          >
            {message}
          </p>
        )}

        {loading ? (
          <section className="summary-empty">
            <p>Opening your summary…</p>
          </section>
        ) : editing ? (
          <form className="summary-form" onSubmit={save}>
            <div className="summary-form-header">
              <div>
                <span className="section-kicker">YOUR DETAILS</span>
                <h2>
                  {hasSummary ? "Update your summary" : "Create your summary"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setEditing(false)}
              >
                <X size={21} />
              </button>
            </div>
            <div className="summary-form-body">
              <section className="form-section">
                <div className="form-section-title">
                  <UserRound size={19} />
                  <div>
                    <h3>Personal details</h3>
                    <p>The basics someone may need first.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field field-wide">
                    Full name
                    <input
                      value={draft.fullName}
                      onChange={(event) =>
                        setDraft({ ...draft, fullName: event.target.value })
                      }
                      placeholder="Your name"
                      maxLength={120}
                    />
                  </label>
                  <label className="field">
                    Date of birth
                    <input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={draft.birthDate}
                      onChange={(event) =>
                        setDraft({ ...draft, birthDate: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    Blood type
                    <select
                      value={draft.bloodType}
                      onChange={(event) =>
                        setDraft({ ...draft, bloodType: event.target.value })
                      }
                    >
                      <option value="">Not added</option>
                      {[
                        "A+",
                        "A−",
                        "B+",
                        "B−",
                        "AB+",
                        "AB−",
                        "O+",
                        "O−",
                        "Unknown",
                      ].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              <section className="form-section">
                <div className="form-section-title">
                  <ShieldAlert size={19} />
                  <div>
                    <h3>Allergies and conditions</h3>
                    <p>Add one item per line.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    Allergies
                    <textarea
                      rows={4}
                      value={draft.allergies}
                      onChange={(event) =>
                        setDraft({ ...draft, allergies: event.target.value })
                      }
                      placeholder={"Penicillin\nPeanuts"}
                    />
                  </label>
                  <label className="field">
                    Ongoing conditions
                    <textarea
                      rows={4}
                      value={draft.conditions}
                      onChange={(event) =>
                        setDraft({ ...draft, conditions: event.target.value })
                      }
                      placeholder={"Asthma\nHigh blood pressure"}
                    />
                  </label>
                </div>
              </section>
              <section className="form-section">
                <div className="form-section-title medications-title">
                  <Pill size={19} />
                  <div>
                    <h3>Current medications</h3>
                    <p>Name, dose, and when you take it.</p>
                  </div>
                  <button
                    type="button"
                    className="small-add"
                    onClick={addMedication}
                  >
                    <Plus size={15} /> Add medication
                  </button>
                </div>
                {draft.medications.length === 0 ? (
                  <button
                    type="button"
                    className="add-medication-empty"
                    onClick={addMedication}
                  >
                    <Plus size={18} /> Add your first medication
                  </button>
                ) : (
                  <div className="medication-editor-list">
                    {draft.medications.map((item) => (
                      <div className="medication-editor" key={item.id}>
                        <label className="field">
                          Medication
                          <input
                            value={item.name}
                            onChange={(event) =>
                              updateMedication(
                                item.id,
                                "name",
                                event.target.value,
                              )
                            }
                            placeholder="Medication name"
                          />
                        </label>
                        <label className="field">
                          Dose
                          <input
                            value={item.dosage}
                            onChange={(event) =>
                              updateMedication(
                                item.id,
                                "dosage",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. 10 mg"
                          />
                        </label>
                        <label className="field">
                          Schedule
                          <input
                            value={item.schedule}
                            onChange={(event) =>
                              updateMedication(
                                item.id,
                                "schedule",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. Every morning"
                          />
                        </label>
                        <button
                          type="button"
                          className="icon-button medication-remove"
                          aria-label={`Remove ${item.name || "medication"}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              medications: draft.medications.filter(
                                (medication) => medication.id !== item.id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className="form-section">
                <div className="form-section-title">
                  <Phone size={19} />
                  <div>
                    <h3>Emergency contact</h3>
                    <p>A person to call when needed.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field field-wide">
                    Name
                    <input
                      value={draft.emergencyContact.name}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          emergencyContact: {
                            ...draft.emergencyContact,
                            name: event.target.value,
                          },
                        })
                      }
                      placeholder="Contact name"
                    />
                  </label>
                  <label className="field">
                    Relationship
                    <input
                      value={draft.emergencyContact.relationship}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          emergencyContact: {
                            ...draft.emergencyContact,
                            relationship: event.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Partner"
                    />
                  </label>
                  <label className="field">
                    Phone number
                    <input
                      type="tel"
                      value={draft.emergencyContact.phone}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          emergencyContact: {
                            ...draft.emergencyContact,
                            phone: event.target.value,
                          },
                        })
                      }
                      placeholder="Phone number"
                    />
                  </label>
                </div>
              </section>
              <section className="form-section">
                <div className="form-section-title">
                  <FileText size={19} />
                  <div>
                    <h3>Care notes</h3>
                    <p>Anything useful that does not fit above.</p>
                  </div>
                </div>
                <label className="field">
                  <span className="sr-only">Care notes</span>
                  <textarea
                    rows={4}
                    value={draft.careNotes}
                    onChange={(event) =>
                      setDraft({ ...draft, careNotes: event.target.value })
                    }
                    placeholder="Add a note about your care, preferences, or anything important to remember."
                    maxLength={1500}
                  />
                </label>
              </section>
              <div className="summary-form-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button className="button button-primary" disabled={saving}>
                  <Save size={17} />
                  {saving ? "Saving…" : "Save summary"}
                </button>
              </div>
            </div>
          </form>
        ) : !hasSummary ? (
          <section className="summary-empty">
            <span className="summary-empty-icon">
              <HeartPulse size={35} />
            </span>
            <span className="section-kicker">A QUICK OVERVIEW</span>
            <h2>Keep the essentials together.</h2>
            <p>
              Add your current medications, allergies, conditions, and emergency
              contact so the details you use most are easy to find.
            </p>
            <button className="button button-primary" onClick={beginEdit}>
              <Plus size={18} /> Create my health summary
            </button>
          </section>
        ) : (
          summary && (
            <div className="summary-grid">
              <section className="summary-profile-card">
                <span className="profile-mark">
                  <UserRound size={27} />
                </span>
                <div>
                  <span className="summary-label">PERSONAL DETAILS</span>
                  <h2>{summary.fullName || "Your health summary"}</h2>
                  <div className="profile-facts">
                    <span>
                      <CalendarDays size={15} />
                      {birthDate
                        ? new Date(`${birthDate}T12:00:00`).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "long", year: "numeric" },
                          )
                        : "Date of birth not added"}
                    </span>
                    <span>
                      <Activity size={15} />
                      {summary.bloodType
                        ? `Blood type ${summary.bloodType}`
                        : "Blood type not added"}
                    </span>
                  </div>
                </div>
              </section>
              <SummaryListCard
                icon={<ShieldAlert size={20} />}
                title="Allergies"
                items={summary.allergies}
              />
              <SummaryListCard
                icon={<HeartPulse size={20} />}
                title="Ongoing conditions"
                items={summary.conditions}
              />
              <section className="summary-card summary-medications">
                <div className="summary-card-title">
                  <Pill size={20} />
                  <h3>Current medications</h3>
                  <span>{summary.medications.length}</span>
                </div>
                {summary.medications.length ? (
                  <div className="medication-list">
                    {summary.medications.map((item) => (
                      <article key={item.id}>
                        <strong>{item.name}</strong>
                        <p>
                          {[item.dosage, item.schedule]
                            .filter(Boolean)
                            .join(" · ") || "No dose or schedule added"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="summary-placeholder">No medications added.</p>
                )}
              </section>
              <section className="summary-card">
                <div className="summary-card-title">
                  <Phone size={20} />
                  <h3>Emergency contact</h3>
                </div>
                {summary.emergencyContact.name ||
                summary.emergencyContact.phone ? (
                  <div className="emergency-details">
                    <strong>
                      {summary.emergencyContact.name || "Unnamed contact"}
                    </strong>
                    {summary.emergencyContact.relationship && (
                      <span>{summary.emergencyContact.relationship}</span>
                    )}
                    {summary.emergencyContact.phone && (
                      <a href={`tel:${summary.emergencyContact.phone}`}>
                        {summary.emergencyContact.phone}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="summary-placeholder">
                    No emergency contact added.
                  </p>
                )}
              </section>
              <section className="summary-card summary-notes">
                <div className="summary-card-title">
                  <FileText size={20} />
                  <h3>Care notes</h3>
                </div>
                <p
                  className={
                    summary.careNotes ? "care-notes" : "summary-placeholder"
                  }
                >
                  {summary.careNotes || "No care notes added."}
                </p>
              </section>
            </div>
          )
        )}
      </div>
    </main>
  );
}

function SummaryListCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <section className="summary-card">
      <div className="summary-card-title">
        {icon}
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length ? (
        <ul className="summary-tags">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="summary-placeholder">Nothing added yet.</p>
      )}
    </section>
  );
}
