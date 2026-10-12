// Tests for the unattended refresh rules.
//
// This module runs on a cron trigger with nobody watching, so its most
// important property is what it REFUSES to do: never overwrite a curated
// title or a hand-picked image. Roblox's own game name is frequently a worse
// version of the real one ("Engineria Project X" vs the catalog's "Engineria:
// Project X"), so a naive "sync with the source of truth" job would quietly
// degrade the portfolio every night.
//
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { placeIdOf, planRefresh, planWorkRefresh, type RobloxMeta } from "./roblox-refresh.ts";

const meta = (over: Partial<RobloxMeta> = {}): RobloxMeta => ({
  placeId: "131306380730931",
  title: "Engineria Project X",
  description: "A sci-fi engineering game.",
  image: "https://t3.rbxcdn.com/thumb.png",
  universeId: 10054696256,
  ...over,
});

test("placeIdOf reads the id from both URL forms", () => {
  assert.equal(
    placeIdOf("https://www.roblox.com/games/131306380730931/Engineria-Project-X"),
    "131306380730931",
  );
  assert.equal(placeIdOf("https://www.roblox.com/games/131306380730931"), "131306380730931");
  assert.equal(placeIdOf("https://discord.gg/abc"), null);
  assert.equal(placeIdOf(""), null);
  assert.equal(placeIdOf(undefined), null);
});

test("a placeholder title is filled with the real name", () => {
  const { filled, renames } = planWorkRefresh(
    {
      slug: "stub",
      title: "Roblox game 131306380730931",
      href: "https://www.roblox.com/games/131306380730931",
    },
    meta(),
  );
  // A bot-created placeholder has no description and no icon either, so one
  // DM fixes the whole entry.
  const titleFill = filled.find((c) => c.field === "title");
  assert.ok(titleFill, "the placeholder title must be filled");
  assert.equal(titleFill.to, "Engineria Project X");
  assert.deepEqual(
    filled.map((c) => c.field).sort(),
    ["description", "image", "title"],
    "every empty field on a placeholder entry gets filled",
  );
  assert.equal(renames.length, 0);
});

test("a curated title that differs from Roblox is REPORTED, never applied", () => {
  // The real situation: the catalog ships a better name than Roblox's.
  const { filled, renames } = planWorkRefresh(
    {
      slug: "engineria-project-x",
      title: "Engineria: Project X",
      description: "Curated copy.",
      image: "/assets/engineria-project-x.png",
      href: "https://www.roblox.com/games/131306380730931/Engineria-Project-X",
    },
    meta(),
  );
  assert.equal(filled.length, 0, "nothing about a curated entry may be auto-applied");
  const titleRename = renames.find((c) => c.field === "title");
  assert.ok(titleRename, "the rename must still be surfaced for review");
  assert.equal(titleRename.from, "Engineria: Project X");
  assert.equal(titleRename.to, "Engineria Project X");
  assert.ok(
    renames.some((c) => c.field === "image" && c.reason.includes("/assets")),
    "the curated image must be called out too",
  );
});

test("a matching title produces no rename noise", () => {
  const { renames } = planWorkRefresh(
    {
      slug: "g",
      title: "Engineria Project X",
      description: "Has copy.",
      image: "https://t3.rbxcdn.com/thumb.png",
      href: "https://www.roblox.com/games/1",
    },
    meta({ title: "Engineria Project X" }),
  );
  assert.equal(renames.length, 0);
});

test("empty description and image are filled", () => {
  const { filled } = planWorkRefresh(
    { slug: "g", title: "Real Title", description: "", href: "https://www.roblox.com/games/1" },
    meta(),
  );
  const fields = filled.map((c) => c.field).sort();
  assert.deepEqual(fields, ["description", "image"]);
  // The title was already real, so it is untouched.
  assert.equal(
    filled.some((c) => c.field === "title"),
    false,
  );
});

test("a whitespace-only description counts as empty", () => {
  const { filled } = planWorkRefresh(
    { slug: "g", title: "Real", description: "   ", href: "https://www.roblox.com/games/1" },
    meta(),
  );
  assert.ok(filled.some((c) => c.field === "description"));
});

test("curated description is never replaced by Roblox's", () => {
  const { filled } = planWorkRefresh(
    {
      slug: "g",
      title: "Real",
      description: "My own words.",
      href: "https://www.roblox.com/games/1",
    },
    meta(),
  );
  assert.equal(
    filled.some((c) => c.field === "description"),
    false,
  );
});

test("no metadata means no changes at all", () => {
  const { filled, renames } = planWorkRefresh(
    { slug: "g", title: "Roblox game 5", href: "https://www.roblox.com/games/5" },
    null,
  );
  assert.deepEqual(filled, []);
  assert.deepEqual(renames, []);
});

test("planRefresh skips non-Roblox links and counts the rest", () => {
  const works = [
    { slug: "game", title: "Real", href: "https://www.roblox.com/games/1/Game" },
    { slug: "server", title: "Community", href: "https://discord.gg/abc" },
    { slug: "nolink", title: "Manual project" },
  ];
  const metaBySlug = new Map<string, RobloxMeta | null>([["game", meta({ title: "Real" })]]);
  const report = planRefresh(works, metaBySlug);
  assert.equal(report.checked, 1, "only the Roblox game is checked");
  assert.deepEqual(report.unavailable, []);
});

test("planRefresh lists places Roblox could not answer", () => {
  const works = [{ slug: "game", title: "Roblox game 9", href: "https://www.roblox.com/games/9" }];
  const report = planRefresh(works, new Map([["game", null]]));
  assert.equal(report.checked, 1);
  assert.deepEqual(report.unavailable, [{ slug: "game", placeId: "9" }]);
  assert.equal(report.filled.length, 0);
});

test("a completely curated portfolio produces zero writes", () => {
  // The steady state: the nightly job must be a no-op, not a nightly rewrite.
  const works = [
    {
      slug: "a",
      title: "Engineria: Project X",
      description: "Curated.",
      image: "/assets/a.png",
      href: "https://www.roblox.com/games/1",
    },
    {
      slug: "b",
      title: "Bat A Lucky Block",
      description: "Curated.",
      image: "/assets/b.png",
      href: "https://www.roblox.com/games/2",
    },
  ];
  const metaBySlug = new Map<string, RobloxMeta | null>([
    ["a", meta({ title: "Engineria Project X" })],
    ["b", meta({ title: "Bat A Lucky Block", placeId: "2" })],
  ]);
  const report = planRefresh(works, metaBySlug);
  assert.equal(report.filled.length, 0, "nothing may be rewritten on a curated portfolio");
  assert.equal(report.checked, 2);
});
