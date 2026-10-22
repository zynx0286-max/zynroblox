// Tests for "may an anonymous visitor fetch this upload?".
//
// The rule is reference-based: a file is public only while something public
// points at it. These tests pin every reference kind, including the two easy
// mistakes — treating a draft's media as public, and treating a file with no
// reference at all as public.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decideUploadAccess,
  uploadReferences,
  type UploadReferenceSource,
} from "./upload-access-rules.ts";

const URL_A = "/uploads/abc-123";
const PUBLISHED = { id: "w1", slug: "pub", status: "published" };
const DRAFT = { id: "w2", slug: "draft", status: "draft" };

const access = (store: UploadReferenceSource, url = URL_A) =>
  decideUploadAccess(uploadReferences(store, url));

test("a published work's thumbnail is public", () => {
  assert.equal(access({ works: [{ ...PUBLISHED, image: URL_A }] }), "public");
});

test("a draft work's thumbnail needs the owner session", () => {
  assert.equal(access({ works: [{ ...DRAFT, image: URL_A }] }), "owner");
});

test("media attached to a published work is public", () => {
  assert.equal(access({ works: [PUBLISHED], media: [{ workId: "w1", url: URL_A }] }), "public");
});

test("media attached to a draft work needs the owner session", () => {
  assert.equal(access({ works: [DRAFT], media: [{ workId: "w2", url: URL_A }] }), "owner");
});

test("media whose work was deleted stays owner-only", () => {
  assert.equal(access({ works: [], media: [{ workId: "gone", url: URL_A }] }), "owner");
});

test("an unreferenced upload (not attached yet) is owner-only", () => {
  assert.equal(access({}), "owner");
  assert.equal(access({ works: [PUBLISHED, DRAFT], media: [], testimonials: [] }), "owner");
});

test("testimonial avatars are public", () => {
  assert.equal(access({ testimonials: [{ imageUrl: URL_A }] }), "public");
});

test("site settings that point at an upload make it public", () => {
  assert.equal(access({ settings: { hero: { background: URL_A } } }), "public");
  assert.equal(access({ settings: { gallery: [URL_A] } }), "public");
});

test("one public reference wins over a draft reference", () => {
  assert.equal(
    access({
      works: [{ ...DRAFT, image: URL_A }, PUBLISHED],
      media: [{ workId: "w1", url: URL_A }],
    }),
    "public",
  );
});

test("a lookalike URL is not a reference", () => {
  assert.equal(access({ works: [{ ...PUBLISHED, image: `${URL_A}-2` }] }), "owner");
  assert.equal(access({ works: [{ ...PUBLISHED, image: "/uploads/abc" }] }), "owner");
});

test("legacy rows without a status count as published", () => {
  assert.equal(access({ works: [{ id: "w3", image: URL_A }] }), "public");
});

test("each reference records where it came from", () => {
  const refs = uploadReferences(
    {
      works: [{ ...PUBLISHED, image: URL_A }],
      media: [
        { workId: "w2", url: URL_A },
        { workId: "w3", url: URL_A },
      ],
      testimonials: [{ imageUrl: URL_A }],
      settings: { seo: { og: URL_A } },
    },
    URL_A,
  );
  assert.deepEqual(
    refs.map((r) => r.kind),
    ["work", "media", "media", "testimonial", "settings"],
  );
  assert.deepEqual(
    refs.map((r) => r.published),
    [true, false, false, true, true],
  );
});

test("an empty url references nothing", () => {
  assert.deepEqual(uploadReferences({ settings: { x: URL_A } }, ""), []);
});
