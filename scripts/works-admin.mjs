// Maintenance CLI for the portfolio store (Supabase + KV mirror).
//
// The Worker is the only supported writer, but occasionally an entry needs
// fixing outside the admin panel (a bot-created placeholder, a duplicate, a
// missing image). This script edits the same document with the same
// optimistic-locking discipline the Worker uses: read the `version` embedded
// in the JSON document, PATCH only while the row is still at that version
// (`&value->>version=eq.N`), and on conflict re-read the winner and re-apply.
// A bare upsert is never used — that is how an edit gets silently reverted.
//
//   node scripts/works-admin.mjs enrich <slug>        fill empty fields from Roblox
//   node scripts/works-admin.mjs remove <slug>        delete an entry
//   node scripts/works-admin.mjs list [filter]        show slugs + titles
//   node scripts/works-admin.mjs find-dupes          same Roblox placeId, >1 entry
//
// `enrich` targets one entry by slug and only replaces placeholder values, so
// curated text is never overwritten. Credentials come from .env.local/.env.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
// The merge/duplicate rules live in src/lib/store-cas.ts so the CLI and the
// unit tests exercise exactly the same code. Node strips the types natively.
import {
  diffWorks,
  findDuplicateGroups,
  isPlaceholderTitle,
  mergeWorks,
  needsBackfill,
  preferredSurvivor,
} from "../src/lib/store-cas.ts";

for (const f of [".env.local", ".env"]) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Roblox game links look like https://www.roblox.com/games/<placeId>/<slug>. */
const PLACE_ID_RE = /roblox\.com\/games\/(\d+)/i;

/** The placeId of a work's Roblox link, or undefined for non-Roblox entries. */
function placeIdOf(work) {
  return String(work.href ?? "").match(PLACE_ID_RE)?.[1];
}

/** Keeps one-line diffs readable when a field holds a long description. */
function truncate(value, max = 60) {
  const text = String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const argv = process.argv.slice(2);
const command = argv[0];
const positional = argv.slice(1).filter((a) => !a.startsWith("--"));
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const arg = positional[0];
const arg2 = positional[1];
// Destructive commands show what they would do and change nothing until
// --apply, so a mistyped slug can't quietly damage real entries.
const apply = flags.has("--apply");
const DRY = !apply;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env.local");
  process.exit(1);
}

/** Reads the store row and splits the embedded locking version off it. */
async function readStore() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.zyn-store-v1&select=value`, {
    headers,
  });
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]?.value) {
    console.error("✗ Store row not found", JSON.stringify(rows).slice(0, 200));
    process.exit(1);
  }
  const store = rows[0].value;
  return { store, version: typeof store.version === "number" ? store.version : null };
}

/** CAS write with retry: patch the document, re-applying on every conflict. */
async function casWrite(patch) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { store, version } = await readStore();
    if (!patch(store)) {
      console.log("✓ Nothing to change");
      return;
    }
    const body = JSON.stringify({
      value: { ...store, version: (version ?? 0) + 1 },
    });
    if (version === null) {
      // Row predates optimistic locking: stamp version 1 from data that was
      // just read, so every later write (including the Worker's) is a CAS.
      const put = await fetch(`${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.zyn-store-v1`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ key: "zyn-store-v1", value: { ...store, version: 1 } }),
      });
      console.log(
        put.ok ? "✓ Supabase updated (bootstrapped version 1)" : `✗ write failed (${put.status})`,
      );
      if (put.ok) await mirrorToKv();
      return;
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.zyn-store-v1&value->>version=eq.${version}`,
      { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body },
    );
    const patched = await res.json().catch(() => []);
    if (res.ok && Array.isArray(patched) && patched.length > 0) {
      console.log(`✓ Supabase updated (CAS, now version ${version + 1})`);
      await mirrorToKv();
      return;
    }
    console.log(`↻ conflict (attempt ${attempt + 1}) — re-reading winner…`);
  }
  console.error("✗ Gave up after repeated conflicts — re-run the command");
  process.exit(1);
}

/** Keeps Cloudflare KV in step so the fallback copy can't drift. */
async function mirrorToKv() {
  const rows = await (
    await fetch(`${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.zyn-store-v1&select=value`, { headers })
  ).json();
  const tmp = "data/kv-sync-temp.json";
  try {
    writeFileSync(tmp, JSON.stringify(rows[0].value));
    execFileSync(
      "npx",
      [
        "wrangler",
        "kv",
        "key",
        "put",
        "--binding=STORE",
        "zyn-store-v1",
        "--remote",
        "--path",
        tmp,
      ],
      { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" },
    );
    console.log("✓ KV mirror updated");
  } catch (e) {
    console.log("⚠️ KV update failed (site self-corrects on next store save):", e.message);
  } finally {
    rmSync(tmp, { force: true });
  }
}

/** Roblox placeId → universeId, or null when the place can't be resolved. */
async function fetchRobloxMeta(placeId) {
  const uni = await (
    await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`)
  )
    .json()
    .catch(() => null);
  const universeId = uni?.universeId;
  if (!universeId) return null;
  const games = await (
    await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`)
  )
    .json()
    .catch(() => null);
  const game = games?.data?.[0];
  if (!game?.name) return null;
  const icon = await (
    await fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`,
    )
  )
    .json()
    .catch(() => null);
  return {
    title: game.name.trim(),
    description: [
      (game.description ?? "").trim(),
      game.creator?.name ? `by ${game.creator.name}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    image: icon?.data?.[0]?.imageUrl ?? null,
    universeId,
  };
}

switch (command) {
  case "list": {
    const { store } = await readStore();
    const needle = (arg ?? "").toLowerCase();
    for (const w of store.works) {
      if (needle && !`${w.slug} ${w.title}`.toLowerCase().includes(needle)) continue;
      console.log(`${w.slug.padEnd(38)} ${JSON.stringify(w.title)}`);
    }
    console.log(`\n${store.works.length} works`);
    break;
  }
  case "find-dupes": {
    const { store } = await readStore();
    const groups = findDuplicateGroups(store.works);
    if (groups.length === 0) {
      console.log("✓ No duplicate Roblox games");
      break;
    }
    for (const group of groups) {
      console.log(`
place ${group.placeId}:`);
      // The survivor is the more complete entry (curated one usually wins).
      const survivor = preferredSurvivor(group.works);
      for (const w of group.works) {
        const marker = w.slug === survivor.slug ? "  keep  " : "  drop  ";
        console.log(`${marker}${w.slug.padEnd(38)} ${JSON.stringify(w.title)}`);
      }
      const others = group.works.filter((w) => w.slug !== survivor.slug);
      const dropList = others.map((w) => w.slug).join(" ");
      console.log(`  merge with: node scripts/works-admin.mjs merge ${survivor.slug} ${dropList}`);
    }
    console.log(`
${groups.length} duplicate group(s) found.`);
    break;
  }
  case "merge": {
    if (!arg || !arg2) {
      console.error("✗ usage: node scripts/works-admin.mjs merge <keepSlug> <dropSlug> [--apply]");
      process.exit(1);
    }
    const { store } = await readStore();
    const keep = store.works.find((w) => w.slug === arg);
    const drop = store.works.find((w) => w.slug === arg2);
    if (!keep) {
      console.error(`✗ No entry with slug "${arg}" (the one to keep)`);
      process.exit(1);
    }
    if (!drop) {
      console.error(`✗ No entry with slug "${arg2}" (the one to fold in)`);
      process.exit(1);
    }
    if (keep.slug === drop.slug) {
      console.error("✗ Both slugs are the same entry");
      process.exit(1);
    }

    const merged = mergeWorks(keep, drop);
    const changes = diffWorks(keep, drop);
    console.log(`Keeping  ${keep.slug}  ${JSON.stringify(keep.title)}`);
    console.log(`Folding  ${drop.slug}  ${JSON.stringify(drop.title)}`);
    if (changes.length === 0) {
      console.log("\n✓ Nothing to merge — the kept entry already has the best of both");
    } else {
      console.log("\nField changes on the surviving entry:");
      for (const change of changes) {
        const before = JSON.stringify(change.dropped);
        const after = JSON.stringify(change.kept);
        console.log(`  ${change.field.padEnd(12)} ${truncate(before)} → ${truncate(after)}`);
      }
    }

    if (DRY) {
      console.log(
        "\nDry run — nothing written. Re-run with --apply to merge." +
          ` The dropped page /work/${drop.slug} would stop resolving.`,
      );
      break;
    }

    await casWrite((s2) => {
      const index = s2.works.findIndex((w) => w.slug === keep.slug);
      if (index < 0) return false;
      s2.works[index] = merged;
      s2.works = s2.works.filter((w) => w.slug !== drop.slug);
      console.log(`✓ Merged ${drop.slug} into ${keep.slug} (${s2.works.length} works)`);
      return true;
    });
    break;
  }
  case "remove": {
    if (!arg) {
      console.error("✗ usage: node scripts/works-admin.mjs remove <slug>");
      process.exit(1);
    }
    await casWrite((store) => {
      const before = store.works.length;
      store.works = store.works.filter((w) => w.slug !== arg);
      if (store.works.length === before) {
        console.log(`✓ No entry with slug "${arg}"`);
        return false;
      }
      console.log(`✓ Removed "${arg}" (${before} → ${store.works.length} works)`);
      return true;
    });
    break;
  }
  case "enrich": {
    if (!arg) {
      console.error("✗ usage: node scripts/works-admin.mjs enrich <slug>");
      process.exit(1);
    }
    const { store } = await readStore();
    const work = store.works.find((w) => w.slug === arg);
    if (!work) {
      console.error(`✗ No entry with slug "${arg}"`);
      process.exit(1);
    }
    const placeId = String(work.href ?? "").match(/roblox\.com\/games\/(\d+)/i)?.[1];
    if (!placeId) {
      console.error(`✗ "${arg}" is not a Roblox game link — nothing to fetch`);
      process.exit(1);
    }
    const meta = await fetchRobloxMeta(placeId);
    if (!meta) {
      console.error(`✗ Roblox metadata unavailable for place ${placeId}`);
      process.exit(1);
    }
    console.log(`Fetched: "${meta.title}" | icon: ${meta.image ? "yes" : "no"}`);
    await casWrite((s) => {
      const target = s.works.find((w) => w.slug === arg);
      if (!target) return false;
      let changed = false;
      // Only placeholder/empty values are replaced — curated text is kept.
      if (!target.title || /^Roblox game \d+$/.test(target.title)) {
        target.title = meta.title;
        changed = true;
      }
      if (!target.description && meta.description) {
        target.description = meta.description;
        changed = true;
      }
      if (!target.image && meta.image) {
        target.image = meta.image;
        changed = true;
      }
      if (!s.universeIds?.[placeId] && meta.universeId) {
        s.universeIds = { ...(s.universeIds ?? {}), [placeId]: meta.universeId };
        changed = true;
      }
      return changed;
    });
    break;
  }
  case "backfill": {
    // Fills in entries the bot left half-finished: a "Roblox game <id>"
    // placeholder title, a missing icon, or an empty description. Only empty
    // or placeholder fields are touched, so curated copy is never replaced.
    const { store } = await readStore();
    const targets = store.works
      .map((w) => ({ work: w, needs: needsBackfill(w) }))
      .filter(({ work, needs }) => {
        const interesting = needs.title || needs.description || needs.image;
        if (!interesting) return false;
        // Only Roblox games can be backfilled from the public APIs.
        return PLACE_ID_RE.test(String(work.href ?? ""));
      });

    if (targets.length === 0) {
      console.log("✓ Nothing to backfill — every Roblox entry has a title, image and description");
      break;
    }

    // Resolve place -> universe in one batch: per-game lookups get
    // rate-limited, and one request for many ids does not.
    const placeIds = targets.map(({ work }) => placeIdOf(work));
    const universeByPlace = new Map();
    for (const placeId of placeIds) {
      if (!placeId) continue;
      if (store.universeIds?.[placeId]) {
        universeByPlace.set(placeId, store.universeIds[placeId]);
        continue;
      }
      const uni = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (uni?.universeId) universeByPlace.set(placeId, uni.universeId);
      await sleep(150); // stay well clear of the rate limit
    }

    const universeIds = [...new Set(universeByPlace.values())];
    const gamesById = new Map();
    const iconsById = new Map();
    if (universeIds.length > 0) {
      const list = universeIds.join(",");
      const games = await fetch(`https://games.roblox.com/v1/games?universeIds=${list}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      for (const g of games?.data ?? []) gamesById.set(g.universeId, g);
      const icons = await fetch(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${list}&size=512x512&format=Png&isCircular=false`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      for (const i of icons?.data ?? []) iconsById.set(i.universeId, i.imageUrl);
    }

    // Plan every change first, so one CAS write settles the whole batch.
    const plan = [];
    for (const { work, needs } of targets) {
      const placeId = placeIdOf(work);
      const universeId = placeId ? universeByPlace.get(placeId) : undefined;
      const game = universeId ? gamesById.get(universeId) : null;
      const icon = universeId ? iconsById.get(universeId) : null;
      const changes = [];
      if (needs.title && game?.name) changes.push(["title", work.title, game.name.trim()]);
      if (needs.description && game) {
        const description = [
          (game.description ?? "").trim(),
          game.creator?.name ? `by ${game.creator.name}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        if (description) changes.push(["description", work.description ?? "", description]);
      }
      if (needs.image && icon) changes.push(["image", work.image ?? "", icon]);
      if (changes.length > 0) plan.push({ slug: work.slug, placeId, universeId, changes });
    }

    if (plan.length === 0) {
      console.log("⚠️  Nothing backfillable — Roblox returned no metadata for these places");
      for (const { work } of targets) console.log(`   ${work.slug}`);
      break;
    }

    for (const item of plan) {
      console.log(`
${item.slug}`);
      for (const [field, before, after] of item.changes) {
        console.log(
          `  ${field.padEnd(12)} ${truncate(JSON.stringify(before))} → ${truncate(JSON.stringify(after))}`,
        );
      }
    }

    if (DRY) {
      console.log(`
Dry run — nothing written. Re-run with --apply to backfill ${plan.length} entr${plan.length === 1 ? "y" : "ies"}.`);
      break;
    }

    await casWrite((s2) => {
      let changed = 0;
      for (const item of plan) {
        const target = s2.works.find((w) => w.slug === item.slug);
        if (!target) continue;
        for (const [field, , after] of item.changes) target[field] = after;
        if (item.universeId) {
          s2.universeIds = { ...(s2.universeIds ?? {}), [item.placeId]: item.universeId };
        }
        changed++;
      }
      console.log(`✓ Backfilled ${changed} entr${changed === 1 ? "y" : "ies"}`);
      return changed > 0;
    });
    break;
  }
  default:
    console.error(
      "usage:\n" +
        "  node scripts/works-admin.mjs list [filter]\n" +
        "  node scripts/works-admin.mjs find-dupes\n" +
        "  node scripts/works-admin.mjs merge <keepSlug> <dropSlug> [--apply]\n" +
        "  node scripts/works-admin.mjs backfill [--apply]\n" +
        "  node scripts/works-admin.mjs enrich <slug>\n" +
        "  node scripts/works-admin.mjs remove <slug>\n" +
        "\n" +
        "merge and backfill are dry runs unless --apply is passed.",
    );
    process.exit(1);
}
