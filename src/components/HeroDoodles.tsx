import { AudioLines, Bug, Gamepad2, Music2, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const DOODLES = [
  {
    Icon: Music2,
    pos: "left-2 top-[26%]",
    icon: "size-5 text-primary/45",
    shift: "16px",
    rot: "-14deg",
    delay: "0s",
  },
  {
    Icon: Star,
    pos: "left-[46%] top-[112px]",
    icon: "size-3.5 text-foreground/30",
    shift: "9px",
    rot: "12deg",
    delay: "1.1s",
  },
  {
    Icon: AudioLines,
    pos: "right-[5%] top-[128px]",
    icon: "size-6 text-primary/40",
    shift: "20px",
    rot: "-8deg",
    delay: "0.4s",
  },
  {
    Icon: Gamepad2,
    pos: "right-[2%] top-[54%]",
    icon: "size-5 text-foreground/25",
    shift: "24px",
    rot: "10deg",
    delay: "1.8s",
  },
  {
    Icon: Bug,
    pos: "left-2 top-[74%]",
    icon: "size-4 text-primary/35",
    shift: "13px",
    rot: "18deg",
    delay: "0.8s",
  },
  {
    Icon: Sparkles,
    pos: "left-[38%] top-[84%]",
    icon: "size-4 text-foreground/25",
    shift: "10px",
    rot: "-6deg",
    delay: "2.2s",
  },
] as const;

/**
 * Decorative SFX/game doodles floating around the hero copy. They drift on
 * their own and parallax gently against the pointer. Pointer parallax is
 * skipped on touch and under prefers-reduced-motion (the CSS also freezes the
 * float animation in that case).
 */
export function HeroDoodles() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0;
    let ty = 0;
    let px = 0;
    let py = 0;
    let frame = 0;

    const loop = () => {
      frame = 0;
      px += (tx - px) * 0.08;
      py += (ty - py) * 0.08;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      if (Math.abs(tx - px) > 0.001 || Math.abs(ty - py) > 0.001) {
        frame = requestAnimationFrame(loop);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      tx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      ty = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="zyn-doodles zyn-hero-doodles hidden sm:block">
      {DOODLES.map(({ Icon, pos, icon, shift, rot, delay }, i) => (
        <span
          key={i}
          className={cn("zyn-doodle-wrap", pos)}
          style={
            {
              "--shift": shift,
              "--delay": delay,
              "--rot": rot,
            } as CSSProperties
          }
        >
          <span className={cn("zyn-doodle", icon)}>
            <Icon className="size-full" strokeWidth={1.5} />
          </span>
        </span>
      ))}
    </div>
  );
}
