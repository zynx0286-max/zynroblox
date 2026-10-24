import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageHeroMeta = { label: string; value: ReactNode };

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Shared editorial page opener. It replaces the old centered inner-page
 * headers with the same type scale, hairline rules, mono labels and blue
 * accents as the home page, plus a soft pointer-following glow.
 */
export function PageHero({
  index,
  label,
  title,
  copy,
  ghost,
  aside,
  meta,
  children,
  below,
  className,
}: {
  index: string;
  label: string;
  title: ReactNode;
  copy?: ReactNode;
  ghost?: string;
  aside?: ReactNode;
  meta?: PageHeroMeta[];
  children?: ReactNode;
  below?: ReactNode;
  className?: string;
}) {
  const glowRef = useRef<HTMLDivElement | null>(null);

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || prefersReducedMotion()) return;
    const glow = glowRef.current;
    if (!glow) return;
    const rect = event.currentTarget.getBoundingClientRect();
    glow.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    glow.style.setProperty("--my", `${event.clientY - rect.top}px`);
    glow.style.opacity = "1";
  };

  const onPointerLeave = () => {
    if (glowRef.current) glowRef.current.style.opacity = "0";
  };

  const metaCols =
    meta && meta.length === 2
      ? "sm:grid-cols-2"
      : meta && meta.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-4";

  return (
    <section
      className={cn("relative isolate overflow-hidden border-b border-border pt-[70px]", className)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="zyn-page-grid pointer-events-none absolute inset-0 -z-10" />
      <div
        ref={glowRef}
        aria-hidden
        className="zyn-page-glow pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500"
      />
      {ghost ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-[-0.04em] bottom-[-0.14em] z-0 hidden max-w-full truncate font-display text-[clamp(5rem,15vw,13rem)] leading-[0.75] font-black tracking-[-0.09em] text-foreground/[0.035] uppercase select-none sm:block"
        >
          {ghost}
        </span>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:px-10 lg:pt-20 lg:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.64rem]">
            <span className="text-primary">{index}</span>
            <span aria-hidden className="h-px w-6 bg-primary/60" />
            {label}
          </p>
          {aside ? (
            <div className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
              {aside}
            </div>
          ) : null}
        </div>

        <div className="mt-9 grid gap-8 lg:mt-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:gap-14">
          <h1 className="rise-in max-w-[19ch] font-display text-[clamp(2.7rem,7.2vw,6.6rem)] leading-[0.88] font-black tracking-[-0.065em] text-balance">
            {title}
          </h1>

          {copy || children ? (
            <div
              className="rise-in lg:max-w-md lg:justify-self-end"
              style={{ animationDelay: "90ms" }}
            >
              {copy ? (
                <div className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {copy}
                </div>
              ) : null}
              {children ? <div className="mt-6">{children}</div> : null}
            </div>
          ) : null}
        </div>

        {meta && meta.length > 0 ? (
          <dl
            className={cn(
              "mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-border bg-border/60 sm:mt-14",
              metaCols,
            )}
          >
            {meta.map((item) => (
              <div key={item.label} className="bg-background px-4 py-4 sm:px-5 sm:py-5">
                <dt className="font-mono text-[0.55rem] tracking-[0.16em] text-muted-foreground/70 uppercase">
                  {item.label}
                </dt>
                <dd className="mt-2 font-display text-lg leading-none font-bold tracking-[-0.03em] sm:text-xl">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {below ? <div className="mt-8">{below}</div> : null}
      </div>
    </section>
  );
}
