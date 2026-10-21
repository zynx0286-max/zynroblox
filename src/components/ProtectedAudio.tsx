import { FileAudio, ShieldCheck } from "lucide-react";
import type { WorkMedia as WorkMediaType } from "@/lib/site.functions";
import { useAudioWatermark } from "@/lib/audio-watermark";
import { cn } from "@/lib/utils";

// Hardened per-file audio row. The native controls are kept for familiarity
// but locked down: `controlsList="nodownload"` removes the browser's
// "Download" entry, `noremoteplayback` drops AirPlay/Chromecast targets
// (which expose the raw stream), and the row swallows right-click and
// drag-out so "save audio as…" has no obvious handle. The uploads route
// blocks the open-in-tab variant separately.
//
// On top of that, every on-site playback carries the inaudible
// identification tone from useAudioWatermark (see audio-watermark.ts), so a
// recording of a preview identifies this site as its source. None of this is
// DRM — it raises the cost of casual ripping and keeps the paper trail for
// the notice below the player.
export function ProtectedAudio({ media }: { media: WorkMediaType }) {
  const watermark = useAudioWatermark();

  return (
    <div
      className="glass flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <FileAudio className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">
            {media.caption || "Audio clip"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            SFX / audio preview — protected, watermarked
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <audio
          controls
          preload="metadata"
          controlsList="nodownload noplaybackrate noremoteplayback"
          // Chrome/Safari draw native controls in the page's used color-scheme,
          // which defaults to light here and made every player a white pill on
          // a dark card. Forcing dark keeps the controls on-theme.
          className={cn("h-11 w-full [color-scheme:dark] sm:w-72")}
          src={media.url}
          onPlay={watermark.onPlay}
          onPause={watermark.onPause}
          onEnded={watermark.onPause}
        >
          Your browser doesn&apos;t support audio.
        </audio>
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.65rem] text-muted-foreground lg:inline-flex"
          title="Protected preview — owned by ZYN. Unauthorised reuse is a DMCA takedown and a Roblox asset-theft report."
        >
          <ShieldCheck className="size-3 text-primary" />
          protected
        </span>
      </div>
    </div>
  );
}
