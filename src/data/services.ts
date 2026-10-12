export type UseCase = {
  slug: string;
  title: string;
  tagline: string;
  need: string;
  outcome: string;
  deliverables: string[];
  priceNote: string;
  /** Anchor id of the matching tier on /pricing (e.g. "qa-testing"). */
  pricingAnchor: string;
  /** Optional banner shown under the CTA (e.g. rev-share terms). */
  note?: string;
  /** Work categories/tags used to pull related proof from the archive. */
  matchCategories: string[];
  matchTags: string[];
  faqs: { q: string; a: string }[];
};

export const USE_CASES: UseCase[] = [
  {
    slug: "sfx",
    title: "SFX & Sound Design",
    tagline: "Original game-ready sound for Roblox games",
    need: "Your game plays well but feels flat — abilities, impacts and UI sound are stock, missing, or inconsistent.",
    outcome:
      "A cohesive sound set that makes every click, hit and ability feel responsive, so sessions feel alive and players stay longer.",
    deliverables: [
      "Ability, impact, UI and ambience sounds built to your brief",
      "Game-ready formats, loop-checked and level-balanced",
      "Mix notes so volumes sit right across devices",
      "Revisions until every sound fits your game",
    ],
    priceNote:
      "Simple 300–500 R$ ($3–$5) · Medium 500–850 R$ ($5–$8.50) · Hard & music 1,000–5,000+ R$ ($10–$50+), music per 30 seconds.",
    pricingAnchor: "simple-sfx",
    note: "Game over 100 concurrent players? I can do long-term rev share instead of upfront rates — ask on Discord.",
    matchCategories: ["SFX / Audio"],
    matchTags: ["SFX Design"],
    faqs: [
      {
        q: "Can you do a full game sound pack?",
        a: "Yes — abilities, impacts, UI, ambience and music scoped together. Bundles get better rates than single sounds.",
      },
      {
        q: "What do you need from me to start?",
        a: "A build or video of the game plus a short list of the sounds you need. I handle the rest and check mixes in-context.",
      },
    ],
  },
  {
    slug: "qa",
    title: "QA Testing",
    tagline: "Structured bug hunting with reproducible reports",
    need: "Updates ship with bugs players find first — broken loops, economy exploits, or device-specific glitches hurt retention.",
    outcome:
      "A written report with severity ratings and exact reproduction steps, so you fix the right things before players ever see them.",
    deliverables: [
      "Full gameplay pass: loops, progression, economy and edge cases",
      "Each bug with severity, repro steps and suggested fix direction",
      "Device and edge-case coverage (mobile, low-end, leave/rejoin)",
      "Regression check on fixes before release",
    ],
    priceNote:
      "500 R$ ($5) per game + 100 R$ ($1) per confirmed bug — scoped up front, report included.",
    pricingAnchor: "qa-testing",
    matchCategories: ["QA Testing"],
    matchTags: ["QA Testing", "Bug Reports"],
    faqs: [
      {
        q: "What does a QA report actually look like?",
        a: "A structured document: each bug's severity, exact reproduction steps, device notes and a suggested fix direction.",
      },
      {
        q: "How fast is turnaround?",
        a: "Average bug report turnaround is 48 hours. Larger games are scoped with a timeline before we start.",
      },
    ],
  },
  {
    slug: "community",
    title: "Community Growth & Management",
    tagline: "Discord servers players actually stay in",
    need: "Your Discord is quiet, chaotic, or bleeding members — announcements flop, moderation is inconsistent, and nobody runs events.",
    outcome:
      "A managed community with clear rules, regular events and a feedback loop back to development, so players recruit their friends.",
    deliverables: [
      "Server setup or cleanup: channels, roles, bots and automations",
      "Daily moderation with consistent rule enforcement",
      "Announcements, events and engagement scheduling",
      "Player feedback summaries for your roadmap",
    ],
    priceNote:
      "Management 1,000–5,000+ R$ ($10–$50+) per week · server builds from 3,000 R$ ($30) · bots from 5,000+ R$ ($50+).",
    pricingAnchor: "community-management",
    matchCategories: ["Community Manager", "Community Coordinator"],
    matchTags: ["Discord"],
    faqs: [
      {
        q: "Do you build servers from scratch?",
        a: "Yes — structure, roles, bots, automations and monetization setup, then ongoing management if you want it.",
      },
      {
        q: "How do you handle raids and toxicity?",
        a: "Anti-raid setups, clear rules, escalation paths and consistent enforcement — documented so your team can follow it.",
      },
    ],
  },
  {
    slug: "pre-release",
    title: "Pre-Release Testing",
    tagline: "Launch verification before update day",
    need: "Launch day is your biggest risk — one broken quest, shop, or save migration can tank ratings and CCU overnight.",
    outcome:
      "A release-verification pass with a go/no-go summary, so you launch knowing the critical paths actually work.",
    deliverables: [
      "Critical-path sweep: onboarding, purchases, saves and new content",
      "Release verification across updates with regression tracking",
      "Go/no-go summary with must-fix vs. can-wait triage",
      "Day-one monitoring notes for the issues most likely to spike",
    ],
    priceNote: "From 500 R$ ($5) per release — scoped to your update size.",
    pricingAnchor: "qa-testing",
    matchCategories: ["QA Testing", "Game Scout"],
    matchTags: ["Release QA", "Regression Testing", "Pre-release QA"],
    faqs: [
      {
        q: "How is this different from regular QA?",
        a: "It's scoped to your release: critical paths first, triaged into must-fix vs. can-wait, with a launch decision summary.",
      },
      {
        q: "Can you test private builds?",
        a: "Yes — I test private builds and testing places under NDA-style discretion: nothing shared, everything reported to you.",
      },
    ],
  },
  {
    slug: "game-research",
    title: "Game Research",
    tagline: "Trend and competitor analysis for Roblox games",
    need: "You're guessing what to build next — unsure which genre trends, mechanics, or monetization moves actually retain players.",
    outcome:
      "A written report with competitor teardowns and actionable next steps, so you build what players already want.",
    deliverables: [
      "Competitor teardown across your genre",
      "Retention and monetization notes",
      "Player behavior and trend analysis",
      "Actionable roadmap for your next update",
    ],
    priceNote: "2,500 R$ ($25) per report.",
    pricingAnchor: "game-research",
    matchCategories: ["Game Scout"],
    matchTags: ["Game Research", "Game Analysis"],
    faqs: [
      {
        q: "What do you need from me to start?",
        a: "Your game link plus 2–3 competitors you care about. I handle the research and deliver a structured report.",
      },
      {
        q: "How fast is turnaround?",
        a: "Reports are scoped up front — message me on Discord with your genre and timeline.",
      },
    ],
  },
  {
    slug: "discord-server-build",
    title: "Discord Server Build",
    tagline: "Full server setup — structure, roles, bots",
    need: "Your Discord is missing structure — no clear channels, roles, or automations, so new members bounce and mods burn out.",
    outcome:
      "A complete server build with roles, bots and monetization wired up, ready for players on day one.",
    deliverables: [
      "Server architecture: channels, roles and permissions",
      "Bots and automation setup",
      "Monetization and rules setup",
      "Handover notes so your team can run it",
    ],
    priceNote: "3,000 R$ ($30) full setup.",
    pricingAnchor: "discord-server-build",
    matchCategories: ["Community Manager", "Community Coordinator"],
    matchTags: ["Discord"],
    faqs: [
      {
        q: "Do you build from scratch or fix existing servers?",
        a: "Both — fresh builds or cleanup of an existing server, scoped to your size and goals.",
      },
      {
        q: "Are bots included?",
        a: "Core bots and automations are included. Fully custom bots are scoped separately — see Bots & Automation.",
      },
    ],
  },
  {
    slug: "bots-automation",
    title: "Bots & Automation",
    tagline: "Custom bots and workflows for your server",
    need: "Moderation and events eat all your time — manual welcomes, role grants, and raid response don't scale.",
    outcome:
      "Custom bots and automations that handle the busywork, so your team focuses on players, not settings.",
    deliverables: [
      "Custom commands and workflows built to your brief",
      "Moderation automation with escalation paths",
      "Testing across roles and edge cases",
      "Handover docs for your team",
    ],
    priceNote: "From 5,000+ R$ ($50+) per setup.",
    pricingAnchor: "bots-automation",
    matchCategories: ["Community Manager", "Community Coordinator"],
    matchTags: ["Discord"],
    faqs: [
      {
        q: "What can you automate?",
        a: "Welcomes, roles, tickets, moderation actions, event flows and integrations — scoped to what your server needs.",
      },
      {
        q: "Do I keep control after handover?",
        a: "Yes — you get full ownership plus docs so your team can adjust everything afterwards.",
      },
    ],
  },
  {
    slug: "discord-management",
    title: "Discord Management",
    tagline: "Ongoing management for an existing server",
    need: "Your server exists but nobody runs it day-to-day — moderation lags, events stall, and growth flatlines.",
    outcome:
      "Daily management with moderation, events and growth reporting, so the server stays active without you babysitting it.",
    deliverables: [
      "Daily moderation with consistent enforcement",
      "Event scheduling and announcements",
      "Growth and engagement reporting",
      "Player feedback summaries for your roadmap",
    ],
    priceNote: "1,000–5,000+ R$ ($10–$50+) per week.",
    pricingAnchor: "discord-management",
    matchCategories: ["Community Manager", "Community Coordinator"],
    matchTags: ["Discord"],
    faqs: [
      {
        q: "How is this different from Community Growth & Management?",
        a: "This is ongoing management of an existing server. The Growth package also covers fresh setup and growth strategy.",
      },
      {
        q: "How do we start?",
        a: "Message me on Discord with your server invite and goals — we scope weekly duties and rate up front.",
      },
    ],
  },
];

export const getUseCase = (slug: string) => USE_CASES.find((u) => u.slug === slug);
