import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLiveGameStats } from "@/lib/live-stats.functions";
import { formatCompact } from "./WorkCard";

/**
 * One live metric for a single project, inside a case-study meta cell.
 *
 * It shares the `live-game-stats` query key with the home page's LiveStats, so
 * arriving from the home page reuses that data immediately. On a cold direct
 * load it shows a quiet dash, then fills in; a failed lookup stays a dash
 * rather than inventing a number.
 */
export function ProjectLiveStat({ slug, field }: { slug: string; field: "playing" | "visits" }) {
  const stats = useServerFn(getLiveGameStats);
  const query = useQuery({
    queryKey: ["live-game-stats"],
    queryFn: () => stats(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });

  const game = query.data?.games.find((entry) => entry.slug === slug);
  if (!game) {
    return (
      <span
        className="text-muted-foreground/40"
        title={query.isError ? "Live stats unavailable" : "Fetching live stats"}
        aria-label={query.isError ? "Live stats unavailable" : "Fetching live stats"}
      >
        —
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 tabular-nums"
      title={`${game[field].toLocaleString()} ${field === "playing" ? "playing now" : "visits"} on Roblox`}
    >
      {field === "playing" ? <span className="zyn-live-dot" aria-hidden /> : null}
      {formatCompact(game[field])}
    </span>
  );
}
