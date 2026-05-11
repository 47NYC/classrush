import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil — ClassRush" }] }),
  component: ProfilePage,
});

const schema = z.object({
  display_name: z.string().trim().min(1, "Le nom ne peut pas être vide").max(40, "Maximum 40 caractères"),
});

function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const parsed = schema.safeParse({ display_name: displayName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.display_name })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil mis à jour");
    refreshProfile();
  };

  if (!profile) return <PageShell><div className="grid place-items-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div></PageShell>;

  const initial = (profile.display_name || profile.username)[0].toUpperCase();

  return (
    <PageShell>
      <PageHeader subtitle="Compte" title="Profil" />
      <div className="max-w-2xl mx-auto space-y-6">
        <section className="p-6 bg-card border border-border/60 rounded-2xl flex items-center gap-5">
          <div className="size-20 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-3xl font-bold">
            {initial}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{profile.display_name || profile.username}</h2>
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="px-2 h-6 inline-flex items-center rounded-full bg-primary/10 text-primary font-semibold">Niveau {profile.level}</span>
              <span className="px-2 h-6 inline-flex items-center rounded-full bg-warning/10 text-warning font-semibold">{profile.xp.toLocaleString("fr-FR")} XP</span>
              <span className="px-2 h-6 inline-flex items-center rounded-full bg-success/10 text-success font-semibold">{profile.coins.toLocaleString("fr-FR")} pièces</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSave} className="p-6 bg-card border border-border/60 rounded-2xl space-y-4">
          <h3 className="font-display font-bold">Informations</h3>
          <label className="block">
            <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">Nom affiché</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <Stat label="Pseudo" value={profile.username} />
            <Stat label="Code ami" value={profile.friend_code} mono />
            <Stat label="Code parrainage" value={profile.referral_code} mono />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer
          </button>
        </form>
      </div>
    </PageShell>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-semibold ${mono ? "font-mono tracking-wider" : ""}`}>{value}</div>
    </div>
  );
}
