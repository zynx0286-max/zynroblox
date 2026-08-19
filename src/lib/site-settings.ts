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
  titleHighlight: string;
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

export type ProcessStep = { icon: IconKey; title: string; copy: string };
export type ProcessSettings = { heading: string; sub: string; steps: ProcessStep[] };
export type FaqItem = { q: string; a: string };
export type FaqSettings = { heading: string; sub: string; items: FaqItem[] };

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
  process: ProcessSettings;
  faq: FaqSettings;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    name: "ZYN",
    badge: "Roblox Sound Design Portfolio",
    titlePrefix: "Professional",
    titleHighlight: "SFX Artist",
    titleSuffix: "for Roblox games",
    subtext:
      "I craft original sound effects — abilities, impacts, UI and ambience — that make Roblox games feel alive. Alongside audio I also handle QA testing, community management and game research.",
    ctaLabel: "Hear My Work",
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
      { name: "KreekCraft", subs: "6.5M subs" },
      { name: "Caylus", subs: "9.8M subs" },
    ],
    creatorNote: "— made content in this game",
  },
  workPreview: {
    heading: "Projects & Case Studies",
    copy: "Click any card to view the project on Roblox or visit the community page.",
    ctaLabel: "View all projects",
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
        a: "Both. Robux is the default for services listed on the pricing page; USD is also fine for larger or long-term projects.",
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
};

export function mergeSettings(stored: Record<string, unknown> | undefined): SiteSettings {
  const s = stored ?? {};
  const pick = <T>(key: string, fallback: T): T => (s[key] as T | undefined) ?? fallback;

  return {
    hero: {
      ...DEFAULT_SETTINGS.hero,
      ...(pick<Partial<HeroSettings> | undefined>("hero", undefined) ?? {}),
    },
    marquee: pick<MarqueeItem[]>("marquee", DEFAULT_SETTINGS.marquee),
    services: pick<ServiceItem[]>("services", DEFAULT_SETTINGS.services),
    about: {
      ...DEFAULT_SETTINGS.about,
      ...(pick<Partial<AboutSettings> | undefined>("about", undefined) ?? {}),
    },
    skills: {
      ...DEFAULT_SETTINGS.skills,
      ...(pick<Partial<SkillsSettings> | undefined>("skills", undefined) ?? {}),
    },
    stats: {
      items: pick<StatsSettings["items"]>("stats", DEFAULT_SETTINGS.stats.items),
    },
    contact: {
      ...DEFAULT_SETTINGS.contact,
      ...(pick<Partial<ContactSettings> | undefined>("contact", undefined) ?? {}),
    },
    featured: {
      ...DEFAULT_SETTINGS.featured,
      ...(pick<Partial<FeaturedSettings> | undefined>("featured", undefined) ?? {}),
    },
    workPreview: {
      ...DEFAULT_SETTINGS.workPreview,
      ...(pick<Partial<WorkPreviewSettings> | undefined>("workPreview", undefined) ?? {}),
    },
    process: {
      ...DEFAULT_SETTINGS.process,
      ...(pick<Partial<ProcessSettings> | undefined>("process", undefined) ?? {}),
    },
    faq: {
      ...DEFAULT_SETTINGS.faq,
      ...(pick<Partial<FaqSettings> | undefined>("faq", undefined) ?? {}),
    },
  };
}
