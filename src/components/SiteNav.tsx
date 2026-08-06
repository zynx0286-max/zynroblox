import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import robloxLogo from "@/assets/roblox-logo.png.asset.json";

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        className={`mx-auto flex max-w-5xl items-center justify-between rounded-full px-3 py-2 transition-all duration-300 ${
          scrolled ? "glass-strong" : "glass"
        }`}
      >
        <Link
          to="/"
          className="flex items-center gap-2 pl-2 font-display text-lg font-bold tracking-[0.2em]"
        >
          <span className="glass flex size-8 items-center justify-center overflow-hidden rounded-lg">
            <img src={robloxLogo.url} alt="Roblox logo mark" width={32} height={32} className="size-5" />
          </span>
          ZYN
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              {...(l.hash ? { hash: l.hash } : {})}
              className="rounded-full px-4 py-2 font-display text-sm tracking-wide text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
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
              onClick={() => setOpen(false)}
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
