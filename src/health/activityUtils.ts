import { isValidIsoDate, toIsoDate } from "./healthUtils.js";
import type { ActivityEntry, ActivityType, DistanceUnit } from "../types/health";

export type ActivityRange = "7d" | "30d" | "90d";
export type ActivityPeriod = "week" | "month";
export interface ActivityEntryInput extends Omit<ActivityEntry, "id"> {}

export const activityTypes: ActivityType[] = [
  "walking",
  "running",
  "cycling",
  "strength training",
  "yoga",
  "swimming",
  "other",
];

export function validateActivityEntry(input: ActivityEntryInput, today = new Date()): string {
  if (!isValidIsoDate(input.date)) return "Choose a valid activity date.";
  if (input.date > toIsoDate(today)) return "The activity date cannot be in the future.";
  if (!activityTypes.includes(input.activityType)) return "Choose an activity type.";
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return "Enter a duration greater than zero minutes.";
  }
  if (input.distanceKm !== undefined && (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0)) {
    return "Enter a distance greater than zero or leave it blank.";
  }
  return "";
}

export function kilometersFromDistance(distance: number, unit: DistanceUnit): number | null {
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return unit === "km" ? distance : distance * 1.609344;
}

export function distanceFromKilometers(distanceKm: number, unit: DistanceUnit): number | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  return unit === "km" ? distanceKm : distanceKm / 1.609344;
}

export function sortActivityEntries(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((first, second) =>
    second.date.localeCompare(first.date) || first.id.localeCompare(second.id),
  );
}

export function filterActivityEntries(
  entries: ActivityEntry[],
  type: ActivityType | "all",
  date: string | "all",
): ActivityEntry[] {
  return sortActivityEntries(entries.filter((entry) =>
    (type === "all" || entry.activityType === type) && (date === "all" || entry.date === date),
  ));
}

export function getActivityMinutesForPeriod(
  entries: ActivityEntry[],
  period: ActivityPeriod,
  today = new Date(),
): number {
  if (Number.isNaN(today.getTime())) return 0;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === "week") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else {
    start.setDate(1);
  }
  const startDate = toIsoDate(start);
  const endDate = toIsoDate(today);
  return entries.filter((entry) => entry.date >= startDate && entry.date <= endDate)
    .reduce((total, entry) => total + entry.durationMinutes, 0);
}

export function getActivityDailySeries(
  entries: ActivityEntry[],
  range: ActivityRange,
  today = new Date(),
): Array<{ date: string; minutes: number }> {
  if (Number.isNaN(today.getTime())) return [];
  const days = Number.parseInt(range, 10);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const grouped = new Map<string, number>();
  for (const entry of entries) {
    if (entry.date < toIsoDate(start) || entry.date > toIsoDate(end)) continue;
    grouped.set(entry.date, (grouped.get(entry.date) ?? 0) + entry.durationMinutes);
  }
  return [...grouped.entries()].sort(([first], [second]) => first.localeCompare(second))
    .map(([date, minutes]) => ({ date, minutes }));
}