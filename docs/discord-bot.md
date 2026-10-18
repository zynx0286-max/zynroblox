# Discord DM bot → auto-add portfolio entries

DM your bot a **Roblox game link** or a **Discord server invite** and it's added
to the portfolio automatically — title, description, icon (Roblox) or server
name and member counts (Discord) are filled in for you. Roblox entries join the
live visit counter immediately. Every entry appears in the admin panel for
tweaking, and duplicates are detected by link.

```
You:  https://www.roblox.com/games/123456789/some-game
Bot:  ✅ Added: Some Game  (page: /work/some-game)
```

## What the replies say

Each link gets its own embed. The interesting cases are the ones where the
game was **already** on the site — those used to reply with a bare "already
added", which is useless when you're trying to remember whether you added it.

| Situation                                   | Reply                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| New game, metadata resolved                 | ✅ **Added** with a clickable link to its page                                  |
| Roblox wouldn't answer, link saved anyway   | ⚠️ **Added as a placeholder** — explains why, and that the nightly job fixes it |
| Game already listed                         | 📗 **Already on the site** + its category, role, tags and a link to the entry   |
| …and it's still missing a description/image | …plus a **Still missing** field, so you know what to fill in                    |
| Placeholder entry completed in place        | 🔧 **Updated existing entry** — clarifies that nothing new was added            |
| Link type the bot won't auto-add            | ⚠️ **Could not add link**, with the reason                                      |

The placeholder case matters most. Roblox rate-limits datacenter IPs and the
Worker runs on one, so a DM can land at a moment when metadata lookups fail. The
bot saves the link rather than dropping it (the entry gets a `Roblox game <id>`
title), but it says so plainly instead of reporting a finished entry. Re-DMing
the same link later upgrades it in place, and the nightly job fills it in
automatically — see [maintenance.md](./maintenance.md).

The "still missing" hint is why the duplicate reply is more than decoration: an
entry the bot created while Roblox was rate-limiting still has a placeholder
title, and the reply tells you exactly which fields need an admin pass.

> Re-running `npm run bot` is required to pick up reply changes — the bot reads
> the code from your PC, not from the Worker.

## How it works

1. `bot/index.mjs` runs on your PC (`npm run bot`) and listens for DMs.
2. It HMAC-signs the raw message with `DISCORD_BOT_SECRET` and POSTs it to
   `https://roblox.zynx0286.workers.dev/api/discord-ingest`.
3. The Worker verifies the signature + timestamp (replay-proof), rate-limits
   per IP (60/hour), extracts every URL, resolves metadata from Roblox's and
   Discord's public APIs, dedupes, and stores the entry through the same
   sanitized path as the admin panel.
4. The bot replies with one embed per link: created / already added (with the
   matching entry's details) / couldn't resolve / error.

Alongside your Discord user id, step 2 sends `ownerId` — the Worker needs it to
DM you about things that happen with nobody watching (see below), and the
`GET /users/@me/channels` listing can't be relied on to rediscover it later.
The Worker validates the shape before storing it, so a malformed value is
dropped rather than persisted.

## Being told about things that happen later

The bot replies to you. It can't do the other half — a DM only arrives when you
send one — so the Worker also talks to Discord's REST API directly for the
events with nobody watching: a new entry going live, and a Monday summary of the
week. Full details, secrets and schedules are in
[maintenance.md → Notifications](./maintenance.md#notifications).

Two things to know before you expect a DM:

- **`DISCORD_BOT_TOKEN` must be set on the Worker** (not just in
  `.env.local`). Without it every notification is a silent no-op — by design,
  so a missing token can never break adding an entry.
- **Your user id registers itself on the first DM you send**, so there is no
  lookup step to do. If the first digest or announcement doesn't arrive, the
  id isn't stored yet; one more DM fixes it.

## One-time setup (~5 minutes)

### 1. Create the Discord application

1. https://discord.com/developers/applications → **New Application** → name it (e.g. "ZYN Portfolio") → Create.
2. **Bot** tab → **Reset Token** → copy it (starts with `MT…` or `M…`).
3. Same tab → **Privileged Gateway Intents** → enable **Message Content Intent** → Save.
4. **Installation** tab (or OAuth2 → URL Generator): scopes **`bot`** only —
   no permissions needed. Open the generated URL and add the bot to any server
   you're in (it never posts there; it only needs to exist so you can DM it).
5. In Discord: enable **"Allow direct messages from server members"** if
   prompted, then DM the bot once (any message) so the DM channel exists.
   This first DM is also what registers your user id for proactive
   notifications, so it's worth sending even before you have a link to add.

### 2. Local secrets (.env.local — already gitignored)

```
DISCORD_BOT_TOKEN=<the token from step 1.2>
DISCORD_BOT_SECRET=<already generated and set on the Worker; copy the same value>
```

`DISCORD_BOT_SECRET` was generated with `openssl rand -hex 32` equivalent and
uploaded with `npx wrangler secret put DISCORD_BOT_SECRET`. The bot and the
Worker must hold the **same** value. To rotate: set a new value on the Worker
and in `.env.local`, then restart the bot.

### 3. Run it

```
npm run bot:doctor   # preflight: token, intents, Worker secret match — fix any ✗ line
npm run bot
```

Leave the terminal open. First successful line:
`Bot logged in as <name> — DM me links to add portfolio entries.`

### 3b. Hosting it 24/7 on Wispbyte

#### Is it actually alive? (remote liveness)

A hosting panel only proves the process **started**. A crash-free gateway can
still sit effectively dead for hours (network flap, stalled socket) and look
fine from the console until the first DM goes unanswered. The running bot
therefore pings the Worker every 5 minutes (signed, same secret as ingest),
and `npm run bot:doctor` reports what it saw:

```
✓ Bot last seen (remote) — 2 minutes ago
✗ Bot last seen (remote) — 26h ago — STALE, the bot is probably down
```

Each heartbeat carries gateway health telemetry, not just presence: the
status label, gateway ping, reconnects since start, and failed DM replies
since start. The heartbeat lives in its own row (`zyn-bot-heartbeat-v1`,
Supabase-backed like everything else). Writes coalesce to one per 5-minute
window, and the ping is best-effort in both directions — a failed ping never
disturbs DM handling, and the doctor treats a re-ping after an outage as
normal. The doctor reads the health off the same line:

```
✓ Bot last seen (remote) — 2 minutes ago — gateway ready, ping 45ms
- Bot last seen (remote) — 4 minutes ago — gateway ready, 5 reconnect(s) … (gateway degraded)
```

Degraded-but-alive (reconnects all day, DMs erroring) is a warning line, not
a failure — a bot that reconnects constantly is about to be one that doesn't
reconnect at all.

One cleanup rides along: an earlier local simulation of the down→alert
scenario once wrote a `down-sim`-style status label, and because each ping
merges over the stored fields, that label stuck in every readout until the
bot's own gateway re-reported. `npm run bot:doctor` (and
`node scripts/test-liveness-smoke.mjs`) now detect any such simulation
residue on the heartbeat row and clear it — touching only the label, never
the last-seen time or the watch state, so a real outage is still reported
as-is; the bot's next ping rewrites a genuine status.

Staleness is reported, never acted on by the bot itself: the Worker runs an
hourly watch (`portfolio:bot-liveness`) that DMs you exactly when the answer
turns bad — one alert when the heartbeat goes stale, laddered re-alerts if the
outage lasts days, and a "came back after Xh" note when it recovers. Details
are in [maintenance.md → Bot-liveness alerts](./maintenance.md#bot-liveness-alerts).

The bot is a long-running gateway process — it can't live on Workers with the
rest of the site. Any always-on Node host works; for Wispbyte
(wispbyte.com) a bundle is generated for you:

```
npm run bot:pack     # → dist/wispbyte-bot/ + dist/wispbyte-bot.zip
```

Upload the bundle files in the panel's Files tab, set the startup command to
`node index.js` (env vars `DISCORD_BOT_TOKEN` + `DISCORD_BOT_SECRET`, same
values as locally), and Start — the full walkthrough is in
`dist/wispbyte-bot/README.txt`, and `bot/wispbyte/README.md` stays checked in
as the reference. Update flow: change the repo, `npm run bot:pack`, re-upload,
Restart.

## Using it

- DM a Roblox game URL → entry with title/description/icon/counter hookup
- DM a `discord.gg/…` invite → entry with server name + member counts
- Optional category override: first line `cat: SFX / Audio`, links after
- Multiple links in one message → multiple entries, one embed each
- No links → the bot replies with usage help
- Works with any link form: `roblox.com/games/<id>`, `www.`, trailing junk,
  `discord.gg/code`, `discord.com/invite/code`

## What the bot cannot do

- It only **adds** entries (deduped) — nothing is ever edited or deleted.
- It only listens to **DMs** — server messages are ignored.
- It holds only its own token and the HMAC secret; it has no admin access.
- If the secret leaks, the endpoint only accepts signed requests from whoever
  has it — rotate it (both sides) to shut them out.

## Troubleshooting

| Symptom                            | Fix                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `Used disallowed intents` on start | Message Content Intent not enabled (step 1.3)                                       |
| Bot replies ❌ 401                 | `DISCORD_BOT_SECRET` differs between `.env.local` and the Worker secret             |
| Bot replies ❌ 503                 | `DISCORD_BOT_SECRET` secret missing on the Worker                                   |
| ⚠️ Invite is invalid, expired…     | The invite doesn't resolve publicly (expired, or the guild disabled discovery data) |
| ⚠️ Roblox metadata unavailable     | Roblox API hiccup — resend the same link in a minute                                |
| Entries not on the site            | Cache: the site revalidates its store every 30s — wait half a minute                |
| No weekly digest, no announcement  | `DISCORD_BOT_TOKEN` not set on the Worker — notifications are no-ops without it     |
| Still nothing after a second DM    | Your user id didn't register; check the `zyn-notify-v1` row in `supabase_kv`        |
