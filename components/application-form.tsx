"use client";

import { useRef, useState, type FormEvent } from "react";
import { isStage, stages, validateApplication, type Application } from "@/lib/applications";
import { en } from "@/locales/en";
import { Modal } from "./modal";

interface ApplicationFormProps { application: Application | null; onSave: (application: Application) => Promise<boolean>; onClose: () => void }

export function ApplicationForm({ application, onSave, onClose }: ApplicationFormProps) {
  const [value, setValue] = useState<Application>(application ?? { id: "", company: "", role: "", url: "", stage: "applied", deadline: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const update = (field: "company" | "role" | "url" | "deadline" | "notes", next: string) => {
    if (submitting.current) return;
    setValue({ ...value, [field]: next });
  };
  const close = () => { if (!submitting.current) onClose(); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const next = { ...value, id: value.id || crypto.randomUUID(), company: value.company.trim(), role: value.role.trim(), url: value.url.trim(), notes: value.notes.trim() };
    const problem = validateApplication(next);
    if (problem) { setError(problem); return; }
    submitting.current = true;
    setSaving(true); setValue(next);
    try {
      if (!await onSave(next)) setError(en.storage.draftKept);
    } catch {
      setError(en.storage.draftKept);
    } finally {
      submitting.current = false; setSaving(false);
    }
  }
  return <Modal title={application ? en.form.editTitle : en.form.addTitle} description={en.form.description} busy={saving} onClose={close}>
    <form onSubmit={event => { void submit(event); }} aria-busy={saving} noValidate>
      {error && <p role="alert" className="error-box">{error}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="form-grid">
        <label htmlFor="company">{en.form.company}<input id="company" autoFocus required value={value.company} placeholder={en.form.companyPlaceholder} onChange={(event) => update("company", event.target.value)} /></label>
        <label htmlFor="role">{en.form.role}<input id="role" required value={value.role} placeholder={en.form.rolePlaceholder} onChange={(event) => update("role", event.target.value)} /></label>
        <label className="full-width" htmlFor="url">{en.form.url} <span className="optional">({en.workspace.optional})</span><input id="url" type="url" value={value.url} placeholder={en.form.urlPlaceholder} onChange={(event) => update("url", event.target.value)} /></label>
        <label htmlFor="stage">{en.form.stage}<select id="stage" value={value.stage} onChange={(event) => { if (!submitting.current && isStage(event.target.value)) setValue({ ...value, stage: event.target.value }); }}>{stages.map((stage) => <option key={stage} value={stage}>{en.stages[stage]}</option>)}</select></label>
        <label htmlFor="deadline">{en.form.deadline} <span className="optional">({en.workspace.optional})</span><input id="deadline" type="date" value={value.deadline} onChange={(event) => update("deadline", event.target.value)} /></label>
        <label className="full-width" htmlFor="notes">{en.form.notes} <span className="optional">({en.workspace.optional})</span><textarea id="notes" rows={4} value={value.notes} placeholder={en.form.notesPlaceholder} onChange={(event) => update("notes", event.target.value)} /></label>
      </div>
      <div className="form-actions"><button type="button" className="button secondary" onClick={close}>{en.workspace.cancel}</button><button className="button primary" type="submit">{application ? en.form.saveChanges : en.form.save}</button></div>
      </fieldset>
    </form>
  </Modal>;
}
