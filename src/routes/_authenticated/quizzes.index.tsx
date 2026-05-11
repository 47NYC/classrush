import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, BookOpen, Pencil, Trash2, Loader2, Globe, Lock, Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/quizzes/")({
  head: () => ({
    meta: [
      { title: "Mes quiz — ClassRush" },
      { name: "description", content: "Créez et gérez vos quiz ClassRush." },
    ],
  }),
  component: QuizzesPage,
});

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string;
  is_public: boolean;
  plays_count: number;
  updated_at: string;
};

function QuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["my-quizzes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, description, category, difficulty, is_public, plays_count, updated_at")
        .eq("creator_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quiz[];
    },
  });

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          creator_id: user.id,
          title: "Nouveau quiz",
          description: "",
          difficulty: "medium",
          is_public: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Quiz créé");
      navigate({ to: "/quizzes/$quizId", params: { quizId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce quiz ?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Supprimé");
    queryClient.invalidateQueries({ queryKey: ["my-quizzes"] });
  };

  const filtered = (quizzes ?? []).filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-muted-foreground">Bibliothèque</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">Mes quiz</h1>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 h-12 px-5 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press disabled:opacity-60"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Créer un quiz
            </button>
          </div>

          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un quiz…"
              className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-2xl text-sm outline-none focus:border-primary"
            />
          </div>

          {isLoading ? (
            <div className="grid place-items-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={handleCreate} hasSearch={search.length > 0} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((q) => (
                <article
                  key={q.id}
                  className="group relative p-5 bg-card border border-border/60 rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <BookOpen className="size-5" />
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs font-semibold ${
                      q.is_public ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {q.is_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
                      {q.is_public ? "Public" : "Privé"}
                    </span>
                  </div>
                  <h3 className="font-display font-bold mb-1 truncate">{q.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                    {q.description || "Aucune description"}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{q.difficulty}</span>
                    <span>{q.plays_count} parties</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/quizzes/$quizId"
                      params={{ quizId: q.id }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 bg-primary text-primary-foreground rounded-xl text-xs font-semibold btn-press"
                    >
                      <Pencil className="size-3.5" /> Éditer
                    </Link>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="size-9 grid place-items-center bg-destructive/10 text-destructive rounded-xl btn-press hover:bg-destructive/20"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onCreate, hasSearch }: { onCreate: () => void; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="p-12 bg-card border border-dashed border-border rounded-2xl text-center text-sm text-muted-foreground">
        Aucun quiz ne correspond à votre recherche.
      </div>
    );
  }
  return (
    <div className="p-12 bg-card border border-dashed border-border rounded-2xl text-center">
      <div className="size-14 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
        <BookOpen className="size-7" />
      </div>
      <h3 className="font-display text-xl font-bold mb-2">Créez votre premier quiz</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Ajoutez des questions, configurez les réponses et lancez une partie en quelques secondes.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 h-11 px-5 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press"
      >
        <Plus className="size-4" /> Créer un quiz
      </button>
    </div>
  );
}
