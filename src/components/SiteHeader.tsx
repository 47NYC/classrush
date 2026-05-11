import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/60">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Fonctionnalités</a>
          <a href="#how" className="hover:text-primary transition-colors">Fonctionnement</a>
          <a href="#teachers" className="hover:text-primary transition-colors">Enseignants</a>
          <a href="#students" className="hover:text-primary transition-colors">Élèves</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden sm:inline-flex h-10 items-center px-4 rounded-full text-sm font-semibold text-foreground hover:bg-muted btn-press"
          >
            Connexion
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-10 items-center px-5 rounded-full text-sm font-semibold bg-primary text-primary-foreground shadow-soft hover:shadow-glow btn-press"
          >
            Commencer gratuitement
          </Link>
        </div>
      </nav>
    </header>
  );
}
