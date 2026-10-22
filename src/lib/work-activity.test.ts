// Tests for the audit lines behind the admin activity feed.
//
// The failure that matters: a publish logged as "unpublished" (or vice versa)
// makes the feed actively misleading about whether a page is live. The kind,
// summary and detail are all pinned here.

import { test } from "node:test";
import assert from "node:assert/strict";

import { statusActivity } from "./work-activity.ts";

const AT = new Date("2026-10-22T09:30:00.000Z");

test("publishing is logged as entry.published", () => {
  const entry = statusActivity(
    {
      title: "Engineria: Project X",
      slug: "engineria-project-x",
      status: "published",
      source: "toggle",
    },
    AT,
  );
  assert.equal(entry.kind, "entry.published");
  assert.equal(entry.summary, "Published Engineria: Project X");
  assert.equal(entry.slug, "engineria-project-x");
  assert.deepEqual(entry.detail, { status: "published", source: "toggle" });
  assert.equal(entry.at, AT.toISOString());
});

test("moving to draft is logged as entry.unpublished", () => {
  const entry = statusActivity(
    { title: "Draft Test Work", slug: "draft-test", status: "draft", source: "editor" },
    AT,
  );
  assert.equal(entry.kind, "entry.unpublished");
  assert.equal(entry.summary, "Moved to draft Draft Test Work");
  assert.deepEqual(entry.detail, { status: "draft", source: "editor" });
});

test("an entry without a slug omits the field instead of writing undefined", () => {
  const entry = statusActivity({ title: "No Slug", status: "published" }, AT);
  assert.equal("slug" in entry, false);
  assert.deepEqual(entry.detail, { status: "published" }, "no source means no source key");
});

test("the timestamp is the moment of the change, not a default", () => {
  const entry = statusActivity({ title: "Timing", status: "published" }, AT);
  assert.equal(Date.parse(entry.at), AT.getTime());
});
