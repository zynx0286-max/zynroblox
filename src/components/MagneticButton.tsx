import { useRef, type ReactNode } from "react";

/**
 * Magnetic hover wrapper: nudges the child toward the pointer on fine
 * pointers, springs back on leave. Transform-only updates via rAF, so it
 * never triggers React re-renders while moving. Disabled for touch and
 * reduced-motion users.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.32,
}: {
  children: ReactNode;
  className?: string | undefined;
  strength?: number | undefined;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (
      e.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.style.transform = "";
      return;
    }
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate3d(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px, 0)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{
        transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
