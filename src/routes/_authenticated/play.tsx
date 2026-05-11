import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PlayCircle, Loader2, BookOpen, Search, Zap, Skull, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play")({
  head: () => ({ meta: [{ title: "Jouer — ClassRush" }] }),
  component: PlayPage,
});

type PlayQuiz = {
  id: string; title: string; category: string | null; difficulty: string;
  plays_count: number; question_count: number;
};

type GameMode = "classic" | "survival" | "speedrun";

const MODES: { value: GameMode; label: string; description: string; icon: typeof PlayCircle; accent: string }[] = [
  { value: "classic", label: "Classic", description: "Score basé sur la vitesse et la précision.", icon: Trophy, accent: "text-primary bg-primary/10 border-primary" },
  { value: "survival", label: "Survival", description: "Une mauvaise réponse et tu es éliminé !", icon: Skull, accent: "text-destructive bg-destructive/10 border-destructive" },
  { value: "speedrun", label: "Speedrun", description: "Bonus de vitesse maximal sur chaque question.", icon: Zap, accent: "text-warning bg-warning/10 border-warning" },
];

function PlayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [mode, setMode] = useState<GameMode>("classic");

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["play-quizzes", tab, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from("quizzes")
        .select("id, title, category, difficulty, plays_count, questions(count)")
        .order("plays_count", { ascending: false })
        .limit(40);
      if (tab === "mine") q = q.eq("creator_id", user!.id);
      else q = q.eq("is_public", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id, title: row.title, category: row.category, difficulty: row.difficulty,
        plays_count: row.plays_count,
        question_count: (row.questions as unknown as { count: number }[])[0]?.count ?? 0,
      })) as PlayQuiz[];
    },
  });

  const handleStart = async (quizId: string) => {
    if (!user) return;
    setCreating(quizId);
    try {
      // Verify quiz has at least one question
      const { count } = await supabase
        .from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
      if (!count) {
        toast.error("Ce quiz n'a pas encore de questions");
        return;
      }
      const { data, error } = await supabase
        .from("rooms")
        .insert({ host_id: user.id, quiz_id: quizId, mode })
        .select("id, code")
        .single();
      if (error) throw error;
      // Auto-join host as a player
      await supabase.from("room_players").insert({ room_id: data.id, user_id: user.id, is_ready: true });
      toast.success(`Salle créée : ${data.code}`);
      navigate({ to: "/room/$code", params: { code: data.code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(null);
    }
  };

  return (
    <PageShell>
      <PageHeader subtitle="Catalogue" title="Jouer" actions={
        <button
          onClick={() => navigate({ to: "/join" })}
          className="inline-flex items-center gap-2 h-11 px-5 bg-card border border-border rounded-2xl text-sm font-semibold btn-press hover:border-primary"
        >
          <Search className="size-4" /> Rejoindre avec un code
        </button>
      } />

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mode de jeu</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {MODES.map((m) => {
              const active = mode === m.value;
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    active ? m.accent : "bg-card border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="size-5" />
                    <span className="font-display font-bold">{m.label}</span>
                  </div>
                  <p className={`text-xs ${active ? "opacity-90" : "text-muted-foreground"}`}>{m.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="inline-flex bg-card border border-border rounded-2xl p-1 mb-6">
          {(["all", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 h-9 rounded-xl text-sm font-semibold ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "Quiz publics" : "Mes quiz"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid place-items-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : !quizzes?.length ? (
          <div className="p-12 bg-card border border-dashed border-border rounded-3xl text-center">
            <p className="text-sm text-muted-foreground">Aucun quiz disponible. Créez le vôtre depuis "Mes quiz".</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((q) => (
              <article key={q.id} className="p-5 bg-card border border-border/60 rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <BookOpen className="size-5" />
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{q.difficulty}</span>
                </div>
                <h3 className="font-display font-bold mb-1 truncate">{q.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {q.category ?? "Général"} · {q.question_count} question{q.question_count > 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => handleStart(q.id)}
                  disabled={creating === q.id || q.question_count === 0}
                  className="w-full h-10 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
                >
                  {creating === q.id ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                  Lancer une partie
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
