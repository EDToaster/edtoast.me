/** Pure candidate merge + validation for the GTA VI PC tracker. No web access, credentials or git writes. */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual as equal } from "node:util";
import { pathToFileURL } from "node:url";
import { snapshot, lastStage, live } from "../../src/demos/gta6-pc/derive.ts";

export const dir = "src/data/gta6-pc/";
export const names = ["status", "routes", "projects", "events", "history", "sources", "health"];
const file = (n) => dir + n + ".json";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const load = () => Object.fromEntries(names.map((n) => [n, read(file(n))]));
export const registry = () => read("docs/gta6-pc/registry.json");

const demand = (ok, msg) => { if (!ok) throw Error(msg); };
const ymd = (s) => typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s) && new Date(s + "T12:00Z").toISOString().slice(0, 10) === s;
const instant = (s) => typeof s === "string" && /Z$/.test(s) && Number.isFinite(Date.parse(s));
const text = (s) => typeof s === "string" && s.trim().length > 0;
const slug = (s) => typeof s === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
const unique = (rows, what) => {
  const ids = rows.map((r) => r.id);
  demand(ids.every(slug) && new Set(ids).size === ids.length, "missing or duplicate " + what + " ID");
  return new Set(ids);
};

const sourceKinds = ["official", "primary", "press", "tracker", "repo"];
const eventKinds = ["port", "takedown", "official", "leak", "safety"];
const projectStates = ["active", "quiet", "shut-down", "offline"];
const evidenceLevels = ["self-reported", "tracker", "press"];
const hostNames = ["windows", "linux", "macos"];
// Only these publishers can say that a PC version exists.
const authority = (u) => /(^|\.)(rockstargames\.com|take2games\.com|store\.steampowered\.com|store\.epicgames\.com)$/.test(new URL(u).hostname);
// The page links to reporting and to source code. It never links to game files, builds or chat servers.
const blocked = /(^|\.)(discord\.gg|discord\.com|discordapp\.com|t\.me|telegram\.org|mega\.nz|mega\.io|mediafire\.com|gofile\.io|pixeldrain\.com|1fichier\.com|buzzheavier\.com|archive\.org|rutracker\.org|1337x\.to|thepiratebay\.org)$/;
const sourceOK = (s) => {
  const u = new URL(s.url);
  demand(u.protocol === "https:" && !u.username && !u.password, "source must be a plain https URL: " + s.url);
  demand(!blocked.test(u.hostname) && !/\/releases\/|\/archive\/|\.(zip|7z|rar|exe|torrent|xvc|pkg)$/i.test(u.pathname), "download, file host or chat link: " + s.url);
  demand(text(s.publisher) && text(s.label) && sourceKinds.includes(s.kind), "invalid source: " + s.url);
  demand(s.published === undefined || ymd(s.published), "invalid source date: " + s.url);
  if (s.kind === "official") demand(authority(s.url), "not an official publisher: " + s.url);
  if (s.kind === "repo") demand(u.hostname === "github.com", "repository source must be on github.com: " + s.url);
};
// House style for anything a reader sees: no em dashes.
const plain = (where, ...values) => {
  for (const v of values.flat()) demand(v == null || (typeof v === "string" && !v.includes("\u2014")), "em dash in " + where);
};

export function validate(db) {
  const { status, routes, projects, events, history, sources, health } = db;
  for (const s of Object.values(sources)) sourceOK(s);
  const known = (ids, where) => demand(Array.isArray(ids) && ids.every((k) => Object.hasOwn(sources, k)), "unknown source in " + where);
  const cited = (ids, where) => { known(ids, where); demand(ids.length > 0, "no source for " + where); };
  const kindsOf = (ids) => ids.map((k) => sources[k].kind);

  const routeIDs = unique(routes, "route");
  for (const r of routes) { demand(text(r.name) && text(r.short) && text(r.platform) && text(r.method) && text(r.how) && text(r.standing), "invalid route " + r.id); plain("route " + r.id, r.how, r.standing); }

  const projectIDs = unique(projects, "project");
  for (const p of projects) {
    const at = "project " + p.id;
    cited(p.sources, at);
    demand(text(p.name) && text(p.approach) && routeIDs.has(p.route), "invalid " + at);
    demand(projectStates.includes(p.state) && evidenceLevels.includes(p.evidence) && ["gta6", "general"].includes(p.scope), "invalid state, evidence or scope: " + at);
    demand(Number.isInteger(p.stage) && p.stage >= 0 && p.stage <= lastStage, "invalid stage: " + at);
    demand(Array.isArray(p.hosts) && p.hosts.length > 0 && p.hosts.every((h) => hostNames.includes(h)), "invalid hosts: " + at);
    demand(Array.isArray(p.missing) && p.missing.every(text), "invalid missing list: " + at);
    demand(p.fps === null || (Number.isFinite(p.fps.value) && p.fps.value > 0 && p.fps.value < 500 && text(p.fps.text)), "invalid frame rate: " + at);
    demand([p.hardware, p.target, p.eta, p.note].every((v) => v === null || text(v)), "empty text field: " + at);
    demand(p.base === null || (projectIDs.has(p.base) && p.base !== p.id), "unknown base: " + at);
    demand(ymd(p.checked) && ymd(p.updated), "invalid dates: " + at);
    if (p.visibility === "open") {
      demand(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(p.repo ?? "") && sources["repo-" + p.id]?.url === "https://github.com/" + p.repo && p.sources.includes("repo-" + p.id), "open project needs its repository as a source: " + at);
      demand([200, 404, 451].includes(p.http), "missing repository check: " + at);
      demand(p.stars === null || (Number.isInteger(p.stars) && p.stars >= 0), "invalid stars: " + at);
      demand(p.pushed === null || ymd(p.pushed), "invalid last commit: " + at);
      // A repository that has gone cannot be listed as running, and one that is up is not offline.
      demand((p.http === 200) === live(p), "state does not match the repository check: " + at);
    } else {
      demand(p.visibility === "private" && p.repo === null && p.http === null, "private build cannot have a repository: " + at);
      demand(p.evidence !== "self-reported", "a private build needs a tracker or press source: " + at);
    }
    if (p.evidence !== "self-reported") demand(kindsOf(p.sources).some((k) => k !== "repo"), "evidence label needs a source outside the repository: " + at);
    if (!live(p)) demand(text(p.note), "say what happened: " + at);
    if (p.state === "shut-down") demand(kindsOf(p.sources).some((k) => k === "primary" || k === "press"), "a shutdown needs a notice or press report: " + at);
    // "On PC" needs the console's frame rate and a witness.
    if (p.stage === lastStage) demand(p.fps && p.fps.value >= 30 && p.evidence !== "self-reported", "console parity needs 30 fps and outside confirmation: " + at);
    plain(at, p.name, p.approach, p.hardware, p.target, p.eta, p.note, p.fps?.text, p.missing);
  }

  const fingerprints = new Set();
  unique(events, "event");
  for (const e of events) {
    const at = "event " + e.id;
    cited(e.sources, at);
    demand(ymd(e.date) && instant(e.firstSeen) && e.date <= e.firstSeen.slice(0, 10), "invalid dates: " + at);
    demand(eventKinds.includes(e.kind) && text(e.title) && text(e.summary), "invalid " + at);
    demand(Array.isArray(e.projects) && e.projects.every((k) => projectIDs.has(k)), "unknown project in " + at);
    const print = e.date + "|" + e.title.trim().toLowerCase();
    demand(!fingerprints.has(print), "duplicate entry: " + e.id);
    fingerprints.add(print);
    plain(at, e.title, e.summary);
  }

  const days = history.map((h) => h.date);
  demand(days.every(ymd) && new Set(days).size === days.length && equal(days, [...days].sort()), "history needs one row a day, oldest first");
  for (const h of history) {
    known(h.sources, "history " + h.date);
    demand((h.stage === null || (Number.isInteger(h.stage) && h.stage >= 0 && h.stage <= lastStage)) && (h.fps === null || Number.isFinite(h.fps)), "invalid history " + h.date);
    demand(h.fpsProject == null || projectIDs.has(h.fpsProject), "unknown project in history " + h.date);
    plain("history " + h.date, h.note);
  }

  const official = status.official, anyParity = projects.some((p) => live(p) && p.stage === lastStage);
  demand(["no", "unofficial", "yes"].includes(status.verdict) && text(status.answer) && status.answer.length <= 24 && text(status.summary), "invalid status");
  demand(typeof official.announced === "boolean" && typeof official.released === "boolean" && text(official.note), "invalid official status");
  cited(official.sources, "official status"); cited(status.unofficial.sources, "unofficial status"); cited(status.safety.sources, "safety note");
  demand(text(status.unofficial.eta) && text(status.unofficial.caveat) && text(status.safety.note), "invalid status notes");
  // Only Rockstar, Take-Two or a store page they publish can announce or release a PC version.
  if (official.announced || official.released) demand(official.sources.some((k) => sources[k].kind === "official"), "an official PC version needs an official source");
  demand(!official.released || official.announced, "released but not announced");
  demand((status.verdict === "yes") === official.released, "verdict yes means an official release, and nothing else does");
  demand((status.verdict === "unofficial") === (!official.released && anyParity), "verdict unofficial means a project at console parity");
  demand(Number.isFinite(status.console.fps) && ymd(status.console.launched) && ymd(status.updated), "invalid console facts");
  plain("status", status.answer, status.summary, official.note, official.window, status.unofficial.eta, status.unofficial.caveat, status.safety.note);

  demand(instant(health.seededAt) && instant(health.lastAttempt) && (health.lastSuccessful === null || instant(health.lastSuccessful)) && ymd(health.coverageStart), "invalid collection time");
  demand(Array.isArray(health.gaps) && health.gaps.every(text), "invalid notes");
  return db;
}

const editorial = ["name", "repo", "route", "base", "hosts", "scope", "visibility", "state", "stage", "approach", "fps", "hardware", "target", "missing", "eta", "evidence", "note", "sources"];
const headline = ["route", "state", "stage"];

/** Changes that must not happen quietly: each needs a new history entry that names the project or the decision. */
function accountable(before, after, added) {
  const names = (id) => added.some((e) => e.projects.includes(id));
  for (const p of after.projects) {
    const old = before.projects.find((x) => x.id === p.id);
    if (!old) continue;
    for (const k of headline) demand(old[k] === p[k] || names(p.id), k + " of " + p.id + " changed without a new history entry that names it");
  }
  const o = before.status.official, n = after.status.official;
  if (o.announced !== n.announced || o.released !== n.released) demand(added.some((e) => e.kind === "official" && e.sources.some((k) => after.sources[k].kind === "official")), "official status changed without an official history entry");
  if (before.status.verdict !== after.status.verdict) demand(added.length > 0, "verdict changed without a history entry");
}

export function merge(old, candidate) {
  const db = structuredClone(old), { checkedAt, checks } = candidate;
  demand(instant(checkedAt) && Date.parse(checkedAt) >= Date.parse(old.health.lastAttempt), "invalid or older attempt");
  const day = checkedAt.slice(0, 10);
  const ids = registry().map((r) => r.id);
  demand(checks && equal(Object.keys(checks).sort(), [...ids].sort()), "each registry source needs a result");
  for (const id of ids) demand(typeof checks[id].ok === "boolean" && text(checks[id].note), "invalid check " + id);

  for (const [k, s] of Object.entries(candidate.sources ?? {})) {
    demand(slug(k) && (!db.sources[k] || equal(db.sources[k], s)), "source ID collision: " + k);
    db.sources[k] = s;
  }
  const added = [];
  for (const e of candidate.events ?? []) {
    const prior = db.events.find((x) => x.id === e.id);
    if (prior) { demand(equal(prior, e), "existing history entry changed: " + e.id); continue; }
    db.events.push(e); added.push(e);
  }

  let edits = added.length;
  for (const p of candidate.projects?.add ?? []) {
    demand(!db.projects.some((x) => x.id === p.id), "project already exists: " + p.id);
    db.projects.push({ http: null, stars: null, pushed: null, ...p, checked: day, updated: day });
    edits++;
  }
  for (const [id, patch] of Object.entries(candidate.projects?.update ?? {})) {
    const p = db.projects.find((x) => x.id === id);
    demand(p, "unknown project: " + id);
    demand(Object.keys(patch).every((k) => editorial.includes(k)), "field cannot be edited on " + id);
    const before = structuredClone(p);
    Object.assign(p, structuredClone(patch));
    if (!equal(before, p)) { p.updated = day; edits++; }
  }
  // Mechanical facts from scripts/gta6-pc/probe.mjs.
  for (const [id, seen] of Object.entries(candidate.probe ?? {})) {
    const p = db.projects.find((x) => x.id === id);
    demand(p && p.visibility === "open", "probe result for a project without a repository: " + id);
    demand(Object.keys(seen).every((k) => ["http", "stars", "pushed"].includes(k)), "unexpected probe field on " + id);
    Object.assign(p, seen, { checked: day });
    if (seen.http !== 200) { p.stars = null; }
  }
  if (checks.repos.ok) for (const p of db.projects) demand(p.visibility !== "open" || p.checked === day, "no repository check today for " + p.id);

  for (const [id, patch] of Object.entries(candidate.routes ?? {})) {
    const r = db.routes.find((x) => x.id === id);
    demand(r && equal(Object.keys(patch), ["standing"]), "only a route’s standing can be updated: " + id);
    if (r.standing !== patch.standing) { r.standing = patch.standing; edits++; }
  }
  if (candidate.status) {
    const { official = {}, unofficial = {}, safety = {}, ...top } = structuredClone(candidate.status);
    demand(!("updated" in top) && !("console" in top), "status dates and console facts are not edited by a daily run");
    const next = { ...db.status, ...top, official: { ...db.status.official, ...official }, unofficial: { ...db.status.unofficial, ...unofficial }, safety: { ...db.status.safety, ...safety } };
    if (!equal(next, db.status)) { db.status = { ...next, updated: day }; edits++; }
  }
  accountable(old, db, added);

  // One snapshot a day. A second run on the same day replaces that day's row and nothing older.
  const row = { ...snapshot(db.projects, day), ...(text(candidate.note) ? { note: candidate.note.trim() } : {}) };
  const last = db.history.at(-1);
  if (last?.date === day && !last.backfilled) db.history[db.history.length - 1] = row;
  else { demand(!last || last.date < day, "history already has a later or backfilled row for " + day); db.history.push(row); }

  for (const id of ids) {
    const prev = db.health.sources[id];
    db.health.sources[id] = { ok: checks[id].ok, checked: checkedAt, lastOK: checks[id].ok ? checkedAt : prev?.lastOK ?? null, note: checks[id].note.trim() };
  }
  const ok = ids.filter((id) => checks[id].ok).length;
  db.health.lastAttempt = checkedAt;
  if (ok === ids.length) db.health.lastSuccessful = checkedAt;
  db.health.outcome = ok === 0 ? "Sources could not be checked" : ok < ids.length ? "Partial check" : edits ? "Updated" : "No changes";
  return validate(db);
}

function guard(base) {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 32e6 });
  const changed = [...new Set([...git("diff", "--name-only", base, "--").trim().split("\n"), ...git("ls-files", "--others", "--exclude-standard").trim().split("\n")].filter(Boolean))];
  demand(changed.every((p) => names.map(file).includes(p)), "non-data diff: " + changed);
  const db = validate(load());
  const before = Object.fromEntries(names.map((n) => [n, JSON.parse(git("show", base + ":" + file(n)))]));
  for (const e of before.events) demand(db.events.some((x) => equal(x, e)), "lost or changed history entry " + e.id);
  for (const [k, s] of Object.entries(before.sources)) demand(equal(s, db.sources[k]), "lost or changed source " + k);
  for (const p of before.projects) demand(db.projects.some((x) => x.id === p.id), "lost project " + p.id);
  for (const r of before.routes) { const now = db.routes.find((x) => x.id === r.id); demand(now && equal({ ...now, standing: "" }, { ...r, standing: "" }), "lost or changed route " + r.id); }
  const day = db.health.lastAttempt.slice(0, 10);
  for (const h of before.history) demand(db.history.some((x) => equal(x, h)) || (h.date === day && !h.backfilled), "lost or changed snapshot " + h.date);
  demand(equal(db.history.at(-1), { ...snapshot(db.projects, day), ...(db.history.at(-1).note ? { note: db.history.at(-1).note } : {}) }), "today’s snapshot does not match the project list");
  demand(Date.parse(db.health.lastAttempt) >= Date.parse(before.health.lastAttempt) && db.health.coverageStart === before.health.coverageStart && db.health.seededAt === before.health.seededAt, "collection record rewritten");
  // The same gates apply if the JSON was edited by hand instead of through `apply`.
  accountable(before, db, db.events.filter((e) => !before.events.some((x) => x.id === e.id)));
  demand(equal(db.status.console, before.status.console), "console facts changed");
  const checks = registry().map((r) => db.health.sources[r.id]);
  demand(checks.every((c) => c && c.checked === db.health.lastAttempt), "each registry source needs a result from this run");
  if (checks.some((c) => !c.ok)) demand(db.health.lastSuccessful === before.health.lastSuccessful, "partial run advanced the checkpoint");
  console.log(changed.length + " allowlisted file(s); earlier records retained");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action, arg] = process.argv.slice(2);
  if (action === "guard") guard(arg || "HEAD");
  else if (action === "apply") {
    const old = load(), db = merge(old, read(arg));
    for (const n of names) if (!equal(old[n], db[n])) fs.writeFileSync(file(n), JSON.stringify(db[n], null, 2) + "\n");
    console.log(db.health.outcome);
  } else if (action === "validate") { validate(load()); console.log("Tracker data valid"); }
  else throw Error("Use validate | apply /absolute/candidate.json | guard <base-sha>");
}
