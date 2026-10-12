Wispbyte hosting folder — read this first
=========================================

WHAT'S IN HERE
package.json — trimmed manifest (discord.js only) for the panel's Files tab
README.md — this file (panel walkthrough)

THE BOT HEALTh SOURCE OF TRUTH IS THE REPO, NOT THIS FOLDER
Run `npm run bot:pack` from the repo root: it builds a ready-to-upload
bundle into dist/wispbyte-bot/ (index.js copied verbatim from the live
bot source, package.json, README.txt) plus dist/wispbyte-bot.zip.

Prefer the generated bundle — it always matches the current repo code.
This folder's package.json is the checked-in fallback listing what the
bundle will contain.

PANEL WALKTHROUGH (details in dist/wispbyte-bot/README.txt before upload)

1. Wispbyte → create server → Node.js image
2. Files tab → delete old upload, drag in the bundle files (flat)
3. Startup tab → BOT START `node index.js`
   Additional Node Packages: leave empty
   Env vars: DISCORD_BOT_TOKEN, DISCORD_BOT_SECRET (same value as the
   Worker secret of that name)
4. Console → Start → expect "Bot logged in as <name> — DM me links…"
5. DM the bot once so your user id registers for proactive notifications

UPDATE FLOW
Repo edit → npm run bot:pack → upload new files from dist/wispbyte-bot/
→ Console → Restart. Never edit index.js directly on the panel.
