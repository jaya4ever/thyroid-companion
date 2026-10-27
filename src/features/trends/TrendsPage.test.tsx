import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import { useHealthData } from "../../context/useHealthData.js";
import { createLocalDateTime } from "../../health/trackingUtils.js";
import TrendsPage from "./TrendsPage";

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = { target, contentRect: { width: 600, height: 250 } } as ResizeObserverEntry;
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

function ClearCheckIns() {
  const { symptomCheckIns, deleteSymptomCheckIn } = useHealthData();
  return (
    <button type="button" onClick={() => symptomCheckIns.forEach((entry) => deleteSymptomCheckIn(entry.id))}>
      Clear demo check-ins
    </button>
  );
}

function AddSameDayCheckIn() {
  const { addSymptomCheckIn } = useHealthData();
  return (
    <button type="button" onClick={() => {
      const occurredAt = new Date();
      occurredAt.setDate(occurredAt.getDate() - 1);
      occurredAt.setHours(10, 0, 0, 0);
      addSymptomCheckIn({
        occurredAt: createLocalDateTime(occurredAt),
        energy: 2,
        fatigue: 2,
        sleepQuality: 2,
        mood: 2,
        focus: 2,
        temperatureComfort: 2,
        digestion: 2,
      });
    }}>Add same-day check-in</button>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("symptom trends", () => {
  it("plots one selected rating on a fixed 1–5 scale and provides a table", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TrendsPage />);

    const energyChart = screen.getByRole("img", { name: "Energy by date, measured in Rating (1–5)" });
    expect(within(energyChart).getByText("1")).toBeTruthy();
    expect(within(energyChart).getByText("5")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Energy by date; values use Rating (1–5)" })).toBeTruthy();
    const trendTableRegion = screen.getByRole("region", { name: "Energy trend data table" });
    expect(trendTableRegion.tabIndex).toBe(0);
    expect(within(trendTableRegion).getByRole("table", { name: "Energy by date; values use Rating (1–5)" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Symptom area"), "sleepQuality");
    expect(screen.getByRole("img", { name: "Sleep quality by date, measured in Rating (1–5)" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Sleep quality by date; values use Rating (1–5)" })).toBeTruthy();
    expect(screen.getByText("1: Very poor · 5: Very good")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "7 days" }));
    expect(screen.getByRole("button", { name: "7 days" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "90 days" }));
    expect(screen.getByRole("button", { name: "90 days" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps duplicate-day check-ins distinct and labels them by time", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <AddSameDayCheckIn />
        <TrendsPage />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Add same-day check-in" }));
    const chart = screen.getByRole("img", { name: "Energy by date, measured in Rating (1–5)" });
    const duplicateDay = new Date();
    duplicateDay.setDate(duplicateDay.getDate() - 1);
    const dateLabel = duplicateDay.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    expect(within(chart).getByText(`${dateLabel}, 9:00 AM`)).toBeTruthy();
    expect(within(chart).getByText(`${dateLabel}, 10:00 AM`)).toBeTruthy();

    const table = screen.getByRole("table", { name: "Energy by date; values use Rating (1–5)" });
    expect(within(table).getByText(`${dateLabel}, 9:00 AM`)).toBeTruthy();
    expect(within(table).getByText(`${dateLabel}, 10:00 AM`)).toBeTruthy();
  });

  it("shows a helpful message when fewer than two check-ins exist", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ClearCheckIns />
        <TrendsPage />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear demo check-ins" }));
    expect(screen.getByText("No recorded values in this range.")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /by date, measured in/ })).toBeNull();
  });

  it("switches between activity, hydration, and nutrition charts with explicit units", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TrendsPage />);

    await user.selectOptions(screen.getByLabelText("Measure"), "activity");
    expect(screen.getByRole("img", { name: "Activity duration by date, measured in Minutes" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Activity duration by date; values use Minutes" })).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Measure"), "hydration");
    expect(screen.getByRole("img", { name: "Recorded hydration by date, measured in mL" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Display unit"), "fl-oz");
    expect(screen.getByRole("img", { name: "Recorded hydration by date, measured in US fl oz" })).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Measure"), "nutrition");
    await user.selectOptions(screen.getByLabelText("Nutrition value"), "proteinGrams");
    expect(screen.getByRole("img", { name: "Protein by date, measured in g" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Protein by date; values use g" })).toBeTruthy();
  });

  it("keeps missing nutrition dates visible as not recorded instead of zero", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TrendsPage />);

    await user.selectOptions(screen.getByLabelText("Measure"), "nutrition");
    const table = screen.getByRole("table", { name: "Calories by date; values use kcal" });
    expect(screen.getByRole("img", { name: "Calories by date, measured in kcal" })).toBeTruthy();
    expect(within(table).getByText("Not recorded")).toBeTruthy();
    expect(within(table).queryByText("0")).toBeNull();
  });
});
