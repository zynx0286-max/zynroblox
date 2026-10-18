// Shared Supabase aux-row access for the ops scripts (liveness smoke,
// bot doctor). Same wire protocol as src/lib/store-cas.ts — the TS modules
// can't be imported by the bare Node runner, so this .mjs helper mirrors them
// ONCE instead of each script re-implementing the fetch/Patch/CAS dance.
// The store-cas unit tests pin the exact rules mirrored here.
//
// Secrets never pass through here; callers build the config object from their
// own env loading and are responsible for not printing values.

/** Read timeout for every Supabase REST call. */
const TIMEOUT_MS = 15_000;

/**
 * Aux-row keys — same constants as src/lib/bot-heartbeat-rules.ts (copied for
 * the bare Node runner, which cannot resolve the `@/` alias).
 */
export const HEARTBEAT_KEY = "zyn-bot-heartbeat-v1";
export const LIVENESS_STATE_KEY = "zyn-bot-liveness-v1";

function headers(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function supabaseFetch(cfg, key, extraQuery, init) {
  const res = await fetch(
    `${cfg.url}/rest/v1/supabase_kv?key=eq.${encodeURIComponent(key)}${extraQuery ? `&${extraQuery}` : ""}`,
    {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { ...headers(cfg.serviceKey), ...(init?.headers ?? {}) },
    },
  );
  return res;
}

/** { doc (version-stripped), version } | null — mirrors store-cas.splitVersion. */
export async function readAuxRow(cfg, key) {
  const res = await supabaseFetch(cfg, key, "select=value&limit=1");
  if (!res.ok) throw new Error(`Supabase read ${key}: HTTP ${res.status}`);
  const rows = (await res.json().catch(() => null)) ?? [];
  const value = rows[0]?.value;
  if (!value || typeof value !== "object") return null;
  const { version, ...doc } = value;
  return { doc, version: typeof version === "number" ? version : null };
}

/** CAS write — mirrors store-cas.buildCasPath/buildCasBody. True when applied. */
export async function casWriteAuxRow(cfg, key, doc, expected) {
  const res = await supabaseFetch(
    cfg,
    key,
    expected === null ? null : `value->>version=eq.${expected}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ value: { ...doc, version: expected === null ? 1 : expected + 1 } }),
    },
  );
  if (!res.ok) return false;
  const rows = (await res.json().catch(() => null)) ?? [];
  return Array.isArray(rows) && rows.length > 0;
}

// ---------------------------------------------------------------------------
// Simulation-residue status labels
// ---------------------------------------------------------------------------

// Earlier simulations of the down→alert→recovery cycle wrote a heartbeat row
// whose `status` carried a marker like "down-sim". The store MERGES each new
// ping over the stored fields (`...stored, ...fields`), so until the bot's own
// gateway reports a status the simulated label DECAYS past the simulation:
// the doctor and smoke reports keep saying "down-sim" on an otherwise healthy
// row. Real statuses never match (the bot reports "ready" or a ws status
// number), so a "sim" match is unambiguously residue.
const SIM_STATUS_PATTERN = /sim/i;

/** True when `status` is a leftover label from a simulation, not a real gateway status. */
export function isSimulationStatus(status) {
  return typeof status === "string" && SIM_STATUS_PATTERN.test(status);
}

/**
 * The heartbeat doc with its leftover simulation status removed — or null when
 * there is nothing to change. JSON-serializes cleanly (the field vanishes;
 * the bot's next ping rewrites it with a real status).
 */
export function stripSimulationStatus(doc) {
  if (!doc || typeof doc !== "object") return null;
  if (!isSimulationStatus(doc.status)) return null;
  const { status: _removed, ...clean } = doc;
  return clean;
}
