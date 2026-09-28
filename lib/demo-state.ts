import { initialEvents, initialReports, type Event, type Report, reportSchema, type Share } from "./demo-data";
import { z } from "zod";

const shareSchema = z.object({ id:z.string(), recipient:z.string(), method:z.string(), scope:z.enum(["all","selected","single"]), reportIds:z.array(z.string()), permission:z.enum(["view","contribute"]), expiry:z.string(), customDate:z.string().optional(), includeSensitive:z.boolean(), status:z.enum(["active","revoked"]), createdAt:z.string() });
const eventSchema = z.object({ id:z.string(), actor:z.string(), action:z.string(), target:z.string(), at:z.string() });
const stateSchema = z.object({ reports:z.array(reportSchema), shares:z.array(shareSchema), events:z.array(eventSchema) });
export type DemoState = { reports: Report[]; shares: Share[]; events: Event[] };
export const initialState: DemoState = { reports: initialReports, shares: [], events: initialEvents };
export function loadState(): DemoState {
  if (typeof window === "undefined") return initialState;
  try {
    const stored = window.localStorage.getItem("health-dossier-demo-v1");
    return stored ? stateSchema.parse(JSON.parse(stored)) : initialState;
  } catch { return initialState; }
}
export function saveState(state: DemoState) {
  try { window.localStorage.setItem("health-dossier-demo-v1", JSON.stringify(state)); } catch { /* private browser mode */ }
}
