import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApplicationForm } from "./application-form";
import { Confirmation, Modal } from "./modal";

let root: Root;
let host: HTMLDivElement;
let opener: HTMLButtonElement;
async function update(action: () => void) {
  await act(async () => { action(); await Promise.resolve(); });
}
beforeEach(() => {
  vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  opener = document.createElement("button"); opener.textContent = "Open dialog"; document.body.append(opener); opener.focus();
  // jsdom has no modal implementation; native opening focuses the first focusable control.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true; this.querySelector<HTMLButtonElement>("button")?.focus();
  };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(async () => {
  await update(() => root.unmount()); host.remove(); opener.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
it("focuses Company after opening the application dialog and restores its opener after closing", async () => {
  await update(() => root.render(createElement(ApplicationForm, { application: null, onSave: () => Promise.resolve(true), onClose: () => root.render(null) })));
  expect(document.activeElement).toBe(host.querySelector("#company"));
  const close = host.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
  if (!close) throw new Error("Missing close button");
  await update(() => close.click());
  expect(document.activeElement).toBe(opener);
});
it("focuses Cancel after opening a confirmation and restores its opener after Escape cancellation", async () => {
  await update(() => root.render(createElement(Confirmation, { title: "Delete application?", description: "Confirm removal", action: "Delete", onConfirm: () => undefined, onClose: () => root.render(null) })));
  const cancel = [...host.querySelectorAll("button")].find(button => button.textContent === "Cancel");
  expect(document.activeElement).toBe(cancel);
  const dialog = host.querySelector("dialog");
  if (!dialog) throw new Error("Missing confirmation dialog");
  await update(() => dialog.dispatchEvent(new Event("cancel", { cancelable: true })));
  expect(document.activeElement).toBe(opener);
});
async function pressTab(control: HTMLElement, shiftKey = false) {
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
  await update(() => { control.focus(); control.dispatchEvent(event); });
  return event;
}
it("wraps application Tab boundaries while allowing ordinary navigation between fields", async () => {
  await update(() => root.render(createElement(ApplicationForm, { application: null, onSave: () => Promise.resolve(true), onClose: () => root.render(null) })));
  const first = host.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
  const last = host.querySelector<HTMLButtonElement>('button[type="submit"]');
  const company = host.querySelector<HTMLInputElement>("#company");
  if (!first || !last || !company) throw new Error("Missing application controls");
  expect((await pressTab(last)).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(first);
  expect((await pressTab(first, true)).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(last);
  expect((await pressTab(company)).defaultPrevented).toBe(false);
});
it("wraps confirmation Tab boundaries without invoking the destructive action", async () => {
  const confirm = vi.fn();
  await update(() => root.render(createElement(Confirmation, { title: "Delete application?", description: "Confirm removal", action: "Delete", onConfirm: confirm, onClose: () => root.render(null) })));
  const first = host.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
  const last = [...host.querySelectorAll("button")].find(button => button.textContent === "Delete");
  if (!first || !last) throw new Error("Missing confirmation controls");
  expect((await pressTab(last)).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(first);
  expect((await pressTab(first, true)).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(last);
  expect(confirm).not.toHaveBeenCalled();
});
it("prevents Tab from escaping while every busy dialog control is disabled", async () => {
  const initialFocus = React.createRef<HTMLButtonElement>();
  const close = vi.fn();
  await update(() => root.render(createElement(Modal, { title: "Saving", description: "Pending save", initialFocus, busy: true, onClose: close, children: createElement("button", { ref: initialFocus, disabled: true }, "Save") })));
  const dialog = host.querySelector("dialog");
  if (!dialog) throw new Error("Missing busy dialog");
  expect((await pressTab(dialog)).defaultPrevented).toBe(true);
  expect((await pressTab(dialog, true)).defaultPrevented).toBe(true);
  await update(() => dialog.dispatchEvent(new Event("cancel", { cancelable: true })));
  expect(close).not.toHaveBeenCalled();
  expect(dialog.open).toBe(true);
});
