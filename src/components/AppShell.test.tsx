import { fireEvent, render, screen, within, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HealthDataProvider } from "../context/HealthDataContext.jsx";
import AppShell from "./AppShell";

let desktop: MediaQueryList;
let resize: (() => void) | undefined;

beforeEach(() => {
  desktop = {
    matches: false,
    addEventListener: vi.fn((_event, listener) => { resize = listener as () => void; }),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", vi.fn(() => desktop));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdom lacks native dialog behavior; browsers provide modal focus trapping
  // and make the rest of the document inert when showModal is called.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  }) });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  }) });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resize = undefined;
});

function setup() {
  return render(<MemoryRouter><HealthDataProvider><AppShell>
    <Routes><Route path="/" element={<h1>Overview page</h1>} /><Route path="/activity" element={<h1>Activity page</h1>} /></Routes>
  </AppShell></HealthDataProvider></MemoryRouter>);
}

async function openMenu() {
  const user = userEvent.setup();
  const toggle = screen.getByRole("button", { name: "Open navigation menu" });
  await user.click(toggle);
  return { user, toggle, dialog: screen.getByRole("dialog", { name: "Navigation menu" }) };
}

describe("mobile navigation", () => {
  it("opens a native modal and restores scrolling and trigger focus on close", async () => {
    vi.stubGlobal("scrollY", 420);
    document.body.style.color = "red";
    setup();
    const { user, toggle, dialog } = await openMenu();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-420px");
    expect(document.documentElement.style.overflow).toBe("hidden");
    await user.click(within(dialog).getByRole("button", { name: "Close navigation menu" }));
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.body.style.position).toBe("");
    expect(document.body.style.color).toBe("red");
    expect(document.documentElement.style.overflow).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 420);
    expect(document.activeElement).toBe(toggle);
    document.body.style.color = "";
  });

  it("closes on Escape via the dialog cancel event", async () => {
    setup();
    const { dialog } = await openMenu();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.body.style.position).toBe("");
  });

  it("closes when a navigation link selects a page", async () => {
    setup();
    const { user, dialog } = await openMenu();
    await user.click(within(dialog).getByRole("link", { name: "Activity" }));
    expect(screen.getByRole("heading", { name: "Activity page" })).toBeTruthy();
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.body.style.position).toBe("");
  });

  it("closes on a backdrop click but keeps the panel open for interior clicks", async () => {
    setup();
    const { dialog } = await openMenu();
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ left: 12, right: 380, top: 12, bottom: 700 } as DOMRect);
    fireEvent.click(dialog, { clientX: 100, clientY: 100 });
    expect(dialog.hasAttribute("open")).toBe(true);
    fireEvent.click(dialog, { clientX: 1, clientY: 1 });
    expect(dialog.hasAttribute("open")).toBe(false);
  });

  it("unlocks scrolling on unmount and on switching to desktop", async () => {
    const view = setup();
    const { dialog } = await openMenu();
    Object.defineProperty(desktop, "matches", { value: true });
    act(() => resize?.());
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.body.style.position).toBe("");
    expect(desktop.removeEventListener).toHaveBeenCalled();
    Object.defineProperty(desktop, "matches", { value: false });
    await openMenu();
    view.unmount();
    expect(document.body.style.position).toBe("");
  });
});
