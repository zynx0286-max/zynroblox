-- ZYN portfolio: Supabase backend setup (run once in the Supabase SQL editor)
--
-- The app stores its whole CMS state as JSON documents in a simple key/value
-- table, mirroring the Cloudflare KV layout (key "zyn-store-v1", uploads as
-- "upload:<id>"). This keeps store.ts runtime-agnostic: the same code shape
-- works against KV or Postgres.
--
-- SECURITY: the table is intentionally locked down. The app only ever talks
-- to it with the service_role key (a Worker secret), which bypasses RLS. RLS
-- is still ENABLED here with zero policies so that the anon/publishable key
-- (which is public by design) can neither read nor write anything.

create table if not exists public.supabase_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- NO version COLUMN, ON PURPOSE.
-- Optimistic locking lives INSIDE the JSON document as a `version` field, so
-- concurrency control needs no schema change at all: the Worker reads V from
-- `value->>version`, then PATCHes with `&value->>version=eq.V`, which only
-- matches when nobody else has written since. Two isolates can no longer
-- silently overwrite each other. Keep this file column-free so a fresh setup
-- and an existing table behave identically.

-- Keep updated_at fresh on every change.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists supabase_kv_touch on public.supabase_kv;
create trigger supabase_kv_touch
  before update on public.supabase_kv
  for each row execute function public.touch_updated_at();

-- Lock the table down: enable RLS but create NO policies. The service_role
-- key used by the Worker bypasses RLS entirely; every other role gets empty
-- result sets and denied writes.
alter table public.supabase_kv enable row level security;

-- Optional housekeeping comment.
comment on table public.supabase_kv is
  'ZYN portfolio CMS store: whole-state JSON documents (store row zyn-store-v1, upload blobs upload:<id>). Service-role access only.';
