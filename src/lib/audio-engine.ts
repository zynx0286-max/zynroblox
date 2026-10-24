/**
 * One shared Web Audio context for the whole site.
 *
 * Both the UI sound palette and the SFX preview players go through this, so a
 * page full of audio clips never burns through the browser's per-page context
 * limit (Chrome allows ~6 before refusing to create more). The context is only
 * created inside a user gesture, so autoplay policy is never violated.
 */
type AudioContextCtor = new () => AudioContext;

let context: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context && context.state !== "closed") return context;

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

/** Returns a running context, resuming a suspended one where allowed. */
export function resumeAudio(): AudioContext | null {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}
