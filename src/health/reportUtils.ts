import type {
  ActivityEntry,
  HydrationEntry,
  LabResult,
  Medication,
  MedicationDoseRecord,
  NutritionEntry,
  SymptomCheckIn,
  UserProfile,
  WeightEntry,
} from "../types/health";
import { getDailyHydrationTotal, getDailyNutritionTotals, sortNutritionEntries } from "./nutritionUtils.js";
import { calculateBmi, convertKilogramsToWeight, isValidIsoDate, sortWeightEntries, toIsoDate } from "./healthUtils.js";

export const reportSections = [
  { id: "profile", label: "Profile summary" },
  { id: "weight", label: "Weight and BMI history" },
  { id: "labs", label: "Thyroid lab results" },
  { id: "medications", label: "Medication tracking and recorded doses" },
  { id: "symptoms", label: "Symptom history" },
  { id: "nutrition", label: "Nutrition and hydration summaries" },
  { id: "activity", label: "Activity history" },
] as const;

export type ReportSectionId = (typeof reportSections)[number]["id"];
export type ReportRangePreset = "7d" | "30d" | "90d" | "custom";

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface ReportSourceData {
  profile: UserProfile;
  weightEntries: WeightEntry[];
  labResults: LabResult[];
  medications: Medication[];
  medicationDoseRecords: MedicationDoseRecord[];
  symptomCheckIns: SymptomCheckIn[];
  nutritionEntries: NutritionEntry[];
  hydrationEntries: HydrationEntry[];
  activityEntries: ActivityEntry[];
}

export interface ReportWeightRecord {
  date: string;
  weightKg: number;
  displayWeight: number | null;
  bmi: number | null;
}

export interface ReportNutritionDay {
  date: string;
  entries: NutritionEntry[];
  totals: ReturnType<typeof getDailyNutritionTotals>;
  hydrationEntries: HydrationEntry[];
  hydrationTotalMl: number | null;
}

export interface HealthReportData {
  dateRange: ReportDateRange;
  generatedOn: string;
  selectedSections: ReportSectionId[];
  profile: {
    name: string;
    dateOfBirth: string;
    heightCm: number;
    heightUnit: UserProfile["heightUnit"];
    weightUnit: UserProfile["weightUnit"];
    thyroidConditions: string[];
    latestWeight: number | null;
    bmi: number | null;
  };
  weightRecords: ReportWeightRecord[];
  labResults: LabResult[];
  medications: Medication[];
  medicationDoseRecords: MedicationDoseRecord[];
  symptomCheckIns: SymptomCheckIn[];
  nutritionDays: ReportNutritionDay[];
  activityEntries: ActivityEntry[];
}

const reportableLabTypes = new Set(["TSH", "Free T4", "Free T3", "TPO antibodies"]);

export function getPresetReportDateRange(preset: Exclude<ReportRangePreset, "custom">, today = new Date()): ReportDateRange {
  const days = Number.parseInt(preset, 10);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function validateReportDateRange(range: ReportDateRange, today = new Date()): string {
  if (!isValidIsoDate(range.startDate) || !isValidIsoDate(range.endDate)) return "Choose valid start and end dates.";
  if (range.startDate > range.endDate) return "The start date must be on or before the end date.";
  if (range.endDate > toIsoDate(today)) return "The end date cannot be in the future.";
  return "";
}

function includesDate(dateTime: string, range: ReportDateRange): boolean {
  const date = dateTime.slice(0, 10);
  return date >= range.startDate && date <= range.endDate;
}

export function buildHealthReport(
  data: ReportSourceData,
  dateRange: ReportDateRange,
  selectedSections: ReportSectionId[],
  generatedAt = new Date(),
): HealthReportData {
  const nutritionEntries = sortNutritionEntries(data.nutritionEntries.filter((entry) => includesDate(entry.date, dateRange)))
    .sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id));
  const hydrationEntries = data.hydrationEntries
    .filter((entry) => includesDate(entry.date, dateRange))
    .sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id));
  const nutritionDates = [...new Set([
    ...nutritionEntries.map((entry) => entry.date),
    ...hydrationEntries.map((entry) => entry.date),
  ])].sort();
  const weightEntries = sortWeightEntries(data.weightEntries).filter((entry) => includesDate(entry.date, dateRange));
  const latestWeight = weightEntries.at(-1);

  return {
    dateRange,
    generatedOn: toIsoDate(generatedAt),
    selectedSections: [...selectedSections],
    profile: {
      name: data.profile.name,
      dateOfBirth: data.profile.dateOfBirth,
      heightCm: data.profile.heightCm,
      heightUnit: data.profile.heightUnit,
      weightUnit: data.profile.weightUnit,
      thyroidConditions: [...data.profile.thyroidConditions],
      latestWeight: latestWeight
        ? convertKilogramsToWeight(latestWeight.weightKg, data.profile.weightUnit)
        : null,
      bmi: latestWeight ? calculateBmi(latestWeight.weightKg, data.profile.heightCm) : null,
    },
    weightRecords: weightEntries.map((entry) => ({
        date: entry.date,
        weightKg: entry.weightKg,
        displayWeight: convertKilogramsToWeight(entry.weightKg, data.profile.weightUnit),
        bmi: calculateBmi(entry.weightKg, data.profile.heightCm),
      })),
    labResults: data.labResults
      .filter((entry) => includesDate(entry.date, dateRange) && reportableLabTypes.has(entry.testType))
      .sort((first, second) => first.date.localeCompare(second.date) || first.testType.localeCompare(second.testType)),
    medications: [...data.medications].sort((first, second) => first.name.localeCompare(second.name)),
    medicationDoseRecords: data.medicationDoseRecords
      .filter((entry) => includesDate(entry.date, dateRange))
      .sort((first, second) => first.date.localeCompare(second.date) || first.scheduledTime.localeCompare(second.scheduledTime)),
    symptomCheckIns: [...data.symptomCheckIns]
      .filter((entry) => includesDate(entry.occurredAt, dateRange))
      .sort((first, second) => first.occurredAt.localeCompare(second.occurredAt)),
    nutritionDays: nutritionDates.map((date) => {
      const dailyNutrition = nutritionEntries.filter((entry) => entry.date === date);
      const dailyHydration = hydrationEntries.filter((entry) => entry.date === date);
      return {
        date,
        entries: dailyNutrition,
        totals: getDailyNutritionTotals(dailyNutrition, date),
        hydrationEntries: dailyHydration,
        hydrationTotalMl: getDailyHydrationTotal(dailyHydration, date),
      };
    }),
    activityEntries: data.activityEntries
      .filter((entry) => includesDate(entry.date, dateRange))
      .sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id)),
  };
}