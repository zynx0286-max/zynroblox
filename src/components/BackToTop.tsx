import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShown(window.scrollY > 600);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={scrollTop}
      className={cn(
        "fixed right-5 bottom-5 z-50 rounded-full bg-black/20 backdrop-blur-sm text-primary shadow-sm transition-all duration-300 hover:bg-black/30 hover:text-primary-foreground sm:right-7 sm:bottom-7",
        shown ? "pointer-events-auto" : "pointer-events-none",
        shown ? "opacity-100" : "opacity-0",
        shown ? "translate-y-0" : "translate-y-2",
      )}
    >
      <ArrowUp className="size-5 opacity-100" />
    </button>
  );
}
