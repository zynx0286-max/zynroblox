import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveAsset } from "@/lib/assets";

export function GlassFrame({
  children,
  className,
  ratio = "aspect-video",
}: {
  children?: ReactNode;
  className?: string | undefined;
  ratio?: string | undefined;
}) {
  return (
    <div className={cn("glass relative overflow-hidden rounded-xl", ratio, className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/20" />
      {children}
    </div>
  );
}

export function GlassImage({
  src,
  alt,
  className,
  ratio = "aspect-video",
}: {
  src?: string | undefined;
  alt: string;
  className?: string | undefined;
  ratio?: string | undefined;
}) {
  return (
    <GlassFrame ratio={ratio} className={className}>
      {src ? (
        <img
          src={resolveAsset(src)}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-90 transition-all duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface/40">
          <span className="font-display text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">
            Image coming soon
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
    </GlassFrame>
  );
}
