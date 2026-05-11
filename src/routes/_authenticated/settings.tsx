import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { LogOut, Bell, Shield, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Paramètres — ClassRush" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnecté");
    navigate({ to: "/" });
  };

  return (
    <PageShell>
      <PageHeader subtitle="Compte" title="Paramètres" />
      <div className="max-w-2xl mx-auto space-y-4">
        <Section icon={Bell} title="Notifications" description="Invitations de partie, défis quotidiens, événements." />
        <Section icon={Globe} title="Langue" description="Français (par défaut)" />
        <Section icon={Shield} title="Confidentialité" description={`Compte : ${user?.email ?? "—"}`} />
        <button
          onClick={handleSignOut}
          className="w-full p-5 bg-card border border-border/60 rounded-2xl flex items-center gap-4 hover:border-destructive transition-colors"
        >
          <div className="size-11 rounded-xl bg-destructive/10 text-destructive grid place-items-center">
            <LogOut className="size-5" />
          </div>
          <div className="text-left flex-1">
            <div className="font-display font-bold">Se déconnecter</div>
            <div className="text-xs text-muted-foreground">Termine la session sur cet appareil</div>
          </div>
        </button>
      </div>
    </PageShell>
  );
}

function Section({ icon: Icon, title, description }: { icon: typeof Bell; title: string; description: string }) {
  return (
    <div className="p-5 bg-card border border-border/60 rounded-2xl flex items-center gap-4">
      <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <div className="font-display font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
