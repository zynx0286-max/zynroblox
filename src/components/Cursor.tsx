import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor: a small dot plus a trailing ring. Runs on the animation
 * frame with transform-only updates (no React re-renders while moving).
 *
 * Fail-safe behaviour: the native cursor is only hidden after this mounts
 * successfully (it adds `zyn-cursor-active` to <html>), and the whole effect
 * is skipped on touch devices, coarse pointers and reduced-motion setups.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fine =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add("zyn-cursor-active");

    let raf = 0;
    let mx = -100;
    let my = -100;
    let dx = -100;
    let dy = -100;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dx = mx;
        dy = my;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const interactive = !!target?.closest(
        "a, button, [role='button'], input, textarea, select, label, [data-cursor]",
      );
      ring.classList.toggle("is-active", interactive);
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const tick = () => {
      dx += (mx - dx) * 0.18;
      dy += (my - dy) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });
    raf = requestAnimationFrame(tick);
    setActive(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("zyn-cursor-active");
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] hidden"
      aria-hidden
      style={active ? { display: "block" } : undefined}
    >
      <div ref={dotRef} className="zyn-cursor-dot" style={{ opacity: 0 }} />
      <div ref={ringRef} className="zyn-cursor-ring" style={{ opacity: 0 }} />
    </div>
  );
}
