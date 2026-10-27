import { isValidIsoDate, toIsoDate } from "./healthUtils.js";
import type { HydrationEntry, HydrationUnit, MealCategory, NutritionEntry } from "../types/health";

export type NutritionMetric = "calories" | "proteinGrams" | "carbohydratesGrams" | "fatGrams";
export type NutritionRange = "7d" | "30d" | "90d";

export const nutritionMetricLabels: Record<NutritionMetric, { label: string; unit: string }> = {
  calories: { label: "Calories", unit: "kcal" },
  proteinGrams: { label: "Protein", unit: "g" },
  carbohydratesGrams: { label: "Carbohydrates", unit: "g" },
  fatGrams: { label: "Fat", unit: "g" },
};

export interface NutritionEntryInput extends Omit<NutritionEntry, "id"> {}
export interface HydrationEntryInput extends Omit<HydrationEntry, "id"> {}

export interface NutritionMetricTotal {
  total: number | null;
  recordedEntries: number;
  missingEntries: number;
}

export type DailyNutritionTotals = Record<NutritionMetric, NutritionMetricTotal>;

const mealCategories: MealCategory[] = ["breakfast", "lunch", "dinner", "snack"];
const nutritionMetrics: NutritionMetric[] = ["calories", "proteinGrams", "carbohydratesGrams", "fatGrams"];
const millilitersPerFluidOunce = 29.5735295625;

export function validateNutritionEntry(input: NutritionEntryInput, today = new Date()): string {
  if (!isValidIsoDate(input.date)) return "Choose a valid entry date.";
  if (input.date > toIsoDate(today)) return "The entry date cannot be in the future.";
  if (!mealCategories.includes(input.mealCategory)) return "Choose a meal category.";
  if (!input.foodName.trim()) return "Enter a food name.";
  for (const metric of nutritionMetrics) {
    const value = input[metric];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      return `Enter a finite, non-negative ${nutritionMetricLabels[metric].label.toLocaleLowerCase()} value.`;
    }
  }
  return "";
}

export function sortNutritionEntries(entries: NutritionEntry[]): NutritionEntry[] {
  const mealOrder = new Map(mealCategories.map((meal, index) => [meal, index]));
  return [...entries].sort((first, second) =>
    second.date.localeCompare(first.date) ||
    (mealOrder.get(first.mealCategory) ?? 0) - (mealOrder.get(second.mealCategory) ?? 0) ||
    first.id.localeCompare(second.id),
  );
}

export function filterNutritionEntries(entries: NutritionEntry[], date: string | "all"): NutritionEntry[] {
  return sortNutritionEntries(date === "all" ? entries : entries.filter((entry) => entry.date === date));
}

export function getDailyNutritionTotals(entries: NutritionEntry[], date: string): DailyNutritionTotals {
  const dailyEntries = entries.filter((entry) => entry.date === date);
  return Object.fromEntries(nutritionMetrics.map((metric) => {
    const recorded = dailyEntries.flatMap((entry) => entry[metric] === undefined ? [] : [entry[metric] as number]);
    return [metric, {
      total: recorded.length === 0 ? null : recorded.reduce((sum, value) => sum + value, 0),
      recordedEntries: recorded.length,
      missingEntries: dailyEntries.length - recorded.length,
    }];
  })) as DailyNutritionTotals;
}

export function getNutritionDailySeries(
  entries: NutritionEntry[],
  metric: NutritionMetric,
  range: NutritionRange,
  today = new Date(),
): Array<{ date: string; value: number | null; recorded: number; missing: number }> {
  if (Number.isNaN(today.getTime())) return [];
  const days = Number.parseInt(range, 10);
  const lastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDate = new Date(lastDate);
  firstDate.setDate(firstDate.getDate() - days + 1);
  const entriesByDate = new Map<string, NutritionEntry[]>();
  for (const entry of entries) {
    if (entry.date < toIsoDate(firstDate) || entry.date > toIsoDate(lastDate)) continue;
    const group = entriesByDate.get(entry.date) ?? [];
    group.push(entry);
    entriesByDate.set(entry.date, group);
  }
  return [...entriesByDate.keys()].sort().map((date) => {
    const total = getDailyNutritionTotals(entriesByDate.get(date) ?? [], date)[metric];
    return { date, value: total.total, recorded: total.recordedEntries, missing: total.missingEntries };
  });
}

export function validateHydrationEntry(date: string, amountMl: number, today = new Date()): string {
  if (!isValidIsoDate(date)) return "Choose a valid hydration date.";
  if (date > toIsoDate(today)) return "The hydration date cannot be in the future.";
  if (!Number.isFinite(amountMl) || amountMl <= 0) return "Enter an amount greater than zero.";
  return "";
}

export function hydrationAmountToMilliliters(amount: number, unit: HydrationUnit): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return unit === "ml" ? amount : amount * millilitersPerFluidOunce;
}

export function millilitersToHydrationAmount(amountMl: number, unit: HydrationUnit): number | null {
  if (!Number.isFinite(amountMl) || amountMl <= 0) return null;
  return unit === "ml" ? amountMl : amountMl / millilitersPerFluidOunce;
}

export function getDailyHydrationTotal(entries: HydrationEntry[], date: string): number | null {
  const values = entries.filter((entry) => entry.date === date).map((entry) => entry.amountMl);
  return values.length === 0 ? null : values.reduce((sum, amount) => sum + amount, 0);
}

export function getHydrationDailySeries(
  entries: HydrationEntry[],
  range: NutritionRange,
  today = new Date(),
): Array<{ date: string; amountMl: number }> {
  if (Number.isNaN(today.getTime())) return [];
  const days = Number.parseInt(range, 10);
  const lastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDate = new Date(lastDate);
  firstDate.setDate(firstDate.getDate() - days + 1);
  const dates = [...new Set(entries.filter((entry) =>
    entry.date >= toIsoDate(firstDate) && entry.date <= toIsoDate(lastDate),
  ).map((entry) => entry.date))].sort();
  return dates.flatMap((date) => {
    const total = getDailyHydrationTotal(entries, date);
    return total === null ? [] : [{ date, amountMl: total }];
  });
}

export function sortHydrationEntries(entries: HydrationEntry[]): HydrationEntry[] {
  return [...entries].sort((first, second) =>
    second.date.localeCompare(first.date) || first.id.localeCompare(second.id),
  );
}