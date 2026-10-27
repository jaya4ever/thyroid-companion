import { createContext } from "react";
import type {
  LabResult,
  ActivityEntry,
  HydrationEntry,
  Medication,
  MedicationDoseRecord,
  MedicationDoseStatus,
  NutritionEntry,
  SymptomCheckIn,
  UserProfile,
  WeightEntry,
  WeightUnit,
} from "../types/health";
import type { LabResultInput } from "../health/labUtils";
import type { MedicationInput, SymptomCheckInInput } from "../health/trackingUtils";
import type { ActivityEntryInput } from "../health/activityUtils";
import type { HydrationEntryInput, NutritionEntryInput } from "../health/nutritionUtils";

export interface HealthDataContextValue {
  profile: UserProfile;
  weightEntries: WeightEntry[];
  latestWeightEntry: WeightEntry | null;
  bmi: number | null;
  saveProfile: (profile: UserProfile, currentWeightKg: number) => boolean;
  addWeightEntry: (value: number | string, unit: WeightUnit, date: string) => string;
  editWeightEntry: (id: string, value: number | string, unit: WeightUnit, date: string) => string;
  deleteWeightEntry: (id: string) => void;
  labResults: LabResult[];
  addLabResult: (input: LabResultInput) => string;
  editLabResult: (id: string, input: LabResultInput) => string;
  deleteLabResult: (id: string) => void;
  medications: Medication[];
  medicationDoseRecords: MedicationDoseRecord[];
  addMedication: (input: MedicationInput) => string;
  editMedication: (id: string, input: MedicationInput) => string;
  deleteMedication: (id: string) => void;
  setMedicationDoseStatus: (
    medicationId: string,
    scheduleId: string,
    date: string,
    status: MedicationDoseStatus | null,
  ) => string;
  symptomCheckIns: SymptomCheckIn[];
  addSymptomCheckIn: (input: SymptomCheckInInput) => string;
  editSymptomCheckIn: (id: string, input: SymptomCheckInInput) => string;
  deleteSymptomCheckIn: (id: string) => void;
  nutritionEntries: NutritionEntry[];
  addNutritionEntry: (input: NutritionEntryInput) => string;
  editNutritionEntry: (id: string, input: NutritionEntryInput) => string;
  deleteNutritionEntry: (id: string) => void;
  hydrationEntries: HydrationEntry[];
  addHydrationEntry: (input: HydrationEntryInput) => string;
  editHydrationEntry: (id: string, input: HydrationEntryInput) => string;
  deleteHydrationEntry: (id: string) => void;
  activityEntries: ActivityEntry[];
  addActivityEntry: (input: ActivityEntryInput) => string;
  editActivityEntry: (id: string, input: ActivityEntryInput) => string;
  deleteActivityEntry: (id: string) => void;
}

export const HealthDataContext = createContext<HealthDataContextValue | null>(null);
