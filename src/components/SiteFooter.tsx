import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <Link to="/" className="flex items-center gap-2 font-display tracking-[0.2em]">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="size-3.5" />
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
        </nav>

        <p className="text-xs text-muted-foreground">
          Discord: @acczyn
        </p>
      </div>
    </footer>
  );
}
