import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Bell, PlayCircle, KeyRound, Flame, Sparkles,
  TrendingUp, Award, ChevronRight, Loader2, Gamepad2, Target, CheckCircle2,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ClassRush" },
      { name: "description", content: "Votre tableau de bord ClassRush." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, user } = useAuth();

  const { data: popularQuizzes } = useQuery({
    queryKey: ["popular-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, category, plays_count")
        .eq("is_public", true)
        .order("plays_count", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [played, answers, quizzes, friends] = await Promise.all([
        supabase.from("room_players").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("player_answers").select("is_correct").eq("user_id", user!.id),
        supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("creator_id", user!.id),
        supabase.from("friendships").select("id", { count: "exact", head: true })
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`).eq("status", "accepted"),
      ]);
      const total = answers.data?.length ?? 0;
      const correct = answers.data?.filter((a) => a.is_correct).length ?? 0;
      return {
        gamesPlayed: played.count ?? 0,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        quizzesCreated: quizzes.count ?? 0,
        friendsCount: friends.count ?? 0,
      };
    },
  });

  const initial = (profile?.display_name || profile?.username || "?")[0].toUpperCase();
  const displayName = profile?.display_name || profile?.username || "Joueur";

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />

      <main className="flex-1 min-w-0">
        <TopBar coins={profile?.coins ?? 0} initial={initial} />
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
          <Greeting name={displayName} level={profile?.level ?? 1} xp={profile?.xp ?? 0} />
          <StatsRow stats={stats} />
          <PlayCards />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PopularQuizzes quizzes={popularQuizzes} />
              <FriendCodeCard code={profile?.friend_code} />
            </div>
            <div className="space-y-6">
              <ProfileCard profile={profile} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatsRow({ stats }: { stats: { gamesPlayed: number; accuracy: number; quizzesCreated: number; friendsCount: number } | undefined }) {
  const items = [
    { icon: Gamepad2, label: "Parties jouées", value: stats?.gamesPlayed ?? 0, color: "text-primary bg-primary/10" },
    { icon: Target, label: "Précision", value: `${stats?.accuracy ?? 0}%`, color: "text-success bg-success/10" },
    { icon: CheckCircle2, label: "Quiz créés", value: stats?.quizzesCreated ?? 0, color: "text-warning bg-warning/10" },
    { icon: Users, label: "Amis", value: stats?.friendsCount ?? 0, color: "text-destructive bg-destructive/10" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="p-4 bg-card border border-border/60 rounded-2xl shadow-soft flex items-center gap-3">
          <div className={`size-10 rounded-xl grid place-items-center ${it.color}`}>
            <it.icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">{it.label}</div>
            <div className="font-display font-bold text-lg tabular-nums">{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopBar({ coins, initial }: { coins: number; initial: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border/60">
      <div className="px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="lg:hidden"><Logo /></div>
        <div className="hidden lg:flex items-center gap-3 max-w-md flex-1">
          <input
            type="search"
            placeholder="Rechercher un quiz, un ami…"
            className="w-full h-10 px-4 bg-card border border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-full bg-warning/10 text-warning text-sm font-bold">
            <Sparkles className="size-3.5" />
            {coins.toLocaleString("fr-FR")}
          </div>
          <button className="size-10 grid place-items-center rounded-full bg-card border border-border hover:bg-muted btn-press">
            <Bell className="size-4" />
          </button>
          <div className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}

function Greeting({ name, level, xp }: { name: string; level: number; xp: number }) {
  const xpForNext = level * 1000;
  const progress = Math.min(100, Math.round((xp / xpForNext) * 100));
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Salut {name} 👋</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
          Prêt à apprendre en jouant ?
        </h1>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-2xl shadow-soft">
        <div className="size-10 rounded-2xl bg-warning/15 text-warning grid place-items-center">
          <Flame className="size-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">XP</div>
          <div className="font-display font-bold tabular-nums">{xp.toLocaleString("fr-FR")}</div>
        </div>
        <div className="w-px h-10 bg-border mx-2" />
        <div>
          <div className="text-xs text-muted-foreground">Niveau</div>
          <div className="font-display font-bold flex items-center gap-2">
            {level}
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayCards() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const handleJoin = () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) { toast.error("Code à 6 caractères requis"); return; }
    navigate({ to: "/join", search: { code: c } });
  };
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Link
        to="/play"
        className="group relative overflow-hidden text-left p-8 bg-primary text-primary-foreground rounded-3xl shadow-glow btn-press"
      >
        <div className="absolute -top-12 -right-12 size-44 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative">
          <div className="size-14 rounded-2xl bg-primary-foreground/15 grid place-items-center mb-5">
            <PlayCircle className="size-7" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">Créer une partie</h3>
          <p className="text-primary-foreground/85 text-sm mb-5">
            Choisissez un quiz, lancez une room et invitez vos amis en un clic.
          </p>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
            Commencer <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>

      <div className="p-8 bg-card border border-border/60 rounded-3xl shadow-soft">
        <div className="size-14 rounded-2xl bg-warning/15 text-warning grid place-items-center mb-5">
          <KeyRound className="size-7" />
        </div>
        <h3 className="font-display text-2xl font-bold mb-2">Rejoindre une partie</h3>
        <p className="text-muted-foreground text-sm mb-5">
          Entrez le code à 6 caractères partagé par votre ami ou votre prof.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="flex-1 h-12 px-4 bg-background border-2 border-border rounded-2xl font-mono font-bold tracking-widest uppercase outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleJoin}
            className="h-12 px-5 bg-foreground text-background rounded-2xl font-semibold text-sm btn-press"
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}

type QuizRow = { id: string; title: string; category: string | null; plays_count: number };

function PopularQuizzes({ quizzes }: { quizzes: QuizRow[] | undefined }) {
  return (
    <section>
      <SectionTitle title="Quiz populaires" subtitle="Les plus joués" icon={TrendingUp} />
      {!quizzes ? (
        <div className="h-32 grid place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : quizzes.length === 0 ? (
        <div className="p-8 bg-card border border-dashed border-border rounded-2xl text-center text-sm text-muted-foreground">
          Aucun quiz public pour l'instant. Sois le premier à en créer un !
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <div key={q.id} className="group text-left p-5 bg-card border border-border/60 rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all">
              <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4 font-bold">
                {(q.category ?? "?")[0].toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                {q.category ?? "Général"}
              </div>
              <div className="font-display font-bold mb-3">{q.title}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{q.plays_count} parties</span>
                <ChevronRight className="size-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FriendCodeCard({ code }: { code: string | undefined }) {
  return (
    <section>
      <SectionTitle title="Ton code ami" subtitle="Partage-le pour ajouter des amis" icon={Users} />
      <div className="p-6 bg-card border border-border/60 rounded-2xl flex items-center justify-between gap-4">
        <div className="font-mono font-bold text-2xl tracking-widest">{code ?? "—"}</div>
        <button
          onClick={() => {
            if (!code) return;
            navigator.clipboard.writeText(code);
            toast.success("Copié !");
          }}
          className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold btn-press"
        >
          Copier
        </button>
      </div>
    </section>
  );
}

function ProfileCard({ profile }: { profile: { username: string; display_name: string | null; level: number; xp: number; coins: number } | null }) {
  return (
    <section>
      <SectionTitle title="Ton profil" subtitle="Aperçu rapide" icon={Award} />
      <div className="p-5 bg-card border border-border/60 rounded-2xl space-y-4">
        <Stat label="Pseudo" value={profile?.username ?? "—"} />
        <Stat label="Nom affiché" value={profile?.display_name ?? "—"} />
        <Stat label="Niveau" value={String(profile?.level ?? 1)} />
        <Stat label="XP" value={(profile?.xp ?? 0).toLocaleString("fr-FR")} />
        <Stat label="Pièces" value={(profile?.coins ?? 0).toLocaleString("fr-FR")} />
        <Link to="/dashboard" className="block text-center text-xs text-primary font-semibold hover:underline">
          Modifier mon profil →
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SectionTitle({
  title, subtitle, icon: Icon,
}: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="font-display font-bold text-lg leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
