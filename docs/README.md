# Documentation

| Doc                                      | Covers                                                        |
| ---------------------------------------- | ------------------------------------------------------------- |
| [supabase-setup.md](./supabase-setup.md) | Postgres backend, KV mirror, and the concurrency model        |
| [discord-bot.md](./discord-bot.md)       | The DM bot: setup, secrets, and every reply format            |
| [maintenance.md](./maintenance.md)       | Merging duplicates, refreshing Roblox metadata, the cron jobs |
| [works-cli.md](./works-cli.md)           | `scripts/works-admin.mjs` reference                           |

## Commands

```bash
npm run dev        # local dev server (file-backed, never touches production)
npm run build      # production build
npm run deploy     # build + deploy to Cloudflare Workers
npm test           # unit tests (concurrency, refresh rules, digest)
npm run test:smoke # live end-to-end check of the DM ingest endpoint
npm run bot        # Discord bot (runs on your machine, not on Workers)
```

`npm test` needs Node 24+ — the suite imports `.ts` files directly and relies
on native type stripping, so there is no test runner to install.

Because there is no bundler in the way, **test files must import each other and
their subjects with relative `.ts` paths** (`./digest.ts`), never the `@/`
alias. The same applies to any module a test file pulls in. Code that has to
stay importable from a test is split off from code that needs the store or the
secrets — that is why the Discord embed builders live in
`src/lib/notify-embeds.ts` rather than beside the transports that send them.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`:
typecheck → unit tests → lint → build.

Two of those steps catch things review can't:

- **The unit tests** guard a silent data-loss bug (one Worker isolate reverting
  another's edit). It produces no error, no failed request, and no visible
  symptom until someone notices an edit vanished.
- **The build** is where the Nitro tasks wired to the Cloudflare cron triggers
  and the server-function serializability rules are actually validated; `tsc`
  alone passes with a task that never gets bundled.

Lint is **blocking**. The old baseline was mostly noise from one root cause:
`core.autocrlf` checks files out with CRLF while Prettier expects LF, so a
checkout could fail a formatting check without a single character having
changed. `.prettierrc` now sets `"endOfLine": "auto"`. The remaining
`react-refresh/only-export-components` warnings are known and tolerated.
