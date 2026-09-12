// Adapted from React Bits `SpotlightCard` (MIT, github.com/DavidHDev/react-bits).
// Changes: mouse position + opacity are written straight to the DOM via refs,
// so hovering never triggers a React re-render (upstream uses useState per
// mousemove). Same props, same look.

import { useRef, type ReactNode } from "react";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
};

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(140, 120, 255, 0.22)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    const glow = glowRef.current;
    if (!el || !glow) return;
    const rect = el.getBoundingClientRect();
    glow.style.background = `radial-gradient(circle at ${e.clientX - rect.left}px ${
      e.clientY - rect.top
    }px, ${spotlightColor}, transparent 80%)`;
  };

  const setGlow = (opacity: number) => {
    const glow = glowRef.current;
    if (glow) glow.style.opacity = String(opacity);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={onMove}
      onMouseEnter={() => setGlow(1)}
      onMouseLeave={() => setGlow(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{ opacity: 0 }}
      />
      {children}
    </div>
  );
}
