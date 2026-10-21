// One-shot maintenance import: uploads a curated set of SFX samples into the
// self-hosted store and creates the 8 themed "SFX / Audio" showcase works that
// reference them (`node scripts/sfx-import.mjs [--apply]`).
//
// Uses exactly the same storage shapes the admin panel uses:
//   * uploads  → `upload:<uuid>` rows in Supabase (+ best-effort KV mirror),
//     value shape = UploadedBlob (id/name/mime/size/dataBase64/createdAt)
//   * works    → appended to the `zyn-store-v1` document with optimistic
//     locking on the embedded version (CAS — never a bare upsert)
//   * media    → appended to the same document's `media` array as
//     {id, workId, mediaType:"audio", url:"/uploads/<id>", caption, sortOrder}
//
// Dry-run by default; --apply performs the writes. Re-running is safe: works
// that already exist are skipped and blob upserts are idempotent per key.
//
// Samples come from the user's local SFX.zip (811 files, 8 folders) — only the
// manifest below is imported; every file must be ≤ MAX_UPLOAD_BYTES (~0.9 MB).

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const ZIP_PATH = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Downloads",
  "SFX.zip",
);
const EXTRA_AKS74U = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Downloads",
  "AKS-74U Fire sfx.ogg",
);
const WORK_DIR = path.join(ROOT, ".sfx-import-tmp");

/** The per-upload cap the site enforces (uploads-functions.ts). */
const MAX_UPLOAD_BYTES = 900_000;

/** file: null → the loose AKS-74U download (pinned first on the Weapons pack). */
const PACKS = [
  {
    slug: "sfx-weapons-guns",
    title: "Weapons & Guns SFX",
    role: "SFX Artist",
    description:
      "Original weapons pack — AKS-74U, AK-47, shotgun, sniper, pistol and magnum. Rifle fire, reloads and magazine handling built layered for punchy, game-ready delivery.",
    tags: ["SFX Pack", "Weapons", "6 Samples"],
    popularity: 60,
    samples: [
      { file: null, caption: "AKS-74U — rifle fire" },
      { file: "Weapons_Guns/AK47-RELOAD_6808977427.ogg", caption: "AK-47 — reload" },
      { file: "Weapons_Guns/shotgun_fire3_8429881678.ogg", caption: "Shotgun — fire" },
      { file: "Weapons_Guns/snipershawt_133935959682657.ogg", caption: "Sniper — fire" },
      { file: "Weapons_Guns/pistol_fire2_2757012511.ogg", caption: "Pistol — fire" },
      { file: "Weapons_Guns/Audio_magnum_13749930165.ogg", caption: "Magnum — fire" },
    ],
  },
  {
    slug: "sfx-combat-impacts",
    title: "Combat & Impact SFX",
    role: "SFX Artist",
    description:
      "Combat impact pack — explosions, grenade hits, heavy punches, bone cracks, forcefield hits and axe swings. Layered for satisfying hit feedback in any weapon or melee loop.",
    tags: ["SFX Pack", "Impacts", "6 Samples"],
    popularity: 55,
    samples: [
      { file: "Combat_Impacts/explosion_125963425455297.ogg", caption: "Explosion" },
      { file: "Combat_Impacts/grenade_hit1_70698610794457.ogg", caption: "Grenade hit" },
      { file: "Combat_Impacts/hit_punch_l_8595980577.ogg", caption: "Punch (heavy)" },
      { file: "Combat_Impacts/bone-crack_71356225253454.ogg", caption: "Bone crack" },
      { file: "Combat_Impacts/ForcefieldHit_8844155653.ogg", caption: "Forcefield hit" },
      { file: "Combat_Impacts/AxeHit_126175381632815.ogg", caption: "Axe hit" },
    ],
  },
  {
    slug: "sfx-ui-notifications",
    title: "UI & Notification SFX",
    role: "SFX Artist",
    description:
      "UI and notification pack — button clicks, confirms, errors, money pickups and big-win stingers. Designed to keep menus responsive without getting grating over long sessions.",
    tags: ["SFX Pack", "UI Audio", "5 Samples"],
    popularity: 50,
    samples: [
      {
        file: "UI_Notifications/ui-simple-button-click_88442833509532.ogg",
        caption: "Button click",
      },
      { file: "UI_Notifications/confirm_76817312724578.ogg", caption: "Confirm" },
      { file: "UI_Notifications/error_550209561.ogg", caption: "Error" },
      { file: "UI_Notifications/Collecting-Money_7437419566.ogg", caption: "Money collect" },
      { file: "UI_Notifications/Audio_BIGWINS_17338158649.ogg", caption: "Big win" },
    ],
  },
  {
    slug: "sfx-ambience",
    title: "Ambience & Background SFX",
    role: "SFX Artist",
    description:
      "Ambience pack — room beds, city street loops, lobby hum, fire crackle and quiet loading loops. Seams loop cleanly so maps stay alive without noticeable repetition.",
    tags: ["SFX Pack", "Ambience", "5 Samples"],
    popularity: 45,
    samples: [
      { file: "Ambience_Background/Ambience_5808580737.ogg", caption: "Ambience bed" },
      {
        file: "Ambience_Background/Audio_city-ambience-01_13853336583.ogg",
        caption: "City ambience",
      },
      {
        file: "Ambience_Background/BBN-LOBBY_ambience-loop_SFX_72658651333800.ogg",
        caption: "Lobby ambience loop",
      },
      { file: "Ambience_Background/Fire Loop_9082326368.ogg", caption: "Fire ambience loop" },
      {
        file: "Ambience_Background/LoadingLoopQuiet_6032562866.ogg",
        caption: "Loading loop (quiet)",
      },
    ],
  },
  {
    slug: "sfx-abilities",
    title: "Ability & Magic SFX",
    role: "SFX Artist",
    description:
      "Ability and magic pack — casts, lasers, portal loops, teleports and power-ups. Pitch-stacked with whoosh tails so every skill activation reads instantly.",
    tags: ["SFX Pack", "Abilities", "5 Samples"],
    popularity: 40,
    samples: [
      { file: "SciFi_Magic_Abilities/ability_1__77831158396083.ogg", caption: "Ability cast" },
      { file: "SciFi_Magic_Abilities/awesomelaser_87607159030428.ogg", caption: "Laser" },
      { file: "SciFi_Magic_Abilities/portal_loop_2162238374.ogg", caption: "Portal loop" },
      {
        file: "SciFi_Magic_Abilities/decayed_red_teleport_3_119600335076441.ogg",
        caption: "Teleport",
      },
      { file: "SciFi_Magic_Abilities/powerUp_77913724101837.ogg", caption: "Power up" },
    ],
  },
  {
    slug: "sfx-movement",
    title: "Movement & Footsteps SFX",
    role: "SFX Artist",
    description:
      "Movement pack — jumps, hover-tank engines and surface-matched footsteps on carpet, grass and foley. Built to randomize cleanly so footsteps never sound machine-gunned.",
    tags: ["SFX Pack", "Movement", "6 Samples"],
    popularity: 35,
    samples: [
      { file: "Movement_Vehicles/Audio_jump_121260168932417.ogg", caption: "Jump" },
      { file: "Movement_Vehicles/Jump_1560983210.ogg", caption: "Jump (alternate)" },
      {
        file: "Movement_Vehicles/Hover_Tank_Engine_start_319804715.ogg",
        caption: "Hover tank engine start",
      },
      {
        file: "Movement_Vehicles/BBN-MAP_pizzeria-carpet-footstep1_SFX_70671266895364.ogg",
        caption: "Footstep (carpet)",
      },
      {
        file: "Movement_Vehicles/BBN_Grass_Step_1_70903768298140.ogg",
        caption: "Footstep (grass)",
      },
      {
        file: "Movement_Vehicles/foley_player_step_ink_01_134472164227283.ogg",
        caption: "Footstep (foley)",
      },
    ],
  },
  {
    slug: "sfx-music-stingers",
    title: "Music & Stingers SFX",
    role: "SFX Artist",
    description:
      "Music and stinger pack — intro jingles, boss themes, victory stingers and hoax intros. Short-form music cuts timed to hit clean on round starts and wins.",
    tags: ["SFX Pack", "Stingers", "5 Samples"],
    popularity: 30,
    samples: [
      { file: "Music_Stingers/Intro_Jingle_125960461947567.ogg", caption: "Intro jingle" },
      { file: "Music_Stingers/KingBeetle_Jingle_104775727453588.ogg", caption: "Boss jingle" },
      { file: "Music_Stingers/Victory!_74216560469867.ogg", caption: "Victory stinger" },
      { file: "Music_Stingers/Victory_83643468144269.ogg", caption: "Victory (variant)" },
      { file: "Music_Stingers/BBN_Hoax_Intro_75209583984637.ogg", caption: "Hoax intro stinger" },
    ],
  },
  {
    slug: "sfx-creatures",
    title: "Creature Voices SFX",
    role: "SFX Artist",
    description:
      'Creature voice pack — screams, voice lines and taunts including the iconic "you always come back screaming". Processed for character without losing intelligibility.',
    tags: ["SFX Pack", "Creatures", "6 Samples"],
    popularity: 25,
    samples: [
      { file: "Creatures_Voices/Scream_95134002580490.ogg", caption: "Creature scream" },
      {
        file: "Creatures_Voices/VoiceLine21spingtap_111532393606941.ogg",
        caption: "Voice line (1)",
      },
      { file: "Creatures_Voices/VoiceLine3spingtap_85457516808819.ogg", caption: "Voice line (2)" },
      {
        file: "Creatures_Voices/you_always_come_back_screaming__87775179852744.ogg",
        caption: '"You always come back screaming"',
      },
      { file: "Creatures_Voices/Adios_75947843921776.ogg", caption: "Adios voice line" },
      {
        file: "Creatures_Voices/Audio_napoleonvoiceline_15048704875.ogg",
        caption: "Napoleon voice line",
      },
    ],
  },
];

// --- Env (same loader semantics as the other ops scripts) ---------------------

for (const f of [".env.local", ".env"]) {
  let text;
  try {
    text = readFileSync(path.join(ROOT, f), "utf8");
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

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env.local");
  process.exit(1);
}
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};
const apply = process.argv.includes("--apply");
/** --all: upload the ENTIRE zip library (~811 files) into the category packs,
 *  not just the curated manifest. Bypasses the 900 KB upload cap (that cap
 *  exists only for the request-body upload path; storage handles multi-MB
 *  blobs) and skips the per-blob KV mirror — with Supabase as the primary
 *  blob backend, 767 wrangler spawns would take ~20 minutes for nothing. */
const allMode = process.argv.includes("--all");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Transient network errors (ECONNRESET etc.) killed a long import once — retry. */
async function fetchRetry(url, init, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      console.log(
        `↻ fetch failed (${String(e.cause?.code ?? e.code ?? e.message).slice(0, 60)}) — retry ${i + 1}/${tries}…`,
      );
      await sleep(2000 * (i + 1));
    }
  }
  throw lastErr;
}

async function readStore() {
  const res = await fetchRetry(
    `${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.zyn-store-v1&select=value`,
    { headers },
  );
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]?.value) {
    console.error("✗ Store row not found");
    process.exit(1);
  }
  const store = rows[0].value;
  return { store, version: typeof store.version === "number" ? store.version : null };
}

/** Best-effort KV mirror (same replication pattern as the site's writers). */
function mirrorToKv(key, value) {
  const tmp = path.join(WORK_DIR, `kv-${key.replace(/[^\w-]/g, "_")}.json`);
  try {
    writeFileSync(tmp, value);
    const out = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "put", "--binding=STORE", key, "--remote", "--path", tmp],
      {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
        timeout: 60_000,
      },
    );
    return true;
  } catch (e) {
    console.log(
      "  ⚠️ KV mirror skipped (non-fatal):",
      String(e.stderr ?? e.message ?? e).slice(0, 160),
    );
    return false;
  } finally {
    rmSync(tmp, { force: true });
  }
}

// --- Extract the manifest files ------------------------------------------------

if (!existsSync(ZIP_PATH)) {
  console.error(`✗ ${ZIP_PATH} not found`);
  process.exit(1);
}
rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });
const zipEntries = allMode
  ? []
  : [...new Set(PACKS.flatMap((p) => p.samples.map((s) => s.file).filter(Boolean)))];
execFileSync("unzip", ["-o", ZIP_PATH, "-d", WORK_DIR, ...zipEntries], {
  stdio: ["ignore", "ignore", "ignore"],
});

/** Turns "Audio_city-ambience-01_13853336583" into "Audio city-ambience-01". */
function humanize(fileName) {
  const base = fileName
    .replace(/\.ogg$/i, "")
    .replace(/_\d{6,}/g, "")
    .replace(/_+/g, " ")
    .trim();
  return (base.length > 0 ? base : fileName) && base.charAt(0).toUpperCase() + base.slice(1);
}

/** zip folder → the showcase pack that category belongs to. */
const FOLDER_TO_PACK = {
  Weapons_Guns: PACKS.find((p) => p.slug === "sfx-weapons-guns"),
  Combat_Impacts: PACKS.find((p) => p.slug === "sfx-combat-impacts"),
  UI_Notifications: PACKS.find((p) => p.slug === "sfx-ui-notifications"),
  Ambience_Background: PACKS.find((p) => p.slug === "sfx-ambience"),
  SciFi_Magic_Abilities: PACKS.find((p) => p.slug === "sfx-abilities"),
  Movement_Vehicles: PACKS.find((p) => p.slug === "sfx-movement"),
  Music_Stingers: PACKS.find((p) => p.slug === "sfx-music-stingers"),
  Creatures_Voices: PACKS.find((p) => p.slug === "sfx-creatures"),
};

/** Storage sanity guard — realistic cap well above the actual biggest file. */
const HARD_MAX_BYTES = 20_000_000;

// --- Build the plan -------------------------------------------------------------

const { store, version: readVersion } = await readStore();
const maxSortOrder = Math.max(0, ...store.works.map((w) => Number(w.sortOrder) || 0));

const worksToAdd = [];
const mediaToAdd = [];
const blobs = [];
let uploads = 0;
let bytes = 0;

if (allMode) {
  // --- Whole-library mode: every .ogg in the zip → its category pack ---------
  // Curated manifest entries are skipped (their media rows already exist on
  // the live site); everything else joins the same pack, captioned from the
  // filename. Existing media with the same caption is skipped, so re-running
  // the script never duplicates rows.
  const curated = new Set(
    PACKS.flatMap((p) =>
      p.samples
        .map((s) => s.file)
        .filter(Boolean)
        .map((f) => f.split("/").pop()),
    ),
  );
  const existingByCaption = new Map();
  for (const m of store.media ?? []) {
    existingByCaption.set(`${m.workId}::${m.caption}`, true);
  }
  for (const folder of Object.keys(FOLDER_TO_PACK).sort()) {
    const pack = FOLDER_TO_PACK[folder];
    const dir = path.join(WORK_DIR, folder);
    if (!existsSync(dir)) {
      console.error(`✗ Folder missing from zip: ${folder}`);
      process.exit(1);
    }
    const files = readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".ogg"))
      .sort();
    let sortOrder = 0;
    for (const f of files) {
      if (curated.has(f)) continue;
      const caption = humanize(f);
      if (existingByCaption.has(`work-${pack.slug}::${caption}`)) continue;
      const raw = readFileSync(path.join(dir, f));
      if (raw.length > HARD_MAX_BYTES) {
        console.error(`✗ File unrealistically large, skipping: ${f} (${raw.length} bytes)`);
        continue;
      }
      const id = randomUUID();
      mediaToAdd.push({
        id: randomUUID(),
        workId: `work-${pack.slug}`,
        mediaType: "audio",
        url: `/uploads/${id}`,
        caption,
        sortOrder: sortOrder++,
      });
      blobs.push({
        blob: {
          id,
          name: f,
          mime: "audio/ogg",
          size: raw.length,
          dataBase64: raw.toString("base64"),
          createdAt: Date.now(),
        },
        workId: `work-${pack.slug}`,
      });
      uploads++;
      bytes += raw.length;
    }
  }
  // In whole-library mode the media rows carry the real live page counts; the
  // source-of-truth numbers live in the DB, not in copy — nothing else to fix.
}

for (const pack of PACKS) {
  if (store.works.some((w) => w.slug === pack.slug)) {
    console.log(`= ${pack.slug} already exists — skipping`);
    continue;
  }
  worksToAdd.push({
    id: `work-${pack.slug}`,
    slug: pack.slug,
    title: pack.title,
    category: "SFX / Audio",
    role: pack.role,
    description: pack.description,
    tags: pack.tags,
    sortOrder: maxSortOrder + worksToAdd.length * 10 + 10,
    popularity: pack.popularity,
  });
  let sortOrder = 0;
  for (const { file, caption } of pack.samples) {
    const abs = file === null ? EXTRA_AKS74U : path.join(WORK_DIR, ...file.split("/"));
    const displayName = file === null ? "AKS-74U Fire sfx.ogg" : file.split("/").pop();
    if (!existsSync(abs)) {
      console.error(`✗ Missing sample: ${displayName}`);
      process.exit(1);
    }
    const raw = readFileSync(abs);
    if (raw.length > MAX_UPLOAD_BYTES) {
      console.error(`✗ File exceeds the ${MAX_UPLOAD_BYTES}-byte upload cap: ${displayName}`);
      process.exit(1);
    }
    const id = randomUUID();
    mediaToAdd.push({
      id: randomUUID(),
      workId: `work-${pack.slug}`,
      mediaType: "audio",
      url: `/uploads/${id}`,
      caption,
      sortOrder: sortOrder++,
    });
    blobs.push({
      blob: {
        id,
        name: displayName,
        mime: "audio/ogg",
        size: raw.length,
        dataBase64: raw.toString("base64"),
        createdAt: Date.now(),
      },
    });
    uploads++;
    bytes += raw.length;
  }
}

if (worksToAdd.length === 0 && mediaToAdd.length === 0) {
  console.log("✓ Nothing to import — every showcase work and sample already exists");
  rmSync(WORK_DIR, { recursive: true, force: true });
  process.exit(0);
}

console.log(
  `Plan: ${worksToAdd.length} new works, ${uploads} audio uploads (~${(bytes / 1024 / 1024).toFixed(1)} MiB)`,
);
for (const packWork of worksToAdd) {
  const count = mediaToAdd.filter((m) => m.workId === packWork.id).length;
  console.log(`  /work/${packWork.slug} — ${count} audio items`);
}
if (worksToAdd.length === 0 && allMode) {
  for (const pack of PACKS) {
    const count = mediaToAdd.filter((m) => m.workId === `work-${pack.slug}`).length;
    if (count > 0) console.log(`  ${pack.slug} gets ${count} new audio items`);
  }
}

if (!apply) {
  console.log("\nDry run — nothing written. Re-run with --apply to import.");
  rmSync(WORK_DIR, { recursive: true, force: true });
  process.exit(0);
}

// --- Write the blobs -------------------------------------------------------------

for (const { blob } of blobs) {
  const res = await fetchRetry(`${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.upload:${blob.id}`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: `upload:${blob.id}`, value: blob }),
  });
  if (!res.ok) {
    await res.text().catch(() => {});
    console.error(`✗ Upload write failed (${res.status}) for ${blob.name}`);
    process.exit(1);
  }
  if (allMode) continue; // per-blob KV mirror skipped in bulk mode
  mirrorToKv(`upload:${blob.id}`, JSON.stringify(blob));
  process.stdout.write(`✓ uploaded ${blob.name} (${(blob.size / 1024).toFixed(0)} KiB)\n`);
}

// --- One CAS store write for works + media --------------------------------------

let imported = false;
for (let attempt = 0; attempt < 6; attempt++) {
  const fresh = await readStore();
  if (fresh.version === null) {
    console.error("✗ Store predates optimistic locking — bootstrap it via the admin panel first");
    process.exit(1);
  }
  if (fresh.store.works.some((w) => worksToAdd.some((p) => p.slug === w.slug))) {
    console.log(
      "✓ Showcase works appeared mid-import (someone else added them) — skipping store write",
    );
    imported = true;
    break;
  }
  const doc = {
    ...fresh.store,
    works: [...fresh.store.works, ...worksToAdd],
    media: [...(fresh.store.media ?? []), ...mediaToAdd],
    version: fresh.version + 1,
  };
  const res = await fetchRetry(
    `${SUPABASE_URL}/rest/v1/supabase_kv?key=eq.zyn-store-v1&value->>version=eq.${fresh.version}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ value: doc }),
    },
  );
  const patched = await res.json().catch(() => []);
  if (res.ok && Array.isArray(patched) && patched.length > 0) {
    console.log(`✓ Store updated (CAS, now version ${fresh.version + 1})`);
    mirrorToKv("zyn-store-v1", JSON.stringify(doc));
    imported = true;
    break;
  }
  console.log(`↻ conflict (attempt ${attempt + 1}) — re-reading winner…`);
}
if (!imported) {
  console.error("✗ Gave up after repeated conflicts — re-run the script");
  process.exit(1);
}

rmSync(WORK_DIR, { recursive: true, force: true });
console.log(`\nDone: ${worksToAdd.length} works, ${uploads} uploads live under /work/<slug>`);
console.log("Verify: open https://roblox.zynx0286.workers.dev/work/sfx-weapons-guns");
