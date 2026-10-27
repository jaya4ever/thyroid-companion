import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildHealthReport } from "./reportUtils.js";
import type { ReportSourceData } from "./reportUtils.js";
import { generateHealthReportPdf } from "./reportPdf.js";

const pdf = vi.hoisted(() => {
  const document = {
    internal: {
      pageSize: { getWidth: () => 595, getHeight: () => 842 },
      pages: [1],
    },
    getNumberOfPages: () => 1,
    lastAutoTable: { finalY: 200 },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    text: vi.fn(),
    roundedRect: vi.fn(),
    save: vi.fn(),
  };
  return { document, autoTable: vi.fn() };
});

vi.mock("jspdf", () => ({ jsPDF: vi.fn(function jsPdfMock() { return pdf.document; }) }));
vi.mock("jspdf-autotable", () => ({ autoTable: pdf.autoTable }));

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
  activityEntries: [{ id: "activity-1", date: "2026-10-25", activityType: "walking", durationMinutes: 30 }],
};

describe("PDF report generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a local PDF with the selected sections and required disclaimer", async () => {
    const report = buildHealthReport(
      sourceData,
      { startDate: "2026-10-01", endDate: "2026-10-27" },
      ["profile", "labs"],
      new Date(2026, 9, 27),
    );

    await generateHealthReportPdf(report);

    expect(pdf.document.text).toHaveBeenCalledWith("Fictional Demo Data — Not for Medical Use", 51, 125);
    expect(pdf.autoTable).toHaveBeenCalledTimes(2);
    expect(pdf.document.save).toHaveBeenCalledWith("thyroid-companion-report-2026-10-01-to-2026-10-27.pdf");
  });

  it("does not add non-selected report sections to the PDF", async () => {
    const report = buildHealthReport(
      sourceData,
      { startDate: "2026-10-01", endDate: "2026-10-27" },
      ["activity"],
      new Date(2026, 9, 27),
    );

    await generateHealthReportPdf(report);

    expect(pdf.document.text).toHaveBeenCalledWith("Activity History", 42, 154);
    expect(pdf.document.text).not.toHaveBeenCalledWith("Profile Summary", expect.any(Number), expect.any(Number));
    expect(pdf.autoTable).toHaveBeenCalledTimes(1);
    expect(pdf.autoTable).toHaveBeenCalledWith(pdf.document, expect.objectContaining({
      body: [["Oct 25, 2026", "Walking", "30 min", "Not recorded"]],
    }));
  });
});