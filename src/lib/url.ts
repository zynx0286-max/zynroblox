// Shared URL hardening. Admin-editable fields (work links, images, media,
// screenshots, discord URLs…) ultimately end up in `href`/`src` attributes.
// Anything that isn't a genuine http(s) URL (or a relative app path) is
// rejected, which neutralizes `javascript:`, `data:`, and `vbscript:` style
// stored-XSS vectors pasted through the admin panel or review form.

const SAFE_EXTERNAL = /^https:\/\//i;

/**
 * Returns a safe URL for use in `href`/`src`, or `null` when the input should
 * be treated as unset. Allows:
 *  - `https://…` (http is rejected on purpose — outbound links should be secure)
 *  - app-relative paths (`/foo/bar`) and bundled asset imports (`/src/assets/x.png`)
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.startsWith("/")) {
    // Protocol-relative ("//evil.com") is not a relative path — reject it.
    if (value.startsWith("//")) return null;
    return value;
  }
  return SAFE_EXTERNAL.test(value) ? value : null;
}

/** Like `safeExternalUrl` but returns "" instead of null (form-friendly). */
export function safeExternalUrlOrEmpty(raw: string | null | undefined): string {
  return safeExternalUrl(raw) ?? "";
}
