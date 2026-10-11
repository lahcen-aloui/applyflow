"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { en } from "@/locales/en";

interface ModalProps { title: string; description: string; children: ReactNode; onClose: () => void; busy?: boolean }

export function Modal({ title, description, children, onClose, busy = false }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="modal-title" aria-describedby="modal-description" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
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
  return <Modal title={title} description={description} onClose={onClose}>
    <div className="form-actions">
      <button type="button" className="button secondary" autoFocus onClick={onClose}>{en.workspace.cancel}</button>
      <button type="button" className="button danger" onClick={onConfirm}>{action}</button>
    </div>
  </Modal>;
}
