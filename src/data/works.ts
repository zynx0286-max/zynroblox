import batALuckyBlock from "@/assets/bat-a-lucky-block.png.asset.json";
import bonfireSimulator from "@/assets/bonfire-simulator.png.asset.json";
import carpetCleaning from "@/assets/carpet-cleaning-simulator.png.asset.json";
import chefs from "@/assets/chefs.png.asset.json";
import cleanThePlushieStore from "@/assets/clean-the-plushie-store.png.asset.json";
import cleanTheStores from "@/assets/clean-the-stores.png.asset.json";
import darkVsLight from "@/assets/dark-vs-light.png.asset.json";
import engineria from "@/assets/engineria-project-x.png.asset.json";
import fireToBurn from "@/assets/fire-to-burn.png.asset.json";
import fluxwerk from "@/assets/fluxwerk.png.asset.json";
import fortify from "@/assets/fortify-tower-defense.png.asset.json";
import fuseBeasts from "@/assets/fuse-beasts.png.asset.json";
import hammerFishing from "@/assets/hammer-fishing.png.asset.json";
import headTap from "@/assets/head-tap.png.asset.json";
import higherElites from "@/assets/higher-elites.png.asset.json";
import horizonQa from "@/assets/horizon-qa.png.asset.json";
import killer from "@/assets/killer.png.asset.json";
import lostAtSea from "@/assets/lost-at-sea.png.asset.json";
import mineAndCraft from "@/assets/mine-and-craft.png.asset.json";
import powProductions from "@/assets/pow-productions.png.asset.json";
import realOrFake from "@/assets/real-or-fake.png.asset.json";
import rollAndCook from "@/assets/roll-and-cook.png.asset.json";
import saberPerClick from "@/assets/saber-per-click.png.asset.json";
import squishyCardFarm from "@/assets/squishy-card-farm.png.asset.json";
import starRealm from "@/assets/star-realm.png.asset.json";
import surviveSlimes from "@/assets/survive-and-save-slimes.png.asset.json";
import zaeStudios from "@/assets/zae-studios.png.asset.json";

export const SITE_URL = "https://zynroblox.lovable.app";

export type WorkCategory =
  | "QA Testing"
  | "Game Scout"
  | "Community Manager"
  | "Community Coordinator"
  | "SFX / Audio";

export type Work = {
  slug: string;
  title: string;
  category: WorkCategory;
  role: string;
  description: string;
  tags: string[];
  href?: string;
  linkLabel?: string;
  image?: string;
  featured?: boolean;
};

export const CATEGORIES: WorkCategory[] = [
  "SFX / Audio",
  "QA Testing",
  "Game Scout",
  "Community Manager",
  "Community Coordinator",
];

export const works: Work[] = [
  {
    slug: "simple-bricks",
    title: "Simple Bricks",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing for Simple Bricks — a game that caught the attention of major Roblox content creators. Both KreekCraft and Caylus made content in this game.",
    tags: ["Featured Game", "QA Testing"],
    linkLabel: "View on Roblox",
    featured: true,
  },

  // ---------- SFX / Audio ----------
  {
    slug: "cultivation-mmorpg",
    title: "Roblox Cultivation MMORPG",
    category: "SFX / Audio",
    role: "Lead SFX Artist",
    description:
      "Lead sound effects artist for an upcoming Roblox cultivation MMORPG. Designed ambient beds, cultivation ability SFX, combat impacts and environmental audio.",
    tags: ["Lead SFX", "MMORPG", "Ambient Audio"],
  },
  {
    slug: "roshel-survivors",
    title: "Roshel Survivors",
    category: "SFX / Audio",
    role: "SFX Designer",
    description:
      "Sound design for Roshel Survivors — survivor ability sounds, environment ambiance, pickup feedback and UI audio cues.",
    tags: ["SFX Design", "Survivors Genre", "UI Audio"],
  },

  // ---------- QA Testing ----------
  {
    slug: "hammer-fishing",
    title: "Hammer Fishing",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA pass on fishing mechanics and tool hitboxes. Found and reported inconsistent catch rates and physics glitches.",
    tags: ["Physics Testing", "Hitbox QA"],
    href: "https://www.roblox.com/games/76627283311558/Hammer-Fishing",
    linkLabel: "View on Roblox",
    image: hammerFishing.url,
  },
  {
    slug: "saber-per-click",
    title: "+1 Saber Per Click",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on click progression, saber unlock gates and rebirth scaling across long idle sessions.",
    tags: ["Progression QA", "Idle Loop"],
    href: "https://www.roblox.com/games/135464400227494/1-Saber-Per-Click",
    linkLabel: "View on Roblox",
    image: saberPerClick.url,
  },
  {
    slug: "fuse-beasts",
    title: "Fuse Beasts",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing for a creature fusion game. Focused on fusion outcome consistency and stat calculation bugs.",
    tags: ["Stat Testing", "Fusion Bugs"],
    href: "https://www.roblox.com/games/108393667410597/Fuse-Beasts",
    linkLabel: "View on Roblox",
    image: fuseBeasts.url,
  },
  {
    slug: "clean-the-stores",
    title: "Clean The Stores",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing across cleaning task states, prompt reliability and store progression unlocks.",
    tags: ["Task Logic", "Prompt QA"],
    href: "https://www.roblox.com/games/139422634028895/Clean-The-Stores",
    linkLabel: "View on Roblox",
    image: cleanTheStores.url,
  },
  {
    slug: "clean-the-plushie-store",
    title: "Clean the Plushie Store",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on cleaning loops, plushie spawn handling and reward payout consistency.",
    tags: ["Loop Testing", "Reward QA"],
    href: "https://www.roblox.com/games/140213417266552/Clean-the-Plushie-Store",
    linkLabel: "View on Roblox",
    image: cleanThePlushieStore.url,
  },
  {
    slug: "mine-and-craft",
    title: "Mine & Craft",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on mining yields, crafting recipes and inventory edge cases during extended sessions.",
    tags: ["Crafting QA", "Inventory Testing"],
    href: "https://www.roblox.com/games/82792613389716/Mine-Craft",
    linkLabel: "View on Roblox",
    image: mineAndCraft.url,
  },
  {
    slug: "killer",
    title: "KILLER",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on round flow, killer/survivor role assignment and hit registration under load.",
    tags: ["Round Flow", "Hit Registration"],
    href: "https://www.roblox.com/games/127829441663442/KILLER",
    linkLabel: "View on Roblox",
    image: killer.url,
  },
  {
    slug: "carpet-cleaning-simulator",
    title: "Carpet Cleaning Simulator",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on cleaning detection, tool upgrades and currency scaling through the simulator loop.",
    tags: ["Simulator QA", "Economy Testing"],
    href: "https://www.roblox.com/games/124374448373637/Carpet-Cleaning-Simulator",
    linkLabel: "View on Roblox",
    image: carpetCleaning.url,
  },
  {
    slug: "fire-to-burn",
    title: "Fire To Burn Testing Place",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Dedicated testing place work — stress-tested fire propagation, burn states and performance in a WIP build.",
    tags: ["Pre-release QA", "Performance"],
    href: "https://www.roblox.com/games/128817055149531/Fire-To-Burn-Testing-Place",
    linkLabel: "View on Roblox",
    image: fireToBurn.url,
  },
  {
    slug: "bonfire-simulator",
    title: "Bonfire Simulator",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on fuel mechanics, upgrade pacing and offline progress handling.",
    tags: ["Simulator QA", "Save System"],
    href: "https://www.roblox.com/games/118453620477435/Bonfire-Simulator",
    linkLabel: "View on Roblox",
    image: bonfireSimulator.url,
  },
  {
    slug: "roll-and-cook",
    title: "Roll and Cook",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on cooking timers, recipe validation and order fulfilment edge cases.",
    tags: ["Timing QA", "Recipe Logic"],
    href: "https://www.roblox.com/games/76324403646826/Roll-and-Cook",
    linkLabel: "View on Roblox",
    image: rollAndCook.url,
  },
  {
    slug: "chefs",
    title: "Chefs!",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on multiplayer kitchen sync, order queues and customer AI behaviour.",
    tags: ["Multiplayer Sync", "AI Testing"],
    href: "https://www.roblox.com/games/95619050204839/Chefs",
    linkLabel: "View on Roblox",
    image: chefs.url,
  },
  {
    slug: "squishy-card-farm",
    title: "Squishy Card Farm",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Tested card drop logic, farm loop consistency and inventory edge cases across extended play sessions.",
    tags: ["Drop Rate QA", "Inventory Testing"],
    href: "https://www.roblox.com/games/74595134564362/Squishy-Card-Farm",
    linkLabel: "View on Roblox",
    image: squishyCardFarm.url,
  },
  {
    slug: "dark-vs-light",
    title: "Dark vs Light",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "PvP balance QA — tested team spawn fairness, ability edge cases and map-side imbalances.",
    tags: ["PvP Testing", "Balance QA"],
    href: "https://www.roblox.com/games/132840462842306/Dark-vs-Light",
    linkLabel: "View on Roblox",
    image: darkVsLight.url,
  },
  {
    slug: "head-tap",
    title: "HEAD TAP",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Full QA engagement covering input responsiveness, scoring logic and round-flow edge cases.",
    tags: ["Input Testing", "Gameplay Testing"],
    href: "https://www.roblox.com/games/124673719670870/HEAD-TAP",
    linkLabel: "View on Roblox",
    image: headTap.url,
  },
  {
    slug: "engineria-project-x",
    title: "Engineria: Project X",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing for a sci-fi engineering Roblox game. Documented gameplay bugs and reported build system edge cases.",
    tags: ["Bug Reports", "Gameplay Testing"],
    href: "https://www.roblox.com/games/131306380730931/Engineria-Project-X",
    linkLabel: "View on Roblox",
    image: engineria.url,
  },
  {
    slug: "real-or-fake",
    title: "Real Or Fake",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Pre-update QA sweep. Focused on false-positive detection logic and player-facing UI edge cases.",
    tags: ["UI Testing", "Logic Bugs"],
    href: "https://www.roblox.com/games/76003622011064/Real-Or-Fake",
    linkLabel: "View on Roblox",
    image: realOrFake.url,
  },
  {
    slug: "lost-at-sea",
    title: "Lost At Sea",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Tested survival mechanics, item spawn rates and multiplayer sync issues across different server sizes.",
    tags: ["Multiplayer Testing", "Spawn Bugs"],
    href: "https://www.roblox.com/games/77718866164617/Lost-At-Sea",
    linkLabel: "View on Roblox",
    image: lostAtSea.url,
  },
  {
    slug: "bat-a-lucky-block",
    title: "Bat A Lucky Block",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Tested loot table distribution, block interaction edge cases and reward consistency across multiple runs.",
    tags: ["Loot System QA", "Regression Testing"],
    href: "https://www.roblox.com/games/121566235598425/Bat-A-Lucky-Block",
    linkLabel: "View on Roblox",
    image: batALuckyBlock.url,
  },
  {
    slug: "survive-and-save-slimes",
    title: "Survive & Save Slimes",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Full QA engagement — tested AI behavior, wave spawning and save system integrity under stress.",
    tags: ["AI Testing", "Save System"],
    href: "https://www.roblox.com/games/128747993322083/Survive-and-Save-Slimes",
    linkLabel: "View on Roblox",
    image: surviveSlimes.url,
  },
  {
    slug: "fortify-tower-defense",
    title: "Fortify Tower Defense",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA pass on tower placement, wave scaling and upgrade paths across long defense runs.",
    tags: ["Wave Testing", "Balance QA"],
    href: "https://www.roblox.com/users/1752054483/profile",
    linkLabel: "View on Roblox",
    image: fortify.url,
  },

  // ---------- QA communities / studios ----------
  {
    slug: "fluxwerk",
    title: "Fluxwerk",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for the Fluxwerk studio community — ran structured test passes and filed reproducible bug reports.",
    tags: ["Studio QA", "Bug Reports"],
    href: "https://www.roblox.com/communities/1112217926/Fluxwerk#!/about",
    linkLabel: "View Community",
    image: fluxwerk.url,
  },
  {
    slug: "star-realm",
    title: "Star Realm",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Star Realm — verified builds before release and tracked regressions between updates.",
    tags: ["Release QA", "Regression Testing"],
    href: "https://www.roblox.com/communities/986454152/Star-Realm#!/about",
    linkLabel: "View Community",
    image: starRealm.url,
  },
  {
    slug: "pow-productions",
    title: "POW Productions",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for POW Productions — tested experiences in development and reported gameplay and UI issues.",
    tags: ["Studio QA", "UI Testing"],
    href: "https://www.roblox.com/communities/33152116",
    linkLabel: "View Community",
    image: powProductions.url,
  },
  {
    slug: "horizon-qa",
    title: "Horizon QA",
    category: "Game Scout",
    role: "QA Community Member",
    description:
      "Active member of Horizon QA's community. Contributed to group testing sessions and shared structured bug reports.",
    tags: ["QA Community", "Group Testing"],
    href: "https://www.roblox.com/communities/691606265/Horizon-QA#!/about",
    linkLabel: "View Community",
    image: horizonQa.url,
  },

  // ---------- Community work ----------
  {
    slug: "trading-port",
    title: "Trading Port — Blox Fruits",
    category: "Community Manager",
    role: "Former Community Manager",
    description:
      "Community manager for a Blox Fruits trading and stock-notifier server with ~9.7k members — ran trading channels, stock alerts, events and moderation structure.",
    tags: ["Discord", "9.7k Members", "Events"],
    href: "https://discord.gg/5CM7GTFRx",
    linkLabel: "Join Discord",
  },
  {
    slug: "zae-studios",
    title: "Zae Studios",
    category: "Community Manager",
    role: "Former Community Manager",
    description:
      "Managed the full community pipeline for Zae Studios — handled Discord, announcements, moderation structure and player relations.",
    tags: ["Community Manager", "Discord"],
    href: "https://zae-build-core.base44.app/",
    linkLabel: "View Studio",
    image: zaeStudios.url,
  },
  {
    slug: "higher-elites",
    title: "Higher Elites",
    category: "Community Coordinator",
    role: "Former Community Coordinator",
    description:
      "Coordinated community events, managed member onboarding and helped keep the group organized and active.",
    tags: ["Coordinator", "Event Planning"],
    href: "https://www.roblox.com/communities/1095211077/Higher-Elites#!/about",
    linkLabel: "View Community",
    image: higherElites.url,
  },
  {
    slug: "unnamed-community",
    title: "Community Moderation",
    category: "Community Manager",
    role: "Former Moderator",
    description:
      "Served as a community moderator, enforcing rules, resolving disputes and maintaining a healthy server environment.",
    tags: ["Moderation", "Server Management"],
  },
];

export const getWork = (slug: string) => works.find((w) => w.slug === slug);
