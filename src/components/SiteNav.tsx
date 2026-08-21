import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { RobloxMark } from "./RobloxMark";

type NavLink = { label: string; to: "/" | "/work"; hash?: string };

const links: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/", hash: "about" },
  { label: "Work", to: "/work" },
  { label: "Contact", to: "/", hash: "contact" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToHash = (hash: string) => {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        className={`mx-auto flex max-w-5xl items-center justify-between rounded-full px-3 py-2 transition-all duration-300 ${
          scrolled
            ? "glass-strong bg-black/40 backdrop-blur-xl"
            : "glass bg-black/20 backdrop-blur-lg"
        }`}
      >
        <Link
          to="/"
          className="flex items-center gap-2 pl-2 font-display text-lg font-bold tracking-[0.2em]"
        >
          <span className="glass flex size-8 items-center justify-center overflow-hidden rounded-lg text-primary">
            <RobloxMark className="size-5" />
          </span>
          ZYN
        </Link>

        <div
          className="hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {links.map((l, i) => (
            <Link
              key={l.label}
              to={l.to}
              {...(l.hash ? { hash: l.hash } : {})}
              onMouseEnter={() => setHoveredIndex(i)}
              onClick={(e) => {
                if (l.hash) {
                  e.preventDefault();
                  scrollToHash(l.hash);
                }
              }}
              className={`relative rounded-full px-4 py-2 font-display text-sm tracking-wide transition-all duration-300 ${
                hoveredIndex !== null && hoveredIndex !== i
                  ? "blur-sm opacity-40 scale-95"
                  : "hover:blur-0 hover:opacity-100 hover:scale-100"
              } ${
                l.hash
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground bg-secondary/60" }}
            >
              {l.label}
            </Link>
          ))}
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
              onClick={() => {
                setOpen(false);
                if (l.hash) scrollToHash(l.hash);
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
