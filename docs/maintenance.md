# Keeping the portfolio tidy

Three tools cover the same ground, and all three share their rules from
`src/lib/store-cas.ts` (merge) and `src/lib/roblox-refresh.ts` (Roblox
metadata) — so the admin panel, the CLI and the nightly job can never disagree
about what a merge or a refresh does.

| Where                         | Use it for                                                      |
| ----------------------------- | --------------------------------------------------------------- |
| **Admin → Works**             | Day-to-day: review duplicates, merge them, refresh metadata     |
| **`scripts/works-admin.mjs`** | Batch fixes from a terminal; see [works-cli.md](./works-cli.md) |
| **Nightly cron**              | Untended fill-in of anything Roblox is missing                  |
| **Weekly cron**               | A DM summarising the week; see [Notifications](#notifications)  |

## Merging duplicates

The bot can create two entries for one game: a DM arrives while Roblox is
rate-limiting, so the link is saved as `Roblox game <id>` — but the game was
already in the portfolio under its real name. The Admin → Works **Maintenance**
panel lists every such collision, marks which entry should survive, and shows a
field-by-field preview of what moves across before you commit.

Merging keeps the richest value of each field (longer description, real title
over a placeholder, curated `/assets/` image over a Roblox thumbnail, union of
tags). The survivor keeps its own slug and id, so **its public URL and any admin
edits survive**. The entries you merge away stop resolving — the confirm dialog
names them, since that's the one irreversible part.

## Refreshing Roblox metadata

Roblox renames games, and a placeholder entry needs finishing. The refresh
checks every Roblox entry and:

- **fills** an empty or placeholder title, an empty description, a missing icon
- **reports, never applies**, a curated title that differs from Roblox's
- **never replaces** a curated `/assets/…` image with a CDN thumbnail

That restraint is deliberate. Roblox's own name is often worse than the
catalog's — the portfolio ships "Engineria: Project X" while Roblox reports
"Engineria Project X". A naive "sync with the source of truth" job would
quietly degrade the portfolio every night, so differences are surfaced for a
human and applied by hand.

The rules are unit-tested in `src/lib/roblox-refresh.test.ts`, including the
steady state: a fully curated portfolio must produce **zero writes**.

### Running it

- **Manually:** Admin → Works → Maintenance → _Refresh from Roblox_
- **Nightly:** the `works:refresh` Nitro task, scheduled `17 6 * * *` UTC

The schedule lives in `vite.config.ts`; Nitro copies it into
`.output/server/wrangler.json` as a `crons` trigger, which is the config
`npm run deploy` ships. `wrangler deploy` prints the schedules it registered —
a good sanity check after a deploy:

```
  schedule: 17 6 * * *      ← nightly Roblox refresh
  schedule: 43 8 * * 1      ← weekly digest, Mondays 08:43 UTC
  schedule: 29 * * * *      ← hourly bot-liveness watch
```

To watch a run without waiting for the cron:

```bash
npx wrangler deployments list             # confirm the version
npx wrangler tail roblox --format pretty   # watch for "[refresh] ..." / "[digest] ..." lines
```

Roblox rate-limits datacenter IPs, so a run from the Worker often reports
`unavailable` for every game. **That is normal and safe** — unavailable means
"no changes made". The next nightly run retries.

## The activity log

Everything that changes the portfolio is recorded in its own small document
(`zyn-activity-v1` in the `supabase_kv` table), separate from the CMS document
so it never contends with — or bloats — an edit. Each record is
`{ at, kind, summary, slug?, detail? }`, where `kind` is one of:

| Kind                | Written by                                                                |
| ------------------- | ------------------------------------------------------------------------- |
| `entry.created`     | The DM bot, when Roblox answered with real metadata                       |
| `entry.placeholder` | The DM bot, when it saved a link it couldn't resolve                      |
| `entry.merged`      | Any merge, from the admin panel or the CLI                                |
| `refresh.ran`       | The nightly job, with its `{checked, filled, review, unavailable}` counts |
| `system`            | Reserved for manual notes                                                 |

The log keeps the **most recent 400** records. Read it in the admin panel under
Admin → Works → Maintenance → _Recent activity_, or over the REST API with the
`listRecentActivity` server function.

It exists to answer "what happened to my portfolio while I wasn't looking", so
the weekly digest has something real to summarise. It is best-effort: if the
log can't be written, the operation that triggered it still succeeds — losing a
log line must never cost you an entry.

## Notifications

The Worker can DM you about things that happen with nobody watching. Two
optional transports, each independently safe to leave unset:

| Secret                         | Effect                                                 |
| ------------------------------ | ------------------------------------------------------ |
| `DISCORD_BOT_TOKEN`            | DMs you: new-entry announcements and the weekly digest |
| `DISCORD_ANNOUNCE_WEBHOOK_URL` | Posts new-entry cards to a channel, no DM needed       |

With neither set, every notification is a no-op returning `{ sent: false }` —
a missing token can never break ingest, a save, or the nightly job.

**A DM needs your numeric Discord user id**, and there is no button to look it
up: `GET /users/@me/channels` stops returning a conversation once it goes
quiet, so discovering the id that way would silently break weeks later. Instead
the bot sends your id along with the DMs you already send it, and the Worker
stores it in `zyn-notify-v1`. **So the first time you add a DM, the id
registers itself** — there is no manual step, and a changed bot token or a new
machine just picks it back up.

To silence everything without revoking anything, set `enabled: false` in the
`zyn-notify-v1` document. There is no admin-panel toggle for it yet.

### New-entry announcements

Posted the moment an entry goes live — to the webhook if you have one, and to
your DM otherwise. Placeholders get a distinct card (orange, "needs its real
title and icon") because they're the entries that still need you.

### The weekly digest

`src/tasks/weekly-digest.ts`, task `portfolio:digest`, scheduled
`43 8 * * 1` — Mondays at 08:43 UTC. It reads the activity log, buckets the
last seven days into new entries / needs a look / merges / refreshes, and DMs
you the summary.

Two behaviours worth knowing:

- **A quiet week sends nothing.** Silence is the correct signal; a weekly "all
  quiet" DM is a notification you learn to skip past.
- **"Needs a look" is not a count of failures.** A `refresh.ran` record whose
  `review` count is above zero lands here too, because the nightly job found a
  curated title or image that differs from Roblox's and deliberately did _not_
  overwrite it. That is a question for you, not a fault.

The digest's wording, bucketing and Discord limits (25 fields, 8 names per
field) are unit-tested in `src/lib/digest.test.ts` against the same functions
the DM is built from — what you read in Discord is exactly what the tests
assert.

### Bot-liveness alerts

`src/tasks/bot-liveness.ts`, task `portfolio:bot-liveness`, scheduled
`29 * * * *` — hourly. The hosted bot pings the Worker every 5 minutes (see
[discord-bot.md → remote liveness](./discord-bot.md#is-it-actually-alive-remote-liveness));
this watch turns that signal into a DM exactly on state transitions:

- **fresh → down:** one alert the first time the heartbeat goes stale. A 3-day
  outage must not page 72 times.
- **while down:** re-alerts climb a slow ladder (24h, then 48h, then 96h) so a
  long outage stays visible without becoming noise.
- **down → fresh:** one "it's back" alert naming how long it was dark, so
  silence between alerts becomes trustworthy.
- **crash loops:** blackouts under 10 minutes that repeat within a 6-hour
  window are a flapping bot, and the recovery alerts are SUPPRESSED from the
  second one on — the down alert of each cycle still fires (that part is
  real), but the drip of "came back" DMs does not. At 4 suppressed blips one
  red 🔁 crash-loop page replaces the pattern entirely: "it is restarting
  over and over". Six hours of stability reset the counter.
- **healthy → degraded:** the bot keeps pinging but reports 3+ gateway
  reconnects or any failed DM reply — one yellow "up but struggling" DM, once,
  and one more when it settles down. The outage ladder above still applies if
  a degraded bot goes fully dark.

The watch never acts on the heartbeat itself and needs no extra setup — the
watch's own memory (which side it last reported from, when) lives in the
`zyn-bot-liveness-v1` row using the same CAS protocol as everything else; a
failed run simply retries next hour. Degraded-but-alive gateways (the bot
pings fine but reports repeated reconnects or failed DM replies) get their own
transition above; the weekly digest and `npm run bot:doctor` also carry the
current status so the information survives between alerts

### Proving the alerts fire locally

The state machine is fully unit-tested (`src/lib/bot-liveness.test.ts`), but
that can't prove the DM half — the Discord API, the bot token and the notify
wiring live outside the tests. To prove the _real_ cron task fires a _real_ DM
without waiting for the bot to actually die:

```bash
node scripts/test-liveness-smoke.mjs               # read-only: current heartbeat + liveness state
node scripts/test-liveness-smoke.mjs --tick-down   # stage the down→alert→recovery cycle end-to-end
```

`--tick-down` does exactly what the hourly cron does, on demand:

1. patches the built worker so `POST /__scheduled?cron=29+*+*+*+*` runs the
   real `runCronTasks` path (guarded by `NITRO_TEST_SCHEDULED=1`; the patch and
   the route both vanish on the next `npm run build`),
2. runs `wrangler dev` against the same config the deploy ships,
3. stages a stale heartbeat in `zyn-bot-heartbeat-v1` (CAS write), reflecting
   the original value right after,
4. runs one tick → expects `[liveness] alert-down sent=true` in the log and a
   🚨 DM; restores the fresh heartbeat and runs a second tick → expects the ✅
   recovery DM,
5. tears everything down: dev server stopped, generated `.dev.vars` removed,
   heartbeat and liveness `flaps` counter restored so a smoke can never chain
   into a false crash-loop page.

Things that must be true for `--tick-down` to work:

- **Secrets in `.env.local` / `.env`** — the smoke builds (and deletes) the
  dev server's secret file from whatever it finds there. Production Workers
  secrets alone are not readable locally, so they can't be used. Never commit
  them either way.
- **GOTCHA: `.dev.vars` placement.** `wrangler dev` looks for `.dev.vars`
  **next to the `--config` file** (`.output/server/wrangler.json`), not in the
  repo root. A repo-root copy leaves every secret empty and the run ends with
  `[notify][probe] no token` / `sent=false` — this cost a debugging session
  once, which is why the script handles it.
- **Cooldowns are honored.** If a recent blackouts is already inside the 6h
  flap window, repeated smokes just increment the (restored) flap counter —
  they cannot page a fake crash-loop. A smoke while the bot is genuinely down
  refuses to run: a real alert is already due and the state belongs to it.

Verified end-to-end (2026-10): the down alert (`1561045105509531698`, “🚨
Hosted bot is DOWN”) and the recovery (`1561062482720596149`, “✅ Bot is back
online”) both landed as real DMs through the real cron task path.

### The bot going dark

If the bot process dies (host restart, crash, gateway stall), DMs to it go
unanswered. The liveness watch above DMs you instead — and the alert names the
next step: `npm run bot:doctor` reports the exact last-seen age from anywhere,
and the Wispbyte console shows the crash logs. The weekly digest also carries a
"Bot currently DOWN since <date>" line whenever the watch's last evaluation
was "down".

## The Discord bot

If Roblox won't answer when you DM a link, the bot says so explicitly rather
than reporting a finished entry, and points out that the nightly job will fix it
automatically. See [discord-bot.md](./discord-bot.md).

Restart the bot (`npm run bot`) after pulling changes — it runs from your PC, not
from the Worker.
