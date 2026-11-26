/**
 * Read-only check of every tracked repository through the GitHub CLI.
 * Prints the `probe` block for a refresh candidate on stdout and notes for the editor on stderr.
 *   node scripts/gta6-pc/probe.mjs > /tmp/gta6-probe.json
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const projects = JSON.parse(fs.readFileSync("src/data/gta6-pc/projects.json", "utf8"));
const api = (path) => {
  try {
    return { http: 200, body: JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16e6 })) };
  } catch (e) {
    const code = /HTTP (\d{3})/.exec(String(e.stderr ?? e.message))?.[1];
    if (!code) throw e; // gh missing, no network or no auth: fail the check instead of guessing
    return { http: Number(code), body: null };
  }
};

const probe = {}, notes = [];
for (const p of projects.filter((x) => x.repo)) {
  const { http, body } = api("repos/" + p.repo);
  if (![200, 404, 451].includes(http)) throw Error("unexpected HTTP " + http + " for " + p.repo);
  probe[p.id] = http === 200 ? { http, stars: body.stargazers_count, pushed: body.pushed_at.slice(0, 10) } : { http, stars: null, pushed: p.pushed };
  const was = p.http;
  if (http !== was) notes.push(p.id + ": HTTP " + was + " -> " + http + (http === 451 ? " (blocked for legal reasons; look for the notice in github/dmca)" : http === 404 ? (api("users/" + p.repo.split("/")[0]).http === 404 ? " (the owner's account is gone too)" : " (the owner's account still exists)") : ""));
  if (http === 200) {
    if (body.full_name.toLowerCase() !== p.repo.toLowerCase()) notes.push(p.id + ": moved to " + body.full_name);
    if (body.archived) notes.push(p.id + ": archived by its owner");
    if (body.pushed_at.slice(0, 10) !== p.pushed) notes.push(p.id + ": new commits since " + p.pushed + " (last " + body.pushed_at.slice(0, 10) + "); reread the README status");
    else if (p.state === "active" && Date.now() - Date.parse(body.pushed_at) > 7 * 864e5) notes.push(p.id + ": no commits for a week; consider \"quiet\"");
  }
}
console.log(JSON.stringify(probe, null, 2));
console.error(notes.length ? notes.join("\n") : "No repository changed state.");
