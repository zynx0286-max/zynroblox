import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { FaqSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { useContactSettings } from "./ContactSettingsProvider";

/**
 * FAQ accordion. Keyboard-accessible (native <button> with aria-expanded),
 * animates with a grid-template-rows trick so heights stay smooth.
 */
export function Faq({ settings }: { settings: FaqSettings }) {
  const [open, setOpen] = useState<number | null>(0);
  const { discordUrl } = useContactSettings();

  return (
    <section id="faq" className="border-t border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,8vw,8rem)] sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <p className="flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.64rem]">
            <span className="text-primary">05</span>
            <span aria-hidden className="h-px w-6 bg-primary/60" />
            FAQ
          </p>
          <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
            {String(settings.items.length).padStart(2, "0")} answers
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div>
            <h2 className="max-w-[13ch] font-display text-[clamp(2rem,4.4vw,3.9rem)] leading-[0.94] font-black tracking-[-0.055em]">
              {settings.heading}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {settings.sub}
            </p>
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              className="group mt-7 inline-flex items-center gap-2 border-b border-primary/50 pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary hover:text-foreground"
            >
              Ask something else
              <ArrowUpRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="space-y-2">
            {settings.items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.q}
                  className={cn(
                    "editorial-card transition-colors duration-300",
                    isOpen && "border-primary/40",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-start gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="mt-1 font-mono text-[0.56rem] tracking-[0.12em] text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-base leading-snug font-semibold tracking-[-0.02em] sm:text-lg">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 size-4 shrink-0 text-primary transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-hidden={!isOpen}
                    className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-5 pl-[3.4rem] text-sm leading-relaxed text-muted-foreground sm:pr-6 sm:pl-[3.7rem]">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
