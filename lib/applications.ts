import { en } from "@/locales/en";

export const stages = ["applied", "interview", "offer", "closed"] as const;
export type Stage = (typeof stages)[number];
export interface Application { id: string; company: string; role: string; url: string; stage: Stage; deadline: string; notes: string }
export interface ApplicationStore { version: 1; applications: Application[] }
export const storageKey = "applyflow.applications.v1";

export function isStage(value: unknown): value is Stage {
  return stages.some((stage) => stage === value);
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function validateApplication(value: Application): string | null {
  if (!value.company.trim()) return en.validation.company;
  if (!value.role.trim()) return en.validation.role;
  if (!isStage(value.stage)) return en.validation.stage;
  if (value.deadline && !isCalendarDate(value.deadline)) return en.validation.deadline;
  if (!value.url.trim()) return null;
  try {
    const url = new URL(value.url.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return en.validation.url;
  } catch { return en.validation.url; }
  return null;
}

export function filterApplications(items: Application[], query: string, stage: Stage | "all"): Application[] {
  const search = query.trim().toLocaleLowerCase("en");
  return items.filter((item) => (stage === "all" || item.stage === stage) && `${item.company} ${item.role}`.toLocaleLowerCase("en").includes(search));
}

export function stageCounts(items: Application[]): Record<Stage, number> {
  return items.reduce<Record<Stage, number>>((counts, item) => ({ ...counts, [item.stage]: counts[item.stage] + 1 }), { applied: 0, interview: 0, offer: 0, closed: 0 });
}

export function moveApplication(items: Application[], id: string, stage: Stage): Application[] {
  return items.map((item) => item.id === id ? { ...item, stage } : item);
}

export function upcomingApplications(items: Application[], today: string): Application[] {
  return items.filter((item) => item.stage !== "closed" && item.deadline !== "" && item.deadline >= today)
    .toSorted((a, b) => a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function decodeApplication(value: unknown): Application | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("id" in value) || typeof value.id !== "string" || !value.id.trim()) return null;
  if (!("company" in value) || typeof value.company !== "string") return null;
  if (!("role" in value) || typeof value.role !== "string") return null;
  if (!("url" in value) || typeof value.url !== "string") return null;
  if (!("stage" in value) || !isStage(value.stage)) return null;
  if (!("deadline" in value) || typeof value.deadline !== "string") return null;
  if (!("notes" in value) || typeof value.notes !== "string") return null;
  const item: Application = { id: value.id, company: value.company.trim(), role: value.role.trim(), url: value.url.trim(), stage: value.stage, deadline: value.deadline, notes: value.notes };
  return validateApplication(item) === null ? item : null;
}

export function decodeApplications(value: unknown): ApplicationStore | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("version" in value) || value.version !== 1) return null;
  if (!("applications" in value) || !Array.isArray(value.applications)) return null;
  const items: Application[] = [];
  for (const candidate of value.applications as unknown[]) {
    const item = decodeApplication(candidate);
    if (!item || items.some(({ id }) => id === item.id)) return null;
    items.push(item);
  }
  return { version: 1, applications: items };
}

export function localDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDeadline(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function sampleApplications(today: Date): Application[] {
  const deadline = (offset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return localDate(date);
  };
  return [
    { id: "sample-northstar", ...en.samples.northstar, stage: "interview", deadline: deadline(2), url: "" },
    { id: "sample-orbit", ...en.samples.orbit, stage: "applied", deadline: deadline(5), url: "" },
    { id: "sample-fieldwork", ...en.samples.fieldwork, stage: "offer", deadline: deadline(7), url: "" },
    { id: "sample-atlas", ...en.samples.atlas, stage: "applied", deadline: "", url: "" },
    { id: "sample-relay", ...en.samples.relay, stage: "closed", deadline: "", url: "" },
  ];
}
