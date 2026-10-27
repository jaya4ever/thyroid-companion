import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import DashboardPage from "../dashboard/DashboardPage.jsx";
import AppRoutes from "../../AppRoutes.jsx";
import { useHealthData } from "../../context/useHealthData.js";
import ActivityPage from "./ActivityPage";

function TestProviders({ children }: PropsWithChildren) {
  return <ChakraProvider value={defaultSystem}><MemoryRouter><HealthDataProvider>{children}</HealthDataProvider></MemoryRouter></ChakraProvider>;
}

function renderWithProviders(element: ReactElement) {
  return render(<TestProviders>{element}</TestProviders>);
}

function DashboardAndActivity() {
  return <><DashboardPage /><ActivityPage /></>;
}

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) { this.callback = callback; }
  observe(target: Element): void {
    this.callback([{ target, contentRect: { width: 600, height: 260 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve(): void {}
  disconnect(): void {}
}

function ClearActivities() {
  const { activityEntries, deleteActivityEntry } = useHealthData();
  return <button type="button" onClick={() => activityEntries.forEach((entry) => deleteActivityEntry(entry.id))}>Clear demo activity</button>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("activity page", () => {
  it("shows the current local date in the overview header", () => {
    renderWithProviders(<DashboardPage />);

    const todayLabel = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    expect(screen.getByText(todayLabel)).toBeTruthy();
  });

  it("adds, edits, and deletes an activity with converted distance", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<ActivityPage />);

    await user.selectOptions(screen.getByLabelText("Activity type", { selector: "select#activity-type" }), "running");
    await user.type(screen.getByLabelText("Duration in minutes"), "25");
    await user.type(screen.getByLabelText("Distance (optional)"), "2");
    await user.selectOptions(screen.getByLabelText("Distance unit"), "mi");
    await user.click(screen.getByRole("button", { name: "Add activity" }));
    expect(screen.getByText("Activity added for this demo session.")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Distance display unit"), "mi");
    expect(screen.getByText("2 mi")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Edit Running from/ }));
    await user.clear(screen.getByLabelText("Duration in minutes"));
    await user.type(screen.getByLabelText("Duration in minutes"), "40");
    await user.click(screen.getByRole("button", { name: "Save activity" }));
    expect(screen.getByText("Activity updated for this demo session.")).toBeTruthy();
    expect(screen.getByText("40 min")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Delete Running from/ }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.queryByText("2 mi")).toBeNull();
  });

  it("rejects missing or invalid duration and invalid distance", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ActivityPage />);

    await user.click(screen.getByRole("button", { name: "Add activity" }));
    expect(screen.getByRole("alert").textContent).toContain("duration greater than zero");
    await user.type(screen.getByLabelText("Duration in minutes"), "30");
    await user.type(screen.getByLabelText("Distance (optional)"), "0");
    await user.click(screen.getByRole("button", { name: "Add activity" }));
    expect(screen.getByRole("alert").textContent).toContain("distance greater than zero");
  });

  it("filters by activity type and date", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ActivityPage />);

    await user.click(screen.getByRole("button", { name: "Show all dates" }));
    await user.selectOptions(screen.getByLabelText("Activity type", { selector: "select#activity-filter-type" }), "yoga");
    const table = screen.getByRole("table", { name: "Recorded activity history" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Yoga")).toBeTruthy();
    expect(within(table).queryByText("Walking")).toBeNull();
  });

  it("shows an empty state when all activity records are cleared", async () => {
    const user = userEvent.setup();
    renderWithProviders(<><ClearActivities /><ActivityPage /></>);

    await user.click(screen.getByRole("button", { name: "Clear demo activity" }));
    expect(screen.getByText("No activity records match these filters.")).toBeTruthy();
    expect(screen.getAllByText("Not recorded", { selector: "dd" })).toHaveLength(3);
  });

  it("updates today's Overview activity summary after saving a record", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardAndActivity />);

    const summary = screen.getByRole("region", { name: "Today's tracking" });
    expect(within(summary).getByText("1 entry · 30 min")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Activity type", { selector: "select#activity-type" }), "running");
    await user.type(screen.getByLabelText("Duration in minutes"), "20");
    await user.click(screen.getByRole("button", { name: "Add activity" }));
    expect(within(summary).getByText("2 entries · 50 min")).toBeTruthy();
  });

  it("shows weekly and monthly totals from recorded activity only", () => {
    renderWithProviders(<ActivityPage />);
    const summary = screen.getByRole("region", { name: "Recorded minutes" });
    expect(within(summary).getByText("This week").parentElement?.textContent).toContain("30 min");
    expect(within(summary).getByText("This month").parentElement?.textContent).toContain("110 min");
  });

  it("opens Nutrition and Activity from the existing navigation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    renderWithProviders(<AppRoutes />);

    await user.click(screen.getByRole("link", { name: "Nutrition" }));
    expect(screen.getByRole("heading", { name: "Nutrition", level: 1 })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Activity" }));
    expect(screen.getByRole("heading", { name: "Activity", level: 1 })).toBeTruthy();
  });

  it("opens Nutrition and Activity through the existing navigation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);

    await user.click(screen.getByRole("link", { name: "Nutrition" }));
    expect(screen.getByRole("heading", { name: "Nutrition", level: 1 })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Activity" }));
    expect(screen.getByRole("heading", { name: "Activity", level: 1 })).toBeTruthy();
  });
});