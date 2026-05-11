import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import {
  Home, Gamepad2, BookOpen, Users, Trophy, Target, ShoppingBag,
  User, Settings, Bell, PlayCircle, KeyRound, Flame, Sparkles,
  TrendingUp, Award, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ClassRush" },
      { name: "description", content: "Votre tableau de bord ClassRush : parties, quiz, amis, défis." },
    ],
  }),
  component: Dashboard,
});

const navItems = [
  { icon: Home, label: "Accueil", active: true },
  { icon: Gamepad2, label: "Jouer" },
  { icon: BookOpen, label: "Mes quiz" },
  { icon: Users, label: "Amis" },
  { icon: Trophy, label: "Tournois" },
  { icon: Target, label: "Défis" },
  { icon: ShoppingBag, label: "Boutique" },
  { icon: User, label: "Profil" },
  { icon: Settings, label: "Paramètres" },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border/60 p-6 sticky top-0 h-screen">
        <Logo />
        <nav className="mt-10 flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3.5 h-11 rounded-2xl text-sm font-medium transition-all ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4" />
            <span className="font-bold text-sm">Premium</span>
          </div>
          <p className="text-xs text-primary-foreground/80 mb-3">
            Quiz illimités, classes & avatars exclusifs.
          </p>
          <button className="w-full h-9 bg-primary-foreground text-primary rounded-xl text-xs font-bold btn-press">
            Découvrir
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <TopBar />
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
          <Greeting />
          <PlayCards />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PopularQuizzes />
              <DailyChallenges />
            </div>
            <div className="space-y-6">
              <FriendsOnline />
              <RecentBadges />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
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
            1 280
          </div>
          <button className="size-10 grid place-items-center rounded-full bg-card border border-border hover:bg-muted btn-press relative">
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>
          <Link
            to="/"
            className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm btn-press"
          >
            L
          </Link>
        </div>
      </div>
    </header>
  );
}

function Greeting() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Salut Lucas 👋</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
          Prêt à apprendre en jouant ?
        </h1>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-2xl shadow-soft">
        <div className="size-10 rounded-2xl bg-warning/15 text-warning grid place-items-center">
          <Flame className="size-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Streak quotidien</div>
          <div className="font-display font-bold">7 jours</div>
        </div>
        <div className="w-px h-10 bg-border mx-2" />
        <div>
          <div className="text-xs text-muted-foreground">Niveau</div>
          <div className="font-display font-bold flex items-center gap-2">
            12
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="w-2/3 h-full bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayCards() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <button className="group relative overflow-hidden text-left p-8 bg-primary text-primary-foreground rounded-3xl shadow-glow btn-press">
        <div className="absolute -top-12 -right-12 size-44 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative">
          <div className="size-14 rounded-2xl bg-primary-foreground/15 grid place-items-center mb-5">
            <PlayCircle className="size-7" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">Créer une partie</h3>
          <p className="text-primary-foreground/85 text-sm mb-5">
            Lancez une room, choisissez un mode et invitez vos amis en un clic.
          </p>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
            Commencer <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>

      <div className="p-8 bg-card border border-border/60 rounded-3xl shadow-soft">
        <div className="size-14 rounded-2xl bg-warning/15 text-warning grid place-items-center mb-5">
          <KeyRound className="size-7" />
        </div>
        <h3 className="font-display text-2xl font-bold mb-2">Rejoindre une partie</h3>
        <p className="text-muted-foreground text-sm mb-5">
          Entrez le code à 6 chiffres partagé par votre ami ou votre prof.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            placeholder="ABC123"
            className="flex-1 h-12 px-4 bg-background border-2 border-border rounded-2xl font-mono font-bold tracking-widest uppercase outline-none focus:border-primary transition-colors"
          />
          <button className="h-12 px-5 bg-foreground text-background rounded-2xl font-semibold text-sm btn-press">
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}

const quizzes = [
  { title: "Capitales du monde", cat: "Géographie", players: "2.4k", color: "bg-primary/10 text-primary" },
  { title: "Tables de multiplication", cat: "Maths", players: "1.8k", color: "bg-warning/10 text-warning" },
  { title: "Règnes & dynasties", cat: "Histoire", players: "1.2k", color: "bg-success/10 text-success" },
  { title: "Conjugaison futur", cat: "Français", players: "980", color: "bg-destructive/10 text-destructive" },
];

function PopularQuizzes() {
  return (
    <section>
      <SectionTitle title="Quiz populaires" subtitle="Les plus joués cette semaine" icon={TrendingUp} />
      <div className="grid sm:grid-cols-2 gap-4">
        {quizzes.map((q) => (
          <button
            key={q.title}
            className="group text-left p-5 bg-card border border-border/60 rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <div className={`size-11 rounded-xl ${q.color} grid place-items-center mb-4 font-bold`}>
              {q.cat[0]}
            </div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
              {q.cat}
            </div>
            <div className="font-display font-bold mb-3">{q.title}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{q.players} parties</span>
              <ChevronRight className="size-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

const challenges = [
  { title: "Jouer 3 parties", reward: "+150 XP", progress: 66, done: 2, total: 3 },
  { title: "Gagner 1 000 XP aujourd'hui", reward: "+1 badge", progress: 40, done: 400, total: 1000 },
  { title: "Inviter un ami", reward: "+500 pièces", progress: 0, done: 0, total: 1 },
];

function DailyChallenges() {
  return (
    <section>
      <SectionTitle title="Défis du jour" subtitle="3 défis à compléter avant minuit" icon={Target} />
      <div className="space-y-3">
        {challenges.map((c) => (
          <div key={c.title} className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-4">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Target className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="font-semibold text-sm truncate">{c.title}</div>
                <span className="text-xs font-bold text-warning shrink-0">{c.reward}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${c.progress}%` }} />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{c.done}/{c.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const friends = [
  { name: "Léa.M", status: "En partie · Géographie", color: "bg-warning/15 text-warning", online: true },
  { name: "Thomas.Z", status: "En ligne", color: "bg-primary/15 text-primary", online: true },
  { name: "Sofia.K", status: "Hors ligne", color: "bg-muted text-muted-foreground", online: false },
];

function FriendsOnline() {
  return (
    <section>
      <SectionTitle title="Amis" subtitle="Inviter en un clic" icon={Users} />
      <div className="bg-card border border-border/60 rounded-2xl divide-y divide-border/60">
        {friends.map((f) => (
          <div key={f.name} className="p-4 flex items-center gap-3">
            <div className="relative">
              <div className={`size-10 rounded-full grid place-items-center font-bold text-sm ${f.color}`}>
                {f.name[0]}
              </div>
              {f.online && (
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{f.name}</div>
              <div className="text-xs text-muted-foreground truncate">{f.status}</div>
            </div>
            <button
              disabled={!f.online}
              className="px-3 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold btn-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Inviter
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

const badges = [
  { name: "Série 7", color: "bg-warning/15 text-warning" },
  { name: "Top 3", color: "bg-primary/15 text-primary" },
  { name: "Sans faute", color: "bg-success/15 text-success" },
  { name: "Parrain", color: "bg-destructive/15 text-destructive" },
];

function RecentBadges() {
  return (
    <section>
      <SectionTitle title="Badges récents" subtitle="Continuez sur cette lancée" icon={Award} />
      <div className="p-5 bg-card border border-border/60 rounded-2xl grid grid-cols-2 gap-3">
        {badges.map((b) => (
          <div key={b.name} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background border border-border/60">
            <div className={`size-12 rounded-full ${b.color} grid place-items-center text-lg`}>
              ★
            </div>
            <div className="text-xs font-semibold text-center">{b.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({
  title, subtitle, icon: Icon,
}: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="size-4.5" />
      </div>
      <div>
        <h2 className="font-display font-bold text-lg leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
