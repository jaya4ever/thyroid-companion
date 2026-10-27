import type { jsPDF } from "jspdf";
import { formatActivityType } from "./activityUtils.js";
import type { HealthReportData, ReportSectionId } from "./reportUtils.js";

const disclaimer = "Fictional Demo Data — Not for Medical Use";
const margin = 42;
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(value: string): string {
  if (!value) return "Not recorded";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHeight(heightCm: number, unit: "cm" | "imperial"): string {
  if (unit === "cm") return `${heightCm.toFixed(1)} cm`;
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  return `${feet} ft ${(totalInches - feet * 12).toFixed(1)} in`;
}

function formatOptionalNumber(value: number | null | undefined, unit = ""): string {
  return value === null || value === undefined
    ? "Not recorded"
    : `${value}${unit ? ` ${unit}` : ""}`;
}

function formatReferenceRange(minimum?: number, maximum?: number, unit = ""): string {
  if (minimum === undefined && maximum === undefined) return "Not provided";
  const suffix = unit ? ` ${unit}` : "";
  if (minimum !== undefined && maximum !== undefined) return `${minimum}-${maximum}${suffix}`;
  if (minimum !== undefined) return `>= ${minimum}${suffix}`;
  return `<= ${maximum}${suffix}`;
}

function formatNutritionTotal(total: number | null, recorded: number, missing: number, unit: string): string {
  const value = total === null ? "Not recorded" : `${total} ${unit}`;
  return `${value}; ${recorded} recorded, ${missing} missing`;
}

function sectionLabel(report: HealthReportData, id: ReportSectionId): string {
  return report.selectedSections.includes(id) ? id : "";
}

export async function createHealthReportPdf(report: HealthReportData): Promise<jsPDF> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  document.setFont("helvetica", "bold");
  document.setFontSize(19);
  document.setTextColor(48, 77, 62);
  document.text("Thyroid Companion", margin, 42);
  document.setFont("helvetica", "normal");
  document.setFontSize(12);
  document.text("Health Summary Report", margin, 62);
  document.setFontSize(9);
  document.setTextColor(83, 101, 91);
  document.text(`Period: ${formatDate(report.dateRange.startDate)} - ${formatDate(report.dateRange.endDate)}`, margin, 80);
  document.text(`Generated: ${formatDate(report.generatedOn)}`, margin, 94);
  document.setFillColor(232, 239, 231);
  document.roundedRect(margin, 108, contentWidth, 26, 3, 3, "F");
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.setTextColor(48, 77, 62);
  document.text(disclaimer, margin + 9, 125);

  let cursorY = 154;
  const addTable = (title: string, headers: string[], rows: string[][]): void => {
    const sectionHeight = 32;
    if (cursorY + sectionHeight > pageHeight - 72) {
      document.addPage();
      cursorY = 58;
    }
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.setTextColor(48, 77, 62);
    document.text(title, margin, cursorY);
    cursorY += 9;

    autoTable(document, {
      startY: cursorY,
      head: [headers],
      body: rows.length > 0 ? rows : [headers.map((_, index) => index === 0 ? "Not recorded in this date range" : "")],
      margin: { top: 56, right: margin, bottom: 42, left: margin },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", textColor: [52, 74, 62] },
      headStyles: { fillColor: [79, 134, 111], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 245] },
      didDrawPage: ({ pageNumber }) => {
        const currentPage = document.internal.pages.length - 1;
        if (currentPage > 1) {
          document.setFont("helvetica", "bold");
          document.setFontSize(8);
          document.setTextColor(83, 101, 91);
          document.text("Thyroid Companion | Health Summary", margin, 30);
        }
        document.setFont("helvetica", "normal");
        document.setFontSize(7);
        document.setTextColor(83, 101, 91);
        document.text(disclaimer, margin, pageHeight - 20);
        document.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 20, { align: "right" });
        void pageNumber;
      },
    });
    const finalY = (document as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    cursorY = (finalY ?? cursorY) + 20;
  };

  if (sectionLabel(report, "profile")) {
    addTable("Profile Summary", ["Item", "Details"], [
      ["Name", report.profile.name || "Not recorded"],
      ["Date of birth", formatDate(report.profile.dateOfBirth)],
      ["Height", formatHeight(report.profile.heightCm, report.profile.heightUnit)],
      ["Thyroid conditions recorded", report.profile.thyroidConditions.join(", ") || "None recorded"],
      ["Latest weight in selected period", formatOptionalNumber(report.profile.latestWeight, report.profile.weightUnit)],
      ["BMI at latest weight in selected period", formatOptionalNumber(report.profile.bmi)],
    ]);
  }

  if (sectionLabel(report, "weight")) {
    addTable("Weight and BMI History", ["Date", `Weight (${report.profile.weightUnit})`, "BMI"], report.weightRecords.map((record) => [
      formatDate(record.date),
      formatOptionalNumber(record.displayWeight, report.profile.weightUnit),
      formatOptionalNumber(record.bmi),
    ]));
  }

  if (sectionLabel(report, "labs")) {
    addTable("Thyroid Lab Results", ["Date", "Test", "Result", "Reference range"], report.labResults.map((result) => [
      formatDate(result.date),
      result.testType,
      `${result.value} ${result.unit}`,
      formatReferenceRange(result.referenceMin, result.referenceMax, result.unit),
    ]));
  }

  if (sectionLabel(report, "medications")) {
    const medicationsById = new Map(report.medications.map((medication) => [medication.id, medication]));
    const medicationRows = report.medications.map((medication) => {
      const schedules = medication.schedules.map((schedule) => {
        const days = schedule.daysOfWeek.map((day) => weekdayNames[day]).join("/");
        return days ? `${days} ${schedule.time}` : schedule.time;
      }).join(", ") || "No schedule recorded";
      return [medication.name, `${medication.prescribedDose} ${medication.doseUnit}`, schedules];
    });
    addTable("Medication Tracking", ["Medication", "Prescribed dose", "Recorded schedule times"], medicationRows);
    const doseRows = report.medicationDoseRecords.map((record) => [
      formatDate(record.date),
      medicationsById.get(record.medicationId)?.name ?? "Medication not found",
      record.scheduledTime,
      formatDateTime(record.recordedAt),
      record.status === "taken" ? "Recorded as taken" : "Recorded as skipped",
    ]);
    addTable("Recorded Dose Events", ["Date", "Medication", "Scheduled time", "Recorded at", "Recorded status"], doseRows);
  }

  if (sectionLabel(report, "symptoms")) {
    const symptomRows = report.symptomCheckIns.flatMap((entry) => [
      [formatDateTime(entry.occurredAt), "Energy", String(entry.energy)],
      ["", "Fatigue", String(entry.fatigue)],
      ["", "Sleep quality", String(entry.sleepQuality)],
      ["", "Mood", String(entry.mood)],
      ["", "Focus", String(entry.focus)],
      ["", "Temperature comfort", String(entry.temperatureComfort)],
      ["", "Digestion", String(entry.digestion)],
      ...(entry.notes ? [["", "Note", entry.notes]] : []),
    ]);
    addTable("Symptom History", ["Date and time", "Measure", "Recorded rating / note"], symptomRows);
  }

  if (sectionLabel(report, "nutrition")) {
    addTable("Nutrition and Hydration Summaries", ["Date", "Calories", "Protein", "Carbohydrates", "Fat", "Water"], report.nutritionDays.map((day) => [
      formatDate(day.date),
      formatNutritionTotal(day.totals.calories.total, day.totals.calories.recordedEntries, day.totals.calories.missingEntries, "kcal"),
      formatNutritionTotal(day.totals.proteinGrams.total, day.totals.proteinGrams.recordedEntries, day.totals.proteinGrams.missingEntries, "g"),
      formatNutritionTotal(day.totals.carbohydratesGrams.total, day.totals.carbohydratesGrams.recordedEntries, day.totals.carbohydratesGrams.missingEntries, "g"),
      formatNutritionTotal(day.totals.fatGrams.total, day.totals.fatGrams.recordedEntries, day.totals.fatGrams.missingEntries, "g"),
      formatOptionalNumber(day.hydrationTotalMl, "mL"),
    ]));
  }

  if (sectionLabel(report, "activity")) {
    addTable("Activity History", ["Date", "Activity", "Duration", "Distance"], report.activityEntries.map((entry) => [
      formatDate(entry.date),
      formatActivityType(entry.activityType),
      `${entry.durationMinutes} min`,
      formatOptionalNumber(entry.distanceKm, "km"),
    ]));
  }

  return document;
}

export async function generateHealthReportPdf(report: HealthReportData): Promise<number> {
  const document = await createHealthReportPdf(report);
  document.save(`thyroid-companion-report-${report.dateRange.startDate}-to-${report.dateRange.endDate}.pdf`);
  return document.getNumberOfPages();
}