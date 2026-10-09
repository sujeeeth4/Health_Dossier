"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChartNoAxesCombined,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierNav } from "@/components/dossier-nav";
import {
  createMeasurement,
  deleteMeasurement,
  formatDate,
  listMeasurements,
  listRecords,
  measurementCategories,
  measurementGroupKey,
  measurementRangeStatus,
  updateMeasurement,
  type HealthMeasurement,
  type HealthMeasurementInput,
  type MedicalRecord,
  type MeasurementCategory,
  type MeasurementRangeStatus,
} from "@/lib/records";

const metricSuggestions: Array<[string, string, MeasurementCategory]> = [
  ["HbA1c", "%", "Laboratory"],
  ["Fasting glucose", "mg/dL", "Laboratory"],
  ["TSH", "µIU/mL", "Laboratory"],
  ["Total cholesterol", "mg/dL", "Laboratory"],
  ["Vitamin D", "ng/mL", "Laboratory"],
  ["Systolic blood pressure", "mmHg", "Vital sign"],
  ["Diastolic blood pressure", "mmHg", "Vital sign"],
  ["Weight", "kg", "Body measurement"],
];

type Draft = {
  name: string;
  value: string;
  unit: string;
  measuredAt: string;
  category: MeasurementCategory;
  referenceLow: string;
  referenceHigh: string;
  notes: string;
  sourceRecordId: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  value: "",
  unit: "",
  measuredAt: new Date().toISOString().slice(0, 10),
  category: "Laboratory",
  referenceLow: "",
  referenceHigh: "",
  notes: "",
  sourceRecordId: "",
});

const statusLabels: Record<MeasurementRangeStatus, string> = {
  low: "Below supplied range",
  within: "Within supplied range",
  high: "Above supplied range",
  unknown: "No range supplied",
};

/** Patient-only measurement entry, grouping, visualization, and provenance. */
export function TrendsPage() {
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [range, setRange] = useState("all");
  const [editing, setEditing] = useState<HealthMeasurement | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listMeasurements(), listRecords()])
      .then(([storedMeasurements, storedRecords]) => {
        setMeasurements(storedMeasurements);
        setRecords(storedRecords.sort((a, b) => b.date.localeCompare(a.date)));
        const recordId = new URLSearchParams(window.location.search).get("record");
        if (recordId) {
          const record = storedRecords.find((item) => item.id === recordId);
          if (record) {
            setDraft({ ...emptyDraft(), sourceRecordId: record.id, measuredAt: record.date });
            setDialogOpen(true);
          }
        }
      })
      .catch(() => setError("Health measurements could not be opened."))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, HealthMeasurement[]>();
    for (const measurement of measurements) {
      const key = measurementGroupKey(measurement.name, measurement.unit);
      grouped.set(key, [...(grouped.get(key) ?? []), measurement]);
    }
    return [...grouped.entries()]
      .map(([key, items]) => ({
        key,
        items: items.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)),
      }))
      .sort((a, b) =>
        b.items.at(-1)!.measuredAt.localeCompare(a.items.at(-1)!.measuredAt),
      );
  }, [measurements]);

  useEffect(() => {
    if (!groups.length) setSelectedKey("");
    else if (!groups.some((group) => group.key === selectedKey))
      setSelectedKey(groups[0].key);
  }, [groups, selectedKey]);

  const selectedGroup = groups.find((group) => group.key === selectedKey);
  const visibleMeasurements = useMemo(() => {
    if (!selectedGroup) return [];
    if (range === "all") return selectedGroup.items;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - Number(range));
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    return selectedGroup.items.filter((item) => item.measuredAt >= cutoffDate);
  }, [range, selectedGroup]);

  function startAdd() {
    setEditing(null);
    setDraft(emptyDraft());
    setError("");
    setDialogOpen(true);
  }

  function startEdit(measurement: HealthMeasurement) {
    setEditing(measurement);
    setDraft({
      name: measurement.name,
      value: String(measurement.value),
      unit: measurement.unit,
      measuredAt: measurement.measuredAt,
      category: measurement.category,
      referenceLow: measurement.referenceLow === undefined ? "" : String(measurement.referenceLow),
      referenceHigh: measurement.referenceHigh === undefined ? "" : String(measurement.referenceHigh),
      notes: measurement.notes,
      sourceRecordId: measurement.sourceRecordId ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  function applySuggestion(name: string) {
    const suggestion = metricSuggestions.find(
      ([item]) => item.toLocaleLowerCase("en") === name.trim().toLocaleLowerCase("en"),
    );
    if (suggestion)
      setDraft((current) => ({
        ...current,
        name: suggestion[0],
        unit: current.unit || suggestion[1],
        category: suggestion[2],
      }));
  }

  function inputValue(): HealthMeasurementInput | null {
    const value = Number(draft.value);
    const referenceLow = draft.referenceLow === "" ? undefined : Number(draft.referenceLow);
    const referenceHigh = draft.referenceHigh === "" ? undefined : Number(draft.referenceHigh);
    if (!draft.name.trim() || !draft.unit.trim() || !draft.measuredAt || !Number.isFinite(value)) {
      setError("Enter a metric, finite numeric value, unit, and date.");
      return null;
    }
    if (
      (referenceLow !== undefined && !Number.isFinite(referenceLow)) ||
      (referenceHigh !== undefined && !Number.isFinite(referenceHigh))
    ) {
      setError("Reference limits must be finite numbers.");
      return null;
    }
    if (referenceLow !== undefined && referenceHigh !== undefined && referenceLow >= referenceHigh) {
      setError("The upper reference limit must be greater than the lower limit.");
      return null;
    }
    return {
      name: draft.name.trim(),
      value,
      unit: draft.unit.trim(),
      measuredAt: draft.measuredAt,
      category: draft.category,
      referenceLow,
      referenceHigh,
      notes: draft.notes.trim(),
      sourceRecordId: draft.sourceRecordId || undefined,
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input = inputValue();
    if (!input) return;
    setSaving(true);
    setError("");
    try {
      const saved = editing
        ? await updateMeasurement(editing.id, input)
        : await createMeasurement(input);
      setMeasurements((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelectedKey(measurementGroupKey(saved.name, saved.unit));
      setDialogOpen(false);
      setEditing(null);
      setMessage(editing ? "Measurement updated." : "Measurement added to your trends.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Measurement could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(measurement: HealthMeasurement) {
    if (!window.confirm(`Delete the ${measurement.name} measurement from ${formatDate(measurement.measuredAt)}?`))
      return;
    try {
      await deleteMeasurement(measurement.id);
      setMeasurements((current) => current.filter((item) => item.id !== measurement.id));
      setMessage("Measurement deleted.");
    } catch {
      setError("Measurement could not be deleted.");
    }
  }

  return (
    <main className="trends-page">
      <header className="site-header wrap">
        <Brand />
        <DossierNav active="trends" />
        <div className="header-actions">
          <Link className="header-back" href="/"><ArrowLeft size={16} /> Home</Link>
        </div>
      </header>
      <div className="trends-shell wrap">
        <div className="trends-heading">
          <div>
            <span className="section-kicker">MEASUREMENTS OVER TIME</span>
            <h1>Health trends</h1>
            <p>Track reviewed values from reports and see how they change over time.</p>
          </div>
          <button className="button button-primary" onClick={startAdd}><Plus size={18} /> Add measurement</button>
        </div>

        <div className="trends-safety-note">
          <ShieldAlert size={20} />
          <div><strong>Organisation, not medical interpretation</strong><p>Range labels use only the limits you enter from a report. This page does not diagnose, recommend treatment, or provide emergency alerts.</p></div>
        </div>
        {message && <p className="save-message" role="status">{message}</p>}
        {error && !dialogOpen && <p className="notice-error" role="alert">{error}</p>}

        {loading ? (
          <section className="trends-empty"><p>Opening your measurements…</p></section>
        ) : !groups.length ? (
          <section className="trends-empty">
            <span><ChartNoAxesCombined size={31} /></span>
            <h2>Your trends begin with one reviewed value</h2>
            <p>Add a laboratory result, vital sign, or body measurement exactly as it appears in your source.</p>
            <button className="button button-primary" onClick={startAdd}><Plus size={17} /> Add your first measurement</button>
          </section>
        ) : (
          <>
            <section className="trend-card-grid" aria-label="Latest measurements">
              {groups.map((group) => {
                const latest = group.items.at(-1)!;
                const previous = group.items.at(-2);
                const change = previous ? latest.value - previous.value : null;
                const status = measurementRangeStatus(latest);
                return (
                  <button key={group.key} className={selectedKey === group.key ? "selected" : ""} onClick={() => setSelectedKey(group.key)}>
                    <span>{latest.name}</span>
                    <strong>{latest.value} <small>{latest.unit}</small></strong>
                    <span className={`range-status ${status}`}>{statusLabels[status]}</span>
                    <small>{change === null ? "First reading" : `${change > 0 ? "+" : ""}${Number(change.toPrecision(4))} since previous`}</small>
                  </button>
                );
              })}
            </section>

            {selectedGroup && (
              <section className="trend-detail">
                <div className="trend-detail-heading">
                  <div><span className="section-kicker">SELECTED TREND</span><h2>{selectedGroup.items[0].name}</h2><p>{selectedGroup.items[0].unit} · {selectedGroup.items.length} {selectedGroup.items.length === 1 ? "reading" : "readings"}</p></div>
                  <label className="trend-range-filter">Date range<select value={range} onChange={(event) => setRange(event.target.value)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option><option value="all">All time</option></select></label>
                </div>
                {visibleMeasurements.length ? (
                  <>
                    <TrendChart measurements={visibleMeasurements} />
                    <div className="trend-table-wrap">
                      <table className="trend-table">
                        <thead><tr><th>Date</th><th>Value</th><th>Report range</th><th>Status</th><th>Source</th><th><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody>
                          {[...visibleMeasurements].reverse().map((measurement) => {
                            const status = measurementRangeStatus(measurement);
                            return (
                              <tr key={measurement.id}>
                                <td>{formatDate(measurement.measuredAt)}</td>
                                <td><strong>{measurement.value} {measurement.unit}</strong>{measurement.notes && <small>{measurement.notes}</small>}</td>
                                <td>{formatRange(measurement)}</td>
                                <td><span className={`range-status ${status}`}>{statusLabels[status]}</span></td>
                                <td>{measurement.sourceRecordId ? <a href={`/api/files/${encodeURIComponent(measurement.sourceRecordId)}`} target="_blank" rel="noreferrer"><FileText size={14} /> {measurement.sourceRecordTitle ?? "Original record"} <ExternalLink size={12} /></a> : measurement.sourceRecordTitle ? <span>{measurement.sourceRecordTitle} <small>Record removed</small></span> : "Manual entry"}</td>
                                <td><div className="trend-row-actions"><button aria-label={`Edit ${measurement.name} from ${formatDate(measurement.measuredAt)}`} onClick={() => startEdit(measurement)}><Pencil size={15} /></button><button aria-label={`Delete ${measurement.name} from ${formatDate(measurement.measuredAt)}`} onClick={() => remove(measurement)}><Trash2 size={15} /></button></div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <div className="trend-no-range"><CalendarDays size={22} /><p>No readings fall inside this date range.</p></div>}
              </section>
            )}
          </>
        )}
      </div>

      {dialogOpen && (
        <div className="modal-backdrop" onMouseDown={() => !saving && setDialogOpen(false)}>
          <form className="record-modal trend-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-title" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="section-kicker">REVIEWED VALUE</span><h2 id="measurement-title">{editing ? "Edit measurement" : "Add a measurement"}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setDialogOpen(false)}><X size={21} /></button></div>
            <div className="modal-content">
              <p className="trend-form-intro">Enter the value and unit exactly as shown in your report. Suggested metric names do not include clinical ranges.</p>
              <div className="form-grid">
                <label className="field field-wide">Metric name <span>*</span><input list="metric-suggestions" value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} onBlur={() => applySuggestion(draft.name)} placeholder="e.g. HbA1c" /><datalist id="metric-suggestions">{metricSuggestions.map(([name]) => <option value={name} key={name} />)}</datalist></label>
                <label className="field">Value <span>*</span><input type="number" step="any" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="e.g. 5.6" /></label>
                <label className="field">Unit <span>*</span><input value={draft.unit} maxLength={24} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="e.g. %" /></label>
                <label className="field">Measurement date <span>*</span><input type="date" max={new Date().toISOString().slice(0, 10)} value={draft.measuredAt} onChange={(event) => setDraft({ ...draft, measuredAt: event.target.value })} /></label>
                <label className="field">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as MeasurementCategory })}>{measurementCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="field">Lower reference limit <small>Optional</small><input type="number" step="any" value={draft.referenceLow} onChange={(event) => setDraft({ ...draft, referenceLow: event.target.value })} /></label>
                <label className="field">Upper reference limit <small>Optional</small><input type="number" step="any" value={draft.referenceHigh} onChange={(event) => setDraft({ ...draft, referenceHigh: event.target.value })} /></label>
                <label className="field field-wide">Source record <small>Optional</small><select value={draft.sourceRecordId} onChange={(event) => { const record = records.find((item) => item.id === event.target.value); setDraft({ ...draft, sourceRecordId: event.target.value, measuredAt: !editing && record ? record.date : draft.measuredAt }); }}><option value="">Manual entry</option>{records.map((record) => <option value={record.id} key={record.id}>{record.title} · {formatDate(record.date)}</option>)}</select></label>
                <label className="field field-wide">Notes <small>Optional</small><textarea rows={3} maxLength={500} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Context from the report" /></label>
              </div>
              {error && <p className="notice-error" role="alert">{error}</p>}
            </div>
            <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setDialogOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add measurement"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function formatRange(measurement: HealthMeasurement) {
  if (measurement.referenceLow !== undefined && measurement.referenceHigh !== undefined)
    return `${measurement.referenceLow}–${measurement.referenceHigh} ${measurement.unit}`;
  if (measurement.referenceLow !== undefined) return `≥ ${measurement.referenceLow} ${measurement.unit}`;
  if (measurement.referenceHigh !== undefined) return `≤ ${measurement.referenceHigh} ${measurement.unit}`;
  return "Not supplied";
}

function TrendChart({ measurements }: { measurements: HealthMeasurement[] }) {
  const width = 760;
  const height = 270;
  const padding = { top: 24, right: 24, bottom: 42, left: 58 };
  const values = measurements.flatMap((item) => [item.value, item.referenceLow, item.referenceHigh]).filter((value): value is number => value !== undefined);
  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  const spread = maximum - minimum || Math.max(Math.abs(maximum) * 0.2, 1);
  minimum -= spread * 0.12;
  maximum += spread * 0.12;
  const x = (index: number) => padding.left + (measurements.length === 1 ? (width - padding.left - padding.right) / 2 : (index / (measurements.length - 1)) * (width - padding.left - padding.right));
  const y = (value: number) => padding.top + ((maximum - value) / (maximum - minimum)) * (height - padding.top - padding.bottom);
  const points = measurements.map((item, index) => `${x(index)},${y(item.value)}`).join(" ");
  const firstLow = measurements[0].referenceLow;
  const firstHigh = measurements[0].referenceHigh;
  const hasConsistentBand =
    firstLow !== undefined &&
    firstHigh !== undefined &&
    measurements.every(
      (item) => item.referenceLow === firstLow && item.referenceHigh === firstHigh,
    );
  const bandLow = hasConsistentBand ? firstLow : undefined;
  const bandHigh = hasConsistentBand ? firstHigh : undefined;
  const summary = `${measurements[0].name}, ${measurements.length} readings from ${formatDate(measurements[0].measuredAt)} to ${formatDate(measurements.at(-1)!.measuredAt)}. Values range from ${Math.min(...measurements.map((item) => item.value))} to ${Math.max(...measurements.map((item) => item.value))} ${measurements[0].unit}.`;
  return (
    <figure className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        {[0, 0.25, 0.5, 0.75, 1].map((position) => {
          const value = maximum - position * (maximum - minimum);
          const lineY = padding.top + position * (height - padding.top - padding.bottom);
          return <g key={position}><line x1={padding.left} x2={width - padding.right} y1={lineY} y2={lineY} className="chart-grid-line" /><text x={padding.left - 10} y={lineY + 4} textAnchor="end">{Number(value.toPrecision(4))}</text></g>;
        })}
        {bandLow !== undefined && bandHigh !== undefined && <rect x={padding.left} y={y(bandHigh)} width={width - padding.left - padding.right} height={Math.max(0, y(bandLow) - y(bandHigh))} className="chart-range-band" />}
        {measurements.length > 1 && <polyline points={points} className="chart-line" />}
        {measurements.map((item, index) => <g key={item.id}><circle cx={x(index)} cy={y(item.value)} r="6" className={`chart-point ${measurementRangeStatus(item)}`} /><text x={x(index)} y={height - 15} textAnchor="middle">{new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(new Date(`${item.measuredAt}T12:00:00`))}</text></g>)}
      </svg>
      <figcaption>{summary}</figcaption>
    </figure>
  );
}
