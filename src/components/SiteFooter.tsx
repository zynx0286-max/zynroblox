import { Link } from "@tanstack/react-router";
import { RobloxMark } from "./RobloxMark";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <Link to="/" className="flex items-center gap-2 font-display tracking-[0.2em]">
          <span className="glass-card flex size-7 items-center justify-center overflow-hidden rounded-md text-primary">
            <RobloxMark className="size-4" />
          </span>
          ZYN
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-6 font-display text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <Link to="/" hash="about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/work" className="hover:text-foreground">
            Work
          </Link>
          <Link to="/" hash="contact" className="hover:text-foreground">
            Contact
          </Link>
          <Link to="/auth" className="text-muted-foreground/60 hover:text-foreground">
            Admin
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">Discord: @acczyn</p>
      </div>
    </footer>
  );
}
