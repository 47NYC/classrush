import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHeader, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({ meta: [{ title: "Défis — ClassRush" }] }),
  component: () => (
    <PageShell>
      <PageHeader subtitle="Quotidien" title="Défis" />
      <ComingSoon description="Missions du jour, streaks, récompenses et badges exclusifs arrivent bientôt." />
    </PageShell>
  ),
});
