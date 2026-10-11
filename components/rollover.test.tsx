import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
let root: Root;
let host: HTMLDivElement;
async function update(action: () => void) {
  await act(async () => { action(); await Promise.resolve(); });
}
beforeEach(() => {
  vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers(); localStorage.clear();
  vi.stubGlobal("navigator", { locks: { request: (_key: string, action: () => unknown) => Promise.resolve().then(action) } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(async () => { await update(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount() { await update(() => root.render(createElement(Dashboard))); await update(() => vi.runOnlyPendingTimers()); }
async function fill(selector: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing input: ${selector}`);
  await update(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
}
it("refreshes deadlines after local midnight without reloading or losing filters", async () => {
  vi.setSystemTime(new Date(2030, 5, 12, 23, 59, 59));
  localStorage.setItem("applyflow.applications.v1", JSON.stringify({ version: 1, applications: [{ id: "a", company: "Yesterday", role: "Dev", url: "", stage: "applied", deadline: "2030-06-12", notes: "" }] }));
  await mount();
  await fill("#search", "Yesterday");
  expect(host.textContent).toContain("Today");
  await update(() => vi.advanceTimersByTime(1001));
  expect(host.textContent).not.toContain("Today");
  expect(host.querySelector<HTMLInputElement>("#search")?.value).toBe("Yesterday");
});
it("refreshes deadlines on visibility after a suspended tab resumes", async () => {
  vi.setSystemTime(new Date(2030, 5, 12, 12));
  localStorage.setItem("applyflow.applications.v1", JSON.stringify({ version: 1, applications: [{ id: "a", company: "Yesterday", role: "Dev", url: "", stage: "applied", deadline: "2030-06-12", notes: "" }] }));
  await mount(); vi.setSystemTime(new Date(2030, 5, 13, 12));
  await update(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(host.textContent).not.toContain("Today");
});
