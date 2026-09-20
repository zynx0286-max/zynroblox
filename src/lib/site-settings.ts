import {
  AudioLines,
  Bug,
  Users,
  MessageSquare,
  Search,
  ShieldCheck,
  Gamepad2,
  FileText,
  Youtube,
  Music,
  Star,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import testimonialCodex from "@/assets/testimonial-codex.webp";
import { safeExternalUrl } from "@/lib/url";

export type IconKey =
  | "audio"
  | "bug"
  | "users"
  | "message"
  | "search"
  | "shield"
  | "gamepad"
  | "file"
  | "youtube"
  | "music"
  | "star"
  | "headset";

export const ICONS: Record<IconKey, LucideIcon> = {
  audio: AudioLines,
  bug: Bug,
  users: Users,
  message: MessageSquare,
  search: Search,
  shield: ShieldCheck,
  gamepad: Gamepad2,
  file: FileText,
  youtube: Youtube,
  music: Music,
  star: Star,
  headset: Headphones,
};

export type StatItem = { value: string; label: string };

export type HeroSettings = {
  name: string;
  badge: string;
  titlePrefix: string;
  /** Rotating roles shown in the highlighted headline text. */
  roles: string[];
  titleSuffix: string;
  subtext: string;
  ctaLabel: string;
  ctaNote: string;
  discordLabel: string;
  discordUrl: string;
  stats: StatItem[];
  availability: { open: boolean; label: string };
};

export type MarqueeItem = { icon: IconKey; label: string; copy: string };
export type ServiceItem = { icon: IconKey; title: string; copy: string };

export type AboutSettings = {
  heading: string;
  body: string;
  points: string[];
  badge: string;
  badgeCopy: string;
  stat1: StatItem;
  stat2: StatItem;
};

export type SkillsSettings = {
  heading: string;
  items: string[];
  currentlyHeading: string;
  currently: string;
};

export type StatsSettings = {
  items: { icon: IconKey; value: string; label: string }[];
};

export type ContactSettings = {
  heading: string;
  body: string;
  discordLabel: string;
  discordUrl: string;
  discordNote: string;
  email: string;
  emailNote: string;
  replyNote: string;
};

export type FeaturedSettings = {
  badge: string;
  creators: { name: string; subs: string }[];
  creatorNote: string;
};

export type WorkPreviewSettings = {
  heading: string;
  copy: string;
  ctaLabel: string;
};

export type PricingTier = {
  name: string;
  price: string;
  gift: string;
  unit: string;
  blurb: string;
  points: string[];
  highlight?: boolean;
  /** Small badge label (e.g. "Most requested · 2 slots left"). */
  tag?: string;
};

export type PricingSettings = {
  heading: string;
  sub: string;
  revShareNote: string;
  availabilityNote: string;
  replyNote: string;
  bundleHeading: string;
  bundleBody: string;
  tiers: PricingTier[];
};

export type TestimonialItem = {
  quote: string;
  author: string;
  role: string;
  project?: string;
  image?: string;
};
export type TestimonialSettings = { heading: string; sub: string; items: TestimonialItem[] };

export type ProcessStep = { icon: IconKey; title: string; copy: string };
export type ProcessSettings = { heading: string; sub: string; steps: ProcessStep[] };
export type FaqItem = { q: string; a: string };
export type FaqSettings = { heading: string; sub: string; items: FaqItem[] };

export type LegalSection = { heading: string; body: string };
export type LegalSettings = { updated: string; intro: string; sections: LegalSection[] };

export type SiteSettings = {
  hero: HeroSettings;
  marquee: MarqueeItem[];
  services: ServiceItem[];
  about: AboutSettings;
  skills: SkillsSettings;
  stats: StatsSettings;
  contact: ContactSettings;
  featured: FeaturedSettings;
  workPreview: WorkPreviewSettings;
  pricing: PricingSettings;
  process: ProcessSettings;
  faq: FaqSettings;
  testimonials: TestimonialSettings;
  terms: LegalSettings;
  privacy: LegalSettings;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    name: "ZYN",
    badge: "Roblox Sound Design Portfolio",
    titlePrefix: "Professional",
    roles: ["SFX Artist", "QA Tester", "Manager", "Sound Designer"],
    titleSuffix: "for Roblox games",
    subtext:
      "I craft original sound effects — abilities, impacts, UI and ambience — that make Roblox games feel alive. Alongside audio I also handle QA testing, community management and game research.",
    ctaLabel: "See My Works",
    ctaNote: "projects in the portfolio — sound design, QA and community work.",
    discordLabel: "Message me on Discord",
    discordUrl: "https://discord.com/users/acczyn",
    stats: [
      { value: "2+", label: "SFX Projects" },
      { value: "20+", label: "Games Tested" },
      { value: "7+", label: "Communities" },
      { value: "48h", label: "Reply Time" },
    ],
    availability: { open: true, label: "Available for new commissions" },
  },
  marquee: [
    { icon: "audio", label: "SFX Design", copy: "Ability, ambience and UI audio." },
    { icon: "bug", label: "QA Testing", copy: "Detailed bug reports with repro steps." },
    { icon: "users", label: "Community", copy: "Discord setup, events and growth." },
    { icon: "message", label: "Player Feedback", copy: "Insight that improves retention." },
    { icon: "search", label: "Game Research", copy: "Trend and competitor analysis." },
    { icon: "shield", label: "Moderation", copy: "Anti-raid and rule enforcement." },
    { icon: "gamepad", label: "Roblox Native", copy: "Active player and tester." },
    { icon: "file", label: "Documentation", copy: "Structured, readable test docs." },
  ],
  services: [
    {
      icon: "audio",
      title: "SFX Design",
      copy: "Original sound effects for Roblox games — abilities, impacts, ambience, UI and combat audio, delivered game-ready.",
    },
    {
      icon: "bug",
      title: "Roblox QA Testing",
      copy: "Finding bugs, testing features, and delivering detailed reports with clear reproduction steps.",
    },
    {
      icon: "users",
      title: "Community Management",
      copy: "Discord setup, event organizing, moderation systems, and member growth.",
    },
    {
      icon: "message",
      title: "Game Feedback",
      copy: "Player-focused feedback that improves retention and gameplay flow.",
    },
    {
      icon: "search",
      title: "Game Research",
      copy: "Analyzing trends, competitor games, and player behavior to find opportunities.",
    },
    {
      icon: "shield",
      title: "Discord Moderation",
      copy: "Consistent rule enforcement, anti-raid setups, and a healthier server culture.",
    },
  ],
  about: {
    heading: "Reliable support that helps Roblox games feel better to play.",
    body: "I partner with Roblox developers to catch issues early, improve gameplay clarity, and strengthen community systems. From structured QA reports to player-focused feedback, the goal is simple: smoother updates and better retention.",
    points: [
      "Rigorous QA with clear reproduction steps",
      "Active Roblox player & community member",
      "Discord mod, coordinator & manager experience",
      "SFX artist for Roblox games",
    ],
    badge: "QA",
    badgeCopy:
      "Active Roblox player & tester — testing daily across live games and private builds.",
    stat1: { value: "48 hrs", label: "Avg bug report turnaround" },
    stat2: { value: "100%", label: "Repeat clients" },
  },
  skills: {
    heading: "Practical skills for games and their players.",
    items: [
      "SFX Design",
      "Sound Implementation",
      "Ambience & UI Audio",
      "Game Testing",
      "Bug Reporting",
      "Test Documentation",
      "Player Feedback",
      "Discord Management",
      "Community Growth",
      "Game Analysis",
      "Roblox Platform",
      "Discord Moderation",
    ],
    currentlyHeading: "Currently working on",
    currently:
      "Building better QA workflows, studying Roblox trends, developing SFX design skills, and growing a full toolkit for creators who care about player experience.",
  },
  stats: {
    items: [
      { icon: "bug", value: "9+", label: "Games QA Tested" },
      { icon: "gamepad", value: "3+", label: "Communities Managed" },
      { icon: "youtube", value: "2", label: "Big YouTubers in games" },
      { icon: "music", value: "2", label: "SFX Projects" },
    ],
  },
  contact: {
    heading: "Need custom SFX, sharper QA, or a stronger community?",
    body: "Send the details and I'll come back with scope, timeline and a sample direction for your game's sound.",
    discordLabel: "Message me on Discord — @acczyn",
    discordUrl: "https://discord.com/users/acczyn",
    discordNote: "Fastest way to reach me — usually a reply within minutes.",
    email: "zynx0286@gmail.com",
    emailNote: "I'm slower on email — Discord gets a quicker reply",
    replyNote: "Typical response: minutes on Discord, up to a few days by email.",
  },
  featured: {
    badge: "Featured Game",
    creators: [
      { name: "RoBros", subs: "1.91M subs" },
      { name: "MoreNizarisaqt", subs: "445K subs" },
    ],
    creatorNote: "— made content in this game",
  },
  workPreview: {
    heading: "Projects & Case Studies",
    copy: "Click any card to view the project on Roblox or visit the community page.",
    ctaLabel: "View all projects",
  },
  pricing: {
    heading: "Simple Robux rates.",
    sub: "Every service lists Robux and Visa gift card pricing — 100 Robux = $1. Pick a service, message me on Discord and we'll lock in scope and timeline.",
    revShareNote: "Game over 100 CCU? Ask about long-term rev share instead of upfront rates.",
    availabilityNote: "Available now — 2 commission slots left this week",
    replyNote: "Avg. reply: 48h · Discord fastest",
    bundleHeading: "Need a custom bundle?",
    bundleBody:
      "Full sound packs, long-term QA or a community + Discord retainer — send the details and I'll quote it. Discord gets the fastest reply.",
    tiers: [
      {
        name: "Simple SFX",
        price: "300–500 R$",
        gift: "$3–$5 Visa gift card",
        unit: "per simple sound",
        blurb: "UI buttons, footsteps, doors and other quick one-shots.",
        points: ["Custom-made, royalty free", "Game-ready formats", "Revisions until it fits"],
        highlight: true,
        tag: "Most requested · 2 slots left",
      },
      {
        name: "Medium SFX",
        price: "500–850 R$",
        gift: "$5–$8.50 Visa gift card",
        unit: "per sound",
        blurb: "Weapon reloads, magic spells, small explosions, vehicle engine loops and ambience.",
        points: ["Layered, game-ready mix", "Loop-ready where needed", "Revisions until it fits"],
      },
      {
        name: "Hard SFX & Music",
        price: "1,000–5,000+ R$",
        gift: "$10–$50+ Visa gift card",
        unit: "per sound · music per 30 seconds",
        blurb: "Complex sound design and original looping music, priced per 30 seconds of track.",
        points: ["Stems on request", "Theme written to your brief", "Revisions until it fits"],
      },
      {
        name: "QA Testing",
        price: "500 R$ + 100 R$/bug",
        gift: "$5 + $1 per bug",
        unit: "per game",
        blurb: "Structured bug hunting with clear, reproducible reports.",
        points: [
          "Repro steps + severity",
          "Device and edge-case passes",
          "100 R$ ($1) per confirmed bug",
        ],
        tag: "3 QA slots / week",
      },
      {
        name: "Community Management",
        price: "1,000–5,000+ R$",
        gift: "$10–$50+ Visa gift card",
        unit: "per week",
        blurb: "Day-to-day running of your game community.",
        points: ["Moderation + escalation", "Announcements & events", "Player feedback loop"],
      },
      {
        name: "Game Research",
        price: "2500 R$",
        gift: "$25 Visa gift card",
        unit: "per report",
        blurb: "Deep market and gameplay analysis on your genre and competitors.",
        points: ["Competitor teardown", "Retention & monetization notes", "Actionable roadmap"],
      },
      {
        name: "Discord Server Build",
        price: "3000 R$",
        gift: "$30 Visa gift card",
        unit: "full setup",
        blurb: "Full server build — structure, roles, bots, monetization.",
        points: ["Server architecture & roles", "Bots + automation setup", "Monetization setup"],
      },
      {
        name: "Bots & Automation",
        price: "5,000+ R$",
        gift: "$50+ Visa gift card",
        unit: "per setup",
        blurb: "Custom bots, automations and integrations for your server.",
        points: ["Custom commands & flows", "Moderation automation", "Testing + handover docs"],
      },
      {
        name: "Discord Management",
        price: "1,000–5,000+ R$",
        gift: "$10–$50+ Visa gift card",
        unit: "per week",
        blurb: "Ongoing management of an existing server.",
        points: ["Daily moderation", "Event scheduling", "Growth reporting"],
      },
    ],
  },
  process: {
    heading: "How I work",
    sub: "A clear, repeatable process so you always know what's happening next — no guesswork.",
    steps: [
      {
        icon: "message",
        title: "1 · Brief & scope",
        copy: "You share the game, the problem and the goal. I ask the right questions and we lock in scope, timeline and price.",
      },
      {
        icon: "search",
        title: "2 · Research & prep",
        copy: "I study the game, its genre and its players so the work fits the experience — not a generic template.",
      },
      {
        icon: "audio",
        title: "3 · Create & test",
        copy: "Sounds are crafted, or QA passes and gameplay checks are run, with structured notes at every step.",
      },
      {
        icon: "shield",
        title: "4 · Deliver & iterate",
        copy: "You get game-ready files or a written report, plus revisions until it's right.",
      },
    ],
  },
  faq: {
    heading: "Questions, answered",
    sub: "The things clients usually ask before we start.",
    items: [
      {
        q: "How fast do you reply?",
        a: "Discord is the fastest — usually minutes. Email can take a day or two.",
      },
      {
        q: "Do you work in Robux or real money?",
        a: "Both. I accept Robux or Visa gift cards at 100 Robux = $1. Games over 100 concurrent players can also discuss long-term rev share.",
      },
      {
        q: "Can you do a full game sound pack?",
        a: "Yes — abilities, impacts, UI, ambience and music. Bundles get better rates than single sounds, and we scope it together first.",
      },
      {
        q: "What does a QA report actually look like?",
        a: "A structured document with each bug's severity, exact reproduction steps, device/edge-case notes and a suggested fix direction.",
      },
      {
        q: "What if the first result isn't right?",
        a: "Revisions are included until it fits your game. If it's still not working, we'll adjust scope before anything extra is charged.",
      },
    ],
  },
  testimonials: {
    heading: "What clients say",
    sub: "Real feedback from developers I've worked with.",
    items: [
      {
        quote:
          "ZYN's marketing work helped Codex Customs grow with real engagement — consistent, creative, and always on time with deliverables.",
        author: "Codex Customs",
        role: "Marketing Team",
        project: "Codex Customs — 5.4k members",
        image: testimonialCodex,
      },
      {
        quote:
          "ZYN caught critical bugs before launch that would've broken the player experience. Professional, thorough, and fast.",
        author: "Dev @ Fluxwerk",
        role: "Lead Developer",
        project: "Multiple titles",
      },
      {
        quote:
          "Best SFX artist I've worked with. Delivered exactly what we needed on time, and the sounds elevated our game's feel instantly.",
        author: "Dev @ Star Realm",
        role: "Producer",
        project: "Star Realm",
      },
      {
        quote:
          "Community management on point. Grew our Discord from 2k to 10k+ members with real engagement, not just numbers.",
        author: "Owner @ Trading Port",
        role: "Server Owner",
        project: "Trading Port — Blox Fruits",
      },
    ],
  },
  terms: {
    updated: "September 2026",
    intro:
      "Plain-language terms for working with ZYN — if anything here is unclear, ask on Discord before commissioning.",
    sections: [
      {
        heading: "1. Scope & quotes",
        body: "Every commission starts with a written brief: what is delivered, the timeline, and the price. Work begins once both sides confirm the brief. Anything outside the brief is quoted separately.",
      },
      {
        heading: "2. Payment & currency",
        body: "Payment in Robux or Visa gift cards (100 Robux = $1) unless otherwise agreed. For Robux you may pay via gamepass, shirt, or group payout — whichever suits you. If you pay with a gamepass or shirt, you cover the Roblox tax on top of the quoted price so the agreed amount arrives in full. If you pay with a Visa gift card, you likewise cover any activation or transaction fees. Larger projects may be split into milestones. Delivery happens after final payment clears, unless a milestone plan says otherwise.",
      },
      {
        heading: "3. Refunds",
        body: "Deposits are non-refundable once work has started. If I cancel the project for personal reasons, a 100% refund of everything paid will be issued.",
      },
      {
        heading: "4. Progress updates",
        body: "Progress updates — including watermarked previews where applicable — are sent via Discord every 2–3 days so you always know where things stand.",
      },
      {
        heading: "5. Revisions",
        body: "Includes 3 rounds of minor revisions during the drafting phase. Major changes, new directions outside the brief, or revisions requested after the work is completed are quoted and billed separately — the extra fee is confirmed with you before any further work starts.",
      },
      {
        heading: "6. Inactivity",
        body: "If you fail to respond to updates for more than 7 consecutive days, the commission will be canceled, the deposit forfeited, and the assets may be resold.",
      },
      {
        heading: "7. Ownership & credit",
        body: "I own 100% of the assets until the final payment clears — using, publishing, or distributing them before full payment is a violation of these terms. Full rights transfer to you on final payment. I reserve the right to display all commissioned work in this portfolio and on social media for promotional purposes, unless a Non-Disclosure Agreement (NDA) is signed before work starts. Credit must be given in the game's description or an in-game credits menu linking to my Roblox profile.",
      },
      {
        heading: "8. Rules & conduct",
        body: "I will not create anything that violates the [Roblox Community Standards](https://create.roblox.com/docs/marketplace/marketplace-policy) (for example explicit content or copyrighted assets taken from other games). I reserve the right to decline or cancel a commission at any time if the client becomes hostile, disrespectful, or violates these terms.",
      },
      {
        heading: "9. QA & community work",
        body: "QA reports describe issues found with reproduction steps — they do not guarantee a bug-free game. Community and moderation advice is best-effort guidance, not legal advice.",
      },
      {
        heading: "10. Liability",
        body: "To the maximum extent permitted by law, liability is limited to the amount paid for the commission in question. Nothing here limits rights you hold under applicable consumer-protection law.",
      },
      {
        heading: "11. Contact",
        body: "Questions about these terms: message @acczyn on Discord or email zynx0286@gmail.com. Continued use of this site after an update means you accept the updated terms.",
      },
    ],
  },
  privacy: {
    updated: "September 2026",
    intro:
      "Short version: this site collects the minimum needed to reply to you, and nothing else.",
    sections: [
      {
        heading: "What is collected",
        body: "Contacting ZYN opens Gmail or Discord — your message goes directly through those services, and this site itself stores nothing about it. To do business, minimal details may be exchanged: Roblox account details (user ID, username, and display name), contact information (Discord tags, X handles, or email addresses used to communicate or send invoices), and — if you write a review — what you submit (name, rating, title, content, optional project), which is stored so it can be displayed publicly; your email address is kept private and never shown. Payment details: I never see or store credit card numbers — all financial transactions are handled securely by third-party processors (Roblox and the gift-card provider) and are subject to their respective privacy policies. On-page events (like button clicks) are only kept in memory in your browser, and no third-party analytics, advertising, or cross-site trackers run on this site.",
      },
      {
        heading: "How it is used",
        body: "Your details are used to communicate about the commission, send progress updates, deliver the final files, and track payments and business receipts for invoicing. Your contact details will never be sold, leased, or shared with third parties for marketing purposes.",
      },
      {
        heading: "Cookies & local storage",
        body: "No tracking or advertising cookies are set. Three functional exceptions: (1) your cookie-banner choice is remembered in your browser's local storage, (2) the password-protected admin area uses a single strictly-necessary session cookie (zyn_session) for the site owner only, and (3) the review form remembers on your device if you already submitted, so each device can only review once. Declining the banner changes nothing about how the site works — there is nothing extra to opt out of.",
      },
      {
        heading: "Where it goes",
        body: "Published reviews are stored privately and shown publicly (minus your email) so ZYN can display them. They are never sold, shared, or used for marketing. Outbound links and contact channels (Gmail, Discord, Roblox) are covered by those services' own privacy policies.",
      },
      {
        heading: "Your rights",
        body: "Want a review you wrote viewed, corrected or deleted? Message @acczyn on Discord or email zynx0286@gmail.com and it will be handled directly. Under laws like the GDPR (EU/UK) and CCPA/CPRA (California) you can request access, correction, deletion, and — since nothing is sold or shared — there is no sale or sharing of personal information to opt out of.",
      },
      {
        heading: "Children",
        body: "This site is aimed at game developers, not children. If you are under the age of 13, you must have permission from a parent or legal guardian before hiring me or providing any personal communication details — otherwise, please have a parent or guardian contact ZYN on your behalf. Messages known to be from children under 13 are deleted on discovery.",
      },
      {
        heading: "Retention & changes",
        body: 'I only keep your contact information and chat logs for the duration of the commission and for historical financial records. Published reviews are kept so they can be displayed, and deleted on request or when no longer needed. If you wish for your commission records or contact details to be deleted from my private message history after a project is finished, you may request it by messaging me directly. If this policy changes materially, the "Last updated" date above will change with it — check back occasionally. Continued use of the site after a change means you accept the updated policy.',
      },
    ],
  },
};

export function mergeSettings(stored: Record<string, unknown> | undefined): SiteSettings {
  const s = stored ?? {};

  const pickObj = (key: string): Record<string, unknown> | undefined => {
    const v = s[key];
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : undefined;
  };
  const pickArr = <T>(key: string, fallback: T[]): T[] => {
    const v = s[key];
    return Array.isArray(v) ? (v as T[]) : fallback;
  };
  const pickStr = (
    obj: Record<string, unknown> | undefined,
    key: string,
    fallback: string,
  ): string => (typeof obj?.[key] === "string" ? (obj[key] as string) : fallback);

  const heroRaw = pickObj("hero");
  // `titleHighlight` is obsolete (the rotating roles replace it) — drop it so
  // stale stored values can't linger in the merged output.
  const { titleHighlight: _dropped, ...heroStored } = (heroRaw ?? {}) as Record<string, unknown>;
  const heroRoles = Array.isArray(heroRaw?.["roles"])
    ? (heroRaw["roles"] as unknown[])
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        .map((r) => r.slice(0, 60))
    : DEFAULT_SETTINGS.hero.roles;
  const heroStats = Array.isArray(heroRaw?.["stats"])
    ? (heroRaw["stats"] as StatItem[])
    : DEFAULT_SETTINGS.hero.stats;
  const availabilityRaw = pickObj("hero")?.["availability"];
  const availability = {
    open:
      availabilityRaw && typeof availabilityRaw === "object" && "open" in availabilityRaw
        ? Boolean((availabilityRaw as Record<string, unknown>)["open"])
        : DEFAULT_SETTINGS.hero.availability.open,
    label:
      availabilityRaw && typeof availabilityRaw === "object" && "label" in availabilityRaw
        ? String((availabilityRaw as Record<string, unknown>)["label"])
        : DEFAULT_SETTINGS.hero.availability.label,
  };

  const aboutRaw = pickObj("about");
  const aboutPoints = Array.isArray(aboutRaw?.["points"])
    ? (aboutRaw["points"] as string[])
    : DEFAULT_SETTINGS.about.points;
  const pickStat = (raw: unknown, fallback: StatItem): StatItem => {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const r = raw as Record<string, unknown>;
      return {
        value: pickStr(r, "value", fallback.value),
        label: pickStr(r, "label", fallback["label"]),
      };
    }
    return fallback;
  };

  const skillsRaw = pickObj("skills");
  const skillsItems = Array.isArray(skillsRaw?.["items"])
    ? (skillsRaw["items"] as string[])
    : DEFAULT_SETTINGS.skills.items;

  const statsRaw = pickObj("stats");
  const statsItems = Array.isArray(statsRaw?.["items"])
    ? (statsRaw["items"] as StatsSettings["items"])
    : DEFAULT_SETTINGS.stats.items;

  const featuredRaw = pickObj("featured");
  const featuredCreators = Array.isArray(featuredRaw?.["creators"])
    ? (featuredRaw["creators"] as FeaturedSettings["creators"])
    : DEFAULT_SETTINGS.featured.creators;

  const processRaw = pickObj("process");
  const processSteps = Array.isArray(processRaw?.["steps"])
    ? (processRaw["steps"] as ProcessStep[])
    : DEFAULT_SETTINGS.process.steps;

  const faqRaw = pickObj("faq");
  const faqItems = Array.isArray(faqRaw?.["items"])
    ? (faqRaw["items"] as FaqItem[])
    : DEFAULT_SETTINGS.faq.items;

  const testimonialsRaw = pickObj("testimonials");
  const testimonialItems = Array.isArray(testimonialsRaw?.["items"])
    ? (testimonialsRaw["items"] as TestimonialItem[])
    : DEFAULT_SETTINGS.testimonials.items;

  const contactRaw = pickObj("contact");

  const pricingRaw = pickObj("pricing");
  const pickTiers = (raw: unknown, fallback: PricingTier[]): PricingTier[] => {
    if (!Array.isArray(raw)) return fallback;
    const tiers = raw
      .filter(
        (t): t is Record<string, unknown> => !!t && typeof t === "object" && !Array.isArray(t),
      )
      .map((t) => ({
        name: pickStr(t, "name", ""),
        price: pickStr(t, "price", ""),
        gift: pickStr(t, "gift", ""),
        unit: pickStr(t, "unit", ""),
        blurb: pickStr(t, "blurb", ""),
        points: Array.isArray(t["points"])
          ? (t["points"] as unknown[]).filter((p): p is string => typeof p === "string")
          : [],
        ...(typeof t["highlight"] === "boolean" && t["highlight"] ? { highlight: true } : {}),
        ...(typeof t["tag"] === "string" && t["tag"] ? { tag: t["tag"] as string } : {}),
      }))
      .filter((t) => t.name.length > 0 || t.price.length > 0);
    return tiers.length > 0 ? tiers.slice(0, 24) : fallback;
  };

  /** Editable link fields must survive the merge as genuine http(s) URLs. */
  const safeUrlField = (v: unknown, fallback: string): string => {
    const safe = safeExternalUrl(typeof v === "string" ? v : "");
    return safe ?? fallback;
  };

  const pickLegal = (key: string, fallback: LegalSettings): LegalSettings => {
    const raw = pickObj(key);
    const sections = Array.isArray(raw?.["sections"])
      ? (raw["sections"] as unknown[])
          .filter(
            (s): s is LegalSection =>
              !!s &&
              typeof s === "object" &&
              typeof (s as LegalSection).heading === "string" &&
              typeof (s as LegalSection).body === "string",
          )
          .map((s) => ({ heading: s.heading, body: s.body }))
      : fallback.sections;
    return {
      updated: pickStr(raw, "updated", fallback.updated),
      intro: pickStr(raw, "intro", fallback.intro),
      sections,
    };
  };

  return {
    hero: {
      ...DEFAULT_SETTINGS.hero,
      ...heroStored,
      roles: heroRoles,
      stats: heroStats,
      availability,
      discordUrl: safeUrlField(heroRaw?.["discordUrl"], DEFAULT_SETTINGS.hero.discordUrl),
    },
    marquee: pickArr<MarqueeItem>("marquee", DEFAULT_SETTINGS.marquee),
    services: pickArr<ServiceItem>("services", DEFAULT_SETTINGS.services),
    about: {
      ...DEFAULT_SETTINGS.about,
      ...aboutRaw,
      points: aboutPoints,
      stat1: pickStat(aboutRaw?.["stat1"], DEFAULT_SETTINGS.about.stat1),
      stat2: pickStat(aboutRaw?.["stat2"], DEFAULT_SETTINGS.about.stat2),
    },
    skills: {
      ...DEFAULT_SETTINGS.skills,
      ...skillsRaw,
      items: skillsItems,
    },
    stats: { items: statsItems },
    contact: {
      ...DEFAULT_SETTINGS.contact,
      ...contactRaw,
      discordUrl: safeUrlField(contactRaw?.["discordUrl"], DEFAULT_SETTINGS.contact.discordUrl),
    },
    featured: {
      ...DEFAULT_SETTINGS.featured,
      ...featuredRaw,
      creators: featuredCreators,
    },
    workPreview: {
      ...DEFAULT_SETTINGS.workPreview,
      ...pickObj("workPreview"),
    },
    pricing: {
      ...DEFAULT_SETTINGS.pricing,
      ...pricingRaw,
      tiers: pickTiers(pricingRaw?.["tiers"], DEFAULT_SETTINGS.pricing.tiers),
    },
    process: {
      ...DEFAULT_SETTINGS.process,
      ...processRaw,
      steps: processSteps,
    },
    faq: {
      ...DEFAULT_SETTINGS.faq,
      ...faqRaw,
      items: faqItems,
    },
    testimonials: {
      ...DEFAULT_SETTINGS.testimonials,
      ...testimonialsRaw,
      items: testimonialItems,
    },
    terms: { ...DEFAULT_SETTINGS.terms, ...pickLegal("terms", DEFAULT_SETTINGS.terms) },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...pickLegal("privacy", DEFAULT_SETTINGS.privacy) },
  };
}
