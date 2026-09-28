import { describe, expect, it } from "vitest";
import { initialReports, type Share } from "./demo-data";
import { isExpired, scopeIds } from "./access";

const grant: Share = { id:"demo", recipient:"Dr. Meera Sen", method:"Doctor invitation", scope:"all", reportIds:[], permission:"view", expiry:"7 days", includeSensitive:false, status:"active", createdAt:"2026-09-20T09:00:00Z" };

describe("patient-controlled access", () => {
  it("keeps dependent and sensitive reports out of a broad share by default", () => {
    const ids = scopeIds(grant, initialReports);
    expect(ids).not.toContain("r2");
    expect(ids).not.toContain("r12");
    expect(ids).toContain("r1");
  });
  it("includes a sensitive patient record only after deliberate inclusion", () => {
    expect(scopeIds({...grant, includeSensitive:true}, initialReports)).toContain("r2");
  });
  it("expires a seven-day grant after its window", () => {
    expect(isExpired(grant, Date.parse("2026-09-27T08:59:00Z"))).toBe(false);
    expect(isExpired(grant, Date.parse("2026-09-27T09:01:00Z"))).toBe(true);
  });
});
