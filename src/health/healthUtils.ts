import type { WeightEntry, WeightUnit } from "../types/health";

const KILOGRAMS_PER_POUND = 0.45359237;
const CENTIMETERS_PER_INCH = 2.54;

function finitePositiveNumber(value: number | string | null | undefined): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function poundsToKilograms(pounds: number | string): number | null {
  const value = finitePositiveNumber(pounds);
  return value === null ? null : value * KILOGRAMS_PER_POUND;
}

export function convertWeightToKilograms(value: number | string, unit: WeightUnit): number | null {
  if (unit === "kg") return finitePositiveNumber(value);
  if (unit === "lb") return poundsToKilograms(value);
  return null;
}

export function convertKilogramsToWeight(kilograms: number | null | undefined, unit: WeightUnit): number | null {
  const value = finitePositiveNumber(kilograms);
  if (value === null) return null;
  if (unit === "kg") return value;
  if (unit === "lb") return value / KILOGRAMS_PER_POUND;
  return null;
}

export function feetAndInchesToMeters(feet: number | string, inches: number | string): number | null {
  const footValue = Number(feet);
  const inchValue = Number(inches);
  if (!Number.isFinite(footValue) || !Number.isFinite(inchValue) || footValue < 0 || inchValue < 0 || inchValue >= 12)
    return null;

  const totalInches = footValue * 12 + inchValue;
  return totalInches > 0 ? (totalInches * CENTIMETERS_PER_INCH) / 100 : null;
}

export function centimetersToMeters(centimeters: number | string | null | undefined): number | null {
  const value = finitePositiveNumber(centimeters);
  return value === null ? null : value / 100;
}

export function calculateBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  const weight = finitePositiveNumber(weightKg);
  const heightMeters = centimetersToMeters(heightCm);
  if (weight === null || heightMeters === null) return null;
  return Math.round((weight / (heightMeters * heightMeters)) * 10) / 10;
}

function parseIsoDate(dateString: string): Date | null {
  if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function isValidIsoDate(dateString: string): boolean {
  return parseIsoDate(dateString) !== null;
}

export function calculateAge(dateOfBirth: string, today = new Date()): number | null {
  const birthDate = parseIsoDate(dateOfBirth);
  if (!birthDate || !(today instanceof Date) || Number.isNaN(today.getTime())) return null;

  const age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  const calculatedAge = age - Number(beforeBirthday);
  return calculatedAge >= 0 ? calculatedAge : null;
}

export function sortWeightEntries(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort(
    (first, second) => first.date.localeCompare(second.date) || String(first.id).localeCompare(String(second.id)),
  );
}

export function getLatestWeightEntry(entries: WeightEntry[]): WeightEntry | null {
  const sorted = sortWeightEntries(entries);
  return sorted.at(-1) ?? null;
}

export function filterWeightEntries(entries: WeightEntry[], range: number | "all", today = new Date()): WeightEntry[] {
  const sorted = sortWeightEntries(entries);
  if (range === "all") return sorted;

  const days = Number(range);
  if (!Number.isInteger(days) || days < 1 || !(today instanceof Date) || Number.isNaN(today.getTime())) return [];
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const startString = toIsoDate(start);
  const endString = toIsoDate(end);
  return sorted.filter((entry) => entry.date >= startString && entry.date <= endString);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateWeightEntry(value: number | string, date: string): string {
  if (finitePositiveNumber(value) === null) return "Enter a weight greater than zero.";
  if (!isValidIsoDate(date)) return "Choose a valid measurement date.";
  if (date > toIsoDate(new Date())) return "The measurement date cannot be in the future.";
  return "";
}
