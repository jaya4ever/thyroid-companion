import type {
  Medication,
  MedicationDoseRecord,
  MedicationSchedule,
  SymptomCheckIn,
  SymptomRating,
  Weekday,
} from "../types/health";
import { isValidIsoDate } from "./healthUtils.js";

export type MedicationScheduleInput = Omit<MedicationSchedule, "id"> & { id?: string };

export interface MedicationInput {
  name: string;
  prescribedDose: number;
  doseUnit: string;
  schedules: MedicationScheduleInput[];
  notes?: string;
}

export type SymptomCheckInInput = Omit<SymptomCheckIn, "id">;
export type SymptomRatingField = Exclude<keyof SymptomCheckIn, "id" | "occurredAt" | "notes">;

export const symptomRatingFields: ReadonlyArray<{
  key: SymptomRatingField;
  label: string;
  lowLabel: string;
  highLabel: string;
}> = [
  { key: "energy", label: "Energy", lowLabel: "Very low", highLabel: "Very high" },
  { key: "fatigue", label: "Fatigue", lowLabel: "None", highLabel: "Very strong" },
  { key: "sleepQuality", label: "Sleep quality", lowLabel: "Very poor", highLabel: "Very good" },
  { key: "mood", label: "Mood", lowLabel: "Very low", highLabel: "Very good" },
  { key: "focus", label: "Focus", lowLabel: "Very low", highLabel: "Very high" },
  {
    key: "temperatureComfort",
    label: "Temperature comfort",
    lowLabel: "Very uncomfortable",
    highLabel: "Very comfortable",
  },
  { key: "digestion", label: "Digestion", lowLabel: "Very uncomfortable", highLabel: "Very comfortable" },
];

export function isValidTime(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function scheduleConflicts(first: MedicationScheduleInput, second: MedicationScheduleInput): boolean {
  return first.time === second.time && first.daysOfWeek.some((day) => second.daysOfWeek.includes(day));
}

export function validateMedication(input: MedicationInput, medications: Medication[] = [], editingId?: string): string {
  if (!input.name.trim()) return "Enter a medication name.";
  if (!Number.isFinite(input.prescribedDose) || input.prescribedDose <= 0) {
    return "Enter a dose greater than zero.";
  }
  if (!input.doseUnit.trim()) return "Enter the prescribed dose unit.";
  if (input.schedules.length === 0) return "Add at least one schedule time.";

  for (const schedule of input.schedules) {
    if (!isValidTime(schedule.time)) return "Enter a valid schedule time.";
    if (schedule.daysOfWeek.length === 0) return "Choose at least one schedule day.";
    if (schedule.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return "Choose valid days of the week.";
    }
    if (new Set(schedule.daysOfWeek).size !== schedule.daysOfWeek.length) {
      return "A schedule cannot include the same day more than once.";
    }
  }
  for (let firstIndex = 0; firstIndex < input.schedules.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < input.schedules.length; secondIndex += 1) {
      if (scheduleConflicts(input.schedules[firstIndex], input.schedules[secondIndex])) {
        return "A medication cannot have overlapping schedules at the same time.";
      }
    }
  }

  const normalizedName = input.name.trim().toLocaleLowerCase();
  const duplicate = medications.find((medication) => {
    if (medication.id === editingId) return false;
    const sameMedication =
      medication.name.trim().toLocaleLowerCase() === normalizedName &&
      medication.prescribedDose === input.prescribedDose &&
      medication.doseUnit.trim().toLocaleLowerCase() === input.doseUnit.trim().toLocaleLowerCase();
    return (
      sameMedication &&
      medication.schedules.some((existing) =>
        input.schedules.some((candidate) => scheduleConflicts(existing, candidate)),
      )
    );
  });

  return duplicate ? "This medication already has a matching schedule." : "";
}

export function sortMedicationDoseRecords(records: MedicationDoseRecord[]): MedicationDoseRecord[] {
  return [...records].sort(
    (first, second) => second.date.localeCompare(first.date) || second.recordedAt.localeCompare(first.recordedAt),
  );
}

export function getMedicationDoseStatus(
  records: MedicationDoseRecord[],
  medicationId: string,
  scheduleId: string,
  date: string,
): MedicationDoseRecord["status"] | "not-recorded" {
  return (
    records.find(
      (record) => record.medicationId === medicationId && record.scheduleId === scheduleId && record.date === date,
    )?.status ?? "not-recorded"
  );
}

export function getTodaySchedules(
  medications: Medication[],
  today = new Date(),
): Array<{
  medication: Medication;
  schedule: MedicationSchedule;
}> {
  if (Number.isNaN(today.getTime())) return [];
  const weekday = today.getDay() as Weekday;
  return medications
    .flatMap((medication) =>
      medication.schedules
        .filter((schedule) => schedule.daysOfWeek.includes(weekday))
        .map((schedule) => ({ medication, schedule })),
    )
    .sort((first, second) => first.schedule.time.localeCompare(second.schedule.time));
}

function isValidLocalDateTime(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match || !isValidIsoDate(match[1])) return false;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getHours() === hours && date.getMinutes() === minutes;
}

export function isSymptomRating(value: number): value is SymptomRating {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function validateSymptomCheckIn(
  input: SymptomCheckInInput,
  existing: SymptomCheckIn[] = [],
  editingId?: string,
  now = new Date(),
): string {
  if (!isValidLocalDateTime(input.occurredAt)) return "Enter a valid check-in date and time.";
  if (new Date(input.occurredAt).getTime() > now.getTime()) return "The check-in time cannot be in the future.";
  for (const field of symptomRatingFields) {
    if (!isSymptomRating(input[field.key])) return `Choose a ${field.label.toLocaleLowerCase()} rating from 1 to 5.`;
  }
  if (existing.some((entry) => entry.id !== editingId && entry.occurredAt === input.occurredAt)) {
    return "A check-in already exists for this date and time.";
  }
  return "";
}

export function sortSymptomCheckIns(entries: SymptomCheckIn[]): SymptomCheckIn[] {
  return [...entries].sort((first, second) => second.occurredAt.localeCompare(first.occurredAt));
}

export function createLocalDateTime(date = new Date()): string {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

export function getTodaySymptomCheckIn(entries: SymptomCheckIn[], today = new Date()): SymptomCheckIn | null {
  if (Number.isNaN(today.getTime())) return null;
  const date = createLocalDateTime(today).slice(0, 10);
  return sortSymptomCheckIns(entries).find((entry) => entry.occurredAt.slice(0, 10) === date) ?? null;
}
