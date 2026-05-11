export function HeroMockup() {
  const players = [
    { rank: 1, name: "Léa.M", xp: "2 450", color: "bg-warning/15 text-warning", barWidth: "85%", barColor: "bg-warning", highlight: false },
    { rank: 2, name: "Thomas.Z", xp: "2 120", color: "bg-primary/15 text-primary", barWidth: "70%", barColor: "bg-primary", highlight: true },
    { rank: 3, name: "Maxime", xp: "1 890", color: "bg-success/15 text-success", barWidth: "55%", barColor: "bg-success", highlight: false },
    { rank: 4, name: "Sofia.K", xp: "1 540", color: "bg-muted text-muted-foreground", barWidth: "40%", barColor: "bg-muted-foreground/40", highlight: false },
  ];

  return (
    <div className="relative animate-fade-up [animation-delay:200ms]">
      <div className="bg-card rounded-3xl shadow-card border border-border/60 p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
            </span>
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Live · Géographie
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
            42 joueurs
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {players.map((p) => (
            <div
              key={p.rank}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                p.highlight
                  ? "bg-card border-2 border-primary shadow-soft scale-[1.02]"
                  : "bg-background border border-border/50"
              }`}
            >
              <span className="font-display font-bold text-sm w-5 text-muted-foreground">
                {p.rank}
              </span>
              <div className={`size-9 rounded-full grid place-items-center font-bold text-sm ${p.color}`}>
                {p.name[0]}
              </div>
              <span className="font-semibold text-sm flex-1">{p.name}</span>
              <div className="flex flex-col items-end gap-1.5 w-28">
                <span className="text-xs font-bold text-foreground">{p.xp} XP</span>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${p.barColor}`} style={{ width: p.barWidth }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-success animate-pulse-soft" />
            <span className="text-xs text-muted-foreground">Question 7 / 12</span>
          </div>
          <span className="text-xs font-mono font-bold text-primary">00:14</span>
        </div>
      </div>

      {/* Floating XP gain */}
      <div className="absolute -top-4 -right-4 px-4 py-2.5 rounded-2xl bg-success text-success-foreground font-bold text-sm shadow-glow animate-float">
        +50 XP combo
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-5 -left-5 bg-card rounded-2xl shadow-card border border-border/60 p-4 flex items-center gap-3 animate-float [animation-delay:1.5s]">
        <div className="size-11 rounded-2xl bg-warning/15 grid place-items-center text-warning text-xl font-bold">
          🏆
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Série actuelle</div>
          <div className="font-display font-bold text-sm">7 jours</div>
        </div>
      </div>

      {/* Background glow */}
      <div className="absolute -inset-6 -z-10 bg-gradient-to-tr from-primary/15 via-transparent to-warning/10 blur-3xl rounded-full" />
    </div>
  );
}
