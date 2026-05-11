import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHeader, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/tournaments")({
  head: () => ({ meta: [{ title: "Tournois — ClassRush" }] }),
  component: () => (
    <PageShell>
      <PageHeader subtitle="Compétition" title="Tournois" />
      <ComingSoon description="Les tournois multi-manches avec brackets, classements live et récompenses saisonnières arrivent bientôt." />
    </PageShell>
  ),
});
