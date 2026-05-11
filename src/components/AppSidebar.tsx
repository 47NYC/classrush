import { Link, useLocation } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import {
  Home, Gamepad2, BookOpen, Users, Trophy, Target, ShoppingBag,
  User, Settings, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type NavItem = { to: "/dashboard" | "/quizzes"; icon: typeof Home; label: string; disabled?: boolean };

const items: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Accueil" },
  { to: "/dashboard", icon: Gamepad2, label: "Jouer", disabled: true },
  { to: "/quizzes", icon: BookOpen, label: "Mes quiz" },
  { to: "/dashboard", icon: Users, label: "Amis", disabled: true },
  { to: "/dashboard", icon: Trophy, label: "Tournois", disabled: true },
  { to: "/dashboard", icon: Target, label: "Défis", disabled: true },
  { to: "/dashboard", icon: ShoppingBag, label: "Boutique", disabled: true },
  { to: "/dashboard", icon: User, label: "Profil", disabled: true },
  { to: "/dashboard", icon: Settings, label: "Paramètres", disabled: true },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnecté");
    navigate({ to: "/" });
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border/60 p-6 sticky top-0 h-screen">
      <Logo />
      <nav className="mt-10 flex-1 space-y-1">
        {items.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          if (item.disabled) {
            return (
              <button
                key={item.label}
                onClick={() => toast.info("Bientôt disponible")}
                className="w-full flex items-center gap-3 px-3.5 h-11 rounded-2xl text-sm font-medium text-muted-foreground/60 hover:bg-muted/60 hover:text-muted-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`w-full flex items-center gap-3 px-3.5 h-11 rounded-2xl text-sm font-medium transition-all ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleSignOut}
        className="mt-2 w-full flex items-center gap-3 px-3.5 h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4" />
        Se déconnecter
      </button>
    </aside>
  );
}
