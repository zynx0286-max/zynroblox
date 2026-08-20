import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Users } from "lucide-react";
import { getLiveGameStats, type LiveGameStats } from "@/lib/live-stats.functions";
import { AnimatedCounter } from "./AnimatedCounter";

// Live Roblox game counters. The route loader fetches the numbers during SSR so
// real values are already in the initial HTML (no flash, no client fetch
// needed). This component then polls the server fn (which reads the Roblox API)
// every 30s and re-renders as animated live counts. Falls back gracefully: if
// the API is unavailable it shows the last known values — never crashes.
export function LiveStats({ initial }: { initial?: LiveGameStats | null }) {
  const stats = useServerFn(getLiveGameStats);
  const query = useQuery({
    queryKey: ["live-game-stats"],
    queryFn: () => stats(),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 2,
    initialData: initial ?? undefined,
  });

  const data = query.data;
  const live = data !== undefined;
  const totalVisits = data?.totalVisits ?? 0;
  const totalPlaying = data?.totalPlaying ?? 0;

  return (
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
          {data ? (
            <AnimatedCounter value={totalPlaying} duration={800} />
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
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
          {data ? (
            <AnimatedCounter value={totalVisits} duration={1200} />
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
        </p>
      </div>
    </div>
  );
}
