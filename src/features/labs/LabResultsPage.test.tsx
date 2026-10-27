import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import AppRoutes from "../../AppRoutes.jsx";
import DashboardPage from "../dashboard/DashboardPage.jsx";
import LabResultsPage from "./LabResultsPage";

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = {
      target,
      contentRect: { width: 600, height: 260 },
    } as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }

  unobserve(): void {}
  disconnect(): void {}
}

function TestProviders({ children }: PropsWithChildren) {
  return (
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <HealthDataProvider>{children}</HealthDataProvider>
      </MemoryRouter>
    </ChakraProvider>
  );
}

function renderWithProviders(element: ReactElement) {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  return render(<TestProviders>{element}</TestProviders>);
}

function DashboardAndLabs() {
  return (
    <>
      <DashboardPage />
      <LabResultsPage />
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lab results page", () => {
  it("associates an inverted reference range error with both range fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LabResultsPage />);

    await user.type(screen.getByLabelText("Measurement"), "2");
    await user.type(screen.getByLabelText("Reference minimum (optional)"), "5");
    await user.type(screen.getByLabelText("Reference maximum (optional)"), "1");
    await user.click(screen.getByRole("button", { name: "Save result" }));

    expect(screen.getByRole("alert").textContent).toContain("must not exceed");
    expect(screen.getByLabelText("Reference minimum (optional)").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Reference maximum (optional)").getAttribute("aria-describedby")).toBe("lab-form-error");
  });

  it("exposes saved results in a named keyboard-scrollable region", () => {
    renderWithProviders(<LabResultsPage />);

    const tableRegion = screen.getByRole("region", { name: "Saved fictional thyroid lab results" });
    expect(tableRegion.tabIndex).toBe(0);
    expect(within(tableRegion).getByRole("table", { name: "Saved fictional thyroid lab results" })).toBeTruthy();
  });

  it("adds a result and updates the dashboard count and recent value", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardAndLabs />);

    expect(screen.getByRole("article", { name: "Recent labs: 3 results" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Test type", { selector: "select#lab-test-type" }), "Free T3");
    await user.type(screen.getByLabelText("Measurement"), "3.2");
    fireEvent.change(screen.getByLabelText("Measurement date"), { target: { value: "2026-10-20" } });
    await user.selectOptions(screen.getByLabelText("Unit", { selector: "select#lab-unit" }), "pg/mL");
    await user.type(screen.getByLabelText("Reference minimum (optional)"), "2");
    await user.type(screen.getByLabelText("Reference maximum (optional)"), "4");
    await user.type(screen.getByLabelText("Laboratory name (optional)"), "Demo laboratory");
    await user.type(screen.getByLabelText("Notes (optional)"), "note <script>not executable</script>");
    await user.click(screen.getByRole("button", { name: "Save result" }));

    expect(screen.getByText("Lab result added for this demo session.")).toBeTruthy();
    expect(screen.getByRole("article", { name: "Recent labs: 4 results" })).toBeTruthy();
    const resultTable = screen.getByRole("table", { name: "Saved fictional thyroid lab results" });
    expect(within(resultTable).getByText("note <script>not executable</script>")).toBeTruthy();
    expect(screen.getByText("Within the entered range")).toBeTruthy();
    expect(screen.getByText("3.2")).toBeTruthy();
  });

  it("edits an existing result", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardAndLabs />);

    await user.click(screen.getByRole("button", { name: "Edit TSH from 2026-10-18" }));
    await user.clear(screen.getByLabelText("Measurement"));
    await user.type(screen.getByLabelText("Measurement"), "2.8");
    await user.click(screen.getByRole("button", { name: "Save result" }));

    expect(screen.getByText("Lab result updated for this demo session.")).toBeTruthy();
    expect(screen.getByText("2.8 mIU/L")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Recent lab results" })).getByText("2.8")).toBeTruthy();
  });

  it("deletes a result after confirmation and updates the dashboard count", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<DashboardAndLabs />);

    const resultRow = screen.getByRole("row", { name: /Free T4 Oct 18, 2026/ });
    await user.click(within(resultRow).getByRole("button", { name: "Delete Free T4 from 2026-10-18" }));

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("row", { name: /Free T4 Oct 18, 2026/ })).toBeNull();
    expect(screen.getByRole("article", { name: "Recent labs: 2 results" })).toBeTruthy();
  });

  it("filters by test type and sorts records by date", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LabResultsPage />);

    await user.type(screen.getByLabelText("Measurement"), "2.9");
    fireEvent.change(screen.getByLabelText("Measurement date"), { target: { value: "2026-09-20" } });
    await user.click(screen.getByRole("button", { name: "Save result" }));
    await user.selectOptions(screen.getByLabelText("Filter by test"), "TSH");
    const resultTable = screen.getByRole("table", { name: "Saved fictional thyroid lab results" });
    const newestRows = within(resultTable).getAllByRole("row");
    expect(newestRows).toHaveLength(3);
    expect(newestRows[1].textContent).toContain("Oct 18, 2026");

    await user.selectOptions(screen.getByLabelText("Sort by date"), "oldest");
    const oldestRows = within(resultTable).getAllByRole("row");
    expect(oldestRows[1].textContent).toContain("Sep 20, 2026");
  });

  it("rejects missing measurements and reversed reference ranges", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LabResultsPage />);

    await user.type(screen.getByLabelText("Measurement"), "3.1");
    await user.type(screen.getByLabelText("Reference minimum (optional)"), "5");
    await user.type(screen.getByLabelText("Reference maximum (optional)"), "2");
    await user.click(screen.getByRole("button", { name: "Save result" }));
    expect(screen.getByRole("alert").textContent).toContain("must not exceed");

    await user.clear(screen.getByLabelText("Reference minimum (optional)"));
    await user.clear(screen.getByLabelText("Reference maximum (optional)"));
    await user.clear(screen.getByLabelText("Measurement"));
    await user.click(screen.getByRole("button", { name: "Save result" }));
    expect(screen.getByRole("alert").textContent).toContain("finite numeric result");
  });

  it("shows a helpful state until two matching results are available to chart", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LabResultsPage />);

    expect(screen.getByText(/At least two results for this test, unit, and time range/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Test type", { selector: "select#lab-test-type" }), "Free T3");
    await user.type(screen.getByLabelText("Measurement"), "3.5");
    fireEvent.change(screen.getByLabelText("Measurement date"), { target: { value: "2026-10-21" } });
    await user.selectOptions(screen.getByLabelText("Unit", { selector: "select#lab-unit" }), "pg/mL");
    await user.click(screen.getByRole("button", { name: "Save result" }));

    expect(screen.getByText(/At least two results for this test, unit, and time range/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Test type", { selector: "select#lab-test-type" }), "Free T3");
    await user.selectOptions(screen.getByLabelText("Unit", { selector: "select#lab-unit" }), "pg/mL");
    await user.type(screen.getByLabelText("Measurement"), "3.7");
    fireEvent.change(screen.getByLabelText("Measurement date"), { target: { value: "2026-10-22" } });
    await user.click(screen.getByRole("button", { name: "Save result" }));
    await user.selectOptions(screen.getByLabelText("Test type", { selector: "select#chart-test-type" }), "Free T3");
    expect(screen.queryByText(/At least two results for this test, unit, and time range/)).toBeNull();
    expect(screen.getByRole("img", { name: /Free T3 measurements in pg\/mL/ })).toBeTruthy();
  });

  it("opens the interactive tracker from the Lab results navigation link", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);

    await user.click(screen.getByRole("link", { name: "Lab results" }));
    expect(await screen.findByRole("heading", { name: "Lab results", level: 1 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Add a lab result" })).toBeTruthy();
  });
});
