import { useEffect } from "react";
import { getSoundEnabled, playCue, syncSoundPreference } from "@/lib/ui-sound";

const INTERACTIVE =
  "a[href], button, summary, [role='button'], [role='tab'], [role='menuitem'], [data-sound-hover]";

/**
 * Document-level sound wiring. One set of delegated listeners gives every
 * link, button and tab in the site its hover tick and press click, without
 * touching each component. Pointer-only and always gated by the persisted
 * preference, so it is silent until the visitor turns it on.
 */
export function SoundLayer() {
  useEffect(() => {
    let lastElement: Element | null = null;
    let lastAt = 0;

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !getSoundEnabled()) return;
      const target = (event.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      if (!target || target === lastElement) return;

      // Ignore moves that stay inside the same interactive element.
      const from = (event.relatedTarget as Element | null)?.closest?.(INTERACTIVE) ?? null;
      lastElement = target;
      if (from === target) return;

      const now = performance.now();
      if (now - lastAt < 45) return;
      lastAt = now;
      playCue("hover");
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      if (target && target === lastElement) lastElement = null;
    };

    const onClick = (event: MouseEvent) => {
      if (!getSoundEnabled()) return;
      const el = (event.target as Element | null)?.closest?.(INTERACTIVE) as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      if (el.closest("[data-sound-silent]")) return;
      playCue("tap");
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "zyn:ui-sound") syncSoundPreference();
    };

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("storage", onStorage);

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("click", onClick);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
