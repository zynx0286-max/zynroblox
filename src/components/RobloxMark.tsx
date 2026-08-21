export function RobloxMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    >
      <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" />
      <path
        d="M7.5 6.5h6a3.5 3.5 0 0 1 2.5 6.2L19.5 17.5H15.5L13.3 14h-5.8v3.5H7.5V6.5Zm2.9 2.8v2.6h2.4a1.6 1.6 0 0 0 0-2.6h-2.4Z"
        fill="white"
      />
    </svg>
  );
}
