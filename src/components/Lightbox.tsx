import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

export type LightboxItem = { src: string; caption?: string; alt?: string };

/**
 * Full-screen media viewer.
 *
 * Portalled to <body> so transformed/overflow-hidden ancestors (the cover's
 * hover scale, the gallery grid) can't clip or offset it. Locking scroll,
 * restoring the previously focused element, trapping Tab and handling
 * Escape/←/→ keep it usable without a mouse.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const count = items.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count < 2) return;
      onIndexChange((index + dir + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
        return;
      }
      if (event.key !== "Tab") return;

      // Keep focus inside the dialog while it is open.
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const list = Array.from(nodes);
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, onClose]);

  if (typeof document === "undefined" || count === 0) return null;
  const item = items[Math.min(Math.max(index, 0), count - 1)];
  if (!item) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Project media viewer"
      className="animate-in fade-in fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl duration-200 motion-reduce:animate-none"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
        <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground uppercase tabular-nums">
          <span className="text-foreground">{String(index + 1).padStart(2, "0")}</span>
          {" / "}
          {String(count).padStart(2, "0")}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close media viewer"
          className="grid size-10 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <img
          key={item.src}
          src={item.src}
          alt={item.alt ?? item.caption ?? "Project media"}
          className="animate-in fade-in zoom-in-95 max-h-full max-w-full rounded-[18px] object-contain shadow-[0_30px_120px_-30px_rgba(0,0,0,0.9)] duration-300 motion-reduce:animate-none"
        />

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-background/70 text-foreground backdrop-blur-sm transition-colors hover:border-primary/70 hover:text-primary sm:left-6 sm:size-12"
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-background/70 text-foreground backdrop-blur-sm transition-colors hover:border-primary/70 hover:text-primary sm:right-6 sm:size-12"
            >
              <ArrowRight className="size-4 sm:size-5" />
            </button>
          </>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-4 sm:px-6">
        <p className="truncate text-center font-mono text-[0.58rem] tracking-[0.12em] text-muted-foreground uppercase">
          {item.caption ?? "Project media"}
        </p>
        {count > 1 ? (
          <p className="mt-1 text-center font-mono text-[0.5rem] tracking-[0.1em] text-muted-foreground/50 uppercase">
            Use ← → or the arrows to browse · Esc to close
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
