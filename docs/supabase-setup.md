# Supabase backend (free tier) — setup guide

The site's CMS state (works, settings, reviews, testimonials, media, uploads)
now persists to **Supabase Postgres** when configured, with **Cloudflare KV as
an automatic mirror and fallback**. If Supabase secrets are absent, everything
behaves exactly as before (KV primary). Nothing breaks in either state.

## Why this design

- Same JSON-document shape as KV (one `supabase_kv` table, key → jsonb value),
  so no admin code changed — only the storage layer in `src/lib/store.ts`.
- The service-role key bypasses RLS, so the table needs zero policies and is
  unreachable from browsers (your publishable key can't read or write it).
- Every save mirrors to KV. If either provider hiccups, the other holds a
  recent consistent copy. Reads fall back to KV automatically.

## Step 1 — Create the table (2 min)

1. Open https://supabase.com/dashboard → your project (`<project-ref>`).
2. SQL Editor → New query → paste the contents of `scripts/supabase-setup.sql` → Run.

That creates the `supabase_kv` table, an `updated_at` trigger, and locks the
table down with RLS (no policies = only the service key can touch it).

## Step 2 — Get the service-role secret (1 min)

Dashboard → Project Settings → API. Copy the **`service_role` secret**
(new format starts with `sb_secret_…`; legacy projects show a long `eyJ…` JWT
labeled service_role). Never commit it — it's full admin access to the project.

## Step 3 — Local dev config

Append to `.env.local` (already gitignored):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<paste the service_role secret here>
```

Note: `.env` still mentions an older project ref (`bkxapramv…`, a leftover
from the Lovable scaffold). `.env.local` takes precedence, so it wins; clean
up `.env` whenever you like.

> **Local dev is deliberately isolated:** with `NODE_ENV=development` the dev
> server ignores Supabase even when these secrets are present, so `npm run dev`
> can never write to production Postgres — it stays on the local JSON file.
> (Secrets set in the Cloudflare dashboard or via `wrangler secret` are
> unaffected; production Workers have no meaningful NODE_ENV.)

## Step 4 — Migrate existing data (1 min)

A snapshot of production KV was already saved to `data/kv-backup-2026-09-26.json`
(42 works, hero settings, 29 universe ids). After steps 1–3:

```
node scripts/migrate-kv-to-supabase.mjs
```

It verifies the table exists, uploads the store row, and reads it back to
confirm. (If you skipped the local config, you can also pass the two values as
environment variables on the command line.)

## Step 5 — Production secrets

```
npx wrangler secret put SUPABASE_URL
# paste: https://<project-ref>.supabase.co

npx wrangler secret put SUPABASE_SERVICE_KEY
# paste: sb_secret_…
```

## Step 6 — Deploy & verify

```
npm run deploy
```

Then:

1. Open the admin panel → the status badge now reads
   **"Saving to Supabase (Postgres) + KV mirror"**.
2. Edit any section → Save.
3. Supabase dashboard → Table Editor → `supabase_kv` → the `zyn-store-v1` row's
   `updated_at` should be fresh, and your edit visible in the JSON.
4. Belt-and-braces: the same edit is also in KV
   (`npx wrangler kv key get --binding=STORE zyn-store-v1 --remote`).

## How the backend choice works now

| Situation                  | Behavior                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Both secrets set           | Supabase primary; every write mirrors to KV; reads fall back to KV on Supabase errors                                           |
| Secrets set, table missing | Read throws a clear error → site falls back to KV snapshot; admin save shows the exact error (run `scripts/supabase-setup.sql`) |
| Secrets absent             | Exactly the old behavior: KV primary, file/memory fallbacks                                                                     |

Notes:

- `getUploadBlob`/`putUploadBlob` follow the same priority (Supabase → KV → file).
- The store auto-adopted the KV contents on first Supabase run too, so even
  without running the migration script manually, no data is lost — the script
  just makes the cutover explicit and verifiable.
- Re-running the migration script is always safe (it upserts by primary key).

## Concurrent writes (why there is no `version` column)

The store is a single JSON document, so every write replaces the whole row.
Workers run many isolates, each holding a 30s in-memory snapshot — without
coordination, a slow isolate happily overwrites a newer document with its own
stale copy, silently reverting somebody else's edit.

The fix is optimistic locking with **no schema change**: the store document
carries its own `version` field (top level of the JSON, not a column). A write
reads the version, then patches with a filter that only matches that version:

```
PATCH /rest/v1/supabase_kv?key=eq.zyn-store-v1&value->>version=eq.<expected>
body: { "value": { ...store, "version": <expected + 1> } }
Prefer: return=representation
```

An empty response array means somebody else won the race, so `mutate()` re-reads
the winner, re-applies the same mutation on top of it, and retries. Two rules
keep this airtight:

1. **Never write unconditionally when the snapshot's version is unknown.** An
   unversioned write is exactly how a stale isolate reverts fresh data, so
   `persistStore()` reports a conflict instead and forces a re-read. The single
   exception is the bootstrap stamp in `mutate()`'s terminal path, which runs
   immediately after re-reading.
2. **Never pair a snapshot with someone else's version.** `storeVersion` is
   reset to `null` whenever the cache is adopted from KV/file/memory, and
   `mutate()` re-applies the mutation if a background revalidation swapped the
   snapshot mid-edit.

Maintenance scripts (`scripts/works-admin.mjs`) use the same CAS discipline, so
fixing an entry outside the admin panel can't be reverted by the Worker.

### Running the concurrency tests

The locking rules live in `src/lib/store-cas.ts`, separate from `store.ts`,
because `store.ts` imports the static work catalog and ~40 PNG assets — no plain
Node runner can load that. The tests drive the real helpers against an in-memory
fake of PostgREST that honours the version filter exactly like the live API.

```bash
npm test
```

Node 24 strips the TypeScript types natively, so there is no test dependency to
install. The suite is deliberately regression-shaped: it asserts the _failures_
that cost hours to diagnose — two isolates editing different fields, a stale
isolate writing over a newer document, an unknown version writing blindly, and
three concurrent writers all landing. It was verified to **fail** (6 failures)
against the old unconditional-write behaviour before passing against the fix,
so it genuinely catches the bug rather than just describing current code.

`store-cas.ts` also holds the duplicate-merge rules, which is why the merge CLI
and its tests exercise the same code rather than two implementations.

## Cost / limits on the free tier

- 500 MB database — the store is one JSON row (currently well under 1 MB) plus
  one row per upload blob; years of headroom.
- Two free projects max — this is your one; the Worker talks to it over HTTPS
  (PostgREST), no connection pooler needed at this traffic level.
- Free projects pause after ~1 week of inactivity — your site's 30-second store
  revalidation keeps it permanently active.
