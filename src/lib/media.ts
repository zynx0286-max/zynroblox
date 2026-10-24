import { safeExternalUrl } from "@/lib/url";

/**
 * URLs the site is willing to hand to an <img>, <audio> or <video> src.
 * Uploads, inline data assets, and absolute https URLs — nothing else.
 */
export function isSafeMediaUrl(url: string): boolean {
  return (
    url.startsWith("/uploads/") ||
    /^data:(image|audio|video)\//i.test(url) ||
    Boolean(safeExternalUrl(url))
  );
}
