import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroMockup } from "@/components/HeroMockup";
import {
  Sparkles, Users, Zap, Trophy, GraduationCap, ShieldCheck,
  PlayCircle, KeyRound, BarChart3, Heart, Gamepad2, Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassRush — L'apprentissage devient interactif" },
      {
        name: "description",
        content:
          "Créez des quiz multijoueurs, lancez des parties live et apprenez en jouant entre amis ou en classe. La plateforme EdTech moderne pour élèves, enseignants et familles.",
      },
      { property: "og:title", content: "ClassRush — L'apprentissage devient interactif" },
      { property: "og:description", content: "Quiz multijoueurs, parties live, classes virtuelles. Apprendre devient un jeu." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Audiences />
      <Testimonials />
      <Security />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 -left-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 right-0 size-80 rounded-full bg-warning/10 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 lg:pt-24 pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
            <Sparkles className="size-3.5" /> Nouvelle saison · Mode Tournoi
          </span>
          <h1 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-balance">
            L'apprentissage devient{" "}
            <span className="text-primary">interactif.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            ClassRush transforme vos quiz scolaires en parties multijoueurs amusantes,
            éducatives et compétitives. Créez, lancez, rejoignez — apprenez ensemble.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-7 h-14 bg-primary text-primary-foreground rounded-2xl font-semibold text-base shadow-glow btn-press"
            >
              <PlayCircle className="size-5" />
              Créer une partie
            </Link>
            <div className="flex items-center bg-card p-1.5 rounded-2xl border-2 border-border focus-within:border-primary transition-all shadow-soft">
              <input
                type="text"
                placeholder="CODE À 6 CHIFFRES"
                maxLength={6}
                className="bg-transparent px-4 py-2 font-mono font-bold text-base w-44 uppercase outline-none placeholder:text-muted-foreground/50 tracking-widest"
              />
              <button className="px-5 h-11 bg-foreground text-background rounded-xl font-semibold text-sm btn-press">
                Rejoindre
              </button>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {["bg-primary", "bg-warning", "bg-success", "bg-destructive"].map((c, i) => (
                <div key={i} className={`size-8 rounded-full border-2 border-background ${c}`} />
              ))}
            </div>
            <span>
              <strong className="text-foreground">+50 000 élèves</strong> jouent chaque semaine
            </span>
          </div>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-border/60 bg-card/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-muted-foreground">
        <span className="text-xs font-semibold tracking-widest uppercase">Adopté par</span>
        {["École Lumière", "Lycée Connect", "Académie Nova", "Collège Horizon", "Studio Apprendre"].map((n) => (
          <span key={n} className="font-display font-bold text-foreground/40 text-base">{n}</span>
        ))}
      </div>
    </section>
  );
}

const features = [
  { icon: Gamepad2, title: "10 modes de jeu", desc: "Classic, Survival, Team Battle, Race, Boss, Tournoi… variez les expériences pour ne jamais lasser.", color: "text-primary", bg: "bg-primary/10" },
  { icon: Zap, title: "Temps réel fluide", desc: "Leaderboard live, animations douces, parties qui se mettent à jour instantanément sans latence.", color: "text-warning", bg: "bg-warning/10" },
  { icon: Users, title: "Jouez entre amis", desc: "Code à 6 chiffres, invitations en un clic, friend code unique. Une vraie expérience sociale.", color: "text-success", bg: "bg-success/10" },
  { icon: Trophy, title: "Progression motivante", desc: "XP, badges, défis quotidiens, boutique cosmétique, parrainage. Apprendre devient gratifiant.", color: "text-destructive", bg: "bg-destructive/10" },
  { icon: GraduationCap, title: "Classes virtuelles", desc: "Pour les profs : créez votre classe, lancez des parties, suivez la progression de chaque élève.", color: "text-primary", bg: "bg-primary/10" },
  { icon: BarChart3, title: "Statistiques claires", desc: "Précision, temps moyen, points faibles. Tout est mesuré pour mieux progresser.", color: "text-warning", bg: "bg-warning/10" },
];

function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-sm font-bold tracking-widest uppercase text-primary">Fonctionnalités</span>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold">
          Tout ce qu'il faut pour rendre l'école addictive
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Une plateforme moderne pensée pour l'apprentissage social, pour les élèves comme pour les enseignants.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="group p-7 bg-card rounded-3xl border border-border/60 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all"
          >
            <div className={`size-12 rounded-2xl ${f.bg} ${f.color} grid place-items-center mb-5`}>
              <f.icon className="size-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { n: "01", title: "Créez votre quiz", desc: "Ajoutez vos questions, images et réponses. Drag & drop pour réorganiser. Sauvegarde automatique.", icon: Sparkles },
  { n: "02", title: "Lancez la partie", desc: "Choisissez un mode, partagez le code à 6 chiffres ou invitez vos amis depuis votre liste.", icon: KeyRound },
  { n: "03", title: "Apprenez en jouant", desc: "Leaderboard live, XP, badges. Tout le monde rejoint depuis n'importe quel appareil.", icon: Trophy },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-foreground text-background py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-0 opacity-30">
        <div className="absolute top-1/2 left-1/4 size-96 rounded-full bg-primary/40 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <div className="max-w-2xl mb-16">
          <span className="text-sm font-bold tracking-widest uppercase text-primary">Comment ça marche</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold">Une partie en 3 étapes</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="font-display font-bold text-7xl text-primary/30 mb-4">{s.n}</div>
              <div className="size-12 rounded-2xl bg-primary/15 text-primary grid place-items-center mb-5">
                <s.icon className="size-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-background/60 leading-relaxed text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Audiences() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32 grid lg:grid-cols-2 gap-6">
      <div id="teachers" className="p-10 lg:p-12 bg-card rounded-3xl border border-border/60 shadow-soft">
        <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-6">
          <GraduationCap className="size-7" />
        </div>
        <h3 className="text-3xl font-bold mb-4">Pour les enseignants</h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Créez votre classe en 30 secondes, partagez un code unique, lancez des parties depuis le tableau et suivez la progression individuelle de chaque élève.
        </p>
        <ul className="space-y-3 text-sm">
          {["Classes privées avec code d'invitation", "Devoirs assignés et rappels automatiques", "Statistiques classe et par élève", "Tournois inter-classes"].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="size-5 rounded-full bg-success/15 text-success grid place-items-center">
                <Heart className="size-3" />
              </div>
              {i}
            </li>
          ))}
        </ul>
      </div>
      <div id="students" className="p-10 lg:p-12 bg-primary text-primary-foreground rounded-3xl shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="size-14 rounded-2xl bg-primary-foreground/15 grid place-items-center mb-6 relative">
          <Target className="size-7" />
        </div>
        <h3 className="text-3xl font-bold mb-4 relative">Pour les élèves</h3>
        <p className="text-primary-foreground/80 leading-relaxed mb-6 relative">
          Créez vos propres quiz, lancez des parties privées avec vos amis, gagnez de l'XP, débloquez des badges et grimpez dans le classement.
        </p>
        <ul className="space-y-3 text-sm relative">
          {["Friend code unique pour ajouter ses amis", "Parrainage : invitez et gagnez des récompenses", "Boutique d'avatars et thèmes exclusifs", "Défis quotidiens & streak"].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="size-5 rounded-full bg-primary-foreground/20 grid place-items-center">
                <Heart className="size-3" />
              </div>
              {i}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const testimonials = [
  { quote: "Mes élèves de 5e en redemandent. Les révisions ne sont plus une corvée.", name: "Claire D.", role: "Professeure de SVT" },
  { quote: "Je joue avec mes potes le soir pour réviser. C'est comme un jeu mais on apprend vraiment.", name: "Lucas, 14 ans", role: "Élève" },
  { quote: "L'interface est claire, les enfants comprennent tout de suite. Très rassurant pour les parents.", name: "Marc P.", role: "Parent" },
];

function Testimonials() {
  return (
    <section className="bg-card border-y border-border/60 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold tracking-widest uppercase text-primary">Témoignages</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold">Aimé par toute la classe</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="p-7 bg-background rounded-3xl border border-border/60">
              <div className="text-warning text-lg mb-3">★★★★★</div>
              <p className="text-foreground leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-5 border-t border-border/60">
                <div className="size-10 rounded-full bg-primary/15 text-primary grid place-items-center font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
      <div className="p-8 lg:p-12 bg-card rounded-3xl border border-border/60 shadow-soft flex flex-col md:flex-row items-start md:items-center gap-8">
        <div className="size-16 rounded-2xl bg-success/10 text-success grid place-items-center shrink-0">
          <ShieldCheck className="size-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-2">Sécurisé, conforme RGPD, sans publicité</h3>
          <p className="text-muted-foreground leading-relaxed">
            Données hébergées en Europe, anonymisation des élèves mineurs, contrôle parental, modération des contenus. Conçu pour un usage scolaire serein.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-24">
      <div className="p-12 lg:p-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl shadow-glow text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 size-40 rounded-full bg-warning/40 blur-2xl" />
          <div className="absolute bottom-0 right-0 size-40 rounded-full bg-success/40 blur-2xl" />
        </div>
        <div className="relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Prêt à transformer votre prochaine leçon ?</h2>
          <p className="text-primary-foreground/85 text-lg mb-8 max-w-xl mx-auto">
            Créez un compte gratuit en 30 secondes. Aucune carte bancaire. Aucun engagement.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 h-14 bg-background text-foreground rounded-2xl font-semibold shadow-soft btn-press"
          >
            Commencer gratuitement
            <Sparkles className="size-5 text-primary" />
          </Link>
        </div>
      </div>
    </section>
  );
}
