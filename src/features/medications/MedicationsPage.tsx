import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@chakra-ui/react";
import { useHealthData } from "../../context/useHealthData.js";
import { getMedicationDoseStatus, getTodaySchedules, sortMedicationDoseRecords } from "../../health/trackingUtils.js";
import type { MedicationInput, MedicationScheduleInput } from "../../health/trackingUtils";
import { toIsoDate } from "../../health/healthUtils.js";
import type { Medication, MedicationDoseDisplayStatus, MedicationDoseStatus, Weekday } from "../../types/health";

interface MedicationDraft {
  name: string;
  prescribedDose: string;
  doseUnit: string;
  time: string;
  daysOfWeek: Weekday[];
  notes: string;
}

const weekdays: { value: Weekday; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function createEmptyDraft(): MedicationDraft {
  return {
    name: "",
    prescribedDose: "",
    doseUnit: "",
    time: "08:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    notes: "",
  };
}

function createDraft(medication: Medication | null): MedicationDraft {
  const schedule = medication?.schedules[0];
  return medication ? {
    name: medication.name,
    prescribedDose: String(medication.prescribedDose),
    doseUnit: medication.doseUnit,
    time: schedule?.time ?? "08:00",
    daysOfWeek: schedule ? [...schedule.daysOfWeek] : [0, 1, 2, 3, 4, 5, 6],
    notes: medication.notes ?? "",
  } : createEmptyDraft();
}

function toMedicationInput(draft: MedicationDraft, existingSchedule?: MedicationScheduleInput): MedicationInput {
  return {
    name: draft.name,
    prescribedDose: draft.prescribedDose.trim() === "" ? Number.NaN : Number(draft.prescribedDose),
    doseUnit: draft.doseUnit,
    schedules: [{ ...existingSchedule, time: draft.time, daysOfWeek: draft.daysOfWeek }],
    notes: draft.notes,
  };
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MedicationForm({
  medication,
  onSave,
  onCancel,
}: {
  medication: Medication | null;
  onSave: (input: MedicationInput) => string;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(() => createDraft(medication));
  const [error, setError] = useState("");
  const schedule = medication?.schedules[0];

  function updateField<Field extends keyof MedicationDraft>(field: Field, value: MedicationDraft[Field]): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function toggleDay(day: Weekday): void {
    updateField("daysOfWeek", draft.daysOfWeek.includes(day)
      ? draft.daysOfWeek.filter((value) => value !== day)
      : [...draft.daysOfWeek, day]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const input = toMedicationInput(draft, schedule);
    const message = onSave(input);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (!onCancel) setDraft(createEmptyDraft());
  }

  return (
    <form className="tracking-form" onSubmit={handleSubmit} noValidate>
      <div className="tracking-form-grid">
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="medication-name">Medication name</label>
          <input className="field-input" id="medication-name" value={draft.name} onChange={(event) => updateField("name", event.target.value)} required aria-invalid={Boolean(error && error.includes("name"))} aria-describedby={error && error.includes("name") ? "medication-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="medication-dose">Prescribed dose</label>
          <input className="field-input" id="medication-dose" type="number" min="0" step="any" inputMode="decimal" value={draft.prescribedDose} onChange={(event) => updateField("prescribedDose", event.target.value)} required aria-invalid={Boolean(error && error.includes("dose greater than zero"))} aria-describedby={error && error.includes("dose greater than zero") ? "medication-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="medication-unit">Dose unit</label>
          <input className="field-input" id="medication-unit" value={draft.doseUnit} onChange={(event) => updateField("doseUnit", event.target.value)} placeholder="As prescribed" required aria-invalid={Boolean(error && error.includes("dose unit"))} aria-describedby={error && error.includes("dose unit") ? "medication-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="medication-time">Schedule time</label>
          <input className="field-input" id="medication-time" type="time" value={draft.time} onChange={(event) => updateField("time", event.target.value)} aria-invalid={Boolean(error && error.includes("time"))} aria-describedby={error && error.includes("time") ? "medication-form-error" : undefined} required />
        </div>
        <fieldset className="form-field form-field-wide tracking-days-field" aria-required="true" aria-invalid={Boolean(error && error.includes("schedule day"))} aria-describedby={error && error.includes("schedule day") ? "medication-form-error" : undefined}>
          <legend className="field-label" data-required="true">Schedule days</legend>
          <div className="tracking-day-options">
            {weekdays.map((day) => (
              <label className="condition-option" key={day.value}>
                <input type="checkbox" checked={draft.daysOfWeek.includes(day.value)} onChange={() => toggleDay(day.value)} />
                <span>{day.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-field form-field-wide">
          <label className="field-label" htmlFor="medication-notes">Notes (optional)</label>
          <textarea className="field-input tracking-notes" id="medication-notes" rows={3} value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </div>
      </div>
      {error && <p className="field-error" id="medication-form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button className="primary-action" type="submit">{medication ? "Save medication" : "Add medication"}</Button>
        {onCancel && <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

function MedicationDoseRow({
  medication,
  scheduleId,
  time,
  status,
  onStatusChange,
}: {
  medication: Medication;
  scheduleId: string;
  time: string;
  status: MedicationDoseDisplayStatus;
  onStatusChange: (status: MedicationDoseStatus | null) => void;
}) {
  return (
    <div className="today-medication-row">
      <div>
        <strong>{medication.name}</strong>
        <span className="tracking-subtext">{medication.prescribedDose} {medication.doseUnit} · Scheduled {time}</span>
      </div>
      <div className="today-medication-status">
        <span className={`dose-status dose-status-${status}`} role="status">
          {status === "not-recorded" ? "Not yet recorded" : status === "taken" ? "Marked taken" : "Marked skipped"}
        </span>
        <label className="visually-hidden" htmlFor={`dose-status-${scheduleId}`}>Dose status for {medication.name} at {time}</label>
        <select
          className="field-input field-select dose-status-select"
          id={`dose-status-${scheduleId}`}
          value={status}
          onChange={(event) => onStatusChange(event.target.value === "taken" || event.target.value === "skipped" ? event.target.value : null)}
        >
          <option value="not-recorded">Not yet recorded</option>
          <option value="taken">Mark taken</option>
          <option value="skipped">Mark skipped</option>
        </select>
      </div>
    </div>
  );
}

function MedicationsPage() {
  const {
    medications,
    medicationDoseRecords,
    addMedication,
    editMedication,
    deleteMedication,
    setMedicationDoseStatus,
  } = useHealthData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const today = new Date();
  const todayDate = toIsoDate(today);
  const todaySchedules = getTodaySchedules(medications, today);
  const doseHistory = sortMedicationDoseRecords(medicationDoseRecords);
  const editingMedication = editingId ? medications.find((entry) => entry.id === editingId) ?? null : null;

  function saveMedication(input: MedicationInput): string {
    const message = editingId ? editMedication(editingId, input) : addMedication(input);
    if (!message) {
      setEditingId(null);
      setStatus(editingId ? "Medication updated for this demo session." : "Medication added for this demo session.");
    }
    return message;
  }

  function updateDoseStatus(medicationId: string, scheduleId: string, doseStatus: MedicationDoseStatus | null): void {
    const message = setMedicationDoseStatus(medicationId, scheduleId, todayDate, doseStatus);
    setStatus(message || (doseStatus === null ? "Dose status cleared." : `Dose marked ${doseStatus}.`));
  }

  function confirmDelete(medication: Medication): void {
    if (!window.confirm(`Delete ${medication.name} and its dose history?`)) return;
    deleteMedication(medication.id);
    setStatus("Medication and its dose history deleted for this demo session.");
    if (editingId === medication.id) setEditingId(null);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your routine</p>
          <h1 className="page-title">Medications</h1>
          <p className="page-subtitle">Track a schedule you already follow. This is not a prescribing tool.</p>
        </div>
      </header>
      {status && <p className="form-status tracking-page-status" role="status" aria-live="polite">{status}</p>}
      <div className="tracking-page-grid">
        <section className="panel tracking-form-panel" aria-labelledby="medication-form-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="medication-form-title">{editingMedication ? "Edit medication" : "Add medication"}</h2>
              <p className="panel-caption">Enter the name, dose, unit, and schedule as prescribed to you.</p>
            </div>
          </div>
          <MedicationForm
            key={editingMedication?.id ?? "new-medication"}
            medication={editingMedication}
            onSave={saveMedication}
            onCancel={editingMedication ? () => setEditingId(null) : undefined}
          />
        </section>

        <section className="panel today-medications-panel" aria-labelledby="today-medications-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="today-medications-title">Today's schedule</h2>
              <p className="panel-caption">{formatDate(todayDate)} · Scheduled does not mean taken.</p>
            </div>
          </div>
          {todaySchedules.length > 0 ? (
            <div className="today-medication-list">
              {todaySchedules.map(({ medication, schedule }) => (
                <MedicationDoseRow
                  key={`${medication.id}-${schedule.id}`}
                  medication={medication}
                  scheduleId={schedule.id}
                  time={schedule.time}
                  status={getMedicationDoseStatus(medicationDoseRecords, medication.id, schedule.id, todayDate)}
                  onStatusChange={(doseStatus) => updateDoseStatus(medication.id, schedule.id, doseStatus)}
                />
              ))}
            </div>
          ) : (
            <div className="inline-empty-state" role="status">No medication doses are scheduled for today.</div>
          )}
        </section>

        <section className="panel medication-list-panel" aria-labelledby="medication-list-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="medication-list-title">Medication list</h2>
              <p className="panel-caption">{medications.length} fictional records in this session.</p>
            </div>
          </div>
          {medications.length > 0 ? medications.map((medication) => (
            <article className="tracking-record-row" key={medication.id}>
              <div>
                <h3>{medication.name}</h3>
                <p>{medication.prescribedDose} {medication.doseUnit} · {medication.schedules.map((schedule) => schedule.time).join(", ")}</p>
                {medication.notes && <p className="tracking-record-notes">{medication.notes}</p>}
              </div>
              <div className="record-actions">
                <Button className="text-button" type="button" onClick={() => { setEditingId(medication.id); setStatus(""); }}>Edit<span className="visually-hidden"> {medication.name}</span></Button>
                <Button className="text-button text-button-danger" type="button" onClick={() => confirmDelete(medication)}>Delete<span className="visually-hidden"> {medication.name}</span></Button>
              </div>
            </article>
          )) : (
            <div className="inline-empty-state" role="status">No medications added yet. Add a record of a medication you already take.</div>
          )}
        </section>

        <section className="panel dose-history-panel" aria-labelledby="dose-history-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="dose-history-title">Dose history</h2>
              <p className="panel-caption">Only doses you mark taken or skipped appear here.</p>
            </div>
          </div>
          {doseHistory.length > 0 ? (
            <div className="table-scroll" role="region" aria-label="Recorded medication dose history" tabIndex={0}>
              <table className="demo-data-table tracking-history-table">
                <caption className="visually-hidden">Recorded medication dose history</caption>
                <thead><tr><th scope="col">Date and time</th><th scope="col">Medication</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {doseHistory.map((record) => {
                    const medication = medications.find((entry) => entry.id === record.medicationId);
                    return (
                      <tr key={record.id}>
                        <td>{formatDate(record.date)} · {record.scheduledTime}</td>
                        <td>{medication?.name ?? "Removed medication"}</td>
                        <td>{record.status === "taken" ? "Marked taken" : "Marked skipped"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="inline-empty-state" role="status">No dose history has been recorded yet.</div>
          )}
        </section>
      </div>
      <p className="temporary-data-note" role="note">Medication tracking is for personal record keeping only. Follow your healthcare professional's instructions. Demo changes stay in temporary memory and disappear when the page refreshes.</p>
    </>
  );
}

export default MedicationsPage;