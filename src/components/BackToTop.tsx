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
        "fixed right-5 bottom-5 z-50 grid size-10 place-items-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur-md transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground sm:right-7 sm:bottom-7",
        shown ? "pointer-events-auto" : "pointer-events-none",
        shown ? "opacity-100" : "opacity-0",
        shown ? "translate-y-0" : "translate-y-2",
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
