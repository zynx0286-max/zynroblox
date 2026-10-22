// Tests for draft/published visibility.
//
// The failure that matters here is the inverse of the feature: an upgrade that
// silently hides the whole portfolio because stored rows predate the `status`
// field. The other failure is a draft leaking to visitors. Both are covered.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  filterVisibleWorks,
  isDraft,
  normalizeWorkStatus,
  WORK_STATUSES,
} from "./work-visibility.ts";

test("legacy rows with no status are published", () => {
  assert.equal(normalizeWorkStatus(undefined), "published");
  assert.equal(normalizeWorkStatus(null), "published");
  assert.equal(isDraft({}), false);
});

test("only the literal draft value is a draft", () => {
  assert.equal(normalizeWorkStatus("draft"), "draft");
  for (const junk of ["DRAFT", "Draft", "unpublished", "", 0, false, {}]) {
    assert.equal(normalizeWorkStatus(junk), "published", `junk: ${String(junk)}`);
  }
  assert.deepEqual([...WORK_STATUSES], ["published", "draft"]);
});

test("visitors see published works only, in order", () => {
  const works = [
    { slug: "a", status: "published" },
    { slug: "b", status: "draft" },
    { slug: "c" },
    { slug: "d", status: "published" },
  ];
  assert.deepEqual(
    filterVisibleWorks(works, false).map((w) => w.slug),
    ["a", "c", "d"],
  );
});

test("the owner sees drafts so they can be previewed", () => {
  const works = [
    { slug: "a", status: "published" },
    { slug: "b", status: "draft" },
  ];
  assert.deepEqual(
    filterVisibleWorks(works, true).map((w) => w.slug),
    ["a", "b"],
  );
});

test("filtering never mutates the stored list", () => {
  const works = [{ slug: "a", status: "draft" as const }];
  filterVisibleWorks(works, false);
  assert.equal(works.length, 1, "the draft must stay in the store");
});

test("a list of only drafts is empty for visitors", () => {
  const works = [{ slug: "a", status: "draft" as const }];
  assert.deepEqual(filterVisibleWorks(works, false), []);
});
