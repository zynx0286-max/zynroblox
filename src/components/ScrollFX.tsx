import { useEffect } from "react";

// GSAP-powered scroll layer. Runs on mount (no gate required), is a no-op under
// prefers-reduced-motion, and drives two things:
//
//  - [data-kinetic] — kinetic typography: each headline's words slide up from a
//    masked overflow on a scrub timeline as you scroll.
//  - [data-scrub]   — soft parallax + fade for any element (sections, panels)
//    tied to scroll progress.
//
// Everything is marked-up in the routes (no JSX wrapper needed), so SSR output
// is untouched and the enhancement is purely progressive. GSAP is imported
// lazily on the client only, so SSR never touches it.
export function ScrollFX() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (!("IntersectionObserver" in window) || !("ResizeObserver" in window)) {
      return;
    }

    let cleanup: (() => void) | undefined;

    void import("gsap").then(({ default: gsap }) =>
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
          // --- Kinetic typography ---------------------------------------
          document.querySelectorAll<HTMLElement>("[data-kinetic]").forEach((el) => {
            const words: HTMLElement[] = [];
            // Wrap each text node's words, leaving existing element children
            // (like the highlighted span in the hero H1) intact.
            const walk = (node: Node) => {
              node.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                  const frag = document.createDocumentFragment();
                  const parts = (child.textContent ?? "").split(/(\s+)/);
                  for (const part of parts) {
                    if (!part) continue;
                    const isSpace = /^\s+$/.test(part);
                    if (isSpace) {
                      frag.appendChild(document.createTextNode(part));
                    } else {
                      const word = document.createElement("span");
                      word.className = "zyn-kword";
                      word.setAttribute("aria-hidden", "true");
                      const inner = document.createElement("span");
                      inner.className = "zyn-kword-inner";
                      inner.textContent = part;
                      word.appendChild(inner);
                      frag.appendChild(word);
                      words.push(inner);
                    }
                  }
                  node.replaceChild(frag, child);
                } else {
                  walk(child);
                }
              });
            };
            walk(el);

            // Pre-render at final position, then scrub from below the mask.
            gsap.set(words, { yPercent: 0 });
            el.style.opacity = "1";
            gsap.fromTo(
              words,
              { yPercent: 110, opacity: 0.001 },
              {
                yPercent: 0,
                opacity: 1,
                stagger: 0.06,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: el,
                  start: "top 82%",
                  end: "top 30%",
                  scrub: true,
                },
              },
            );
          });

          // --- Scrub parallax / fades ----------------------------------
          document.querySelectorAll<HTMLElement>("[data-scrub]").forEach((el) => {
            const from = Number(el.dataset["scrubFrom"] ?? 40);
            const to = Number(el.dataset["scrubTo"] ?? -20);
            gsap.fromTo(
              el,
              { yPercent: from / 100, opacity: 0.001 },
              {
                yPercent: to / 100,
                opacity: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top 95%",
                  end: "top 40%",
                  scrub: true,
                },
              },
            );
          });
        });

        cleanup = () => ctx.revert();
      }),
    );

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
