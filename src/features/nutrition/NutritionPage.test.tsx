import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { PropsWithChildren, ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HealthDataProvider } from "../../context/HealthDataContext.jsx";
import DashboardPage from "../dashboard/DashboardPage.jsx";
import NutritionPage from "./NutritionPage";

function TestProviders({ children }: PropsWithChildren) {
  return <ChakraProvider value={defaultSystem}><MemoryRouter><HealthDataProvider>{children}</HealthDataProvider></MemoryRouter></ChakraProvider>;
}

function renderWithProviders(element: ReactElement) {
  return render(<TestProviders>{element}</TestProviders>);
}

function DashboardAndNutrition() {
  return <><DashboardPage /><NutritionPage /></>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("nutrition and hydration page", () => {
  it("associates invalid nutrient values with their specific field error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NutritionPage />);

    await user.type(screen.getByLabelText("Food name"), "Fictional test snack");
    await user.type(screen.getByLabelText("Protein in grams (optional)"), "-1");
    await user.click(screen.getByRole("button", { name: "Add food entry" }));

    const proteinInput = screen.getByLabelText("Protein in grams (optional)");
    expect(screen.getByRole("alert").textContent).toContain("protein");
    expect(proteinInput.getAttribute("aria-invalid")).toBe("true");
    expect(proteinInput.getAttribute("aria-describedby")).toBe("nutrition-form-error");
  });

  it("adds, edits, and deletes food entries", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<NutritionPage />);

    await user.type(screen.getByLabelText("Food name"), "Manual demo meal");
    await user.selectOptions(screen.getByLabelText("Meal category"), "dinner");
    await user.type(screen.getByLabelText("Serving description (optional)"), "One sample portion");
    await user.type(screen.getByLabelText("Calories (optional)"), "0");
    await user.click(screen.getByRole("button", { name: "Add food entry" }));
    expect(screen.getByText("Food entry added for this demo session.")).toBeTruthy();
    expect(screen.getByText("Calories: 0 kcal")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit Manual demo meal" }));
    await user.clear(screen.getByLabelText("Calories (optional)"));
    await user.type(screen.getByLabelText("Calories (optional)"), "125");
    await user.click(screen.getByRole("button", { name: "Save food entry" }));
    expect(screen.getByText("Calories: 125 kcal")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete Manual demo meal" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.queryByText("Manual demo meal")).toBeNull();
  });

  it("reports missing nutrition separately from an explicitly recorded zero", () => {
    renderWithProviders(<NutritionPage />);

    const totals = screen.getByRole("region", { name: "Daily nutrition totals" });
    const calorieRow = screen.getByText("Calories").parentElement;
    expect(calorieRow).toBeTruthy();
    expect(within(calorieRow as HTMLElement).getByText("320 kcal")).toBeTruthy();
    expect(within(calorieRow as HTMLElement).getByText("1 recorded · 1 missing")).toBeTruthy();
    expect(within(totals).getAllByText("1 recorded · 1 missing")).toHaveLength(4);
  });

  it("adds, edits, deletes hydration and converts fluid ounces for display", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<NutritionPage />);

    await user.type(screen.getByLabelText("Water amount"), "8");
    await user.selectOptions(screen.getByLabelText("Unit", { selector: "select#hydration-unit" }), "fl-oz");
    await user.click(screen.getByRole("button", { name: "Add water entry" }));
    expect(screen.getByText("Water entry added for this demo session.")).toBeTruthy();
    expect(screen.getByText("Recorded total: 837 mL")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Display unit"), "fl-oz");
    expect(screen.getByText("Recorded total: 28.29 fl oz")).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: /Edit water entry from/ })[0]);
    await user.clear(screen.getByLabelText("Water amount"));
    await user.type(screen.getByLabelText("Water amount"), "4");
    await user.click(screen.getByRole("button", { name: "Save water entry" }));
    expect(screen.getByText("Water entry updated for this demo session.")).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: /Delete water entry from/ })[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByText("Water entry deleted for this demo session.")).toBeTruthy();
  });

  it("filters food and hydration entries by date", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NutritionPage />);

    await user.click(screen.getByRole("button", { name: "Show all dates" }));
    expect(screen.getAllByText("Fictional grain bowl").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fictional/).length).toBeGreaterThan(2);
    expect(screen.getByText("Choose a date to see its nutrition totals.")).toBeTruthy();
  });

  it("updates the Overview nutrition and hydration summary from shared records", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardAndNutrition />);

    const summary = screen.getByRole("region", { name: "Today's tracking" });
    expect(within(summary).getByText("2 entries · 320 kcal recorded · 1 missing")).toBeTruthy();
    expect(within(summary).getByText("600 mL recorded")).toBeTruthy();

    await user.type(screen.getByLabelText("Food name"), "Fictional unmeasured meal");
    await user.click(screen.getByRole("button", { name: "Add food entry" }));
    expect(within(summary).getByText("3 entries · 320 kcal recorded · 2 missing")).toBeTruthy();

    await user.type(screen.getByLabelText("Water amount"), "8");
    await user.selectOptions(screen.getByLabelText("Unit", { selector: "select#hydration-unit" }), "fl-oz");
    await user.click(screen.getByRole("button", { name: "Add water entry" }));
    expect(within(summary).getByText("837 mL recorded")).toBeTruthy();
  });
});