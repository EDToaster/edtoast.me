// Filters and sorting for the project list and the update history. The page reads fine without it.
import health from "~/data/gta6-pc/health.json";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("filters"), list = $("project-list"), kinds = $("kinds");
const rows = Array.from(list.children) as HTMLElement[];
const field = (name: string) => form.elements.namedItem(name) as HTMLSelectElement & HTMLInputElement;
const keys = ["route", "host", "sort", "ingame", "kind"];
let q = new URLSearchParams(location.search);

const order: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
  fps: (a, b) => +b.dataset.fps! - +a.dataset.fps!,
  stars: (a, b) => +b.dataset.stars! - +a.dataset.stars!,
  pushed: (a, b) => b.dataset.pushed!.localeCompare(a.dataset.pushed!),
};
const rank = (a: HTMLElement, b: HTMLElement) => +a.dataset.rank! - +b.dataset.rank!;

function render() {
  for (const k of ["route", "host", "sort"]) field(k).value = q.get(k) ?? "";
  field("ingame").checked = q.has("ingame");
  const route = q.get("route"), host = q.get("host"), sort = order[q.get("sort") ?? ""];
  let shown = 0;
  for (const li of [...rows].sort((a, b) => (sort ? sort(a, b) : 0) || rank(a, b))) {
    const show = (!route || li.dataset.route === route) && (!host || li.dataset.hosts!.split(" ").includes(host)) && (!q.has("ingame") || +li.dataset.stage! >= 4);
    li.hidden = !show;
    if (show) shown++;
    list.append(li);
  }
  $("shown").textContent = shown === rows.length ? rows.length + " projects" : shown + " of " + rows.length + " projects";
  $("none").hidden = shown > 0;

  const kind = q.get("kind") ?? "";
  for (const b of kinds.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.kind === kind));
  for (const a of document.querySelectorAll<HTMLElement>(".timeline article")) a.hidden = !!kind && a.dataset.kind !== kind;
  for (const d of document.querySelectorAll<HTMLElement>(".timeline .day")) d.hidden = !d.querySelector("article:not([hidden])");
}
function patch(values: Record<string, string | null>) {
  for (const [k, v] of Object.entries(values)) if (v) q.set(k, v); else q.delete(k);
  const keep = new URLSearchParams([...q].filter(([k]) => keys.includes(k)));
  history.replaceState(null, "", location.pathname + (keep.size ? "?" + keep : "") + location.hash);
  render();
}

form.addEventListener("change", () => patch({ route: field("route").value, host: field("host").value, sort: field("sort").value, ingame: field("ingame").checked ? "1" : null }));
form.addEventListener("submit", (e) => e.preventDefault());
kinds.addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button"); if (b) patch({ kind: b.dataset.kind || null }); });
$("clear").addEventListener("click", () => patch({ route: null, host: null, ingame: null }));
$("expand").addEventListener("click", (e) => {
  const b = e.currentTarget as HTMLButtonElement, open = b.getAttribute("aria-pressed") !== "true";
  for (const d of list.querySelectorAll("details")) d.open = open;
  b.setAttribute("aria-pressed", String(open));
  b.textContent = open ? "Close all" : "Open all";
});
for (const a of document.querySelectorAll<HTMLAnchorElement>("[data-route-link]"))
  a.addEventListener("click", (e) => { e.preventDefault(); patch({ route: a.dataset.routeLink!, host: null, ingame: null }); $("projects").scrollIntoView({ block: "start" }); });

// A link to a project (#victory) opens its row.
function openTarget() {
  const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (target instanceof HTMLDetailsElement) { (target.parentElement as HTMLElement).hidden = false; target.open = true; target.scrollIntoView({ block: "nearest" }); }
}
window.addEventListener("hashchange", openTarget);

form.hidden = false;
kinds.hidden = false;
$("overdue").hidden = Date.now() - Date.parse(health.lastSuccessful ?? health.seededAt) < 48 * 3600e3;
render();
openTarget();
