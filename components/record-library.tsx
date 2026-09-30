"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDownToLine, ArrowLeft, CalendarDays, FileImage, FilePlus2, FileText, FolderOpen, LayoutList, LockKeyhole, Pencil, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import { deleteRecord, formatBytes, formatDate, getBirthDate, listCollections, listRecords, recordTypes, saveBirthDate, saveRecord, type CareCollection, type MedicalRecord, type RecordType } from "@/lib/records";

type Draft = { title: string; type: RecordType; date: string; provider: string; notes: string; important: boolean; collectionIds: string[] };
const emptyDraft = (): Draft => ({ title: "", type: "Laboratory", date: new Date().toISOString().slice(0, 10), provider: "", notes: "", important: false, collectionIds: [] });
const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
function ageAt(date: string, birthDate: string) {
  if (!birthDate || date < birthDate) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  return year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
}

export function RecordLibrary() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [collections, setCollections] = useState<CareCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All records");
  const [view, setView] = useState<"library" | "timeline">("library");
  const [birthDate, setBirthDate] = useState("");
  const [birthDateError, setBirthDateError] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { listRecords().then(setRecords).catch(() => setStorageError("This browser could not open local record storage. Check your browser settings and try again.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { listCollections().then(items => setCollections(items.sort((a, b) => a.name.localeCompare(b.name)))).catch(() => setStorageError("Collections could not be opened.")); }, []);
  useEffect(() => { getBirthDate().then(date => setBirthDate(date ?? "")).catch(() => setBirthDateError("Could not load your date of birth.")); }, []);
  useEffect(() => {
    if (!selected || dialog !== "view") return;
    const url = URL.createObjectURL(selected.file);
    setPreviewUrl(url);
    return () => { URL.revokeObjectURL(url); setPreviewUrl(null); };
  }, [selected, dialog]);

  const filtered = useMemo(() => records.filter(record => {
    const matchType = filter === "All records" || record.type === filter;
    const words = `${record.title} ${record.type} ${record.provider} ${record.notes} ${record.fileName}`.toLowerCase();
    return matchType && words.includes(query.trim().toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [records, filter, query]);
  const timelineYears = useMemo(() => {
    const groups = new Map<string, MedicalRecord[]>();
    for (const record of filtered) {
      const year = record.date.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), record]);
    }
    return [...groups];
  }, [filtered]);

  function beginAdd() { setSelected(null); setDraft(emptyDraft()); setFile(null); setFormError(""); setDialog("add"); }
  function beginEdit(record: MedicalRecord) { setSelected(record); setDraft({ title: record.title, type: record.type, date: record.date, provider: record.provider, notes: record.notes, important: Boolean(record.important), collectionIds: record.collectionIds ?? [] }); setFile(null); setFormError(""); setDialog("edit"); }
  function closeDialog() { if (!saving) { setDialog(null); setSelected(null); setFile(null); setFormError(""); } }
  function chooseFile(chosen?: File) {
    if (!chosen) return;
    if (!acceptedTypes.includes(chosen.type)) { setFormError("Choose a PDF, JPG, PNG, or WebP file."); return; }
    if (chosen.size > 25 * 1024 * 1024) { setFormError("Choose a file smaller than 25 MB."); return; }
    setFile(chosen); setFormError("");
    if (!draft.title) setDraft(current => ({ ...current, title: chosen.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") }));
  }
  async function save() {
    if (!draft.title.trim()) { setFormError("Enter a record title."); return; }
    if (!draft.date) { setFormError("Choose a record date."); return; }
    if (draft.date > new Date().toISOString().slice(0, 10)) { setFormError("The record date cannot be in the future."); return; }
    if (dialog === "add" && !file) { setFormError("Choose a file to add."); return; }
    setSaving(true); setFormError("");
    try {
      const record: MedicalRecord = { id: selected?.id ?? crypto.randomUUID(), title: draft.title.trim(), type: draft.type, date: draft.date, provider: draft.provider.trim(), notes: draft.notes.trim(), important: draft.important, collectionIds: draft.collectionIds, fileName: selected?.fileName ?? file!.name, fileType: selected?.fileType ?? file!.type, fileSize: selected?.fileSize ?? file!.size, file: selected?.file ?? file!, createdAt: selected?.createdAt ?? new Date().toISOString() };
      await saveRecord(record);
      setRecords(current => [record, ...current.filter(item => item.id !== record.id)]);
      setDialog(null); setSelected(null); setFile(null);
    } catch { setFormError("Could not save this record. Check available browser storage and try again."); }
    finally { setSaving(false); }
  }
  async function remove(record: MedicalRecord) {
    if (!window.confirm(`Remove “${record.title}” and its file from this browser?`)) return;
    try { await deleteRecord(record.id); setRecords(current => current.filter(item => item.id !== record.id)); setDialog(null); setSelected(null); }
    catch { setStorageError("Could not remove the record. Please try again."); }
  }
  function download(record: MedicalRecord) {
    const url = URL.createObjectURL(record.file);
    const link = document.createElement("a"); link.href = url; link.download = record.fileName; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  async function updateBirthDate() {
    if (birthDate && (birthDate > new Date().toISOString().slice(0, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))) {
      setBirthDateError("Enter a valid date of birth in the past.");
      return;
    }
    try { await saveBirthDate(birthDate); setBirthDateError(""); }
    catch { setBirthDateError("Could not save your date of birth."); }
  }
  function openRecord(record: MedicalRecord) { setSelected(record); setDialog("view"); }

  return <main className="library-page">
    <header className="site-header wrap"><Brand/><DossierNav active="records"/><div className="header-actions"><Link className="header-back" href="/"><ArrowLeft size={16}/> Home</Link></div></header>
    <div className="library-shell wrap">
      <div className="library-heading"><div><span className="section-kicker">MY HEALTH DOSSIER</span><h1>Record library</h1><p>A place for the documents that tell your health story.</p></div><button className="button button-primary" onClick={beginAdd}><Plus size={18}/> Add a record</button></div>
      <div className="privacy-note"><span className="privacy-icon"><LockKeyhole size={20}/></span><div><strong>Stored in this browser on this device</strong><p>Files are not uploaded to Health Dossier. Anyone using this browser profile may access them, and clearing site data removes them. Keep a separate backup of important records.</p></div></div>
      {storageError && <p className="notice-error" role="alert">{storageError}</p>}
      <section className="library-panel" aria-label="Medical records"><div className="library-toolbar"><div><h2>Your documents</h2><p>{loading ? "Loading records…" : `${records.length} ${records.length === 1 ? "record" : "records"} saved`}</p></div><div className="toolbar-controls"><label className="search-box"><Search size={18}/><span className="sr-only">Search records</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search records"/></label><label className="filter-box"><span className="sr-only">Filter by type</span><select value={filter} onChange={event => setFilter(event.target.value)}><option>All records</option>{recordTypes.map(type => <option key={type}>{type}</option>)}</select></label></div></div>
        <div className="library-view-bar"><div className="view-switch" aria-label="Record view"><button className={view === "library" ? "active" : ""} aria-pressed={view === "library"} onClick={() => setView("library")}><LayoutList size={16}/> Library</button><button className={view === "timeline" ? "active" : ""} aria-pressed={view === "timeline"} onClick={() => setView("timeline")}><CalendarDays size={16}/> Timeline</button></div>{view === "timeline" && <div className="birth-date-control"><label htmlFor="birth-date">Date of birth <span>for age labels</span></label><input id="birth-date" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={event => setBirthDate(event.target.value)} onBlur={updateBirthDate}/></div>}</div>
        {birthDateError && view === "timeline" && <p className="notice-error" role="alert">{birthDateError}</p>}
        {loading ? <div className="empty-state"><p>Loading your library…</p></div> : filtered.length === 0 ? <div className="empty-state"><span className="empty-icon">{records.length ? <Search size={32}/> : <FolderOpen size={34}/>}</span><h3>{records.length ? "No matching records" : "Your library starts here"}</h3><p>{records.length ? "Try another search or type filter." : "Add a report, prescription, scan, or other medical document to keep it easy to find."}</p>{records.length === 0 && <button className="button button-primary" onClick={beginAdd}><FilePlus2 size={18}/> Add your first record</button>}</div> : view === "timeline" ? <div className="timeline">{timelineYears.map(([year, yearRecords]) => <section className="timeline-year" key={year} aria-label={`Records from ${year}`}><div className="timeline-year-heading"><h3>{year}</h3><span>{yearRecords.length} {yearRecords.length === 1 ? "record" : "records"}</span></div><div className="timeline-items">{yearRecords.map(record => <article className={`timeline-item ${record.important ? "important" : ""}`} key={record.id}><span className="timeline-marker" aria-hidden="true"/><div className="timeline-date"><strong>{formatDate(record.date)}</strong>{birthDate && ageAt(record.date, birthDate) !== null && <span>Age {ageAt(record.date, birthDate)}</span>}</div><div className="timeline-card"><div className="timeline-card-top"><span>{record.type}</span>{record.important && <span className="important-label">Important</span>}</div><button className="record-title" onClick={() => openRecord(record)}>{record.title}</button>{record.provider && <p>{record.provider}</p>}</div><button className="icon-button" aria-label={`Open ${record.title}`} title="Open record" onClick={() => openRecord(record)}><ArrowLeft className="chevron-right" size={19}/></button></article>)}</div></section>)}</div> : <div className="records-list">{filtered.map(record => <article className="record-row" key={record.id}><span className={`record-file-icon ${record.fileType.startsWith("image/") ? "image" : ""}`}>{record.fileType.startsWith("image/") ? <FileImage size={23}/> : <FileText size={23}/>}</span><div className="record-main"><button className="record-title" onClick={() => openRecord(record)}>{record.title}</button><p><span>{record.type}</span><span className="meta-dot">·</span><span>{formatDate(record.date)}</span>{record.provider && <><span className="meta-dot">·</span><span>{record.provider}</span></>}{record.important && <><span className="meta-dot">·</span><span className="important-text">Important</span></>}</p></div><span className="record-size">{formatBytes(record.fileSize)}</span><button className="icon-button" aria-label={`Download ${record.title}`} title="Download original" onClick={() => download(record)}><ArrowDownToLine size={19}/></button><button className="icon-button" aria-label={`Open ${record.title}`} title="Open record" onClick={() => openRecord(record)}><ArrowLeft className="chevron-right" size={19}/></button></article>)}</div>}
      </section>
      <p className="library-footnote">Your records are saved in this browser profile on this device.</p>
    </div>
    {(dialog === "add" || dialog === "edit") && <div className="modal-backdrop" onMouseDown={closeDialog}><div className="record-modal" role="dialog" aria-modal="true" aria-labelledby="form-title" onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{dialog === "add" ? "NEW DOCUMENT" : "UPDATE DETAILS"}</span><h2 id="form-title">{dialog === "add" ? "Add a record" : "Edit record details"}</h2></div><button className="icon-button" aria-label="Close" onClick={closeDialog}><X size={21}/></button></div><div className="modal-content">{dialog === "add" && <div className="upload-zone" onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}><UploadCloud size={30}/><strong>{file ? file.name : "Choose a file or drop it here"}</strong><span>{file ? formatBytes(file.size) : "PDF, JPG, PNG, or WebP · up to 25 MB"}</span><input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={event => chooseFile(event.target.files?.[0])} className="sr-only" aria-label="Choose medical document"/></div>}
      <div className="form-grid"><label className="field field-wide">Title <span>*</span><input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Annual blood test" maxLength={120}/></label><label className="field">Record type<select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as RecordType })}>{recordTypes.map(type => <option key={type}>{type}</option>)}</select></label><label className="field">Date <span>*</span><input type="date" value={draft.date} max={new Date().toISOString().slice(0, 10)} onChange={event => setDraft({ ...draft, date: event.target.value })}/></label><label className="field field-wide">Doctor, clinic, or hospital <small>Optional</small><input value={draft.provider} onChange={event => setDraft({ ...draft, provider: event.target.value })} placeholder="Where this record came from" maxLength={120}/></label><label className="field field-wide">Notes <small>Optional</small><textarea rows={3} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} placeholder="Add a detail that will help you find this later" maxLength={1000}/></label><label className="important-check field-wide"><input type="checkbox" checked={draft.important} onChange={event => setDraft({ ...draft, important: event.target.checked })}/><span><strong>Mark as important</strong><small>Give this record a coral marker in your timeline.</small></span></label>
      <fieldset className="collection-picker field-wide"><legend>Care collections <small>Optional</small></legend>{collections.length ? <div className="collection-options">{collections.map(collection => <label key={collection.id}><input type="checkbox" checked={draft.collectionIds.includes(collection.id)} onChange={event => setDraft({ ...draft, collectionIds: event.target.checked ? [...draft.collectionIds, collection.id] : draft.collectionIds.filter(id => id !== collection.id) })}/><span>{collection.name}</span></label>)}</div> : <p>No collections yet. <Link href="/collections">Create a collection</Link> to organize this record.</p>}</fieldset>
      </div>{formError && <p className="notice-error" role="alert">{formError}</p>}<div className="modal-actions"><button className="button button-outline" onClick={closeDialog} disabled={saving}>Cancel</button><button className="button button-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : dialog === "add" ? "Save record" : "Save changes"}</button></div></div></div></div>}
    {dialog === "view" && selected && <div className="modal-backdrop" onMouseDown={closeDialog}><div className="record-modal view-modal" role="dialog" aria-modal="true" aria-labelledby="view-title" onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{selected.type.toUpperCase()}</span><h2 id="view-title">{selected.title}</h2></div><button className="icon-button" aria-label="Close" onClick={closeDialog}><X size={21}/></button></div><div className="modal-content"><div className="record-details"><div><span>Date</span><strong><CalendarDays size={16}/>{formatDate(selected.date)}</strong></div><div><span>Care provider</span><strong>{selected.provider || "Not specified"}</strong></div><div><span>Original file</span><strong>{selected.fileName} · {formatBytes(selected.fileSize)}</strong></div>{selected.collectionIds?.length ? <div className="details-notes"><span>Collections</span><div className="record-collection-tags">{collections.filter(collection => selected.collectionIds?.includes(collection.id)).map(collection => <Link key={collection.id} href={`/collections/${collection.id}`}>{collection.name}</Link>)}</div></div> : null}{selected.notes && <div className="details-notes"><span>Notes</span><p>{selected.notes}</p></div>}</div>{previewUrl && <div className="file-preview">{selected.fileType === "application/pdf" ? <iframe title={`Preview of ${selected.title}`} src={previewUrl}/>  : <Image unoptimized width={720} height={330} src={previewUrl} alt={`Preview of ${selected.title}`}/>}</div>}<div className="modal-actions view-actions"><button className="button button-outline" onClick={() => beginEdit(selected)}><Pencil size={16}/> Edit details</button><button className="button button-danger" onClick={() => remove(selected)}><Trash2 size={16}/> Remove</button><button className="button button-primary" onClick={() => download(selected)}><ArrowDownToLine size={16}/> Download</button></div></div></div></div>}
  </main>;
}
