import { useEffect, useState } from "react";
import { getSoundEnabled, setSoundEnabled, subscribeSound } from "@/lib/ui-sound";

/**
 * Turns the interface's sound palette on or off. Off by default; the choice is
 * remembered. The four bars act as a tiny meter — still while muted, alive
 * while the site has a voice.
 */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getSoundEnabled());
    return subscribeSound(setEnabled);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setSoundEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn interface sound off" : "Turn interface sound on"}
      title={enabled ? "Interface sound: on" : "Interface sound: off"}
      data-cursor-label={enabled ? "MUTE" : "SOUND"}
      data-sound-silent
      className={`group inline-flex h-10 items-center gap-2 rounded-full border border-border px-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground ${className}`}
    >
      <span aria-hidden className="zyn-sfx-bars" data-on={enabled}>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="hidden font-mono text-[0.54rem] tracking-[0.14em] uppercase sm:inline">
        {enabled ? "Snd on" : "Snd off"}
      </span>
    </button>
  );
}
