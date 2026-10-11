"use client";

import { formatDeadline, isStage, stages, type Application, type Stage } from "@/lib/applications";
import { en } from "@/locales/en";

interface BoardProps { applications: Application[]; filter: Stage | "all"; onEdit: (application: Application) => void; onDelete: (application: Application) => void; onMove: (id: string, stage: Stage) => void; disabled: boolean }

export function ApplicationBoard({ applications, filter, onEdit, onDelete, onMove, disabled }: BoardProps) {
  return <div className={`board ${filter === "all" ? "" : "filtered-board"}`}>
    {stages.filter((stage) => filter === "all" || stage === filter).map((stage) => {
      const items = applications.filter((application) => application.stage === stage);
      return <section key={stage} className={`stage-column stage-${stage}`} aria-label={en.stages[stage]}>
        <div className="stage-heading"><h3><span className="stage-dot" aria-hidden="true" />{en.stages[stage]}</h3><span className="count">{items.length}</span></div>
        <div className="stage-content">
          {items.length === 0 && <p className="stage-empty">{en.workspace.empty}</p>}
          {items.map((application) => <article key={application.id} className="application-card" aria-label={`${application.company}, ${application.role}`}>
            <div className="company-mark" aria-hidden="true">{application.company.charAt(0)}</div>
            <h4>{application.company}</h4>
            <p className="role-name">{application.role}</p>
            <p className="card-deadline">{application.deadline ? <><span>{en.workspace.deadline}</span><time dateTime={application.deadline}>{formatDeadline(application.deadline)}</time></> : en.workspace.noDeadline}</p>
            {application.notes && <p className="card-notes">{application.notes}</p>}
            {application.url && <a className="job-link" href={application.url} target="_blank" rel="noreferrer">{en.workspace.viewRole}</a>}
            <label className="move-label" htmlFor={`move-${application.id}`}>{en.workspace.move}<select id={`move-${application.id}`} aria-label={`${en.workspace.move} ${application.company}`} value={application.stage} disabled={disabled} onChange={(event) => { if (isStage(event.target.value)) onMove(application.id, event.target.value); }}>{stages.map((next) => <option key={next} value={next}>{en.stages[next]}</option>)}</select></label>
            <div className="card-actions"><button type="button" disabled={disabled} onClick={() => onEdit(application)}>{en.workspace.edit}</button><button type="button" disabled={disabled} onClick={() => onDelete(application)}>{en.workspace.delete}</button></div>
          </article>)}
        </div>
      </section>;
    })}
  </div>;
}
