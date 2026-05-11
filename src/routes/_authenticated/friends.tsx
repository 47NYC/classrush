import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Amis — ClassRush" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const { profile } = useAuth();
  const code = profile?.friend_code ?? "—";
  return (
    <PageShell>
      <PageHeader subtitle="Réseau" title="Amis" />
      <div className="max-w-2xl mx-auto space-y-6">
        <section className="p-6 bg-card border border-border/60 rounded-2xl">
          <h2 className="font-display font-bold mb-1">Ton code ami</h2>
          <p className="text-xs text-muted-foreground mb-4">Partage ce code pour que tes amis t'ajoutent.</p>
          <div className="flex items-center justify-between gap-3 p-4 bg-background border border-border rounded-xl">
            <span className="font-mono font-bold text-2xl tracking-widest">{code}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(code); toast.success("Copié !"); }}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold btn-press"
            >
              <Copy className="size-3.5" /> Copier
            </button>
          </div>
        </section>
        <section className="p-12 bg-card border border-dashed border-border rounded-2xl text-center">
          <p className="text-sm text-muted-foreground">
            Le système d'ajout d'amis et d'invitations en temps réel arrive bientôt.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
