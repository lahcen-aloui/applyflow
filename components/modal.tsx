"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { en } from "@/locales/en";

interface ModalProps { title: string; description: string; children: ReactNode; onClose: () => void; initialFocus: RefObject<HTMLElement | null>; busy?: boolean }

export function Modal({ title, description, children, onClose, initialFocus, busy = false }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    initialFocus.current?.focus();
    return () => { element?.close(); previousFocus?.focus(); };
  }, [initialFocus]);
  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    const element = event.currentTarget;
    const controls = [...element.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]")]
      .filter(control => control.tabIndex >= 0 && !control.matches(":disabled") && !control.closest("[hidden]"));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) { event.preventDefault(); element.focus(); return; }
    const active = document.activeElement;
    if (active === element || !element.contains(active) || (event.shiftKey ? active === first : active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="modal-title" aria-describedby="modal-description" onKeyDown={containFocus} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "1rem" }}>
        <h2 id="modal-title" style={{ margin: 0 }}>{title}</h2>
        <button type="button" className="icon-button" aria-label={en.workspace.close} disabled={busy} onClick={onClose}>×</button>
      </div>
      <p id="modal-description" style={{ color: "var(--color-muted)", margin: "0.7rem 0 1.5rem" }}>{description}</p>
      {children}
    </dialog>
  );
}

interface ConfirmProps { title: string; description: string; action: string; onClose: () => void; onConfirm: () => void }

export function Confirmation({ title, description, action, onClose, onConfirm }: ConfirmProps) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <Modal title={title} description={description} onClose={onClose} initialFocus={cancel}>
    <div className="form-actions">
      <button ref={cancel} type="button" className="button secondary" onClick={onClose}>{en.workspace.cancel}</button>
      <button type="button" className="button danger" onClick={onConfirm}>{action}</button>
    </div>
  </Modal>;
}
