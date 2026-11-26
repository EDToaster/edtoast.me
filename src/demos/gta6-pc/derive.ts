/*
  Shared by the page (model.ts) and the refresh script (scripts/gta6-pc/refresh.mjs).
  Keep it free of imports and of anything Node's type stripping cannot remove.
*/
export interface Fps { value: number; text: string }
export interface Project {
  id: string; name: string; repo: string | null; route: string; base: string | null; hosts: string[];
  scope: string; visibility: string; state: string; stage: number; approach: string; fps: Fps | null;
  hardware: string | null; target: string | null; missing: string[]; eta: string | null; evidence: string;
  note: string | null; http: number | null; stars: number | null; pushed: string | null;
  checked: string; updated: string; sources: string[];
}
export interface Snapshot {
  date: string; stage: number | null; fps: number | null; fpsProject?: string | null; privateFps?: number | null;
  tracked: number | null; active?: number; offline?: number; note?: string; backfilled?: boolean; sources: string[];
}

export const consoleFps = 30;

export const stages = [
  { name: "Groundwork", detail: "Tools, loaders or shader translators exist. The game does not start." },
  { name: "Boots", detail: "The game’s own code runs and gets as far as loading. Nothing useful is on screen." },
  { name: "Menus", detail: "Logos, the start screen or the menus draw." },
  { name: "World loads", detail: "Cutscenes or the 3D world draw. Nobody is playing yet." },
  { name: "In game", detail: "A player walks or drives around with a controller." },
  { name: "Missions", detail: "Story missions can be played through, with saves or checkpoints." },
  { name: "Console parity", detail: "Holds 30 fps with a correct picture, confirmed by someone outside the project." },
];
export const lastStage = stages.length - 1;

export const states: Record<string, string> = {
  active: "Active",
  quiet: "Quiet",
  "shut-down": "Shut down",
  offline: "Offline",
};
export const evidence: Record<string, string> = {
  "self-reported": "Self-reported",
  tracker: "Tracker",
  press: "Press",
};

export const live = (p: Pick<Project, "state">) => p.state === "active" || p.state === "quiet";

/** Rank used for the default order: furthest first, then fastest, then most starred. */
export function byProgress(a: Project, b: Project) {
  return b.stage - a.stage || (b.fps?.value ?? 0) - (a.fps?.value ?? 0) || (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name);
}

/** The day's headline numbers. Only builds with public code count towards the frame rate. */
export function snapshot(projects: Project[], date: string): Snapshot {
  const running = projects.filter(live);
  const withFps = (open: boolean) =>
    running
      .filter((p) => p.fps && (p.visibility === "open") === open)
      .sort((a, b) => b.fps!.value - a.fps!.value || b.stage - a.stage || (b.stars ?? 0) - (a.stars ?? 0));
  const best = withFps(true)[0];
  const bestPrivate = withFps(false)[0];
  return {
    date,
    stage: running.length ? Math.max(...running.map((p) => p.stage)) : null,
    fps: best?.fps?.value ?? null,
    fpsProject: best?.id ?? null,
    privateFps: bestPrivate?.fps?.value ?? null,
    tracked: projects.length,
    active: running.length,
    offline: projects.length - running.length,
    sources: [],
  };
}
