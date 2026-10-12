// Tests for the Wispbyte bundle builders in bot/pack.mjs.
// The zip writer is hand-rolled spec code, so it gets real verification:
// known-answer CRCs, structural round-trips, and byte-exact determinism.
// The manifest/readme are shipped to a hosting panel, so core invariants
// (ESM type, exact filenames, both secret names spelled out) are asserted
// rather than trusted.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bundleDepsVersion,
  generatePackageJson,
  generateReadme,
  crc32,
  buildZip,
  readZip,
  verifyZipRoundTrip,
  assertParses,
} from "./pack.mjs";

const BUNDLE_FILES = ["index.js", "package.json", "README.txt"];

test("bundleDepsVersion picks up the repo's discord.js version", () => {
  assert.equal(bundleDepsVersion({ dependencies: { "discord.js": "^14.27.0" } }), "^14.27.0");
});

test("bundleDepsVersion rejects a manifest without discord.js", () => {
  assert.throws(() => bundleDepsVersion({ dependencies: {} }), /discord\.js/);
});

test("generated manifest is ESM with a start script and only discord.js", () => {
  const manifest = JSON.parse(generatePackageJson("^14.27.0"));
  assert.equal(manifest.type, "module"); // index.js uses bare `import` — non-ESM would crash at boot
  assert.equal(manifest.scripts.start, "node index.js");
  assert.deepEqual(Object.keys(manifest.dependencies), ["discord.js"]);
  assert.match(manifest.engines.node, /^>=20$/);
});

test("README names both required env vars and the exact file set", () => {
  const readme = generateReadme("^14.27.0", "9.9.9");
  for (const needle of ["DISCORD_BOT_TOKEN", "DISCORD_BOT_SECRET", ...BUNDLE_FILES]) {
    assert.ok(readme.includes(needle), `README should mention ${needle}`);
  }
  assert.match(readme, /repo build 9\.9\.9/);
});

test("crc32 known answers (IEEE, reflected, per the ZIP spec)", () => {
  assert.equal(crc32(Buffer.alloc(0)), 0x00000000); // empty
  assert.equal(crc32(Buffer.from("123456789", "ascii")), 0xcbf43926); // canonical check value
  assert.equal(
    crc32(Buffer.from("The quick brown fox jumps over the lazy dog", "ascii")),
    0x414fa339,
  );
});

test("buildZip → readZip round-trips names and bytes, CRCs independently checked", () => {
  const entries = [
    { name: "index.js", data: Buffer.from("console.log('hi')\n", "utf8") },
    { name: "package.json", data: Buffer.from('{"type":"module"}', "utf8") },
    { name: "README.txt", data: Buffer.from("hello\nworld\n", "utf8") },
  ];
  const zip = buildZip(entries);
  assert.ok(verifyZipRoundTrip(entries, readZip(zip)));
});

test("round-trip reader is an independent parser: corrupted data is caught, not echoed", () => {
  const entries = [{ name: "index.js", data: Buffer.from("AAAA", "utf8") }];
  const zip = Buffer.from(buildZip(entries));
  // Flip one byte inside the stored payload (first data byte sits right after
  // the 30-byte local header + name).
  const dataStart = zip.indexOf(Buffer.from("AAAA"));
  zip[dataStart] = 0x42 ^ 0xff;
  assert.throws(() => readZip(zip), /CRC mismatch/);
});

test("rebuilds of unchanged input are byte-identical (deterministic, host-safe)", () => {
  const entries = [{ name: "README.txt", data: Buffer.from("same", "utf8") }];
  assert.ok(buildZip(entries).equals(buildZip(entries)));
});

test("readZip refuses non-zip input", () => {
  assert.throws(() => readZip(Buffer.from("not a zip at all")), /no end-of-central-directory/);
});

test("assertParses accepts valid ESM and rejects a syntax error", () => {
  assert.doesNotThrow(() => assertParses("import { once } from 'node:events';\n"));
  assert.throws(() => assertParses("definitely not javascript \\\\[[["), /does not parse/);
});
