import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal wrapper: fades + lifts content into view once it enters
 * the viewport. Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string | undefined;
  delay?: number | undefined;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", shown && "reveal-in", className)}
    >
      {children}
    </Tag>
  );
}

/**
 * 3D scroll card: tilts on the X axis based on its distance from the
 * viewport centre, and adds a pointer-driven tilt on hover.
 */
export function Tilt3D({
  children,
  className,
  strength = 10,
}: {
  children: ReactNode;
  className?: string | undefined;
  strength?: number | undefined;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTilt, setScrollTilt] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const ratio = (center - window.innerHeight / 2) / window.innerHeight;
      setScrollTilt(Math.max(-1, Math.min(1, ratio)) * strength);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);

  const rotateX = hover ? hover.y : scrollTilt;
  const rotateY = hover ? hover.x : 0;

  return (
    <div className={cn("[perspective:1200px]", className)}>
      <div
        ref={ref}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          setHover({ x: px * 12, y: -py * 12 });
        }}
        onPointerLeave={() => setHover(null)}
        className="h-full transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
