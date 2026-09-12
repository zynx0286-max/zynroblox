import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Geo-fence for admin sign-in: only allow logins from Franklin Township, NJ
// (Somerset County) or nearby.
//
// How it works: on Cloudflare Workers every request carries `request.cf`
// geolocation (country, region, lat/long derived from the visitor IP). We
// compute the distance to Franklin Township and allow logins inside a
// configurable radius.
//
// Modes (`ADMIN_GEO_ENFORCE`):
//   "soft"   (default) — block logins positively identified as outside the
//            area; allow when geolocation is unavailable (local dev, odd
//            networks) but log a warning. No lockout risk.
//   "strict" — also block when geolocation is unavailable. Stronger, but can
//            lock you out on VPNs/mobile networks with no geo data.
//   "off"    — disable the check entirely (emergency kill switch).
//
// Radius (`ADMIN_GEO_RADIUS_MILES`, default 60) covers Franklin Township plus
// nearby NJ/NY/PA towns. Franklin Township, Somerset County, NJ ≈
// 40.4987° N, 74.5370° W.

export type GeoDecision = { allowed: boolean; detail: string };

const HOME = { lat: 40.4987, lon: -74.537 };
const DEFAULT_RADIUS_MILES = 60;

// Region codes allowed as a fallback when precise lat/long is missing but
// Cloudflare still reports a region (NJ + immediate neighbours).
const NEARBY_REGIONS = new Set(["NJ", "NY", "PA", "DE", "CT"]);

type CfGeo = {
  country?: unknown;
  regionCode?: unknown;
  region?: unknown;
  city?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

function readEnv(name: string): string {
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
}

function haversineMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.sqrt(h));
}

function getRadiusMiles(): number {
  const raw = Number(readEnv("ADMIN_GEO_RADIUS_MILES"));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RADIUS_MILES;
}

function getMode(): "soft" | "strict" | "off" {
  const raw = readEnv("ADMIN_GEO_ENFORCE").trim().toLowerCase();
  if (raw === "strict" || raw === "off") return raw;
  return "soft";
}

export const checkAdminLocation: () => Promise<GeoDecision> = createServerOnlyFn(
  async (): Promise<GeoDecision> => {
    const mode = getMode();
    if (mode === "off") return { allowed: true, detail: "geo check disabled" };

    let cf: CfGeo | null = null;
    try {
      const req = getRequest() as Request & { cf?: CfGeo };
      if (req && typeof req === "object" && req.cf && typeof req.cf === "object") {
        cf = req.cf;
      }
    } catch {
      cf = null;
    }

    const noGeo = (why: string): GeoDecision => {
      if (mode === "strict") {
        console.warn(`[admin-geo] blocked login: ${why}`);
        return { allowed: false, detail: "location could not be verified" };
      }
      console.warn(`[admin-geo] allowed login without geolocation: ${why}`);
      return { allowed: true, detail: "location unknown (allowed in soft mode)" };
    };

    if (!cf) return noGeo("no Cloudflare geolocation on request (local dev?)");

    const country = typeof cf.country === "string" ? cf.country.toUpperCase() : "";
    const lat = typeof cf.latitude === "string" ? Number(cf.latitude) : cf.latitude;
    const lon = typeof cf.longitude === "string" ? Number(cf.longitude) : cf.longitude;
    const regionCode =
      typeof cf.regionCode === "string" ? cf.regionCode.toUpperCase() : "";

    // Precise path: distance from Franklin Township, NJ.
    if (typeof lat === "number" && Number.isFinite(lat) && typeof lon === "number" && Number.isFinite(lon)) {
      const miles = haversineMiles(HOME.lat, HOME.lon, lat, lon);
      const radius = getRadiusMiles();
      if (miles <= radius) {
        return { allowed: true, detail: `${miles.toFixed(0)} mi from Franklin Township, NJ` };
      }
      console.warn(`[admin-geo] blocked login: ${miles.toFixed(0)} mi away (limit ${radius} mi)`);
      return { allowed: false, detail: "outside the allowed area" };
    }

    // Coarse path: region allow-list for NJ + neighbouring states.
    if (country === "US" && NEARBY_REGIONS.has(regionCode)) {
      return { allowed: true, detail: `region ${regionCode} (coarse match)` };
    }
    if (country && country !== "US") {
      console.warn(`[admin-geo] blocked login: country ${country}`);
      return { allowed: false, detail: "outside the allowed area" };
    }
    return noGeo("no precise coordinates or region in geolocation");
  },
);
