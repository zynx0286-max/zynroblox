import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { RobloxMark } from "./RobloxMark";

type NavLink = { label: string; to: "/" | "/work" | "/reviews"; hash?: string };

const links: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/", hash: "about" },
  { label: "Work", to: "/work" },
  { label: "Testimonials", to: "/", hash: "testimonials" },
  { label: "Reviews", to: "/reviews" },
  { label: "Contact", to: "/", hash: "contact" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToHash = (hash: string) => {
    if (location.pathname !== "/") {
      void navigate({ to: "/", hash }).then(() => {
        window.setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      });
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
  };

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
          <span className="glass flex size-8 items-center justify-center overflow-hidden rounded-lg">
            <RobloxMark className="size-5" />
          </span>
        </Link>

        <div
          className="hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {links.map((l, i) => {
              // Dark oval only on the Work page's Work tab — nowhere else.
              const isActive = l.to === "/work" && location.pathname.startsWith("/work");
              const hovered = hoveredIndex !== null && hoveredIndex !== i;
              const base = "relative rounded-full px-4 py-2 font-display text-sm tracking-wide transition-all duration-300";
              const hover = hovered ? "opacity-70 scale-98" : "hover:opacity-100 hover:scale-100";
              const activeStyle = isActive
                ? "bg-black/30 text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground";
              const className = `${base} ${hover} ${activeStyle}`;
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  {...(l.hash ? { hash: l.hash } : {})}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onClick={(e) => {
                    if (l.hash) {
                      e.preventDefault();
                      setHoveredIndex(null);
                      goToHash(l.hash);
                    }
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
            href="https://discord.com/users/acczyn"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full bg-primary px-5 py-2 font-display text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[var(--shadow-glow)] sm:inline-flex"
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
              {...(l.hash ? { hash: l.hash } : {})}
              onClick={(e) => {
                if (l.hash) e.preventDefault();
                setOpen(false);
                if (l.hash) goToHash(l.hash);
              }}
              className="rounded-xl px-4 py-3 font-display text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}