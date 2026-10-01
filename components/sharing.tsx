"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Download, Eye, FileKey, History, LockKeyhole, Plus, QrCode, ShieldCheck, ShieldX, Stethoscope, UserCheck, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import { formatDate, listCollections, listRecords, listShareEvents, listShares, revokeShare, saveShareEvent, saveShareWithEvent, type CareCollection, type MedicalRecord, type RecordShare, type ShareEvent, type SharePermission } from "@/lib/records";

const demoDoctors = [
  { id: "ananya-mehta", name: "Dr Ananya Mehta", details: "Cardiologist · City Care Hospital", registration: "TSMC 48291" },
  { id: "rohan-iyer", name: "Dr Rohan Iyer", details: "General physician · Lotus Clinic", registration: "TSMC 57104" },
  { id: "sana-khan", name: "Dr Sana Khan", details: "Pulmonologist · Deccan Medical Centre", registration: "TSMC 63918" },
];

type ExpiryChoice = "consultation" | "24-hours" | "7-days" | "manual";

export function SharingPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [collections, setCollections] = useState<CareCollection[]>([]);
  const [shares, setShares] = useState<RecordShare[]>([]);
  const [events, setEvents] = useState<ShareEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [recipientId, setRecipientId] = useState(demoDoctors[0].id);
  const [source, setSource] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [permission, setPermission] = useState<SharePermission>("view");
  const [expiry, setExpiry] = useState<ExpiryChoice>("24-hours");
  const [reviewSensitive, setReviewSensitive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([listRecords(), listCollections(), listShares(), listShareEvents()])
      .then(([storedRecords, storedCollections, storedShares, storedEvents]) => {
        const sortedRecords = [...storedRecords].sort((a, b) => b.date.localeCompare(a.date));
        const requestedCollection = new URLSearchParams(window.location.search).get("collection");
        const requestedCollectionExists = storedCollections.some(collection => collection.id === requestedCollection);
        setRecords(sortedRecords);
        setCollections([...storedCollections].sort((a, b) => a.name.localeCompare(b.name)));
        setShares([...storedShares].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setEvents([...storedEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        if (requestedCollectionExists && requestedCollection) {
          setSource(requestedCollection);
          setSelectedIds(sortedRecords.filter(record => record.collectionIds?.includes(requestedCollection) && !record.sensitive).map(record => record.id));
          setCreating(true);
        }
      })
      .catch(() => setMessage("Sharing information could not be opened in this browser."))
      .finally(() => setLoading(false));
  }, []);

  const sourceRecords = useMemo(() => source === "all" ? records : records.filter(record => record.collectionIds?.includes(source)), [records, source]);
  const sensitiveRecords = sourceRecords.filter(record => record.sensitive);
  const selectedRecords = records.filter(record => selectedIds.includes(record.id));
  const now = Date.now();
  const activeShares = shares.filter(share => share.status === "active" && (!share.expiresAt || new Date(share.expiresAt).getTime() > now));
  const pastShares = shares.filter(share => !activeShares.some(active => active.id === share.id));

  function beginShare() {
    setRecipientId(demoDoctors[0].id);
    setSource("all");
    setSelectedIds(records.filter(record => !record.sensitive).map(record => record.id));
    setPermission("view");
    setExpiry("24-hours");
    setReviewSensitive(false);
    setMessage("");
    setCreating(true);
  }

  function chooseSource(value: string) {
    setSource(value);
    setReviewSensitive(false);
    const available = value === "all" ? records : records.filter(record => record.collectionIds?.includes(value));
    setSelectedIds(available.filter(record => !record.sensitive).map(record => record.id));
  }

  function expiryDetails(choice: ExpiryChoice) {
    const base = Date.now();
    if (choice === "consultation") return { label: "One consultation", expiresAt: new Date(base + 12 * 60 * 60 * 1000).toISOString() };
    if (choice === "24-hours") return { label: "24 hours", expiresAt: new Date(base + 24 * 60 * 60 * 1000).toISOString() };
    if (choice === "7-days") return { label: "7 days", expiresAt: new Date(base + 7 * 24 * 60 * 60 * 1000).toISOString() };
    return { label: "Until manually revoked", expiresAt: null };
  }

  async function createShare() {
    if (!selectedIds.length) { setMessage("Select at least one record to share."); return; }
    const recipient = demoDoctors.find(doctor => doctor.id === recipientId)!;
    const expiryInfo = expiryDetails(expiry);
    const createdAt = new Date().toISOString();
    const share: RecordShare = {
      id: crypto.randomUUID(), recipientId: recipient.id, recipientName: recipient.name,
      recipientDetails: recipient.details, recordIds: selectedIds,
      scopeLabel: source === "all" ? `${selectedIds.length} selected records` : collections.find(collection => collection.id === source)?.name ?? `${selectedIds.length} selected records`,
      permission, expiryLabel: expiryInfo.label, expiresAt: expiryInfo.expiresAt,
      accessCode: `HD-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      status: "active", createdAt,
    };
    const event: ShareEvent = { id: crypto.randomUUID(), shareId: share.id, action: "granted", actor: "You", detail: `Access granted to ${recipient.name} · ${permission === "view" ? "View only" : "View and contribute"}`, createdAt };
    setSaving(true); setMessage("");
    try {
      await saveShareWithEvent(share, event);
      setShares(current => [share, ...current]);
      setEvents(current => [event, ...current]);
      setCreating(false);
      setMessage(`Access granted to ${recipient.name}.`);
    } catch { setMessage("Access could not be saved. Please try again."); }
    finally { setSaving(false); }
  }

  async function revoke(grant: RecordShare) {
    if (!window.confirm(`Revoke ${grant.recipientName}’s access now?`)) return;
    const createdAt = new Date().toISOString();
    const event: ShareEvent = { id: crypto.randomUUID(), shareId: grant.id, action: "revoked", actor: "You", detail: `Access revoked for ${grant.recipientName}`, createdAt };
    try {
      await revokeShare(grant, event);
      setShares(current => current.map(item => item.id === grant.id ? { ...item, status: "revoked", revokedAt: createdAt } : item));
      setEvents(current => [event, ...current]);
      setMessage(`Access revoked for ${grant.recipientName}.`);
    } catch { setMessage("Access could not be revoked. Please try again."); }
  }

  async function simulate(grant: RecordShare, action: "viewed" | "downloaded") {
    const createdAt = new Date().toISOString();
    const event: ShareEvent = { id: crypto.randomUUID(), shareId: grant.id, action, actor: grant.recipientName, detail: action === "viewed" ? `${grant.scopeLabel} viewed` : "A shared record was downloaded", createdAt };
    try { await saveShareEvent(event); setEvents(current => [event, ...current]); setMessage(`Demo ${action === "viewed" ? "view" : "download"} added to the activity log.`); }
    catch { setMessage("The demo activity could not be recorded."); }
  }

  return <main className="sharing-page">
    <header className="site-header wrap"><Brand/><DossierNav active="sharing"/><div className="header-actions"><Link className="header-back" href="/"><ArrowLeft size={16}/> Home</Link></div></header>
    <div className="sharing-shell wrap">
      <div className="sharing-heading"><div><span className="section-kicker">PATIENT-CONTROLLED ACCESS</span><h1>Sharing & access</h1><p>Decide who can see your records, what they can do, and when access ends.</p></div><button className="button button-primary" onClick={beginShare} disabled={loading || records.length === 0}><Plus size={18}/> Share records</button></div>
      <div className="sharing-demo-note"><LockKeyhole size={19}/><div><strong>Safe demo — no link leaves this device</strong><p>Recipients, QR codes, access, and activity are simulated locally. This is not a production sharing service.</p></div></div>
      {message && <p className={message.includes("granted") || message.includes("revoked") || message.includes("added") ? "save-message" : "notice-error"} role="status">{message}</p>}

      {loading ? <section className="sharing-empty"><p>Opening sharing history…</p></section> : <>
        <section className="access-section"><div className="access-section-heading"><div><ShieldCheck size={21}/><h2>Active access</h2><span>{activeShares.length}</span></div><p>Access you can revoke immediately.</p></div>
          {activeShares.length ? <div className="access-grid">{activeShares.map(share => <ShareCard key={share.id} share={share} records={records} onRevoke={() => revoke(share)} onSimulate={action => simulate(share, action)}/>)}</div> : <div className="sharing-empty"><span><FileKey size={31}/></span><h3>No active access</h3><p>Your records remain private until you choose a recipient and grant access.</p><button className="button button-outline" onClick={beginShare} disabled={!records.length}>Share selected records</button></div>}
        </section>

        <div className="sharing-history-grid">
          <section className="access-section"><div className="access-section-heading"><div><History size={21}/><h2>Activity log</h2><span>{events.length}</span></div><p>A browser-local record of this demo’s sharing activity.</p></div>{events.length ? <div className="activity-list">{events.map(event => <article key={event.id}><span className={`activity-icon ${event.action}`}><EventIcon action={event.action}/></span><div><strong>{event.detail}</strong><p>{event.actor} · {formatDateTime(event.createdAt)}</p></div></article>)}</div> : <div className="history-empty">Sharing activity will appear here.</div>}</section>
          <section className="access-section"><div className="access-section-heading"><div><ShieldX size={21}/><h2>Past access</h2><span>{pastShares.length}</span></div><p>Expired and revoked grants.</p></div>{pastShares.length ? <div className="past-access-list">{pastShares.map(share => <article key={share.id}><div><strong>{share.recipientName}</strong><p>{share.scopeLabel}</p></div><span>{share.status === "revoked" ? "Revoked" : "Expired"}</span></article>)}</div> : <div className="history-empty">No past access yet.</div>}</section>
        </div>
      </>}
    </div>

    {creating && <div className="modal-backdrop" onMouseDown={() => !saving && setCreating(false)}><div className="record-modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">NEW ACCESS GRANT</span><h2 id="share-title">Share with a doctor</h2></div><button className="icon-button" aria-label="Close" onClick={() => setCreating(false)}><X size={21}/></button></div><div className="share-steps">
      <section className="share-step"><div className="share-step-number">1</div><div className="share-step-body"><h3>Choose a verified demo doctor</h3><div className="doctor-options">{demoDoctors.map(doctor => <label className={recipientId === doctor.id ? "selected" : ""} key={doctor.id}><input type="radio" name="recipient" value={doctor.id} checked={recipientId === doctor.id} onChange={() => setRecipientId(doctor.id)}/><span className="doctor-mark"><Stethoscope size={18}/></span><span><strong>{doctor.name} <UserCheck size={14}/></strong><small>{doctor.details}</small><em>{doctor.registration} · Demo verified</em></span></label>)}</div></div></section>
      <section className="share-step"><div className="share-step-number">2</div><div className="share-step-body"><h3>Choose records</h3><label className="field share-source">Share from<select value={source} onChange={event => chooseSource(event.target.value)}><option value="all">All records</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><div className="share-record-list">{sourceRecords.map(record => <label className={record.sensitive ? "sensitive" : ""} key={record.id}><input type="checkbox" checked={selectedIds.includes(record.id)} disabled={Boolean(record.sensitive && !reviewSensitive)} onChange={event => setSelectedIds(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))}/><span><strong>{record.title}{record.sensitive && <em>Sensitive</em>}</strong><small>{record.type} · {formatDate(record.date)}</small></span></label>)}</div>{sensitiveRecords.length > 0 && <label className="sensitive-review"><input type="checkbox" checked={reviewSensitive} onChange={event => { setReviewSensitive(event.target.checked); if (!event.target.checked) setSelectedIds(current => current.filter(id => !sensitiveRecords.some(record => record.id === id))); }}/><span><strong>Review sensitive records</strong><small>{sensitiveRecords.length} sensitive {sensitiveRecords.length === 1 ? "record is" : "records are"} excluded unless you deliberately select them.</small></span></label>}<p className="share-selection-count">{selectedIds.length} records selected{selectedRecords.some(record => record.sensitive) ? ` · ${selectedRecords.filter(record => record.sensitive).length} sensitive` : ""}</p></div></section>
      <section className="share-step"><div className="share-step-number">3</div><div className="share-step-body"><h3>Set permission and expiry</h3><div className="permission-grid"><label className={permission === "view" ? "selected" : ""}><input type="radio" name="permission" checked={permission === "view"} onChange={() => setPermission("view")}/><Eye size={18}/><span><strong>View only</strong><small>Can view and download selected records.</small></span></label><label className={permission === "contribute" ? "selected" : ""}><input type="radio" name="permission" checked={permission === "contribute"} onChange={() => setPermission("contribute")}/><FileKey size={18}/><span><strong>View and contribute</strong><small>Can also add permitted clinical information.</small></span></label></div><label className="field share-expiry">Access expires<select value={expiry} onChange={event => setExpiry(event.target.value as ExpiryChoice)}><option value="consultation">After one consultation</option><option value="24-hours">After 24 hours</option><option value="7-days">After 7 days</option><option value="manual">When I revoke it</option></select></label></div></section>
    </div>{message && <p className="notice-error share-error" role="alert">{message}</p>}<div className="share-confirm"><div><QrCode size={28}/><p><strong>A simulated access code will be created.</strong><span>No public URL or real QR code is generated.</span></p></div><button className="button button-outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</button><button className="button button-primary" onClick={createShare} disabled={saving}>{saving ? "Granting…" : "Grant access"}</button></div></div></div>}
  </main>;
}

function ShareCard({ share, records, onRevoke, onSimulate }: { share: RecordShare; records: MedicalRecord[]; onRevoke: () => void; onSimulate: (action: "viewed" | "downloaded") => void }) {
  const count = records.filter(record => share.recordIds.includes(record.id)).length;
  return <article className="access-card"><div className="access-card-top"><span className="doctor-avatar"><Stethoscope size={20}/></span><div><strong>{share.recipientName}</strong><p>{share.recipientDetails}</p></div><span className="active-pill">Active</span></div><div className="access-card-facts"><span><FileKey size={15}/><strong>{share.scopeLabel}</strong><small>{count} {count === 1 ? "record" : "records"}</small></span><span><Eye size={15}/><strong>{share.permission === "view" ? "View only" : "View and contribute"}</strong><small>Permission</small></span><span><Clock3 size={15}/><strong>{share.expiryLabel}</strong><small>Expiry</small></span></div><div className="access-code"><QrCode size={22}/><span><small>Simulated access code</small><strong>{share.accessCode}</strong></span></div><div className="access-card-actions"><button onClick={() => onSimulate("viewed")}><Eye size={15}/> Simulate view</button><button onClick={() => onSimulate("downloaded")}><Download size={15}/> Simulate download</button><button className="revoke-button" onClick={onRevoke}><ShieldX size={15}/> Revoke access</button></div></article>;
}

function EventIcon({ action }: { action: ShareEvent["action"] }) {
  if (action === "granted") return <Check size={15}/>;
  if (action === "viewed") return <Eye size={15}/>;
  if (action === "downloaded") return <Download size={15}/>;
  return <ShieldX size={15}/>;
}

function formatDateTime(value: string) { return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }); }
