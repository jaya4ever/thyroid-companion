import { describe, expect, it } from "vitest";
import {
  calculateAge,
  calculateBmi,
  convertWeightToKilograms,
  feetAndInchesToMeters,
  filterWeightEntries,
  getLatestWeightEntry,
  sortWeightEntries,
  validateWeightEntry,
} from "./healthUtils.js";

describe("health measurement helpers", () => {
  it("converts pounds to kilograms", () => {
    expect(convertWeightToKilograms(150, "lb")).toBeCloseTo(68.0389, 3);
  });

  it("converts feet and inches to meters", () => {
    expect(feetAndInchesToMeters(5, 6)).toBeCloseTo(1.6764, 4);
  });

  it("calculates BMI to one decimal place", () => {
    expect(calculateBmi(68, 170)).toBe(23.5);
  });

  it("returns no BMI for missing or invalid measurements", () => {
    expect(calculateBmi(null, 170)).toBeNull();
    expect(calculateBmi(68, 0)).toBeNull();
    expect(calculateBmi(-1, 170)).toBeNull();
  });

  it("calculates age before and after the birthday in a year", () => {
    expect(calculateAge("1990-10-27", new Date(2026, 9, 26))).toBe(35);
    expect(calculateAge("1990-10-26", new Date(2026, 9, 26))).toBe(36);
    expect(calculateAge("2030-01-01", new Date(2026, 9, 26))).toBeNull();
  });

  it("sorts weight entries by date and finds the latest independent of input order", () => {
    const entries = [
      { id: "b", date: "2026-10-24", weightKg: 68.4 },
      { id: "a", date: "2026-09-02", weightKg: 69.2 },
    ];
    expect(sortWeightEntries(entries).map((entry) => entry.date)).toEqual(["2026-09-02", "2026-10-24"]);
    expect(getLatestWeightEntry(entries)?.weightKg).toBe(68.4);
    expect(getLatestWeightEntry([])).toBeNull();
  });

  it("filters empty history and rejects invalid weight form values", () => {
    expect(filterWeightEntries([], 7, new Date(2026, 9, 26))).toEqual([]);
    expect(validateWeightEntry("", "2026-10-20")).toBe("Enter a weight greater than zero.");
    expect(validateWeightEntry(68, "2026-02-30")).toBe("Choose a valid measurement date.");
  });
});
