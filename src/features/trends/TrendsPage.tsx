import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useHealthData } from "../../context/useHealthData.js";
import { sortSymptomCheckIns, symptomRatingFields } from "../../health/trackingUtils.js";
import type { SymptomRatingField } from "../../health/trackingUtils";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrendsPage() {
  const { symptomCheckIns } = useHealthData();
  const [field, setField] = useState<SymptomRatingField>("energy");
  const selectedField = symptomRatingFields.find((option) => option.key === field) ?? symptomRatingFields[0];
  const entries = sortSymptomCheckIns(symptomCheckIns);
  const chartData = [...entries].reverse().map((entry) => ({
    date: formatDateTime(entry.occurredAt),
    rating: entry[field],
  }));

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your patterns</p>
          <h1 className="page-title">Trends</h1>
          <p className="page-subtitle">Review your own symptom check-in ratings over time.</p>
        </div>
      </header>
      <section className="panel symptom-trend-panel" aria-labelledby="symptom-trend-title">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title" id="symptom-trend-title">
              Symptom check-in trend
            </h2>
            <p className="panel-caption">One self-reported rating at a time. Ratings range from 1 to 5.</p>
          </div>
        </div>
        <div className="form-field trend-field-select">
          <label className="field-label" htmlFor="trend-symptom">
            Symptom area
          </label>
          <select
            className="field-input field-select"
            id="trend-symptom"
            value={field}
            onChange={(event) => setField(event.target.value as SymptomRatingField)}
          >
            {symptomRatingFields.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="field-hint">
            1: {selectedField.lowLabel} · 5: {selectedField.highLabel}
          </span>
        </div>
        {entries.length >= 2 ? (
          <>
            <div
              className="chart-wrap tracking-trend-chart"
              role="img"
              aria-label={`${selectedField.label} ratings from 1 to 5 over check-in dates`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart accessibilityLayer data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="#edf1eb" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8c9990", fontSize: 10 }}
                    tickMargin={10}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    allowDataOverflow
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8c9990", fontSize: 10 }}
                  />
                  <Tooltip formatter={(value) => [`${value} / 5`, selectedField.label]} />
                  <Line
                    dataKey="rating"
                    name={selectedField.label}
                    type="linear"
                    stroke="#4f866f"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#4f866f" }}
                    activeDot={{ r: 6, fill: "#28695d", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="table-scroll">
              <table className="demo-data-table tracking-trend-table">
                <caption className="visually-hidden">{selectedField.label} symptom ratings by date</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Self-reported rating</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.occurredAt)}</td>
                      <td>{entry[field]} / 5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="inline-empty-state" role="status">
            At least two check-ins are needed to show a symptom trend.
          </div>
        )}
      </section>
      <p className="temporary-data-note" role="note">
        These charts summarize self-reported check-ins only. They do not identify causes, diagnose a condition, or show
        that a medication caused a change.
      </p>
    </>
  );
}

export default TrendsPage;
