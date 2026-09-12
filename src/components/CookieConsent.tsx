import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "zyn-cookie-consent";

/**
 * Cookie consent banner (GDPR / ePrivacy / CCPA-CPRA friendly).
 * This site sets no tracking cookies — the banner only records the visitor's
 * own choice in localStorage, and links the Privacy Policy and Terms.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const choose = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable — banner simply reappears next visit */
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-xl sm:p-5"
    >
      <p className="text-sm font-semibold text-foreground">Cookies, minus the creepiness</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        This portfolio sets no tracking or advertising cookies. If you contact ZYN, only your
        message is stored so he can reply. See the{" "}
        <Link to="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={() => choose("declined")}
          className="rounded-full border border-border px-5 py-2.5 font-display text-sm text-muted-foreground hover:text-foreground"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
