import { describe, expect, it } from "vitest";
import type { ReportSourceData } from "./reportUtils.js";
import { buildHealthReport, getPresetReportDateRange, validateReportDateRange } from "./reportUtils.js";

const sourceData: ReportSourceData = {
  profile: {
    name: "Fictional Sample",
    dateOfBirth: "1990-04-03",
    heightCm: 170,
    heightUnit: "cm",
    weightUnit: "kg",
    goalWeightKg: 70,
    thyroidConditions: ["Hypothyroidism"],
  },
  weightEntries: [
    { id: "weight-current", date: "2026-10-25", weightKg: 70 },
    { id: "weight-before-range", date: "2026-09-01", weightKg: 72 },
  ],
  labResults: [
    { id: "lab-in", testType: "TSH", date: "2026-10-20", value: 2.1, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4 },
    { id: "lab-out", testType: "Free T4", date: "2026-09-01", value: 1.2, unit: "ng/dL" },
    { id: "lab-other", testType: "Vitamin D", date: "2026-10-20", value: 30, unit: "ng/mL" },
  ],
  medications: [{ id: "medication-1", name: "Fictional medication", prescribedDose: 1, doseUnit: "tablet", schedules: [] }],
  medicationDoseRecords: [
    { id: "dose-in", medicationId: "medication-1", scheduleId: "schedule-1", scheduledTime: "08:00", date: "2026-10-20", status: "taken", recordedAt: "2026-10-20T08:01:00" },
    { id: "dose-out", medicationId: "medication-1", scheduleId: "schedule-1", scheduledTime: "08:00", date: "2026-09-01", status: "skipped", recordedAt: "2026-09-01T08:01:00" },
  ],
  symptomCheckIns: [
    { id: "symptom-in", occurredAt: "2026-10-20T09:00", energy: 3, fatigue: 2, sleepQuality: 4, mood: 3, focus: 4, temperatureComfort: 3, digestion: 2 },
    { id: "symptom-out", occurredAt: "2026-09-01T09:00", energy: 2, fatigue: 3, sleepQuality: 3, mood: 3, focus: 3, temperatureComfort: 3, digestion: 3 },
  ],
  nutritionEntries: [
    { id: "meal-recorded", date: "2026-10-20", mealCategory: "breakfast", foodName: "Fictional oatmeal", calories: 250 },
    { id: "meal-incomplete", date: "2026-10-20", mealCategory: "snack", foodName: "Unmeasured sample" },
  ],
  hydrationEntries: [{ id: "water-in", date: "2026-10-20", amountMl: 400 }],
  activityEntries: [
    { id: "activity-in", date: "2026-10-20", activityType: "walking", durationMinutes: 25 },
    { id: "activity-out", date: "2026-09-01", activityType: "yoga", durationMinutes: 30 },
  ],
};

describe("report helpers", () => {
  it("creates inclusive preset ranges and validates custom ranges", () => {
    const today = new Date(2026, 9, 27, 12);
    expect(getPresetReportDateRange("7d", today)).toEqual({ startDate: "2026-10-21", endDate: "2026-10-27" });
    expect(validateReportDateRange({ startDate: "2026-10-21", endDate: "2026-10-27" }, today)).toBe("");
    expect(validateReportDateRange({ startDate: "2026-10-28", endDate: "2026-10-27" }, today)).toContain("on or before");
    expect(validateReportDateRange({ startDate: "2026-10-21", endDate: "2026-10-28" }, today)).toContain("future");
  });

  it("filters each section inclusively and keeps records chronological", () => {
    const report = buildHealthReport(
      sourceData,
      { startDate: "2026-10-20", endDate: "2026-10-25" },
      ["profile", "weight", "labs", "medications", "symptoms", "nutrition", "activity"],
      new Date(2026, 9, 27),
    );

    expect(report.weightRecords.map((record) => record.date)).toEqual(["2026-10-25"]);
    expect(report.weightRecords[0].bmi).toBe(24.2);
    expect(report.profile.bmi).toBe(24.2);
    expect(report.labResults.map((result) => result.testType)).toEqual(["TSH"]);
    expect(report.labResults[0].referenceMin).toBe(0.4);
    expect(report.medicationDoseRecords.map((record) => record.id)).toEqual(["dose-in"]);
    expect(report.symptomCheckIns.map((entry) => entry.id)).toEqual(["symptom-in"]);
    expect(report.activityEntries.map((entry) => entry.id)).toEqual(["activity-in"]);
  });

  it("preserves missing nutrition separately from zero and includes hydration-only dates", () => {
    const report = buildHealthReport(
      sourceData,
      { startDate: "2026-10-20", endDate: "2026-10-20" },
      ["nutrition"],
    );

    expect(report.nutritionDays).toHaveLength(1);
    expect(report.nutritionDays[0].totals.calories).toEqual({ total: 250, recordedEntries: 1, missingEntries: 1 });
    expect(report.nutritionDays[0].totals.proteinGrams).toEqual({ total: null, recordedEntries: 0, missingEntries: 2 });
    expect(report.nutritionDays[0].hydrationTotalMl).toBe(400);
  });

  it("does not invent a BMI when weight history is missing", () => {
    const report = buildHealthReport(
      { ...sourceData, weightEntries: [] },
      { startDate: "2026-10-20", endDate: "2026-10-25" },
      ["profile", "weight"],
    );

    expect(report.profile.latestWeight).toBeNull();
    expect(report.profile.bmi).toBeNull();
    expect(report.weightRecords).toEqual([]);
  });

  it("keeps profile weight and BMI within the selected report period", () => {
    const report = buildHealthReport(
      sourceData,
      { startDate: "2026-10-20", endDate: "2026-10-22" },
      ["profile", "weight"],
    );

    expect(report.profile.latestWeight).toBeNull();
    expect(report.profile.bmi).toBeNull();
    expect(report.profile.heightUnit).toBe("cm");
  });
});