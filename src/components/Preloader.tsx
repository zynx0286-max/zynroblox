import { useEffect, useState } from "react";

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

    const t1 = setTimeout(() => setState("leaving"), 400);
    const t2 = setTimeout(() => setState("gone"), 800);
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
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
      }}
    >
      <div className="zyn-preloader-spinner" />
    </div>
  );
}