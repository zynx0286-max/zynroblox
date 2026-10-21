import { useCallback, useEffect, useRef } from "react";

// Inaudible playback watermark. Every preview played ON the site carries a
// near-inaudible identification triple-ping (~15 kHz, very low gain) layered
// over it every 45 seconds via Web Audio. The tone only exists during on-site
// playback — the stored file itself is untouched — so anything captured while
// listening on the site (screen recorder, virtual-audio cable, speaker mic)
// inherits the tag and identifies the capture as coming from this site.
//
// 15 kHz sits at the edge of adult hearing and stays ~-34 dBFS, so normal
// listeners never notice it; analysis tools find it trivially. The pattern of
// three pings every 45 s is intentionally regular so it survives cuts to a
// fraction of the audio and can be matched against the known site signature.
const PING_HZ = 15000;
const PING_GAIN = 0.02;
const PING_SECONDS = 0.06;
/** Multi-ping rhythm — a single ping would be indistinguishable from noise. */
const PING_OFFSETS = [0, 0.16, 0.32];
const PERIOD_MS = 45_000;

/**
 * Returns the event handlers to spread over an <audio> element. The context
 * is created lazily on the first `play` event (a user gesture, so autoplay
 * policy is satisfied) and torn down on unmount.
 */
export function useAudioWatermark() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const burst = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state === "closed") return;
    const t0 = ctx.currentTime + 0.05;
    for (const offset of PING_OFFSETS) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = PING_HZ;
      gain.gain.setValueAtTime(PING_GAIN, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + PING_SECONDS);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + PING_SECONDS);
    }
  }, []);

  const stopWatermark = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    burst(); // mark the very start of every listen
    if (timerRef.current === null) {
      timerRef.current = window.setInterval(burst, PERIOD_MS);
    }
  }, [burst]);

  const handlePause = useCallback(() => {
    // Keep the context (it's cheap) but stop scheduling while paused.
    stopWatermark();
  }, [stopWatermark]);

  useEffect(
    () => () => {
      stopWatermark();
      if (ctxRef.current && ctxRef.current.state !== "closed") void ctxRef.current.close();
      ctxRef.current = null;
    },
    [stopWatermark],
  );

  return { onPlay: handlePlay, onPause: handlePause };
}

if (import.meta.env.DEV) {
  console.debug("[watermark] module loaded: on-site playback carries ID pings");
}
