import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pulls its child a few pixels toward the pointer on hover, then springs back.
 * Pointer-only (no effect on touch) and disabled under prefers-reduced-motion.
 * Keeps the wrapper inline so button/link layout is unchanged.
 */
export function Magnetic({
  children,
  strength = 10,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  const onMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const dx = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2 || 1);
    const dy = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2 || 1);
    el.style.transition = "transform 0.12s linear";
    el.style.transform = `translate3d(${(dx * strength).toFixed(1)}px, ${(dy * strength * 0.6).toFixed(1)}px, 0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.transform = "translate3d(0, 0, 0)";
  };

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={cn("inline-block will-change-transform", className)}
    >
      {children}
    </span>
  );
}
