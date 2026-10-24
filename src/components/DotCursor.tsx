import { useEffect, useRef } from "react";

/**
 * Custom pointer: a snappy blue dot with a ring that trails behind it.
 *
 * - grows over links/buttons and shows a label for elements with
 *   `data-cursor-label` (e.g. "VIEW" on project cards, "DRAG" on the scene)
 * - hides over text inputs so the native caret cursor takes over
 * - transform-only rAF updates, and the loop stops once the ring settles
 * - renders nothing on touch devices or under prefers-reduced-motion
 */
export function DotCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const fine =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    const root = document.documentElement;

    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let frame = 0;
    let shown = false;
    let overNative = false;

    const draw = () => {
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    };

    const settle = () => {
      frame = 0;
      const dx = x - rx;
      const dy = y - ry;
      rx += dx * 0.18;
      ry += dy * 0.18;
      draw();
      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        frame = requestAnimationFrame(settle);
      }
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(settle);
    };

    const setHidden = (hidden: boolean) => {
      const method = hidden ? "add" : "remove";
      dot.classList[method]("zyn-cursor-hidden");
      ring.classList[method]("zyn-cursor-hidden");
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;

      if (!shown) {
        shown = true;
        // Hide the native cursor only once we know the pointer moves, so the
        // cursor is never invisible while the page loads under a still mouse.
        root.classList.add("zyn-cursor-on");
        rx = x;
        ry = y;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
        draw();
      }

      const target = (e.target as Element | null)?.closest?.(
        "a, button, label, summary, [role='button'], [role='tab'], [role='menuitem'], [data-cursor-label]",
      ) as HTMLElement | null;
      const native = Boolean((e.target as Element | null)?.closest?.("input, textarea, select"));

      if (native !== overNative) {
        overNative = native;
        setHidden(native);
      }

      const custom = target?.getAttribute("data-cursor-label") ?? "";
      const hovering = Boolean(target) || Boolean(custom);

      if (label.textContent !== custom) label.textContent = custom;
      ring.dataset["hover"] = hovering ? "true" : "false";
      ring.dataset["label"] = custom ? "true" : "false";

      kick();
    };

    const onLeave = () => {
      shown = false;
      overNative = false;
      setHidden(false);
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const onDown = () => {
      ring.dataset["press"] = "true";
      // A tiny native-feeling squeeze, kept separate from the lerped transform.
      ring.style.width = "24px";
      ring.style.height = "24px";
    };

    const onUp = () => {
      ring.dataset["press"] = "false";
      ring.style.width = "";
      ring.style.height = "";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("blur", onLeave);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      root.classList.remove("zyn-cursor-on");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} aria-hidden className="zyn-cursor-dot" style={{ opacity: 0 }} />
      <div ref={ringRef} aria-hidden className="zyn-cursor-ring" style={{ opacity: 0 }}>
        <span ref={labelRef} className="zyn-cursor-label" />
      </div>
    </>
  );
}
