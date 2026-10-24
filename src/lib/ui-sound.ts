import { getAudioContext, resumeAudio } from "./audio-engine";

/**
 * Tiny synthesized UI sound palette.
 *
 * The site belongs to a sound designer, so the interface has its own voice:
 * a soft tick on hover, a click on press, a two-note lift when a page opens.
 * Everything is generated with oscillators — no audio files, no network — and
 * it is off by default and persisted per browser.
 */
export type Cue = "hover" | "tap" | "open" | "success";

const STORAGE_KEY = "zyn:ui-sound";
const listeners = new Set<(enabled: boolean) => void>();
let enabled = false;
let loaded = false;

function loadPreference() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    enabled = false;
  }
}

export function getSoundEnabled(): boolean {
  loadPreference();
  return enabled;
}

export function subscribeSound(fn: (enabled: boolean) => void): () => void {
  loadPreference();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-read the saved preference (used when another tab flips the toggle). */
export function syncSoundPreference() {
  loaded = false;
  loadPreference();
  for (const fn of listeners) fn(enabled);
}

export function setSoundEnabled(next: boolean): void {
  loadPreference();
  if (enabled === next) return;
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    /* private mode: keep the in-memory state */
  }
  for (const fn of listeners) fn(enabled);
  if (next) {
    // This runs inside a click handler, which is exactly the gesture the
    // autoplay policy wants before an AudioContext may produce sound.
    resumeAudio();
    playCue("open");
  }
}

function tone(
  ctx: AudioContext,
  opts: {
    type: OscillatorType;
    from: number;
    to?: number;
    at: number;
    duration: number;
    gain: number;
  },
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const start = ctx.currentTime + opts.at;
  const end = start + opts.duration;

  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, start);
  if (opts.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), end);
  }

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(opts.gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

/**
 * Plays a cue when UI sound is enabled. Safe to call anywhere: without the
 * preference (or without Web Audio) it returns immediately.
 */
export function playCue(cue: Cue): void {
  loadPreference();
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

  switch (cue) {
    case "hover":
      tone(ctx, { type: "sine", from: 1680, to: 1520, at: 0, duration: 0.05, gain: 0.012 });
      break;
    case "tap":
      tone(ctx, { type: "triangle", from: 640, to: 470, at: 0, duration: 0.1, gain: 0.03 });
      tone(ctx, { type: "sine", from: 2100, to: 1800, at: 0, duration: 0.03, gain: 0.008 });
      break;
    case "open":
      tone(ctx, { type: "sine", from: 660, at: 0, duration: 0.16, gain: 0.022 });
      tone(ctx, { type: "sine", from: 990, at: 0.07, duration: 0.2, gain: 0.016 });
      break;
    case "success":
      tone(ctx, { type: "sine", from: 523.25, at: 0, duration: 0.14, gain: 0.02 });
      tone(ctx, { type: "sine", from: 659.25, at: 0.08, duration: 0.14, gain: 0.018 });
      tone(ctx, { type: "sine", from: 880, at: 0.16, duration: 0.22, gain: 0.016 });
      break;
  }
}
