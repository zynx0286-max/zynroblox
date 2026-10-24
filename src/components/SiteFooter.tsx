import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { RobloxMark } from "./RobloxMark";
import { goToHomeSection } from "@/lib/scroll";
import { useContactSettings } from "./ContactSettingsProvider";

export function SiteFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { discordUrl } = useContactSettings();

  const sectionLink = (hash: string, label: string) => (
    <Link
      to="/"
      hash={hash}
      onClick={(e) => {
        e.preventDefault();
        goToHomeSection(navigate, location.pathname, hash);
      }}
      className="transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );

  const pageLink = (
    to:
      | "/"
      | "/sfx"
      | "/work"
      | "/services"
      | "/pricing"
      | "/reviews"
      | "/privacy"
      | "/terms"
      | "/security",
    label: string,
  ) => (
    <Link
      to={to}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );

  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 82% 18%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 48%), linear-gradient(135deg, color-mix(in oklab, var(--primary) 8%, var(--background)), var(--background) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="font-mono text-[0.66rem] tracking-[0.18em] text-muted-foreground uppercase">
              Roblox sound · QA · community
            </p>
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="mt-6 inline-flex items-center gap-3"
            >
              <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface p-1.5">
                <RobloxMark className="size-6" />
              </span>
              <span className="font-display text-[clamp(3rem,7vw,6rem)] leading-[0.85] font-black tracking-[-0.06em]">
                ZYN<span className="text-primary">.</span>
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Original game audio, thorough QA and calmer communities — built for Roblox teams that
              care how the game feels.
            </p>
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              className="group mt-8 inline-flex items-center gap-2 border-b border-primary/50 pb-1 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-primary"
            >
              Message on Discord
              <ArrowUpRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <nav aria-label="Pages" className="flex flex-col gap-3">
              <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground/70 uppercase">
                Pages
              </p>
              <div className="flex flex-col gap-2.5 font-mono text-[0.7rem] tracking-[0.08em] text-muted-foreground uppercase">
                {pageLink("/sfx", "SFX")}
                {pageLink("/work", "Work")}
                {pageLink("/services", "Services")}
                {pageLink("/pricing", "Pricing")}
                {pageLink("/reviews", "Reviews")}
              </div>
            </nav>

            <nav aria-label="More" className="flex flex-col gap-3">
              <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground/70 uppercase">
                More
              </p>
              <div className="flex flex-col gap-2.5 font-mono text-[0.7rem] tracking-[0.08em] text-muted-foreground uppercase">
                {sectionLink("about", "About")}
                {sectionLink("contact", "Contact")}
                {pageLink("/privacy", "Privacy")}
                {pageLink("/terms", "Terms")}
                {pageLink("/security", "Security")}
              </div>
            </nav>

            <nav aria-label="Connect" className="col-span-2 flex flex-col gap-3 sm:col-span-1">
              <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground/70 uppercase">
                Connect
              </p>
              <div className="flex flex-col gap-2.5 font-mono text-[0.7rem] tracking-[0.08em] text-muted-foreground uppercase">
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  Discord <ArrowUpRight className="size-3" />
                </a>
                <a
                  href="mailto:zynx0286@gmail.com"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  Email <ArrowUpRight className="size-3" />
                </a>
                <Link
                  to="/auth"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="transition-colors hover:text-foreground"
                >
                  Admin
                </Link>
              </div>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.62rem] tracking-[0.12em] text-muted-foreground/70 uppercase">
            © {new Date().getFullYear()} ZYN — All rights reserved
          </p>
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              })
            }
            className="inline-flex items-center gap-2 self-start font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground sm:self-auto"
          >
            Back to top
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
