import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import { useHealthData } from "../../context/useHealthData.js";
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("symptom trends", () => {
  it("plots one selected rating on a fixed 1–5 scale and provides a table", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TrendsPage />);

    expect(screen.getByRole("img", { name: "Energy ratings from 1 to 5 over check-in dates" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Energy symptom ratings by date" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Symptom area"), "sleepQuality");
    expect(screen.getByRole("img", { name: "Sleep quality ratings from 1 to 5 over check-in dates" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Sleep quality symptom ratings by date" })).toBeTruthy();
    expect(screen.getByText("1: Very poor · 5: Very good")).toBeTruthy();
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
    expect(screen.getByText("At least two check-ins are needed to show a symptom trend.")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /ratings from 1 to 5/ })).toBeNull();
  });
});
