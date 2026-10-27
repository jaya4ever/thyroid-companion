import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import { useHealthData } from "../../context/useHealthData.js";
import { toIsoDate } from "../../health/healthUtils.js";
import DashboardPage from "../dashboard/DashboardPage.jsx";
import ProfilePage from "./ProfilePage.jsx";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
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

function ProfileWithClearControl() {
  const { weightEntries, deleteWeightEntry } = useHealthData();
  return (
    <>
      <button type="button" onClick={() => weightEntries.forEach((entry) => deleteWeightEntry(entry.id))}>
        Clear fictional entries
      </button>
      <ProfilePage />
    </>
  );
}

function DashboardWithWeightControl() {
  const { addWeightEntry } = useHealthData();
  return (
    <>
      <button type="button" onClick={() => addWeightEntry(75, "kg", toIsoDate(new Date()))}>
        Add demo weight update
      </button>
      <DashboardPage />
    </>
  );
}

function renderWithProviders(element: ReactElement) {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  return render(<TestProviders>{element}</TestProviders>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("profile and weight tracking", () => {
  it("exposes the weight table as a named keyboard-scrollable region", () => {
    renderWithProviders(<ProfilePage />);

    const tableRegion = screen.getByRole("region", { name: "Fictional weight entries in chronological order" });
    expect(tableRegion.tabIndex).toBe(0);
    expect(within(tableRegion).getByRole("table", { name: "Fictional weight entries in chronological order" })).toBeTruthy();
  });

  it("edits profile details, calculates age, and accepts multiple conditions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByLabelText("Full name").hasAttribute("required")).toBe(true);
    expect(screen.getByLabelText("Date of birth").hasAttribute("required")).toBe(true);
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Maya Demo");
    await user.clear(screen.getByLabelText(/Height in centimeters/));
    await user.type(screen.getByLabelText(/Height in centimeters/), "170");
    await user.clear(screen.getByLabelText("Current weight (kg)"));
    await user.type(screen.getByLabelText("Current weight (kg)"), "70");
    await user.click(screen.getByRole("checkbox", { name: "Hyperthyroidism" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(screen.getByText("Maya Demo")).toBeTruthy();
    expect(screen.getByText("35 years")).toBeTruthy();
    expect(screen.getByText("Hypothyroidism, Hashimoto's thyroiditis, Hyperthyroidism")).toBeTruthy();
    expect(screen.getByText("24.2")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("demo session only");
  });

  it("adds a weight entry and shows it as the latest measurement", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.type(screen.getByLabelText("Weight (kg)"), "70");
    fireEvent.change(screen.getByLabelText("Measurement date"), { target: { value: toIsoDate(new Date()) } });
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    expect(screen.getAllByText("70.0 kg").length).toBeGreaterThan(1);
    expect(screen.getByRole("status").textContent).toContain("added");
  });

  it("edits an existing weight entry", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit entry from 2026-10-24" }));
    const weightInput = screen.getByLabelText("Edit weight (kg)");
    await user.clear(weightInput);
    await user.type(weightInput, "67.3");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getAllByText("67.3 kg").length).toBeGreaterThan(1);
    expect(screen.getByText("Latest recorded weight").parentElement?.textContent).toContain("67.3 kg");
  });

  it("deletes an entry after confirmation and displays an empty state when all entries are removed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<ProfileWithClearControl />);

    const latestRow = screen.getByRole("row", { name: /Oct 24, 2026/ });
    await user.click(within(latestRow).getByRole("button", { name: "Delete entry from 2026-10-24" }));
    expect(screen.queryByRole("row", { name: /Oct 24, 2026/ })).toBeNull();
    expect(window.confirm).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Clear fictional entries" }));
    expect(screen.getByText(/No weight entries yet/)).toBeTruthy();
    expect(screen.getByText("Not available")).toBeTruthy();
  });

  it("shows validation messages and does not add invalid values", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Add entry" }));
    expect(screen.getByRole("alert").textContent).toBe("Enter a weight greater than zero.");

    await user.clear(screen.getByLabelText("Weight (kg)"));
    await user.type(screen.getByLabelText("Weight (kg)"), "-4");
    await user.click(screen.getByRole("button", { name: "Add entry" }));
    expect(screen.getByRole("alert").textContent).toBe("Enter a weight greater than zero.");
  });

  it("updates dashboard greeting, latest weight, and BMI when shared weight state changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardWithWeightControl />);

    expect(
      screen.getByText("Good morning, Maya Bennett. Your sample profile: Hypothyroidism, Hashimoto's thyroiditis."),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add demo weight update" }));

    const latestWeightCard = screen.getByRole("article", { name: "Latest weight: 75.0 kg" });
    const bmiCard = screen.getByRole("article", { name: "BMI: 27.5" });
    expect(within(latestWeightCard).getByText("75.0 kg")).toBeTruthy();
    expect(within(bmiCard).getByText("27.5")).toBeTruthy();
  });
});
