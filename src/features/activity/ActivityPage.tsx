import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@chakra-ui/react";
import { useHealthData } from "../../context/useHealthData.js";
import {
  activityTypes,
  distanceFromKilometers,
  filterActivityEntries,
  getActivityMinutesForPeriod,
  kilometersFromDistance,
} from "../../health/activityUtils.js";
import type { ActivityEntryInput } from "../../health/activityUtils";
import { toIsoDate } from "../../health/healthUtils.js";
import type { ActivityEntry, ActivityType, DistanceUnit } from "../../types/health";

interface ActivityDraft {
  date: string;
  activityType: ActivityType;
  durationMinutes: string;
  distance: string;
  distanceUnit: DistanceUnit;
  notes: string;
}

function createDraft(entry: ActivityEntry | null, distanceUnit: DistanceUnit): ActivityDraft {
  const distance = entry?.distanceKm === undefined ? null : distanceFromKilometers(entry.distanceKm, distanceUnit);
  return {
    date: entry?.date ?? toIsoDate(new Date()),
    activityType: entry?.activityType ?? "walking",
    durationMinutes: entry ? String(entry.durationMinutes) : "",
    distance: distance === null ? "" : String(Number(distance.toFixed(2))),
    distanceUnit,
    notes: entry?.notes ?? "",
  };
}

function toActivityInput(draft: ActivityDraft): ActivityEntryInput {
  const input: ActivityEntryInput = {
    date: draft.date,
    activityType: draft.activityType,
    durationMinutes: draft.durationMinutes.trim() === "" ? Number.NaN : Number(draft.durationMinutes),
    notes: draft.notes.trim(),
  };
  if (draft.distance.trim() !== "") {
    input.distanceKm = kilometersFromDistance(Number(draft.distance), draft.distanceUnit) ?? Number.NaN;
  }
  return input;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatActivityType(type: ActivityType): string {
  return type.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ActivityForm({
  entry,
  distanceUnit,
  onSave,
  onCancel,
}: {
  entry: ActivityEntry | null;
  distanceUnit: DistanceUnit;
  onSave: (input: ActivityEntryInput) => string;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(() => createDraft(entry, distanceUnit));
  const [error, setError] = useState("");

  function updateField<Field extends keyof ActivityDraft>(field: Field, value: ActivityDraft[Field]): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = onSave(toActivityInput(draft));
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (!onCancel) setDraft(createDraft(null, distanceUnit));
  }

  return (
    <form className="tracking-form" onSubmit={handleSubmit} noValidate>
      <div className="tracking-form-grid">
        <div className="form-field">
          <label className="field-label" htmlFor="activity-date">Activity date</label>
          <input className="field-input" id="activity-date" type="date" value={draft.date} onChange={(event) => updateField("date", event.target.value)} required />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="activity-type">Activity type</label>
          <select className="field-input field-select" id="activity-type" value={draft.activityType} onChange={(event) => updateField("activityType", event.target.value as ActivityType)}>
            {activityTypes.map((type) => <option key={type} value={type}>{formatActivityType(type)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="activity-duration">Duration in minutes</label>
          <input className="field-input" id="activity-duration" type="number" min="0" step="1" inputMode="numeric" value={draft.durationMinutes} onChange={(event) => updateField("durationMinutes", event.target.value)} required />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="activity-distance">Distance (optional)</label>
          <input className="field-input" id="activity-distance" type="number" min="0" step="any" inputMode="decimal" value={draft.distance} onChange={(event) => updateField("distance", event.target.value)} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="activity-distance-unit">Distance unit</label>
          <select className="field-input field-select" id="activity-distance-unit" value={draft.distanceUnit} onChange={(event) => updateField("distanceUnit", event.target.value as DistanceUnit)}>
            <option value="km">Kilometers</option>
            <option value="mi">Miles</option>
          </select>
        </div>
        <div className="form-field form-field-wide">
          <label className="field-label" htmlFor="activity-notes">Notes (optional)</label>
          <textarea className="field-input tracking-notes" id="activity-notes" rows={3} value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </div>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button className="primary-action" type="submit">{entry ? "Save activity" : "Add activity"}</Button>
        {onCancel && <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

function ActivityPage() {
  const { activityEntries, addActivityEntry, editActivityEntry, deleteActivityEntry } = useHealthData();
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const editingEntry = editingId ? activityEntries.find((entry) => entry.id === editingId) ?? null : null;
  const visibleEntries = filterActivityEntries(activityEntries, typeFilter, selectedDate || "all");
  const today = new Date();
  const todayString = toIsoDate(today);
  const todayEntries = activityEntries.filter((entry) => entry.date === todayString);
  const todayMinutes = todayEntries.length === 0
    ? null
    : todayEntries.reduce((total, entry) => total + entry.durationMinutes, 0);
  const weekEntries = activityEntries.filter((entry) => {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return entry.date >= toIsoDate(monday) && entry.date <= todayString;
  });
  const monthEntries = activityEntries.filter((entry) => entry.date.slice(0, 7) === todayString.slice(0, 7));
  const weekMinutes = getActivityMinutesForPeriod(activityEntries, "week", today);
  const monthMinutes = getActivityMinutesForPeriod(activityEntries, "month", today);

  function saveActivity(input: ActivityEntryInput): string {
    const message = editingId ? editActivityEntry(editingId, input) : addActivityEntry(input);
    if (!message) {
      setEditingId(null);
      setStatus(editingId ? "Activity updated for this demo session." : "Activity added for this demo session.");
    }
    return message;
  }

  function confirmDelete(entry: ActivityEntry): void {
    if (!window.confirm(`Delete ${formatActivityType(entry.activityType)} from ${formatDate(entry.date)}?`)) return;
    deleteActivityEntry(entry.id);
    setStatus("Activity deleted for this demo session.");
    if (editingId === entry.id) setEditingId(null);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Movement history</p>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">Record activities you choose to track. No calorie-burn estimates or safety labels.</p>
        </div>
      </header>
      {status && <p className="form-status tracking-page-status" role="status" aria-live="polite">{status}</p>}
      <div className="tracking-page-grid activity-page-grid">
        <section className="panel activity-form-panel" aria-labelledby="activity-form-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="activity-form-title">{editingEntry ? "Edit activity" : "Add activity"}</h2>
              <p className="panel-caption">Duration is required; distance and notes are optional.</p>
            </div>
          </div>
          <ActivityForm
            key={`${editingEntry?.id ?? "new-activity"}-${distanceUnit}`}
            entry={editingEntry}
            distanceUnit={distanceUnit}
            onSave={saveActivity}
            onCancel={editingEntry ? () => setEditingId(null) : undefined}
          />
        </section>

        <section className="panel activity-summary-panel" aria-labelledby="activity-summary-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="activity-summary-title">Recorded minutes</h2>
              <p className="panel-caption">Summaries include saved activity records only.</p>
            </div>
          </div>
          <dl className="activity-period-summary">
            <div><dt>Today</dt><dd>{todayMinutes === null ? "Not recorded" : `${todayMinutes} min`}</dd></div>
            <div><dt>This week</dt><dd>{weekEntries.length === 0 ? "Not recorded" : `${weekMinutes} min`}</dd></div>
            <div><dt>This month</dt><dd>{monthEntries.length === 0 ? "Not recorded" : `${monthMinutes} min`}</dd></div>
          </dl>
        </section>

        <section className="panel activity-history-panel" aria-labelledby="activity-history-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="activity-history-title">Activity history</h2>
              <p className="panel-caption">{visibleEntries.length} fictional records, newest first.</p>
            </div>
            <div className="activity-distance-display">
              <label className="visually-hidden" htmlFor="activity-display-distance-unit">Distance display unit</label>
              <select className="field-input field-select" id="activity-display-distance-unit" value={distanceUnit} onChange={(event) => setDistanceUnit(event.target.value as DistanceUnit)}>
                <option value="km">km</option>
                <option value="mi">mi</option>
              </select>
            </div>
          </div>
          <div className="activity-list-filters">
            <div className="form-field">
              <label className="field-label" htmlFor="activity-filter-date">Date filter</label>
              <input className="field-input" id="activity-filter-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <button className="text-button" type="button" onClick={() => setSelectedDate("")}>Show all dates</button>
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="activity-filter-type">Activity type</label>
              <select className="field-input field-select" id="activity-filter-type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ActivityType | "all")}>
                <option value="all">All activities</option>
                {activityTypes.map((type) => <option key={type} value={type}>{formatActivityType(type)}</option>)}
              </select>
            </div>
          </div>
          {visibleEntries.length > 0 ? (
            <div className="table-scroll">
              <table className="demo-data-table activity-history-table">
                <caption className="visually-hidden">Recorded activity history</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">Activity</th><th scope="col">Duration</th><th scope="col">Distance</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {visibleEntries.map((entry) => {
                    const distance = entry.distanceKm === undefined ? null : distanceFromKilometers(entry.distanceKm, distanceUnit);
                    return (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{formatActivityType(entry.activityType)}{entry.notes && <span className="tracking-subtext">{entry.notes}</span>}</td>
                        <td>{entry.durationMinutes} min</td>
                        <td>{distance === null ? "Not recorded" : `${Number(distance.toFixed(2))} ${distanceUnit}`}</td>
                        <td>
                          <div className="record-actions">
                            <Button className="text-button" type="button" onClick={() => { setEditingId(entry.id); setStatus(""); }}>Edit<span className="visually-hidden"> {formatActivityType(entry.activityType)} from {entry.date}</span></Button>
                            <Button className="text-button text-button-danger" type="button" onClick={() => confirmDelete(entry)}>Delete<span className="visually-hidden"> {formatActivityType(entry.activityType)} from {entry.date}</span></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="inline-empty-state" role="status">No activity records match these filters.</div>
          )}
        </section>
      </div>
      <p className="temporary-data-note" role="note">Activity tracking is for personal record keeping only. It does not estimate calories burned or classify activities as safe or unsafe. Demo changes stay in temporary memory and disappear when the page refreshes.</p>
    </>
  );
}

export default ActivityPage;