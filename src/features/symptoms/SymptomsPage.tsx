import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@chakra-ui/react";
import { useHealthData } from "../../context/useHealthData.js";
import { createLocalDateTime, isSymptomRating, symptomRatingFields } from "../../health/trackingUtils.js";
import type { SymptomCheckInInput, SymptomRatingField } from "../../health/trackingUtils";
import type { SymptomCheckIn, SymptomRating } from "../../types/health";

type SymptomDraft = {
  occurredAt: string;
  notes: string;
} & Record<SymptomRatingField, number | null>;

function createEmptyDraft(): SymptomDraft {
  return {
    occurredAt: createLocalDateTime(),
    energy: null,
    fatigue: null,
    sleepQuality: null,
    mood: null,
    focus: null,
    temperatureComfort: null,
    digestion: null,
    notes: "",
  };
}

function createDraft(entry: SymptomCheckIn | null): SymptomDraft {
  if (!entry) return createEmptyDraft();
  return {
    occurredAt: entry.occurredAt,
    energy: entry.energy,
    fatigue: entry.fatigue,
    sleepQuality: entry.sleepQuality,
    mood: entry.mood,
    focus: entry.focus,
    temperatureComfort: entry.temperatureComfort,
    digestion: entry.digestion,
    notes: entry.notes ?? "",
  };
}

function toSymptomInput(draft: SymptomDraft): SymptomCheckInInput | null {
  const energy = draft.energy;
  const fatigue = draft.fatigue;
  const sleepQuality = draft.sleepQuality;
  const mood = draft.mood;
  const focus = draft.focus;
  const temperatureComfort = draft.temperatureComfort;
  const digestion = draft.digestion;
  if (
    energy === null ||
    !isSymptomRating(energy) ||
    fatigue === null ||
    !isSymptomRating(fatigue) ||
    sleepQuality === null ||
    !isSymptomRating(sleepQuality) ||
    mood === null ||
    !isSymptomRating(mood) ||
    focus === null ||
    !isSymptomRating(focus) ||
    temperatureComfort === null ||
    !isSymptomRating(temperatureComfort) ||
    digestion === null ||
    !isSymptomRating(digestion)
  )
    return null;

  return {
    occurredAt: draft.occurredAt,
    energy,
    fatigue,
    sleepQuality,
    mood,
    focus,
    temperatureComfort,
    digestion,
    notes: draft.notes,
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RatingInput({
  field,
  value,
  onChange,
  error,
}: {
  field: (typeof symptomRatingFields)[number];
  value: number | null;
  onChange: (rating: SymptomRating) => void;
  error: string;
}) {
  const groupId = `symptom-rating-${field.key}`;
  return (
    <fieldset className="symptom-rating-field">
      <legend className="field-label" data-required="true">{field.label}</legend>
      <div className="rating-endpoints" aria-hidden="true">
        <span>1 · {field.lowLabel}</span>
        <span>5 · {field.highLabel}</span>
      </div>
      <div
        className="rating-options"
        role="radiogroup"
        aria-label={`${field.label}, from 1 ${field.lowLabel.toLocaleLowerCase()} to 5 ${field.highLabel.toLocaleLowerCase()}`}
        aria-required="true"
        aria-invalid={Boolean(error && error.includes(field.label.toLocaleLowerCase()))}
        aria-describedby={error && error.includes(field.label.toLocaleLowerCase()) ? "symptom-form-error" : undefined}
      >
        {[1, 2, 3, 4, 5].map((rating) => (
          <label className="rating-option" key={rating}>
            <input
              type="radio"
              name={groupId}
              value={rating}
              checked={value === rating}
              required
              onChange={() => onChange(rating as SymptomRating)}
            />
            <span>{rating}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SymptomForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: SymptomCheckIn | null;
  onSave: (input: SymptomCheckInInput) => string;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(() => createDraft(entry));
  const [error, setError] = useState("");

  function setRating(field: SymptomRatingField, rating: SymptomRating): void {
    setDraft((current) => ({ ...current, [field]: rating }));
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const input = toSymptomInput(draft);
    if (!input) {
      setError("Choose a rating from 1 to 5 for each check-in area.");
      return;
    }
    const message = onSave(input);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (!onCancel) setDraft(createEmptyDraft());
  }

  return (
    <form className="tracking-form symptom-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="field-label" data-required="true" htmlFor="symptom-datetime">
          Date and time
        </label>
        <input
          className="field-input"
          id="symptom-datetime"
          type="datetime-local"
          value={draft.occurredAt}
          onChange={(event) => {
            setDraft((current) => ({ ...current, occurredAt: event.target.value }));
            setError("");
          }}
          aria-invalid={Boolean(error && (error.includes("time") || error.includes("date")))}
          aria-describedby={error ? "symptom-form-error" : undefined}
          required
        />
      </div>
      <div className="symptom-rating-grid">
        {symptomRatingFields.map((field) => (
          <RatingInput
            key={field.key}
            field={field}
            value={draft[field.key]}
            onChange={(rating) => setRating(field.key, rating)}
            error={error}
          />
        ))}
      </div>
      <div className="form-field">
          <label className="field-label" htmlFor="symptom-notes">
          Notes (optional)
        </label>
        <textarea
          className="field-input tracking-notes"
          id="symptom-notes"
          rows={3}
          value={draft.notes}
          onChange={(event) => {
            setDraft((current) => ({ ...current, notes: event.target.value }));
            setError("");
          }}
        />
      </div>
      {error && (
          <p className="field-error" id="symptom-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button className="primary-action" type="submit">
          {entry ? "Save check-in" : "Add check-in"}
        </Button>
        {onCancel && (
          <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function RatingSummary({ entry }: { entry: SymptomCheckIn }) {
  return (
    <dl className="symptom-rating-summary">
      {symptomRatingFields.map((field) => (
        <div key={field.key}>
          <dt>{field.label}</dt>
          <dd>{entry[field.key]} / 5</dd>
        </div>
      ))}
    </dl>
  );
}

function SymptomsPage() {
  const { symptomCheckIns, addSymptomCheckIn, editSymptomCheckIn, deleteSymptomCheckIn } = useHealthData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const editingEntry = editingId ? (symptomCheckIns.find((entry) => entry.id === editingId) ?? null) : null;

  function saveCheckIn(input: SymptomCheckInInput): string {
    const message = editingId ? editSymptomCheckIn(editingId, input) : addSymptomCheckIn(input);
    if (!message) {
      setEditingId(null);
      setStatus(editingId ? "Check-in updated for this demo session." : "Check-in added for this demo session.");
    }
    return message;
  }

  function confirmDelete(entry: SymptomCheckIn): void {
    if (!window.confirm(`Delete the check-in from ${formatDateTime(entry.occurredAt)}?`)) return;
    deleteSymptomCheckIn(entry.id);
    setStatus("Check-in deleted for this demo session.");
    if (editingId === entry.id) setEditingId(null);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Daily notes</p>
          <h1 className="page-title">Symptom check-ins</h1>
          <p className="page-subtitle">Record how you feel over time, in your own words.</p>
        </div>
      </header>
      {status && (
        <p className="form-status tracking-page-status" role="status" aria-live="polite">
          {status}
        </p>
      )}
      <div className="tracking-page-grid symptom-page-grid">
        <section className="panel symptom-entry-panel" aria-labelledby="symptom-entry-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="symptom-entry-title">
                {editingEntry ? "Edit check-in" : "New check-in"}
              </h2>
              <p className="panel-caption">Choose one rating per area. These personal ratings are not a diagnosis.</p>
            </div>
          </div>
          <SymptomForm
            key={editingEntry?.id ?? "new-symptom-check-in"}
            entry={editingEntry}
            onSave={saveCheckIn}
            onCancel={editingEntry ? () => setEditingId(null) : undefined}
          />
        </section>
        <section className="panel symptom-history-panel" aria-labelledby="symptom-history-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="symptom-history-title">
                Check-in history
              </h2>
              <p className="panel-caption">{symptomCheckIns.length} fictional entries, newest first.</p>
            </div>
          </div>
          {symptomCheckIns.length > 0 ? (
            <div className="symptom-history-list">
              {symptomCheckIns.map((entry) => (
                <article className="symptom-history-entry" key={entry.id}>
                  <div className="symptom-history-header">
                    <h3>{formatDateTime(entry.occurredAt)}</h3>
                    <div className="record-actions">
                      <Button
                        className="text-button"
                        type="button"
                        onClick={() => {
                          setEditingId(entry.id);
                          setStatus("");
                        }}
                      >
                        Edit<span className="visually-hidden"> check-in from {entry.occurredAt}</span>
                      </Button>
                      <Button
                        className="text-button text-button-danger"
                        type="button"
                        onClick={() => confirmDelete(entry)}
                      >
                        Delete<span className="visually-hidden"> check-in from {entry.occurredAt}</span>
                      </Button>
                    </div>
                  </div>
                  <RatingSummary entry={entry} />
                  {entry.notes && <p className="symptom-entry-notes">{entry.notes}</p>}
                </article>
              ))}
            </div>
          ) : (
            <div className="inline-empty-state" role="status">
              No check-ins yet. Add your first personal entry above.
            </div>
          )}
        </section>
      </div>
      <p className="temporary-data-note" role="note">
        These check-ins are personal observations, not a diagnosis, and are not automatically attributed to a thyroid
        condition. Discuss health concerns with your healthcare professional. Changes stay in temporary memory and
        disappear when the page refreshes.
      </p>
    </>
  );
}

export default SymptomsPage;
