import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Invite = {
  id: string;
  room_id: string;
  room_code: string;
  from_user: string;
  status: string;
  from_name?: string;
};

export function InvitesBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("room_invites")
      .select("id, room_id, room_code, from_user, status")
      .eq("to_user", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Invite[];
    if (list.length) {
      const ids = [...new Set(list.map((i) => i.from_user))];
      const { data: profs } = await supabase
        .from("profiles").select("id, username, display_name").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p.display_name || p.username]));
      list.forEach((i) => { i.from_name = map.get(i.from_user) || "Un ami"; });
    }
    setInvites(list);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`invites-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "room_invites", filter: `to_user=eq.${user.id}` },
        (payload) => {
          load();
          if (payload.eventType === "INSERT") {
            toast.info("Nouvelle invitation à jouer !");
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const accept = async (inv: Invite) => {
    if (!user) return;
    // Auto-leave any other active room (lobby) before joining the new one
    const { data: otherLobbies } = await supabase
      .from("room_players")
      .select("room_id, rooms!inner(id, status, host_id)")
      .eq("user_id", user.id);
    const toLeave = (otherLobbies ?? []).filter((rp: { room_id: string; rooms: { id: string; status: string; host_id: string } }) =>
      rp.room_id !== inv.room_id && (rp.rooms.status === "lobby" || rp.rooms.status === "live")
    );
    for (const rp of toLeave) {
      const r = (rp as { rooms: { id: string; status: string; host_id: string } }).rooms;
      if (r.host_id === user.id) {
        await supabase.from("rooms").update({ status: "cancelled" }).eq("id", r.id);
      } else {
        await supabase.from("room_players").delete().eq("room_id", r.id).eq("user_id", user.id);
      }
    }
    if (toLeave.length) toast.info("Tu as quitté ta partie en cours");

    await supabase.from("room_invites").update({ status: "accepted" }).eq("id", inv.id);
    setOpen(false);
    navigate({ to: "/room/$code", params: { code: inv.room_code } });
  };

  const decline = async (id: string) => {
    await supabase.from("room_invites").update({ status: "declined" }).eq("id", id);
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-full flex items-center gap-3 px-3.5 h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" />
        Invitations
        {invites.length > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {invites.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-full ml-2 top-0 w-72 bg-card border border-border rounded-2xl shadow-card p-3 z-50">
          <h3 className="font-display font-bold text-sm mb-2 px-1">Invitations</h3>
          {invites.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-3">Aucune invitation pour le moment.</p>
          ) : (
            <div className="space-y-1.5">
              {invites.map((inv) => (
                <div key={inv.id} className="p-2.5 bg-background border border-border rounded-xl">
                  <div className="text-xs mb-2">
                    <span className="font-semibold">{inv.from_name}</span>
                    <span className="text-muted-foreground"> t'invite — code </span>
                    <span className="font-mono font-bold">{inv.room_code}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => accept(inv)}
                      className="flex-1 h-7 inline-flex items-center justify-center gap-1 bg-success text-white rounded-md text-xs font-semibold">
                      <Check className="size-3" /> Rejoindre
                    </button>
                    <button onClick={() => decline(inv.id)}
                      className="size-7 grid place-items-center bg-muted text-muted-foreground rounded-md hover:bg-destructive/10 hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}