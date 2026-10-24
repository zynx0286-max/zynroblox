import { ArrowUpRight, Clock } from "lucide-react";
import { track } from "@/lib/analytics";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import type { ContactSettings } from "@/lib/site-settings";

export function ContactCta({ settings }: { settings: ContactSettings }) {
  return (
    <section id="contact" className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 65% at 82% 30%, color-mix(in oklab, var(--primary) 24%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,8vw,8rem)] sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <Reveal>
            <p className="flex flex-wrap items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.64rem]">
              <span className="text-primary">06</span>
              <span aria-hidden className="h-px w-6 bg-primary/60" />
              Contact
              <span className="ml-auto text-muted-foreground/60">Channel open</span>
            </p>

            <h2 className="mt-8 max-w-[18ch] font-display text-[clamp(2.1rem,4.6vw,4.25rem)] leading-[0.94] font-black tracking-[-0.055em]">
              {settings.heading}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {settings.body}
            </p>

            <div className="mt-10 border-t border-border">
              <a
                href={settings.discordUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => track("discord_click", { from: "contact_cta" })}
                className="group flex items-start gap-4 border-b border-border py-5"
              >
                <span className="mt-0.5 font-mono text-[0.6rem] tracking-[0.12em] text-primary">
                  01
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
                    {settings.discordLabel}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {settings.discordNote}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              <a
                href={`mailto:${settings.email}`}
                onClick={() => track("email_click", { from: "contact_cta" })}
                className="group flex items-start gap-4 border-b border-border py-5"
              >
                <span className="mt-0.5 font-mono text-[0.6rem] tracking-[0.12em] text-primary">
                  02
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
                    {settings.email}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {settings.emailNote}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              <p className="flex items-center gap-2 py-4 font-mono text-[0.58rem] tracking-[0.08em] text-muted-foreground/70 uppercase">
                <Clock className="size-3 text-primary" aria-hidden />
                {settings.replyNote}
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
