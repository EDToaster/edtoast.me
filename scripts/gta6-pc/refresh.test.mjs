import test from "node:test";
import assert from "node:assert/strict";
import { load, merge, registry, validate } from "./refresh.mjs";
import { snapshot } from "../../src/demos/gta6-pc/derive.ts";

// Keep fixtures independent of tomorrow's production checkpoint.
const initial = load(), now = "2028-01-04T15:00:00Z", day = "2028-01-04";
initial.health.lastAttempt = "2027-12-31T15:00:00Z";
initial.health.lastSuccessful = initial.health.lastAttempt;
const open = initial.projects.filter((p) => p.visibility === "open");
const probe = (over = {}) => Object.fromEntries(open.map((p) => [p.id, { http: p.http, stars: p.stars, pushed: p.pushed, ...over[p.id] }]));
const checks = (ok = true) => Object.fromEntries(registry().map((r) => [r.id, { ok, note: ok ? "Read in full" : "Could not be loaded" }]));
const input = (more = {}) => ({ checkedAt: now, checks: checks(), probe: probe(), ...more });
const event = (id, more = {}) => ({ id, date: day, firstSeen: now, kind: "port", title: "Test entry " + id, summary: "A summary.", projects: [], sources: ["portwatch"], ...more });
const running = open.find((p) => p.state === "active" && p.stage > 0 && p.stage < 5);

test("the committed data passes its own rules", () => {
  validate(load());
});

test("replaying a run adds each entry and each day's snapshot once", () => {
  const c = input({ events: [event("replayed")] });
  const once = merge(initial, c), twice = merge(once, c);
  assert.equal(once.events.length, initial.events.length + 1);
  assert.deepEqual(twice.events, once.events);
  assert.equal(once.history.length, initial.history.length + 1);
  assert.deepEqual(twice.history, once.history);
  assert.equal(once.health.outcome, "Updated");
  assert.equal(merge(once, input({ checkedAt: "2028-01-05T15:00:00Z" })).health.outcome, "No changes");
  assert.throws(() => merge(once, input({ events: [{ ...event("replayed"), title: "Rewritten" }] })), /existing history entry changed/);
  assert.throws(() => merge(once, input({ events: [{ ...event("copy"), title: "Test entry replayed" }] })), /duplicate entry/);
});

test("source failures keep the record and the last successful checkpoint", () => {
  const good = merge(initial, input());
  const bad = merge(good, { checkedAt: "2028-01-05T15:00:00Z", checks: checks(false) });
  for (const k of ["events", "projects", "sources", "status", "routes"]) assert.deepEqual(bad[k], good[k]);
  assert.equal(bad.health.lastSuccessful, now);
  assert.equal(bad.health.sources.press.lastOK, now);
  assert.equal(bad.health.outcome, "Sources could not be checked");
  const c = checks(); c.press.ok = false;
  const partial = merge(good, input({ checkedAt: "2028-01-05T15:00:00Z", checks: c, events: [event("still-published", { date: "2028-01-05", firstSeen: "2028-01-05T15:00:00Z" })] }));
  assert.equal(partial.health.outcome, "Partial check");
  assert.equal(partial.health.lastSuccessful, now);
  assert.ok(partial.events.some((e) => e.id === "still-published"));
  assert.throws(() => merge(initial, { checkedAt: now, checks: checks() }), /no repository check today/);
});

test("a stage, state or route change needs a history entry that names the project", () => {
  const update = { [running.id]: { stage: running.stage + 1 } };
  assert.throws(() => merge(initial, input({ projects: { update } })), /changed without a new history entry/);
  assert.throws(() => merge(initial, input({ projects: { update }, events: [event("about-something-else")] })), /changed without a new history entry/);
  const moved = merge(initial, input({ projects: { update }, events: [event("moved", { projects: [running.id] })] }));
  const p = moved.projects.find((x) => x.id === running.id);
  assert.equal(p.stage, running.stage + 1);
  assert.equal(p.updated, day);
  assert.throws(() => merge(initial, input({ projects: { update: { [running.id]: { id: "renamed" } } } })), /cannot be edited/);
});

test("a repository that disappears cannot stay listed as running", () => {
  const gone = { [running.id]: { http: 451, stars: null } };
  assert.throws(() => merge(initial, input({ probe: probe(gone) })), /state does not match the repository check/);
  const update = { [running.id]: { state: "offline", note: "The repository returned 451 on 4 January." } };
  const down = merge(initial, input({ probe: probe(gone), projects: { update }, events: [event("taken-down", { kind: "takedown", projects: [running.id] })] }));
  assert.equal(down.projects.find((x) => x.id === running.id).state, "offline");
  assert.equal(down.history.at(-1).offline, initial.projects.filter((p) => !["active", "quiet"].includes(p.state)).length + 1);
  assert.throws(() => merge(initial, input({ probe: probe(gone), projects: { update: { [running.id]: { state: "shut-down", note: "Gone.", evidence: "self-reported", sources: ["repo-" + running.id] } } }, events: [event("no-notice", { projects: [running.id] })] })), /shutdown needs a notice or press report/);
});

test("only Rockstar, Take-Two or their store pages can put the game on PC", () => {
  const press = { status: { verdict: "yes", answer: "Yes", official: { announced: true, released: true, sources: ["gamesbeat-q1"] } }, events: [event("press-says-so", { kind: "official", sources: ["gamesbeat-q1"] })] };
  assert.throws(() => merge(initial, input(press)), /official status changed without an official history entry/);
  assert.throws(() => merge(initial, input({ ...press, events: [event("cites-rockstar-elsewhere", { kind: "official", sources: ["rockstar-vi"] })] })), /needs an official source/);
  assert.throws(() => merge(initial, input({ status: { official: { announced: true } } })), /official status changed without an official history entry/);
  assert.throws(() => merge(initial, input({ sources: { fake: { url: "https://rockstargames.example.com/VI", publisher: "Rockstar Games", label: "Announcement", kind: "official" } } })), /not an official publisher/);
  const real = merge(initial, input({ status: { official: { announced: true, window: "2028" } }, events: [event("announced", { kind: "official", sources: ["rockstar-vi"] })] }));
  assert.equal(real.status.verdict, "no");
  assert.equal(real.status.updated, day);
  assert.throws(() => merge(initial, input({ status: { verdict: "yes", answer: "Yes" }, events: [event("wishful")] })), /verdict yes means an official release/);
});

test("console parity needs 30 fps and someone outside the project", () => {
  const top = open.find((p) => p.state === "active" && p.evidence === "self-reported" && p.fps);
  const claim = (patch) => input({ projects: { update: { [top.id]: { stage: 6, ...patch } } }, events: [event("parity", { projects: [top.id] })] });
  assert.throws(() => merge(initial, claim({})), /console parity needs 30 fps/);
  assert.throws(() => merge(initial, claim({ fps: { value: 31, text: "31 fps" } })), /console parity needs 30 fps/);
  const seen = claim({ fps: { value: 31, text: "31 fps" }, evidence: "press", sources: [...top.sources, "pcgamer-explainer"] });
  assert.throws(() => merge(initial, seen), /verdict unofficial means a project at console parity/);
  const done = merge(initial, { ...seen, status: { verdict: "unofficial", answer: "Unofficially" } });
  assert.equal(done.history.at(-1).stage, 6);
  assert.equal(done.history.at(-1).fps, 31);
});

test("downloads, chat servers and em dashes are refused", () => {
  const link = (url, kind = "press") => input({ sources: { bad: { url, publisher: "Somewhere", label: "A link", kind } } });
  for (const url of ["https://discord.gg/abc", "https://mega.nz/file/abc", "https://github.com/a/b/releases/tag/v1", "https://example.com/gta6.zip", "http://example.com/news"])
    assert.throws(() => merge(initial, link(url)), /download, file host or chat link|plain https/);
  assert.throws(() => merge(initial, link("https://gitlab.com/a/b", "repo")), /must be on github.com/);
  assert.throws(() => merge(initial, input({ events: [event("dash", { summary: "One thing \u2014 another." })] })), /em dash/);
  assert.throws(() => merge(initial, input({ events: [event("unsourced", { sources: [] })] })), /no source/);
  assert.throws(() => merge(initial, input({ events: [event("orphan", { projects: ["not-a-project"] })] })), /unknown project/);
});

test("the daily snapshot counts public code only for the frame rate", () => {
  const p = (id, more) => ({ id, state: "active", visibility: "open", stage: 4, fps: null, stars: 0, ...more });
  const s = snapshot([p("a", { fps: { value: 12, text: "" } }), p("b", { stage: 5, fps: { value: 9, text: "" } }), p("c", { visibility: "private", fps: { value: 40, text: "" } }), p("d", { state: "offline", stage: 6, fps: { value: 60, text: "" } })], day);
  assert.deepEqual(s, { date: day, stage: 5, fps: 12, fpsProject: "a", privateFps: 40, tracked: 4, active: 3, offline: 1, sources: [] });
});
