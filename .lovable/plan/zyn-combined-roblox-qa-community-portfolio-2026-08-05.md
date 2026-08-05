# ZYN — Combined Roblox QA & Community Portfolio

Rebuild the portfolio as one site: the Figma site's dark neon-blue visual theme, the Framer site's structure and content, and the full works archive from the Framer `/games` page plus the extra entries that only exist on the Figma site. Glass (frosted) treatment on all image cards.

## Visual direction (Figma theme + Rofishy polish)

- Near-black navy background with a subtle blue glow, electric blue accent, wide geometric display headings, soft rounded corners.
- Borrowed from the Rofishy reference: floating pill-shaped nav bar centered at the top with a rounded accent CTA on the right, big centered hero wordmark with one highlighted word block, pill CTA buttons with an arrow, and a continuously scrolling marquee strip of icon + label skills under the hero.
- Glassmorphism for every image container: translucent surface, blurred backdrop, thin light border, inner highlight, soft outer glow on hover.
- Restrained motion: hover lift on cards, gentle fade/rise on scroll, looping marquee. No heavy animation.

## Pages

**Home (`/`)**
- Floating pill nav: ZYN logo, Home / About / Work / Contact, "Hire Me" button.
- Hero (centered, Rofishy-style): "ZYN" wordmark, "ROBLOX FREELANCE PORTFOLIO" eyebrow, `Roblox QA Tester & Community Specialist` with one accent-highlighted word, intro line, View My Work + Contact Me pill buttons.
- Marquee strip: looping row of QA / community / SFX capability items with icons.
- Stats strip: 9+ Games QA Tested · 3+ Communities Managed · 2 Big YouTubers in games · 2 SFX Projects.
- About: "Reliable support that helps Roblox games feel better to play." + the four credential bullets, glass side card, 48 hrs / 100% metrics.
- Services: six cards — QA Testing, Community Management, Game Feedback, Game Research, Discord Moderation, SFX Design.
- Featured: Simple Bricks highlight (KreekCraft 6.5M, Caylus 9.8M).
- Work preview: six glass cards, link through to the full archive.
- Skills: the ten skill chips + "Currently working on" note.
- Contact CTA: "Need sharper QA, stronger community systems, or clearer player insight?" — Discord `@acczyn`, Open Discord + View My Work.
- Footer with the same four links.


**Work archive (`/work`)**
- Header: "GAME ARCHIVE" / "Games I've helped shape." + description.
- Search-by-title field plus category filters: All Work, QA Testing, Game Scout, Community Manager, Community Coordinator, SFX / Audio.
- Responsive grid of glass cards: image, category label, title, role, tag chips, external link.

## Work items (combined, de-duplicated)

Framer images reused where they exist; the rest ship with an empty glass placeholder frame ready for images you send.

With Framer image: Fortify Tower Defense, HEAD TAP, Engineria: Project X, Real Or Fake, Lost At Sea, Hammer Fishing, Bat A Lucky Block, Survive and Save Slimes, Horizon QA, Higher Elites, Zae Studios.

Blank placeholder for now: Simple Bricks, Squishy Card Farm, Dark vs Light, Fuse Beasts, Unnamed Community (Moderator), Roblox Cultivation MMORPG (Lead SFX), Roshel Survivors (SFX Design).

Each item keeps its Roblox / community link, descriptions from the Figma site, and its tags.

## Technical notes

- TanStack Start routes: rewrite `src/routes/index.tsx` for the home page, add `src/routes/work.tsx` for the archive. Per-route `head()` metadata (title, description, og/twitter).
- Design tokens (dark base, blue accent, glass surface, glow shadow, radii, display/body fonts) go in `src/styles.css` under `:root` + `@theme inline`; fonts loaded via `<link>` in `__root.tsx`. No hardcoded color classes in components.
- Work data lives in one typed `src/data/works.ts` array (title, category, role, description, tags, href, image) so cards and filters read from a single source and missing images are easy to fill in later.
- Framer images are downloaded into `src/assets/` and imported, not hotlinked.
- Components split into `src/components/` (Nav, Hero, Stats, About, Services, FeaturedGame, WorkCard, WorkGrid, Skills, ContactCta, Footer, GlassFrame).
- Static site; no backend needed.
