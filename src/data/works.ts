import batALuckyBlock from "@/assets/bat-a-lucky-block.png";
import bonfireSimulator from "@/assets/bonfire-simulator.png";
import carpetCleaning from "@/assets/carpet-cleaning-simulator.png";
import chefs from "@/assets/chefs.png";
import cleanAllTheLeaves from "@/assets/clean-all-the-leaves.png";
import cleanThePlushieStore from "@/assets/clean-the-plushie-store.png";
import cleanTheStores from "@/assets/clean-the-stores.png";
import darkVsLight from "@/assets/dark-vs-light.png";
import engineria from "@/assets/engineria-project-x.png";
import fireToBurn from "@/assets/fire-to-burn.png";
import fluxwerk from "@/assets/fluxwerk.png";
import fortify from "@/assets/fortify-tower-defense.png";
import fuseBeasts from "@/assets/fuse-beasts.png";
import hammerFishing from "@/assets/hammer-fishing.png";
import headTap from "@/assets/head-tap.png";
import higherElites from "@/assets/higher-elites.png";
import horizonQa from "@/assets/horizon-qa.png";
import killer from "@/assets/killer.png";
import lostAtSea from "@/assets/lost-at-sea.png";
import mineAndCraft from "@/assets/mine-and-craft.png";
import powProductions from "@/assets/pow-productions.png";
import realOrFake from "@/assets/real-or-fake.png";
import rollAndCook from "@/assets/roll-and-cook.png";
import saberPerClick from "@/assets/saber-per-click.png";
import squishyCardFarm from "@/assets/squishy-card-farm.png";
import starRealm from "@/assets/star-realm.png";
import surviveSlimes from "@/assets/survive-and-save-slimes.png";
import zaeStudios from "@/assets/zae-studios.png";
import stealALuckyEgg from "@/assets/steal-a-lucky-egg.png";
import cleanYourAsmr from "@/assets/clean-your-asmr.png";
import amazarkIcon from "@/assets/amazark-icon.png";
import codexCustomsIcon from "@/assets/codex-customs-icon.png";
import animeChroniclesIcon from "@/assets/anime-chronicles-icon.png";
import boysVsGirlsTycoon from "@/assets/boys-vs-girls-tycoon.png";
import escapeTheFire from "@/assets/escape-the-fire.png";
import slideWithBrainrot from "@/assets/slide-with-brainrot.png";
import growYourLuckyBlock from "@/assets/grow-your-lucky-block.png";
import yeetTower from "@/assets/yeet-tower.png";
import chopYourTree from "@/assets/chop-your-tree.png";

export const SITE_URL = "https://roblox.zynx0286.workers.dev";

export type WorkCategory =
  "QA Testing" | "Game Scout" | "Community Manager" | "Community Coordinator" | "SFX / Audio";

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
  popularity?: number; // CCU/popularity for sorting
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
    popularity: 42,
  },
  {
    slug: "clean-all-the-leaves",
    title: "Clean All The Leaves",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing on leaf cleanup mechanics, tool progression, and currency scaling. Verified spawn rates, prompt reliability, and upgrade pacing across extended sessions.",
    tags: ["Simulator QA", "Economy Testing", "Featured Game"],
    href: "https://www.roblox.com/games/92637789841354/Clean-all-the-leaves",
    linkLabel: "View on Roblox",
    image: cleanAllTheLeaves,
    featured: true,
    popularity: 156,
  },
  {
    slug: "chop-your-tree",
    title: "Chop Your Tree",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Chop Your Tree — a 141M+ visit simulator from the Simple Bricks group. Tested watering/chopping loops, machine upgrades, prestige flow and luck-event balance.",
    tags: ["Simulator QA", "141M Visits", "Economy Testing"],
    href: "https://www.roblox.com/games/123557829667240/Chop-Your-Tree",
    linkLabel: "View on Roblox",
    image: chopYourTree,
    popularity: 210,
  },
  {
    slug: "boys-vs-girls-tycoon",
    title: "Boys vs Girls Tycoon",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Boys vs Girls Tycoon — a 3.6M+ visit tycoon battler. Tested tycoon progression, gear unlocks, morphs and team-fight balance.",
    tags: ["Tycoon QA", "3.6M Visits", "Combat Testing"],
    href: "https://www.roblox.com/games/100760208242053/Boys-vs-Girls-Tycoon",
    linkLabel: "View on Roblox",
    image: boysVsGirlsTycoon,
    popularity: 120,
  },
  {
    slug: "slide-with-brainrot",
    title: "Slide with Brainrot",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Slide with Brainrot — a 1.5M+ visit slide simulator. Tested slide physics, ride-on mechanics, egg hatching and prize payouts.",
    tags: ["Simulator QA", "1.5M Visits", "Physics Testing"],
    href: "https://www.roblox.com/games/71630956126422/Slide-with-Brainrot",
    linkLabel: "View on Roblox",
    image: slideWithBrainrot,
    popularity: 110,
  },
  {
    slug: "escape-the-fire",
    title: "Escape the Fire",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Escape the Fire — a speed-run survival game. Tested run-speed progression, pet army bonuses, world unlocks and leaderboard integrity.",
    tags: ["Progression QA", "Leaderboard Testing"],
    href: "https://www.roblox.com/games/108419984144397/Escape-the-Fire",
    linkLabel: "View on Roblox",
    image: escapeTheFire,
    popularity: 36,
  },
  {
    slug: "grow-your-lucky-block",
    title: "Grow Your Lucky Block",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Grow Your Lucky Block — a potion-and-prestige simulator. Tested potion fill rates, block breaks, machine upgrades and void prestige.",
    tags: ["Simulator QA", "Economy Testing"],
    href: "https://www.roblox.com/games/117321743875794/Grow-Your-Lucky-Block",
    linkLabel: "View on Roblox",
    image: growYourLuckyBlock,
    popularity: 26,
  },
  {
    slug: "yeet-tower",
    title: "Yeet Tower",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Yeet Tower — a troll tower climber from the Simple Bricks group. Tested climb mechanics, yeet interactions and round fairness.",
    tags: ["Gameplay Testing", "Physics Testing"],
    href: "https://www.roblox.com/games/120598963201948/Yeet-Tower",
    linkLabel: "View on Roblox",
    image: yeetTower,
    popularity: 16,
  },
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
    image: hammerFishing,
    popularity: 8,
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
    image: saberPerClick,
    popularity: 23,
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
    image: fuseBeasts,
    popularity: 12,
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
    image: cleanTheStores,
    popularity: 34,
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
    image: cleanThePlushieStore,
    popularity: 19,
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
    image: mineAndCraft,
    popularity: 41,
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
    image: killer,
    popularity: 67,
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
    image: carpetCleaning,
    popularity: 89,
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
    image: fireToBurn,
    popularity: 5,
  },
  {
    slug: "bonfire-simulator",
    title: "Bonfire Simulator",
    category: "QA Testing",
    role: "QA Tester",
    description: "QA testing on fuel mechanics, upgrade pacing and offline progress handling.",
    tags: ["Simulator QA", "Save System"],
    href: "https://www.roblox.com/games/118453620477435/Bonfire-Simulator",
    linkLabel: "View on Roblox",
    image: bonfireSimulator,
    popularity: 31,
  },
  {
    slug: "roll-and-cook",
    title: "Roll and Cook",
    category: "QA Testing",
    role: "QA Tester",
    description: "QA testing on cooking timers, recipe validation and order fulfilment edge cases.",
    tags: ["Timing QA", "Recipe Logic"],
    href: "https://www.roblox.com/games/76324403646826/Roll-and-Cook",
    linkLabel: "View on Roblox",
    image: rollAndCook,
    popularity: 14,
  },
  {
    slug: "chefs",
    title: "Chefs!",
    category: "QA Testing",
    role: "QA Tester",
    description: "QA testing on multiplayer kitchen sync, order queues and customer AI behaviour.",
    tags: ["Multiplayer Sync", "AI Testing"],
    href: "https://www.roblox.com/games/95619050204839/Chefs",
    linkLabel: "View on Roblox",
    image: chefs,
    popularity: 56,
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
    image: squishyCardFarm,
    popularity: 28,
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
    image: darkVsLight,
    popularity: 73,
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
    image: headTap,
    popularity: 11,
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
    image: engineria,
    popularity: 9,
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
    image: realOrFake,
    popularity: 6,
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
    image: lostAtSea,
    popularity: 18,
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
    image: batALuckyBlock,
    popularity: 15,
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
    image: surviveSlimes,
    popularity: 24,
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
    image: fortify,
    popularity: 37,
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
    image: fluxwerk,
    popularity: 22,
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
    image: starRealm,
    popularity: 33,
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
    image: powProductions,
    popularity: 17,
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
    image: horizonQa,
    popularity: 29,
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
    popularity: 45,
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
    image: zaeStudios,
    popularity: 38,
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
    image: higherElites,
    popularity: 21,
  },
  {
    slug: "unnamed-community",
    title: "Community Moderation",
    category: "Community Manager",
    role: "Former Moderator",
    description:
      "Served as a community moderator, enforcing rules, resolving disputes and maintaining a healthy server environment.",
    tags: ["Moderation", "Server Management"],
    popularity: 12,
  },
  {
    slug: "steal-a-lucky-egg",
    title: "Steal A Lucky Egg",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "SFX artist for Steal A Lucky Egg — a viral incremental simulator with 6.8M+ visits. Crafted ability, hatch and UI sounds that match the game's fast, playful loop.",
    tags: ["SFX Design", "6.8M Visits", "Simulator"],
    href: "https://www.roblox.com/games/123698673940079/Steal-A-Lucky-Egg",
    linkLabel: "View on Roblox",
    image: stealALuckyEgg,
    popularity: 200,
  },
  {
    slug: "clean-your-asmr",
    title: "Clean Your ASMR",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Clean Your ASMR — a satisfying cleaning tycoon with 2.2M+ visits. Tested squish collection, cleaner hires, base upgrades and steal mechanics across sessions.",
    tags: ["Tycoon QA", "2.2M Visits", "Economy Testing"],
    href: "https://www.roblox.com/games/79880685816862/Clean-your-ASMR",
    linkLabel: "View on Roblox",
    image: cleanYourAsmr,
    popularity: 190,
  },
  // Thumbnail is hotlinked from Roblox's CDN (768×432 game thumbnail — it
  // does expire/rotate; works-admin.mjs refresh-roblox-metadata refreshes it).
  // Thumbnail is hotlinked from Roblox's CDN (768×432 game thumbnail — it
  // does expire/rotate; works-admin.mjs refresh-roblox-metadata refreshes it).
  {
    slug: "arcadia",
    title: "[🚀] Arcadia [BETA]",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Arcadia — an open-beta sci-fi game by Leviathan.Studios. Tested shop/reward flows and progression systems through the beta, with bug reports and feedback to the community.",
    tags: ["Beta QA", "Gameplay Testing"],
    href: "https://www.roblox.com/games/99999125865963/Arcadia",
    linkLabel: "View on Roblox",
    image:
      "https://tr.rbxcdn.com/180DAY-dac1fbdb7560b5b9b8f92d824d6c9fa5/768/432/Image/Png/noFilter",
    popularity: 85,
  },
  {
    slug: "dead-channel",
    title: "Dead Channel [PROLOGUE]",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Dead Channel — an FNAF-style analog horror game by CarterLegacy set in 1987 Halloway, Pennsylvania. Tested radio-tune interactions, night loops and jumpscare timing.",
    tags: ["Horror QA", "Gameplay Testing"],
    href: "https://www.roblox.com/games/129923153010783/Dead-Channel",
    linkLabel: "View on Roblox",
    image:
      "https://tr.rbxcdn.com/180DAY-980ef4b4b4639b6cfe29a484e537e847/768/432/GameMediaItem4/Png/noFilter",
    popularity: 90,
  },
  {
    slug: "egg-heist",
    title: "Egg Heist! 🥚 Steal Eggs & Escape the Boss",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA tester for Egg Heist — a zone-stealing simulator by SkayzJR. Tested steal/hatch loops, pet income and speed progression, rebirths and boss chase rounds.",
    tags: ["Gameplay Testing", "Progression QA"],
    href: "https://www.roblox.com/games/101592269681422/Egg-Heist-Steal-Eggs-Escape-the-Boss",
    linkLabel: "View on Roblox",
    image:
      "https://tr.rbxcdn.com/180DAY-ec7ef34b22f87f061a0372962a8529c0/768/432/Image/Png/noFilter",
    popularity: 95,
  },
  {
    slug: "amazark-client-acquisition",
    title: "Amazark Corporation",
    category: "Community Manager",
    role: "Assistant Manager / Client Acquisition Specialist",
    description:
      "Assistant manager and client acquisition specialist for Amazark Corporation LLC — a Roblox development services community with 5.6k+ members. Handling client intake, service scoping and acquisition flow.",
    tags: ["Discord", "5.6k Members", "Client Acquisition"],
    href: "https://discord.gg/C3pzQGFmmT",
    linkLabel: "Join Discord",
    image: amazarkIcon,
    popularity: 60,
  },
  {
    slug: "codex-customs-marketing",
    title: "Codex Customs",
    category: "Community Coordinator",
    role: "Marketing Team",
    description:
      "Marketing team member for Codex Customs — a Roblox development studio community with 5.4k+ members focused on quality builds, assets and vehicles.",
    tags: ["Discord", "5.4k Members", "Marketing"],
    href: "https://discord.gg/codexcustoms",
    linkLabel: "Join Discord",
    image: codexCustomsIcon,
    popularity: 55,
  },
  {
    slug: "anime-chronicles-staff",
    title: "Anime Chronicles",
    category: "Community Manager",
    role: "Head of Staff",
    description:
      "Head of staff for Anime Chronicles — an in-development anime TD on Roblox. Leading the staff team, moderation structure and launch preparation.",
    tags: ["Discord", "Head of Staff", "In Development"],
    href: "https://discord.gg/rJf2S5Atqh",
    linkLabel: "Join Discord",
    image: animeChroniclesIcon,
    popularity: 40,
  },

  // ---------- SFX showcase packs ----------
  // The audio samples for these live in the self-hosted store as /uploads blobs
  // (scripts/sfx-import.mjs); this catalog entry only guarantees the work page
  // exists even if the store is ever reseeded.
  {
    slug: "sfx-weapons-guns",
    title: "Weapons & Guns SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "Original weapons pack — AKS-74U, AK-47, shotgun, sniper, pistol and magnum. Rifle fire, reloads and magazine handling built layered for punchy, game-ready delivery.",
    tags: ["SFX Pack", "Weapons", "6 Samples"],
    popularity: 60,
  },
  {
    slug: "sfx-combat-impacts",
    title: "Combat & Impact SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "Combat impact pack — explosions, grenade hits, heavy punches, bone cracks, forcefield hits and axe swings. Layered for satisfying hit feedback in any weapon or melee loop.",
    tags: ["SFX Pack", "Impacts", "6 Samples"],
    popularity: 55,
  },
  {
    slug: "sfx-ui-notifications",
    title: "UI & Notification SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "UI and notification pack — button clicks, confirms, errors, money pickups and big-win stingers. Designed to keep menus responsive without getting grating over long sessions.",
    tags: ["SFX Pack", "UI Audio", "5 Samples"],
    popularity: 50,
  },
  {
    slug: "sfx-ambience",
    title: "Ambience & Background SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "Ambience pack — room beds, city street loops, lobby hum, fire crackle and quiet loading loops. Seams loop cleanly so maps stay alive without noticeable repetition.",
    tags: ["SFX Pack", "Ambience", "5 Samples"],
    popularity: 45,
  },
  {
    slug: "sfx-abilities",
    title: "Ability & Magic SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "Ability and magic pack — casts, lasers, portal loops, teleports and power-ups. Pitch-stacked with whoosh tails so every skill activation reads instantly.",
    tags: ["SFX Pack", "Abilities", "5 Samples"],
    popularity: 40,
  },
  {
    slug: "sfx-movement",
    title: "Movement & Footsteps SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "Movement pack — jumps, hover-tank engines and surface-matched footsteps on carpet, grass and foley. Built to randomize cleanly so footsteps never sound machine-gunned.",
    tags: ["SFX Pack", "Movement", "6 Samples"],
    popularity: 35,
  },
  {
    slug: "sfx-music-stingers",
    title: "Music & Stingers SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      "Music and stinger pack — intro jingles, boss themes, victory stingers and hoax intros. Short-form music cuts timed to hit clean on round starts and wins.",
    tags: ["SFX Pack", "Stingers", "5 Samples"],
    popularity: 30,
  },
  {
    slug: "sfx-creatures",
    title: "Creature Voices SFX",
    category: "SFX / Audio",
    role: "SFX Artist",
    description:
      'Creature voice pack — screams, voice lines and taunts including the iconic "you always come back screaming". Processed for character without losing intelligibility.',
    tags: ["SFX Pack", "Creatures", "6 Samples"],
    popularity: 25,
  },
];

export const getWork = (slug: string) => works.find((w) => w.slug === slug);
