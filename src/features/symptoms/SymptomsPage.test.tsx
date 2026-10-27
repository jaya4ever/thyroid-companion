import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import { useHealthData } from "../../context/useHealthData.js";
import DashboardPage from "../dashboard/DashboardPage.jsx";
import AppRoutes from "../../AppRoutes.jsx";
import SymptomsPage from "./SymptomsPage";
import { symptomRatingFields } from "../../health/trackingUtils.js";
import type { SymptomRatingField } from "../../health/trackingUtils";

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

function DashboardAndSymptoms() {
  return (
    <>
      <DashboardPage />
      <SymptomsPage />
    </>
  );
}

function ClearCheckIns() {
  const { symptomCheckIns, deleteSymptomCheckIn } = useHealthData();
  return (
    <button type="button" onClick={() => symptomCheckIns.forEach((entry) => deleteSymptomCheckIn(entry.id))}>
      Clear demo check-ins
    </button>
  );
}

async function setRating(
  user: ReturnType<typeof userEvent.setup>,
  field: SymptomRatingField,
  rating: string,
): Promise<void> {
  const group = screen.getByRole("group", { name: symptomRatingFields.find((option) => option.key === field)?.label });
  await user.click(within(group).getByRole("radio", { name: rating }));
}

async function completeRatings(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  for (const field of symptomRatingFields) await setRating(user, field.key, "3");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("symptom check-ins", () => {
  it("exposes the date and each rating group as required controls", () => {
    renderWithProviders(<SymptomsPage />);

    expect(screen.getByLabelText("Date and time").hasAttribute("required")).toBe(true);
    const energyGroup = screen.getByRole("radiogroup", { name: /Energy,/ });
    expect(energyGroup.getAttribute("aria-required")).toBe("true");
    expect(within(energyGroup).getAllByRole("radio").every((radio) => radio.hasAttribute("required"))).toBe(true);
  });

  it("adds a check-in and reflects today's ratings on the dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardAndSymptoms />);

    await completeRatings(user);
    await user.type(screen.getByLabelText("Notes (optional)"), "Fictional note for this session");
    await user.click(screen.getByRole("button", { name: "Add check-in" }));

    expect(screen.getByText("Check-in added for this demo session.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "How are you feeling today?" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "How are you feeling today?" }).textContent).toContain("3 / 5");
    expect(screen.getByText("Fictional note for this session")).toBeTruthy();
  });

  it("edits and deletes a check-in with confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<SymptomsPage />);

    const editButton = screen.getAllByRole("button", { name: /Edit check-in from/ })[0];
    await user.click(editButton);
    await setRating(user, "energy", "5");
    await user.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(screen.getByText("Check-in updated for this demo session.")).toBeTruthy();
    expect(screen.getAllByText("5 / 5").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /Delete check-in from/ })[0]);
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.getByText("Check-in deleted for this demo session.")).toBeTruthy();
  });

  it("requires every rating and rejects invalid date-time input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SymptomsPage />);

    await user.click(screen.getByRole("button", { name: "Add check-in" }));
    expect(screen.getByRole("alert").textContent).toContain("rating from 1 to 5");
    await completeRatings(user);
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-02-30T09:30" } });
    await user.click(screen.getByRole("button", { name: "Add check-in" }));
    expect(screen.getByRole("alert").textContent).toContain("valid check-in date and time");
  });

  it("shows an empty state when all check-ins are removed", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ClearCheckIns />
        <SymptomsPage />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear demo check-ins" }));
    expect(screen.getByText("No check-ins yet. Add your first personal entry above.")).toBeTruthy();
  });

  it("opens the symptom and medication tools from the existing navigation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);

    await user.click(screen.getByRole("link", { name: "Symptoms" }));
    expect(await screen.findByRole("heading", { name: "Symptom check-ins", level: 1 })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Medications" }));
    expect(await screen.findByRole("heading", { name: "Medications", level: 1 })).toBeTruthy();
  });
});
