"use client";

import { useState } from "react";
import Link from "next/link";
import { decodeApplications, filterApplications, isStage, localDate, moveApplication, sampleApplications, stageCounts, stages, storageKey, type Application, type ApplicationStore, type Stage } from "@/lib/applications";
import { useLocalStore } from "@/lib/use-local-store";
import { useLocalDay } from "@/lib/use-local-day";
import { en } from "@/locales/en";
import { ApplicationBoard } from "./application-board";
import { ApplicationForm } from "./application-form";
import { Confirmation } from "./modal";
import { UpcomingPanel } from "./upcoming-panel";

const emptyStore: ApplicationStore = { version: 1, applications: [] };
const initialStore = (): ApplicationStore => ({ version: 1, applications: sampleApplications(new Date()) });
type ConfirmationState = ({ kind: "delete"; application: Application } | { kind: "reset" | "samples" }) & { baseline: string | null | undefined };

export function Dashboard() {
  const store = useLocalStore(storageKey, decodeApplications, initialStore, emptyStore, true);
  const { value: { applications }, ready, blocked, error, busy } = store;
  const day = useLocalDay();
  const today = day ? localDate(day) : "";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Stage | "all">("all");
  const [form, setForm] = useState<{ application: Application | null } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [announcement, setAnnouncement] = useState("");

  async function persist(next: Application[], message: string): Promise<boolean> {
    if (blocked || !ready) return false;
    const success = await store.save({ version: 1, applications: next });
    setAnnouncement(success ? message : "");
    return success;
  }

  async function confirmAction() {
    if (!confirmation) return;
    const next = confirmation.kind === "reset" ? [] : confirmation.kind === "delete" ? applications.filter(({ id }) => id !== confirmation.application.id) : applications.filter(({ id }) => !id.startsWith("sample-"));
    const success = confirmation.kind === "reset" ? await store.save({ version: 1, applications: next }, true, confirmation.baseline) : await persist(next, confirmation.kind === "delete" ? en.workspace.deleted : en.workspace.cleared);
    if (success) { setConfirmation(null); if (confirmation.kind === "reset") setAnnouncement(en.workspace.cleared); }
  }

  async function loadLatest() {
    if (await store.load()) { setForm(null); setConfirmation(null); }
  }
  const counts = stageCounts(applications);
  const visible = filterApplications(applications, query, filter);
  const sample = applications.some(({ id }) => id.startsWith("sample-"));
  const disabled = blocked || !ready || busy;
  const confirmationCopy = confirmation?.kind === "delete" ? { title: en.workspace.deleteTitle, description: en.workspace.deleteDescription, action: en.workspace.confirmDelete } : confirmation?.kind === "samples" ? { title: en.workspace.clearTitle, description: en.workspace.clearDescription, action: en.workspace.clearSamples } : { title: en.storage.resetTitle, description: en.storage.resetDescription, action: en.workspace.confirmReset };

  return <div className="workspace">
    <header className="app-header"><Link className="brand" href="/" aria-label={en.app.name}><span className="brand-symbol" aria-hidden="true"><span /><span /><span /></span>{en.app.name}</Link><span className="workspace-label">{en.workspace.navigation}</span><span className="local-indicator"><span aria-hidden="true" />{en.workspace.local}</span></header>
    <main className="main-workspace">
      <div className="page-heading"><div><h1>{en.workspace.title}</h1><p>{en.workspace.subtitle}</p></div><button type="button" className="button primary" disabled={disabled} onClick={() => setForm({ application: null })}><span aria-hidden="true">+</span>{en.workspace.add}</button></div>
      {error && <div className="error-box" role="alert"><strong>{error}</strong><p>{blocked ? en.storage.recovery : en.workspace.notSaved}</p><button type="button" className="button secondary" disabled={busy} onClick={() => { if (blocked) void loadLatest(); else void store.retry().then(success => { if (success) setForm(null); }); }}>{blocked ? en.storage.loadLatest : en.workspace.retry}</button>{blocked && <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirmation({ kind: "reset", baseline: store.baseline() })}>{en.storage.reset}</button>}</div>}
      {sample && <div className="sample-banner"><div><strong>{en.workspace.sample}</strong><span>{en.workspace.sampleDescription}</span></div><button type="button" disabled={disabled} onClick={() => setConfirmation({ kind: "samples", baseline: store.baseline() })}>{en.workspace.clearSamples}</button></div>}
      <div className="summary-row"><div><span>{en.workspace.all}</span><strong>{applications.length}</strong></div><div><span>{en.workspace.active}</span><strong>{applications.length - counts.closed}</strong></div><div><span>{en.workspace.interviews}</span><strong>{counts.interview}</strong></div><div><span>{en.workspace.offers}</span><strong>{counts.offer}</strong></div></div>
      <div className="workspace-content"><section className="board-panel" aria-labelledby="board-title"><div className="board-title-row"><h2 id="board-title">{en.workspace.board}</h2><span>{en.workspace.showing} {visible.length} {en.workspace.of} {applications.length}</span></div><div className="toolbar"><label className="search-control" htmlFor="search"><span className="sr-only">{en.workspace.search}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input id="search" type="search" value={query} placeholder={en.workspace.searchPlaceholder} onChange={(event) => setQuery(event.target.value)} /></label><label className="filter-control" htmlFor="filter"><span className="sr-only">{en.workspace.filter}</span><select id="filter" value={filter} onChange={(event) => { if (event.target.value === "all" || isStage(event.target.value)) setFilter(event.target.value); }}><option value="all">{en.workspace.allStages}</option>{stages.map((stage) => <option key={stage} value={stage}>{en.stages[stage]}</option>)}</select></label></div>
        {!ready ? <p role="status">{en.workspace.loading}</p> : visible.length === 0 && applications.length > 0 ? <div className="board-empty"><h3>{en.workspace.noResults}</h3><p>{en.workspace.noResultsHelp}</p><button type="button" className="button secondary" onClick={() => { setQuery(""); setFilter("all"); }}>{en.workspace.resetFilters}</button></div> : applications.length === 0 && !blocked ? <div className="board-empty"><h3>{en.workspace.emptyBoard}</h3><p>{en.workspace.emptyBoardHelp}</p></div> : null}
        {ready && <ApplicationBoard applications={visible} filter={filter} disabled={disabled} onEdit={(application) => setForm({ application })} onDelete={(application) => setConfirmation({ kind: "delete", application, baseline: store.baseline() })} onMove={(id, stage) => { void persist(moveApplication(applications, id, stage), en.workspace.moved); }} />}
      </section><UpcomingPanel applications={applications} today={today} disabled={disabled} onEdit={(application) => setForm({ application })} /></div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </main>
    {form && <ApplicationForm application={form.application} onClose={() => setForm(null)} onSave={async (application) => { const exists = applications.some(({ id }) => id === application.id); const success = await persist(exists ? applications.map((item) => item.id === application.id ? application : item) : [...applications, application], en.workspace.saved); if (success) setForm(null); return success; }} />}
    {confirmation && <Confirmation {...confirmationCopy} onClose={() => setConfirmation(null)} onConfirm={() => { void confirmAction(); }} />}
  </div>;
}
