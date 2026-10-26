import { createContext } from "react";
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
import type { LabResultInput } from "../health/labUtils";
import type { MedicationInput, SymptomCheckInInput } from "../health/trackingUtils";

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
}

export const HealthDataContext = createContext<HealthDataContextValue | null>(null);
