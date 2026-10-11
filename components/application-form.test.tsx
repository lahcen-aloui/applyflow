import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { decodeApplications, storageKey, type Application } from "@/lib/applications";
import { Dashboard } from "./dashboard";
import { ApplicationForm } from "./application-form";
let root: Root;
let host: HTMLDivElement;
let releaseLock: () => void;
async function update(action: () => void) {
  await act(async () => { action(); await Promise.resolve(); });
}
beforeEach(() => {
  vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers(); localStorage.clear();
  localStorage.setItem(storageKey, '{"version":1,"applications":[]}');
  const gate = new Promise<void>(resolve => { releaseLock = resolve; });
  vi.stubGlobal("navigator", { locks: { request: async (_key: string, action: () => unknown) => { await gate; return action(); } } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(async () => { await update(() => { releaseLock(); root.unmount(); }); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function fill(id: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`Missing input: ${id}`);
  await update(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
}
async function submit() {
  const form = host.querySelector("form");
  if (!form) throw new Error("Missing application form");
  await update(() => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
async function openDashboardForm() {
  await update(() => root.render(createElement(Dashboard)));
  await update(() => vi.runOnlyPendingTimers());
  const opener = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Add application"));
  if (!opener) throw new Error("Missing form opener");
  await update(() => opener.click());
  await fill("company", "Submitted company"); await fill("role", "Developer");
}
function expectPendingControlsLocked() {
  const controls = [...host.querySelectorAll("dialog input, dialog select, dialog textarea, dialog button")];
  expect(controls.length).toBeGreaterThan(0);
  expect(controls.every(control => control.matches(":disabled"))).toBe(true);
}
it("holds editing and dismissal while a Web Lock save is pending, then closes with the submitted payload", async () => {
  await openDashboardForm(); await submit();
  expectPendingControlsLocked();
  const dialog = host.querySelector("dialog");
  if (!dialog) throw new Error("Missing pending dialog");
  await update(() => dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true })));
  expect(host.querySelector("dialog")).not.toBeNull();
  expect(host.querySelector<HTMLInputElement>("#company")?.value).toBe("Submitted company");
  await update(() => releaseLock());
  expect(host.querySelector("dialog")).toBeNull();
  const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
  const persisted = decodeApplications(value);
  expect(persisted?.applications).toHaveLength(1);
  expect(persisted?.applications[0]?.company).toBe("Submitted company");
});
it("unlocks the same draft after a queued save fails and successfully retries it once", async () => {
  await openDashboardForm();
  const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  await submit(); expectPendingControlsLocked();
  await update(() => releaseLock());
  expect(host.querySelector("dialog")).not.toBeNull();
  expect(host.querySelector<HTMLInputElement>("#company")?.value).toBe("Submitted company");
  expect(host.querySelector<HTMLInputElement>("#company")?.matches(":disabled")).toBe(false);
  expect(host.querySelector("dialog")?.textContent).toContain("Your draft has been kept");
  expect(localStorage.getItem(storageKey)).toBe('{"version":1,"applications":[]}');
  failure.mockRestore(); await submit();
  expect(host.querySelector("dialog")).toBeNull();
  const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
  expect(decodeApplications(value)?.applications).toHaveLength(1);
});
it("does not submit a second payload while the first asynchronous submission is pending", async () => {
  const submitted: Application[] = [];
  let finish: (success: boolean) => void = () => { throw new Error("Submission has not started"); };
  const pending = new Promise<boolean>(resolve => { finish = resolve; });
  await update(() => root.render(createElement(ApplicationForm, { application: null, onClose: () => undefined, onSave: application => { submitted.push(application); return pending; } })));
  await fill("company", "One submission"); await fill("role", "Developer");
  await submit(); await submit();
  expect(submitted).toHaveLength(1);
  await update(() => finish(false));
  expect(host.querySelector<HTMLInputElement>("#company")?.value).toBe("One submission");
  expect(host.querySelector<HTMLInputElement>("#company")?.matches(":disabled")).toBe(false);
});
