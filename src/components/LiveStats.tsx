import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, BarChart3, FolderOpen } from "lucide-react";
import { getLiveGameStats, type LiveGameStats } from "@/lib/live-stats.functions";
import { AnimatedCounter } from "./AnimatedCounter";

// How long to keep showing a loading placeholder before admitting the live
// feed failed. The Roblox API is rate-limited and universe resolution can take
// a while on cold starts — showing "error" instantly (e.g. for a legit 0 CCU
// at quiet hours) is wrong, so we wait out this grace period first.
const ERROR_GRACE_MS = 60_000;

// Live Roblox game counters. The route loader fetches the numbers during SSR so
// real values are already in the initial HTML (no flash, no client fetch
// needed). This component then polls the server fn (which reads the Roblox API)
// every 120s and re-renders as animated live counts. Falls back gracefully: if
// the API is unavailable it shows the last known values — never crashes.
export function LiveStats({
  initial,
  projects,
}: {
  initial?: LiveGameStats | null;
  /** Static portfolio size, shown as the third column when provided. */
  projects?: number;
}) {
  const stats = useServerFn(getLiveGameStats);
  const query = useQuery({
    queryKey: ["live-game-stats"],
    queryFn: () => stats(),
    refetchInterval: 120_000,
    staleTime: 60_000,
    retry: 2,
    initialData: initial ?? undefined,
  });

  // Grace timer: only allow the "error" state after the feed has had a full
  // minute to resolve. Resets whenever good data arrives.
  const [graceExpired, setGraceExpired] = useState(false);
  const data = query.data;
  // The feed only counts as resolved when it actually carries game data — an
  // empty games list with zeroed totals means the Roblox API failed, not that
  // the games genuinely have 0 visits.
  const resolved = data !== undefined && (data.games.length > 0 || data.totalVisits > 0);
  useEffect(() => {
    if (resolved) {
      setGraceExpired(false);
      return;
    }
    const t = setTimeout(() => setGraceExpired(true), ERROR_GRACE_MS);
    return () => clearTimeout(t);
  }, [resolved]);

  const live = resolved;
  const totalVisits = data?.totalVisits ?? 0;
  const totalPlaying = data?.totalPlaying ?? 0;

  // While the feed is still trying (first fetch in flight, retries running,
  // grace period not yet over) show a neutral placeholder — never "error".
  // "error" appears only after a full minute with no usable data. A genuine 0
  // (e.g. nobody online in the dead of night) renders as 0 once resolved.
  const settled = resolved || query.isError || graceExpired;
  // Large visit totals are shown compact (446.1M), like the Roblox stats they
  // come from. The full number stays available in the column's title text.
  const compact = (n: number): string =>
    n >= 1_000_000_000
      ? `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`
      : n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
        : n >= 100_000
          ? `${Math.round(n / 1_000)}K`
          : n.toLocaleString();
  const renderCount = (
    value: number,
    duration: number,
    ssrStart = false,
    format?: (n: number) => string,
  ): ReactNode => {
    if (resolved) {
      return (
        <AnimatedCounter
          value={value}
          duration={duration}
          ssrStart={ssrStart}
          {...(format ? { format } : {})}
        />
      );
    }
    if (settled) {
      return <span className="text-destructive">n/a</span>;
    }
    return <span className="text-muted-foreground/50">—</span>;
  };

  const columns: Array<{
    label: string;
    icon: typeof Activity;
    value: ReactNode;
    note: string;
    live?: boolean;
  }> = [
    {
      label: "Players",
      icon: Activity,
      value: renderCount(totalPlaying, 800, true),
      note: "Playing across the projects below",
      live,
    },
    {
      label: "Visits",
      icon: BarChart3,
      value: renderCount(totalVisits, 1200, true, compact),
      note: "Pulled live from Roblox",
      live,
    },
  ];

  if (typeof projects === "number") {
    columns.push({
      label: "Projects",
      icon: FolderOpen,
      value: <AnimatedCounter value={projects} duration={1400} ssrStart />,
      note: "Sound, QA and community work",
    });
  }

  return (
    <div
      aria-label="Live Roblox stats"
      className={`grid border-t border-border transition-opacity duration-500 ${
        live || typeof projects === "number" ? "opacity-100" : "opacity-70"
      } ${columns.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {columns.map((col, i) => {
        const Icon = col.icon;
        return (
          <div
            key={col.label}
            title={col.label === "Visits" ? `${totalVisits.toLocaleString()} visits` : undefined}
            className={`py-5 sm:py-7 ${i === 0 ? "pr-4" : "border-l border-border px-4 sm:px-8"} ${
              i === columns.length - 1 ? "sm:pr-0" : ""
            }`}
          >
            <p className="flex items-center gap-1.5 font-mono text-[0.56rem] tracking-[0.14em] text-muted-foreground uppercase sm:gap-2 sm:text-[0.62rem]">
              <Icon className="size-3 text-primary" aria-hidden />
              <span className="truncate">{col.label}</span>
              {col.live ? (
                <span className="zyn-live-dot ml-auto shrink-0" aria-label="Live" />
              ) : null}
            </p>
            <p className="mt-3 font-display text-[clamp(1.65rem,3.2vw,2.9rem)] leading-none font-black tracking-[-0.05em] tabular-nums">
              {col.value}
            </p>
            <p className="mt-2 hidden text-[0.7rem] leading-snug text-muted-foreground/80 sm:block">
              {col.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}
