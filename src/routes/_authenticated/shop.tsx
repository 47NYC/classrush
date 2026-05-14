import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabase-rpc";
import { Loader2, Coins, Check, ShoppingBag, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({ meta: [{ title: "Boutique — ClassRush" }] }),
  component: ShopPage,
});

type Item = {
  id: string; slug: string; name: string; description: string | null;
  category: "avatar" | "theme" | "badge" | "frame";
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number; preview_emoji: string | null; preview_color: string | null;
};
type PurchaseResult = { ok: boolean; message: string; coins_remaining: number };

const RARITY_STYLE: Record<Item["rarity"], string> = {
  common: "border-muted-foreground/30 bg-muted/20",
  rare: "border-primary/40 bg-primary/5",
  epic: "border-purple-500/40 bg-purple-500/5",
  legendary: "border-warning/60 bg-warning/10",
};
const RARITY_LABEL: Record<Item["rarity"], string> = {
  common: "Commun", rare: "Rare", epic: "Épique", legendary: "Légendaire",
};

const CATEGORIES: { value: Item["category"] | "all"; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "avatar", label: "Avatars" },
  { value: "theme", label: "Thèmes" },
  { value: "badge", label: "Badges" },
  { value: "frame", label: "Cadres" },
];

function ShopPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | Item["category"]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["shop-items"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_items").select("*").eq("is_active", true).order("price");
      return (data ?? []) as Item[];
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ["my-inventory", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_inventory").select("item_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.item_id));
    },
  });

  const { data: equipped } = useQuery({
    queryKey: ["my-equipped", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("equipped_avatar_item, equipped_theme_item").eq("id", user!.id).single();
      return data;
    },
  });

  const buy = async (item: Item) => {
    if (!user || !profile) return;
    if (profile.coins < item.price) { toast.error("Pas assez de pièces"); return; }
    setBusy(item.id);
    try {
      const { data, error } = await callRpc<PurchaseResult[]>("purchase_item", { _item_id: item.id });
      if (error) throw new Error(error.message);
      toast.success(data?.[0]?.message === "Déjà possédé" ? "Déjà possédé" : `${item.name} acheté !`);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["my-inventory", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'achat");
    } finally {
      setBusy(null);
    }
  };

  const equip = async (item: Item) => {
    if (!user) return;
    if (item.category !== "avatar" && item.category !== "theme") {
      toast.info("Cet objet est cosmétique d'inventaire uniquement.");
      return;
    }
    setBusy(item.id);
    const patch = item.category === "avatar"
      ? { equipped_avatar_item: item.id }
      : { equipped_theme_item: item.id };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${item.name} équipé !`);
    queryClient.invalidateQueries({ queryKey: ["my-equipped", user.id] });
  };

  const visible = (items ?? []).filter((i) => filter === "all" || i.category === filter);

  return (
    <PageShell>
      <PageHeader
        subtitle="Cosmétiques"
        title="Boutique"
        actions={
          <div className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl bg-warning/10 text-warning font-bold tabular-nums">
            <Coins className="size-4" /> {profile?.coins.toLocaleString("fr-FR") ?? 0}
          </div>
        }
      />
      <div className="max-w-6xl mx-auto">
        <div className="inline-flex bg-card border border-border rounded-2xl p-1 mb-6 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-4 h-9 rounded-xl text-sm font-semibold ${
                filter === c.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid place-items-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map((item) => {
              const owned = inventory?.has(item.id) ?? false;
              const isEquipped =
                (item.category === "avatar" && equipped?.equipped_avatar_item === item.id) ||
                (item.category === "theme" && equipped?.equipped_theme_item === item.id);
              const canAfford = (profile?.coins ?? 0) >= item.price;
              return (
                <article
                  key={item.id}
                  className={`p-5 rounded-2xl border-2 ${RARITY_STYLE[item.rarity]} flex flex-col`}
                >
                  <div
                    className="aspect-square rounded-2xl grid place-items-center text-6xl mb-3"
                    style={{ background: item.preview_color ? `${item.preview_color}20` : undefined }}
                  >
                    {item.preview_emoji ?? "✨"}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-bold truncate">{item.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">
                      {RARITY_LABEL[item.rarity]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{item.description}</p>

                  {isEquipped ? (
                    <div className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-success text-white text-sm font-semibold">
                      <Sparkles className="size-4" /> Équipé
                    </div>
                  ) : owned ? (
                    (item.category === "avatar" || item.category === "theme") ? (
                      <button
                        onClick={() => equip(item)}
                        disabled={busy === item.id}
                        className="h-10 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
                      >
                        {busy === item.id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Équiper</>}
                      </button>
                    ) : (
                      <div className="h-10 inline-flex items-center justify-center gap-1.5 bg-muted rounded-xl text-sm font-semibold text-muted-foreground">
                        <Check className="size-4" /> Possédé
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => buy(item)}
                      disabled={busy === item.id || !canAfford}
                      className="h-10 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold btn-press disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {busy === item.id ? <Loader2 className="size-4 animate-spin" /> : (
                        <><ShoppingBag className="size-4" /> {item.price.toLocaleString("fr-FR")} <Coins className="size-3.5" /></>
                      )}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}