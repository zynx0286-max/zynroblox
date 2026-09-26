import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { RobloxMark } from "./RobloxMark";
import { useContactSettings } from "./ContactSettingsProvider";
import { track } from "@/lib/analytics";

type NavLink = { label: string; to: "/" | "/work" | "/services" | "/pricing" | "/reviews" };

// Top nav only lists standalone pages. The logo goes home, and About /
// Testimonials / Contact live on the home page (linked from the footer and
// from buttons on the home page itself).
const links: NavLink[] = [
  { label: "Work", to: "/work" },
  { label: "Services", to: "/services" },
  { label: "Pricing", to: "/pricing" },
  { label: "Reviews", to: "/reviews" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const location = useLocation();
  const { discordUrl } = useContactSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        className={`mx-auto flex max-w-5xl items-center justify-between rounded-full px-3 py-2 transition-colors ${
          scrolled ? "bg-black/10 backdrop-blur-sm" : "bg-black/5 backdrop-blur-sm"
        }`}
      >
        <Link
          to="/"
          className="flex items-center gap-2 pl-2 font-display text-lg font-bold tracking-[0.2em]"
        >
          <span className="glass flex size-9 items-center justify-center overflow-hidden rounded-lg p-1">
            <RobloxMark className="size-6" />
          </span>
        </Link>

        <div
          className="hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {links.map((l, i) => {
            // Pill highlight only on the matching page — nowhere else.
            const isActive =
              (l.to === "/work" && location.pathname.startsWith("/work")) ||
              (l.to === "/services" && location.pathname.startsWith("/services")) ||
              (l.to === "/pricing" && location.pathname.startsWith("/pricing")) ||
              (l.to === "/reviews" && location.pathname.startsWith("/reviews"));
            const hovered = hoveredIndex !== null && hoveredIndex !== i;
            const base =
              "relative rounded-full px-4 py-2 font-display text-sm tracking-wide transition-all duration-300";
            const hover = hovered ? "opacity-70 scale-98" : "hover:opacity-100 hover:scale-100";
            const activeStyle = isActive
              ? "bg-black/30 text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground";
            const className = `${base} ${hover} ${activeStyle}`;
            return (
              <Link
                key={l.label}
                to={l.to}
                onMouseEnter={() => setHoveredIndex(i)}
                onClick={() => {
                  setHoveredIndex(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={className}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("discord_click", { from: "nav" })}
            className="hidden rounded-full bg-primary px-5 py-2 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] sm:inline-block"
          >
            Hire Me
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-full border border-border text-foreground md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="glass-strong mx-auto mt-2 flex max-w-5xl flex-col rounded-2xl p-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => {
                setOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-xl px-4 py-3 font-display text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("discord_click", { from: "nav_mobile" })}
            className="mt-2 rounded-full bg-primary px-4 py-3 text-center font-display text-sm font-semibold text-primary-foreground"
          >
            Hire Me
          </a>
        </div>
      ) : null}
    </header>
  );
}
