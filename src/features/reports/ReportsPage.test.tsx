import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import { toIsoDate } from "../../health/healthUtils.js";
import { lazy, Suspense } from "react";
import AppRoutes, { RouteErrorBoundary, RouteLoadingFallback } from "../../AppRoutes.jsx";
import ReportsPage from "./ReportsPage";

const pdfExporter = vi.hoisted(() => ({ generate: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../health/reportPdf.js", () => ({ generateHealthReportPdf: pdfExporter.generate }));

const PendingPage = lazy(() => new Promise<{ default: () => null }>(() => {}));

function BrokenPage(): never {
  throw new Error("Failed to load page module");
}

function TestProviders({ children }: PropsWithChildren) {
  return (
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter><HealthDataProvider>{children}</HealthDataProvider></MemoryRouter>
    </ChakraProvider>
  );
}

function renderWithProviders(element: ReactElement) {
  return render(<TestProviders>{element}</TestProviders>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Reports page", () => {
  it("shows an accessible loading status while a route is loading", () => {
    renderWithProviders(<Suspense fallback={<RouteLoadingFallback />}><PendingPage /></Suspense>);

    expect(screen.getByRole("status").textContent).toBe("Loading page...");
  });

  it("shows an accessible recovery state when a route fails to load", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithProviders(<RouteErrorBoundary><BrokenPage /></RouteErrorBoundary>);

    expect(screen.getByRole("alert").textContent).toContain("This page could not be loaded.");
    expect(screen.getByRole("button", { name: "Reload app" })).toBeTruthy();
    consoleError.mockRestore();
  });

  it("previews selected sections with the required fictional-data disclaimer", () => {
    renderWithProviders(<ReportsPage />);

    expect(screen.getByRole("heading", { name: "Reports", level: 1 })).toBeTruthy();
    expect(screen.getByText("Fictional Demo Data — Not for Medical Use")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Profile Summary" })).toBeTruthy();
    expect(screen.getByText("Maya Bennett")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Thyroid lab results with user-entered reference ranges" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Report preview" }).hasAttribute("aria-live")).toBe(false);
    expect(screen.getByRole("status").textContent).toContain("Report preview includes 7 sections");
    const activityTableRegion = screen.getByRole("region", { name: "Recorded activity entries" });
    expect(activityTableRegion.tabIndex).toBe(0);
    expect(within(activityTableRegion).getByRole("table", { name: "Recorded activity entries" })).toBeTruthy();
    expect(within(activityTableRegion).getByText("Walking")).toBeTruthy();
  });

  it("supports custom date ranges and rejects an end date before the start", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    await user.selectOptions(screen.getByLabelText("Date range"), "custom");
    const startDate = screen.getByLabelText("Start date");
    const endDate = screen.getByLabelText("End date");
    await user.clear(startDate);
    await user.type(startDate, "2026-10-25");
    await user.clear(endDate);
    await user.type(endDate, "2026-10-20");

    expect(screen.getByRole("alert").textContent).toContain("on or before");
    expect(startDate.getAttribute("required")).not.toBeNull();
    expect(endDate.getAttribute("required")).not.toBeNull();
    expect(startDate.getAttribute("aria-invalid")).toBe("true");
    expect(endDate.getAttribute("aria-describedby")).toBe("report-date-error");
    expect(screen.getByRole("button", { name: "Download PDF" }).hasAttribute("disabled")).toBe(true);

    await user.clear(startDate);
    await user.type(startDate, toIsoDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await user.clear(endDate);
    await user.type(endDate, toIsoDate(tomorrow));
    expect(startDate.getAttribute("aria-invalid")).toBe("false");
    expect(endDate.getAttribute("aria-invalid")).toBe("true");
  });

  it("updates the preview when sections are deselected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    await user.click(screen.getByRole("checkbox", { name: "Profile summary" }));
    expect(screen.queryByRole("heading", { name: "Profile Summary" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Activity History" })).toBeTruthy();
  });

  it("announces the no-sections state and prevents empty exports", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    for (const section of [
      "Profile summary",
      "Weight and BMI history",
      "Thyroid lab results",
      "Medication tracking and recorded doses",
      "Symptom history",
      "Nutrition and hydration summaries",
      "Activity history",
    ]) {
      await user.click(screen.getByRole("checkbox", { name: section }));
    }

    const sectionPicker = screen.getByRole("group", { name: "Sections to include" });
    expect(sectionPicker.getAttribute("aria-invalid")).toBe("true");
    expect(sectionPicker.getAttribute("aria-describedby")).toBe("report-sections-error");
    expect(screen.getByRole("alert").textContent).toContain("Select at least one");
    expect(screen.getByRole("button", { name: "Download PDF" }).hasAttribute("disabled")).toBe(true);
  });

  it("generates a PDF only from currently selected report sections", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    await user.click(screen.getByRole("checkbox", { name: "Profile summary" }));
    await user.click(screen.getByRole("checkbox", { name: "Weight and BMI history" }));
    await user.click(screen.getByRole("checkbox", { name: "Thyroid lab results" }));
    await user.click(screen.getByRole("checkbox", { name: "Medication tracking and recorded doses" }));
    await user.click(screen.getByRole("checkbox", { name: "Symptom history" }));
    await user.click(screen.getByRole("checkbox", { name: "Nutrition and hydration summaries" }));
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(pdfExporter.generate).toHaveBeenCalledWith(expect.objectContaining({ selectedSections: ["activity"] }));
  });

  it("registers the Reports route in the existing navigation", () => {
    renderWithProviders(<AppRoutes />);
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByRole("link", { name: "Reports" })).toBeTruthy();
  });
});