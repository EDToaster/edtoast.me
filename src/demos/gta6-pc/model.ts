import statusData from "~/data/gta6-pc/status.json";
import routeData from "~/data/gta6-pc/routes.json";
import projectData from "~/data/gta6-pc/projects.json";
import eventData from "~/data/gta6-pc/events.json";
import historyData from "~/data/gta6-pc/history.json";
import sourceData from "~/data/gta6-pc/sources.json";
import healthData from "~/data/gta6-pc/health.json";
import gdkData from "~/data/gta6-pc/gdk.json";
import registry from "../../../docs/gta6-pc/registry.json";
import { byProgress, live, snapshot, type Project, type Snapshot } from "./derive";

export * from "./derive";

export interface Source { url: string; publisher: string; label: string; kind: string; published?: string }
export interface TrackerEvent { id: string; date: string; firstSeen: string; kind: string; title: string; summary: string; projects: string[]; sources: string[] }
export interface Route { id: string; short: string; name: string; platform: string; method: string; how: string; standing: string }

export const status = statusData;
export const routes: Route[] = routeData;
export const sources: Record<string, Source> = sourceData;
export const projects = (projectData as Project[]).slice().sort(byProgress);
export const events = (eventData as TrackerEvent[]).slice().sort((a, b) => b.date.localeCompare(a.date) || b.firstSeen.localeCompare(a.firstSeen) || a.id.localeCompare(b.id));
export const history = (historyData as Snapshot[]).slice().sort((a, b) => a.date.localeCompare(b.date));
export const health: {
  coverageStart: string; seededAt: string; lastAttempt: string; lastSuccessful: string | null; outcome: string;
  sources: Record<string, { ok: boolean; checked: string; lastOK: string | null; note: string }>; gaps: string[];
} = healthData;
interface Cited { text: string[]; sources: string[] }
export const gdk: {
  status: string; confirmedBy: string[]; updated: string; summary: string; claim: Cited; kit: Cited; risks: Cited;
  effects: { area: string; today: string; withKit: string; effect: string; sources: string[] }[];
  stances: { name: string; project: string | null; text: string; sources: string[] }[];
} = gdkData;
export const checks = registry.map((r) => ({ ...r, ...health.sources[r.id] }));

export const running = projects.filter(live);
export const stopped = projects.filter((p) => !live(p));
export const today = snapshot(projects, health.lastAttempt.slice(0, 10));
export const project = (id: string) => projects.find((p) => p.id === id);
export const route = (id: string) => routes.find((r) => r.id === id)!;

export const eventKinds: Record<string, string> = {
  port: "Ports",
  takedown: "Takedowns",
  official: "Official",
  leak: "Leaks",
  safety: "Safety",
};

export const gdkStates: Record<string, string> = { unconfirmed: "Unconfirmed", confirmed: "Confirmed", debunked: "Debunked" };
export const gdkEffects: Record<string, string> = { accuracy: "Accuracy", small: "Small gain", none: "No change" };

const utc = { timeZone: "UTC" } as const;
export const dayText = (s: string) => new Date(s.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-GB", { ...utc, day: "numeric", month: "short", year: "numeric" });
export const shortDay = (s: string) => new Date(s.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-GB", { ...utc, day: "numeric", month: "short" });
export const timeText = (s: string) => dayText(s) + ", " + new Date(s).toLocaleTimeString("en-GB", { ...utc, hour: "2-digit", minute: "2-digit" }) + " UTC";
export const count = (n: number | null) => (n === null ? "" : n >= 10000 ? Math.round(n / 1000) + "k" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
