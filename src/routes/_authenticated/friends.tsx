import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Copy, UserPlus, Check, X, Loader2, Users, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Amis — ClassRush" }] }),
  component: FriendsPage,
});

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
};

type ProfileLite = {
  id: string; username: string; display_name: string | null; friend_code: string; level: number;
};

function FriendsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["friendships", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const friendships = (rows ?? []) as Friendship[];
      const ids = new Set<string>();
      friendships.forEach((f) => {
        ids.add(f.requester_id);
        ids.add(f.addressee_id);
      });
      ids.delete(user!.id);
      let profiles: Record<string, ProfileLite> = {};
      if (ids.size) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, friend_code, level")
          .in("id", [...ids]);
        (profs ?? []).forEach((p) => { profiles[p.id] = p as ProfileLite; });
      }
      return { friendships, profiles };
    },
  });

  // Realtime: refresh on change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`friendships-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" },
        () => queryClient.invalidateQueries({ queryKey: ["friendships", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  const myCode = profile?.friend_code ?? "—";
  const friendships = data?.friendships ?? [];
  const profiles = data?.profiles ?? {};

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === user?.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === user?.id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const c = code.trim().toUpperCase();
    if (c.length < 4) { toast.error("Code invalide"); return; }
    if (c === myCode) { toast.error("C'est ton propre code !"); return; }
    setAdding(true);
    try {
      const { data: target, error: targetErr } = await supabase
        .from("profiles").select("id, username").eq("friend_code", c).maybeSingle();
      if (targetErr) throw targetErr;
      if (!target) { toast.error("Aucun joueur avec ce code"); return; }
      // Vérifie une éventuelle relation existante (les deux directions)
      const { data: existing, error: exErr } = await supabase
        .from("friendships")
        .select("id, status, requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},requester_id.eq.${target.id}`)
        .or(`addressee_id.eq.${user.id},addressee_id.eq.${target.id}`);
      if (exErr) throw exErr;
      const match = (existing ?? []).find(
        (f) =>
          (f.requester_id === user.id && f.addressee_id === target.id) ||
          (f.requester_id === target.id && f.addressee_id === user.id)
      );
      if (match) {
        toast.error(match.status === "accepted" ? "Vous êtes déjà amis" : "Demande déjà existante");
        return;
      }
      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: user.id, addressee_id: target.id, status: "pending" });
      if (error) throw error;
      toast.success(`Demande envoyée à ${target.username}`);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["friendships", user.id] });
    } catch (err) {
      console.error("Add friend error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAdding(false);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      toast.success("Ami ajouté !");
    } else {
      await supabase.from("friendships").delete().eq("id", id);
      toast.success("Demande refusée");
    }
    queryClient.invalidateQueries({ queryKey: ["friendships", user?.id] });
  };

  const removeFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.success("Ami supprimé");
    queryClient.invalidateQueries({ queryKey: ["friendships", user?.id] });
  };

  return (
    <PageShell>
      <PageHeader subtitle="Réseau" title="Amis" />
      <div className="max-w-3xl mx-auto space-y-6">
        <section className="p-6 bg-card border border-border/60 rounded-2xl">
          <h2 className="font-display font-bold mb-1">Ton code ami</h2>
          <p className="text-xs text-muted-foreground mb-4">Partage ce code pour que tes amis t'ajoutent.</p>
          <div className="flex items-center justify-between gap-3 p-4 bg-background border border-border rounded-xl">
            <span className="font-mono font-bold text-2xl tracking-widest">{myCode}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(myCode); toast.success("Copié !"); }}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold btn-press"
            >
              <Copy className="size-3.5" /> Copier
            </button>
          </div>
        </section>

        <section className="p-6 bg-card border border-border/60 rounded-2xl">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> Ajouter un ami
          </h2>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
              placeholder="Code ami"
              className="flex-1 h-11 px-4 bg-background border border-border rounded-xl text-sm font-mono tracking-wider outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={adding || code.length < 4}
              className="h-11 px-5 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
            >
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Envoyer
            </button>
          </form>
        </section>

        {incoming.length > 0 && (
          <section className="p-6 bg-card border border-border/60 rounded-2xl">
            <h2 className="font-display font-bold mb-3">Demandes reçues ({incoming.length})</h2>
            <div className="space-y-2">
              {incoming.map((f) => {
                const p = profiles[f.requester_id];
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
                    <Avatar name={p?.display_name || p?.username || "?"} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p?.display_name || p?.username}</div>
                      <div className="text-xs text-muted-foreground">@{p?.username} · Niv. {p?.level}</div>
                    </div>
                    <button onClick={() => respond(f.id, true)}
                      className="size-9 grid place-items-center bg-success text-white rounded-lg btn-press" aria-label="Accepter">
                      <Check className="size-4" />
                    </button>
                    <button onClick={() => respond(f.id, false)}
                      className="size-9 grid place-items-center bg-muted text-muted-foreground rounded-lg btn-press hover:bg-destructive/10 hover:text-destructive" aria-label="Refuser">
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="p-6 bg-card border border-border/60 rounded-2xl">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2">
            <Users className="size-4 text-primary" /> Mes amis ({accepted.length})
          </h2>
          {isLoading ? (
            <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
          ) : accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun ami pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {accepted.map((f) => {
                const otherId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                const p = profiles[otherId];
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
                    <Avatar name={p?.display_name || p?.username || "?"} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p?.display_name || p?.username}</div>
                      <div className="text-xs text-muted-foreground">@{p?.username} · Niv. {p?.level}</div>
                    </div>
                    <button onClick={() => removeFriend(f.id)}
                      className="text-xs text-muted-foreground hover:text-destructive font-semibold px-3 h-8">Retirer</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {outgoing.length > 0 && (
          <section className="p-6 bg-card border border-dashed border-border rounded-2xl">
            <h2 className="font-display font-bold mb-3 text-sm">Demandes en attente ({outgoing.length})</h2>
            <div className="space-y-2">
              {outgoing.map((f) => {
                const p = profiles[f.addressee_id];
                return (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">→</span>
                    <span className="flex-1 truncate">@{p?.username}</span>
                    <button onClick={() => removeFriend(f.id)} className="text-xs text-muted-foreground hover:text-destructive">Annuler</button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="size-10 rounded-full bg-primary/15 text-primary grid place-items-center font-bold">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}