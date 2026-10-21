import { ShieldAlert } from "lucide-react";

// The "don't steal these" notice. Shown full-strength on the /sfx page and
// compact next to the audio players on work pages that carry samples. The
// wording deliberately states only the deterrents that actually exist:
// the protected stream on /uploads, the playback watermark, and the Worker
// log entry written for every blocked direct-open attempt.
export function SfxProtectionNotice({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface/40 px-3 py-2 text-[0.7rem] text-muted-foreground">
        <ShieldAlert className="size-3.5 shrink-0 text-primary" />
        <span>
          These are protected, watermarked previews owned by ZYN. Downloading, extracting or reusing
          them anywhere without permission triggers a DMCA takedown and a Roblox asset-theft report.
        </span>
      </p>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24">
      <div className="glass-card rounded-2xl border border-primary/25 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="glass flex size-11 shrink-0 items-center justify-center rounded-xl text-primary">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold sm:text-xl">
              Before you hit "save as" —
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every sample here is original work © ZYN. They stream as protected, watermarked
              previews for evaluation only — not stock, not free assets.
            </p>
            {/* The text sits in its own span: as bare flex children, the text
                nodes around each <strong> became separate flex items and the
                sentence wrapped into ragged columns. */}
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="shrink-0 text-primary">—</span>
                <span>
                  Taking, extracting or redistributing any sample — in whole or in part — without
                  written permission triggers an immediate{" "}
                  <strong className="text-foreground">DMCA takedown</strong> of wherever it
                  surfaces.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-primary">—</span>
                <span>
                  Use inside a Roblox experience without permission is reported as{" "}
                  <strong className="text-foreground">asset theft to Roblox</strong> — that risks
                  the game and the account behind it.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-primary">—</span>
                <span>
                  Every preview carries an{" "}
                  <strong className="text-foreground">inaudible watermark</strong> and blocked
                  direct downloads are logged, so lifted audio gets traced back and stays traced.
                </span>
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Want to use something? The same door everyone walks through:{" "}
              <a
                href="/work"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                get in touch through the Work Archive
              </a>
              . Licensing is fast and friendly — theft is not.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
