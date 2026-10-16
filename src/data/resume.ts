/*
  Single source of truth for work history. The /resume page renders this,
  and a future PDF export can read the same data.

  TODO(howard): fill in dates, titles and a line or two per role. Entries
  below come from the GitHub profile bio and are intentionally sparse.
*/
export type Role = {
  company: string;
  title: string;
  start: string; // "2024-03"
  end?: string; // omit for current
  location?: string;
  notes: string[]; // concrete things you did, with numbers where you have them
};

export const roles: Role[] = [
  { company: "Instacart", title: "Software Engineer", start: "", notes: [] },
  { company: "Meta", title: "Software Engineer", start: "", notes: [] },
  { company: "Amazon Web Services", title: "Software Engineer", start: "", notes: [] },
];

export type Education = { school: string; detail: string; end: string };
export const education: Education[] = [];

export function formatPeriod(r: Role): string {
  const fmt = (s: string) => {
    if (!s) return "";
    const [y, m] = s.split("-");
    if (!m) return y;
    return new Date(Number(y), Number(m) - 1).toLocaleString("en-CA", { month: "short", year: "numeric" });
  };
  const start = fmt(r.start);
  if (!start) return "";
  return `${start} – ${r.end ? fmt(r.end) : "now"}`;
}
