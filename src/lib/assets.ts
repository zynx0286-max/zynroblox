import batALuckyBlock from "@/assets/bat-a-lucky-block.png";
import bonfireSimulator from "@/assets/bonfire-simulator.png";
import carpetCleaning from "@/assets/carpet-cleaning-simulator.png";
import chefs from "@/assets/chefs.png";
import cleanAllTheLeaves from "@/assets/clean-all-the-leaves.svg";
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

// Lookup for assets referenced by the data layer. Work images are stored as
// paths (e.g. "/src/assets/hammer-fishing.png" or a bare filename); at build
// time those literals don't exist, so we resolve them back to the imported,
// hashed asset URL. External URLs and data URLs pass through untouched.
const ASSETS: Record<string, string> = {
  "bat-a-lucky-block.png": batALuckyBlock,
  "bonfire-simulator.png": bonfireSimulator,
  "carpet-cleaning-simulator.png": carpetCleaning,
  "chefs.png": chefs,
  "clean-all-the-leaves.svg": cleanAllTheLeaves,
  "clean-the-plushie-store.png": cleanThePlushieStore,
  "clean-the-stores.png": cleanTheStores,
  "dark-vs-light.png": darkVsLight,
  "engineria-project-x.png": engineria,
  "fire-to-burn.png": fireToBurn,
  "fluxwerk.png": fluxwerk,
  "fortify-tower-defense.png": fortify,
  "fuse-beasts.png": fuseBeasts,
  "hammer-fishing.png": hammerFishing,
  "head-tap.png": headTap,
  "higher-elites.png": higherElites,
  "horizon-qa.png": horizonQa,
  "killer.png": killer,
  "lost-at-sea.png": lostAtSea,
  "mine-and-craft.png": mineAndCraft,
  "pow-productions.png": powProductions,
  "real-or-fake.png": realOrFake,
  "roll-and-cook.png": rollAndCook,
  "saber-per-click.png": saberPerClick,
  "squishy-card-farm.png": squishyCardFarm,
  "star-realm.png": starRealm,
  "survive-and-save-slimes.png": surviveSlimes,
  "zae-studios.png": zaeStudios,
};

const KNOWN = new Set(Object.keys(ASSETS));

/** Resolves a stored image path to a usable URL. */
export function resolveAsset(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const name = path.split("/").pop();
  if (name && KNOWN.has(name)) return ASSETS[name];
  return path;
}
