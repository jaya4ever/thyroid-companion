import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import { useHealthData } from "../../context/useHealthData.js";
import DashboardPage from "../dashboard/DashboardPage.jsx";
import MedicationsPage from "./MedicationsPage";

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = { target, contentRect: { width: 600, height: 260 } } as ResizeObserverEntry;
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

function DashboardAndMedications() {
  return (
    <>
      <DashboardPage />
      <MedicationsPage />
    </>
  );
}

function ClearMedications() {
  const { medications, deleteMedication } = useHealthData();
  return (
    <button type="button" onClick={() => medications.forEach((medication) => deleteMedication(medication.id))}>
      Clear demo medications
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("medication tracking", () => {
  it("exposes dose history as a named keyboard-scrollable region", () => {
    renderWithProviders(<MedicationsPage />);

    const tableRegion = screen.getByRole("region", { name: "Recorded medication dose history" });
    expect(tableRegion.tabIndex).toBe(0);
    expect(within(tableRegion).getByRole("table", { name: "Recorded medication dose history" })).toBeTruthy();
  });

  it("adds, edits, and deletes medication records with confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<MedicationsPage />);

    await user.type(screen.getByLabelText("Medication name"), "Demo medication B");
    await user.type(screen.getByLabelText("Prescribed dose"), "5");
    await user.type(screen.getByLabelText("Dose unit"), "mg");
    await user.type(screen.getByLabelText("Notes (optional)"), "Fictional note");
    await user.click(screen.getByRole("button", { name: "Add medication" }));
    expect(screen.getByText("Medication added for this demo session.")).toBeTruthy();
    expect(screen.getAllByText("Demo medication B").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Edit Demo medication B" }));
    await user.clear(screen.getByLabelText("Prescribed dose"));
    await user.type(screen.getByLabelText("Prescribed dose"), "7.5");
    await user.click(screen.getByRole("button", { name: "Save medication" }));
    expect(screen.getByText("7.5 mg · 08:00")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete Demo medication B" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.queryAllByText("Demo medication B")).toHaveLength(0);
  });

  it("rejects empty, non-positive, malformed, and conflicting medication entries", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MedicationsPage />);

    await user.click(screen.getByRole("button", { name: "Add medication" }));
    expect(screen.getByRole("alert").textContent).toContain("medication name");

    await user.type(screen.getByLabelText("Medication name"), "Demo medication");
    await user.type(screen.getByLabelText("Prescribed dose"), "0");
    await user.type(screen.getByLabelText("Dose unit"), "mg");
    await user.click(screen.getByRole("button", { name: "Add medication" }));
    expect(screen.getByRole("alert").textContent).toContain("greater than zero");

    await user.clear(screen.getByLabelText("Prescribed dose"));
    await user.type(screen.getByLabelText("Prescribed dose"), "10");
    fireEvent.change(screen.getByLabelText("Schedule time"), { target: { value: "25:90" } });
    await user.click(screen.getByRole("button", { name: "Add medication" }));
    expect(screen.getByRole("alert").textContent).toContain("valid schedule time");

    await user.clear(screen.getByLabelText("Medication name"));
    await user.type(screen.getByLabelText("Medication name"), "Levothyroxine");
    await user.clear(screen.getByLabelText("Prescribed dose"));
    await user.type(screen.getByLabelText("Prescribed dose"), "50");
    await user.clear(screen.getByLabelText("Dose unit"));
    await user.type(screen.getByLabelText("Dose unit"), "mcg");
    fireEvent.change(screen.getByLabelText("Schedule time"), { target: { value: "08:00" } });
    await user.click(screen.getByRole("button", { name: "Add medication" }));
    expect(screen.getByRole("alert").textContent).toContain("matching schedule");
  });

  it("keeps scheduled status unrecorded until explicitly changed and synchronizes updates", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardAndMedications />);

    expect(screen.getByText("Not yet recorded", { selector: ".dose-status" })).toBeTruthy();
    const medicationMetric = screen.getByRole("article", { name: "Medication: 1 scheduled" });
    expect(within(medicationMetric).getByText("0 marked taken today")).toBeTruthy();
    const dashboardStatus = screen.getByLabelText("Dose status for Levothyroxine at 08:00", {
      selector: "select#dashboard-dose-demo-medication-1-morning",
    });
    await user.selectOptions(dashboardStatus, "taken");
    expect(screen.getByText("Marked taken", { selector: ".dose-status" })).toBeTruthy();
    expect(within(medicationMetric).getByText("1 marked taken today")).toBeTruthy();
    const medicationStatus = screen.getByLabelText("Dose status for Levothyroxine at 08:00", {
      selector: "select#dose-status-demo-medication-1-morning",
    });
    await user.selectOptions(medicationStatus, "skipped");
    expect(screen.getByText("Marked skipped", { selector: ".dose-status" })).toBeTruthy();
    expect(screen.queryByText("16:00")).toBeNull();
    expect(screen.getAllByText("Marked skipped", { selector: ".tracking-history-table td:last-child" })).toHaveLength(
      2,
    );
  });

  it("keeps the original schedule time in dose history after a schedule edit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MedicationsPage />);

    await user.click(screen.getByRole("button", { name: "Edit Levothyroxine" }));
    fireEvent.change(screen.getByLabelText("Schedule time"), { target: { value: "09:15" } });
    await user.click(screen.getByRole("button", { name: "Save medication" }));

    expect(screen.getByText(/Scheduled 09:15/)).toBeTruthy();
    const history = screen.getByRole("table", { name: "Recorded medication dose history" });
    expect(within(history).getAllByRole("row")[1].textContent).toContain("08:00");
  });

  it("shows an empty schedule state when all medication records are removed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(
      <>
        <ClearMedications />
        <MedicationsPage />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Delete Levothyroxine" }));
    expect(screen.getByText("No medication doses are scheduled for today.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear demo medications" }));
    expect(screen.getByText(/No medications added yet/)).toBeTruthy();
    expect(screen.getByText("No dose history has been recorded yet.")).toBeTruthy();
  });
});
