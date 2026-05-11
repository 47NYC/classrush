import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHeader, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({ meta: [{ title: "Boutique — ClassRush" }] }),
  component: () => (
    <PageShell>
      <PageHeader subtitle="Cosmétiques" title="Boutique" />
      <ComingSoon description="Avatars, badges, thèmes et cadres organisés par rareté arrivent bientôt." />
    </PageShell>
  ),
});
