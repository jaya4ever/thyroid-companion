import { describe, expect, it } from "vitest";
import {
  distanceFromKilometers,
  filterActivityEntries,
  getActivityDailySeries,
  formatActivityType,
  getActivityMinutesForPeriod,
  kilometersFromDistance,
  sortActivityEntries,
  validateActivityEntry,
} from "./activityUtils.js";
import type { ActivityEntry } from "../types/health";

const activities: ActivityEntry[] = [
  { id: "run-1", date: "2026-10-26", activityType: "running", durationMinutes: 30, distanceKm: 5 },
  { id: "walk-1", date: "2026-10-28", activityType: "walking", durationMinutes: 60 },
  { id: "yoga-old", date: "2026-10-20", activityType: "yoga", durationMinutes: 30 },
];

describe("activity helpers", () => {
  it("formats activity names consistently for reports and history", () => {
    expect(formatActivityType("strength training")).toBe("Strength Training");
  });
  it("converts kilometers and miles accurately", () => {
    expect(kilometersFromDistance(1, "mi")).toBe(1.609344);
    expect(distanceFromKilometers(1.609344, "mi")).toBeCloseTo(1, 12);
    expect(distanceFromKilometers(4, "km")).toBe(4);
  });

  it("validates activity fields and allows absent distance", () => {
    const today = new Date(2026, 9, 28);
    expect(validateActivityEntry({
      date: "2026-10-28",
      activityType: "walking",
      durationMinutes: 45,
    }, today)).toBe("");
    expect(validateActivityEntry({
      date: "2026-10-28",
      activityType: "cycling",
      durationMinutes: 0,
    }, today)).toContain("greater than zero minutes");
    expect(validateActivityEntry({
      date: "2026-10-28",
      activityType: "cycling",
      durationMinutes: 20,
      distanceKm: Number.NaN,
    }, today)).toContain("distance greater than zero");
    expect(validateActivityEntry({
      date: "2026-02-30",
      activityType: "yoga",
      durationMinutes: 20,
    }, today)).toContain("valid activity date");
  });

  it("sorts and filters activity by type and date", () => {
    expect(sortActivityEntries(activities).map((entry) => entry.id)).toEqual(["walk-1", "run-1", "yoga-old"]);
    expect(filterActivityEntries(activities, "walking", "all").map((entry) => entry.id)).toEqual(["walk-1"]);
    expect(filterActivityEntries(activities, "all", "2026-10-26")).toHaveLength(1);
  });

  it("summarizes weekly and monthly minutes and returns chronological daily data", () => {
    const today = new Date(2026, 9, 28);
    expect(getActivityMinutesForPeriod(activities, "week", today)).toBe(90);
    expect(getActivityMinutesForPeriod(activities, "month", today)).toBe(120);
    expect(getActivityDailySeries(activities, "7d", today)).toEqual([
      { date: "2026-10-26", minutes: 30 },
      { date: "2026-10-28", minutes: 60 },
    ]);
  });
});