// Types for the Cloudflare Workers runtime import used by the server store.
// This module only resolves inside a Worker (or wrangler dev); everywhere else
// it is dynamically imported in a try/catch and falls back to the file store.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
