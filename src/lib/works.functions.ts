import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { loadStore, mutate, appendActivity, getActivity, ACTIVITY_KINDS } from "@/lib/store";
import type { ActivityEntry, ActivityKind } from "@/lib/store";
import { getBotHeartbeat, getBotLastLiveness } from "@/lib/bot-heartbeat";
import { formatLastSeen, healthIsDegraded, type BotHeartbeat } from "@/lib/bot-heartbeat-rules";
import { livenessDigestLine } from "@/lib/bot-liveness-rules";
import { diffWorks, findDuplicateGroups, mergeWorks, preferredSurvivor } from "@/lib/store-cas";
import { fetchRobloxMetadata, placeIdOf, planRefresh } from "@/lib/roblox-refresh";
import type { Work } from "@/data/works";
import { safeExternalUrl } from "@/lib/url";
import { isOwnerRequest } from "@/lib/request-owner";
import { filterVisibleWorks, WORK_STATUSES, type WorkStatus } from "@/lib/work-visibility";
import { statusActivity, type StatusChange } from "@/lib/work-activity";
import { buildDigest } from "@/lib/digest";
import { buildDigestEmbed, type Embed } from "@/lib/notify-embeds";
import { notifyOwnerDm } from "@/lib/discord-notify";
import { claimTestDigestSlot } from "@/lib/notify-config";
import { SITE_URL } from "@/data/works";

export type DbWork = Work & { id: string; sortOrder: number; status: WorkStatus };

function sorted(works: DbWork[]): DbWork[] {
  return [...works].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Public: every project, ordered for display. Drafts are filtered out unless
 * the caller is the signed-in owner, so the owner can preview an unfinished
 * entry on the real page while visitors get a 404 for it.
 *
 * The same server function answers both cases: the owner cookie rides along on
 * the loader's request (SSR and client navigation), and `filterVisibleWorks`
 * decides. Anything that must be public no matter who asks (the sitemap) uses
 * `getPublishedWorks` instead.
 */
export const listWorks = createServerFn({ method: "GET" }).handler(async (): Promise<DbWork[]> => {
  const works = sorted((await loadStore()).works);
  return filterVisibleWorks(works, await isOwnerRequest());
});

// `z.string().url()` accepts `javascript:` URLs — every work link/image ends
// up in an href/src attribute, so only genuine https URLs (or empty) pass.
const httpsUrlOrEmpty = z
  .string()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\//i.test(v.trim()), "Use an https:// URL (or leave empty)")
  .default("");

export const workInput = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  title: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  role: z.string().max(120).default(""),
  description: z.string().max(2000).default(""),
  tags: z.array(z.string().max(40)).max(12).default([]),
  href: httpsUrlOrEmpty,
  linkLabel: z.string().max(60).default(""),
  imageUrl: httpsUrlOrEmpty,
  featured: z.boolean().default(false),
  status: z.enum(WORK_STATUSES).default("published"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type WorkInput = z.infer<typeof workInput>;

function toWork(data: WorkInput, id: string): DbWork {
  // Server-side re-check (validator already enforces https) so legacy rows
  // and programmatic callers can't smuggle unsafe schemes through.
  const href = safeExternalUrl(data.href);
  const image = safeExternalUrl(data.imageUrl);
  return {
    id,
    slug: data.slug,
    title: data.title,
    category: data.category as Work["category"],
    role: data.role,
    description: data.description,
    tags: data.tags,
    ...(href ? { href } : {}),
    ...(data.linkLabel ? { linkLabel: data.linkLabel } : {}),
    ...(image ? { image } : {}),
    featured: data.featured,
    status: data.status,
    sortOrder: data.sortOrder,
  };
}

/** Admin: full list (same data, but gated by the owner session). */
export const adminListWorks = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<DbWork[]> => {
    return sorted((await loadStore()).works);
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => {
    return true as const;
  });

export const createWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => workInput.parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      if (store.works.some((w) => w.slug === data.slug)) {
        throw new Error("A project with this slug already exists");
      }
      store.works.push(toWork(data, crypto.randomUUID()));
    });
    return { ok: true as const };
  });

/**
 * Best-effort audit line for a publish/draft change, whichever control made
 * it (the editor's Visibility select or the list's one-click toggle). Losing a
 * log line must never fail the change itself, so failures are swallowed.
 */
async function recordStatusChange(change: StatusChange): Promise<void> {
  await appendActivity([statusActivity(change)]).catch(() => {});
}

export const updateWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => workInput.extend({ id: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const statusChange = await mutate((store) => {
      const idx = store.works.findIndex((w) => w.id === id);
      if (idx === -1) throw new Error("Project not found");
      const slugTaken = store.works.some((w) => w.id !== id && w.slug === rest.slug);
      if (slugTaken) throw new Error("A project with this slug already exists");
      const before = store.works[idx];
      const next = toWork(rest, id);
      store.works[idx] = next;
      return before && before.status !== next.status
        ? { title: next.title, slug: next.slug, status: next.status, source: "editor" as const }
        : null;
    });
    if (statusChange) await recordStatusChange(statusChange);
    return { ok: true as const };
  });

/**
 * Owner-only: flips a work between draft and published without touching any
 * other field. The admin list uses it for one-click publish/unpublish, so the
 * common case doesn't require opening the editor and re-saving every field.
 */
export const setWorkStatus = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().min(1).max(120),
        status: z.enum(WORK_STATUSES),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const change = await mutate((store) => {
      const work = store.works.find((w) => w.id === data.id);
      if (!work) throw new Error("Project not found");
      if (work.status === data.status) return null; // already there — nothing to log
      work.status = data.status;
      return { title: work.title, slug: work.slug, status: data.status, source: "toggle" as const };
    });
    if (change) await recordStatusChange(change);
    return { ok: true as const, status: data.status };
  });

export const deleteWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.works = store.works.filter((w) => w.id !== data.id);
    });
    return { ok: true as const };
  });

/**
 * Moves a work one position up/down in display order by SWAPPING sortOrders
 * with its neighbor. The previous set-a-number approach collided whenever two
 * entries shared a sortOrder (ties made the arrows no-ops) and drifted out of
 * sync with the visible list. Boundary moves are a no-op, not an error.
 */
export const reorderWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z.object({ id: z.string().min(1).max(120), direction: z.enum(["up", "down"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    await mutate((store) => {
      const sorted = [...store.works].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((w) => w.id === data.id);
      if (idx === -1) throw new Error("Project not found");
      const swapWith = data.direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return; // already at the edge
      const current = sorted[idx];
      const neighbor = sorted[swapWith];
      if (!current || !neighbor) return;
      // Legacy rows can share a sortOrder — renormalize first so the swap
      // genuinely changes the visible order.
      if (neighbor.sortOrder === current.sortOrder) {
        sorted.forEach((w, i) => {
          w.sortOrder = i;
        });
      }
      const tmp = current.sortOrder;
      current.sortOrder = neighbor.sortOrder;
      neighbor.sortOrder = tmp;
    });
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Duplicate detection & merging
//
// The bot can end up with two entries for one game when Roblox metadata was
// rate-limited on the first DM (it creates a placeholder so the link isn't
// lost) and the game was already in the portfolio. These functions surface
// that and fold the two entries together using the same field-by-field rules
// as scripts/works-admin.mjs — both import from lib/store-cas, so the CLI,
// the admin panel and the tests can never disagree about what a merge does.
// ---------------------------------------------------------------------------

export type DuplicateGroup = {
  placeId: string;
  /** Slug of the entry that should survive (the most complete one). */
  keepSlug: string;
  /** Slugs that would be folded into it. */
  dropSlugs: string[];
  works: Array<{ id: string; slug: string; title: string; href?: string }>;
};

/** Groups entries that point at the same Roblox place. */
export const findDuplicateWorks = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<DuplicateGroup[]> => {
    const works = (await loadStore()).works;
    const groups = findDuplicateGroups(works);
    return groups.map((group) => {
      const survivor = preferredSurvivor(group.works);
      return {
        placeId: group.placeId,
        keepSlug: survivor.slug,
        dropSlugs: group.works.filter((w) => w.slug !== survivor.slug).map((w) => w.slug),
        works: group.works.map((w) => ({
          id: w.id,
          slug: w.slug,
          title: w.title,
          ...(w.href ? { href: w.href } : {}),
        })),
      };
    });
  });

/**
 * Folds every entry listed in `dropSlugs` into `keepSlug`, keeping the richest
 * value of each field. The survivor keeps its own slug and id, so its public
 * URL and any admin edits survive; the dropped pages stop resolving, which is
 * why the admin panel confirms before calling this.
 */
export const mergeWorksFn = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({
        keepSlug: z.string().min(1).max(80),
        dropSlugs: z.array(z.string().min(1).max(80)).min(1).max(20),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { keepSlug, dropSlugs } = data;
    if (dropSlugs.includes(keepSlug)) throw new Error("Cannot merge an entry into itself");
    await mutate((store) => {
      const keep = store.works.find((w) => w.slug === keepSlug);
      if (!keep) throw new Error("The entry to keep no longer exists");
      for (const slug of dropSlugs) {
        if (slug === keepSlug) continue;
        const drop = store.works.find((w) => w.slug === slug);
        if (!drop) continue; // already gone — not an error, just nothing to do
        Object.assign(
          keep,
          mergeWorks(
            keep as unknown as Record<string, unknown>,
            drop as unknown as Record<string, unknown>,
          ) as DbWork,
        );
        store.works = store.works.filter((w) => w.slug !== slug);
      }
    });
    // Best-effort: recorded after the merge lands, and never able to fail it.
    await appendActivity([
      {
        at: new Date().toISOString(),
        kind: "entry.merged",
        summary: `${dropSlugs.length} duplicate(s) → ${keepSlug}`,
        slug: keepSlug,
        detail: { merged: dropSlugs.length },
      },
    ]).catch(() => {});
    return { ok: true as const, keepSlug, removed: dropSlugs };
  });

/** Fields a merge would change on the surviving entry (dry-run preview). */
export const previewWorkMerge = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({
        keepSlug: z.string().min(1).max(80),
        dropSlugs: z.array(z.string().min(1).max(80)).min(1).max(20),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { keepSlug, dropSlugs } = data;
    const works = (await loadStore()).works;
    const keep = works.find((w) => w.slug === keepSlug);
    if (!keep) throw new Error("The entry to keep no longer exists");
    let merged = keep as unknown as Record<string, unknown>;
    for (const slug of dropSlugs) {
      const drop = works.find((w) => w.slug === slug);
      if (!drop || slug === keepSlug) continue;
      merged = mergeWorks(merged, drop as unknown as Record<string, unknown>);
    }
    // diffWorks returns `unknown` values, which can't cross the server-fn
    // boundary — they're rendered as text anyway, so stringify here.
    const changes = diffWorks(keep as unknown as Record<string, unknown>, merged).map((c) => ({
      field: c.field,
      from: preview(c.dropped),
      to: preview(c.kept),
    }));
    return {
      keepSlug,
      dropSlugs: dropSlugs.filter((s) => s !== keepSlug && works.some((w) => w.slug === s)),
      changes,
    };
  });

/** Short, readable rendering of a field value for the merge preview. */
function preview(value: unknown): string {
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 79)}…` : value;
  if (value === undefined || value === null) return "—";
  const json = JSON.stringify(value);
  return json.length > 80 ? `${json.slice(0, 79)}…` : json;
}

// ---------------------------------------------------------------------------
// Roblox metadata refresh (also runs nightly from the Cloudflare cron task)
// ---------------------------------------------------------------------------

/**
 * Re-checks entries against Roblox and fills in anything missing. Curated
 * values are never overwritten — differences are only reported. See
 * lib/roblox-refresh.ts for the exact rules.
 */
export const refreshRobloxMetadataFn = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .handler(async () => {
    const store = await loadStore();
    const metaBySlug = await fetchRobloxMetadata(store.works, store.universeIds);
    const report = planRefresh(store.works, metaBySlug);

    if (report.filled.length > 0) {
      await mutate((s) => {
        for (const change of report.filled) {
          const work = s.works.find((w) => w.slug === change.slug);
          if (work) Object.assign(work, { [change.field]: change.to });
        }
        // Remember newly resolved universe ids so the next refresh (and the
        // live visit counter) don't have to look them up again.
        for (const [slug, meta] of metaBySlug) {
          if (!meta?.universeId) continue;
          const work = s.works.find((w) => w.slug === slug);
          const placeId = placeIdOf(work?.href);
          if (placeId) s.universeIds[placeId] = meta.universeId;
        }
      });
    }
    return report;
  });

/**
 * The activity log, newest first — what the bot added, what was merged, and
 * what every nightly refresh run found. Stored in its own row (see store.ts)
 * so it never bloats the CMS document, and surfaced here so a refresh result is
 * readable days later instead of only in a build log.
 */
export const listRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<ActivityEntry[]> => {
    const entries = await getActivity();
    return entries.slice(-100).reverse();
  });

/**
 * The digest for the window ending now, plus the card the cron would DM. One
 * builder for the preview and the test send, so neither can show something the
 * Monday task wouldn't.
 */
async function buildCurrentDigest() {
  const now = new Date();
  const entries = await getActivity();
  const digest = buildDigest(entries, now, 7);
  const [heartbeat, state] = await Promise.all([getBotHeartbeat(), getBotLastLiveness()]);
  return {
    entries,
    digest,
    embed: buildDigestEmbed(digest, SITE_URL, {
      state,
      nowMs: now.getTime(),
      heartbeat,
    }),
  };
}

/**
 * Owner-only preview of the weekly digest. The panel renders the exact embed the
 * cron would DM, so a quiet week (or a missing field) is something the owner can
 * see mid-week instead of discovering it on Monday morning.
 */
export type DigestPreview = {
  /** The window the cron uses, as ISO timestamps. */
  from: string;
  to: string;
  /** True when the cron would send the DM; a quiet week is skipped. */
  willSend: boolean;
  /** The card itself — same builder the scheduled task uses. */
  embed: Embed;
  /** Per-kind totals for the window, in the canonical display order. */
  counts: Array<{ kind: ActivityKind; count: number }>;
  /** Records older than the window; they explain why a busy log can look quiet. */
  older: number;
};

export const previewDigest = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<DigestPreview> => {
    const { entries, digest, embed } = await buildCurrentDigest();
    const from = Date.parse(digest.from);
    return {
      from: digest.from,
      to: digest.to,
      willSend: !digest.quiet,
      embed,
      counts: ACTIVITY_KINDS.map((kind) => ({ kind, count: digest.counts[kind] ?? 0 })),
      older: entries.filter((entry) => Date.parse(entry.at) < from).length,
    };
  });

/**
 * Owner-only test send: DMs the current digest card to the owner right now, so
 * the Discord path can be proven without waiting for Monday (or hoping the week
 * was busy). It sends even on a quiet week — the point is testing the transport,
 * which the panel then explains.
 */
export type TestDigestResult = {
  sent: boolean;
  /** Transport reason when it didn't go out: "not configured", "discord error", … */
  reason: string;
  /** Whether this week's real digest would have been sent by the cron. */
  willSend: boolean;
  /** Set when throttled: how long until another test send is allowed. */
  retryAfterSec?: number;
};

export const sendTestDigest = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .handler(async (): Promise<TestDigestResult> => {
    const { digest, embed } = await buildCurrentDigest();
    // A double click must not land two DMs in the channel. The claim is shared
    // across isolates (see notify-config), so a button that re-enables too early
    // on another instance still can't send twice.
    const waitMs = await claimTestDigestSlot(Date.now());
    if (waitMs > 0) {
      return {
        sent: false,
        reason: "cooldown",
        willSend: !digest.quiet,
        retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)),
      };
    }
    const result = await notifyOwnerDm(embed);
    return {
      sent: result.sent,
      reason: result.reason ?? "sent",
      willSend: !digest.quiet,
    };
  });

/** Owner-only bot health snapshot: what the admin Maintenance card renders. */
export type BotHealthSnapshot = {
  /** "moments ago"-style last-seen label, or null when nothing has pinged. */
  lastSeenLabel: string | null;
  degraded: boolean;
  /** Telemetry from the latest ping (absent on legacy rows). */
  heartbeat: {
    status?: string | undefined;
    pingMs?: number | undefined;
    reconnects?: number | undefined;
    dmErrors?: number | undefined;
  } | null;
  /** The liveness watch's last evaluation (side + when things went wrong). */
  state: {
    side: "fresh" | "down";
    degradedSince?: number | null;
    downSince?: number | null;
  } | null;
  /** The same line the weekly digest would show, or null when all-clear. */
  digestLine: string | null;
};

export const botHealthFn = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<BotHealthSnapshot> => {
    const nowMs = Date.now();
    const [heartbeat, state] = await Promise.all([getBotHeartbeat(), getBotLastLiveness()]);
    return {
      lastSeenLabel: heartbeat ? formatLastSeen(heartbeat, nowMs) : null,
      degraded: healthIsDegraded(heartbeat),
      heartbeat: heartbeat
        ? {
            status: heartbeat.status,
            pingMs: heartbeat.pingMs,
            reconnects: heartbeat.reconnects,
            dmErrors: heartbeat.dmErrors,
          }
        : null,
      state: state
        ? {
            side: state.side,
            degradedSince: state.degradedSince ?? null,
            downSince: state.downSince ?? null,
          }
        : null,
      digestLine: livenessDigestLine(state, nowMs),
    };
  });
