# Portfolio maintenance CLI — `scripts/works-admin.mjs`

Occasional fixes to the portfolio that don't warrant opening the admin panel:
duplicate entries, entries the bot left half-finished, one-off field fixes.

Every command reads and writes **production** data. `merge` and `backfill` are
**dry runs by default** — they print exactly what would change and write
nothing until you pass `--apply`.

## Commands

| Command                                 | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `list [filter]`                         | Slugs + titles (42+ rows; filter by substring)                   |
| `find-dupes`                            | Entries sharing a Roblox place id, with a suggested merge        |
| `merge <keepSlug> <dropSlug> [--apply]` | Fold one entry into another, keeping the richest value per field |
| `backfill [--apply]`                    | Fill placeholder titles / missing images & descriptions          |
| `enrich <slug>`                         | Re-fetch one entry's Roblox metadata (fills only empty fields)   |
| `remove <slug>`                         | Delete an entry                                                  |

```bash
node scripts/works-admin.mjs find-dupes
node scripts/works-admin.mjs merge engineria-project-x roblox-game-131306380730931
node scripts/works-admin.mjs merge engineria-project-x roblox-game-131306380730931 --apply
```

## How a merge picks values

Merging is **field by field**, not "one entry wins". The rules live in
`src/lib/store-cas.ts` and are unit-tested:

| Field                                   | Winner                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `title`                                 | A real title always beats a `Roblox game <id>` placeholder                            |
| `description`                           | The longer one (more information)                                                     |
| `image`                                 | Curated `/assets/…` over a Roblox CDN thumbnail                                       |
| `tags`                                  | Union, de-duplicated case-insensitively, order preserved                              |
| `role`, `category`, `href`, `linkLabel` | The non-empty one; longer if both are set                                             |
| `featured`                              | Sticky — true if either copy was featured                                             |
| `popularity`                            | The higher number                                                                     |
| `sortOrder`                             | The lowest, so the entry keeps its original grid position                             |
| `slug`, `id`                            | **Never merged** — the survivor keeps them, so existing links and admin edits survive |

`find-dupes` picks the survivor automatically by completeness (real title,
image, description, tags, popularity), so a curated catalog entry beats a
bot-created stub. Pass the slugs to `merge` in either order if you disagree —
the per-field rules still apply, only the slug/id follow the first argument.

**Merging is not reversible by re-running the bot.** The dropped entry's
`/work/<slug>` page stops resolving; the dry-run output names it explicitly.

## Concurrency safety

These commands edit the same single JSON document the Worker writes, so they use
the identical optimistic-locking protocol (see
[supabase-setup.md](./supabase-setup.md)): read the embedded `version`, PATCH
with `&value->>version=eq.N`, and on conflict re-read the winner and re-apply.
A bare upsert is never used — that is how an out-of-band edit gets silently
reverted by a Worker isolate. Every successful write also mirrors to Cloudflare
KV so the fallback copy can't drift.

## Rate limits

`backfill` batches its Roblox lookups: one place→universe request per entry
(with a short delay), then a single games/icons request for all universe ids.
Per-game bursts get rate-limited from datacenter IPs, which is what left bot
entries with placeholder titles in the first place.
