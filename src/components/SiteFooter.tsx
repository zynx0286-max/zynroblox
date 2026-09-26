import { Link, useLocation, useNavigate } from "@tanstack/react-router";
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
      className="hover:text-foreground"
    >
      {label}
    </Link>
  );

  const pageLink = (
    to: "/" | "/work" | "/services" | "/pricing" | "/reviews" | "/privacy" | "/terms" | "/security",
    label: string,
  ) => (
    <Link
      to={to}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="hover:text-foreground"
    >
      {label}
    </Link>
  );

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 font-display tracking-[0.2em]"
        >
          <span className="glass-card flex size-8 items-center justify-center overflow-hidden rounded-md p-1 text-primary">
            <RobloxMark className="size-5" />
          </span>
          ZYN
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-display text-sm text-muted-foreground">
          {pageLink("/", "Home")}
          {sectionLink("about", "About")}
          {pageLink("/work", "Work")}
          {pageLink("/services", "Services")}
          {pageLink("/pricing", "Pricing")}
          {pageLink("/reviews", "Reviews")}
          {sectionLink("contact", "Contact")}
          {pageLink("/privacy", "Privacy")}
          {pageLink("/terms", "Terms")}
          {pageLink("/security", "Security")}
          <Link
            to="/auth"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-muted-foreground/60 hover:text-foreground"
          >
            Admin
          </Link>
        </nav>

        <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
          <p className="text-xs text-muted-foreground">
            Discord:{" "}
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              className="text-foreground/80 hover:text-foreground hover:underline"
            >
              @acczyn
            </a>
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} ZYN — All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
