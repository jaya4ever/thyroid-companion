import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@chakra-ui/react";
import { useHealthData } from "../../context/useHealthData.js";
import {
  filterNutritionEntries,
  getDailyHydrationTotal,
  getDailyNutritionTotals,
  hydrationAmountToMilliliters,
  millilitersToHydrationAmount,
  nutritionMetricLabels,
  sortHydrationEntries,
} from "../../health/nutritionUtils.js";
import type { HydrationEntryInput, NutritionEntryInput, NutritionMetric } from "../../health/nutritionUtils";
import { toIsoDate } from "../../health/healthUtils.js";
import type { HydrationUnit, MealCategory, NutritionEntry } from "../../types/health";

interface NutritionDraft {
  date: string;
  mealCategory: MealCategory;
  foodName: string;
  servingDescription: string;
  calories: string;
  proteinGrams: string;
  carbohydratesGrams: string;
  fatGrams: string;
  notes: string;
}

interface HydrationDraft {
  date: string;
  amount: string;
  unit: HydrationUnit;
}

const mealCategories: MealCategory[] = ["breakfast", "lunch", "dinner", "snack"];
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function createNutritionDraft(entry: NutritionEntry | null): NutritionDraft {
  return {
    date: entry?.date ?? toIsoDate(new Date()),
    mealCategory: entry?.mealCategory ?? "breakfast",
    foodName: entry?.foodName ?? "",
    servingDescription: entry?.servingDescription ?? "",
    calories: entry?.calories === undefined ? "" : String(entry.calories),
    proteinGrams: entry?.proteinGrams === undefined ? "" : String(entry.proteinGrams),
    carbohydratesGrams: entry?.carbohydratesGrams === undefined ? "" : String(entry.carbohydratesGrams),
    fatGrams: entry?.fatGrams === undefined ? "" : String(entry.fatGrams),
    notes: entry?.notes ?? "",
  };
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

function toNutritionInput(draft: NutritionDraft): NutritionEntryInput {
  const input: NutritionEntryInput = {
    date: draft.date,
    mealCategory: draft.mealCategory,
    foodName: draft.foodName,
  };
  const servingDescription = draft.servingDescription.trim();
  const notes = draft.notes.trim();
  if (servingDescription) input.servingDescription = servingDescription;
  if (notes) input.notes = notes;
  const calories = optionalNumber(draft.calories);
  const proteinGrams = optionalNumber(draft.proteinGrams);
  const carbohydratesGrams = optionalNumber(draft.carbohydratesGrams);
  const fatGrams = optionalNumber(draft.fatGrams);
  if (calories !== undefined) input.calories = calories;
  if (proteinGrams !== undefined) input.proteinGrams = proteinGrams;
  if (carbohydratesGrams !== undefined) input.carbohydratesGrams = carbohydratesGrams;
  if (fatGrams !== undefined) input.fatGrams = fatGrams;
  return input;
}

function createHydrationDraft(entry: { date: string; amountMl: number } | null, unit: HydrationUnit): HydrationDraft {
  const amount = entry ? millilitersToHydrationAmount(entry.amountMl, unit) : null;
  return {
    date: entry?.date ?? toIsoDate(new Date()),
    amount: amount === null ? "" : String(Number(amount.toFixed(unit === "ml" ? 0 : 2))),
    unit,
  };
}

function toHydrationInput(draft: HydrationDraft): HydrationEntryInput {
  const amount = draft.amount.trim() === "" ? Number.NaN : Number(draft.amount);
  return {
    date: draft.date,
    amountMl: hydrationAmountToMilliliters(amount, draft.unit) ?? Number.NaN,
  };
}

function NutritionForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: NutritionEntry | null;
  onSave: (input: NutritionEntryInput) => string;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(() => createNutritionDraft(entry));
  const [error, setError] = useState("");

  function updateField<Field extends keyof NutritionDraft>(field: Field, value: NutritionDraft[Field]): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = onSave(toNutritionInput(draft));
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (!onCancel) setDraft(createNutritionDraft(null));
  }

  return (
    <form className="tracking-form" onSubmit={handleSubmit} noValidate>
      <div className="tracking-form-grid">
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="nutrition-date">Entry date</label>
          <input className="field-input" id="nutrition-date" type="date" value={draft.date} onChange={(event) => updateField("date", event.target.value)} required aria-invalid={Boolean(error && error.toLowerCase().includes("date"))} aria-describedby={error && error.toLowerCase().includes("date") ? "nutrition-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="nutrition-meal">Meal category</label>
          <select className="field-input field-select" id="nutrition-meal" value={draft.mealCategory} onChange={(event) => updateField("mealCategory", event.target.value as MealCategory)} required aria-invalid={Boolean(error.includes("meal category"))} aria-describedby={error.includes("meal category") ? "nutrition-form-error" : undefined}>
            {mealCategories.map((meal) => <option key={meal} value={meal}>{meal[0].toUpperCase() + meal.slice(1)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="nutrition-food">Food name</label>
          <input className="field-input" id="nutrition-food" value={draft.foodName} onChange={(event) => updateField("foodName", event.target.value)} required aria-invalid={Boolean(error.includes("food name"))} aria-describedby={error.includes("food name") ? "nutrition-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="nutrition-serving">Serving description (optional)</label>
          <input className="field-input" id="nutrition-serving" value={draft.servingDescription} onChange={(event) => updateField("servingDescription", event.target.value)} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="nutrition-calories">Calories (optional)</label>
          <input className="field-input" id="nutrition-calories" type="number" min="0" step="any" inputMode="decimal" value={draft.calories} onChange={(event) => updateField("calories", event.target.value)} aria-invalid={Boolean(error.includes("calories"))} aria-describedby={error.includes("calories") ? "nutrition-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="nutrition-protein">Protein in grams (optional)</label>
          <input className="field-input" id="nutrition-protein" type="number" min="0" step="any" inputMode="decimal" value={draft.proteinGrams} onChange={(event) => updateField("proteinGrams", event.target.value)} aria-invalid={Boolean(error.includes("protein"))} aria-describedby={error.includes("protein") ? "nutrition-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="nutrition-carbohydrates">Carbohydrates in grams (optional)</label>
          <input className="field-input" id="nutrition-carbohydrates" type="number" min="0" step="any" inputMode="decimal" value={draft.carbohydratesGrams} onChange={(event) => updateField("carbohydratesGrams", event.target.value)} aria-invalid={Boolean(error.includes("carbohydrates"))} aria-describedby={error.includes("carbohydrates") ? "nutrition-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="nutrition-fat">Fat in grams (optional)</label>
          <input className="field-input" id="nutrition-fat" type="number" min="0" step="any" inputMode="decimal" value={draft.fatGrams} onChange={(event) => updateField("fatGrams", event.target.value)} aria-invalid={Boolean(error.includes("fat"))} aria-describedby={error.includes("fat") ? "nutrition-form-error" : undefined} />
        </div>
        <div className="form-field form-field-wide">
          <label className="field-label" htmlFor="nutrition-notes">Notes (optional)</label>
          <textarea className="field-input tracking-notes" id="nutrition-notes" rows={3} value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </div>
      </div>
      {error && <p className="field-error" id="nutrition-form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button className="primary-action" type="submit">{entry ? "Save food entry" : "Add food entry"}</Button>
        {onCancel && <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

function HydrationForm({
  entry,
  displayUnit,
  onSave,
  onCancel,
}: {
  entry: { id: string; date: string; amountMl: number } | null;
  displayUnit: HydrationUnit;
  onSave: (input: HydrationEntryInput) => string;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(() => createHydrationDraft(entry, displayUnit));
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = onSave(toHydrationInput(draft));
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (!onCancel) setDraft(createHydrationDraft(null, displayUnit));
  }

  return (
    <form className="tracking-form hydration-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="field-label" data-required="true" htmlFor="hydration-date">Intake date</label>
        <input className="field-input" id="hydration-date" type="date" value={draft.date} onChange={(event) => { setDraft((current) => ({ ...current, date: event.target.value })); setError(""); }} required aria-invalid={Boolean(error && error.toLowerCase().includes("date"))} aria-describedby={error && error.toLowerCase().includes("date") ? "hydration-form-error" : undefined} />
      </div>
      <div className="hydration-amount-row">
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="hydration-amount">Water amount</label>
          <input className="field-input" id="hydration-amount" type="number" min="0" step="any" inputMode="decimal" value={draft.amount} onChange={(event) => { setDraft((current) => ({ ...current, amount: event.target.value })); setError(""); }} required aria-invalid={Boolean(error && error.toLowerCase().includes("amount"))} aria-describedby={error && error.toLowerCase().includes("amount") ? "hydration-form-error" : undefined} />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="hydration-unit">Unit</label>
          <select className="field-input field-select" id="hydration-unit" value={draft.unit} onChange={(event) => { setDraft((current) => ({ ...current, unit: event.target.value as HydrationUnit })); setError(""); }} required>
            <option value="ml">Milliliters (mL)</option>
            <option value="fl-oz">US fluid ounces (fl oz)</option>
          </select>
        </div>
      </div>
      {error && <p className="field-error" id="hydration-form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button className="primary-action" type="submit">{entry ? "Save water entry" : "Add water entry"}</Button>
        {onCancel && <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

function formatHydration(amountMl: number, unit: HydrationUnit): string {
  const amount = millilitersToHydrationAmount(amountMl, unit);
  if (amount === null) return "Not recorded";
  return `${Number(amount.toFixed(unit === "ml" ? 0 : 2))} ${unit === "ml" ? "mL" : "fl oz"}`;
}

function nutritionValue(entry: NutritionEntry, metric: NutritionMetric): string {
  const value = entry[metric];
  if (value === undefined) return `${nutritionMetricLabels[metric].label}: Not recorded`;
  return `${nutritionMetricLabels[metric].label}: ${value} ${nutritionMetricLabels[metric].unit}`;
}

function NutritionPage() {
  const {
    nutritionEntries,
    addNutritionEntry,
    editNutritionEntry,
    deleteNutritionEntry,
    hydrationEntries,
    addHydrationEntry,
    editHydrationEntry,
    deleteHydrationEntry,
  } = useHealthData();
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [displayUnit, setDisplayUnit] = useState<HydrationUnit>("ml");
  const [editingNutritionId, setEditingNutritionId] = useState<string | null>(null);
  const [editingHydrationId, setEditingHydrationId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const filteredNutrition = filterNutritionEntries(nutritionEntries, selectedDate || "all");
  const filteredHydration = sortHydrationEntries(selectedDate
    ? hydrationEntries.filter((entry) => entry.date === selectedDate)
    : hydrationEntries);
  const totals = selectedDate ? getDailyNutritionTotals(nutritionEntries, selectedDate) : null;
  const hydrationTotal = selectedDate ? getDailyHydrationTotal(hydrationEntries, selectedDate) : null;
  const editingNutrition = editingNutritionId
    ? nutritionEntries.find((entry) => entry.id === editingNutritionId) ?? null
    : null;
  const editingHydration = editingHydrationId
    ? hydrationEntries.find((entry) => entry.id === editingHydrationId) ?? null
    : null;

  const groupedEntries = new Map<string, Map<MealCategory, NutritionEntry[]>>();
  for (const entry of filteredNutrition) {
    const meals = groupedEntries.get(entry.date) ?? new Map<MealCategory, NutritionEntry[]>();
    const mealEntries = meals.get(entry.mealCategory) ?? [];
    mealEntries.push(entry);
    meals.set(entry.mealCategory, mealEntries);
    groupedEntries.set(entry.date, meals);
  }

  function saveNutrition(input: NutritionEntryInput): string {
    const message = editingNutritionId
      ? editNutritionEntry(editingNutritionId, input)
      : addNutritionEntry(input);
    if (!message) {
      setEditingNutritionId(null);
      setStatus(editingNutritionId ? "Food entry updated for this demo session." : "Food entry added for this demo session.");
    }
    return message;
  }

  function saveHydration(input: HydrationEntryInput): string {
    const message = editingHydrationId
      ? editHydrationEntry(editingHydrationId, input)
      : addHydrationEntry(input);
    if (!message) {
      setEditingHydrationId(null);
      setStatus(editingHydrationId ? "Water entry updated for this demo session." : "Water entry added for this demo session.");
    }
    return message;
  }

  function confirmDeleteNutrition(entry: NutritionEntry): void {
    if (!window.confirm(`Delete ${entry.foodName} from ${formatDate(entry.date)}?`)) return;
    deleteNutritionEntry(entry.id);
    setStatus("Food entry deleted for this demo session.");
    if (editingNutritionId === entry.id) setEditingNutritionId(null);
  }

  function confirmDeleteHydration(entry: { id: string; date: string; amountMl: number }): void {
    if (!window.confirm(`Delete this water entry from ${formatDate(entry.date)}?`)) return;
    deleteHydrationEntry(entry.id);
    setStatus("Water entry deleted for this demo session.");
    if (editingHydrationId === entry.id) setEditingHydrationId(null);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Personal records</p>
          <h1 className="page-title">Nutrition</h1>
          <p className="page-subtitle">Record food and water values you choose to track. No targets or food judgments.</p>
        </div>
      </header>
      {status && <p className="form-status tracking-page-status" role="status" aria-live="polite">{status}</p>}
      <div className="tracking-page-grid nutrition-page-grid">
        <section className="panel nutrition-entry-panel" aria-labelledby="nutrition-entry-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="nutrition-entry-title">{editingNutrition ? "Edit food entry" : "Add food entry"}</h2>
              <p className="panel-caption">Nutrition values are optional and must be entered manually.</p>
            </div>
          </div>
          <NutritionForm
            key={editingNutrition?.id ?? "new-nutrition-entry"}
            entry={editingNutrition}
            onSave={saveNutrition}
            onCancel={editingNutrition ? () => setEditingNutritionId(null) : undefined}
          />
        </section>

        <section className="panel nutrition-summary-panel" aria-labelledby="nutrition-summary-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="nutrition-summary-title">Daily nutrition totals</h2>
              <p className="panel-caption">Totals include only values recorded for the selected date.</p>
            </div>
          </div>
          <div className="form-field nutrition-date-filter">
            <label className="field-label" htmlFor="nutrition-filter-date">Date filter</label>
            <input className="field-input" id="nutrition-filter-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            <button className="text-button" type="button" onClick={() => setSelectedDate("")}>Show all dates</button>
          </div>
          {totals ? (
            <dl className="nutrition-totals-grid">
              {(Object.keys(nutritionMetricLabels) as NutritionMetric[]).map((metric) => {
                const total = totals[metric];
                const label = nutritionMetricLabels[metric];
                return (
                  <div key={metric}>
                    <dt>{label.label}</dt>
                    <dd>{total.total === null ? "Not recorded" : `${total.total} ${label.unit}`}</dd>
                    <span className="tracking-subtext">
                      {total.recordedEntries} recorded{total.missingEntries > 0 ? ` · ${total.missingEntries} missing` : ""}
                    </span>
                  </div>
                );
              })}
            </dl>
          ) : (
            <div className="inline-empty-state" role="status">Choose a date to see its nutrition totals.</div>
          )}
        </section>

        <section className="panel nutrition-history-panel" aria-labelledby="nutrition-history-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="nutrition-history-title">Food history</h2>
              <p className="panel-caption">{filteredNutrition.length} records · grouped by date and meal</p>
            </div>
          </div>
          {groupedEntries.size > 0 ? (
            <div className="nutrition-day-list">
              {[...groupedEntries.entries()].map(([date, meals]) => (
                <section className="nutrition-day-group" key={date} aria-label={`Food entries for ${formatDate(date)}`}>
                  <h3>{formatDate(date)}</h3>
                  {mealCategories.map((meal) => {
                    const entries = meals.get(meal) ?? [];
                    if (entries.length === 0) return null;
                    return (
                      <section className="nutrition-meal-group" key={meal} aria-label={meal[0].toUpperCase() + meal.slice(1)}>
                        <h4>{meal[0].toUpperCase() + meal.slice(1)}</h4>
                        {entries.map((entry) => (
                          <article className="tracking-record-row nutrition-record-row" key={entry.id}>
                            <div>
                              <h5>{entry.foodName}</h5>
                              {entry.servingDescription && <p>{entry.servingDescription}</p>}
                              <div className="nutrition-record-values">
                                {(Object.keys(nutritionMetricLabels) as NutritionMetric[]).map((metric) => (
                                  <span key={metric}>{nutritionValue(entry, metric)}</span>
                                ))}
                              </div>
                              {entry.notes && <p className="tracking-record-notes">{entry.notes}</p>}
                            </div>
                            <div className="record-actions">
                              <Button className="text-button" type="button" onClick={() => { setEditingNutritionId(entry.id); setStatus(""); }}>Edit<span className="visually-hidden"> {entry.foodName}</span></Button>
                              <Button className="text-button text-button-danger" type="button" onClick={() => confirmDeleteNutrition(entry)}>Delete<span className="visually-hidden"> {entry.foodName}</span></Button>
                            </div>
                          </article>
                        ))}
                      </section>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : (
            <div className="inline-empty-state" role="status">No food entries match this date. Add a fictional record above.</div>
          )}
        </section>

        <section className="panel hydration-panel" aria-labelledby="hydration-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="hydration-title">Hydration</h2>
              <p className="panel-caption">Record water intake without a prescribed target.</p>
            </div>
          </div>
          <div className="hydration-display-unit">
            <label className="field-label" htmlFor="hydration-display-unit">Display unit</label>
            <select className="field-input field-select" id="hydration-display-unit" value={displayUnit} onChange={(event) => setDisplayUnit(event.target.value as HydrationUnit)}>
              <option value="ml">Milliliters (mL)</option>
              <option value="fl-oz">US fluid ounces (fl oz)</option>
            </select>
          </div>
          {selectedDate ? (
            <p className="hydration-daily-total">
              {hydrationTotal === null ? "No water amount recorded for this date." : `Recorded total: ${formatHydration(hydrationTotal, displayUnit)}`}
            </p>
          ) : <p className="field-hint">Select one date above to see a daily water total.</p>}
          <h3 className="hydration-form-title">{editingHydration ? "Edit water entry" : "Add water entry"}</h3>
          <HydrationForm
            key={`${editingHydration?.id ?? "new-water-entry"}-${displayUnit}`}
            entry={editingHydration}
            displayUnit={displayUnit}
            onSave={saveHydration}
            onCancel={editingHydration ? () => setEditingHydrationId(null) : undefined}
          />
          <div className="hydration-history-list">
            <h3>Water history</h3>
            {filteredHydration.length > 0 ? filteredHydration.map((entry) => (
              <div className="hydration-history-row" key={entry.id}>
                <span>{formatDate(entry.date)} · {formatHydration(entry.amountMl, displayUnit)}</span>
                <div className="record-actions">
                  <Button className="text-button" type="button" onClick={() => { setEditingHydrationId(entry.id); setStatus(""); }}>Edit<span className="visually-hidden"> water entry from {entry.date}</span></Button>
                  <Button className="text-button text-button-danger" type="button" onClick={() => confirmDeleteHydration(entry)}>Delete<span className="visually-hidden"> water entry from {entry.date}</span></Button>
                </div>
              </div>
            )) : <div className="inline-empty-state" role="status">No water entries match this date.</div>}
          </div>
        </section>
      </div>
      <p className="temporary-data-note" role="note">Nutrition and hydration are personal tracking records, not dietary recommendations or targets. Demo changes stay in temporary memory and disappear when the page refreshes.</p>
    </>
  );
}

export default NutritionPage;