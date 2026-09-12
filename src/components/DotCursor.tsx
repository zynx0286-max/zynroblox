import { useEffect, useRef } from "react";

/**
 * Simple modern dot cursor: a small white dot that follows the pointer with
 * a snappy lerp. Transform-only updates via rAF (no React re-renders).
 * Renders nothing on touch devices or when the user prefers reduced motion.
 */
export function DotCursor() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fine =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const el = ref.current;
    if (!el) return;

    let x = -100;
    let y = -100;
    let dx = x;
    let dy = y;
    let frame = 0;
    let hovering = false;

    const loop = () => {
      frame = 0;
      dx += (x - dx) * 0.35;
      dy += (y - dy) * 0.35;
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${hovering ? "2.2" : "1"})`;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      hovering = Boolean(t?.closest?.("a, button, input, textarea, select, [role='button']"));
      kick();
    };

    el.style.opacity = "1";
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="zyn-dot-cursor"
      style={{ opacity: 0 }}
    />
  );
}
