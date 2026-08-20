import { useEffect, useRef } from "react";

// WebGL hero backdrop — a low-poly wireframe globe + particles. Starts
// automatically on mount (no click-to-activate gate), lazy-imports three.js so
// it only ships to browsers. Under reduced-motion it still renders a single
// static frame (no animation); if WebGL is unavailable the CSS background
// still shows.
export function WebGLHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void import("../lib/webgl-scene").then(({ mountWebGLScene }) => {
      if (cancelled || !canvasRef.current) return;
      cleanup = mountWebGLScene(canvas, { reduced });
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="zyn-webgl-hero" />;
}
