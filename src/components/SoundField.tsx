import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

/**
 * "Signal" interlude — a live WebGL waveform field.
 *
 * Thousands of additive points are displaced by layered sine waves. The pointer
 * pulls a ripple through the field and a click sends a pulse through it. It is
 * decorative, so it stays quiet:
 *
 * - only animates while the section is on screen and the tab is visible
 * - one static frame under prefers-reduced-motion
 * - device pixel ratio capped, one buffer, no textures
 * - if WebGL is missing the CSS glow remains and the canvas never fades in
 */

const VERTEX_SHADER = `
attribute vec3 aSeed;

uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uTime;
uniform float uPulse;
uniform float uDpr;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float x = aSeed.x;
  float row = aSeed.y;
  float rnd = aSeed.z;
  float aspect = uRes.x / max(uRes.y, 1.0);

  float baseY = 0.18 + row * 0.64;
  float nx = x * 2.0 - 1.0;

  float wave = sin(nx * 4.6 + uTime * 0.7 + row * 7.0) * 0.042
             + sin(nx * 10.0 - uTime * 1.25 + row * 2.6) * 0.014;

  vec2 pointer = vec2(uMouse.x / max(uRes.x, 1.0), 1.0 - uMouse.y / max(uRes.y, 1.0));
  float d = distance(vec2(x * aspect, baseY + wave), vec2(pointer.x * aspect, pointer.y));
  float ripple = sin(d * 46.0 - uTime * 4.6) * exp(-d * 7.5);
  wave += ripple * (0.03 + uPulse * 0.09);

  gl_Position = vec4(nx, (baseY + wave) * 2.0 - 1.0, 0.0, 1.0);

  float edge = smoothstep(0.0, 0.18, row) * (1.0 - smoothstep(0.82, 1.0, row));
  float twinkle = 0.7 + 0.3 * sin(uTime * 1.9 + rnd * 25.0);
  vAlpha = edge * (0.3 + 0.7 * pow(rnd, 1.7)) * twinkle;

  vColor = mix(
    vec3(0.16, 0.38, 1.0),
    vec3(0.33, 0.86, 0.98),
    smoothstep(0.1, 0.9, x + row * 0.16)
  );
  gl_PointSize = (1.0 + rnd * 2.4) * uDpr;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = 1.0 - smoothstep(0.06, 0.5, d);
  gl_FragColor = vec4(vColor, a * vAlpha * 0.8);
}
`;

const COLUMNS = 176;
const ROWS = 34;

export function SoundField() {
  const hostRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    }) ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("[sound-field] shader compile failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[sound-field] program link failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const attribute = gl.getAttribLocation(program, "aSeed");
    const loc = {
      res: gl.getUniformLocation(program, "uRes"),
      mouse: gl.getUniformLocation(program, "uMouse"),
      time: gl.getUniformLocation(program, "uTime"),
      pulse: gl.getUniformLocation(program, "uPulse"),
      dpr: gl.getUniformLocation(program, "uDpr"),
    };

    const seeds = new Float32Array(COLUMNS * ROWS * 3);
    let cursor = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        seeds[cursor++] = col / (COLUMNS - 1);
        seeds[cursor++] = row / (ROWS - 1);
        seeds[cursor++] = Math.random();
      }
    }

    const buffer = gl.createBuffer();
    if (!buffer || attribute < 0) {
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 1;
    let height = 1;
    let targetX = 0;
    let targetY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let pulse = 0;
    let elapsed = 0;
    let lastNow = 0;
    let running = false;
    let onScreen = true;
    let pageVisible = document.visibilityState !== "hidden";
    let frame = 0;
    let disposed = false;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(loc.res, rect.width, rect.height);
      gl.uniform1f(loc.dpr, dpr);

      if (!targetX && !targetY) {
        targetX = rect.width / 2;
        targetY = rect.height / 2;
        mouseX = targetX;
        mouseY = targetY;
      }
    };

    const draw = (time: number) => {
      mouseX += (targetX - mouseX) * 0.12;
      mouseY += (targetY - mouseY) * 0.12;
      pulse *= 0.94;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(loc.time, time);
      gl.uniform1f(loc.pulse, pulse);
      gl.uniform2f(loc.mouse, mouseX, mouseY);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, COLUMNS * ROWS);

      if (canvas.style.opacity !== "1") canvas.style.opacity = "1";
    };

    const tick = (now: number) => {
      frame = 0;
      if (!running || disposed) return;
      if (!lastNow) lastNow = now;
      const delta = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      elapsed += delta;
      draw(elapsed);
      frame = window.requestAnimationFrame(tick);
    };

    const canAnimate = () => !reduceMotion && !disposed && onScreen && pageVisible;

    const start = () => {
      if (running || !canAnimate()) return;
      running = true;
      lastNow = 0;
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const onResize = () => {
      resize();
      if (reduceMotion) draw(0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      // Under reduced motion the field holds still, but a direct pointer move
      // may still shift its one frame — no autonomous animation, just feedback.
      if (reduceMotion) {
        mouseX = targetX;
        mouseY = targetY;
        draw(0);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest?.("a, button")) return;
      pulse = 1;
      if (reduceMotion) draw(0);
    };

    const onVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (!pageVisible) stop();
      else start();
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          onScreen = Boolean(entries[0]?.isIntersecting);
          if (!onScreen) stop();
          else start();
        },
        { threshold: 0.01 },
      );
      io.observe(host);
    }

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(host);

    resize();
    if (reduceMotion) canvas.style.transition = "none";
    draw(0);
    if (reduceMotion) {
      canvas.style.opacity = "1";
    } else {
      start();
    }

    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      disposed = true;
      stop();
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerdown", onPointerDown);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <section
      ref={hostRef}
      id="signal"
      data-cursor-label="WAVE"
      className="relative isolate overflow-hidden border-t border-border bg-background"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(80% 120% at 76% 42%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 70%)",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-1000"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-background to-transparent"
      />

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,9vw,8rem)] sm:px-6 lg:px-10">
        <p className="flex flex-wrap items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.64rem]">
          <span className="text-primary">Interlude</span>
          <span aria-hidden className="h-px w-6 bg-primary/60" />
          Signal
          <span className="ml-auto text-muted-foreground/60">WebGL / live</span>
        </p>

        <h2 className="mt-8 max-w-[17ch] font-display text-[clamp(2.3rem,5.2vw,4.9rem)] leading-[0.92] font-black tracking-[-0.06em]">
          Sound is the layer <span className="text-primary">players feel first.</span>
        </h2>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Impacts, pickups, abilities — each one timed to land with the action. Move your cursor
            through the field and the signal answers.
          </p>
          <Link
            to="/sfx"
            data-cursor-label="LISTEN"
            className="group inline-flex shrink-0 items-center gap-2 self-start border-b border-primary/50 pb-1 font-display text-[0.7rem] font-bold tracking-[0.12em] uppercase transition-colors hover:border-primary sm:self-auto"
          >
            Explore the SFX archive
            <ArrowUpRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
