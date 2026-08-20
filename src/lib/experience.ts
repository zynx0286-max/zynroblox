// Experience activation controller.
//
// The immersive layer (WebGL hero + ambient audio) only boots after the visitor
// clicks to enter. Browsers block audio autoplay until a user gesture, and
// gating WebGL behind activation also lets heavy effects skip prerender/SSR.
// This is a tiny module singleton + hook so any component can subscribe without
// a context provider.

import { useSyncExternalStore } from "react";

const target = typeof EventTarget !== "undefined" ? new EventTarget() : null;
let activated = false;

export function isExperienceActive(): boolean {
  return activated;
}

export function activateExperience(): void {
  if (activated) return;
  activated = true;
  if (typeof document !== "undefined") {
    document.documentElement.dataset["zynExperience"] = "active";
  }
  target?.dispatchEvent(new Event("change"));
}

function subscribe(cb: () => void): () => void {
  if (!target) return () => {};
  target.addEventListener("change", cb);
  return () => target.removeEventListener("change", cb);
}

export function useExperienceActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => activated,
    () => false,
  );
}
