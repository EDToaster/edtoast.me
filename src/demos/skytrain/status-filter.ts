export const mapStatuses = ["operating", "construction", "approved", "proposed"] as const;

// The original ?status=construction links are also valid one-item selections.
export function readStatuses(value: string | null): Set<string> {
  const requested = value ? value.split(",") : mapStatuses;
  return new Set(mapStatuses.filter(id => requested.includes(id)));
}

export function writeStatuses(selection: ReadonlySet<string>): string | null {
  const selected = mapStatuses.filter(id => selection.has(id));
  return selected.length === mapStatuses.length ? null : selected.join(",") || "none";
}
