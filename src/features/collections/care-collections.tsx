"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FolderHeart,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import {
  deleteCareCollection,
  listCollections,
  listRecords,
  saveCollection,
  type CareCollection,
  type MedicalRecord,
} from "@/lib/records";

type CollectionDraft = { name: string; description: string; notes: string };
const emptyDraft = (): CollectionDraft => ({
  name: "",
  description: "",
  notes: "",
});

/** Lists care journeys and owns collection create/edit/delete operations. */
export function CareCollectionsPage() {
  const [collections, setCollections] = useState<CareCollection[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<CareCollection | null>(null);
  const [draft, setDraft] = useState<CollectionDraft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listCollections(), listRecords()])
      .then(([storedCollections, storedRecords]) => {
        setCollections(storedCollections);
        setRecords(storedRecords);
      })
      .catch(() => setMessage("Collections could not be opened."))
      .finally(() => setLoading(false));
  }, []);

  // Sort a copy so React state continues to mirror the persisted order.
  const sortedCollections = useMemo(
    () =>
      [...collections].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [collections],
  );

  function beginCreate() {
    setSelected(null);
    setDraft(emptyDraft());
    setMessage("");
    setDialog("create");
  }
  function beginEdit(collection: CareCollection) {
    setSelected(collection);
    setDraft({
      name: collection.name,
      description: collection.description,
      notes: collection.notes,
    });
    setMessage("");
    setDialog("edit");
  }
  function closeDialog() {
    if (!saving) {
      setDialog(null);
      setSelected(null);
      setMessage("");
    }
  }

  async function save() {
    if (!draft.name.trim()) {
      setMessage("Enter a collection name.");
      return;
    }
    setSaving(true);
    setMessage("");
    const now = new Date().toISOString();
    const collection: CareCollection = {
      id: selected?.id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      createdAt: selected?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveCollection(collection);
      setCollections((current) => [
        collection,
        ...current.filter((item) => item.id !== collection.id),
      ]);
      setDialog(null);
      setSelected(null);
    } catch {
      setMessage("This collection could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(collection: CareCollection) {
    if (
      !window.confirm(
        `Delete “${collection.name}”? Its records will stay in your library.`,
      )
    )
      return;
    try {
      // The data layer also removes this collection ID from member records.
      await deleteCareCollection(collection.id);
      setCollections((current) =>
        current.filter((item) => item.id !== collection.id),
      );
      setRecords((current) =>
        current.map((record) => ({
          ...record,
          collectionIds: record.collectionIds?.filter(
            (id) => id !== collection.id,
          ),
        })),
      );
    } catch {
      setMessage("This collection could not be deleted. Please try again.");
    }
  }

  return (
    <main className="collections-page">
      <header className="site-header wrap">
        <Brand />
        <DossierNav active="collections" />
        <div className="header-actions">
          <Link className="header-back" href="/">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>
      <div className="collections-shell wrap">
        <div className="collections-heading">
          <div>
            <span className="section-kicker">MY HEALTH DOSSIER</span>
            <h1>Care collections</h1>
            <p>
              Bring related records together around a condition, treatment, or
              moment in time.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={beginCreate}
            disabled={loading}
          >
            <Plus size={18} /> New collection
          </button>
        </div>
        {message && !dialog && (
          <p className="notice-error" role="alert">
            {message}
          </p>
        )}
        {loading ? (
          <div className="collection-empty">
            <p>Opening your collections…</p>
          </div>
        ) : sortedCollections.length === 0 ? (
          <section className="collection-empty">
            <span className="collection-empty-icon">
              <FolderHeart size={34} />
            </span>
            <span className="section-kicker">YOUR CARE, IN CONTEXT</span>
            <h2>Start a care journey.</h2>
            <p>
              Collect the records that belong together and see their story
              unfold over time.
            </p>
            <button
              className="button button-primary"
              onClick={beginCreate}
              disabled={loading}
            >
              <Plus size={18} /> Create your first collection
            </button>
          </section>
        ) : (
          <div className="collection-grid">
            {sortedCollections.map((collection) => {
              const collectionRecords = records.filter((record) =>
                record.collectionIds?.includes(collection.id),
              );
              const dates = collectionRecords
                .map((record) => record.date)
                .sort();
              return (
                <article className="collection-card" key={collection.id}>
                  <div className="collection-card-top">
                    <span className="collection-card-icon">
                      <FolderHeart size={22} />
                    </span>
                    <div className="collection-card-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${collection.name}`}
                        onClick={() => beginEdit(collection)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button collection-delete"
                        aria-label={`Delete ${collection.name}`}
                        onClick={() => remove(collection)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <Link
                    className="collection-card-link"
                    href={`/collections/${collection.id}`}
                  >
                    <h2>{collection.name}</h2>
                    <p>
                      {collection.description ||
                        "A place for the records in this care journey."}
                    </p>
                    <div className="collection-card-meta">
                      <span>
                        {collectionRecords.length}{" "}
                        {collectionRecords.length === 1 ? "record" : "records"}
                      </span>
                      {dates.length > 0 && (
                        <span>
                          <CalendarDays size={14} />
                          {dates[0].slice(0, 4)}
                          {dates[0].slice(0, 4) !== dates.at(-1)?.slice(0, 4)
                            ? `–${dates.at(-1)?.slice(0, 4)}`
                            : ""}
                        </span>
                      )}
                      <ChevronRight size={18} />
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={closeDialog}>
          <div
            className="record-modal collection-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  {dialog === "create"
                    ? "NEW CARE JOURNEY"
                    : "COLLECTION DETAILS"}
                </span>
                <h2 id="collection-form-title">
                  {dialog === "create"
                    ? "Create a collection"
                    : "Edit collection"}
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
              <div className="form-grid">
                <label className="field field-wide">
                  Name <span>*</span>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    placeholder="e.g. Heart health"
                    maxLength={80}
                  />
                </label>
                <label className="field field-wide">
                  Description <small>Optional</small>
                  <textarea
                    rows={2}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    placeholder="What belongs in this collection?"
                    maxLength={240}
                  />
                </label>
                <label className="field field-wide">
                  Private notes <small>Optional</small>
                  <textarea
                    rows={5}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft({ ...draft, notes: event.target.value })
                    }
                    placeholder="Keep questions, context, or details about this care journey."
                    maxLength={1500}
                  />
                </label>
              </div>
              {message && (
                <p className="notice-error" role="alert">
                  {message}
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
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : dialog === "create"
                      ? "Create collection"
                      : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
