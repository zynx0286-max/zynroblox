// Builds the Wispbyte upload bundle: dist/wispbyte-bot.zip + dist/wispbyte-bot/
//
//   npm run bot:pack
//
// Produces everything Wispbyte's panel needs, from the repo's live source:
//   index.js        — bot/index.mjs verbatim (startup is `node index.js`;
//                     ESM works because pack writes "type":"module" into the
//                     bundle's package.json)
//   package.json    — trimmed manifest (discord.js only, pinned to the same
//                     version the repo uses)
//   README.txt      — panel walkthrough for whoever is clicking the buttons
// and zips the three into dist/wispbyte-bot.zip, ready for the Files tab.
//
// Every build self-verifies before reporting success:
//   * `node --check index.js` — a bundle that doesn't parse wastes a whole
//     upload-and-restart cycle on the host; catch it at build time instead.
//   * the zip is round-trip decoded and compared byte-for-byte — the hand-
//     rolled writer below is exactly the kind of code a silent byte slip in
//     would ship silently.
//
// The bundle is generated, never hand-edited: every `npm run bot:pack` writes
// exactly .zip + folder + the 3 files, so what's on the host is what's in git.
//
// The pure half (manifest/readme generation, zip writer, crc32) is exported
// for tests — bot/pack.test.mjs asserts it against known answers — while this
// file stays directly runnable as the CLI.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BOT_SRC = path.join(ROOT, "bot", "index.mjs");
const OUT_DIR = path.join(ROOT, "dist", "wispbyte-bot");
const ZIP_PATH = path.join(ROOT, "dist", "wispbyte-bot.zip");

export const BUNDLE_FILES = ["index.js", "package.json", "README.txt"];

function readRepoPackage() {
  return JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
}

/**
 * The discord.js version the repo pins, which the bundle re-uses so the host
 * and local runs can never drift.
 */
export function bundleDepsVersion(packageJson) {
  const version = packageJson.dependencies?.["discord.js"];
  if (typeof version !== "string") {
    throw new Error(`package.json has no "discord.js" dependency — cannot build the bundle`);
  }
  return version;
}

// --- Generate bundle contents -------------------------------------------------

/** The trimmed manifest uploaded to the host next to index.js. */
export function generatePackageJson(discordJsVersion) {
  return JSON.stringify(
    {
      name: "zyn-portfolio-bot",
      private: true,
      type: "module",
      version: "1.0.0",
      description: "ZYN portfolio Discord DM bot (Wispbyte bundle)",
      scripts: { start: "node index.js" },
      // Node ≥ 20 is what the bot needs; Wispbyte's images are Node 20+.
      engines: { node: ">=20" },
      dependencies: { "discord.js": discordJsVersion },
    },
    null,
    2,
  );
}

/** The README.txt shipped in the bundle: panel walkthrough. */
export function generateReadme(discordJsVersion, repoVersion = "(unversioned)") {
  return `ZYN portfolio Discord bot — Wispbyte bundle (repo build ${repoVersion}, discord.js ${discordJsVersion})

UPLOAD (Wispbyte panel → your server → Files):
  1. Delete anything from a previous upload first (old files linger and the
     wrong one can be started).
  2. Upload everything in this folder to the server root:  index.js
                                                            package.json
                                                            README.txt
  3. First start runs npm install from package.json automatically.

STARTUP (panel → Startup tab):
  BOT START / command:   node index.js
  Additional Node Packages: (leave empty — package.json installs them)

ENVIRONMENT VARIABLES (panel → Startup tab, one per line):
  DISCORD_BOT_TOKEN  = token from the Discord developer portal (Bot tab)
  DISCORD_BOT_SECRET = the shared HMAC secret — MUST be the exact same value
                       as the Worker secret of that name. The site URL is
                       https://roblox.zynx0286.workers.dev and needs no config.

ONE-TIME DISCORD CHECKLIST (if you haven't already):
  a. Developer portal → your app → Bot → Privileged Gateway Intents →
     Message Content Intent → ON → Save.
  b. Invite the bot: Installation (or OAuth2 URL Generator), scopes "bot"
     only, no permissions. Add it to any server you're in.
  c. In Discord: user Settings → Privacy → "Allow direct messages from
     server members" ON. DM the bot anything — the first DM also registers
     your user id for the nightly/digest notifications.

VERIFY:
  Console → Start. Expect within seconds:
    Bot logged in as <name> — DM me links to add portfolio entries.
  DM it a roblox.com/games/… link — expect an ✅ embed with a /work/<slug>
  page link. (Full reply meanings: docs/discord-bot.md in the repo.)

  Then verify liveness remotely (from your PC):
    npm run bot:doctor   → "Bot last seen (remote) — moments ago"
  The bot pings the site every 5 min; a heartbeat still STALE means the
  gateway is dead even if this console looks calm.

UPDATE LATER:
  Edit code in the repo → npm run bot:pack → upload the new files from
  dist/wispbyte-bot/ over the old ones → Console → Restart.
  The repo is the source of truth; never edit index.js on the panel.

HOST QUIRKS:
  • One bot per Wispbyte server.
  • Crash-loop guard: restarts twice <60s apart are declined. The bot
    handles per-message errors internally, so this fires only on a fatal
    start (bad token, missing intent) — the console log names the cause.
  • Free tier is fine: the bot idles >99% of the time.
`;
}

// --- Minimal ZIP writer (stored / no compression, no dependencies) -------------
//
// Stored entries mean CRC-checked correctness on disk and no compression code
// to get wrong. Format per APPNOTE.TXT: local file headers + data, a central
// directory, and the end-of-central-directory record. The tests round-trip
// decode this rather than trusting the writer.

/** Standard CRC-32 (IEEE), as the ZIP format requires. */
export function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds a stored-entries ZIP archive from `{ name, data }` entries in order.
 * No mtime (fixed 0) — deterministic output, so rebuilds of unchanged sources
 * produce byte-identical zips.
 */
export function buildZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const crc = crc32(data);
    const nameBytes = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method 0 = stored
    local.writeUInt16LE(0, 10); // mtime 0 — fixed for determinism
    local.writeUInt16LE(0, 12); // mdate 0
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed == uncompressed
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    chunks.push(local, nameBytes, data);

    const centralEntry = Buffer.alloc(46);
    centralEntry.writeUInt32LE(0x02014b50, 0);
    centralEntry.writeUInt16LE(20, 4); // version made by
    centralEntry.writeUInt16LE(20, 6); // version needed
    centralEntry.writeUInt16LE(0, 8);
    centralEntry.writeUInt16LE(0, 10); // method stored
    centralEntry.writeUInt16LE(0, 12); // time
    centralEntry.writeUInt16LE(0, 14); // date
    centralEntry.writeUInt32LE(crc, 16);
    centralEntry.writeUInt32LE(data.length, 20);
    centralEntry.writeUInt32LE(data.length, 24);
    centralEntry.writeUInt16LE(nameBytes.length, 28);
    centralEntry.writeUInt16LE(0, 30); // extra len
    centralEntry.writeUInt16LE(0, 32); // comment len
    centralEntry.writeUInt16LE(0, 34); // disk number
    centralEntry.writeUInt16LE(0, 36); // internal attrs
    centralEntry.writeUInt32LE(0, 38); // external attrs
    centralEntry.writeUInt32LE(offset, 42);
    central.push(centralEntry, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const centralStart = offset;
  for (const c of central) chunks.push(c);
  const centralSize = central.reduce((n, c) => n + c.length, 0);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // central dir disk
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20); // comment len
  chunks.push(end);

  return Buffer.concat(chunks);
}

/**
 * Round-trip decodes a stored ZIP produced by buildZip and returns the
 * entries. Parses the central directory properly (rather than assuming
 * zero-length extras) so it is an independent reader, not a mirror of the
 * writer.
 */
export function readZip(zip) {
  // 1. Locate the end-of-central-directory record (scan back past any comment).
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 66_000); i--) {
    if (zip.readUInt32LE(i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("readZip: no end-of-central-directory record found");

  const count = zip.readUInt16LE(eocd + 10);
  const centralStart = zip.readUInt32LE(eocd + 16);

  // 2. Walk the central directory; each entry points at its local header.
  const out = [];
  let p = centralStart;
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error(`readZip: bad central entry ${i}`);
    const crc = zip.readUInt32LE(p + 16);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString("utf8");

    const method = zip.readUInt16LE(p + 10);
    if (method !== 0)
      throw new Error(`readZip: entry "${name}" is not stored — reader is stored-only`);

    const localDataStart = localOffset + 30 + nameLen;
    const data = zip.subarray(localDataStart, localDataStart + size);
    if (crc32(data) !== crc) throw new Error(`readZip: CRC mismatch for "${name}"`);

    out.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/**
 * Verifies a decoded zip matches the source entries exactly — name order and
 * byte content. Called after every real build, and exercised directly by the
 * tests.
 */
export function verifyZipRoundTrip(entries, decoded) {
  if (decoded.length !== entries.length) return false;
  for (let i = 0; i < entries.length; i++) {
    if (decoded[i].name !== entries[i].name) return false;
    if (!decoded[i].data.equals(entries[i].data)) return false;
  }
  return true;
}

/**
 * `node --check` the bundle's index.js without executing it: a bundle that
 * doesn't parse would otherwise waste an upload + restart cycle on the host.
 * Throws on any syntax error.
 */
export function assertParses(source, label = "index.js") {
  const result = spawnSync(process.execPath, ["--check", "--input-type=module"], {
    input: source,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `Bundled ${label} does not parse — fix the source before shipping:\n${result.stderr}`,
    );
  }
}

// --- Build -------------------------------------------------------------------

export function build({ log = console.log } = {}) {
  const pkg = readRepoPackage();
  const version = bundleDepsVersion(pkg);

  rmSync(OUT_DIR, { recursive: true, force: true });
  rmSync(ZIP_PATH, { force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const botSource = readFileSync(BOT_SRC, "utf8");
  const files = [
    { name: "index.js", data: Buffer.from(botSource, "utf8") },
    { name: "package.json", data: Buffer.from(generatePackageJson(version), "utf8") },
    {
      name: "README.txt",
      data: Buffer.from(generateReadme(version, pkg.version || "(unversioned)"), "utf8"),
    },
  ];

  // 1. The copied bot must parse — catch it here, not after an upload cycle.
  assertParses(botSource);
  // 2. The zip writer must round-trip — independent reader, byte comparison.
  const zip = buildZip(files);
  if (!verifyZipRoundTrip(files, readZip(zip))) {
    throw new Error("Built zip failed round-trip verification — not shipping a corrupted bundle");
  }

  for (const { name, data } of files) {
    writeFileSync(path.join(OUT_DIR, name), data, "utf8");
  }
  writeFileSync(ZIP_PATH, zip);

  log(`✓ Wispbyte bundle built:`);
  for (const f of BUNDLE_FILES) log(`    dist/wispbyte-bot/${f}`);
  log(`  ✓ dist/wispbyte-bot.zip (${(zip.length / 1024).toFixed(1)} KiB, round-trip verified)`);
  log(`  Upload the folder contents (or the zip) in the Wispbyte Files tab.`);
}

// CLI entry: run when invoked as `node bot/pack.mjs`. Compare RESOLVED paths,
// not the URL pathname — on Windows process.argv[1] is a dos-style path while
// import.meta.pathname is a file-URL path (/C:/…), so an equality check
// between those two silently never fires and `bot:pack` exits 0 doing nothing.
const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedAs === path.resolve(fileURLToPath(import.meta.url))) build();
