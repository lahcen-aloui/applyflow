import { describe, expect, it } from "vitest";
import { decodeApplications, filterApplications, moveApplication, stageCounts, upcomingApplications, validateApplication, type Application } from "./applications";

const item: Application = { id: "a", company: "Acme", role: "Developer", url: "", stage: "applied", deadline: "2026-10-10", notes: "" };

describe("application validation", () => {
  it("rejects whitespace-only company and role", () => {
    expect(validateApplication({ ...item, company: "  " })).not.toBeNull();
    expect(validateApplication({ ...item, role: "\t" })).not.toBeNull();
    expect(validateApplication({ ...item, company: " Acme " })).toBeNull();
  });
  it("accepts only optional http or https URLs", () => {
    for (const url of ["", "https://example.com/jobs", "http://example.com"]) expect(validateApplication({ ...item, url })).toBeNull();
    for (const url of ["javascript:alert(1)", "ftp://example.com", "example.com", "https://"]) expect(validateApplication({ ...item, url })).not.toBeNull();
  });
  it("validates real calendar dates and allows no deadline", () => {
    for (const deadline of ["", "2024-02-29", "2026-10-10"]) expect(validateApplication({ ...item, deadline })).toBeNull();
    for (const deadline of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "bad"]) expect(validateApplication({ ...item, deadline })).not.toBeNull();
  });
});

describe("board views", () => {
  const items: Application[] = [item, { ...item, id: "b", company: "Orbit", role: "Designer", stage: "interview" }, { ...item, id: "c", company: "ACME Labs", role: "Researcher", stage: "interview" }];
  it("combines a trimmed case-insensitive company or role search with stage", () => {
    expect(filterApplications(items, " acme ", "interview").map(({ id }) => id)).toEqual(["c"]);
    expect(filterApplications(items, "DESIGN", "all").map(({ id }) => id)).toEqual(["b"]);
    expect(filterApplications(items, "missing", "all")).toEqual([]);
  });
  it("counts every stage including empty stages", () => {
    expect(stageCounts(items)).toEqual({ applied: 1, interview: 2, offer: 0, closed: 0 });
  });
  it("moves only the specified application without mutating the source", () => {
    expect(moveApplication(items, "a", "offer")[0].stage).toBe("offer");
    expect(items[0].stage).toBe("applied");
    expect(moveApplication(items, "missing", "closed")).toEqual(items);
  });
  it("includes a deadline on the current local date", () => {
    expect(upcomingApplications([item], "2026-10-10")).toEqual([item]);
  });
  it("sorts future deadlines deterministically and excludes closed or undated applications", () => {
    const items: Application[] = [{ ...item, id: "z", deadline: "2026-10-11" }, { ...item, id: "b" }, { ...item, id: "c", deadline: "" }, { ...item, id: "d", deadline: "2026-10-09" }, { ...item, id: "e", stage: "closed" }, item];
    expect(upcomingApplications(items, "2026-10-10").map(({ id }) => id)).toEqual(["a", "b", "z"]);
  });
});

describe("saved data decoding", () => {
  it("accepts and normalizes a supported application collection", () => {
    expect(decodeApplications({ version: 1, applications: [{ ...item, company: " Acme " }] })).toEqual({ version: 1, applications: [item] });
    expect(decodeApplications({ version: 1, applications: [] })).toEqual({ version: 1, applications: [] });
  });
  it("rejects unsupported versions, malformed fields, unsafe URLs, invalid stages, and duplicate IDs", () => {
    for (const value of [null, [], { version: 2, applications: [] }, { version: 1, applications: [null] }, { version: 1, applications: [{ ...item, role: 42 }] }, { version: 1, applications: [{ ...item, stage: "unknown" }] }, { version: 1, applications: [{ ...item, url: "javascript:alert(1)" }] }, { version: 1, applications: [{ ...item, deadline: "2026-02-30" }] }, { version: 1, applications: [item, item] }, { version: 1, applications: [{ ...item, id: "" }] }]) {
      expect(decodeApplications(value)).toBeNull();
    }
  });
});
