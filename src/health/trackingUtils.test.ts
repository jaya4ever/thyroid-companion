import { describe, expect, it } from "vitest";
import {
  getMedicationDoseStatus,
  getTodaySchedules,
  isValidTime,
  sortSymptomCheckIns,
  validateMedication,
  validateSymptomCheckIn,
} from "./trackingUtils.js";
import type { Medication, MedicationDoseRecord, SymptomCheckIn } from "../types/health";

const medication: Medication = {
  id: "med-1",
  name: "Fictional sample medication",
  prescribedDose: 25,
  doseUnit: "mcg",
  schedules: [{ id: "schedule-1", time: "08:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
};

const symptom: SymptomCheckIn = {
  id: "symptom-1",
  occurredAt: "2026-10-26T09:30",
  energy: 3,
  fatigue: 2,
  sleepQuality: 4,
  mood: 3,
  focus: 4,
  temperatureComfort: 3,
  digestion: 3,
};

describe("medication and symptom tracking helpers", () => {
  it("validates clock times and positive medication data", () => {
    expect(isValidTime("08:00")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(
      validateMedication({
        name: medication.name,
        prescribedDose: 25,
        doseUnit: "mcg",
        schedules: [{ time: "08:00", daysOfWeek: [1, 2] }],
      }),
    ).toBe("");
    expect(
      validateMedication({
        name: medication.name,
        prescribedDose: 0,
        doseUnit: "mcg",
        schedules: [{ time: "08:00", daysOfWeek: [1] }],
      }),
    ).toContain("greater than zero");
  });

  it("rejects overlapping duplicate medication schedules", () => {
    expect(
      validateMedication(
        {
          name: medication.name.toLocaleUpperCase(),
          prescribedDose: 25,
          doseUnit: "MCG",
          schedules: [{ time: "08:00", daysOfWeek: [1] }],
        },
        [medication],
      ),
    ).toContain("matching schedule");
    expect(
      validateMedication({
        name: "Another demo medication",
        prescribedDose: 10,
        doseUnit: "mg",
        schedules: [
          { time: "08:00", daysOfWeek: [1, 3] },
          { time: "08:00", daysOfWeek: [3, 5] },
        ],
      }),
    ).toContain("overlapping schedules");
  });

  it("gets today's scheduled doses without assigning a dose status", () => {
    const today = new Date(2026, 9, 26, 12);
    const schedules = getTodaySchedules([medication], today);
    expect(schedules).toHaveLength(1);
    expect(getMedicationDoseStatus([], medication.id, "schedule-1", "2026-10-26")).toBe("not-recorded");
    const record: MedicationDoseRecord = {
      id: "dose-1",
      medicationId: medication.id,
      scheduleId: "schedule-1",
      scheduledTime: "08:00",
      date: "2026-10-26",
      status: "taken",
      recordedAt: "2026-10-26T12:00:00.000Z",
    };
    expect(getMedicationDoseStatus([record], medication.id, "schedule-1", "2026-10-26")).toBe("taken");
  });

  it("validates symptom ratings, date-time values, and duplicate times", () => {
    const now = new Date(2026, 9, 26, 12);
    expect(validateSymptomCheckIn(symptom, [], undefined, now)).toBe("");
    expect(validateSymptomCheckIn({ ...symptom, energy: 6 as SymptomCheckIn["energy"] }, [], undefined, now)).toContain(
      "1 to 5",
    );
    expect(validateSymptomCheckIn({ ...symptom, occurredAt: "2026-02-30T09:30" }, [], undefined, now)).toContain(
      "valid check-in",
    );
    expect(validateSymptomCheckIn({ ...symptom, occurredAt: "2026-10-26T13:30" }, [], undefined, now)).toContain(
      "future",
    );
    expect(validateSymptomCheckIn(symptom, [symptom], undefined, now)).toContain("already exists");
  });

  it("sorts symptom entries newest first", () => {
    expect(
      sortSymptomCheckIns([symptom, { ...symptom, id: "symptom-2", occurredAt: "2026-10-25T09:30" }]).map(
        (entry) => entry.id,
      ),
    ).toEqual(["symptom-1", "symptom-2"]);
  });
});
