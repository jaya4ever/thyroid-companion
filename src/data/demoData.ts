import type {
  ActivityEntry,
  LabResult,
  HydrationEntry,
  Medication,
  MedicationDoseRecord,
  NutritionEntry,
  SymptomCheckIn,
  UserProfile,
  Weekday,
  WeightEntry,
} from "../types/health";
import { createLocalDateTime } from "../health/trackingUtils.js";
import { toIsoDate } from "../health/healthUtils.js";

export const demoProfile: UserProfile = {
  name: "Maya Bennett",
  dateOfBirth: "1991-05-14",
  heightCm: 165.1,
  heightUnit: "cm",
  weightUnit: "kg",
  goalWeightKg: 68.4,
  thyroidConditions: ["Hypothyroidism", "Hashimoto's thyroiditis"],
};

export const demoWeightEntries: WeightEntry[] = [
  { id: "demo-weight-2026-09-02", date: "2026-09-02", weightKg: 69.2 },
  { id: "demo-weight-2026-09-09", date: "2026-09-09", weightKg: 69.0 },
  { id: "demo-weight-2026-09-16", date: "2026-09-16", weightKg: 69.4 },
  { id: "demo-weight-2026-09-23", date: "2026-09-23", weightKg: 68.8 },
  { id: "demo-weight-2026-09-30", date: "2026-09-30", weightKg: 68.9 },
  { id: "demo-weight-2026-10-07", date: "2026-10-07", weightKg: 68.6 },
  { id: "demo-weight-2026-10-14", date: "2026-10-14", weightKg: 68.7 },
  { id: "demo-weight-2026-10-24", date: "2026-10-24", weightKg: 68.4 },
];

export const demoLabResults: LabResult[] = [
  { id: "demo-lab-tsh-2026-10-18", testType: "TSH", value: 2.1, unit: "mIU/L", date: "2026-10-18" },
  { id: "demo-lab-free-t4-2026-10-18", testType: "Free T4", value: 1.2, unit: "ng/dL", date: "2026-10-18" },
  { id: "demo-lab-tpo-2026-10-18", testType: "TPO antibodies", value: 42, unit: "IU/mL", date: "2026-10-18" },
];

export function createDemoNutritionEntries(today = new Date()): NutritionEntry[] {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const currentDate = toIsoDate(today);
  const previousDate = toIsoDate(yesterday);
  const olderDate = toIsoDate(twoDaysAgo);
  return [
    {
      id: `demo-nutrition-breakfast-${currentDate}`,
      date: currentDate,
      mealCategory: "breakfast",
      foodName: "Fictional oatmeal",
      servingDescription: "Sample bowl",
      calories: 320,
      proteinGrams: 12,
      carbohydratesGrams: 54,
      fatGrams: 6,
      notes: "Fictional values entered for the demo; not derived from the food name.",
    },
    {
      id: `demo-nutrition-snack-${currentDate}`,
      date: currentDate,
      mealCategory: "snack",
      foodName: "Fictional snack, unmeasured",
      servingDescription: "One sample portion",
      notes: "Nutrition values not recorded in this example.",
    },
    {
      id: `demo-nutrition-lunch-${previousDate}`,
      date: previousDate,
      mealCategory: "lunch",
      foodName: "Fictional grain bowl",
      servingDescription: "Sample plate",
      calories: 460,
      proteinGrams: 18,
      carbohydratesGrams: 62,
      fatGrams: 14,
    },
    {
      id: `demo-nutrition-unmeasured-${olderDate}`,
      date: olderDate,
      mealCategory: "snack",
      foodName: "Fictional unmeasured sample",
      notes: "No nutrition numbers were entered for this fictional record.",
    },
  ];
}

export function createDemoHydrationEntries(today = new Date()): HydrationEntry[] {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return [
    { id: `demo-hydration-morning-${toIsoDate(today)}`, date: toIsoDate(today), amountMl: 350 },
    { id: `demo-hydration-afternoon-${toIsoDate(today)}`, date: toIsoDate(today), amountMl: 250 },
    { id: `demo-hydration-yesterday-${toIsoDate(yesterday)}`, date: toIsoDate(yesterday), amountMl: 400 },
  ];
}

export function createDemoActivityEntries(today = new Date()): ActivityEntry[] {
  const dateAtOffset = (days: number): string => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return toIsoDate(date);
  };
  return [
    { id: `demo-activity-walk-${dateAtOffset(0)}`, date: dateAtOffset(0), activityType: "walking", durationMinutes: 30, distanceKm: 2.4 },
    { id: `demo-activity-yoga-${dateAtOffset(3)}`, date: dateAtOffset(3), activityType: "yoga", durationMinutes: 35 },
    { id: `demo-activity-cycle-${dateAtOffset(10)}`, date: dateAtOffset(10), activityType: "cycling", durationMinutes: 45, distanceKm: 12 },
    { id: `demo-activity-strength-${dateAtOffset(42)}`, date: dateAtOffset(42), activityType: "strength training", durationMinutes: 30 },
  ];
}

const everyDay: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export const demoMedications: Medication[] = [
  {
    id: "demo-medication-1",
    name: "Levothyroxine",
    prescribedDose: 50,
    doseUnit: "mcg",
    schedules: [{ id: "demo-medication-1-morning", time: "08:00", daysOfWeek: everyDay }],
    notes: "Fictional demo medication and prescribed-dose example.",
  },
];

export function createDemoMedicationDoseRecords(today = new Date()): MedicationDoseRecord[] {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const previousDay = new Date(today);
  previousDay.setDate(previousDay.getDate() - 2);
  return [
    {
      id: "demo-dose-yesterday",
      medicationId: "demo-medication-1",
      scheduleId: "demo-medication-1-morning",
      scheduledTime: "08:00",
      date: toIsoDate(yesterday),
      status: "taken",
      recordedAt: createLocalDateTime(yesterday) + ":00",
    },
    {
      id: "demo-dose-previous-day",
      medicationId: "demo-medication-1",
      scheduleId: "demo-medication-1-morning",
      scheduledTime: "08:00",
      date: toIsoDate(previousDay),
      status: "skipped",
      recordedAt: createLocalDateTime(previousDay) + ":00",
    },
  ];
}

export function createDemoSymptomCheckIns(today = new Date()): SymptomCheckIn[] {
  return [2, 1, 0].map((daysAgo, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const entry: SymptomCheckIn = {
      id: `demo-symptom-${toIsoDate(date)}`,
      occurredAt: createLocalDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0)),
      energy: [3, 4, 3][index] as 1 | 2 | 3 | 4 | 5,
      fatigue: [3, 2, 3][index] as 1 | 2 | 3 | 4 | 5,
      sleepQuality: [3, 4, 3][index] as 1 | 2 | 3 | 4 | 5,
      mood: [3, 3, 4][index] as 1 | 2 | 3 | 4 | 5,
      focus: [2, 3, 3][index] as 1 | 2 | 3 | 4 | 5,
      temperatureComfort: [3, 4, 3][index] as 1 | 2 | 3 | 4 | 5,
      digestion: [3, 3, 4][index] as 1 | 2 | 3 | 4 | 5,
    };
    return entry;
  });
}

export const sections = {
  trends: {
    title: "Trends",
    eyebrow: "Your patterns",
    description: "A quiet place for your measurements and check-in history.",
    emptyTitle: "Your timeline is getting started",
    emptyMessage: "More saved check-ins will appear here over time.",
    action: "Back to overview",
  },
  labs: {
    title: "Lab results",
    eyebrow: "Your records",
    description: "A simple view of the fictional results in this demo profile.",
  },
  medications: {
    title: "Medications",
    eyebrow: "Your routine",
    description: "Reminder details shown here are fictional sample data.",
    emptyTitle: "No saved medication history",
    emptyMessage: "Completed reminders will appear here.",
    action: "Back to overview",
  },
  symptoms: {
    title: "Symptom check-ins",
    eyebrow: "Daily notes",
    description: "A personal log for noticing how you feel over time.",
    emptyTitle: "No check-in history yet",
    emptyMessage: "Your saved check-ins will appear here.",
    action: "Back to overview",
  },
  journal: {
    title: "Journal",
    eyebrow: "Your reflections",
    description: "A personal space for notes in this fictional demo profile.",
    emptyTitle: "A fresh page",
    emptyMessage: "There are no journal entries in this sample profile.",
    action: "Back to overview",
  },
};
