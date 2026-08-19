import { MessageCircle, Mail, Clock, ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import type { ContactSettings } from "@/lib/site-settings";

export function ContactCta({ settings }: { settings: ContactSettings }) {
  return (
    <section id="contact" className="relative scroll-mt-28 overflow-hidden px-4 py-16 sm:py-24">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="flex flex-col justify-center">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            Contact
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{settings.heading}</h2>
          <p className="mt-4 text-muted-foreground">{settings.body}</p>

          <a
            href={settings.discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("discord_click", { from: "contact_cta" })}
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-center font-display text-base font-bold sm:gap-3 sm:px-8 sm:py-5 sm:text-lg text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:scale-[1.03]"
          >
            <MessageCircle className="size-5 shrink-0 sm:size-6" />
            <span className="truncate">{settings.discordLabel}</span>
            <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <p className="mt-3 text-xs text-muted-foreground">{settings.discordNote}</p>

          <div className="mt-8 space-y-3">
            <a
              href={`mailto:${settings.email}`}
              onClick={() => track("email_click", { from: "contact_cta" })}
              className="glass-card flex items-center gap-3 rounded-2xl px-5 py-4 transition-colors hover:bg-secondary/50"
            >
              <Mail className="size-5 text-primary" />
              <span>
                <span className="block font-display text-sm font-semibold">{settings.email}</span>
                <span className="block text-xs text-muted-foreground">{settings.emailNote}</span>
              </span>
            </a>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {settings.replyNote}
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
