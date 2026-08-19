import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderOpen, LogOut, MessageSquareQuote, Settings2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/works.functions";
import { WorksAdmin } from "@/components/admin/WorksAdmin";
import { TestimonialsAdmin } from "@/components/admin/TestimonialsAdmin";
import { ContentAdmin } from "@/components/admin/ContentAdmin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ZYN portfolio editor" },
      { name: "description", content: "Edit works, testimonials and site content." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — ZYN portfolio editor" },
      { property: "og:description", content: "Edit works, testimonials and site content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tab = "works" | "testimonials" | "content";

const TABS: { key: Tab; label: string; icon: typeof FolderOpen }[] = [
  { key: "works", label: "Works", icon: FolderOpen },
  { key: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { key: "content", label: "Site content", icon: Settings2 },
];

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const admin = useServerFn(isAdmin);
  const [tab, setTab] = useState<Tab>("works");

  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: () => admin() });

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    await navigate({ to: "/auth" });
  };

  if (adminQuery.isSuccess && adminQuery.data === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="glass-card max-w-sm rounded-2xl p-8">
          <h1 className="font-display text-xl font-bold">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account isn&apos;t an admin, so it can&apos;t edit the site.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin</h1>
            <p className="text-sm text-muted-foreground">Edits go live on the site instantly.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/work"
              className="glass-card rounded-full px-4 py-2.5 font-display text-sm hover:bg-secondary/50"
            >
              View site
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 font-display text-sm hover:bg-secondary/50"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </header>

        <nav className="mt-8 flex gap-2 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "glass-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "works" ? <WorksAdmin /> : null}
        {tab === "testimonials" ? <TestimonialsAdmin /> : null}
        {tab === "content" ? <ContentAdmin /> : null}
      </div>
    </div>
  );
}
