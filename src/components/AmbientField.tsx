import { useEffect, useRef } from "react";

/**
 * Lightweight ambient particle field for the hero. Pure <canvas> — no WebGL —
 * with a hard FPS cap and DPR ceiling so it stays cheap on low-power GPUs.
 * Particles drift slowly and are gently pushed by the pointer. It respects
 * `prefers-reduced-motion` (renders one static frame) and pauses when the
 * hero leaves the viewport or the tab is hidden.
 */
export function AmbientField({ className }: { className?: string | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = true;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let last = 0;
    const targetFrameMs = 33; // ~30fps cap
    let primaryColor = "rgba(140, 120, 255, 0.55)";

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; tw: number };
    let particles: P[] = [];

    const readColor = () => {
      const primary = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      if (!primary) return;
      try {
        // Modern browsers accept oklch() in canvas fills.
        const probe = document.createElement("canvas").getContext("2d");
        if (probe) {
          probe.fillStyle = primary;
          probe.fillRect(0, 0, 1, 1);
          primaryColor = probe.fillStyle;
        }
      } catch {
        /* keep fallback */
      }
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(24, Math.min(90, Math.floor((width * height) / 20000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 0.5 + Math.random() * 1.4,
        a: 0.18 + Math.random() * 0.5,
        tw: 0.02 + Math.random() * 0.05,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = mouseX;
      const cy = mouseY;
      const hover = hasMouse;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        const tw = p.tw;
        p.a = Math.max(
          0.08,
          Math.min(0.7, p.a + (Math.sin(performance.now() * 0.001 * tw) * 0.02 - 0.01)),
        );
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        if (p.y > height + 8) p.y = -8;

        if (hover) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const d2 = dx * dx + dy * dy;
          const maxD = 110;
          if (d2 < maxD * maxD && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = ((maxD - d) / maxD) * 0.6;
            p.vx += (dx / d) * force * 0.05;
            p.vy += (dy / d) * force * 0.05;
          }
        }
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.6) {
          p.vx = (p.vx / sp) * 0.6;
          p.vy = (p.vy / sp) * 0.6;
        }

        ctx.globalAlpha = p.a;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    let mouseX = -9999;
    let mouseY = -9999;
    let hasMouse = false;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      hasMouse = e.pointerType === "mouse";
    };
    const onLeave = () => {
      hasMouse = false;
    };

    const tick = (now: number) => {
      if (!running) return;
      if (now - last >= targetFrameMs) {
        draw();
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !raf) raf = requestAnimationFrame(tick);
    };

    readColor();
    build();
    if (reduced) {
      draw();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        running = entries[0]?.isIntersecting ?? false;
        if (running) raf = requestAnimationFrame(tick);
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      build();
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
