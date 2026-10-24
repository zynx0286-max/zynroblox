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
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-surface p-6 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 120% at 8% 0%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 60%)",
            }}
          />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
            <div>
              <p className="font-mono text-[0.58rem] tracking-[0.16em] text-primary uppercase">
                Usage / protected
              </p>
              <span className="mt-6 flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <ShieldAlert className="size-5" />
              </span>
              <h2 className="mt-5 max-w-[13ch] font-display text-[clamp(1.8rem,3.4vw,3rem)] leading-[0.96] font-black tracking-[-0.05em]">
                Before you hit &ldquo;save as&rdquo;.
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Every sample here is original work © ZYN. They stream as protected, watermarked
                previews for evaluation only — not stock, not free assets.
              </p>
            </div>

            <div>
              {/* The text sits in its own span: as bare flex children, the text
                  nodes around each <strong> became separate flex items and the
                  sentence wrapped into ragged columns. */}
              <ul className="space-y-4">
                <li className="grid grid-cols-[auto_1fr] gap-4 border-b border-border pb-4">
                  <span className="font-mono text-[0.58rem] tracking-[0.14em] text-primary">
                    01
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    Taking, extracting or redistributing any sample — in whole or in part — without
                    written permission triggers an immediate{" "}
                    <strong className="text-foreground">DMCA takedown</strong> of wherever it
                    surfaces.
                  </span>
                </li>
                <li className="grid grid-cols-[auto_1fr] gap-4 border-b border-border pb-4">
                  <span className="font-mono text-[0.58rem] tracking-[0.14em] text-primary">
                    02
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    Using a sample inside a Roblox experience without permission is reported as{" "}
                    <strong className="text-foreground">asset theft to Roblox</strong> — that risks
                    the game and the account behind it.
                  </span>
                </li>
                <li className="grid grid-cols-[auto_1fr] gap-4 border-b border-border pb-4">
                  <span className="font-mono text-[0.58rem] tracking-[0.14em] text-primary">
                    03
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    Every preview carries an{" "}
                    <strong className="text-foreground">inaudible watermark</strong> and blocked
                    direct downloads are logged, so lifted audio gets traced back and stays traced.
                  </span>
                </li>
              </ul>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
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
      </div>
    </section>
  );
}
