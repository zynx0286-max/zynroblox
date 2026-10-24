import { LegalBody } from "./LegalBody";

const legalSectionId = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Shared long-form legal reading layout: sticky numbered contents on the
 * left, an editorial reading panel on the right. Copy still comes from the
 * owner-editable legal settings.
 */
export function LegalArticle({ sections }: { sections: { heading: string; body: string }[] }) {
  const items = sections.map((section) => ({
    ...section,
    id: legalSectionId(section.heading),
  }));

  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[0.55fr_1fr] lg:gap-16 lg:px-10 lg:py-24">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground/70 uppercase">
              On this page
            </p>
            <ol className="mt-4 space-y-2.5">
              {items.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group flex items-start gap-3 font-mono text-[0.58rem] leading-relaxed tracking-[0.04em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                  >
                    <span className="text-primary/70 transition-colors group-hover:text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {item.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="editorial-card p-6 sm:p-8">
          {items.map((item, i) => (
            <section
              key={item.id}
              id={item.id}
              className="scroll-mt-24 border-b border-border pb-7 last:border-b-0 last:pb-0 [&+section]:pt-7"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[0.56rem] tracking-[0.14em] text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-lg font-semibold tracking-[-0.02em] sm:text-xl">
                  {item.heading}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <LegalBody body={item.body} />
              </p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
