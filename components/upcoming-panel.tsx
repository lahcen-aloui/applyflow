"use client";

import { formatDeadline, upcomingApplications, type Application } from "@/lib/applications";
import { en } from "@/locales/en";

interface UpcomingProps { applications: Application[]; today: string; onEdit: (application: Application) => void; disabled: boolean }

export function UpcomingPanel({ applications, today, onEdit, disabled }: UpcomingProps) {
  const upcoming = upcomingApplications(applications, today);
  return <aside className="upcoming-panel" aria-labelledby="upcoming-title">
    <h2 id="upcoming-title">{en.workspace.upcoming}</h2><p className="muted">{en.workspace.upcomingDescription}</p>
    {upcoming.length === 0 ? <div className="upcoming-empty"><p>{en.workspace.noDeadlines}</p><p className="muted">{en.workspace.noDeadlinesHelp}</p></div> : <ol className="upcoming-list">{upcoming.map((application) => <li key={application.id}>
      <time dateTime={application.deadline}>{application.deadline === today ? en.workspace.today : formatDeadline(application.deadline)}</time>
      <button type="button" disabled={disabled} onClick={() => onEdit(application)}>{application.company}<span>{application.role}</span></button>
      <span className={`deadline-stage stage-${application.stage}`}>{en.stages[application.stage]}</span>
    </li>)}</ol>}
    <div className="demo-note"><span className="demo-symbol" aria-hidden="true">◇</span><strong>{en.workspace.demo}</strong><p>{en.workspace.demoDescription}</p></div>
  </aside>;
}
