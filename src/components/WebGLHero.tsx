import { useEffect, useRef } from "react";
import { useExperienceActive } from "@/lib/experience";

// WebGL hero backdrop for the immersive experience.
//
// A slowly-rotating, noise-displaced wireframe icosahedron wrapped in a deep
// particle field. It reacts to pointer position (parallax) and scroll (zoom).
// It only boots after the visitor activates the experience, it pauses when the
// hero leaves the viewport, and it renders a single static frame for
// reduced-motion users. The scene itself lives in src/lib/webgl-scene.ts and is
// imported lazily so three.js only ships to browsers, never to SSR / workers.
export function WebGLHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const active = useExperienceActive();

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup: (() => void) | undefined;

    void import("../lib/webgl-scene").then(({ mountWebGLScene }) => {
      if (!canvasRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cleanup = mountWebGLScene(canvas, { reduced });
    });

    return () => {
      cleanup?.();
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="zyn-webgl-hero"
      style={{ display: active ? "block" : "none" }}
    />
  );
}
