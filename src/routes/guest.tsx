import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Loader2, ArrowRight, UserCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/guest")({
  head: () => ({ meta: [{ title: "Jouer en invité — ClassRush" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code.toUpperCase().slice(0, 6) : undefined,
  }),
  component: GuestJoinPage,
});

function GuestJoinPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState(search.code ?? "");
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    const name = pseudo.trim().slice(0, 20);
    if (normalized.length !== 6) { toast.error("Le code doit contenir 6 caractères"); return; }
    if (name.length < 2) { toast.error("Choisis un pseudo (2 caractères min)"); return; }

    setLoading(true);
    try {
      // 1. Vérifier la salle d'abord (en lecture publique via RLS rooms_select_all : authenticated)
      // Comme la salle nécessite auth pour être lue, on signe en anonyme d'abord.
      const { data: existingSession } = await supabase.auth.getSession();
      if (!existingSession.session) {
        const { error: signErr } = await supabase.auth.signInAnonymously({
          options: { data: { username: name, display_name: name } },
        });
        if (signErr) throw signErr;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Connexion invité impossible");

      // Met à jour le display_name si l'utilisateur existait déjà (anonyme persistant)
      await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);

      const { data: room, error } = await supabase
        .from("rooms")
        .select("id, code, status, max_players")
        .eq("code", normalized)
        .maybeSingle();
      if (error) throw error;
      if (!room) { toast.error("Code introuvable"); return; }
      if (room.status === "finished") { toast.error("Cette partie est terminée"); return; }

      const { data: existing } = await supabase
        .from("room_players").select("id").eq("room_id", room.id).eq("user_id", user.id).maybeSingle();
      if (!existing) {
        if (room.status !== "lobby") { toast.error("La partie a déjà commencé"); return; }
        const { count } = await supabase
          .from("room_players").select("id", { count: "exact", head: true }).eq("room_id", room.id);
        if ((count ?? 0) >= room.max_players) { toast.error("La partie est pleine"); return; }
        const { error: joinErr } = await supabase
          .from("room_players").insert({ room_id: room.id, user_id: user.id });
        if (joinErr) throw joinErr;
      }
      navigate({ to: "/room/$code", params: { code: room.code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="size-16 mx-auto rounded-2xl bg-warning/15 text-warning grid place-items-center mb-4">
            <KeyRound className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Rejoindre en invité</h1>
          <p className="text-sm text-muted-foreground">Entre un pseudo et le code de la partie. Pas besoin de compte.</p>
        </div>

        <form onSubmit={handleJoin} className="p-6 bg-card border border-border/60 rounded-3xl shadow-soft space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <UserCircle2 className="size-3.5" /> Pseudo
            </span>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value.slice(0, 20))}
              placeholder="Ton nom"
              className="w-full h-12 px-4 bg-background border border-border rounded-xl outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">Code de la partie</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="ABC123"
              className="w-full h-14 text-center font-mono font-bold text-2xl tracking-[0.4em] bg-background border-2 border-border rounded-xl outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={loading || code.length !== 6 || pseudo.trim().length < 2}
            className="w-full h-12 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : (<>Rejoindre <ArrowRight className="size-4" /></>)}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tu veux sauvegarder ta progression ? <Link to="/auth" className="text-primary font-semibold">Crée un compte</Link>
        </p>
      </div>
    </div>
  );
}
