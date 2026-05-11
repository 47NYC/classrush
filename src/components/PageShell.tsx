import { type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-10">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 max-w-6xl mx-auto w-full">
      <div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{title}</h1>
      </div>
      {actions}
    </div>
  );
}

export function ComingSoon({ description }: { description: string }) {
  return (
    <div className="max-w-2xl mx-auto p-12 bg-card border border-dashed border-border rounded-3xl text-center">
      <div className="size-16 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4 font-display text-2xl font-bold">
        ✦
      </div>
      <h3 className="font-display text-xl font-bold mb-2">Bientôt disponible</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
