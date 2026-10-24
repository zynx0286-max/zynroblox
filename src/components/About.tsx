import { Plus } from "lucide-react";
import { SectionHead } from "@/components/bits/SectionHead";
import { AnimatedCounter } from "./AnimatedCounter";
import carpetCleaning from "@/assets/carpet-cleaning-simulator.png";
import type { AboutSettings, SkillsSettings } from "@/lib/site-settings";
function StatValue({ value }: { value: string }) {
  const suffix = value.replace(/[\d,]/g, "").trim();
  // Keep the original space ("48 hrs") but never split a unit that was
  // attached ("100%" must not become "100 %").
  const gap = /[\d,]\s+/.test(value) ? " " : "";
  return (
    <AnimatedCounter
      value={value}
      duration={1800}
      ssrStart
      suffix={suffix ? `${gap}${suffix}` : ""}
    />
  );
}

export function About({
  settings,
  skills,
}: {
  settings: AboutSettings;
  skills?: SkillsSettings | undefined;
}) {
  return (
    <section id="about" className="border-t border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,8vw,8rem)] sm:px-6 lg:px-10">
        <SectionHead index="01" label="About" title={settings.heading} copy={settings.body} />

        <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
          {settings.points.map((p) => (
            <li
              key={p}
              className="inline-flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.08em] text-muted-foreground uppercase sm:text-[0.66rem]"
            >
              <Plus className="size-3 shrink-0 text-primary" aria-hidden />
              {p}
            </li>
          ))}
        </ul>

        {skills && (skills.items.length > 0 || skills.currently) ? (
          <div className="mt-9 grid gap-6 border-t border-border pt-6 lg:grid-cols-[0.4fr_0.6fr]">
            <div>
              <p className="font-mono text-[0.56rem] tracking-[0.16em] text-primary uppercase">
                {skills.currentlyHeading}
              </p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {skills.currently}
              </p>
            </div>
            {skills.items.length > 0 ? (
              <div>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {skills.heading}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {skills.items.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-full border border-border px-2.5 py-1 font-mono text-[0.5rem] tracking-[0.06em] text-muted-foreground uppercase"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="group relative min-h-[300px] overflow-hidden rounded-[26px] border border-border">
            <img
              src={carpetCleaning}
              alt="Carpet Cleaning Simulator — QA tested Roblox game"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="font-mono text-[0.6rem] tracking-[0.17em] text-primary uppercase">
                {settings.badge}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-foreground/90">
                {settings.badgeCopy}
              </p>
            </div>
          </div>

          <div
            className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[26px] border border-primary/60 p-6"
            style={{
              background:
                "linear-gradient(145deg, color-mix(in oklab, var(--primary) 88%, white), color-mix(in oklab, var(--primary) 28%, var(--background)))",
            }}
          >
            <p className="font-mono text-[0.6rem] tracking-[0.17em] text-white/75 uppercase">
              Turnaround
            </p>
            <div>
              <p className="font-display text-[clamp(2.6rem,5vw,4.2rem)] leading-[0.9] font-black tracking-[-0.06em] text-white">
                <StatValue value={settings.stat1.value} />
              </p>
              <p className="mt-3 max-w-xs text-sm leading-snug text-white/75">
                {settings.stat1.label}
              </p>
            </div>
          </div>

          <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[26px] border border-border bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))] p-6">
            <p className="font-mono text-[0.6rem] tracking-[0.17em] text-muted-foreground uppercase">
              Repeat clients
            </p>
            <div>
              <p className="font-display text-[clamp(2.6rem,5vw,4.2rem)] leading-[0.9] font-black tracking-[-0.06em]">
                <StatValue value={settings.stat2.value} />
              </p>
              <p className="mt-3 max-w-xs text-sm leading-snug text-muted-foreground">
                {settings.stat2.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
