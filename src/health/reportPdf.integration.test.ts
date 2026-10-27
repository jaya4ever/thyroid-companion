import { describe, expect, it } from "vitest";
import { buildHealthReport } from "./reportUtils.js";
import type { ReportSourceData } from "./reportUtils.js";
import { createHealthReportPdf } from "./reportPdf.js";

const sourceData: ReportSourceData = {
  profile: {
    name: "Fictional Sample",
    dateOfBirth: "1990-04-03",
    heightCm: 170,
    heightUnit: "cm",
    weightUnit: "kg",
    goalWeightKg: 70,
    thyroidConditions: [],
  },
  weightEntries: [],
  labResults: [],
  medications: [],
  medicationDoseRecords: [],
  symptomCheckIns: [],
  nutritionEntries: [],
  hydrationEntries: [],
  activityEntries: Array.from({ length: 120 }, (_, index) => ({
    id: `activity-${index}`,
    date: "2026-10-27",
    activityType: "walking",
    durationMinutes: 20,
  })),
};

describe("PDF export integration", () => {
  it("creates a multi-page PDF with the installed jsPDF and AutoTable libraries", async () => {
    const report = buildHealthReport(
      sourceData,
      { startDate: "2026-10-01", endDate: "2026-10-27" },
      ["activity"],
      new Date(2026, 9, 27),
    );

    const document = await createHealthReportPdf(report);
    const pdfBytes = new Uint8Array(document.output("arraybuffer"));
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));

    expect(document.getNumberOfPages()).toBeGreaterThan(1);
    expect(pdfHeader).toBe("%PDF-");
  });
});
