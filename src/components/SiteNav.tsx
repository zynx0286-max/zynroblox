import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { RobloxMark } from "./RobloxMark";
import { Magnetic } from "./Magnetic";
import { SoundToggle } from "./SoundToggle";
import { useContactSettings } from "./ContactSettingsProvider";
import { track } from "@/lib/analytics";

type NavLink = {
  label: string;
  to: "/sfx" | "/work" | "/services" | "/pricing" | "/reviews";
};

// Top nav only lists standalone pages. The logo goes home, and About /
// Testimonials / Contact live on the home page (linked from the footer and
// from buttons on the home page itself).
const links: NavLink[] = [
  { label: "SFX", to: "/sfx" },
  { label: "Work", to: "/work" },
  { label: "Services", to: "/services" },
  { label: "Pricing", to: "/pricing" },
  { label: "Reviews", to: "/reviews" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLSpanElement | null>(null);
  const location = useLocation();
  const { discordUrl } = useContactSettings();

  // Close the mobile menu on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Compact the bar and drive the hairline reading progress once the page
  // leaves the very top. The bar is transform-only, so scrolling never
  // triggers a React render for it.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [location.pathname]);

  const isActive = (to: NavLink["to"]) =>
    to === "/sfx" ? location.pathname.startsWith("/sfx") : location.pathname.startsWith(to);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-border bg-background/90 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]"
          : "border-transparent bg-background/55"
      }`}
    >
      <nav
        aria-label="Main navigation"
        className={`mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 transition-[height] duration-300 sm:px-6 lg:px-10 ${
          scrolled ? "h-[60px]" : "h-[70px]"
        }`}
      >
        <Link
          to="/"
          aria-label="ZYN — home"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group flex items-center gap-2.5"
        >
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface p-1">
            <RobloxMark className="size-5" />
          </span>
          <span className="font-display text-sm font-black tracking-[0.22em] text-foreground">
            ZYN
          </span>
        </Link>

        <div className="mr-7 ml-auto hidden items-center gap-7 lg:flex">
          {links.map((l) => {
            const active = isActive(l.to);
            return (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-current={active ? "page" : undefined}
                className={`relative font-mono text-[0.66rem] tracking-[0.16em] uppercase transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
                <span
                  aria-hidden
                  className={`absolute -bottom-2 left-0 h-px w-full origin-left bg-primary transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <SoundToggle />
          <Magnetic strength={6}>
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("discord_click", { from: "nav" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2.5 font-display text-[0.62rem] font-bold tracking-[0.1em] text-primary-foreground uppercase shadow-[var(--shadow-glow)] transition-colors hover:bg-primary/90 sm:px-4 sm:text-[0.68rem]"
            >
              Let&apos;s talk
              <ArrowUpRight className="size-3.5" />
            </a>
          </Magnetic>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary/50 lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
      >
        <span
          ref={progressRef}
          className="block h-full origin-left bg-primary will-change-transform"
          style={{ transform: "scaleX(0)" }}
        />
      </span>

      {open ? (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-[1500px] flex-col px-4 py-2 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => {
                  setOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center justify-between border-b border-border/70 py-4 font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase last:border-b-0 hover:text-foreground"
              >
                {l.label}
                <ArrowUpRight className="size-4" />
              </Link>
            ))}
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                setOpen(false);
                track("discord_click", { from: "nav_mobile" });
              }}
              className="my-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-display text-xs font-bold tracking-[0.1em] text-primary-foreground uppercase"
            >
              Let&apos;s talk
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
