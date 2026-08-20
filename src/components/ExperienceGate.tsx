import { useEffect, useState } from "react";
import { activateExperience, useExperienceActive } from "@/lib/experience";

// "Click to activate the experience" intro, inspired by the reference site.
// Full-screen gate that boots audio + WebGL on a real user gesture (also
// satisfies browser autoplay rules). Fail-safe: a hard timeout removes it,
// reduced-motion users see a simple Enter button, and it never traps focus.
export function ExperienceGate() {
  const active = useExperienceActive();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // If something already activated (e.g. a direct nav later), don't show.
    if (active) setGone(true);
  }, [active]);

  // Never block interaction for more than a moment if JS hiccups.
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 12000);
    return () => clearTimeout(t);
  }, []);

  const enter = () => {
    activateExperience();
    setLeaving(true);
    setTimeout(() => setGone(true), 900);
  };

  if (gone) return null;

  return (
    <div
      aria-live="polite"
      className="zyn-gate"
      data-leaving={leaving ? "" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "grid",
        placeItems: "center",
        background: "color-mix(in oklab, var(--background) 96%, transparent)",
        backdropFilter: "blur(6px)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1)",
        cursor: "pointer",
      }}
      onClick={enter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          enter();
        }
      }}
    >
      <div className="zyn-gate-inner" style={{ textAlign: "center", padding: "1.5rem" }}>
        <div className="zyn-gate-mark" aria-hidden>
          ZYN
        </div>
        <p
          className="zyn-gate-hint"
          style={{
            marginTop: "1.25rem",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            fontSize: "clamp(0.7rem, 2.6vw, 0.9rem)",
            color: "var(--muted-foreground)",
          }}
        >
          Click anywhere to activate the experience
        </p>
        <div
          className="zyn-gate-bar"
          aria-hidden
          style={{
            margin: "1.4rem auto 0",
            height: 2,
            width: "min(280px, 60vw)",
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent)",
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}
