import type { WorkMedia as WorkMediaType } from "@/lib/site.functions";
import { AudioWavePlayer } from "./AudioWavePlayer";

// Protected audio preview.
//
// The player is custom now (waveform + scrubbing + live analyser) instead of a
// native <audio controls> pill, but the protection is unchanged:
// - no download entry and no open-in-tab path (the uploads route refuses
//   document/iframe destinations)
// - right-click and drag-out are swallowed by the player
// - every on-site playback carries the inaudible identification tone from
//   useAudioWatermark, so a recording of a preview identifies this site as its
//   source.
//
// None of this is DRM — it raises the cost of casual ripping and keeps the
// paper trail for the notice below the player.
export function ProtectedAudio({ media }: { media: WorkMediaType }) {
  return <AudioWavePlayer media={media} />;
}
