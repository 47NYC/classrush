import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import {
  Home, Gamepad2, BookOpen, Users, Trophy, Target, ShoppingBag,
  User, Settings, LogOut,
} from "lucide-react";
import { toast } from "sonner";

type NavItem = {
  to: "/dashboard" | "/play" | "/quizzes" | "/friends" | "/tournaments" | "/challenges" | "/shop" | "/profile" | "/settings";
  icon: typeof Home;
  label: string;
};

const items: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Accueil" },
  { to: "/play", icon: Gamepad2, label: "Jouer" },
  { to: "/quizzes", icon: BookOpen, label: "Mes quiz" },
  { to: "/friends", icon: Users, label: "Amis" },
  { to: "/tournaments", icon: Trophy, label: "Tournois" },
  { to: "/challenges", icon: Target, label: "Défis" },
  { to: "/shop", icon: ShoppingBag, label: "Boutique" },
  { to: "/profile", icon: User, label: "Profil" },
  { to: "/settings", icon: Settings, label: "Paramètres" },
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
          const active = location.pathname === item.to;
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
