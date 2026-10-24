import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Numbered editorial section header used across the home page:
 * a mono rule with the section number, then a huge tight headline and an
 * optional supporting paragraph aligned to the right.
 */
export function SectionHead({
  index,
  label,
  title,
  copy,
  aside,
  className,
}: {
  index: string;
  label: string;
  title?: string | undefined;
  copy?: string | undefined;
  aside?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn(className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.64rem]">
          <span className="text-primary">{index}</span>
          <span aria-hidden className="h-px w-6 bg-primary/60" />
          {label}
        </p>
        {aside}
      </div>

      {title ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-12">
          <h2 className="max-w-[22ch] font-display text-[clamp(1.95rem,4.6vw,4.25rem)] leading-[0.94] font-black tracking-[-0.055em]">
            {title}
          </h2>
          {copy ? (
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground lg:justify-self-end">
              {copy}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
