import { ArrowRight, CalendarDays, Clock3, FlaskConical, Heart, Scale, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useHealthData } from "../../context/useHealthData.js";
import type { UserProfile, WeightEntry } from "../../types/health";
import { convertKilogramsToWeight } from "../../health/healthUtils.js";
import type { LabResult } from "../../types/health";
import {
  getMedicationDoseStatus,
  getTodaySchedules,
  getTodaySymptomCheckIn,
  symptomRatingFields,
} from "../../health/trackingUtils.js";
import type { MedicationDoseStatus, SymptomCheckIn } from "../../types/health";
import { toIsoDate } from "../../health/healthUtils.js";
import { getDailyHydrationTotal, getDailyNutritionTotals } from "../../health/nutritionUtils.js";

const metricIcons = {
  scale: Scale,
  labs: FlaskConical,
  medication: Clock3,
  checkin: Heart,
};

function PageHeader({ profile }: { profile: UserProfile }) {
  const conditionSummary =
    profile.thyroidConditions.length > 0 ? profile.thyroidConditions.join(", ") : "no condition selected";
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{todayLabel}</p>
        <h1 className="page-title">A little more in tune.</h1>
        <p className="page-subtitle">
          Good morning, {profile.name}. Your sample profile: {conditionSummary}.
        </p>
      </div>
      <span className="today-chip">
        <CalendarDays size={14} aria-hidden="true" />
        Today
      </span>
    </header>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: keyof typeof metricIcons;
}

function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  const Icon = metricIcons[icon];
  return (
    <article className="metric-card" aria-label={`${label}: ${value}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">
          <Icon size={15} aria-hidden="true" />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

interface OverviewCardsProps {
  profile: UserProfile;
  latestWeightEntry: WeightEntry | null;
  bmi: number | null;
  labResults: LabResult[];
  medicationCount: number;
  takenMedicationCount: number;
}

function OverviewCards({
  profile,
  latestWeightEntry,
  bmi,
  labResults,
  medicationCount,
  takenMedicationCount,
}: OverviewCardsProps) {
  const currentWeightValue = latestWeightEntry
    ? convertKilogramsToWeight(latestWeightEntry.weightKg, profile.weightUnit)
    : null;
  const currentWeight = latestWeightEntry
    ? currentWeightValue === null
      ? "Not recorded"
      : `${currentWeightValue.toFixed(1)} ${profile.weightUnit}`
    : "Not recorded";
  const goalWeightValue = convertKilogramsToWeight(profile.goalWeightKg, profile.weightUnit);
  const goalWeight = goalWeightValue === null ? "Not set" : `${goalWeightValue.toFixed(1)} ${profile.weightUnit}`;

  const metrics: MetricCardProps[] = [
    {
      label: "Latest weight",
      value: currentWeight,
      detail: latestWeightEntry ? `Recorded ${latestWeightEntry.date}` : "Add a weight entry in My Profile",
      icon: "scale",
    },
    {
      label: "Recent labs",
      value: `${labResults.length} results`,
      detail: `Updated ${labResults[0] ? new Date(`${labResults[0].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "not yet"}`,
      icon: "labs",
    },
    {
      label: "Medication",
      value: `${medicationCount} scheduled`,
      detail: `${takenMedicationCount} marked taken today`,
      icon: "medication",
    },
    {
      label: "BMI",
      value: bmi === null ? "Not available" : bmi.toFixed(1),
      detail: `Goal weight: ${goalWeight}`,
      icon: "checkin",
    },
  ];

  return (
    <section className="overview-grid" aria-label="Health overview">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}

interface WeightChartProps {
  entries: WeightEntry[];
  profile: UserProfile;
  latestWeightEntry: WeightEntry | null;
}

function WeightChart({ entries, profile, latestWeightEntry }: WeightChartProps) {
  const chartData = entries.map((entry) => ({
    date: new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: convertKilogramsToWeight(entry.weightKg, profile.weightUnit),
  }));
  const currentWeightValue = latestWeightEntry
    ? convertKilogramsToWeight(latestWeightEntry.weightKg, profile.weightUnit)
    : null;
  const currentWeight =
    currentWeightValue === null
      ? latestWeightEntry
        ? "Not recorded"
        : "No entries"
      : `${currentWeightValue.toFixed(1)} ${profile.weightUnit}`;

  return (
    <section className="panel weight-panel" aria-labelledby="weight-heading">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="weight-heading">
            Weight over time
          </h2>
          <p className="panel-caption">Fictional demo entries</p>
        </div>
        <span className="chart-stat">{currentWeight}</span>
      </div>
      {chartData.length > 0 ? (
        <div
          className="chart-wrap"
          role="img"
          aria-label={`Chart of ${chartData.length} fictional weight entries in ${profile.weightUnit}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 9, bottom: 0, left: -19 }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8cb6a0" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#8cb6a0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#edf1eb" strokeDasharray="3 5" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#5f7066", fontSize: 9 }}
                tickMargin={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#5f7066", fontSize: 9 }} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="chart-tooltip">
                      <strong>
                        {Number(payload[0].value).toFixed(1)} {profile.weightUnit}
                      </strong>
                      {label} - demo entry
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#4f866f"
                strokeWidth={2.5}
                fill="url(#weightFill)"
                activeDot={{ r: 5, fill: "#28695d", stroke: "#fff", strokeWidth: 2 }}
                dot={{ r: 2.5, fill: "#4f866f", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="inline-empty-state" role="status">
          No weight entries yet. Add a demo entry from My Profile.
        </div>
      )}
    </section>
  );
}

function LabPreview({ labResults }: { labResults: LabResult[] }) {
  return (
    <section className="panel" aria-labelledby="labs-heading">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="labs-heading">
            Recent lab results
          </h2>
          <p className="panel-caption">Fictional sample values</p>
        </div>
        <span className="metric-icon">
          <FlaskConical size={15} aria-hidden="true" />
        </span>
      </div>
      <div className="lab-list">
        {labResults.slice(0, 3).map((result) => (
          <div className="lab-row" key={result.id}>
            <span>
              <span className="lab-name">{result.testType}</span>
              <span className="lab-date">
                {new Date(`${result.date}T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                - demo
              </span>
            </span>
            <span className="lab-value">
              {result.value}
              <span className="lab-unit">{result.unit}</span>
            </span>
          </div>
        ))}
      </div>
      <Link className="text-link" to="/labs">
        View lab records <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </section>
  );
}

function MedicationPreview({
  medications,
  doseRecords,
  today,
  onStatusChange,
}: {
  medications: ReturnType<typeof useHealthData>["medications"];
  doseRecords: ReturnType<typeof useHealthData>["medicationDoseRecords"];
  today: Date;
  onStatusChange: (medicationId: string, scheduleId: string, status: MedicationDoseStatus | null) => void;
}) {
  const scheduledDoses = getTodaySchedules(medications, today);
  const date = toIsoDate(today);

  return (
    <section className="panel" aria-labelledby="medication-heading">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="medication-heading">
            Medication reminder
          </h2>
          <p className="panel-caption">Scheduled doses for today</p>
        </div>
        <span className="metric-icon">
          <Clock3 size={15} aria-hidden="true" />
        </span>
      </div>
      {scheduledDoses.length > 0 ? (
        <div className="dashboard-dose-list">
          {scheduledDoses.map(({ medication, schedule }) => {
            const status = getMedicationDoseStatus(doseRecords, medication.id, schedule.id, date);
            return (
              <div className="dashboard-dose-row" key={`${medication.id}-${schedule.id}`}>
                <span className="dashboard-dose-name">
                  <Heart size={14} aria-hidden="true" />
                  <span>
                    {medication.name}
                    <span className="medication-dose">
                      {medication.prescribedDose} {medication.doseUnit} · {schedule.time} · Scheduled
                    </span>
                  </span>
                </span>
                <label className="visually-hidden" htmlFor={`dashboard-dose-${schedule.id}`}>
                  Dose status for {medication.name} at {schedule.time}
                </label>
                <select
                  className="field-input field-select dashboard-dose-select"
                  id={`dashboard-dose-${schedule.id}`}
                  value={status}
                  onChange={(event) =>
                    onStatusChange(
                      medication.id,
                      schedule.id,
                      event.target.value === "taken" || event.target.value === "skipped" ? event.target.value : null,
                    )
                  }
                >
                  <option value="not-recorded">Not recorded</option>
                  <option value="taken">Mark taken</option>
                  <option value="skipped">Mark skipped</option>
                </select>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="inline-empty-state" role="status">
          No doses scheduled today.
        </div>
      )}
      <Link className="text-link" to="/medications">
        View reminders <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </section>
  );
}

function SymptomCheckIn({ entry }: { entry: SymptomCheckIn | null }) {
  return (
    <section className="panel symptom-panel" aria-labelledby="symptom-heading">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="symptom-heading">
            How are you feeling today?
          </h2>
          <p className="panel-caption">Your most recent check-in for today</p>
        </div>
        <span className="metric-icon">
          <Sparkles size={15} aria-hidden="true" />
        </span>
      </div>
      {entry ? (
        <dl className="dashboard-symptom-ratings">
          {symptomRatingFields.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>{entry[field.key]} / 5</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="inline-empty-state" role="status">
          No check-in recorded today.
        </div>
      )}
      <span className="symptom-note">Personal tracking only; ratings do not indicate a diagnosis.</span>
      <Link className="text-link" to="/symptoms">
        {entry ? "View or edit check-ins" : "Add today's check-in"} <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </section>
  );
}

function DailyTrackingSummary({
  nutritionEntries,
  hydrationEntries,
  activityEntries,
}: {
  nutritionEntries: ReturnType<typeof useHealthData>["nutritionEntries"];
  hydrationEntries: ReturnType<typeof useHealthData>["hydrationEntries"];
  activityEntries: ReturnType<typeof useHealthData>["activityEntries"];
}) {
  const date = toIsoDate(new Date());
  const todayNutrition = nutritionEntries.filter((entry) => entry.date === date);
  const calories = getDailyNutritionTotals(nutritionEntries, date).calories;
  const hydration = getDailyHydrationTotal(hydrationEntries, date);
  const todayActivities = activityEntries.filter((entry) => entry.date === date);
  const activityMinutes = todayActivities.reduce((total, entry) => total + entry.durationMinutes, 0);
  const nutritionEntryLabel = todayNutrition.length === 1 ? "entry" : "entries";
  const activityEntryLabel = todayActivities.length === 1 ? "entry" : "entries";
  const nutritionSummary = todayNutrition.length === 0
    ? "No entries recorded"
    : calories.total === null
      ? `${todayNutrition.length} ${nutritionEntryLabel} · calories not recorded`
      : `${todayNutrition.length} ${nutritionEntryLabel} · ${calories.total} kcal recorded${calories.missingEntries > 0 ? ` · ${calories.missingEntries} missing` : ""}`;

  return (
    <section className="panel daily-tracking-panel" aria-labelledby="daily-tracking-title">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="daily-tracking-title">Today's tracking</h2>
          <p className="panel-caption">Summaries reflect entries saved for today only.</p>
        </div>
      </div>
      <dl className="daily-tracking-grid">
        <div>
          <dt>Nutrition</dt>
          <dd>{nutritionSummary}</dd>
          <Link className="text-link" to="/nutrition">View nutrition <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <div>
          <dt>Hydration</dt>
          <dd>{hydration === null ? "No intake recorded" : `${Math.round(hydration)} mL recorded`}</dd>
          <Link className="text-link" to="/nutrition">View water log <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <div>
          <dt>Activity</dt>
          <dd>{todayActivities.length === 0 ? "No activity recorded" : `${todayActivities.length} ${activityEntryLabel} · ${activityMinutes} min`}</dd>
          <Link className="text-link" to="/activity">View activity <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
      </dl>
    </section>
  );
}

function DashboardPage() {
  const {
    profile,
    weightEntries,
    latestWeightEntry,
    bmi,
    labResults,
    medications,
    medicationDoseRecords,
    setMedicationDoseStatus,
    symptomCheckIns,
    nutritionEntries,
    hydrationEntries,
    activityEntries,
  } = useHealthData();
  const today = new Date();
  const todaySchedules = getTodaySchedules(medications, today);
  const todaysDoseCount = todaySchedules.filter(
    ({ medication, schedule }) =>
      getMedicationDoseStatus(medicationDoseRecords, medication.id, schedule.id, toIsoDate(today)) === "taken",
  ).length;
  const todaySymptom = getTodaySymptomCheckIn(symptomCheckIns, today);

  return (
    <>
      <PageHeader profile={profile} />
      <div className="dashboard-grid">
        <OverviewCards
          profile={profile}
          latestWeightEntry={latestWeightEntry}
          bmi={bmi}
          labResults={labResults}
          medicationCount={todaySchedules.length}
          takenMedicationCount={todaysDoseCount}
        />
        <WeightChart entries={weightEntries} profile={profile} latestWeightEntry={latestWeightEntry} />
        <div className="side-stack">
          <LabPreview labResults={labResults} />
          <MedicationPreview
            medications={medications}
            doseRecords={medicationDoseRecords}
            today={today}
            onStatusChange={(medicationId, scheduleId, status) =>
              setMedicationDoseStatus(medicationId, scheduleId, toIsoDate(today), status)
            }
          />
        </div>
        <SymptomCheckIn entry={todaySymptom} />
      </div>
      <DailyTrackingSummary
        nutritionEntries={nutritionEntries}
        hydrationEntries={hydrationEntries}
        activityEntries={activityEntries}
      />
    </>
  );
}

export default DashboardPage;
