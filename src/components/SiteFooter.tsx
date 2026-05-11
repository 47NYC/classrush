import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2">
          <Logo />
          <p className="mt-5 text-sm text-muted-foreground max-w-xs leading-relaxed">
            La plateforme EdTech qui transforme chaque leçon en aventure multijoueur, pensée pour les élèves, les enseignants et les familles.
          </p>
        </div>
        <div>
          <h5 className="font-semibold text-sm mb-4">Plateforme</h5>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-primary">Fonctionnalités</a></li>
            <li><a href="#how" className="hover:text-primary">Modes de jeu</a></li>
            <li><a href="#teachers" className="hover:text-primary">Pour les classes</a></li>
          </ul>
        </div>
        <div>
          <h5 className="font-semibold text-sm mb-4">Aide</h5>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary">Centre d'aide</a></li>
            <li><a href="#" className="hover:text-primary">Contact</a></li>
            <li><a href="#" className="hover:text-primary">Confidentialité</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 ClassRush. Conçu pour l'école d'aujourd'hui.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Mentions légales</a>
            <a href="#" className="hover:text-foreground">RGPD</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
