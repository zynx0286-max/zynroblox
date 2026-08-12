CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_bootstrap_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

CREATE TABLE public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  role text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  href text,
  link_label text,
  image_url text,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.works TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.works TO authenticated;
GRANT ALL ON public.works TO service_role;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Works are publicly readable"
ON public.works FOR SELECT USING (true);

CREATE POLICY "Admins can insert works"
ON public.works FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update works"
ON public.works FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete works"
ON public.works FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER works_set_updated_at
BEFORE UPDATE ON public.works
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.works (slug, title, category, role, description, tags, href, link_label, image_url, featured, sort_order) VALUES
  ('simple-bricks', 'Simple Bricks', 'QA Testing', 'QA Tester', 'QA testing for Simple Bricks — a game that caught the attention of major Roblox content creators. Both KreekCraft and Caylus made content in this game.', ARRAY['Featured Game', 'QA Testing']::text[], NULL, 'View on Roblox', NULL, true, 0),
  ('cultivation-mmorpg', 'Roblox Cultivation MMORPG', 'SFX / Audio', 'Lead SFX Artist', 'Lead sound effects artist for an upcoming Roblox cultivation MMORPG. Designed ambient beds, cultivation ability SFX, combat impacts and environmental audio.', ARRAY['Lead SFX', 'MMORPG', 'Ambient Audio']::text[], NULL, NULL, NULL, false, 10),
  ('roshel-survivors', 'Roshel Survivors', 'SFX / Audio', 'SFX Designer', 'Sound design for Roshel Survivors — survivor ability sounds, environment ambiance, pickup feedback and UI audio cues.', ARRAY['SFX Design', 'Survivors Genre', 'UI Audio']::text[], NULL, NULL, NULL, false, 20),
  ('hammer-fishing', 'Hammer Fishing', 'QA Testing', 'QA Tester', 'QA pass on fishing mechanics and tool hitboxes. Found and reported inconsistent catch rates and physics glitches.', ARRAY['Physics Testing', 'Hitbox QA']::text[], 'https://www.roblox.com/games/76627283311558/Hammer-Fishing', 'View on Roblox', '/__l5e/assets-v1/041fa3ea-0769-480e-8201-54d929f374f7/hammer-fishing.png', false, 30),
  ('saber-per-click', '+1 Saber Per Click', 'QA Testing', 'QA Tester', 'QA testing on click progression, saber unlock gates and rebirth scaling across long idle sessions.', ARRAY['Progression QA', 'Idle Loop']::text[], 'https://www.roblox.com/games/135464400227494/1-Saber-Per-Click', 'View on Roblox', '/__l5e/assets-v1/3ccaa3d9-9f43-4733-bbc4-7b788845a6e0/saber-per-click.png', false, 40),
  ('fuse-beasts', 'Fuse Beasts', 'QA Testing', 'QA Tester', 'QA testing for a creature fusion game. Focused on fusion outcome consistency and stat calculation bugs.', ARRAY['Stat Testing', 'Fusion Bugs']::text[], 'https://www.roblox.com/games/108393667410597/Fuse-Beasts', 'View on Roblox', '/__l5e/assets-v1/e76a2bd2-defd-4da5-9fd3-41ace561e401/fuse-beasts.png', false, 50),
  ('clean-the-stores', 'Clean The Stores', 'QA Testing', 'QA Tester', 'QA testing across cleaning task states, prompt reliability and store progression unlocks.', ARRAY['Task Logic', 'Prompt QA']::text[], 'https://www.roblox.com/games/139422634028895/Clean-The-Stores', 'View on Roblox', '/__l5e/assets-v1/c66a8e1e-d82b-483e-95e1-31f7d11af982/clean-the-stores.png', false, 60),
  ('clean-the-plushie-store', 'Clean the Plushie Store', 'QA Testing', 'QA Tester', 'QA testing on cleaning loops, plushie spawn handling and reward payout consistency.', ARRAY['Loop Testing', 'Reward QA']::text[], 'https://www.roblox.com/games/140213417266552/Clean-the-Plushie-Store', 'View on Roblox', '/__l5e/assets-v1/d8a38084-f2b4-4c08-897c-90f3b2bae809/clean-the-plushie-store.png', false, 70),
  ('mine-and-craft', 'Mine & Craft', 'QA Testing', 'QA Tester', 'QA testing on mining yields, crafting recipes and inventory edge cases during extended sessions.', ARRAY['Crafting QA', 'Inventory Testing']::text[], 'https://www.roblox.com/games/82792613389716/Mine-Craft', 'View on Roblox', '/__l5e/assets-v1/5c676c06-c685-45ab-bb0f-96204ccccf36/mine-and-craft.png', false, 80),
  ('killer', 'KILLER', 'QA Testing', 'QA Tester', 'QA testing on round flow, killer/survivor role assignment and hit registration under load.', ARRAY['Round Flow', 'Hit Registration']::text[], 'https://www.roblox.com/games/127829441663442/KILLER', 'View on Roblox', '/__l5e/assets-v1/1626a9b4-8260-42d4-9705-45df9fd5579d/killer.png', false, 90),
  ('carpet-cleaning-simulator', 'Carpet Cleaning Simulator', 'QA Testing', 'QA Tester', 'QA testing on cleaning detection, tool upgrades and currency scaling through the simulator loop.', ARRAY['Simulator QA', 'Economy Testing']::text[], 'https://www.roblox.com/games/124374448373637/Carpet-Cleaning-Simulator', 'View on Roblox', '/__l5e/assets-v1/20fd77a2-c8a5-4411-a1ff-7ffdf179570e/carpet-cleaning-simulator.png', false, 100),
  ('fire-to-burn', 'Fire To Burn Testing Place', 'QA Testing', 'QA Tester', 'Dedicated testing place work — stress-tested fire propagation, burn states and performance in a WIP build.', ARRAY['Pre-release QA', 'Performance']::text[], 'https://www.roblox.com/games/128817055149531/Fire-To-Burn-Testing-Place', 'View on Roblox', '/__l5e/assets-v1/415d7068-8c13-4b84-8262-a3bb46a93f21/fire-to-burn.png', false, 110),
  ('bonfire-simulator', 'Bonfire Simulator', 'QA Testing', 'QA Tester', 'QA testing on fuel mechanics, upgrade pacing and offline progress handling.', ARRAY['Simulator QA', 'Save System']::text[], 'https://www.roblox.com/games/118453620477435/Bonfire-Simulator', 'View on Roblox', '/__l5e/assets-v1/e30be31e-2a78-4686-a2f3-12ff86dabd1c/bonfire-simulator.png', false, 120),
  ('roll-and-cook', 'Roll and Cook', 'QA Testing', 'QA Tester', 'QA testing on cooking timers, recipe validation and order fulfilment edge cases.', ARRAY['Timing QA', 'Recipe Logic']::text[], 'https://www.roblox.com/games/76324403646826/Roll-and-Cook', 'View on Roblox', '/__l5e/assets-v1/6262d6c2-10e3-44fa-88f6-5a620976c9a2/roll-and-cook.png', false, 130),
  ('chefs', 'Chefs!', 'QA Testing', 'QA Tester', 'QA testing on multiplayer kitchen sync, order queues and customer AI behaviour.', ARRAY['Multiplayer Sync', 'AI Testing']::text[], 'https://www.roblox.com/games/95619050204839/Chefs', 'View on Roblox', '/__l5e/assets-v1/60c809ab-28cf-4168-858c-66649a8abb3c/chefs.png', false, 140),
  ('squishy-card-farm', 'Squishy Card Farm', 'QA Testing', 'QA Tester', 'Tested card drop logic, farm loop consistency and inventory edge cases across extended play sessions.', ARRAY['Drop Rate QA', 'Inventory Testing']::text[], 'https://www.roblox.com/games/74595134564362/Squishy-Card-Farm', 'View on Roblox', '/__l5e/assets-v1/b7d98dd7-c6dc-428e-83a1-92e859d1e75d/squishy-card-farm.png', false, 150),
  ('dark-vs-light', 'Dark vs Light', 'QA Testing', 'QA Tester', 'PvP balance QA — tested team spawn fairness, ability edge cases and map-side imbalances.', ARRAY['PvP Testing', 'Balance QA']::text[], 'https://www.roblox.com/games/132840462842306/Dark-vs-Light', 'View on Roblox', '/__l5e/assets-v1/2bd6170c-c22b-4416-9dd5-cf9d8e76327d/dark-vs-light.png', false, 160),
  ('head-tap', 'HEAD TAP', 'QA Testing', 'QA Tester', 'Full QA engagement covering input responsiveness, scoring logic and round-flow edge cases.', ARRAY['Input Testing', 'Gameplay Testing']::text[], 'https://www.roblox.com/games/124673719670870/HEAD-TAP', 'View on Roblox', '/__l5e/assets-v1/c6164d82-d707-42db-960a-e7cf81410610/head-tap.png', false, 170),
  ('engineria-project-x', 'Engineria: Project X', 'QA Testing', 'QA Tester', 'QA testing for a sci-fi engineering Roblox game. Documented gameplay bugs and reported build system edge cases.', ARRAY['Bug Reports', 'Gameplay Testing']::text[], 'https://www.roblox.com/games/131306380730931/Engineria-Project-X', 'View on Roblox', '/__l5e/assets-v1/65d1f4fd-4ffe-49d4-9990-170cb98374ee/engineria-project-x.png', false, 180),
  ('real-or-fake', 'Real Or Fake', 'QA Testing', 'QA Tester', 'Pre-update QA sweep. Focused on false-positive detection logic and player-facing UI edge cases.', ARRAY['UI Testing', 'Logic Bugs']::text[], 'https://www.roblox.com/games/76003622011064/Real-Or-Fake', 'View on Roblox', '/__l5e/assets-v1/c6eebfc2-eda4-41ec-b4ec-70888d3acd00/real-or-fake.png', false, 190),
  ('lost-at-sea', 'Lost At Sea', 'QA Testing', 'QA Tester', 'Tested survival mechanics, item spawn rates and multiplayer sync issues across different server sizes.', ARRAY['Multiplayer Testing', 'Spawn Bugs']::text[], 'https://www.roblox.com/games/77718866164617/Lost-At-Sea', 'View on Roblox', '/__l5e/assets-v1/46a3a2e0-6a48-471f-8959-6326b3e285b2/lost-at-sea.png', false, 200),
  ('bat-a-lucky-block', 'Bat A Lucky Block', 'QA Testing', 'QA Tester', 'Tested loot table distribution, block interaction edge cases and reward consistency across multiple runs.', ARRAY['Loot System QA', 'Regression Testing']::text[], 'https://www.roblox.com/games/121566235598425/Bat-A-Lucky-Block', 'View on Roblox', '/__l5e/assets-v1/f3af17be-030a-4d0e-8655-d8d36bcbf0a6/bat-a-lucky-block.png', false, 210),
  ('survive-and-save-slimes', 'Survive & Save Slimes', 'QA Testing', 'QA Tester', 'Full QA engagement — tested AI behavior, wave spawning and save system integrity under stress.', ARRAY['AI Testing', 'Save System']::text[], 'https://www.roblox.com/games/128747993322083/Survive-and-Save-Slimes', 'View on Roblox', '/__l5e/assets-v1/21ef0826-f72d-401c-a2d4-9152fec72f2b/survive-and-save-slimes.png', false, 220),
  ('fortify-tower-defense', 'Fortify Tower Defense', 'QA Testing', 'QA Tester', 'QA pass on tower placement, wave scaling and upgrade paths across long defense runs.', ARRAY['Wave Testing', 'Balance QA']::text[], 'https://www.roblox.com/users/1752054483/profile', 'View on Roblox', '/__l5e/assets-v1/fc540cbb-8169-4717-b895-0bd2f1235736/fortify-tower-defense.png', false, 230),
  ('fluxwerk', 'Fluxwerk', 'QA Testing', 'QA Tester', 'QA tester for the Fluxwerk studio community — ran structured test passes and filed reproducible bug reports.', ARRAY['Studio QA', 'Bug Reports']::text[], 'https://www.roblox.com/communities/1112217926/Fluxwerk#!/about', 'View Community', '/__l5e/assets-v1/2d03294d-ddcf-4773-99d9-c4d271a9ce46/fluxwerk.png', false, 240),
  ('star-realm', 'Star Realm', 'QA Testing', 'QA Tester', 'QA tester for Star Realm — verified builds before release and tracked regressions between updates.', ARRAY['Release QA', 'Regression Testing']::text[], 'https://www.roblox.com/communities/986454152/Star-Realm#!/about', 'View Community', '/__l5e/assets-v1/936100a8-f9fe-40c0-9c94-a1993cfb3a12/star-realm.png', false, 250),
  ('pow-productions', 'POW Productions', 'QA Testing', 'QA Tester', 'QA tester for POW Productions — tested experiences in development and reported gameplay and UI issues.', ARRAY['Studio QA', 'UI Testing']::text[], 'https://www.roblox.com/communities/33152116', 'View Community', '/__l5e/assets-v1/d54dfeeb-2c98-4af1-8d0a-d04f69588f51/pow-productions.png', false, 260),
  ('horizon-qa', 'Horizon QA', 'Game Scout', 'QA Community Member', 'Active member of Horizon QA''s community. Contributed to group testing sessions and shared structured bug reports.', ARRAY['QA Community', 'Group Testing']::text[], 'https://www.roblox.com/communities/691606265/Horizon-QA#!/about', 'View Community', '/__l5e/assets-v1/0cb98baa-4667-4d09-abd4-bbc3bbb0d29c/horizon-qa.png', false, 270),
  ('trading-port', 'Trading Port — Blox Fruits', 'Community Manager', 'Former Community Manager', 'Community manager for a Blox Fruits trading and stock-notifier server with ~9.7k members — ran trading channels, stock alerts, events and moderation structure.', ARRAY['Discord', '9.7k Members', 'Events']::text[], 'https://discord.gg/5CM7GTFRx', 'Join Discord', NULL, false, 280),
  ('zae-studios', 'Zae Studios', 'Community Manager', 'Former Community Manager', 'Managed the full community pipeline for Zae Studios — handled Discord, announcements, moderation structure and player relations.', ARRAY['Community Manager', 'Discord']::text[], 'https://zae-build-core.base44.app/', 'View Studio', '/__l5e/assets-v1/0849256d-69e7-4a4f-b096-eb9e96c73d66/zae-studios.png', false, 290),
  ('higher-elites', 'Higher Elites', 'Community Coordinator', 'Former Community Coordinator', 'Coordinated community events, managed member onboarding and helped keep the group organized and active.', ARRAY['Coordinator', 'Event Planning']::text[], 'https://www.roblox.com/communities/1095211077/Higher-Elites#!/about', 'View Community', '/__l5e/assets-v1/e39bf5b2-1915-4c77-b5e6-41e808a89276/higher-elites.png', false, 300),
  ('unnamed-community', 'Community Moderation', 'Community Manager', 'Former Moderator', 'Served as a community moderator, enforcing rules, resolving disputes and maintaining a healthy server environment.', ARRAY['Moderation', 'Server Management']::text[], NULL, NULL, NULL, false, 310)
ON CONFLICT (slug) DO NOTHING;