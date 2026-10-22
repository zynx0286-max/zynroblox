// Concurrency regression tests for the store's optimistic locking.
//
// The bug these guard against is real and cost hours of debugging: the store
// is a single JSON document, every write replaces the whole row, and Workers
// run many isolates. Before CAS, a slow isolate would overwrite a newer
// document with its own stale copy — an admin save would silently vanish
// seconds after it looked successful.
//
// These tests drive the REAL production helpers (src/lib/store-cas.ts) against
// an in-memory fake of PostgREST that honors the version filter exactly like
// the real API, so a regression in the locking rules fails here rather than in
// production. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildCasBody,
  buildCasUrl,
  diffWorks,
  findDuplicateGroups,
  interpretCasResponse,
  isPlaceholderTitle,
  mergeWorks,
  needsBackfill,
  nextVersion,
  pickImage,
  pickTags,
  pickText,
  preferredSurvivor,
  shouldBootstrap,
  splitVersion,
} from "./store-cas.ts";

// ---------------------------------------------------------------------------
// A fake Supabase/PostgREST that behaves like the real thing for our purposes.
// ---------------------------------------------------------------------------

type Row = { key: string; value: Record<string, unknown> };

type FakeDb = {
  rows: Map<string, Row>;
  /** Every write that was accepted, for asserting no blind overwrites. */
  writes: Array<{ key: string; expected: number | null }>;
};

function fakeDb(seed?: Record<string, unknown>): FakeDb {
  const rows = new Map<string, Row>();
  if (seed) rows.set("zyn-store-v1", { key: "zyn-store-v1", value: seed });
  return { rows, writes: [] };
}

/** Mirrors store.ts's read path: select the row, split the version off. */
function readRow(db: FakeDb, key: string) {
  const row = db.rows.get(key);
  if (!row) return null;
  return splitVersion<Record<string, unknown>>(row.value);
}

/**
 * Mirrors store.ts's conditional write. Returns the rows PostgREST would send
 * back, so `interpretCasResponse` sees the real signal: an empty array when the
 * version filter matched nothing.
 */
function patchRow(
  db: FakeDb,
  key: string,
  expected: number | null,
  body: { value: Record<string, unknown> },
): { ok: boolean; rows: unknown[] } {
  const row = db.rows.get(key);
  if (expected === null) {
    // Bootstrap path: unconditional upsert.
    db.rows.set(key, { key, value: body.value });
    db.writes.push({ key, expected });
    return { ok: true, rows: [row ?? { key, value: body.value }] };
  }
  const current = row?.value?.["version"];
  if (current !== expected) {
    // Filter matched nothing — PostgREST returns 200 with an empty array.
    return { ok: true, rows: [] };
  }
  db.rows.set(key, { key, value: body.value });
  db.writes.push({ key, expected });
  return { ok: true, rows: [{ key, value: body.value }] };
}

/**
 * One simulated Worker isolate: its own cached snapshot plus the version that
 * snapshot was read at. This is the unit that used to clobber its peers.
 */
type Isolate = {
  name: string;
  snapshot: Record<string, unknown> | null;
  version: number | null;
  reads: number;
  blindWrites: number;
};

function isolate(name: string, db: FakeDb): Isolate {
  const row = readRow(db, "zyn-store-v1");
  return {
    name,
    snapshot: row ? structuredClone(row.store) : null,
    version: row ? row.version : null,
    reads: 1,
    blindWrites: 0,
  };
}

/**
 * The write half of an isolate, following the two rules that make CAS safe:
 * a known version is written conditionally; an UNKNOWN version is never
 * written blind (that is the clobber). It reports "conflict" so the caller
 * re-reads and re-applies.
 */
function writeFrom(iso: Isolate, db: FakeDb): "written" | "conflict" {
  if (!iso.snapshot) throw new Error(`${iso.name} has no snapshot`);
  if (shouldBootstrap(iso.version)) {
    // The one legitimate unconditional write: stamp a version on a row that
    // never had one, using data read moments ago.
    iso.blindWrites++;
    const body = JSON.parse(buildCasBody(iso.snapshot, iso.version)) as {
      value: Record<string, unknown>;
    };
    patchRow(db, "zyn-store-v1", null, body);
    iso.version = nextVersion(null);
    return "written";
  }
  const body = JSON.parse(buildCasBody(iso.snapshot, iso.version)) as {
    value: Record<string, unknown>;
  };
  const res = patchRow(db, "zyn-store-v1", iso.version, body);
  const result = interpretCasResponse(res.ok, res.rows, iso.version);
  if (result.status === "ok") {
    iso.version = result.version;
    return "written";
  }
  return "conflict";
}

/** Re-read after a conflict, exactly like revalidateFromPrimary(). */
function revalidate(iso: Isolate, db: FakeDb): void {
  const row = readRow(db, "zyn-store-v1");
  iso.reads++;
  if (!row) return;
  iso.snapshot = structuredClone(row.store);
  iso.version = row.version;
}

/**
 * store.ts's mutate() retry loop: apply, write, and on conflict re-read the
 * winner and RE-APPLY the mutation on top of it. `attempts` mirrors the
 * production bound of 4.
 */
function mutate(
  iso: Isolate,
  db: FakeDb,
  apply: (store: Record<string, unknown>) => void,
  attempts = 4,
): "written" | "conflict" {
  for (let i = 0; i < attempts; i++) {
    if (!iso.snapshot) revalidate(iso, db);
    apply(iso.snapshot as Record<string, unknown>);
    if (writeFrom(iso, db) === "written") return "written";
    revalidate(iso, db);
  }
  return "conflict";
}

const KEY = "zyn-store-v1";

function seedStore(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    works: [{ slug: "alpha", title: "Alpha" }],
    testimonials: [],
    reviews: [],
    reviewIps: [],
    universeIds: {},
    settings: {},
    media: [],
    uploads: [],
    version: 1,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// splitVersion / version bookkeeping
// ---------------------------------------------------------------------------

test("splitVersion pulls the embedded version off the document", () => {
  const row = splitVersion<{ works: unknown[] }>({ works: [], version: 7 });
  assert.equal(row?.version, 7);
  assert.equal("version" in (row?.store as object), false);
});

test("splitVersion does not mutate the caller's object", () => {
  const original = { works: [], version: 3 };
  splitVersion(original);
  assert.equal(original.version, 3, "input must keep its version field");
});

test("splitVersion reports an unversioned row as version null", () => {
  const row = splitVersion<{ works: unknown[] }>({ works: [] });
  assert.equal(row?.version, null);
  assert.deepEqual(row?.store, { works: [] });
});

test("splitVersion rejects non-objects (missing row)", () => {
  assert.equal(splitVersion(null), null);
  assert.equal(splitVersion(undefined), null);
  assert.equal(splitVersion("nope"), null);
  assert.equal(splitVersion(42), null);
  assert.equal(splitVersion([]), null);
});

test("splitVersion ignores a non-numeric version instead of trusting it", () => {
  const row = splitVersion<Record<string, unknown>>({ works: [], version: "9" });
  assert.equal(row?.version, null, "a string version must not be used as an expectation");
});

test("nextVersion increments a known version and bootstraps a null one", () => {
  assert.equal(nextVersion(1), 2);
  assert.equal(nextVersion(41), 42);
  assert.equal(nextVersion(null), 1);
});

test("the CAS filter is the jsonb path, not a column", () => {
  const url = buildCasUrl("https://db.supabase.co/", KEY, 5);
  assert.match(url, /value->>version=eq\.5/);
  assert.match(url, /key=eq\.zyn-store-v1/);
  assert.equal(url.includes("https://db.supabase.co"), true, "trailing slash normalized");
});

test("buildCasBody stamps the incremented version into the document", () => {
  const body = JSON.parse(buildCasBody({ works: [] }, 4)) as { value: { version: number } };
  assert.equal(body.value.version, 5);
});

test("buildCasBody on an unversioned expectation stamps version 1", () => {
  const body = JSON.parse(buildCasBody({ works: [] }, null)) as { value: { version: number } };
  assert.equal(body.value.version, 1);
});

test("an empty response array is a conflict, not a success", () => {
  assert.equal(interpretCasResponse(true, [], 3).status, "conflict");
  assert.equal(interpretCasResponse(true, [{ key: KEY }], 3).status, "ok");
  assert.equal(interpretCasResponse(false, null, 3).status, "failed");
});

test("shouldBootstrap only for a row that was never versioned", () => {
  assert.equal(shouldBootstrap(null), true);
  assert.equal(shouldBootstrap(0), false);
  assert.equal(shouldBootstrap(12), false);
});

// ---------------------------------------------------------------------------
// THE regression: concurrent writers must not lose each other's edits
// ---------------------------------------------------------------------------

test("two isolates writing different fields both survive", () => {
  const db = fakeDb(seedStore());
  const a = isolate("A", db);
  const b = isolate("B", db); // same version — a genuine race

  const outcomeA = mutate(a, db, (s) => {
    (s["testimonials"] as unknown[]).push({ id: "from-a" });
  });
  const outcomeB = mutate(b, db, (s) => {
    (s["reviews"] as unknown[]).push({ id: "from-b" });
  });

  assert.equal(outcomeA, "written");
  assert.equal(outcomeB, "written", "the loser must retry, not give up");

  const final = splitVersion<Record<string, unknown>>(db.rows.get(KEY)?.value);
  // The regression this guards: B's write used to land first and A's retry
  // used to be dropped, losing one of the two edits entirely.
  assert.deepEqual(final?.store["testimonials"], [{ id: "from-a" }]);
  assert.deepEqual(final?.store["reviews"], [{ id: "from-b" }]);
});

test("a stale isolate cannot overwrite a newer document", () => {
  const db = fakeDb(seedStore());
  const stale = isolate("stale", db); // reads version 1

  // A fresh isolate commits first, moving the document to version 2.
  const fresh = isolate("fresh", db);
  assert.equal(
    mutate(fresh, db, (s) => {
      (s["reviews"] as unknown[]).push({ id: "newer" });
    }),
    "written",
  );

  // The stale isolate now tries to write its old snapshot.
  const outcome = writeFrom(stale, db);
  assert.equal(outcome, "conflict", "a stale write must be rejected, not applied");

  const final = splitVersion<Record<string, unknown>>(db.rows.get(KEY)?.value);
  assert.equal(final?.version, 2, "version must not move for a rejected write");
  assert.deepEqual(
    final?.store["reviews"],
    [{ id: "newer" }],
    "the newer document must be untouched",
  );
});

test("an unknown version forces a re-read instead of a blind overwrite", () => {
  const db = fakeDb(seedStore());
  const orphan = isolate("orphan", db);
  // Simulates a snapshot adopted from the KV fallback: real data, no version.
  orphan.version = null;

  // Somebody else commits while the orphan is holding its stale copy.
  const fresh = isolate("fresh", db);
  mutate(fresh, db, (s) => {
    (s["reviews"] as unknown[]).push({ id: "committed" });
  });

  // This is exactly why production must re-read before writing: an unversioned
  // snapshot can only be written unconditionally, which would discard the
  // commit above. `shouldBootstrap` marks that write as the bootstrap case.
  assert.equal(shouldBootstrap(orphan.version), true);

  // Re-reading (what mutate() does on every conflict/unknown version) pulls
  // in both the newer data and its version, so the write becomes an ordinary
  // conditional one and nothing is lost.
  revalidate(orphan, db);
  assert.equal(orphan.version, 2, "the re-read must recover the current version");
  const outcome = mutate(orphan, db, (s) => {
    (s["testimonials"] as unknown[]).push({ id: "orphan" });
  });
  assert.equal(outcome, "written");

  const final = splitVersion<Record<string, unknown>>(db.rows.get(KEY)?.value);
  assert.deepEqual(final?.store["reviews"], [{ id: "committed" }], "the commit survives");
  assert.deepEqual(final?.store["testimonials"], [{ id: "orphan" }]);
});

test("a conflict retries and re-applies onto the winner's data", () => {
  const db = fakeDb(seedStore());
  const a = isolate("A", db);
  const b = isolate("B", db);

  // B commits first.
  mutate(b, db, (s) => {
    (s["reviews"] as unknown[]).push({ id: "b" });
  });

  // A is still on version 1 and must not drop its own edit.
  const outcome = mutate(a, db, (s) => {
    (s["testimonials"] as unknown[]).push({ id: "a" });
  });

  assert.equal(outcome, "written");
  assert.ok(a.reads > 1, "a conflict must trigger a re-read");

  const final = splitVersion<Record<string, unknown>>(db.rows.get(KEY)?.value);
  assert.deepEqual(final?.store["reviews"], [{ id: "b" }]);
  assert.deepEqual(final?.store["testimonials"], [{ id: "a" }]);
  assert.equal(final?.version, 3, "each successful write bumps the version once");
});

test("three concurrent writers all land", () => {
  const db = fakeDb(seedStore());
  const isolates = [isolate("A", db), isolate("B", db), isolate("C", db)];
  const outcomes = isolates.map((iso, i) =>
    mutate(iso, db, (s) => {
      (s["reviews"] as unknown[]).push({ id: `w${i}` });
    }),
  );
  assert.deepEqual(outcomes, ["written", "written", "written"]);

  const final = splitVersion<Record<string, unknown>>(db.rows.get(KEY)?.value);
  const ids = (final?.store["reviews"] as Array<{ id: string }>).map((r) => r.id).sort();
  assert.deepEqual(ids, ["w0", "w1", "w2"], "no writer may be dropped");
  assert.equal(final?.version, 4);
});

test("every accepted write is versioned — no blind overwrites of live rows", () => {
  const db = fakeDb(seedStore());
  const a = isolate("A", db);
  const b = isolate("B", db);
  mutate(a, db, (s) => {
    (s["reviews"] as unknown[]).push({ id: "a" });
  });
  mutate(b, db, (s) => {
    (s["reviews"] as unknown[]).push({ id: "b" });
  });

  assert.equal(a.blindWrites, 0);
  assert.equal(b.blindWrites, 0);
  for (const write of db.writes) {
    assert.notEqual(write.expected, null, "a versioned row must never be written unconditionally");
  }
});

test("bootstrapping a legacy row stamps version 1 and then locks", () => {
  // A row written before optimistic locking existed: no version field at all.
  const db = fakeDb({ ...seedStore(), version: undefined });
  const legacy = isolate("legacy", db);
  assert.equal(legacy.version, null);

  assert.equal(
    mutate(legacy, db, (s) => {
      (s["reviews"] as unknown[]).push({ id: "first" });
    }),
    "written",
  );
  const after = splitVersion<Record<string, unknown>>(db.rows.get(KEY)?.value);
  assert.equal(after?.version, 1, "bootstrap must establish a version");

  // From here on it behaves like any versioned row.
  const peer = isolate("peer", db);
  mutate(peer, db, (s) => {
    (s["reviews"] as unknown[]).push({ id: "second" });
  });
  const stale = isolate("stale", db);
  stale.version = 1;
  assert.equal(writeFrom(stale, db), "conflict");
});

// ---------------------------------------------------------------------------
// Duplicate detection and richest-value merging
// ---------------------------------------------------------------------------

test("isPlaceholderTitle recognizes only the bot's fallback naming", () => {
  assert.equal(isPlaceholderTitle("Roblox game 131306380730931"), true);
  assert.equal(isPlaceholderTitle("Engineria: Project X"), false);
  assert.equal(isPlaceholderTitle(""), false);
  assert.equal(isPlaceholderTitle(undefined), false);
});

test("a real title beats a placeholder regardless of argument order", () => {
  assert.equal(pickText("Roblox game 123", "Engineria: Project X"), "Engineria: Project X");
  assert.equal(pickText("Engineria: Project X", "Roblox game 123"), "Engineria: Project X");
});

test("pickText keeps whichever side has content when the other is empty", () => {
  assert.equal(pickText("Real Title", ""), "Real Title");
  assert.equal(pickText("", "Real Title"), "Real Title");
  assert.equal(pickText("", ""), "");
});

test("pickImage prefers curated repo assets over Roblox CDN images", () => {
  assert.equal(pickImage("https://t3.rbxcdn.com/x.png", "/assets/local.png"), "/assets/local.png");
  assert.equal(pickImage("/assets/local.png", "https://t3.rbxcdn.com/x.png"), "/assets/local.png");
  assert.equal(pickImage(undefined, "https://t3.rbxcdn.com/x.png"), "https://t3.rbxcdn.com/x.png");
});

test("pickTags unions case-insensitively without duplicates", () => {
  assert.deepEqual(pickTags(["Bug Reports", "QA"], ["qa", "Gameplay"]), [
    "Bug Reports",
    "QA",
    "Gameplay",
  ]);
  assert.deepEqual(pickTags(undefined, ["Solo"]), ["Solo"]);
});

test("findDuplicateGroups groups entries by Roblox place, ignoring others", () => {
  const groups = findDuplicateGroups([
    { slug: "engineria-project-x", href: "https://www.roblox.com/games/131306380730931/Engineria" },
    { slug: "roblox-game-131306380730931", href: "https://www.roblox.com/games/131306380730931" },
    { slug: "solo", href: "https://www.roblox.com/games/999/Other" },
    { slug: "discord", href: "https://discord.gg/abc" },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.placeId, "131306380730931");
  assert.equal(groups[0]?.works.length, 2);
});

test("preferredSurvivor keeps the curated entry over the bot placeholder", () => {
  // Mirrors the real duplicate: a rich catalog entry vs a bare bot stub.
  const curated = {
    slug: "engineria-project-x",
    title: "Engineria: Project X",
    description: "QA testing for a sci-fi engineering Roblox game.",
    image: "/assets/engineria-project-x.png",
    tags: ["Bug Reports"],
    popularity: 9,
  };
  const stub = {
    slug: "roblox-game-131306380730931",
    title: "Roblox game 131306380730931",
    description: "",
    tags: [],
  };
  assert.equal(preferredSurvivor([stub, curated]).slug, "engineria-project-x");
  assert.equal(preferredSurvivor([curated, stub]).slug, "engineria-project-x");
});

test("mergeWorks keeps the richest value of every field", () => {
  const keep = {
    slug: "engineria-project-x",
    id: "work-1",
    title: "Engineria: Project X",
    description: "Short.",
    image: "/assets/local.png",
    tags: ["Bug Reports"],
    featured: false,
    popularity: 9,
    sortOrder: 170,
  };
  const drop = {
    slug: "roblox-game-131306380730931",
    id: "uuid-2",
    title: "Roblox game 131306380730931",
    description: "A much longer description written by the bot from Roblox metadata.",
    image: "https://t3.rbxcdn.com/cdn.png",
    tags: ["Gameplay Testing", "bug reports"],
    featured: true,
    popularity: 4,
    sortOrder: 360,
  };
  const merged = mergeWorks(keep, drop);
  assert.equal(merged.title, "Engineria: Project X", "placeholder must not win");
  assert.equal(merged.description, drop.description, "longer description wins");
  assert.equal(merged.image, "/assets/local.png", "curated asset wins");
  assert.deepEqual(merged.tags, ["Bug Reports", "Gameplay Testing"], "tags union");
  assert.equal(merged.featured, true, "featured is sticky");
  assert.equal(merged.popularity, 9, "highest popularity wins");
  assert.equal(merged.sortOrder, 170, "earliest position wins");
  assert.equal(merged.slug, "engineria-project-x", "survivor keeps its slug so links stay valid");
  assert.equal(merged.id, "work-1", "survivor keeps its id");
});

test("merging never unpublishes a live entry", () => {
  const published: Record<string, unknown> = { slug: "a", title: "A", status: "published" };
  const draft: Record<string, unknown> = { slug: "b", title: "Roblox game 1", status: "draft" };
  const legacy: Record<string, unknown> = { slug: "a", title: "A" };
  assert.equal(mergeWorks(published, draft)["status"], "published", "draft folded in stays live");
  assert.equal(
    mergeWorks(draft, published)["status"],
    "published",
    "live entry folded in stays live",
  );
  assert.equal(
    mergeWorks(legacy, draft)["status"],
    "published",
    "legacy row (no status) is live and stays live",
  );
  assert.equal(
    mergeWorks({ ...legacy, status: "draft" }, draft)["status"],
    "draft",
    "two drafts stay a draft",
  );
  assert.equal(
    mergeWorks(legacy, { ...legacy, slug: "c" })["status"],
    undefined,
    "two legacy rows need no status written",
  );
});

test("mergeWorks never mutates its inputs", () => {
  const keep = { slug: "a", title: "A", tags: ["x"] };
  const drop = { slug: "b", title: "B", tags: ["y"] };
  mergeWorks(keep, drop);
  assert.deepEqual(keep.tags, ["x"]);
  assert.deepEqual(drop.tags, ["y"]);
});

test("diffWorks reports only fields that would change on the survivor", () => {
  const keep = { slug: "a", title: "Real", description: "", tags: [] };
  const drop = { slug: "b", title: "Roblox game 1", description: "From Roblox.", tags: [] };
  const diff = diffWorks(keep, drop);
  // Only `description` changes: the survivor already has the better title, and
  // the dropped entry's title is a placeholder that must not be reported as a
  // change to a field that stays exactly as it is.
  assert.deepEqual(
    diff.map((d) => d.field),
    ["description"],
  );
  assert.equal(diff[0]?.kept, "From Roblox.");
  assert.equal(diff[0]?.dropped, "");
});

test("diffWorks surfaces a placeholder title being upgraded", () => {
  const keep = { slug: "a", title: "Roblox game 1", description: "Has text." };
  const drop = { slug: "b", title: "Engineria: Project X", description: "Has text." };
  const diff = diffWorks(keep, drop);
  assert.deepEqual(
    diff.map((d) => d.field),
    ["title"],
  );
  assert.equal(diff[0]?.kept, "Engineria: Project X");
});

test("needsBackfill flags stubs the bot left behind", () => {
  assert.deepEqual(needsBackfill({ title: "Roblox game 123", description: "", image: "" }), {
    title: true,
    description: true,
    image: true,
  });
  assert.deepEqual(
    needsBackfill({ title: "Real Game", description: "Text.", image: "/assets/x.png" }),
    { title: false, description: false, image: false },
  );
});
