import { MessageCircle, Mail, Clock } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

export function ContactCta() {
  return (
    <section id="contact" className="relative scroll-mt-28 overflow-hidden px-4 py-24">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            Contact
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Need custom SFX, sharper QA, or a stronger community?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Send the details and I&apos;ll come back with scope, timeline and a
            sample direction for your game&apos;s sound.
          </p>

          <div className="mt-8 space-y-3">
            <a
              href="https://discord.com/users/acczyn"
              target="_blank"
              rel="noreferrer"
              className="glass flex items-center gap-3 rounded-2xl px-5 py-4 transition-colors hover:bg-secondary/50"
            >
              <MessageCircle className="size-5 text-primary" />
              <span>
                <span className="block font-display text-sm font-semibold">Discord — @acczyn</span>
                <span className="block text-xs text-muted-foreground">Fastest way to reach me</span>
              </span>
            </a>
            <a
              href="mailto:zynx0286@gmail.com"
              className="glass flex items-center gap-3 rounded-2xl px-5 py-4 transition-colors hover:bg-secondary/50"
            >
              <Mail className="size-5 text-primary" />
              <span>
                <span className="block font-display text-sm font-semibold">zynx0286@gmail.com</span>
                <span className="block text-xs text-muted-foreground">
                  I&apos;m slower on email — Discord gets a quicker reply
                </span>
              </span>
            </a>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Typical response: minutes on Discord, up to a few days by email.
            </p>
          </div>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
