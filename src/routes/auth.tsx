import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — ClassRush" },
      { name: "description", content: "Connectez-vous ou créez votre compte ClassRush gratuitement." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left visual panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 -z-0 opacity-30">
          <div className="absolute top-10 -left-20 size-80 rounded-full bg-warning/40 blur-3xl animate-float" />
          <div className="absolute bottom-10 -right-10 size-72 rounded-full bg-success/30 blur-3xl animate-float [animation-delay:2s]" />
        </div>
        <div className="relative">
          <Logo className="[&_span]:text-primary-foreground [&_span_span]:text-warning [&_div:first-child>div]:bg-primary" />
        </div>

        <div className="relative space-y-8 max-w-md">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-foreground/15 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5" /> Bienvenue
          </div>
          <h2 className="font-display text-4xl xl:text-5xl font-bold leading-tight text-balance">
            "Apprendre devient un moment qu'on attend avec impatience."
          </h2>
          <p className="text-primary-foreground/85 text-sm leading-relaxed">
            Créez votre compte gratuit, rejoignez vos amis avec un code à 6 chiffres et lancez votre première partie en quelques secondes.
          </p>
        </div>

        <div className="relative text-xs text-primary-foreground/70">
          © 2026 ClassRush · La plateforme EdTech multijoueur
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex flex-col p-6 sm:p-10 lg:p-12">
        <div className="lg:hidden mb-6">
          <Logo />
        </div>
        <div className="flex justify-end">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                {mode === "signin" ? "Bon retour !" : "Créer un compte"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "signin"
                  ? "Connectez-vous pour rejoindre vos parties."
                  : "Créez votre compte gratuit en 30 secondes."}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button className="w-full h-12 flex items-center justify-center gap-3 bg-card border border-border rounded-2xl font-semibold text-sm hover:border-primary btn-press">
                <GoogleIcon /> Continuer avec Google
              </button>
              <button className="w-full h-12 flex items-center justify-center gap-3 bg-foreground text-background rounded-2xl font-semibold text-sm btn-press">
                <AppleIcon /> Continuer avec Apple
              </button>
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {mode === "signup" && (
                <Field label="Pseudo">
                  <input
                    type="text"
                    placeholder="Lucas_99"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </Field>
              )}
              <Field label="Email" icon={<Mail className="size-4" />}>
                <input
                  type="email"
                  placeholder="vous@email.com"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </Field>
              <Field label="Mot de passe" icon={<Lock className="size-4" />}>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </Field>

              {mode === "signin" && (
                <div className="flex justify-end -mt-2">
                  <a href="#" className="text-xs text-primary hover:underline font-medium">
                    Mot de passe oublié ?
                  </a>
                </div>
              )}

              <Link
                to="/dashboard"
                className="w-full h-12 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press mt-2"
              >
                {mode === "signin" ? "Se connecter" : "Créer mon compte"}
                <ArrowRight className="size-4" />
              </Link>
            </form>

            <p className="mt-8 text-sm text-center text-muted-foreground">
              {mode === "signin" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-primary font-semibold hover:underline"
              >
                {mode === "signin" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>
      <div className="flex items-center gap-3 h-12 px-4 bg-card border-2 border-border rounded-2xl focus-within:border-primary focus-within:shadow-soft transition-all">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {children}
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
