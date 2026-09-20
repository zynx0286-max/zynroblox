import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Activity, Users } from "lucide-react";
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
export function LiveStats({ initial }: { initial?: LiveGameStats | null }) {
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
  const renderCount = (value: number, duration: number, ssrStart = false) => {
    if (resolved) {
      return <AnimatedCounter value={value} duration={duration} ssrStart={ssrStart} />;
    }
    if (settled) {
      return <span className="text-destructive">error</span>;
    }
    return <span className="text-muted-foreground/50">—</span>;
  };

  return (
    <div>
      <div
        className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${
          live ? "opacity-100" : "opacity-60"
        } transition-opacity duration-500`}
      >
        <div className="glass-card relative overflow-hidden rounded-2xl px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-[0.15em] text-muted-foreground uppercase sm:text-[0.65rem]">
              <Activity className="size-3 text-primary" />
              Players online
            </span>
            {live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.55rem] font-semibold tracking-widest text-emerald-400 uppercase">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-primary sm:text-3xl">
            {/* ssrStart: crawlers/no-JS see the real numbers in the HTML; the
              count-up animation still plays for browsers. */}
            {renderCount(totalPlaying, 800, true)}
          </p>
        </div>

        <div className="glass-card relative overflow-hidden rounded-2xl px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-[0.15em] text-muted-foreground uppercase sm:text-[0.65rem]">
              <Users className="size-3 text-primary" />
              Total visits
            </span>
            {live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.55rem] font-semibold tracking-widest text-emerald-400 uppercase">
                Live
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {renderCount(totalVisits, 1200, true)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground sm:text-sm">
        Combined players &amp; visits across every game I&apos;ve contributed to.
      </p>
    </div>
  );
}
