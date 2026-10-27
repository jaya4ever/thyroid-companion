import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useHealthData } from "../../context/useHealthData.js";
import { sortSymptomCheckIns, symptomRatingFields } from "../../health/trackingUtils.js";
import { getActivityDailySeries } from "../../health/activityUtils.js";
import type { ActivityRange } from "../../health/activityUtils";
import {
  getHydrationDailySeries,
  getNutritionDailySeries,
  millilitersToHydrationAmount,
  nutritionMetricLabels,
} from "../../health/nutritionUtils.js";
import type { NutritionMetric, NutritionRange } from "../../health/nutritionUtils";
import type { SymptomRatingField } from "../../health/trackingUtils";
import { toIsoDate } from "../../health/healthUtils.js";
import type { HydrationUnit } from "../../types/health";

type TrendCategory = "symptoms" | "activity" | "hydration" | "nutrition";
type TrendRange = ActivityRange & NutritionRange;

const trendRanges: { value: TrendRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const nutritionTrendMetrics: NutritionMetric[] = ["calories", "proteinGrams", "carbohydratesGrams", "fatGrams"];

function formatDate(value: string, includeTime = false): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!includeTime || !value.includes("T")) return formattedDate;
  const time = new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${formattedDate}, ${time}`;
}

function withinRange(date: string, range: TrendRange, today: Date): boolean {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - Number.parseInt(range, 10) + 1);
  return date.slice(0, 10) >= toIsoDate(start) && date.slice(0, 10) <= toIsoDate(end);
}

function TrendChartPanel({
  title,
  unit,
  values,
  minimum,
}: {
  title: string;
  unit: string;
  values: Array<{ date: string; value: number | null }>;
  minimum: number;
}) {
  const recordedValues = values.filter((entry) => entry.value !== null);
  const dateCounts = new Map<string, number>();
  for (const entry of values) {
    const day = entry.date.slice(0, 10);
    dateCounts.set(day, (dateCounts.get(day) ?? 0) + 1);
  }
  const formatTrendDate = (value: string) => formatDate(value, (dateCounts.get(value.slice(0, 10)) ?? 0) > 1);
  const chartData = values.map((entry) => ({ date: entry.date, value: entry.value }));
  const chartId = title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <section className="panel tracking-trend-panel" aria-labelledby={`${chartId}-title`}>
        <div className="panel-heading">
          <div>
            <h2 className="panel-title" id={`${chartId}-title`}>{title}</h2>
            <p className="panel-caption">One recorded measure at a time. Vertical axis: {unit}.</p>
          </div>
        </div>
        {recordedValues.length >= 2 ? (
          <div className="chart-wrap tracking-trend-chart" role="img" aria-label={`${title} by date, measured in ${unit}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart accessibilityLayer data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} stroke="#edf1eb" strokeDasharray="3 5" />
                <XAxis dataKey="date" interval="preserveStartEnd" minTickGap={20} tickFormatter={formatTrendDate} axisLine={false} tickLine={false} tick={{ fill: "#5f7066", fontSize: 10 }} tickMargin={10} />
                <YAxis domain={minimum === 1 ? [1, 5] : [minimum, "auto"]} ticks={minimum === 1 ? [1, 2, 3, 4, 5] : undefined} allowDataOverflow={minimum === 1} axisLine={false} tickLine={false} tick={{ fill: "#5f7066", fontSize: 10 }} label={{ value: unit, angle: -90, position: "insideLeft" }} />
                <Tooltip labelFormatter={(value) => formatTrendDate(String(value))} formatter={(value) => [`${value} ${unit}`, title]} />
                <Line dataKey="value" name={title} type="linear" connectNulls={false} stroke="#4f866f" strokeWidth={2.5} dot={{ r: 4, fill: "#4f866f" }} activeDot={{ r: 6, fill: "#28695d", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="inline-empty-state" role="status">
            {chartData.length === 0 ? "No recorded values in this range." : "At least two recorded values are needed to show a trend."}
          </div>
        )}
        {values.length > 0 && (
          <div className="table-scroll" role="region" aria-label={`${title} trend data table`} tabIndex={0}>
            <table className="demo-data-table tracking-trend-table">
              <caption className="visually-hidden">{title} by date; values use {unit}</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Value ({unit})</th></tr></thead>
              <tbody>{values.map((entry, index) => <tr key={`${entry.date}-${index}`}><td>{formatTrendDate(entry.date)}</td><td>{entry.value === null ? "Not recorded" : entry.value}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
  );
}

function TrendsPage() {
  const { symptomCheckIns, activityEntries, hydrationEntries, nutritionEntries } = useHealthData();
  const [category, setCategory] = useState<TrendCategory>("symptoms");
  const [range, setRange] = useState<TrendRange>("30d");
  const [symptomField, setSymptomField] = useState<SymptomRatingField>("energy");
  const [nutritionMetric, setNutritionMetric] = useState<NutritionMetric>("calories");
  const [hydrationUnit, setHydrationUnit] = useState<HydrationUnit>("ml");
  const today = new Date();
  const selectedSymptom = symptomRatingFields.find((option) => option.key === symptomField) ?? symptomRatingFields[0];
  const symptomValues = sortSymptomCheckIns(symptomCheckIns)
    .filter((entry) => withinRange(entry.occurredAt, range, today))
    .reverse()
    .map((entry) => ({ date: entry.occurredAt, value: entry[symptomField] }));
  const activityValues = getActivityDailySeries(activityEntries, range, today)
    .map((entry) => ({ date: entry.date, value: entry.minutes }));
  const hydrationValues = getHydrationDailySeries(hydrationEntries, range, today)
    .map((entry) => ({
      date: entry.date,
      value: millilitersToHydrationAmount(entry.amountMl, hydrationUnit),
    }));
  const nutritionValues = getNutritionDailySeries(nutritionEntries, nutritionMetric, range, today)
    .map((entry) => ({ date: entry.date, value: entry.value }));
  const selectedNutritionMetric = nutritionMetricLabels[nutritionMetric];
  const categoryLabel: Record<TrendCategory, string> = {
    symptoms: "Symptom ratings",
    activity: "Activity duration",
    hydration: "Hydration",
    nutrition: "Nutrition",
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your patterns</p>
          <h1 className="page-title">Trends</h1>
          <p className="page-subtitle">Review recorded measures one at a time. Charts describe tracking data, not causes.</p>
        </div>
      </header>
      <section className="panel trends-panel" aria-label="Health tracking trends">
        <div className="trends-controls">
          <div className="form-field">
            <label className="field-label" htmlFor="trend-category">Measure</label>
            <select className="field-input field-select" id="trend-category" value={category} onChange={(event) => setCategory(event.target.value as TrendCategory)}>
              {Object.entries(categoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="form-field trend-range-control">
            <span className="field-label" id="trend-range-label">Time range</span>
            <div className="range-buttons" role="group" aria-labelledby="trend-range-label">
              {trendRanges.map((item) => (
                <button className="range-button" key={item.value} type="button" aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>
              ))}
            </div>
          </div>
          {category === "symptoms" && (
            <div className="form-field">
              <label className="field-label" htmlFor="trend-symptom">Symptom area</label>
              <select className="field-input field-select" id="trend-symptom" value={symptomField} onChange={(event) => setSymptomField(event.target.value as SymptomRatingField)}>
                {symptomRatingFields.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
              <span className="field-hint">1: {selectedSymptom.lowLabel} · 5: {selectedSymptom.highLabel}</span>
            </div>
          )}
          {category === "nutrition" && (
            <div className="form-field">
              <label className="field-label" htmlFor="trend-nutrition-metric">Nutrition value</label>
              <select className="field-input field-select" id="trend-nutrition-metric" value={nutritionMetric} onChange={(event) => setNutritionMetric(event.target.value as NutritionMetric)}>
                {nutritionTrendMetrics.map((metric) => <option key={metric} value={metric}>{nutritionMetricLabels[metric].label}</option>)}
              </select>
            </div>
          )}
          {category === "hydration" && (
            <div className="form-field">
              <label className="field-label" htmlFor="trend-hydration-unit">Display unit</label>
              <select className="field-input field-select" id="trend-hydration-unit" value={hydrationUnit} onChange={(event) => setHydrationUnit(event.target.value as HydrationUnit)}>
                <option value="ml">mL</option>
                <option value="fl-oz">US fl oz</option>
              </select>
            </div>
          )}
        </div>
        {category === "symptoms" && <TrendChartPanel title={selectedSymptom.label} unit="Rating (1–5)" values={symptomValues} minimum={1} />}
        {category === "activity" && <TrendChartPanel title="Activity duration" unit="Minutes" values={activityValues} minimum={0} />}
        {category === "hydration" && <TrendChartPanel title="Recorded hydration" unit={hydrationUnit === "ml" ? "mL" : "US fl oz"} values={hydrationValues} minimum={0} />}
        {category === "nutrition" && <TrendChartPanel title={selectedNutritionMetric.label} unit={selectedNutritionMetric.unit} values={nutritionValues} minimum={0} />}
      </section>
      <p className="temporary-data-note" role="note">Nutrition, hydration, activity, weight, lab, and symptom trends summarize recorded entries only. They do not identify causes or show that one measure caused a change in another.</p>
    </>
  );
}

export default TrendsPage;
