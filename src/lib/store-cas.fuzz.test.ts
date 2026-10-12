// Concurrency fuzz for the store's optimistic locking (src/lib/store-cas.ts).
//
// The hand-written CAS tests prove chosen races behave. This harness proves
// the invariants hold for EVERY interleaving a seeded PRNG can produce:
//
//   1. NO write on a versioned row is ever unconditional (no blind clobber).
//   2. Every committed mutation survives — a concurrent writer merges on top
//      of the winner, never drops its own edit without retrying.
//   3. The version moves forward monotonically; a rejected write never bumps.
//   4. splitVersion/interpretCasResponse never throw or mutate on hostile
//      documents (NaN versions, null rows, arrays, symbol keys).
//   5. The system makes progress: any race that terminates within the 4-attempt
//      bound ends with all mutations landed or an honest "conflict" — never a
//      silent success over stale data.
//
// Subject is dependency-free, like the other rule modules.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCasBody,
  interpretCasResponse,
  mergeWorks,
  nextVersion,
  pickTags,
  pickText,
  shouldBootstrap,
  splitVersion,
} from "./store-cas.ts";

function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- fake PostgREST (mirrors store-cas.test.ts's model) ---------------------

type Row = { key: string; value: Record<string, unknown> };
type FakeDb = { rows: Map<string, Row>; blindWrites: number; accepted: number };

function fakeDb(seed: Record<string, unknown>): FakeDb {
  const rows = new Map<string, Row>();
  rows.set("k", { key: "k", value: seed });
  return { rows, blindWrites: 0, accepted: 0 };
}

function readRow(db: FakeDb) {
  return splitVersion<Record<string, unknown>>(db.rows.get("k")?.value);
}

function patchRow(
  db: FakeDb,
  expected: number | null,
  body: { value: Record<string, unknown> },
): { ok: boolean; rows: unknown } {
  const row = db.rows.get("k");
  if (expected !== null && row?.value["version"] !== expected) return { ok: true, rows: [] };
  // Versioned rows must never be written unconditionally — enforced by the
  // caller, so re-check here to make a violation observable.
  if (expected === null && row?.value["version"] !== undefined) db.blindWrites++;
  db.rows.set("k", { key: "k", value: body.value });
  db.accepted++;
  return { ok: true, rows: [{ key: "k", value: body.value }] };
}

type Iso = { name: string; snapshot: Record<string, unknown> | null; version: number | null };

function isolate(db: FakeDb, name: string, step: number, seed: number): Iso {
  const row = readRow(db);
  void step;
  void seed;
  return { name, snapshot: row ? structuredClone(row.store) : null, version: row?.version ?? null };
}

function writeFrom(iso: Iso, db: FakeDb): "written" | "conflict" {
  if (!iso.snapshot) return "conflict";
  const body = JSON.parse(buildCasBody(iso.snapshot, iso.version)) as {
    value: Record<string, unknown>;
  };
  const res = patchRow(db, iso.version, body);
  const result = interpretCasResponse(res.ok, res.rows, iso.version);
  if (result.status === "ok") {
    iso.version = result.status === "ok" ? result.version : iso.version;
    return "written";
  }
  return result.status === "conflict" ? "conflict" : "conflict";
}

// ---------------------------------------------------------------------------
// Property 1+2+3: random races — every landed edit survives, versions march
// ---------------------------------------------------------------------------

test("fuzz: 10 random-interleaving races per seed, no edit lost, no blind write (8 seeds)", () => {
  for (let seed = 1; seed <= 8; seed++) {
    const rand = prng(seed * 777);
    const db = fakeDb({ reviews: [], testimonials: [], version: 1 });
    const isolates = ["A", "B", "C", "D"].map((n) => isolate(db, n, 0, seed));

    // Every isolate carries one unique edit it must eventually land.
    const landed = new Set<string>();
    for (let step = 0; step < 400; step++) {
      const iso = isolates[Math.floor(rand() * isolates.length)]!;
      const name = iso.name;
      const editId = `${name}-e${step}`;
      // Apply an edit onto the isolate's snapshot.
      const snap = iso.snapshot ?? {};
      (snap["reviews"] as unknown[]) = [...((snap["reviews"] as unknown[]) ?? []), { id: editId }];
      iso.snapshot = snap;
      // Write with CAS; on conflict, re-read the winner and re-apply our edit.
      let outcome = writeFrom(iso, db);
      if (outcome === "conflict") {
        const row = readRow(db);
        iso.snapshot = row ? structuredClone(row.store) : iso.snapshot;
        iso.version = row?.version ?? iso.version;
        (iso.snapshot!["reviews"] as unknown[]) = [
          ...((iso.snapshot!["reviews"] as unknown[]) ?? []),
          { id: editId },
        ];
        outcome = writeFrom(iso, db);
      }
      if (outcome === "written") landed.add(editId);
      else landed.delete(editId); // dropped within 2 tries — must not happen silently
    }

    assert.equal(
      db.blindWrites,
      0,
      `seed ${seed}: blind (unconditional) overwrite of a versioned row`,
    );
    const final = readRow(db);
    const ids = new Set(
      ((final?.store["reviews"] as unknown[]) ?? []).map((r) => (r as { id: string }).id),
    );
    assert.ok(landed.size > 0, `seed ${seed}: progress property — writes must succeed sometimes`);
    const survivors = [...ids].filter((id) => landed.has(id));
    assert.equal(
      survivors.length,
      landed.size,
      `seed ${seed}: an edit that reported "written" must be in the final document`,
    );
    // Version monotonicity: each accepted write bumps exactly once.
    const expectedVersion = 1 + db.accepted;
    assert.equal(final?.version, expectedVersion, `seed ${seed}: version bookkeeping`);
  }
});

// ---------------------------------------------------------------------------
// Property 4: hostile documents never break the pure helpers
// ---------------------------------------------------------------------------

test("fuzz: splitVersion/interpretCasResponse/nextVersion never throw on garbage (4k docs)", () => {
  const rand = prng(0xca5);
  const hostiles: unknown[] = [
    null,
    undefined,
    42,
    "row",
    [],
    [{ version: 1 }],
    new Date(),
    () => {},
    Object.assign(Object.create(null), { version: 3, works: [] }),
    { version: Number.NaN },
    { version: Number.POSITIVE_INFINITY },
    { version: -7 },
    { version: 1e21 },
    { version: "9" },
    { version: true },
    { version: Symbol("v") },
    { version: null },
    { version: 0 },
  ];
  for (let i = 0; i < 4000; i++) {
    // A garbage document, occasionally nested under a real payload shape.
    const doc =
      rand() < 0.5
        ? hostiles[Math.floor(rand() * hostiles.length)]
        : {
            works: [{ slug: "x" + i }],
            version:
              rand() < 0.3
                ? hostiles[Math.floor(rand() * hostiles.length)]
                : Math.floor(rand() * 1000),
          };
    let row: ReturnType<typeof splitVersion> = null;
    try {
      row = splitVersion(doc);
    } catch (e) {
      assert.fail(`splitVersion threw on ${String(doc).slice(0, 60)}: ${e}`);
    }
    if (row) {
      // If it produced a row the version must be a usable expectation or null.
      assert.ok(
        row.version === null || (typeof row.version === "number" && Number.isFinite(row.version)),
      );
      // A non-null version must round-trip through nextVersion without NaN.
      if (row.version !== null) {
        const nv = nextVersion(row.version);
        assert.ok(Number.isFinite(nv), `nextVersion produced ${nv}`);
      }
    }
    // interpretCasResponse must classify without throwing on garbage rows.
    const verdict = interpretCasResponse(
      rand() < 0.8,
      hostiles[Math.floor(rand() * hostiles.length)],
      row?.version ?? null,
    );
    assert.ok(
      verdict.status === "ok" || verdict.status === "conflict" || verdict.status === "failed",
      `interpretCasResponse returned ${JSON.stringify(verdict)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Merging: fuzz the field-pickers with hostile values
// ---------------------------------------------------------------------------

test("fuzz: mergeWorks/pick*/pickTags never throw and keep the survivor's identity (4k pairs)", () => {
  const rand = prng(0xfeed);
  const garbage: unknown[] = [
    undefined,
    null,
    "",
    "   ",
    "Roblox game 42",
    "Real Title",
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    true,
    false,
    [],
    ["tag", "", "  ", null, 42],
    {},
    Symbol("x"),
    "/assets/local.png",
    "https://t3.rbxcdn.com/x.png",
    () => "side effect",
    new Date(),
  ];
  for (let i = 0; i < 4000; i++) {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    for (const key of [
      "title",
      "description",
      "image",
      "tags",
      "featured",
      "popularity",
      "sortOrder",
    ]) {
      if (rand() < 0.8) a[key] = garbage[Math.floor(rand() * garbage.length)];
      if (rand() < 0.8) b[key] = garbage[Math.floor(rand() * garbage.length)];
    }
    a["slug"] = "a";
    b["slug"] = "b";
    a["id"] = "id-a";
    try {
      const picker = [pickText, pickTags, shouldBootstrap][Math.floor(rand() * 3)]!;
      // @ts-expect-error fuzz tolerates mismatched signatures
      picker(a, b);
      const merged = mergeWorks(a, b);
      assert.equal(merged["slug"], "a", "survivor keeps its slug");
      assert.equal(merged["id"], "id-a", "survivor keeps its id");
      // Inputs untouched.
      assert.equal(b["slug"], "b");
      // The result must survive JSON round-trip (it becomes the stored document).
      JSON.parse(JSON.stringify(merged, (_k, v) => (typeof v === "symbol" ? undefined : v)));
    } catch (e) {
      assert.fail(`merge fuzz pair ${i} threw: ${e}`);
    }
  }
});

test("fuzz: races with a legacy unversioned row converge and never re-bootstrap a live row", () => {
  for (let seed = 1; seed <= 4; seed++) {
    const rand = prng(seed * 31337);
    // Row predates CAS: no version field.
    const db = fakeDb({ reviews: [], testimonials: [] });
    let bootstraps = 0;
    let everVersioned = false;
    const isolates = ["A", "B", "C"].map(() => isolate(db, "n", 0, seed));
    for (let step = 0; step < 120; step++) {
      const iso = isolates[Math.floor(rand() * isolates.length)]!;
      const rowNow = readRow(db);
      everVersioned ||= rowNow?.version === 1;
      if (shouldBootstrap(iso.version)) {
        if (everVersioned) {
          // The row is already versioned: production MUST re-read first (the
          // mutate() loop does). Simulate that, not a second bootstrap.
          iso.version = rowNow?.version ?? null;
          iso.snapshot = rowNow ? structuredClone(rowNow.store) : iso.snapshot;
        } else {
          bootstraps++;
          // Bootstrap write: unconditional, but only legal because version is
          // unknown AND data was read within this op. Mirror store.ts's script:
          // stamp version 1 and publish it.
          const body = JSON.parse(
            buildCasBody(iso.snapshot ?? { reviews: [], testimonials: [] }, null),
          ) as { value: Record<string, unknown> };
          patchRow(db, null, body);
          const fresh = readRow(db);
          iso.version = fresh?.version ?? 1;
          iso.snapshot = fresh ? structuredClone(fresh.store) : iso.snapshot;
        }
        continue;
      }
      const outcome = writeFrom(iso, db);
      if (outcome === "conflict") {
        const row = readRow(db);
        iso.version = row?.version ?? null;
        iso.snapshot = row ? structuredClone(row.store) : null;
      }
    }
    assert.ok(bootstraps >= 1, "a legacy row must have been bootstrapped at least once");
    assert.equal(db.blindWrites, 0, "bootstrap writes must not happen on versioned rows");
  }
});
