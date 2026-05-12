import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({ meta: [{ title: "Rejoindre une partie — ClassRush" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code.toUpperCase().slice(0, 6) : undefined,
  }),
  component: JoinPage,
});

function JoinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState(search.code ?? "");
  const [loading, setLoading] = useState(false);

  // Auto-submit if code arrives via URL
  useEffect(() => {
    if (search.code && search.code.length === 6 && !loading) {
      // Defer to allow render
      const t = setTimeout(() => {
        const form = document.getElementById("join-form") as HTMLFormElement | null;
        form?.requestSubmit();
      }, 50);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      toast.error("Le code doit contenir 6 caractères");
      return;
    }
    setLoading(true);
    try {
      const { data: room, error } = await supabase
        .from("rooms")
        .select("id, code, status, max_players")
        .eq("code", normalized)
        .maybeSingle();
      if (error) throw error;
      if (!room) {
        toast.error("Code introuvable");
        return;
      }
      if (room.status === "finished" || room.status === "cancelled") {
        toast.error("Cette partie est terminée");
        return;
      }
      // Count current players
      const { count } = await supabase
        .from("room_players").select("id", { count: "exact", head: true }).eq("room_id", room.id);
      const { data: existing } = await supabase
        .from("room_players").select("id").eq("room_id", room.id).eq("user_id", user.id).maybeSingle();
      if (!existing) {
        if ((count ?? 0) >= room.max_players) {
          toast.error("La partie est pleine");
          return;
        }
        if (room.status !== "lobby") {
          toast.error("La partie a déjà commencé");
          return;
        }
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
    <PageShell>
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="size-16 mx-auto rounded-2xl bg-warning/15 text-warning grid place-items-center mb-4">
            <KeyRound className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Rejoindre une partie</h1>
          <p className="text-sm text-muted-foreground">Entrez le code à 6 caractères partagé par l'hôte.</p>
        </div>

        <form id="join-form" onSubmit={handleJoin} className="p-6 bg-card border border-border/60 rounded-3xl shadow-soft space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            maxLength={6}
            autoFocus
            placeholder="ABC123"
            className="w-full h-16 text-center font-mono font-bold text-3xl tracking-[0.5em] bg-background border-2 border-border rounded-2xl outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-12 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : (
              <>Rejoindre <ArrowRight className="size-4" /></>
            )}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
