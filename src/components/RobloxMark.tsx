// Crisp, theme-aware Roblox "R" mark as inline SVG (crisper than the PNG
// asset at any size, and it inherits the current colour).
export function RobloxMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={{ display: "block" }}>
      <rect width="24" height="24" rx="4.5" fill="currentColor" opacity="0.12" />
      <path
        fill="currentColor"
        d="M6.5 5h7a4.6 4.6 0 0 1 2.7 8.2L19 19h-3.5l-2.7-4.5H9.6V19H6.5V5Zm3.1 3v4.4h3.4a2.2 2.2 0 0 0 0-4.4H9.6Z"
      />
    </svg>
  );
}
