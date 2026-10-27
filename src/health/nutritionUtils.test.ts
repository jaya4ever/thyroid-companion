import { describe, expect, it } from "vitest";
import {
  filterNutritionEntries,
  getDailyHydrationTotal,
  getDailyNutritionTotals,
  getNutritionDailySeries,
  hydrationAmountToMilliliters,
  millilitersToHydrationAmount,
  sortNutritionEntries,
  validateHydrationEntry,
  validateNutritionEntry,
} from "./nutritionUtils.js";
import type { HydrationEntry, NutritionEntry } from "../types/health";

const nutritionEntries: NutritionEntry[] = [
  { id: "meal-b", date: "2026-10-26", mealCategory: "lunch", foodName: "Fictional bowl", calories: 0 },
  { id: "meal-a", date: "2026-10-26", mealCategory: "breakfast", foodName: "Fictional oats", calories: 250, proteinGrams: 10 },
  { id: "meal-older", date: "2026-10-25", mealCategory: "snack", foodName: "Fictional apple" },
];

describe("nutrition and hydration helpers", () => {
  it("keeps missing nutrition values distinct from an explicitly recorded zero", () => {
    const totals = getDailyNutritionTotals(nutritionEntries, "2026-10-26");
    expect(totals.calories).toEqual({ total: 250, recordedEntries: 2, missingEntries: 0 });
    expect(totals.proteinGrams).toEqual({ total: 10, recordedEntries: 1, missingEntries: 1 });
    expect(getDailyNutritionTotals([nutritionEntries[0]], "2026-10-26").calories.total).toBe(0);
    expect(getDailyNutritionTotals([nutritionEntries[0]], "2026-10-26").fatGrams.total).toBeNull();
  });

  it("validates optional non-negative nutrient values without inferring them", () => {
    expect(validateNutritionEntry({
      date: "2026-10-26",
      mealCategory: "breakfast",
      foodName: "Fictional entry",
      calories: 0,
    }, new Date(2026, 9, 26))).toBe("");
    expect(validateNutritionEntry({
      date: "2026-10-26",
      mealCategory: "snack",
      foodName: "Fictional entry",
      proteinGrams: -1,
    }, new Date(2026, 9, 26))).toContain("protein");
    expect(validateNutritionEntry({
      date: "2026-02-30",
      mealCategory: "dinner",
      foodName: "Fictional entry",
    }, new Date(2026, 9, 26))).toContain("valid entry date");
  });

  it("sorts nutrition records by day and meal and filters by date", () => {
    expect(sortNutritionEntries(nutritionEntries).map((entry) => entry.id)).toEqual(["meal-a", "meal-b", "meal-older"]);
    expect(filterNutritionEntries(nutritionEntries, "2026-10-26")).toHaveLength(2);
    expect(filterNutritionEntries(nutritionEntries, "all")).toHaveLength(3);
  });

  it("keeps missing values as gaps and recorded zeroes as zero in nutrition trends", () => {
    const series = getNutritionDailySeries([
      { id: "missing", date: "2026-10-25", mealCategory: "snack", foodName: "Unmeasured" },
      { id: "zero", date: "2026-10-26", mealCategory: "snack", foodName: "Recorded zero", calories: 0 },
    ], "calories", "7d", new Date(2026, 9, 26));
    expect(series).toEqual([
      { date: "2026-10-25", value: null, recorded: 0, missing: 1 },
      { date: "2026-10-26", value: 0, recorded: 1, missing: 0 },
    ]);
  });

  it("converts US fluid ounces and milliliters accurately", () => {
    expect(hydrationAmountToMilliliters(1, "fl-oz")).toBeCloseTo(29.5735295625, 8);
    expect(millilitersToHydrationAmount(29.5735295625, "fl-oz")).toBeCloseTo(1, 10);
    expect(millilitersToHydrationAmount(250, "ml")).toBe(250);
  });

  it("validates hydration dates and positive finite amounts", () => {
    const today = new Date(2026, 9, 26);
    expect(validateHydrationEntry("2026-10-26", 250, today)).toBe("");
    expect(validateHydrationEntry("2026-02-30", 250, today)).toContain("valid hydration date");
    expect(validateHydrationEntry("2026-10-26", Number.POSITIVE_INFINITY, today)).toContain("greater than zero");
    expect(validateHydrationEntry("2026-10-26", 0, today)).toContain("greater than zero");
  });

  it("totals only recorded hydration entries for the selected date", () => {
    const entries: HydrationEntry[] = [
      { id: "water-1", date: "2026-10-26", amountMl: 250 },
      { id: "water-2", date: "2026-10-26", amountMl: 500 },
      { id: "water-old", date: "2026-10-25", amountMl: 125 },
    ];
    expect(getDailyHydrationTotal(entries, "2026-10-26")).toBe(750);
    expect(getDailyHydrationTotal(entries, "2026-10-24")).toBeNull();
  });
});