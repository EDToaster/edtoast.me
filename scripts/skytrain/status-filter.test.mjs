import assert from "node:assert/strict";
import test from "node:test";
import { mapStatuses, readStatuses, writeStatuses } from "../../src/demos/skytrain/status-filter.ts";

test("old single-status links and unfiltered URLs keep their meaning", () => {
  assert.deepEqual([...readStatuses("construction")], ["construction"]);
  assert.deepEqual([...readStatuses(null)], [...mapStatuses]);
  assert.deepEqual([...readStatuses("")], [...mapStatuses]);
});

test("all 16 checkbox combinations survive sharing, including none and all", () => {
  for (let mask = 0; mask < 2 ** mapStatuses.length; mask++) {
    const selected = new Set(mapStatuses.filter((_, i) => mask & (1 << i)));
    const value = writeStatuses(selected);
    const url = new URL("https://example.org/skytrain/");
    if (value !== null) url.searchParams.set("status", value);
    assert.deepEqual(readStatuses(new URL(url.href).searchParams.get("status")), selected);
  }
  assert.equal(writeStatuses(new Set()), "none");
  assert.equal(writeStatuses(new Set(mapStatuses)), null);
});
