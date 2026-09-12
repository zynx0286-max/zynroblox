export function RobloxMark({ className }: { className?: string }) {
  return (
    <img
      src="/roblox-logo.png"
      alt="ZYN logo"
      className={className}
      style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
