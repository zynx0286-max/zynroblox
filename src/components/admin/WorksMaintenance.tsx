import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, Bot, GitMerge, Loader2, RefreshCw, Send, X } from "lucide-react";
import { captureError } from "@/lib/sentry";
import type { ActivityKind } from "@/lib/store";
import {
  botHealthFn,
  findDuplicateWorks,
  listRecentActivity,
  mergeWorksFn,
  previewDigest,
  previewWorkMerge,
  refreshRobloxMetadataFn,
  sendTestDigest,
} from "@/lib/works.functions";
import type { TestDigestResult } from "@/lib/works.functions";
import { cooldownSeconds, TEST_DIGEST_COOLDOWN_MS } from "@/lib/notify-throttle";

/** Badge tone per activity kind, kept out of JSX so the chain stays readable. */
function activityTone(kind: ActivityKind): string {
  switch (kind) {
    case "entry.published":
      return "bg-emerald-500/20 text-emerald-500";
    case "entry.unpublished":
      return "bg-amber-500/20 text-amber-600";
    case "entry.placeholder":
      return "bg-amber-500/20 text-amber-600";
    case "entry.merged":
      return "bg-violet-500/15 text-violet-500";
    case "refresh.ran":
      return "bg-blue-500/15 text-blue-500";
    default:
      return "bg-secondary/50 text-muted-foreground";
  }
}

/**
 * Plain-English outcome for the digest test send. The transport reasons are
 * deliberately vague (they end up in logs), so the panel is where they get
 * translated into the thing to fix.
 */
function testDigestNotice(result: TestDigestResult): string {
  if (result.sent) {
    return result.willSend
      ? "Sent to your Discord DMs — the same card the Monday cron would send."
      : "Sent to your Discord DMs. This week is quiet, so the real cron would skip it.";
  }
  switch (result.reason) {
    case "not configured":
      return "Not sent — no Discord bot token is configured. Set DISCORD_BOT_TOKEN first.";
    case "muted or no owner registered":
      return "Not sent — notifications are muted, or the bot hasn't registered your Discord id yet. DM the bot once.";
    case "no DM channel with the bot yet":
      return "Not sent — the bot has no DM with you yet. Message it once, then try again.";
    case "discord error":
      return "Not sent — Discord rejected the message. Check the bot token and that the bot can DM you.";
    case "cooldown":
      return `Not sent — wait ${result.retryAfterSec ?? 30}s between test DMs so Discord isn't spammed.`;
    default:
      return `Not sent — ${result.reason}.`;
  }
}

/**
 * Owner-only maintenance for the works list: fold duplicate entries together,
 * and fill in anything Roblox is missing.
 *
 * Both actions share their rules with scripts/works-admin.mjs and the nightly
 * cron task (all three import from lib/store-cas and lib/roblox-refresh), so the
 * admin panel can't quietly disagree with the CLI or the scheduler.
 */
export function WorksMaintenance() {
  const qc = useQueryClient();
  const findDupes = useServerFn(findDuplicateWorks);
  const preview = useServerFn(previewWorkMerge);
  const merge = useServerFn(mergeWorksFn);
  const refresh = useServerFn(refreshRobloxMetadataFn);
  const recentActivity = useServerFn(listRecentActivity);
  const botHealth = useServerFn(botHealthFn);
  const digestPreview = useServerFn(previewDigest);
  const sendDigestTest = useServerFn(sendTestDigest);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [changes, setChanges] = useState<Array<{ field: string; from: string; to: string }> | null>(
    null,
  );
  const [testResult, setTestResult] = useState<TestDigestResult | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  // Re-render once a second while a cooldown runs so the countdown is honest.
  const [, setClock] = useState(0);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      setClock((tick) => tick + 1);
      if (Date.now() >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeft = cooldownSeconds(cooldownUntil - Date.now());

  const dupesQuery = useQuery({ queryKey: ["admin-work-dupes"], queryFn: () => findDupes() });
  const groups = dupesQuery.data ?? [];
  const activityQuery = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => recentActivity(),
  });
  const activity = activityQuery.data ?? [];
  const healthQuery = useQuery({
    queryKey: ["admin-bot-health"],
    queryFn: () => botHealth(),
  });
  const health = healthQuery.data ?? null;
  const digestQuery = useQuery({
    queryKey: ["admin-digest-preview"],
    queryFn: () => digestPreview(),
  });
  const digest = digestQuery.data ?? null;

  const onError = (err: unknown) => {
    captureError(err, { area: "admin" });
    setError(err instanceof Error ? err.message : "Something went wrong");
    setNotice(null);
  };

  const done = (message: string) => {
    setError(null);
    setNotice(message);
    void qc.invalidateQueries({ queryKey: ["admin-work-dupes"] });
    void qc.invalidateQueries({ queryKey: ["admin-works"] });
    void qc.invalidateQueries({ queryKey: ["works"] });
    void qc.invalidateQueries({ queryKey: ["admin-activity"] });
    void qc.invalidateQueries({ queryKey: ["admin-digest-preview"] });
  };

  // Show what the merge would change before committing to it: merging deletes
  // a public page, so it should never be a one-click surprise.
  const previewMutation = useMutation({
    mutationFn: (v: { keepSlug: string; dropSlugs: string[] }) =>
      preview({ data: { keepSlug: v.keepSlug, dropSlugs: v.dropSlugs } }),
    onSuccess: (result) => setChanges(result.changes),
    onError,
  });

  const mergeMutation = useMutation({
    mutationFn: (v: { keepSlug: string; dropSlugs: string[] }) =>
      merge({ data: { keepSlug: v.keepSlug, dropSlugs: v.dropSlugs } }),
    onSuccess: (result) => {
      setOpenGroup(null);
      setChanges(null);
      done(
        `Merged ${result.removed.length} entr${result.removed.length === 1 ? "y" : "ies"} into "${result.keepSlug}".`,
      );
    },
    onError,
  });

  const testSendMutation = useMutation({
    mutationFn: () => sendDigestTest(),
    onSuccess: (result) => {
      setError(null);
      setNotice(null);
      setTestResult(result);
      // The server claims a slot on every attempt, so mirror its cooldown here:
      // the button should be dark exactly as long as another send would be
      // refused, and no longer than the server said.
      setCooldownUntil(
        Date.now() + (result.retryAfterSec ?? TEST_DIGEST_COOLDOWN_MS / 1000) * 1000,
      );
    },
    onError,
  });

  const refreshMutation = useMutation({
    mutationFn: () => refresh(),
    onSuccess: (report) => {
      const parts = [`checked ${report.checked}`];
      if (report.filled.length > 0) parts.push(`filled ${report.filled.length}`);
      if (report.renames.length > 0) parts.push(`${report.renames.length} need review`);
      if (report.unavailable.length > 0) parts.push(`${report.unavailable.length} unavailable`);
      done(`Roblox refresh: ${parts.join(" · ")}.`);
    },
    onError,
  });

  return (
    <div className="glass-card mt-6 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Maintenance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Folds duplicate entries together and fills in anything Roblox is missing. Fills empty
            fields only — curated titles and images are never overwritten.
          </p>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-display text-xs disabled:opacity-50"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh from Roblox
        </button>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {dupesQuery.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Checking for duplicates…</p>
      ) : null}

      {!dupesQuery.isPending && groups.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No duplicate games — every entry points at a different Roblox place.
        </p>
      ) : null}

      {groups.map((group) => {
        const open = openGroup === group.placeId;
        const keep = group.works.find((w) => w.slug === group.keepSlug);
        return (
          <div key={group.placeId} className="mt-4 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-display text-sm font-semibold">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Duplicate Roblox game — place {group.placeId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.works.length} entries point at the same game.
                </p>
              </div>
              <div className="flex gap-2">
                {open ? (
                  <button
                    aria-label="Close"
                    onClick={() => {
                      setOpenGroup(null);
                      setChanges(null);
                    }}
                    className="rounded-full border border-border p-2"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setOpenGroup(group.placeId);
                    setChanges(null);
                    setError(null);
                    previewMutation.mutate({
                      keepSlug: group.keepSlug,
                      dropSlugs: group.dropSlugs,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-xs text-primary-foreground"
                >
                  <GitMerge className="size-3.5" /> Review merge
                </button>
              </div>
            </div>

            <ul className="mt-3 space-y-1 text-xs">
              {group.works.map((w) => (
                <li key={w.slug} className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-display ${
                      w.slug === group.keepSlug
                        ? "bg-primary/20 text-primary"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {w.slug === group.keepSlug ? "keep" : "merge in"}
                  </span>
                  <span className="font-medium">{w.title}</span>
                  <span className="text-muted-foreground">({w.slug})</span>
                </li>
              ))}
            </ul>

            {open ? (
              <div className="mt-4 rounded-xl bg-secondary/30 p-4">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{keep?.title}</strong> survives and keeps its
                  URL, so existing links and edits carry over. Everything below moves across, field
                  by field.
                </p>

                {previewMutation.isPending ? (
                  <p className="mt-3 text-xs text-muted-foreground">Working out the changes…</p>
                ) : null}

                {changes ? (
                  changes.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Nothing to move across — the surviving entry already has the best of both.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-1.5 text-xs">
                      {changes.map((c) => (
                        <li key={c.field} className="flex flex-wrap items-center gap-2">
                          <span className="w-24 shrink-0 font-display">{c.field}</span>
                          <span className="text-muted-foreground line-through">
                            {c.from || "—"}
                          </span>
                          <span>→</span>
                          <span className="font-medium">{c.to}</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    disabled={mergeMutation.isPending}
                    onClick={() => {
                      const dropped = group.dropSlugs.join(", ");
                      const count = group.dropSlugs.length;
                      if (
                        !window.confirm(
                          `Merge ${count} ${count === 1 ? "entry" : "entries"} into ` +
                            `"${group.keepSlug}"?\n\nTheir public pages will stop resolving: ${dropped}`,
                        )
                      ) {
                        return;
                      }
                      mergeMutation.mutate({
                        keepSlug: group.keepSlug,
                        dropSlugs: group.dropSlugs,
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 font-display text-xs text-primary-foreground disabled:opacity-50"
                  >
                    {mergeMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <GitMerge className="size-3.5" />
                    )}
                    Merge {group.dropSlugs.length}{" "}
                    {group.dropSlugs.length === 1 ? "entry" : "entries"}
                  </button>
                  <button
                    onClick={() => {
                      setOpenGroup(null);
                      setChanges(null);
                    }}
                    className="rounded-full border border-border px-4 py-2 font-display text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {/* The hosted bot's remote health — the same data the doctor reads and
          the weekly digest summarises, so the panel answers "is the bot OK?"
          without a terminal. */}
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
            <Bot className="size-4" /> Hosted bot health
          </h3>
          <span className="text-xs text-muted-foreground">
            Pings the site every 5 min · checked hourly by the liveness watch
          </span>
        </div>
        {healthQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Checking…</p>
        ) : !health ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No heartbeat data yet — the bot reports once it has pinged the site.
          </p>
        ) : (
          <div className="mt-3 space-y-1.5 text-xs">
            <p className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-display ${
                  health.digestLine && health.digestLine.startsWith("🚨")
                    ? "bg-destructive/15 text-destructive"
                    : health.degraded
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-emerald-500/15 text-emerald-600"
                }`}
              >
                {health.digestLine && health.digestLine.startsWith("🚨")
                  ? "DOWN"
                  : health.degraded
                    ? "DEGRADED"
                    : "UP"}
              </span>
              <span>{health.lastSeenLabel ?? "never pinged"}</span>
            </p>
            {health.digestLine ? (
              <p className="text-muted-foreground">{health.digestLine}</p>
            ) : null}
            {health.heartbeat &&
            (health.heartbeat.pingMs !== undefined ||
              health.heartbeat.reconnects !== undefined ||
              health.heartbeat.dmErrors !== undefined) ? (
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {health.heartbeat.status ? <span>gateway: {health.heartbeat.status}</span> : null}
                {health.heartbeat.pingMs !== undefined ? (
                  <span>ping: {health.heartbeat.pingMs}ms</span>
                ) : null}
                {health.heartbeat.reconnects !== undefined ? (
                  <span>reconnects: {health.heartbeat.reconnects}</span>
                ) : null}
                {health.heartbeat.dmErrors !== undefined ? (
                  <span>DM errors: {health.heartbeat.dmErrors}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* The digest itself, built by the same code the cron runs, so what the
          owner reads here mid-week is the card that arrives on Monday. */}
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-sm font-semibold">Weekly digest preview</h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {digest
                ? `Window ${digest.from.slice(0, 10)} → ${digest.to.slice(0, 10)}`
                : "Last 7 days · sent Mondays 08:43 UTC"}
            </span>
            <button
              onClick={() => {
                setTestResult(null);
                testSendMutation.mutate();
              }}
              disabled={testSendMutation.isPending || cooldownLeft > 0}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-display text-xs disabled:opacity-50"
            >
              {testSendMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {cooldownLeft > 0 ? `Send test DM (${cooldownLeft}s)` : "Send test DM"}
            </button>
          </div>
        </div>

        {testResult ? (
          <p
            className={`mt-3 rounded-xl border px-4 py-2.5 text-xs ${
              testResult.sent
                ? "border-border bg-secondary/30"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {testDigestNotice(testResult)}
          </p>
        ) : null}

        {digestQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Building the digest…</p>
        ) : null}
        {digestQuery.isError ? (
          <p className="mt-3 text-xs text-destructive">
            Couldn't build the digest preview — the activity log couldn't be read.
          </p>
        ) : null}

        {digest ? (
          <>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded px-1.5 py-0.5 font-display ${
                  digest.willSend
                    ? "bg-blue-500/15 text-blue-500"
                    : "bg-secondary/60 text-muted-foreground"
                }`}
              >
                {digest.willSend ? "WOULD SEND" : "SKIPPED"}
              </span>
              <span className="text-muted-foreground">
                {digest.willSend
                  ? "The Monday cron would DM this card."
                  : "Nothing in the window, so the cron stays silent instead of sending an empty card."}
              </span>
            </p>

            <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-4">
              <p className="font-display text-sm font-semibold">{digest.embed.title}</p>
              {digest.embed.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{digest.embed.description}</p>
              ) : null}
              {(digest.embed.fields ?? []).map((field) => (
                <div key={field.name} className="mt-3">
                  <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {field.name}
                  </p>
                  <p className="mt-0.5 text-xs">{field.value}</p>
                </div>
              ))}
              {digest.embed.footer ? (
                <p className="mt-3 border-t border-border pt-2 text-[0.65rem] text-muted-foreground">
                  {digest.embed.footer.text}
                </p>
              ) : null}
            </div>

            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {digest.counts
                .filter((c) => c.count > 0)
                .map((c) => (
                  <span key={c.kind}>
                    {c.kind}: <span className="text-foreground">{c.count}</span>
                  </span>
                ))}
              {digest.counts.every((c) => c.count === 0) ? (
                <span>Nothing in the window.</span>
              ) : null}
            </p>

            {digest.older > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {digest.older} older record{digest.older === 1 ? " is" : "s are"} outside the window
                — the digest only reports the last 7 days.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {/* The persisted activity log — the same records the weekly Discord
          digest summarises, so a refresh result is readable here too. */}
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-sm font-semibold">Recent activity</h3>
          <span className="text-xs text-muted-foreground">
            Also summarised in the weekly Discord digest
          </span>
        </div>
        {activityQuery.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
        ) : null}
        {!activityQuery.isPending && activity.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nothing logged yet. New entries, publish/draft changes, merges and nightly refresh runs
            appear here.
          </p>
        ) : null}
        <ul className="mt-3 space-y-1.5 text-xs">
          {activity.slice(0, 15).map((a, i) => (
            <li key={`${a.at}-${i}`} className="flex flex-wrap items-baseline gap-2">
              <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                {new Date(a.at).toISOString().slice(5, 16).replace("T", " ")}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-display ${activityTone(a.kind)}`}
              >
                {a.kind}
              </span>
              <span>{a.summary}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
