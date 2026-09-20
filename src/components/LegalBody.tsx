import type { ReactNode } from "react";
import { safeExternalUrl } from "@/lib/url";

/**
 * Renders legal-section body text, supporting `[label](url)` links. Link URLs
 * are scheme-checked at render time — legal copy is owner-editable, so a
 * `javascript:` payload pasted into the editor must never become a clickable
 * href.
 */
export function LegalBody({ body }: { body: string }) {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:[^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    const href = safeExternalUrl(m[2]);
    if (href) {
      parts.push(
        <a
          key={k++}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          {m[1]}
        </a>,
      );
    } else {
      // Unsafe URL: degrade to plain text instead of a link.
      parts.push(m[1]);
    }
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return <>{parts}</>;
}
