/**
 * Smooth-scroll to a section on the home page. If we're already home, scroll
 * directly; otherwise navigate home first, then scroll once it renders.
 */
export function goToHomeSection(
  navigate: (opts: { to: "/"; hash?: string }) => Promise<void> | void,
  pathname: string,
  hash: string,
) {
  if (pathname !== "/") {
    void Promise.resolve(navigate({ to: "/", hash })).then(() => {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    });
    return;
  }
  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
}
