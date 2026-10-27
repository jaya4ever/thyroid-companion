import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@chakra-ui/react";
import { Download } from "lucide-react";
import { useHealthData } from "../../context/useHealthData.js";
import { formatActivityType } from "../../health/activityUtils.js";
import { calculateAge, isValidIsoDate, toIsoDate } from "../../health/healthUtils.js";
import {
  buildHealthReport,
  getPresetReportDateRange,
  reportSections,
  validateReportDateRange,
} from "../../health/reportUtils.js";
import type { ReportDateRange, ReportRangePreset, ReportSectionId } from "../../health/reportUtils.js";

const disclaimer = "Fictional Demo Data — Not for Medical Use";
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(value: string): string {
  if (!value) return "Not recorded";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHeight(heightCm: number, unit: "cm" | "imperial"): string {
  if (unit === "cm") return `${heightCm.toFixed(1)} cm`;
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  return `${feet} ft ${(totalInches - feet * 12).toFixed(1)} in`;
}

function formatReferenceRange(minimum?: number, maximum?: number, unit = ""): string {
  if (minimum === undefined && maximum === undefined) return "Not provided";
  const suffix = unit ? ` ${unit}` : "";
  if (minimum !== undefined && maximum !== undefined) return `${minimum}–${maximum}${suffix}`;
  if (minimum !== undefined) return `≥ ${minimum}${suffix}`;
  return `≤ ${maximum}${suffix}`;
}

function formatMetric(value: number | null, unit: string, recorded: number, missing: number): string {
  return `${value === null ? "Not recorded" : `${value} ${unit}`} (${recorded} recorded, ${missing} missing)`;
}

function ReportTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="table-scroll report-table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className="demo-data-table report-data-table">
        <caption>{caption}</caption>
        <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.length > 0
            ? rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)
            : <tr><td colSpan={headers.length}>Not recorded for this period.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-preview-section" aria-labelledby={`report-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <h3 className="panel-title" id={`report-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{title}</h3>
      {children}
    </section>
  );
}

function ReportsPage() {
  const {
    profile,
    weightEntries,
    labResults,
    medications,
    medicationDoseRecords,
    symptomCheckIns,
    nutritionEntries,
    hydrationEntries,
    activityEntries,
  } = useHealthData();
  const today = new Date();
  const todayString = toIsoDate(today);
  const [rangePreset, setRangePreset] = useState<ReportRangePreset>("30d");
  const [customRange, setCustomRange] = useState<ReportDateRange>(() => getPresetReportDateRange("30d"));
  const [selectedSections, setSelectedSections] = useState<ReportSectionId[]>(reportSections.map(({ id }) => id));
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const dateRange = rangePreset === "custom" ? customRange : getPresetReportDateRange(rangePreset, today);
  const rangeError = validateReportDateRange(dateRange, today);
  const startDateInvalid = rangePreset === "custom" && (!isValidIsoDate(customRange.startDate) || customRange.startDate > customRange.endDate);
  const endDateInvalid = rangePreset === "custom" && (!isValidIsoDate(customRange.endDate) || customRange.endDate > todayString || customRange.startDate > customRange.endDate);
  const report = buildHealthReport({
    profile,
    weightEntries,
    labResults,
    medications,
    medicationDoseRecords,
    symptomCheckIns,
    nutritionEntries,
    hydrationEntries,
    activityEntries,
  }, dateRange, selectedSections);
  const canDownload = selectedSections.length > 0 && !rangeError && !isExporting;

  function updateSection(section: ReportSectionId, checked: boolean): void {
    setSelectedSections((current) => checked
      ? [...current, section]
      : current.filter((entry) => entry !== section));
  }

  async function downloadPdf(): Promise<void> {
    if (!canDownload) return;
    setExportError("");
    setIsExporting(true);
    try {
      const { generateHealthReportPdf } = await import("../../health/reportPdf.js");
      await generateHealthReportPdf(report);
    } catch {
      setExportError("The PDF could not be generated. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function changeRangePreset(value: ReportRangePreset): void {
    setRangePreset(value);
    if (value !== "custom") setCustomRange(getPresetReportDateRange(value, today));
  }

  const hasSection = (section: ReportSectionId) => selectedSections.includes(section);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Shareable summary</p>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Choose what to include, review the summary, then download a PDF.</p>
        </div>
      </header>

      <section className="panel report-builder" aria-label="Report options">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">Report options</h2>
            <p className="panel-caption">Select a date range and the records to include.</p>
          </div>
          <Button className="primary-action" type="button" disabled={!canDownload} onClick={() => void downloadPdf()}>
            <Download size={16} aria-hidden="true" />
            {isExporting ? "Preparing PDF..." : "Download PDF"}
          </Button>
        </div>

        <div className="report-option-grid">
          <div className="form-field">
            <label className="field-label" htmlFor="report-range-preset">Date range</label>
            <select
              className="field-input field-select"
              id="report-range-preset"
              value={rangePreset}
              onChange={(event) => changeRangePreset(event.target.value as ReportRangePreset)}
            >
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="custom">Custom dates</option>
            </select>
          </div>
          {rangePreset === "custom" && (
            <>
              <div className="form-field">
                <label className="field-label" data-required="true" htmlFor="report-start-date">Start date</label>
                <input
                  className="field-input"
                  id="report-start-date"
                  type="date"
                  max={todayString}
                  required
                  value={customRange.startDate}
                  onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))}
                  aria-invalid={startDateInvalid}
                  aria-describedby={startDateInvalid ? "report-date-error" : undefined}
                />
              </div>
              <div className="form-field">
                <label className="field-label" data-required="true" htmlFor="report-end-date">End date</label>
                <input
                  className="field-input"
                  id="report-end-date"
                  type="date"
                  max={todayString}
                  required
                  value={customRange.endDate}
                  onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))}
                  aria-invalid={endDateInvalid}
                  aria-describedby={endDateInvalid ? "report-date-error" : undefined}
                />
              </div>
            </>
          )}
        </div>
        {rangeError && <p className="field-error" id="report-date-error" role="alert">{rangeError}</p>}

        <fieldset className="report-section-picker" aria-required="true" aria-invalid={selectedSections.length === 0} aria-describedby={selectedSections.length === 0 ? "report-sections-error" : undefined}>
          <legend className="field-label" data-required="true">Sections to include</legend>
          <div className="report-section-options">
            {reportSections.map(({ id, label }) => (
              <label className="report-section-option" key={id}>
                <input
                  type="checkbox"
                  checked={hasSection(id)}
                  onChange={(event) => updateSection(id, event.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {selectedSections.length === 0 && <p className="field-error" id="report-sections-error" role="alert">Select at least one report section.</p>}
        {exportError && <p className="field-error" role="alert">{exportError}</p>}
        <p className="report-disclaimer" role="note">{disclaimer}. This summary is for discussion only and does not provide diagnoses or treatment recommendations.</p>
      </section>

      <section className="panel report-preview" aria-labelledby="report-preview-title">
        <p className="visually-hidden" role="status">{selectedSections.length === 0 ? "No report sections selected." : `Report preview includes ${selectedSections.length} sections from ${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}.`}</p>
        <div className="panel-heading">
          <div>
            <h2 className="panel-title" id="report-preview-title">Report preview</h2>
            <p className="panel-caption">{formatDate(dateRange.startDate)} – {formatDate(dateRange.endDate)}</p>
          </div>
          <span className="report-preview-label">{disclaimer}</span>
        </div>
        {selectedSections.length === 0 ? (
          <p className="inline-empty-state">Choose one or more sections to preview the report.</p>
        ) : (
          <div className="report-preview-content">
            {hasSection("profile") && (
              <ReportSection title="Profile Summary">
                <dl className="report-profile-grid">
                  <div><dt>Name</dt><dd>{report.profile.name || "Not recorded"}</dd></div>
                  <div><dt>Date of birth</dt><dd>{formatDate(report.profile.dateOfBirth)}</dd></div>
                  <div><dt>Age</dt><dd>{calculateAge(report.profile.dateOfBirth) ?? "Not available"}</dd></div>
                  <div><dt>Height</dt><dd>{formatHeight(report.profile.heightCm, report.profile.heightUnit)}</dd></div>
                  <div><dt>Latest weight in selected period</dt><dd>{report.profile.latestWeight === null ? "Not recorded" : `${report.profile.latestWeight.toFixed(1)} ${report.profile.weightUnit}`}</dd></div>
                  <div><dt>BMI at latest weight in selected period</dt><dd>{report.profile.bmi ?? "Not recorded"}</dd></div>
                  <div><dt>Thyroid conditions recorded</dt><dd>{report.profile.thyroidConditions.join(", ") || "None recorded"}</dd></div>
                </dl>
              </ReportSection>
            )}

            {hasSection("weight") && (
              <ReportSection title="Weight and BMI History">
                <ReportTable
                  caption="Weight and calculated BMI by date"
                  headers={["Date", `Weight (${profile.weightUnit})`, "BMI"]}
                  rows={report.weightRecords.map((record) => [
                    formatDate(record.date),
                    record.displayWeight === null ? "Not recorded" : record.displayWeight.toFixed(1),
                    record.bmi === null ? "Not recorded" : record.bmi.toFixed(1),
                  ])}
                />
              </ReportSection>
            )}

            {hasSection("labs") && (
              <ReportSection title="Thyroid Lab Results">
                <ReportTable
                  caption="Thyroid lab results with user-entered reference ranges"
                  headers={["Date", "Test", "Result", "Reference range"]}
                  rows={report.labResults.map((result) => [
                    formatDate(result.date), result.testType, `${result.value} ${result.unit}`,
                    formatReferenceRange(result.referenceMin, result.referenceMax, result.unit),
                  ])}
                />
              </ReportSection>
            )}

            {hasSection("medications") && (
              <ReportSection title="Medication Tracking and Recorded Doses">
                <ReportTable
                  caption="Medication schedules currently recorded"
                  headers={["Medication", "Prescribed dose", "Schedule"]}
                  rows={report.medications.map((medication) => [
                    medication.name,
                    `${medication.prescribedDose} ${medication.doseUnit}`,
                    medication.schedules.map((schedule) => {
                      const days = schedule.daysOfWeek.map((day) => weekdayNames[day]).join("/");
                      return days ? `${days} ${schedule.time}` : schedule.time;
                    }).join(", ") || "No schedule recorded",
                  ])}
                />
                <ReportTable
                  caption="Medication dose events recorded during this date range"
                  headers={["Date", "Medication", "Scheduled time", "Recorded at", "Recorded status"]}
                  rows={report.medicationDoseRecords.map((record) => [
                    formatDate(record.date),
                    medications.find((medication) => medication.id === record.medicationId)?.name ?? "Medication not found",
                    record.scheduledTime,
                    formatDateTime(record.recordedAt),
                    record.status === "taken" ? "Recorded as taken" : "Recorded as skipped",
                  ])}
                />
                <p className="field-hint">Only explicitly recorded dose events are shown; no dose status is inferred.</p>
              </ReportSection>
            )}

            {hasSection("symptoms") && (
              <ReportSection title="Symptom History">
                {report.symptomCheckIns.length > 0 ? report.symptomCheckIns.map((entry) => (
                  <article className="report-symptom-entry" key={entry.id}>
                    <h4>{formatDateTime(entry.occurredAt)}</h4>
                    <dl className="report-symptom-grid">
                      <div><dt>Energy</dt><dd>{entry.energy} / 5</dd></div>
                      <div><dt>Fatigue</dt><dd>{entry.fatigue} / 5</dd></div>
                      <div><dt>Sleep quality</dt><dd>{entry.sleepQuality} / 5</dd></div>
                      <div><dt>Mood</dt><dd>{entry.mood} / 5</dd></div>
                      <div><dt>Focus</dt><dd>{entry.focus} / 5</dd></div>
                      <div><dt>Temperature comfort</dt><dd>{entry.temperatureComfort} / 5</dd></div>
                      <div><dt>Digestion</dt><dd>{entry.digestion} / 5</dd></div>
                    </dl>
                    {entry.notes && <p className="report-note"><strong>Note:</strong> {entry.notes}</p>}
                  </article>
                )) : <p className="inline-empty-state">Not recorded for this period.</p>}
                <p className="field-hint">Ratings are self-reported and are not medical conclusions.</p>
              </ReportSection>
            )}

            {hasSection("nutrition") && (
              <ReportSection title="Nutrition and Hydration Summaries">
                <ReportTable
                  caption="Daily nutrition totals, missing-entry counts, and recorded hydration"
                  headers={["Date", "Calories", "Protein", "Carbohydrates", "Fat", "Water"]}
                  rows={report.nutritionDays.map((day) => [
                    formatDate(day.date),
                    formatMetric(day.totals.calories.total, "kcal", day.totals.calories.recordedEntries, day.totals.calories.missingEntries),
                    formatMetric(day.totals.proteinGrams.total, "g", day.totals.proteinGrams.recordedEntries, day.totals.proteinGrams.missingEntries),
                    formatMetric(day.totals.carbohydratesGrams.total, "g", day.totals.carbohydratesGrams.recordedEntries, day.totals.carbohydratesGrams.missingEntries),
                    formatMetric(day.totals.fatGrams.total, "g", day.totals.fatGrams.recordedEntries, day.totals.fatGrams.missingEntries),
                    day.hydrationTotalMl === null ? "Not recorded" : `${day.hydrationTotalMl} mL`,
                  ])}
                />
              </ReportSection>
            )}

            {hasSection("activity") && (
              <ReportSection title="Activity History">
                <ReportTable
                  caption="Recorded activity entries"
                  headers={["Date", "Activity", "Duration", "Distance"]}
                  rows={report.activityEntries.map((entry) => [
                    formatDate(entry.date), formatActivityType(entry.activityType), `${entry.durationMinutes} min`,
                    entry.distanceKm === undefined ? "Not recorded" : `${entry.distanceKm} km`,
                  ])}
                />
              </ReportSection>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default ReportsPage;