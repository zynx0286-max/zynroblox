import { useEffect, useState } from "react";

/**
 * One-time intro preloader. Fades the brand mark out and unmounts. It is
 * fail-safe: a hard timeout always removes it, reduced-motion users skip it,
 * and it never blocks interaction (pointer events are off immediately).
 */
export function Preloader() {
  const [state, setState] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setState("gone");
      return;
    }

    const t1 = setTimeout(() => setState("leaving"), 650);
    const t2 = setTimeout(() => setState("gone"), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div
      aria-hidden
      className="zyn-preloader"
      style={{
        opacity: state === "leaving" ? 0 : 1,
        transition: "opacity 0.45s ease",
        pointerEvents: "none",
      }}
    >
      <span className="zyn-preloader-mark">ZYN</span>
    </div>
  );
}
