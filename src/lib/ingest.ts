// Discord DM bot ingestion: turns a raw DM message into portfolio entries.
//
// The bot (bot/index.mjs) signs the whole message with DISCORD_BOT_SECRET and
// POSTs it to /api/discord-ingest. This module is the server side: it pulls
// every URL out of the text, resolves metadata (Roblox game title/description/
// icon via the same public APIs the live-stats counter uses; Discord server
// name/member counts via the public invite endpoint), dedupes against the
// existing store, and creates work entries through the same `mutate()` +
// `safeExternalUrl` path the admin panel uses — so bot entries are
// admin-editable and Roblox games immediately feed the visit counter.
//
// SECURITY: every outbound URL re-checks through safeExternalUrl (https only);
// metadata fetches are bounded (8s timeout); writes are serialized by
// mutate(); the route layer owns authentication and rate limiting.

import { safeExternalUrl } from "@/lib/url";
import { loadStore, mutate } from "@/lib/store";
import { isPlaceholderTitle } from "@/lib/store-cas";
import { appendActivity, type ActivityEntry } from "@/lib/store";
import { buildEntryAnnouncement, notifyAnnounceChannel, notifyOwnerDm } from "@/lib/discord-notify";
import { SITE_URL } from "@/data/works";
import type { DbWork } from "@/lib/works.functions";

/** Upper bound for one message (Discord DMs cap at 2000 chars anyway). */
const MAX_MESSAGE_CHARS = 4000;

const FETCH_TIMEOUT_MS = 8_000;

async function discardBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // already consumed or unusable — nothing to do
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch JSON with a hard timeout and backoff retries. Roblox rate-limits
 * datacenter IPs (the live-stats path needs the same treatment), so a single
 * attempt loses metadata randomly — retries make DM ingestion reliable.
 */
async function fetchJson<T>(url: string, attempts = 3): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) return (await res.json()) as T;
      await discardBody(res);
      // 429/5xx are worth retrying; other statuses aren't.
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      /* timeout/network — fall through to retry */
    }
    if (attempt < attempts) await sleep(400 * 2 ** (attempt - 1));
  }
  return null;
}

// ---------------------------------------------------------------------------
// URL extraction
// ---------------------------------------------------------------------------

/** All http(s) URLs in the text (authority must be non-empty). */
export function extractUrls(text: string): string[] {
  const out: string[] = [];
  const re = /https?:\/\/[^\s<>"'`]+/gi;
  for (const match of text.matchAll(re)) {
    const url = match[0].replace(/[).,;'"]+$/, ""); // trailing punctuation
    if (out.length < 10) out.push(url);
  }
  return out;
}

type RobloxLink = { placeId: number; canonical: string };
type DiscordInvite = { code: string; canonical: string };
type OtherLink = { url: string };

export type ParsedLink =
  | ({ kind: "roblox" } & RobloxLink)
  | ({ kind: "discord" } & DiscordInvite)
  | ({ kind: "other" } & OtherLink);

const ROBLOX_GAME_RE = /^https?:\/\/(?:www\.)?roblox\.com\/games\/(\d{4,20})/i;
const DISCORD_INVITE_RE =
  /^https?:\/\/(?:(?:www\.)?discord(?:\.gg|\.com\/invite)|discord\.com\/invite)\/([A-Za-z0-9_-]{2,25})/i;

export function parseLink(raw: string): ParsedLink | null {
  const url = raw.trim();
  const roblox = url.match(ROBLOX_GAME_RE);
  if (roblox) {
    const placeId = Number(roblox[1]);
    if (Number.isFinite(placeId) && placeId > 0) {
      return { kind: "roblox", placeId, canonical: `https://www.roblox.com/games/${placeId}` };
    }
  }
  const invite = url.match(DISCORD_INVITE_RE);
  if (invite?.[1]) {
    return { kind: "discord", code: invite[1], canonical: `https://discord.gg/${invite[1]}` };
  }
  return safeExternalUrl(url) ? { kind: "other", url } : null;
}

// ---------------------------------------------------------------------------
// Metadata resolution
// ---------------------------------------------------------------------------

/** Everything ingestLink needs from a resolved link. */
type LinkMetadata = {
  title: string;
  description: string;
  href: string;
  imageHref?: string;
  /** Roblox only: seeds the live-counter universe map. */
  universeId?: number | null;
};

type RobloxGameDetails = {
  id?: number;
  rootPlaceId?: number;
  name?: string;
  description?: string;
  creator?: { name?: string };
};

type DiscordInvitePayload = {
  guild?: { id?: string; name?: string; description?: string };
  approximate_member_count?: number;
  approximate_presence_count?: number;
};

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "untitled";
}

async function resolveRobloxGame(placeId: number): Promise<LinkMetadata | null> {
  // placeId → universeId (same endpoint the live-stats counter uses; universe
  // ids are stable and get persisted by the counter on its next refresh).
  const uni = await fetchJson<{ universeId?: number }>(
    `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
  );
  const universeId = typeof uni?.universeId === "number" ? uni.universeId : null;

  let details: RobloxGameDetails | null = null;
  if (universeId) {
    const multi = await fetchJson<{ data?: RobloxGameDetails[] }>(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
    );
    details = multi?.data?.[0] ?? null;
  }

  // Game icon (public thumbnails API) — gives the entry a card image.
  let imageHref: string | undefined;
  if (universeId) {
    const thumb = await fetchJson<{ data?: Array<{ imageUrl?: string }> }>(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`,
    );
    const icon = thumb?.data?.[0]?.imageUrl;
    if (icon) imageHref = safeExternalUrl(icon) ?? undefined;
  }

  const name = details?.name?.trim();
  if (!name) {
    // Universe metadata unavailable — create a minimal entry so the link is
    // never lost; the admin panel can fill in the title.
    return {
      title: `Roblox game ${placeId}`,
      description: "",
      href: `https://www.roblox.com/games/${placeId}`,
      universeId,
    };
  }

  const description = (details?.description ?? "").trim().slice(0, 2000);
  const creator = details?.creator?.name?.trim();
  return {
    title: name.slice(0, 120),
    description: creator ? `${description}${description ? "\n\n" : ""}by ${creator}` : description,
    href: `https://www.roblox.com/games/${placeId}`,
    ...(imageHref ? { imageHref } : {}),
    universeId,
  };
}

async function resolveDiscordInvite(code: string): Promise<LinkMetadata | null> {
  // Public invite endpoint with counts — no bot token required, this is the
  // same data an embed preview shows.
  const invite = await fetchJson<DiscordInvitePayload>(
    `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,
  );
  if (!invite?.guild?.name) return null;

  const members = invite.approximate_member_count;
  const online = invite.approximate_presence_count;
  const bits: string[] = [];
  if (typeof members === "number") bits.push(`${members.toLocaleString("en-US")} members`);
  if (typeof online === "number") bits.push(`${online.toLocaleString("en-US")} online`);
  const guildDescription = (invite.guild.description ?? "").trim();

  return {
    title: invite.guild.name.slice(0, 120),
    description:
      [guildDescription ? guildDescription.slice(0, 1800) : "", bits.join(" · ")]
        .filter(Boolean)
        .join("\n\n") || "Discord community",
    href: `https://discord.gg/${code}`,
  };
}

// ---------------------------------------------------------------------------
// Entry creation
// ---------------------------------------------------------------------------

/**
 * Details about an entry the portfolio already has, so the bot can reply with
 * something useful instead of just "already added". Purely informational —
 * `missing` tells the user what is still worth filling in.
 */
export type ExistingEntry = {
  slug: string;
  title: string;
  category?: string;
  role?: string;
  tags?: string[];
  featured?: boolean;
  href?: string;
  /** Fields that are empty or placeholder, i.e. worth an admin pass. */
  missing?: Array<"description" | "image">;
};

export type IngestOutcome =
  | {
      status: "created";
      slug: string;
      title: string;
      kind: ParsedLink["kind"];
      /** Present when a placeholder entry was upgraded in place, not created. */
      existing?: ExistingEntry;
      /**
       * True when the entry was created as a placeholder because Roblox's
       * metadata was unavailable (rate-limited from the Worker's IP). The link
       * is saved rather than lost, but the entry needs finishing — the bot
       * uses this to follow up with a "what to do next" note, and the nightly
       * refresh job will fill it in on its own.
       */
      placeholder?: boolean;
    }
  | {
      status: "duplicate";
      slug: string;
      title: string;
      kind: ParsedLink["kind"];
      existing?: ExistingEntry;
    }
  | { status: "unresolvable"; kind: ParsedLink["kind"]; detail: string }
  | { status: "error"; kind: ParsedLink["kind"]; detail: string };

/** Summarizes an existing entry for the bot's reply. */
function describeExisting(work: DbWork): ExistingEntry {
  const missing: Array<"description" | "image"> = [];
  if (!(work.description ?? "").trim()) missing.push("description");
  if (!(work.image ?? "").trim()) missing.push("image");
  // Built by assignment rather than an object literal with `x: undefined`:
  // this project sets exactOptionalPropertyTypes, and omitting the keys keeps
  // them out of the JSON response the bot reads.
  const entry: ExistingEntry = { slug: work.slug, title: work.title };
  if (work.category) entry.category = work.category;
  if (work.role) entry.role = work.role;
  if (Array.isArray(work.tags) && work.tags.length > 0) entry.tags = work.tags;
  if (work.featured === true) entry.featured = true;
  if (work.href) entry.href = work.href;
  if (missing.length > 0) entry.missing = missing;
  return entry;
}

function nextSortOrder(works: DbWork[]): number {
  return works.reduce((max, w) => Math.max(max, w.sortOrder), 0) + 10;
}

function uniqueSlug(base: string, works: DbWork[]): string {
  if (!works.some((w) => w.slug === base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!works.some((w) => w.slug === candidate)) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Category may be overridden by the bot message ("cat: SFX / Audio"). */
function normalizeCategory(raw: string | undefined, kind: ParsedLink["kind"]): string {
  if (raw) {
    const cleaned = raw.trim().slice(0, 60);
    if (cleaned.length >= 2) return cleaned;
  }
  return kind === "roblox" ? "QA Testing" : kind === "discord" ? "Community Manager" : "QA Testing";
}

/** Processes one parsed link against the live store. */
async function ingestLink(
  link: ParsedLink,
  categoryOverride: string | undefined,
): Promise<IngestOutcome> {
  if (link.kind === "other") {
    // Generic links are not auto-added (they'd need a title the server can't
    // verify) — the bot tells the user to add those through the admin panel.
    return {
      status: "unresolvable",
      kind: "other",
      detail: "Only Roblox game and Discord invite links are auto-added.",
    };
  }

  const meta =
    link.kind === "roblox"
      ? await resolveRobloxGame(link.placeId)
      : await resolveDiscordInvite(link.code);

  if (!meta) {
    return {
      status: "unresolvable",
      kind: link.kind,
      detail:
        link.kind === "discord"
          ? "Invite is invalid, expired, or the server blocks lookups."
          : "Roblox metadata unavailable right now — try again later.",
    };
  }

  const href = safeExternalUrl(meta.href);
  if (!href) {
    return { status: "error", kind: link.kind, detail: "Resolved URL failed safety checks." };
  }

  try {
    // Dedupe by exact href OR by the same Roblox placeId: manual entries
    // often carry the full URL form (/games/<id>/<name>) which differs from
    // our canonical href, and the same game must not become two entries.
    const placeRe =
      link.kind === "roblox"
        ? new RegExp(`roblox\\.com/games/${link.placeId}(?:[/?#]|$)`, "i")
        : null;
    const result = await mutate((store) => {
      const existing = store.works.find(
        (w) =>
          w.href === href ||
          (placeRe !== null && typeof w.href === "string" && placeRe.test(w.href)),
      );
      if (existing) {
        // Self-heal: an entry created while Roblox metadata was rate-limited
        // carries the fallback title ("Roblox game <id>"). When real
        // metadata arrives on a later DM of the same link, upgrade it in
        // place instead of bouncing as a duplicate.
        const FALLBACK = /^Roblox game \d+$/;
        if (FALLBACK.test(existing.title) && !FALLBACK.test(meta.title)) {
          existing.title = meta.title;
          if (meta.description) existing.description = meta.description;
          if (meta.imageHref) existing.image = meta.imageHref;
          // Reported as `created` for backward compatibility (the entry did
          // gain its title/icon), but flagged so the bot can say it FIXED an
          // existing entry rather than adding a new one.
          return {
            status: "created" as const,
            slug: existing.slug,
            title: existing.title,
            existing: describeExisting(existing),
          };
        }
        return {
          status: "duplicate" as const,
          slug: existing.slug,
          title: existing.title,
          existing: describeExisting(existing),
        };
      }
      // Roblox games: seed the universeId map so the live visit counter
      // includes this game on its very next refresh (no rate-limited
      // per-game lookup burst from a cold isolate).
      if (link.kind === "roblox" && meta.universeId) {
        store.universeIds[String(link.placeId)] = meta.universeId;
      }
      const slug = uniqueSlug(slugify(meta.title), store.works);
      const work: DbWork = {
        id: crypto.randomUUID(),
        slug,
        title: meta.title,
        category: normalizeCategory(categoryOverride, link.kind) as DbWork["category"],
        role: "",
        description: meta.description,
        tags: [],
        href,
        linkLabel: link.kind === "roblox" ? "Play on Roblox" : "Join Discord",
        ...(meta.imageHref ? { image: meta.imageHref } : {}),
        featured: false,
        // A link the owner deliberately sent the bot goes live; anything
        // unfinished is marked draft by hand in the admin panel.
        status: "published",
        sortOrder: nextSortOrder(store.works),
      };
      store.works.push(work);
      return {
        status: "created" as const,
        slug,
        title: work.title,
        existing: describeExisting(work),
        // A "Roblox game <id>" title means resolveRobloxGame fell back
        // because Roblox wouldn't answer — see its no-metadata branch.
        placeholder: isPlaceholderTitle(work.title),
      };
    });
    // Announce + log AFTER the entry is durably written, and never let a
    // notification failure affect the ingest response the bot is waiting on.
    if (result.status === "created") {
      await recordNewEntry(result.slug, result.title, result.placeholder === true);
    }
    return { ...result, kind: link.kind };
  } catch (error) {
    return {
      status: "error",
      kind: link.kind,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export type IngestResult = {
  ok: boolean;
  received: { urls: number; categories: string[] };
  results: IngestOutcome[];
};

/**
 * Processes a whole DM message: extracts links, ingests each, returns a
 * per-link report for the bot to embed. Non-link text is not an error.
 */
export async function ingestMessage(
  text: string,
  categoryOverride?: string,
): Promise<IngestResult> {
  const bounded = text.slice(0, MAX_MESSAGE_CHARS);
  const parsed = extractUrls(bounded)
    .map(parseLink)
    .filter((l): l is ParsedLink => l !== null);

  const results: IngestOutcome[] = [];
  for (const link of parsed) {
    results.push(await ingestLink(link, categoryOverride));
  }
  return {
    ok: results.every((r) => r.status !== "error"),
    received: { urls: parsed.length, categories: categoryOverride ? [categoryOverride] : [] },
    results,
  };
}

/**
 * Records a newly created entry in the activity log and announces it.
 *
 * Entirely best-effort: every failure is swallowed. A Discord outage or a
 * Supabase hiccup must never turn a successful ingest into an error the bot
 * reports back to the owner — the entry is already saved at this point.
 */
async function recordNewEntry(slug: string, title: string, placeholder: boolean): Promise<void> {
  const entry: ActivityEntry = {
    at: new Date().toISOString(),
    kind: placeholder ? "entry.placeholder" : "entry.created",
    summary: title,
    slug,
  };
  try {
    await appendActivity([entry]);
    const embed = buildEntryAnnouncement(entry, SITE_URL);
    // Announcements go to the channel webhook when one is configured, and to
    // the owner's DM otherwise, so a new entry is always surfaced somewhere.
    const announced = await notifyAnnounceChannel(embed);
    if (!announced.sent) await notifyOwnerDm(embed);
  } catch (error) {
    console.error("[ingest] announce failed:", error instanceof Error ? error.message : error);
  }
}
