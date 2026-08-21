import { useEffect, useRef, useState } from "react";

export function AmbientAudio() {
  const [muted, setMuted] = useState(false);
  const [armed, setArmed] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    let ctx: AudioContext | null = null;
    let master: GainNode | null = null;
    const oscs: OscillatorNode[] = [];

    const start = () => {
      if (!Ctx || ctx) return;
      ctx = new Ctx();
      ctxRef.current = ctx;

      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      masterRef.current = master;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 0.7;
      filter.connect(master);

      const root = 55;
      const partials: Array<{ freq: number; type: OscillatorType; gain: number }> = [
        { freq: root, type: "sine", gain: 0.6 },
        { freq: root * 1.5, type: "sine", gain: 0.35 },
        { freq: root * 2, type: "triangle", gain: 0.2 },
        { freq: root * 2.5, type: "sine", gain: 0.15 },
        { freq: root * 3, type: "triangle", gain: 0.1 },
        { freq: root * 4.01, type: "sine", gain: 0.06 },
        { freq: root * 5.02, type: "sine", gain: 0.05 },
      ];
      for (const p of partials) {
        const o = ctx.createOscillator();
        o.type = p.type;
        o.frequency.value = p.freq;
        const g = ctx.createGain();
        g.gain.value = p.gain * 0.6;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.05;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain).connect(o.detune);
        lfo.start();
        o.connect(g).connect(filter);
        o.start();
        oscs.push(o, lfo);
      }

      if (!reduced) {
        const swell = ctx.createOscillator();
        swell.type = "sine";
        swell.frequency.value = 0.07;
        const swellGain = ctx.createGain();
        swellGain.gain.value = 0.15;
        swell.connect(swellGain).connect(master.gain);
        swell.start();
        oscs.push(swell);
      }

      if (!reduced) {
        const fl = ctx.createOscillator();
        fl.frequency.value = 0.045;
        const flg = ctx.createGain();
        flg.gain.value = 200;
        fl.connect(flg).connect(filter.frequency);
        fl.start();
        oscs.push(fl);
      }

      const target = reduced ? 0.08 : 0.15;
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(target, ctx.currentTime + 3);

      setArmed(true);
    };

    const arm = () => {
      start();
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };

    window.addEventListener("pointerdown", arm, { once: true, passive: true });
    window.addEventListener("keydown", arm, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.5);
        const ctxToClose = ctx;
        setTimeout(() => {
          for (const o of oscs) {
            try {
              o.stop();
            } catch {
              /* already stopped */
            }
          }
          ctxToClose.close().catch(() => {});
        }, 600);
      }
    };
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const target = muted ? 0 : 0.15;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.4);
  }, [muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!armed) return null;

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
