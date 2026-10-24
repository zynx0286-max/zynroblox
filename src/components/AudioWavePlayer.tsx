import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Pause, Play, ShieldCheck } from "lucide-react";
import type { WorkMedia as WorkMediaType } from "@/lib/site.functions";
import { useAudioWatermark } from "@/lib/audio-watermark";
import { resumeAudio } from "@/lib/audio-engine";
import { cn } from "@/lib/utils";

const BARS = 64;

// A media element can only ever be captured by one MediaElementSourceNode.
// Cache it so a prop/url change on a still-mounted player never tries to
// capture the same element twice (which would silently kill its audio).
const sourceCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

/** Deterministic idle silhouette so every clip has its own little waveform. */
function idleShape(seedText: string): number[] {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const r = seed / 4294967296;
    const envelope = Math.pow(Math.sin((Math.PI * (i + 0.5)) / BARS), 0.7);
    out.push(0.12 + r * 0.72 * (0.35 + envelope * 0.65));
  }
  return out;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Custom SFX preview player.
 *
 * Replaces the browser's default audio chrome with a waveform you can scrub:
 * it draws a deterministic idle silhouette, then feeds a live Web Audio
 * analyser into the bars while the clip plays (same-origin previews only —
 * cross-origin media without CORS would go silent through a MediaElement
 * source, so those play natively and use a time-based animation instead).
 *
 * Protection carried over from the old row: no download control, no drag or
 * right-click save path, and the inaudible watermark burst on every play.
 */
export function AudioWavePlayer({ media }: { media: WorkMediaType }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const watermark = useAudioWatermark();

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);

  // Graph state is kept in a ref: it must survive renders without retriggering
  // the setup effect.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const valuesRef = useRef<number[]>(idleShape(media.id || media.url));
  const rafRef = useRef(0);
  const playingRef = useRef(false);
  const durationRef = useRef(0);

  const caption = media.caption || "Audio clip";

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shape = valuesRef.current;
    const levels = new Float32Array(BARS);

    let width = 1;
    let height = 1;
    let colors = { played: "#efe9ff", idle: "rgba(255,255,255,0.18)" };

    const readColors = () => {
      const styles = getComputedStyle(canvas);
      const primary = styles.getPropertyValue("--primary").trim();
      if (primary) colors = { played: primary, idle: "rgba(255,255,255,0.16)" };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      readColors();
      draw();
    };

    const draw = () => {
      const w = width;
      const h = height;
      ctx2d.clearRect(0, 0, w, h);

      const data = analyserRef.current
        ? new Uint8Array(analyserRef.current.frequencyBinCount)
        : null;
      if (data && analyserRef.current && playingRef.current) {
        analyserRef.current.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
      }

      const progress =
        durationRef.current > 0
          ? Math.min(1, Math.max(0, audio.currentTime / durationRef.current))
          : 0;
      const gap = Math.max(1, w * 0.004);
      const barWidth = Math.max(1, (w - gap * (BARS - 1)) / BARS);
      const t = performance.now() / 1000;

      for (let i = 0; i < BARS; i++) {
        let target = shape[i]! * 0.55;

        if (playingRef.current) {
          if (data) {
            // Weight low and mid frequencies: that is where game SFX live.
            const bin = Math.min(
              data.length - 1,
              Math.floor(Math.pow(i / BARS, 1.35) * data.length * 0.62),
            );
            target = Math.max(target, (data[bin]! / 255) * 1.05);
          } else {
            target = Math.max(target, shape[i]! * (0.75 + 0.25 * Math.sin(t * 6 + i * 0.45)));
          }
        }

        const previous = levels[i] ?? 0;
        levels[i] = previous + (target - previous) * (playingRef.current ? 0.28 : 0.14);
        const level = Math.max(0.04, Math.min(1, levels[i] ?? 0));
        const barHeight = Math.max(2, level * (h - 4));
        const x = i * (barWidth + gap);
        const y = (h - barHeight) / 2;
        const played = (i + 0.5) / BARS <= progress;

        ctx2d.globalAlpha = played ? 1 : 0.42;
        ctx2d.fillStyle = played ? colors.played : colors.idle;
        ctx2d.fillRect(x, y, barWidth, barHeight);
      }

      ctx2d.globalAlpha = 1;
    };

    const loop = () => {
      rafRef.current = 0;
      if (!playingRef.current) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (reduceMotion) {
        draw();
        return;
      }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    const ensureGraph = () => {
      if (sourceRef.current && analyserRef.current) return;
      let sameOrigin = false;
      try {
        sameOrigin = new URL(media.url, window.location.href).origin === window.location.origin;
      } catch {
        sameOrigin = false;
      }
      if (!sameOrigin) return;
      const ctx = resumeAudio();
      if (!ctx) return;
      try {
        let source = sourceCache.get(audio);
        if (!source) {
          source = ctx.createMediaElementSource(audio);
          sourceCache.set(audio, source);
        }
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = source;
        analyserRef.current = analyser;
      } catch {
        // Native output path remains intact if the graph cannot be built.
      }
    };

    const onPlay = () => {
      playingRef.current = true;
      setPlaying(true);
      ensureGraph();
      startLoop();
    };

    const onPause = () => {
      playingRef.current = false;
      setPlaying(false);
      stopLoop();
      draw();
    };

    const onEnded = () => {
      playingRef.current = false;
      setPlaying(false);
      stopLoop();
      setCurrent(durationRef.current);
      draw();
    };

    const onTime = () => setCurrent(audio.currentTime);

    const onMeta = () => {
      durationRef.current = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(durationRef.current);
      draw();
    };

    const onError = () => setFailed(true);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
    ro?.observe(canvas);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onError);
    window.addEventListener("resize", resize, { passive: true });

    resize();

    // Metadata can finish loading before this effect attaches its listeners,
    // especially for short, cached clips — seed the duration so the timer and
    // scrubber are correct immediately.
    if (audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      durationRef.current = audio.duration;
      setDuration(audio.duration);
      draw();
    }

    return () => {
      stopLoop();
      ro?.disconnect();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onError);
      window.removeEventListener("resize", resize);
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {
        /* already torn down */
      }
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [media.url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    resumeAudio();
    if (audio.paused) {
      // Pressing play at the very end replays from the top instead of doing
      // nothing, which is what the native control does.
      if (
        audio.ended ||
        (durationRef.current > 0 && audio.currentTime >= durationRef.current - 0.05)
      ) {
        audio.currentTime = 0;
        setCurrent(0);
      }
      void audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  };

  const seekTo = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const d = durationRef.current || audio.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    const next = Math.min(d, Math.max(0, ratio * d));
    audio.currentTime = next;
    setCurrent(next);
  };

  const onWavePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seekTo((event.clientX - rect.left) / Math.max(1, rect.width));
  };

  const onWaveKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const step = event.shiftKey ? 15 : 5;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekTo((audio.currentTime + step) / Math.max(0.001, durationRef.current || 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekTo((audio.currentTime - step) / Math.max(0.001, durationRef.current || 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      seekTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekTo(1);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className="editorial-card p-3.5 sm:p-4"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${caption}` : `Play ${caption}`}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full border transition-all duration-300",
            playing
              ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
              : "border-border bg-surface text-foreground hover:border-primary/60 hover:text-primary",
          )}
        >
          {playing ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 translate-x-[1px] fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold">{caption}</p>
          <p className="truncate font-mono text-[0.54rem] tracking-[0.1em] text-muted-foreground uppercase">
            {failed ? "Preview unavailable" : playing ? "Now previewing" : "SFX preview"}
            <span className="mx-1.5 text-border">/</span>
            protected · watermarked
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p className="font-mono text-[0.58rem] tracking-[0.04em] text-muted-foreground tabular-nums">
            <span className="text-foreground">{clock(current)}</span>
            <span className="mx-0.5 opacity-50">/</span>
            {clock(duration)}
          </p>
          <span
            className="hidden shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.62rem] text-muted-foreground md:inline-flex"
            title="Protected preview — owned by ZYN. Unauthorised reuse is a DMCA takedown and a Roblox asset-theft report."
          >
            <ShieldCheck className="size-3 text-primary" />
            protected
          </span>
        </div>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={`Seek within ${caption}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        aria-valuetext={`${clock(current)} of ${clock(duration)}`}
        onPointerDown={onWavePointer}
        onKeyDown={onWaveKey}
        className="group mt-3 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          className="block h-10 w-full sm:h-12"
          style={{ touchAction: "pan-y" }}
        />
      </div>

      <audio
        ref={audioRef}
        src={media.url}
        preload="metadata"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onPlay={watermark.onPlay}
        onPause={watermark.onPause}
        onEnded={watermark.onPause}
      />
    </div>
  );
}
