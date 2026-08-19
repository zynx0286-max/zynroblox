/**
 * Film-grain overlay for texture. Pure CSS animation (transform-only) so it
 * costs almost nothing; hidden on touch/prefers-reduced-motion via CSS.
 */
export function Grain() {
  return <div aria-hidden className="zyn-grain" />;
}
