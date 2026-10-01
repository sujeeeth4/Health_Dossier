"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, CalendarDays, ExternalLink, FileText, FolderHeart, Pencil, Plus, Printer, Search, Share2, Trash2, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import { deleteCareCollection, formatDate, getCollection, listRecords, saveCollection, saveRecords, type CareCollection, type MedicalRecord } from "@/lib/records";

type CollectionDraft = { name: string; description: string; notes: string };

export function CareCollectionDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [collection, setCollection] = useState<CareCollection | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState<CollectionDraft>({ name: "", description: "", notes: "" });
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getCollection(collectionId), listRecords()])
      .then(([storedCollection, storedRecords]) => { setCollection(storedCollection ?? null); setRecords(storedRecords); })
      .catch(() => setMessage("This collection could not be opened."))
      .finally(() => setLoading(false));
  }, [collectionId]);

  const collectionRecords = useMemo(() => records
    .filter(record => record.collectionIds?.includes(collectionId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [records, collectionId]);
  const years = useMemo(() => {
    const grouped = new Map<string, MedicalRecord[]>();
    collectionRecords.forEach(record => {
      const year = record.date.slice(0, 4);
      grouped.set(year, [...(grouped.get(year) ?? []), record]);
    });
    return [...grouped];
  }, [collectionRecords]);
  const availableRecords = useMemo(() => records
    .filter(record => `${record.title} ${record.type} ${record.provider}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [records, query]);

  function beginEdit() {
    if (!collection) return;
    setDraft({ name: collection.name, description: collection.description, notes: collection.notes });
    setMessage(""); setEditing(true);
  }
  function beginManage() {
    setMemberIds(collectionRecords.map(record => record.id));
    setQuery(""); setMessage(""); setManaging(true);
  }

  async function updateCollection() {
    if (!collection || !draft.name.trim()) { setMessage("Enter a collection name."); return; }
    setSaving(true); setMessage("");
    const updated = { ...collection, name: draft.name.trim(), description: draft.description.trim(), notes: draft.notes.trim(), updatedAt: new Date().toISOString() };
    try { await saveCollection(updated); setCollection(updated); setEditing(false); }
    catch { setMessage("This collection could not be saved. Please try again."); }
    finally { setSaving(false); }
  }

  async function updateMembers() {
    setSaving(true); setMessage("");
    const updatedRecords = records.map(record => {
      const memberships = new Set(record.collectionIds ?? []);
      if (memberIds.includes(record.id)) memberships.add(collectionId); else memberships.delete(collectionId);
      return { ...record, collectionIds: [...memberships] };
    });
    try { await saveRecords(updatedRecords); setRecords(updatedRecords); setManaging(false); }
    catch { setMessage("Collection records could not be updated. Please try again."); }
    finally { setSaving(false); }
  }

  async function removeCollection() {
    if (!collection || !window.confirm(`Delete “${collection.name}”? Its records will stay in your library.`)) return;
    try { await deleteCareCollection(collection.id); router.push("/collections"); }
    catch { setMessage("This collection could not be deleted. Please try again."); }
  }

  function openOriginal(record: MedicalRecord) {
    const url = URL.createObjectURL(record.file);
    const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener"; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  function download(record: MedicalRecord) {
    const url = URL.createObjectURL(record.file);
    const link = document.createElement("a"); link.href = url; link.download = record.fileName; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return <main className="collections-page">
    <header className="site-header wrap"><Brand/><DossierNav active="collections"/><div className="header-actions"><Link className="header-back" href="/"><ArrowLeft size={16}/> Home</Link></div></header>
    <div className="collection-detail-shell wrap">
      {loading ? <div className="collection-empty"><p>Opening this collection…</p></div> : !collection ? <section className="collection-empty"><span className="collection-empty-icon"><FolderHeart size={34}/></span><h1>Collection not found</h1><p>It may have been deleted from this browser.</p><Link className="button button-primary" href="/collections">Back to collections</Link></section> : <>
        <Link className="collection-back" href="/collections"><ArrowLeft size={15}/> All collections</Link>
        <div className="collection-detail-heading"><div><span className="section-kicker">CARE COLLECTION</span><h1>{collection.name}</h1><p>{collection.description || "A care journey made from the records that belong together."}</p></div><div className="collection-heading-actions"><Link className="button button-outline" href={`/sharing?collection=${collection.id}`}><Share2 size={16}/> Share</Link><Link className="button button-outline" href={`/visit-pack?collection=${collection.id}`}><Printer size={16}/> Prepare pack</Link><button className="button button-outline" onClick={beginEdit}><Pencil size={16}/> Edit</button><button className="button button-primary" onClick={beginManage}><Plus size={17}/> Manage records</button></div></div>
        {message && !editing && !managing && <p className="notice-error" role="alert">{message}</p>}
        <div className="collection-detail-grid">
          <aside className="collection-notes"><div className="collection-panel-title"><FileText size={19}/><h2>Private notes</h2></div><p className={collection.notes ? "" : "muted-note"}>{collection.notes || "Add questions, context, or details you want to remember about this care journey."}</p><button className="small-add" onClick={beginEdit}><Pencil size={14}/>{collection.notes ? "Edit notes" : "Add notes"}</button></aside>
          <section className="collection-timeline-panel" aria-label={`${collection.name} timeline`}><div className="collection-panel-header"><div><span className="section-kicker">COLLECTION TIMELINE</span><h2>{collectionRecords.length} {collectionRecords.length === 1 ? "record" : "records"}</h2></div><button className="small-add" onClick={beginManage}><Plus size={14}/> Add records</button></div>
            {collectionRecords.length === 0 ? <div className="collection-records-empty"><CalendarDays size={29}/><h3>No records here yet</h3><p>Choose records from your library to begin this timeline.</p><button className="button button-primary" onClick={beginManage}>Choose records</button></div> : <div className="collection-timeline">{years.map(([year, yearRecords]) => <section className="collection-year" key={year} aria-label={`Collection records from ${year}`}><h3>{year}</h3><div>{yearRecords.map(record => <article className="collection-record" key={record.id}><span className={`collection-record-dot ${record.important ? "important" : ""}`}/><div className="collection-record-date">{formatDate(record.date)}</div><div className="collection-record-main"><span>{record.type}</span><strong>{record.title}</strong>{record.provider && <p>{record.provider}</p>}</div><div className="collection-record-actions"><button className="icon-button" aria-label={`Open ${record.title}`} title="Open original" onClick={() => openOriginal(record)}><ExternalLink size={17}/></button><button className="icon-button" aria-label={`Download ${record.title}`} title="Download original" onClick={() => download(record)}><ArrowDownToLine size={17}/></button></div></article>)}</div></section>)}</div>}
          </section>
        </div>
        <button className="delete-collection-link" onClick={removeCollection}><Trash2 size={15}/> Delete this collection</button>
      </>}
    </div>

    {editing && collection && <div className="modal-backdrop" onMouseDown={() => !saving && setEditing(false)}><div className="record-modal collection-modal" role="dialog" aria-modal="true" aria-labelledby="edit-collection-title" onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">COLLECTION DETAILS</span><h2 id="edit-collection-title">Edit collection</h2></div><button className="icon-button" aria-label="Close" onClick={() => setEditing(false)}><X size={21}/></button></div><div className="modal-content"><div className="form-grid"><label className="field field-wide">Name <span>*</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} maxLength={80}/></label><label className="field field-wide">Description <small>Optional</small><textarea rows={2} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} maxLength={240}/></label><label className="field field-wide">Private notes <small>Optional</small><textarea rows={5} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} maxLength={1500}/></label></div>{message && <p className="notice-error" role="alert">{message}</p>}<div className="modal-actions"><button className="button button-outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</button><button className="button button-primary" onClick={updateCollection} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div></div></div></div>}

    {managing && collection && <div className="modal-backdrop" onMouseDown={() => !saving && setManaging(false)}><div className="record-modal manage-records-modal" role="dialog" aria-modal="true" aria-labelledby="manage-records-title" onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{collection.name.toUpperCase()}</span><h2 id="manage-records-title">Manage records</h2></div><button className="icon-button" aria-label="Close" onClick={() => setManaging(false)}><X size={21}/></button></div><div className="modal-content"><label className="manage-search"><Search size={18}/><span className="sr-only">Search library records</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your library"/></label><div className="manage-record-list">{availableRecords.length ? availableRecords.map(record => <label key={record.id}><input type="checkbox" checked={memberIds.includes(record.id)} onChange={event => setMemberIds(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))}/><span className="manage-record-copy"><strong>{record.title}</strong><small>{record.type} · {formatDate(record.date)}{record.provider ? ` · ${record.provider}` : ""}</small></span></label>) : <p>No matching records.</p>}</div>{message && <p className="notice-error" role="alert">{message}</p>}<div className="modal-actions"><span className="selection-count">{memberIds.length} selected</span><button className="button button-outline" onClick={() => setManaging(false)} disabled={saving}>Cancel</button><button className="button button-primary" onClick={updateMembers} disabled={saving}>{saving ? "Saving…" : "Save records"}</button></div></div></div></div>}
  </main>;
}
