export type ThyroidCondition =
  | "Hypothyroidism"
  | "Hashimoto's thyroiditis"
  | "Hyperthyroidism"
  | "Thyroid nodules"
  | "Other thyroid condition";

export type WeightUnit = "kg" | "lb";

export type HeightUnit = "cm" | "imperial";

export type LabTestType = "TSH" | "Free T4" | "Free T3" | "TPO antibodies" | (string & {});

export interface UserProfile {
  name: string;
  dateOfBirth: string;
  heightCm: number;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  goalWeightKg: number;
  thyroidConditions: ThyroidCondition[];
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
}

export interface LabResult {
  id: string;
  testType: LabTestType;
  date: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  laboratoryName?: string;
  notes?: string;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MedicationDoseStatus = "taken" | "skipped";

export type MedicationDoseDisplayStatus = MedicationDoseStatus | "not-recorded";

export interface MedicationSchedule {
  id: string;
  time: string;
  daysOfWeek: Weekday[];
}

export interface Medication {
  id: string;
  name: string;
  prescribedDose: number;
  doseUnit: string;
  schedules: MedicationSchedule[];
  notes?: string;
}

export interface MedicationDoseRecord {
  id: string;
  medicationId: string;
  scheduleId: string;
  scheduledTime: string;
  date: string;
  status: MedicationDoseStatus;
  recordedAt: string;
}

export type SymptomRating = 1 | 2 | 3 | 4 | 5;

export interface SymptomCheckIn {
  id: string;
  occurredAt: string;
  energy: SymptomRating;
  fatigue: SymptomRating;
  sleepQuality: SymptomRating;
  mood: SymptomRating;
  focus: SymptomRating;
  temperatureComfort: SymptomRating;
  digestion: SymptomRating;
  notes?: string;
}
