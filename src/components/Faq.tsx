import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

/**
 * FAQ accordion. Keyboard-accessible (native <button> with aria-expanded),
 * animates with a grid-template-rows trick so heights stay smooth.
 */
export function Faq({ settings }: { settings: FaqSettings }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative overflow-hidden py-16 sm:py-24">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-3xl px-4">
        <Reveal>
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">FAQ</p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-4xl">{settings.heading}</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{settings.sub}</p>
        </Reveal>

        <div className="mt-10 space-y-3">
          {settings.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={Math.min(i, 5) * 60}>
                <div
                  className={cn(
                    "glass-card overflow-hidden rounded-2xl",
                    isOpen && "border-primary/30",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-display text-sm font-semibold sm:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-primary transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-hidden={!isOpen}
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
