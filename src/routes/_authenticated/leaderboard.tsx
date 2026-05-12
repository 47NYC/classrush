import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell, PageHeader } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Trophy, Crown, Medal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Classement global — ClassRush" }] }),
  component: LeaderboardPage,
});

type Row = { id: string; username: string; display_name: string | null; level: number; xp: number };

function LeaderboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["global-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, level, xp")
        .order("xp", { ascending: false })
        .limit(50);
      return (data ?? []) as Row[];
    },
  });

  return (
    <PageShell>
      <PageHeader subtitle="Compétition" title="Classement global" />
      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="grid place-items-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-card border border-border/60 rounded-3xl divide-y divide-border/60 overflow-hidden">
            {(data ?? []).map((p, idx) => {
              const isMe = p.id === user?.id;
              const name = p.display_name || p.username;
              const medal = idx === 0 ? <Crown className="size-4 text-warning" /> : idx === 1 ? <Medal className="size-4 text-muted-foreground" /> : idx === 2 ? <Medal className="size-4 text-warning/70" /> : null;
              return (
                <div key={p.id} className={`flex items-center gap-3 p-4 ${isMe ? "bg-primary/5" : ""}`}>
                  <span className="w-8 text-center font-display font-bold text-muted-foreground tabular-nums">#{idx + 1}</span>
                  <div className="size-10 rounded-full bg-primary/15 text-primary grid place-items-center font-bold">
                    {name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {name} {medal}
                      {isMe && <span className="text-xs text-primary">(toi)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">Niveau {p.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold tabular-nums">{p.xp.toLocaleString("fr-FR")}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
                  </div>
                </div>
              );
            })}
            {(!data || !data.length) && (
              <p className="p-8 text-center text-sm text-muted-foreground">Personne au classement pour l'instant.</p>
            )}
          </div>
        )}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="size-3.5 text-warning" /> Le classement est calculé sur ton XP cumulé.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
