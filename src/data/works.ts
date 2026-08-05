import batALuckyBlock from "@/assets/bat-a-lucky-block.png.asset.json";
import engineria from "@/assets/engineria-project-x.png.asset.json";
import fortify from "@/assets/fortify-tower-defense.png.asset.json";
import hammerFishing from "@/assets/hammer-fishing.png.asset.json";
import headTap from "@/assets/head-tap.png.asset.json";
import higherElites from "@/assets/higher-elites.png.asset.json";
import horizonQa from "@/assets/horizon-qa.png.asset.json";
import lostAtSea from "@/assets/lost-at-sea.png.asset.json";
import realOrFake from "@/assets/real-or-fake.png.asset.json";
import surviveSlimes from "@/assets/survive-and-save-slimes.png.asset.json";
import zaeStudios from "@/assets/zae-studios.png.asset.json";

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
  "QA Testing",
  "Game Scout",
  "Community Manager",
  "Community Coordinator",
  "SFX / Audio",
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
  {
    slug: "fortify-tower-defense",
    title: "Fortify Tower Defense",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA pass on tower placement, wave scaling, and upgrade paths across long defense runs.",
    tags: ["Wave Testing", "Balance QA"],
    href: "https://www.roblox.com/users/1752054483/profile",
    linkLabel: "View on Roblox",
    image: fortify.url,
  },
  {
    slug: "head-tap",
    title: "HEAD TAP",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Full QA engagement covering input responsiveness, scoring logic, and round-flow edge cases.",
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
      "Tested survival mechanics, item spawn rates, and multiplayer sync issues across different server sizes.",
    tags: ["Multiplayer Testing", "Spawn Bugs"],
    href: "https://www.roblox.com/games/77718866164617/Lost-At-Sea",
    linkLabel: "View on Roblox",
    image: lostAtSea.url,
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
    image: hammerFishing.url,
  },
  {
    slug: "bat-a-lucky-block",
    title: "Bat A Lucky Block",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Tested loot table distribution, block interaction edge cases, and reward consistency across multiple runs.",
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
      "Full QA engagement — tested AI behavior, wave spawning, and save system integrity under stress.",
    tags: ["AI Testing", "Save System"],
    href: "https://www.roblox.com/games/128747993322083/Survive-and-Save-Slimes",
    linkLabel: "View on Roblox",
    image: surviveSlimes.url,
  },
  {
    slug: "fuse-beasts",
    title: "Fuse Beasts",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "QA testing for a creature fusion game. Focused on fusion outcome consistency and stat calculation bugs.",
    tags: ["Stat Testing", "Fusion Bugs"],
    linkLabel: "View on Roblox",
  },
  {
    slug: "squishy-card-farm",
    title: "Squishy Card Farm",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "Tested card drop logic, farm loop consistency, and inventory edge cases across extended play sessions.",
    tags: ["Drop Rate QA", "Inventory Testing"],
    linkLabel: "View on Roblox",
  },
  {
    slug: "dark-vs-light",
    title: "Dark vs Light",
    category: "QA Testing",
    role: "QA Tester",
    description:
      "PvP balance QA — tested team spawn fairness, ability edge cases, and map-side imbalances.",
    tags: ["PvP Testing", "Balance QA"],
    linkLabel: "View on Roblox",
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
  {
    slug: "higher-elites",
    title: "Higher Elites",
    category: "Community Coordinator",
    role: "Former Community Coordinator",
    description:
      "Coordinated community events, managed member onboarding, and helped keep the group organized and active.",
    tags: ["Coordinator", "Event Planning"],
    href: "https://www.roblox.com/communities/1095211077/Higher-Elites#!/about",
    linkLabel: "View Community",
    image: higherElites.url,
  },
  {
    slug: "zae-studios",
    title: "Zae Studios",
    category: "Community Manager",
    role: "Former Community Manager",
    description:
      "Managed the full community pipeline for Zae Studios — handled Discord, announcements, moderation structure, and player relations.",
    tags: ["Community Manager", "Discord"],
    href: "https://zae-build-core.base44.app/",
    linkLabel: "View Studio",
    image: zaeStudios.url,
  },
  {
    slug: "unnamed-community",
    title: "Unnamed Community",
    category: "Community Manager",
    role: "Moderator",
    description:
      "Served as a community moderator, enforcing rules, resolving disputes, and maintaining a healthy server environment.",
    tags: ["Moderation", "Server Management"],
  },
  {
    slug: "cultivation-mmorpg",
    title: "Roblox Cultivation MMORPG",
    category: "SFX / Audio",
    role: "Lead SFX Artist",
    description:
      "Lead sound effects artist for an upcoming Roblox cultivation MMORPG. Designed ambient sounds, ability SFX, and environmental audio.",
    tags: ["Lead SFX", "MMORPG", "Ambient Audio"],
  },
  {
    slug: "roshel-survivors",
    title: "Roshel Survivors",
    category: "SFX / Audio",
    role: "SFX Designer",
    description:
      "Contributed sound design for Roshel Survivors — crafted survivor ability sounds, environment ambiance, and UI audio cues.",
    tags: ["SFX Design", "Survivors Genre"],
  },
];
