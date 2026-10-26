import { useState } from "react";
import type { PropsWithChildren } from "react";
import {
  createDemoMedicationDoseRecords,
  createDemoSymptomCheckIns,
  demoLabResults,
  demoMedications,
  demoProfile,
  demoWeightEntries,
} from "../data/demoData.js";
import { HealthDataContext } from "./healthDataContext.js";
import type {
  LabResult,
  Medication,
  MedicationDoseRecord,
  MedicationDoseStatus,
  SymptomCheckIn,
  UserProfile,
  WeightEntry,
  WeightUnit,
} from "../types/health";
import { sortLabResults, validateLabResult } from "../health/labUtils.js";
import type { LabResultInput } from "../health/labUtils";
import {
  sortMedicationDoseRecords,
  sortSymptomCheckIns,
  validateMedication,
  validateSymptomCheckIn,
} from "../health/trackingUtils.js";
import type { MedicationInput, SymptomCheckInInput } from "../health/trackingUtils";
import {
  calculateBmi,
  convertWeightToKilograms,
  getLatestWeightEntry,
  sortWeightEntries,
  toIsoDate,
  isValidIsoDate,
  validateWeightEntry,
} from "../health/healthUtils.js";

let nextEntryId = 1;

function createEntryId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `demo-entry-${Date.now()}-${nextEntryId++}`;
}

type WeightEntryCreation = { ok: true; entry: WeightEntry } | { ok: false; error: string };

function makeWeightEntry(value: number | string, unit: WeightUnit, date: string): WeightEntryCreation {
  const validationMessage = validateWeightEntry(value, date);
  const weightKg = convertWeightToKilograms(value, unit);
  if (validationMessage || weightKg === null) {
    return { ok: false, error: validationMessage || "Enter a valid weight." };
  }
  return { ok: true, entry: { id: createEntryId(), date, weightKg } };
}

export function HealthDataProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<UserProfile>(() => ({
    ...demoProfile,
    thyroidConditions: [...demoProfile.thyroidConditions],
  }));
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>(() =>
    demoWeightEntries.map((entry) => ({ ...entry })),
  );
  const [labResults, setLabResults] = useState<LabResult[]>(() => demoLabResults.map((result) => ({ ...result })));
  const [medications, setMedications] = useState<Medication[]>(() =>
    demoMedications.map((medication) => ({
      ...medication,
      schedules: medication.schedules.map((schedule) => ({ ...schedule, daysOfWeek: [...schedule.daysOfWeek] })),
    })),
  );
  const [medicationDoseRecords, setMedicationDoseRecords] = useState<MedicationDoseRecord[]>(() =>
    createDemoMedicationDoseRecords(),
  );
  const [symptomCheckIns, setSymptomCheckIns] = useState<SymptomCheckIn[]>(() =>
    sortSymptomCheckIns(createDemoSymptomCheckIns()),
  );

  const sortedWeightEntries = sortWeightEntries(weightEntries);
  const latestWeightEntry = getLatestWeightEntry(sortedWeightEntries);
  const bmi = calculateBmi(latestWeightEntry?.weightKg, profile.heightCm);

  function saveProfile(updatedProfile: UserProfile, currentWeightKg: number): boolean {
    if (!Number.isFinite(currentWeightKg) || currentWeightKg <= 0) return false;

    setProfile({
      ...updatedProfile,
      thyroidConditions: [...updatedProfile.thyroidConditions],
    });
    setWeightEntries((entries) => {
      const latest = getLatestWeightEntry(entries);
      if (latest && Math.abs(latest.weightKg - currentWeightKg) < 0.0001) return entries;

      const date = toIsoDate(new Date());
      const existingToday = entries.find((entry) => entry.date === date);
      if (existingToday) {
        return sortWeightEntries(
          entries.map((entry) => (entry.id === existingToday.id ? { ...entry, weightKg: currentWeightKg } : entry)),
        );
      }
      return sortWeightEntries([...entries, { id: createEntryId(), date, weightKg: currentWeightKg }]);
    });
    return true;
  }

  function addWeightEntry(value: number | string, unit: WeightUnit, date: string): string {
    const result = makeWeightEntry(value, unit, date);
    if (!result.ok) return result.error;
    setWeightEntries((entries) => sortWeightEntries([...entries, result.entry]));
    return "";
  }

  function editWeightEntry(id: string, value: number | string, unit: WeightUnit, date: string): string {
    const result = makeWeightEntry(value, unit, date);
    if (!result.ok) return result.error;
    setWeightEntries((entries) =>
      sortWeightEntries(entries.map((entry) => (entry.id === id ? { ...result.entry, id } : entry))),
    );
    return "";
  }

  function deleteWeightEntry(id: string): void {
    setWeightEntries((entries) => entries.filter((entry) => entry.id !== id));
  }

  function addLabResult(input: LabResultInput): string {
    const validationMessage = validateLabResult(input);
    if (validationMessage) return validationMessage;
    setLabResults((results) => sortLabResults([...results, { ...input, id: createEntryId() }]));
    return "";
  }

  function editLabResult(id: string, input: LabResultInput): string {
    const validationMessage = validateLabResult(input);
    if (validationMessage) return validationMessage;
    setLabResults((results) => sortLabResults(results.map((result) => (result.id === id ? { ...input, id } : result))));
    return "";
  }

  function deleteLabResult(id: string): void {
    setLabResults((results) => results.filter((result) => result.id !== id));
  }

  function addMedication(input: MedicationInput): string {
    const validationMessage = validateMedication(input, medications);
    if (validationMessage) return validationMessage;
    const medication: Medication = {
      id: createEntryId(),
      name: input.name.trim(),
      prescribedDose: input.prescribedDose,
      doseUnit: input.doseUnit.trim(),
      schedules: input.schedules.map((schedule) => ({
        id: schedule.id ?? createEntryId(),
        time: schedule.time,
        daysOfWeek: [...schedule.daysOfWeek],
      })),
    };
    if (input.notes?.trim()) medication.notes = input.notes.trim();
    setMedications((entries) => [...entries, medication]);
    return "";
  }

  function editMedication(id: string, input: MedicationInput): string {
    const validationMessage = validateMedication(input, medications, id);
    if (validationMessage) return validationMessage;
    const current = medications.find((medication) => medication.id === id);
    if (!current) return "This medication could not be found.";
    const medication: Medication = {
      id,
      name: input.name.trim(),
      prescribedDose: input.prescribedDose,
      doseUnit: input.doseUnit.trim(),
      schedules: input.schedules.map((schedule) => ({
        id: schedule.id ?? createEntryId(),
        time: schedule.time,
        daysOfWeek: [...schedule.daysOfWeek],
      })),
    };
    if (input.notes?.trim()) medication.notes = input.notes.trim();
    setMedications((entries) => entries.map((entry) => (entry.id === id ? medication : entry)));
    return "";
  }

  function deleteMedication(id: string): void {
    setMedications((entries) => entries.filter((entry) => entry.id !== id));
    setMedicationDoseRecords((records) => records.filter((record) => record.medicationId !== id));
  }

  function setMedicationDoseStatus(
    medicationId: string,
    scheduleId: string,
    date: string,
    status: MedicationDoseStatus | null,
  ): string {
    const medication = medications.find((entry) => entry.id === medicationId);
    const schedule = medication?.schedules.find((entry) => entry.id === scheduleId);
    if (!medication || !schedule) return "This medication schedule could not be found.";
    if (!isValidIsoDate(date)) return "Choose a valid dose date.";
    if (date > toIsoDate(new Date())) return "A future dose cannot be recorded.";
    const [year, month, day] = date.split("-").map(Number);
    if (!schedule.daysOfWeek.includes(new Date(year, month - 1, day).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
      return "This medication is not scheduled for that day.";
    }
    setMedicationDoseRecords((records) => {
      const withoutCurrent = records.filter(
        (record) => !(record.medicationId === medicationId && record.scheduleId === scheduleId && record.date === date),
      );
      if (status === null) return sortMedicationDoseRecords(withoutCurrent);
      return sortMedicationDoseRecords([
        ...withoutCurrent,
        {
          id: createEntryId(),
          medicationId,
          scheduleId,
          scheduledTime: schedule.time,
          date,
          status,
          recordedAt: new Date().toISOString(),
        },
      ]);
    });
    return "";
  }

  function addSymptomCheckIn(input: SymptomCheckInInput): string {
    const validationMessage = validateSymptomCheckIn(input, symptomCheckIns);
    if (validationMessage) return validationMessage;
    setSymptomCheckIns((entries) => sortSymptomCheckIns([...entries, { ...input, id: createEntryId() }]));
    return "";
  }

  function editSymptomCheckIn(id: string, input: SymptomCheckInInput): string {
    const validationMessage = validateSymptomCheckIn(input, symptomCheckIns, id);
    if (validationMessage) return validationMessage;
    if (!symptomCheckIns.some((entry) => entry.id === id)) return "This check-in could not be found.";
    setSymptomCheckIns((entries) =>
      sortSymptomCheckIns(entries.map((entry) => (entry.id === id ? { ...input, id } : entry))),
    );
    return "";
  }

  function deleteSymptomCheckIn(id: string): void {
    setSymptomCheckIns((entries) => entries.filter((entry) => entry.id !== id));
  }

  return (
    <HealthDataContext.Provider
      value={{
        profile,
        weightEntries: sortedWeightEntries,
        latestWeightEntry,
        bmi,
        saveProfile,
        addWeightEntry,
        editWeightEntry,
        deleteWeightEntry,
        labResults: sortLabResults(labResults),
        addLabResult,
        editLabResult,
        deleteLabResult,
        medications,
        medicationDoseRecords: sortMedicationDoseRecords(medicationDoseRecords),
        addMedication,
        editMedication,
        deleteMedication,
        setMedicationDoseStatus,
        symptomCheckIns: sortSymptomCheckIns(symptomCheckIns),
        addSymptomCheckIn,
        editSymptomCheckIn,
        deleteSymptomCheckIn,
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
}
