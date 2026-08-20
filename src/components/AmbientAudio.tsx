import { useEffect, useRef, useState } from "react";
import { useExperienceActive } from "@/lib/experience";

// Barely-audible procedural ambient pad built with the Web Audio API — no audio
// files shipped. A handful of detuned sine/triangle oscillators form a soft,
// open-fifth drone through a lowpass filter with a slow LFO, plus gentle
// amplitude swells so it breathes. It only starts after the visitor activates
// the experience (a required user gesture for audio autoplay) and is muted by
// a toggle in the corner. Reduced-motion users get an even quieter, static bed.
export function AmbientAudio() {
  const active = useExperienceActive();
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!active) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0; // fade in
    master.connect(ctx.destination);
    masterRef.current = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.7;
    filter.connect(master);

    // Soft drone — root + open fifth + shimmer, each slightly detuned.
    const root = 55; // A1
    const partials: Array<{ freq: number; type: OscillatorType; gain: number }> = [
      { freq: root, type: "sine", gain: 0.5 },
      { freq: root * 1.5, type: "sine", gain: 0.28 },
      { freq: root * 2, type: "triangle", gain: 0.16 },
      { freq: root * 2.5, type: "sine", gain: 0.12 },
      { freq: root * 3, type: "triangle", gain: 0.08 },
      { freq: root * 4.01, type: "sine", gain: 0.05 },
      { freq: root * 5.02, type: "sine", gain: 0.04 },
    ];
    const oscs: OscillatorNode[] = [];
    for (const p of partials) {
      const o = ctx.createOscillator();
      o.type = p.type;
      o.frequency.value = p.freq;
      const g = ctx.createGain();
      g.gain.value = p.gain * 0.5;
      // Slow detune drift so the pad is never static.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2.5;
      lfo.connect(lfoGain).connect(o.detune);
      lfo.start();
      o.connect(g).connect(filter);
      o.start();
      oscs.push(o, lfo);
    }

    // Breathing amplitude swell (skipped for reduced-motion).
    if (!reduced) {
      const swell = ctx.createOscillator();
      swell.type = "sine";
      swell.frequency.value = 0.06;
      const swellGain = ctx.createGain();
      swellGain.gain.value = 0.12;
      swell.connect(swellGain).connect(master.gain);
      swell.start();
      oscs.push(swell);
    }

    // Filter sweep for life.
    if (!reduced) {
      const fl = ctx.createOscillator();
      fl.frequency.value = 0.04;
      const flg = ctx.createGain();
      flg.gain.value = 180;
      fl.connect(flg).connect(filter.frequency);
      fl.start();
      oscs.push(fl);
    }

    // Fade in to a very low volume over ~4s.
    const target = reduced ? 0.025 : 0.05;
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 4);

    return () => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.6);
      setTimeout(() => {
        for (const o of oscs) {
          try {
            o.stop();
          } catch {
            /* already stopped */
          }
        }
        ctx.close().catch(() => {});
      }, 700);
    };
  }, [active]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const target = muted ? 0 : 0.05;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.5);
  }, [muted, active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => setMuted((m) => !m)}
      aria-label={muted ? "Unmute ambient audio" : "Mute ambient audio"}
      aria-pressed={muted}
      title={muted ? "Ambient audio: off (press M)" : "Ambient audio: on (press M)"}
      className="zyn-audio-toggle"
    >
      <span className={muted ? "zyn-audio-bar zyn-audio-bar--off" : "zyn-audio-bar"} />
      <span
        className={muted ? "zyn-audio-bar zyn-audio-bar--off" : "zyn-audio-bar"}
        style={{ animationDelay: "-0.6s" }}
      />
      <span
        className={muted ? "zyn-audio-bar zyn-audio-bar--off" : "zyn-audio-bar"}
        style={{ animationDelay: "-1.2s" }}
      />
      <span
        className={muted ? "zyn-audio-bar zyn-audio-bar--off" : "zyn-audio-bar"}
        style={{ animationDelay: "-1.8s" }}
      />
    </button>
  );
}
