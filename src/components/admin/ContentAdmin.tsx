import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { captureError } from "@/lib/sentry";
import { listSiteSettings, saveSiteSettings } from "@/lib/site.functions";
import {
  mergeSettings,
  ICONS,
  DEFAULT_SETTINGS,
  type IconKey,
  type SiteSettings,
} from "@/lib/site-settings";

type SectionKey = keyof SiteSettings;

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "marquee", label: "Marquee" },
  { key: "services", label: "Services" },
  { key: "featured", label: "Featured game" },
  { key: "about", label: "About" },
  { key: "workPreview", label: "Work preview" },
  { key: "stats", label: "Stats" },
  { key: "skills", label: "Skills" },
  { key: "contact", label: "Contact" },
];

const field =
  "mt-1.5 w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60";
const label = "font-display text-[0.68rem] tracking-wider text-muted-foreground uppercase";

const ICON_KEYS = Object.keys(ICONS) as IconKey[];

export function ContentAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(listSiteSettings);
  const save = useServerFn(saveSiteSettings);

  const [active, setActive] = useState<SectionKey>("hero");
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      try {
        return mergeSettings(await load());
      } catch (err) {
        captureError(err, { area: "admin" });
        return DEFAULT_SETTINGS;
      }
    },
  });

  const settings = draft ?? query.data ?? DEFAULT_SETTINGS;

  const saveMutation = useMutation({
    mutationFn: (key: SectionKey) =>
      save({ data: { key, value: settings[key] as Record<string, unknown> } }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      void qc.invalidateQueries({ queryKey: ["site-settings"] });
      void qc.invalidateQueries({ queryKey: ["site-settings-public"] });
    },
    onError: (err: unknown) => {
      captureError(err, { area: "admin" });
      setError(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  const set = <K extends SectionKey>(key: K, value: SiteSettings[K]) => {
    setDraft((d) => ({ ...(d ?? query.data ?? DEFAULT_SETTINGS), [key]: value }));
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-left font-display text-sm transition-colors ${
              active === s.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">
            {SECTIONS.find((s) => s.key === active)?.label}
          </h2>
          <button
            onClick={() => saveMutation.mutate(active)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <SaveIcon />
            )}
            {saved ? "Saved" : "Save section"}
          </button>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          {active === "hero" ? <HeroEditor settings={settings} set={set} /> : null}
          {active === "marquee" ? (
            <ObjectListEditor<SiteSettings["marquee"][number]>
              key="marquee"
              title="Marquee items"
              values={settings.marquee}
              onChange={(v) => set("marquee", v)}
            />
          ) : null}
          {active === "services" ? (
            <ObjectListEditor<SiteSettings["services"][number]>
              key="services"
              title="Services"
              values={settings.services}
              onChange={(v) => set("services", v)}
            />
          ) : null}
          {active === "featured" ? <FeaturedEditor settings={settings} set={set} /> : null}
          {active === "about" ? <AboutEditor settings={settings} set={set} /> : null}
          {active === "workPreview" ? <WorkPreviewEditor settings={settings} set={set} /> : null}
          {active === "stats" ? <StatsEditor settings={settings} set={set} /> : null}
          {active === "skills" ? <SkillsEditor settings={settings} set={set} /> : null}
          {active === "contact" ? <ContactEditor settings={settings} set={set} /> : null}
        </div>
      </div>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return rows ? (
    <textarea
      rows={rows}
      className={`${field} resize-none`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      className={field}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function StringList({
  label: l,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <span className={label}>{l}</span>
      <div className="mt-1.5 space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
            <input
              className={field}
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="rounded-full border border-destructive/50 p-2 text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-display text-xs"
      >
        <Plus className="size-3.5" /> Add
      </button>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: IconKey; onChange: (v: IconKey) => void }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value as IconKey)}>
      {ICON_KEYS.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}

function ObjectListEditor<
  T extends { icon: IconKey; label?: string; title?: string; copy: string },
>({ title, values, onChange }: { title: string; values: T[]; onChange: (v: T[]) => void }) {
  const setItem = (i: number, patch: Partial<T>) =>
    onChange(values.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const nameOf = (x: T) => (("label" in x && x.label) || ("title" in x && x.title) || "") as string;

  return (
    <div className="space-y-4">
      {values.map((item, i) => (
        <div key={i} className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-semibold">{nameOf(item) || `Item ${i + 1}`}</p>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="rounded-full border border-destructive/50 p-2 text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr_1fr]">
            <div>
              <span className={label}>Icon</span>
              <IconPicker
                value={item.icon}
                onChange={(v) => setItem(i, { icon: v } as Partial<T>)}
              />
            </div>
            <div>
              <span className={label}>Label</span>
              <input
                className={field}
                value={("label" in item ? item.label : item.title) ?? ""}
                onChange={(e) =>
                  setItem(i, {
                    ...("label" in item ? { label: e.target.value } : { title: e.target.value }),
                  } as Partial<T>)
                }
              />
            </div>
            <div>
              <span className={label}>Copy</span>
              <input
                className={field}
                value={item.copy}
                onChange={(e) => setItem(i, { copy: e.target.value } as Partial<T>)}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const base = values[0] ?? { icon: "audio", label: "", title: "", copy: "" };
          onChange([...values, { ...base, icon: base.icon } as T]);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 font-display text-xs"
      >
        <Plus className="size-3.5" /> Add {title}
      </button>
    </div>
  );
}

function HeroEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const h = settings.hero;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <span className={label}>Name</span>
        <TextField value={h.name} onChange={(v) => set("hero", { ...h, name: v })} />
      </div>
      <div>
        <span className={label}>Badge</span>
        <TextField value={h.badge} onChange={(v) => set("hero", { ...h, badge: v })} />
      </div>
      <div>
        <span className={label}>Title prefix</span>
        <TextField value={h.titlePrefix} onChange={(v) => set("hero", { ...h, titlePrefix: v })} />
      </div>
      <div>
        <span className={label}>Title highlight</span>
        <TextField
          value={h.titleHighlight}
          onChange={(v) => set("hero", { ...h, titleHighlight: v })}
        />
      </div>
      <div>
        <span className={label}>Title suffix</span>
        <TextField value={h.titleSuffix} onChange={(v) => set("hero", { ...h, titleSuffix: v })} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>Subtext</span>
        <TextField rows={3} value={h.subtext} onChange={(v) => set("hero", { ...h, subtext: v })} />
      </div>
      <div>
        <span className={label}>CTA label</span>
        <TextField value={h.ctaLabel} onChange={(v) => set("hero", { ...h, ctaLabel: v })} />
      </div>
      <div>
        <span className={label}>Projects note (after count)</span>
        <TextField value={h.ctaNote} onChange={(v) => set("hero", { ...h, ctaNote: v })} />
      </div>
      <div>
        <span className={label}>Discord label</span>
        <TextField
          value={h.discordLabel}
          onChange={(v) => set("hero", { ...h, discordLabel: v })}
        />
      </div>
      <div>
        <span className={label}>Discord URL</span>
        <TextField value={h.discordUrl} onChange={(v) => set("hero", { ...h, discordUrl: v })} />
      </div>
      <div className="sm:col-span-2">
        <StringList
          label="Hero stats (value · label)"
          values={h.stats.flatMap((s) => [`${s.value} · ${s.label}`])}
          onChange={(lines) =>
            set("hero", {
              ...h,
              stats: lines
                .map((line) => {
                  const [value = "", ...rest] = line.split("·");
                  return { value: value.trim(), label: rest.join("·").trim() };
                })
                .filter((s) => s.value || s.label),
            })
          }
          placeholder="2+ · SFX Projects"
        />
      </div>
    </div>
  );
}

function FeaturedEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const f = settings.featured;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <span className={label}>Badge</span>
        <TextField value={f.badge} onChange={(v) => set("featured", { ...f, badge: v })} />
      </div>
      <div>
        <span className={label}>Creator note</span>
        <TextField
          value={f.creatorNote}
          onChange={(v) => set("featured", { ...f, creatorNote: v })}
        />
      </div>
      <div className="sm:col-span-2">
        <StringList
          label="Creators (name · subs)"
          values={f.creators.map((c) => `${c.name} · ${c.subs}`)}
          onChange={(lines) =>
            set("featured", {
              ...f,
              creators: lines
                .map((line) => {
                  const [name = "", ...rest] = line.split("·");
                  return { name: name.trim(), subs: rest.join("·").trim() };
                })
                .filter((c) => c.name),
            })
          }
          placeholder="KreekCraft · 6.5M subs"
        />
      </div>
    </div>
  );
}

function AboutEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const a = settings.about;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className={label}>Heading</span>
        <TextField value={a.heading} onChange={(v) => set("about", { ...a, heading: v })} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>Body</span>
        <TextField rows={4} value={a.body} onChange={(v) => set("about", { ...a, body: v })} />
      </div>
      <div>
        <span className={label}>Badge (big letters)</span>
        <TextField value={a.badge} onChange={(v) => set("about", { ...a, badge: v })} />
      </div>
      <div>
        <span className={label}>Badge caption</span>
        <TextField value={a.badgeCopy} onChange={(v) => set("about", { ...a, badgeCopy: v })} />
      </div>
      <div>
        <span className={label}>Stat 1 (value · label)</span>
        <TextField
          value={`${a.stat1.value} · ${a.stat1.label}`}
          onChange={(v) => {
            const [value = "", ...rest] = v.split("·");
            set("about", { ...a, stat1: { value: value.trim(), label: rest.join("·").trim() } });
          }}
        />
      </div>
      <div>
        <span className={label}>Stat 2 (value · label)</span>
        <TextField
          value={`${a.stat2.value} · ${a.stat2.label}`}
          onChange={(v) => {
            const [value = "", ...rest] = v.split("·");
            set("about", { ...a, stat2: { value: value.trim(), label: rest.join("·").trim() } });
          }}
        />
      </div>
      <div className="sm:col-span-2">
        <StringList
          label="Checklist points"
          values={a.points}
          onChange={(v) => set("about", { ...a, points: v })}
        />
      </div>
    </div>
  );
}

function WorkPreviewEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const w = settings.workPreview;
  return (
    <div className="grid gap-4">
      <div>
        <span className={label}>Heading</span>
        <TextField value={w.heading} onChange={(v) => set("workPreview", { ...w, heading: v })} />
      </div>
      <div>
        <span className={label}>Copy</span>
        <TextField value={w.copy} onChange={(v) => set("workPreview", { ...w, copy: v })} />
      </div>
      <div>
        <span className={label}>CTA label</span>
        <TextField value={w.ctaLabel} onChange={(v) => set("workPreview", { ...w, ctaLabel: v })} />
      </div>
    </div>
  );
}

function StatsEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const items = settings.stats.items;
  return (
    <div className="space-y-4">
      {items.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Stat {i + 1}</p>
            <button
              type="button"
              onClick={() => set("stats", { items: items.filter((_, j) => j !== i) })}
              className="rounded-full border border-destructive/50 p-2 text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr_1fr]">
            <div>
              <span className={label}>Icon</span>
              <IconPicker
                value={s.icon}
                onChange={(v) =>
                  set("stats", { items: items.map((x, j) => (j === i ? { ...x, icon: v } : x)) })
                }
              />
            </div>
            <div>
              <span className={label}>Value</span>
              <input
                className={field}
                value={s.value}
                onChange={(e) =>
                  set("stats", {
                    items: items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                  })
                }
              />
            </div>
            <div>
              <span className={label}>Label</span>
              <input
                className={field}
                value={s.label}
                onChange={(e) =>
                  set("stats", {
                    items: items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set("stats", { items: [...items, { icon: "star", value: "", label: "" }] })}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 font-display text-xs"
      >
        <Plus className="size-3.5" /> Add stat
      </button>
    </div>
  );
}

function SkillsEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const s = settings.skills;
  return (
    <div className="grid gap-4">
      <div>
        <span className={label}>Heading</span>
        <TextField value={s.heading} onChange={(v) => set("skills", { ...s, heading: v })} />
      </div>
      <StringList
        label="Skills"
        values={s.items}
        onChange={(v) => set("skills", { ...s, items: v })}
      />
      <div>
        <span className={label}>“Currently working on” heading</span>
        <TextField
          value={s.currentlyHeading}
          onChange={(v) => set("skills", { ...s, currentlyHeading: v })}
        />
      </div>
      <div>
        <span className={label}>Currently working on</span>
        <TextField
          rows={3}
          value={s.currently}
          onChange={(v) => set("skills", { ...s, currently: v })}
        />
      </div>
    </div>
  );
}

function ContactEditor({
  settings,
  set,
}: {
  settings: SiteSettings;
  set: <K extends SectionKey>(k: K, v: SiteSettings[K]) => void;
}) {
  const c = settings.contact;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className={label}>Heading</span>
        <TextField value={c.heading} onChange={(v) => set("contact", { ...c, heading: v })} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>Body</span>
        <TextField rows={3} value={c.body} onChange={(v) => set("contact", { ...c, body: v })} />
      </div>
      <div>
        <span className={label}>Discord label</span>
        <TextField
          value={c.discordLabel}
          onChange={(v) => set("contact", { ...c, discordLabel: v })}
        />
      </div>
      <div>
        <span className={label}>Discord URL</span>
        <TextField value={c.discordUrl} onChange={(v) => set("contact", { ...c, discordUrl: v })} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>Discord note</span>
        <TextField
          value={c.discordNote}
          onChange={(v) => set("contact", { ...c, discordNote: v })}
        />
      </div>
      <div>
        <span className={label}>Email</span>
        <TextField value={c.email} onChange={(v) => set("contact", { ...c, email: v })} />
      </div>
      <div>
        <span className={label}>Email note</span>
        <TextField value={c.emailNote} onChange={(v) => set("contact", { ...c, emailNote: v })} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>Reply note</span>
        <TextField value={c.replyNote} onChange={(v) => set("contact", { ...c, replyNote: v })} />
      </div>
    </div>
  );
}
