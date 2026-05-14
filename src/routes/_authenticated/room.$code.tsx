import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { Mascot } from "@/components/Mascot";
import { callRpc, loadPublicProfiles } from "@/lib/supabase-rpc";
import {
  Loader2, Copy, Users, PlayCircle, ArrowRight, Crown, Check,
  X as XIcon, Trophy, Home, RotateCcw, LogOut, Clock, Award, UserPlus, Send,
  Share2, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/room/$code")({
  head: () => ({ meta: [{ title: "Salle de jeu — ClassRush" }] }),
  component: RoomPage,
});

type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  quiz_id: string;
  mode: "classic" | "survival" | "speedrun" | "team" | "speed" | "boss" | "race" | "treasure" | "arena" | "chaos" | "tournament";
  settings: Record<string, unknown> | null;
  status: "lobby" | "live" | "finished" | "cancelled";
  current_question: number;
  question_started_at: string | null;
  max_players: number;
  started_at: string | null;
  finished_at: string | null;
};

type PlayerRow = {
  id: string;
  room_id: string;
  user_id: string;
  score: number;
  is_ready: boolean;
  is_eliminated: boolean;
  joined_at: string;
};

type ProfileLite = { id: string; username: string; display_name: string | null };

type AnswerRow = { id: string; position: number; text: string };
type QuestionRow = { id: string; position: number; text: string; image_url: string | null; time_limit: number; points: number; answers: AnswerRow[] };
type QuizRow = { id: string; title: string; cover_url: string | null; questions: QuestionRow[] };
type SubmitAnswerResult = { answer_id: string; is_correct: boolean; points_earned: number; total_score: number; is_eliminated: boolean };

function RoomPage() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load + subscribe
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data, error: err } = await supabase
        .from("rooms")
        .select("id, code, host_id, quiz_id, mode, status, current_question, question_started_at, max_players, started_at, finished_at")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setError("Salle introuvable");
        setLoading(false);
        return;
      }
      setRoom(data as RoomRow);
      setLoading(false);

      roomChannel = supabase
        .channel(`room-${data.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${data.id}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              setError("La salle a été fermée par l'hôte");
              return;
            }
            setRoom(payload.new as RoomRow);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${data.id}` },
          () => loadPlayers(data.id)
        )
        .subscribe();

      loadPlayers(data.id);
    })();

    return () => {
      cancelled = true;
      if (roomChannel) supabase.removeChannel(roomChannel);
    };
  }, [code, user]);

  const loadPlayers = async (roomId: string) => {
    const { data } = await supabase
      .from("room_players")
      .select("id, room_id, user_id, score, is_ready, is_eliminated, joined_at")
      .eq("room_id", roomId)
      .order("joined_at");
    if (!data) return;
    setPlayers(data as PlayerRow[]);
    const ids = data.map((p) => p.user_id);
    if (ids.length) {
      const profs = await loadPublicProfiles(ids);
      setProfiles(new Map([...profs].map(([id, p]) => [id, p as ProfileLite])));
    }
  };

  if (loading) {
    return (
      <FullScreenWrap>
        <div className="flex flex-col items-center gap-4">
          <Mascot mood="loading" className="h-32 w-auto animate-fade-up" />
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </FullScreenWrap>
    );
  }

  if (error || !room) {
    return (
      <FullScreenWrap>
        <div className="text-center max-w-sm">
          <p className="text-destructive font-semibold mb-4">{error ?? "Erreur"}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 h-11 px-5 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold btn-press">
            <Home className="size-4" /> Retour au dashboard
          </Link>
        </div>
      </FullScreenWrap>
    );
  }

  const isHost = user?.id === room.host_id;

  if (room.status === "lobby") {
    return <Lobby room={room} players={players} profiles={profiles} isHost={isHost} onLeave={() => navigate({ to: "/dashboard" })} />;
  }
  if (room.status === "live") {
    return <LiveGame room={room} players={players} profiles={profiles} isHost={isHost} userId={user!.id} />;
  }
  return <Results room={room} players={players} profiles={profiles} isHost={isHost} />;
}

function FullScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="absolute top-6 left-6"><Logo /></div>
      {children}
    </div>
  );
}


/* ──────────── LOBBY ──────────── */

function Lobby({ room, players, profiles, isHost, onLeave }: {
  room: RoomRow; players: PlayerRow[]; profiles: Map<string, ProfileLite>; isHost: boolean; onLeave: () => void;
}) {
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);

  const { data: quizMeta } = useQuery({
    queryKey: ["room-quiz-meta", room.quiz_id],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("title, description").eq("id", room.quiz_id).single();
      return data;
    },
  });

  const handleStart = async () => {
    if (!isHost) return;
    setStarting(true);
    const { error } = await supabase
      .from("rooms")
      .update({
        status: "live",
        started_at: new Date().toISOString(),
        current_question: 0,
        question_started_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    if (error) { toast.error(error.message); setStarting(false); return; }
  };

  const handleLeave = async () => {
    if (!user) return;
    if (isHost) {
      await supabase.from("rooms").update({ status: "cancelled" }).eq("id", room.id);
    } else {
      await supabase.from("room_players").delete().eq("room_id", room.id).eq("user_id", user.id);
    }
    onLeave();
  };

  const copy = () => { navigator.clipboard.writeText(room.code); toast.success("Code copié !"); };
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <button onClick={handleLeave} className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive text-sm font-semibold btn-press">
            <LogOut className="size-4" /> Quitter
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <section className="p-8 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl shadow-glow relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-bold tracking-widest uppercase opacity-80">Code de la partie</p>
            <div className="mt-3 mb-6 font-mono font-bold text-6xl md:text-7xl tracking-[0.2em]">{room.code}</div>
            <button onClick={copy} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-foreground text-primary text-sm font-semibold btn-press">
              <Copy className="size-4" /> Copier le code
            </button>
            <div className="mt-6 pt-6 border-t border-primary-foreground/20">
              <p className="text-sm opacity-90 mb-1">{quizMeta?.title ?? "Quiz"}</p>
              <p className="text-xs opacity-70 mb-3">{quizMeta?.description ?? "Quiz"}</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-foreground/15 text-xs font-bold uppercase tracking-wider">
                Mode {room.mode}
              </span>
            </div>
          </div>
        </section>

        <section className="p-6 bg-card border border-border/60 rounded-3xl shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Users className="size-5 text-primary" /> Joueurs
            </h2>
            <span className="text-xs text-muted-foreground">{players.length} / {room.max_players}</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">En attente de joueurs…</p>
            ) : players.map((p) => {
              const prof = profiles.get(p.user_id);
              const name = prof?.display_name || prof?.username || "Joueur";
              const isPlayerHost = p.user_id === room.host_id;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-background border border-border/60 rounded-xl">
                  <div className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-sm">
                    {name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm flex-1 truncate">{name}</span>
                  {isPlayerHost && (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <Crown className="size-3.5" /> Hôte
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={starting || players.length === 0}
              className="mt-5 w-full h-12 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press disabled:opacity-50"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : (
                <>Lancer la partie <ArrowRight className="size-4" /></>
              )}
            </button>
          ) : (
            <div className="mt-5 p-4 bg-muted rounded-2xl text-center text-sm text-muted-foreground">
              En attente du lancement par l'hôte…
            </div>
          )}
          <button
            onClick={() => setInviteOpen(true)}
            className="mt-3 w-full h-11 inline-flex items-center justify-center gap-2 bg-card border border-border rounded-2xl text-sm font-semibold btn-press hover:border-primary"
          >
            <UserPlus className="size-4" /> Inviter des amis
          </button>
        </section>
      </div>
      {inviteOpen && (
        <InviteFriendsModal
          roomId={room.id}
          roomCode={room.code}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}

function InviteFriendsModal({ roomId, roomCode, onClose }: { roomId: string; roomCode: string; onClose: () => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      const ids = (rows ?? []).map((f) => f.requester_id === user.id ? f.addressee_id : f.requester_id);
      if (!ids.length) { setLoading(false); return; }
      const { data: profs } = await supabase
        .from("profiles").select("id, username, display_name").in("id", ids);
      setFriends((profs ?? []).map((p) => ({ id: p.id, name: p.display_name || p.username })));
      setLoading(false);
    })();
  }, [user]);

  const invite = async (friendId: string) => {
    if (!user) return;
    const { error } = await supabase.from("room_invites").insert({
      room_id: roomId, room_code: roomCode, from_user: user.id, to_user: friendId, status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    setSent((s) => new Set(s).add(friendId));
    toast.success("Invitation envoyée");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">Inviter des amis</h3>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-muted">
            <XIcon className="size-4" />
          </button>
        </div>
        {loading ? (
          <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun ami pour le moment. Ajoute-en depuis la page Amis.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {friends.map((f) => {
              const isSent = sent.has(f.id);
              return (
                <div key={f.id} className="flex items-center gap-3 p-2.5 bg-background border border-border rounded-xl">
                  <div className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-sm">
                    {f.name[0]?.toUpperCase()}
                  </div>
                  <span className="font-semibold flex-1 truncate text-sm">{f.name}</span>
                  <button
                    onClick={() => invite(f.id)}
                    disabled={isSent}
                    className="inline-flex items-center gap-1 h-8 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg btn-press disabled:opacity-50"
                  >
                    {isSent ? <><Check className="size-3" /> Envoyé</> : <><Send className="size-3" /> Inviter</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────── LIVE GAME ──────────── */

function LiveGame({ room, players, profiles, isHost, userId }: {
  room: RoomRow; players: PlayerRow[]; profiles: Map<string, ProfileLite>; isHost: boolean; userId: string;
}) {
  // Load all questions+answers for the quiz once
  const { data: quiz, isLoading } = useQuery({
    queryKey: ["room-quiz-full", room.quiz_id],
    queryFn: async () => {
      const { data, error } = await callRpc<QuizRow>("get_room_quiz", { _room_id: room.id });
      if (error) throw error;
      const sorted = [...((data?.questions ?? []) as QuestionRow[])]
        .sort((a, b) => a.position - b.position)
        .map((q) => ({ ...q, answers: [...q.answers].sort((a, b) => a.position - b.position) }));
      return { ...(data as QuizRow), questions: sorted } as QuizRow;
    },
  });

  const totalQuestions = quiz?.questions.length ?? 0;
  const question = quiz?.questions[room.current_question];

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [shake, setShake] = useState<"none" | "soft" | "tiny">("none");
  const [now, setNow] = useState(Date.now());
  const advanceLockRef = useRef<number>(-1);

  // Reset per-question state
  useEffect(() => {
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowFeedback(null);
  }, [room.current_question]);

  // Tick every 200ms for timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  const startedAt = room.question_started_at ? new Date(room.question_started_at).getTime() : now;
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const timeLimit = question?.time_limit ?? 20;
  const timeLeft = Math.max(0, timeLimit - elapsed);
  const timePercent = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));

  // Check: did current user already answer (on reload, fetch DB)
  const { data: myAnswer } = useQuery({
    queryKey: ["my-answer", room.id, question?.id, userId],
    enabled: !!question?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("player_answers")
        .select("answer_id, is_correct, points_earned")
        .eq("room_id", room.id).eq("question_id", question!.id).eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (myAnswer) {
      setHasAnswered(true);
      setSelectedAnswer(myAnswer.answer_id);
      setShowFeedback({ correct: myAnswer.is_correct, points: myAnswer.points_earned });
    }
  }, [myAnswer]);

  const handlePick = async (answer: AnswerRow) => {
    if (!question || hasAnswered || timeLeft <= 0) return;
    // Eliminated players (Survival) cannot answer
    const meRow = players.find((p) => p.user_id === userId);
    if (meRow?.is_eliminated) return;
    setHasAnswered(true);
    setSelectedAnswer(answer.id);
    const { data, error } = await callRpc<SubmitAnswerResult[]>("submit_answer", {
      _room_id: room.id,
      _question_id: question.id,
      _answer_id: answer.id,
    });
    const result = data?.[0];
    if (error || !result) {
      toast.error("Réponse non enregistrée");
      return;
    }
    setShowFeedback({ correct: result.is_correct, points: result.points_earned });
    setShake(result.is_correct ? "tiny" : "soft");
    setTimeout(() => setShake("none"), 420);
    await loadPlayers(room.id);
  };

  // Live answer count for this question
  const { data: answerCount } = useQuery({
    queryKey: ["answer-count", room.id, room.current_question],
    enabled: !!question?.id,
    refetchInterval: 800,
    queryFn: async () => {
      const { count } = await supabase
        .from("player_answers")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .eq("question_id", question!.id);
      return count ?? 0;
    },
  });

  const activePlayers = players.filter((p) => !p.is_eliminated);
  const everyoneAnswered = (answerCount ?? 0) >= activePlayers.length && activePlayers.length > 0;

  // HOST auto-advance: when timer expires OR everyone answered
  useEffect(() => {
    if (!isHost || !question) return;
    if (advanceLockRef.current === room.current_question) return;
    if (timeLeft > 0 && !everyoneAnswered) return;

    advanceLockRef.current = room.current_question;
    const t = setTimeout(async () => {
      const next = room.current_question + 1;
      // Survival: if everyone is eliminated, end the game
      const allDead = room.mode === "survival" && activePlayers.length === 0;
      if (next >= totalQuestions || allDead) {
        await supabase.from("rooms").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", room.id);
      } else {
        await supabase.from("rooms").update({
          current_question: next,
          question_started_at: new Date().toISOString(),
        }).eq("id", room.id);
      }
    }, everyoneAnswered ? 1500 : 0);

    return () => clearTimeout(t);
  }, [isHost, timeLeft, everyoneAnswered, room.current_question, room.id, totalQuestions, question]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  if (isLoading || !quiz || !question) {
    return (
      <FullScreenWrap>
        <div className="flex flex-col items-center gap-4">
          <Mascot mood="focused" className="h-28 w-auto" />
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </FullScreenWrap>
    );
  }

  const COLORS = ["bg-primary", "bg-warning", "bg-success", "bg-destructive"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">{room.mode}</span>
            <div className="text-xs text-muted-foreground tabular-nums">
              Question {room.current_question + 1} / {totalQuestions}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-warning/10 text-warning font-bold text-sm tabular-nums">
            <Clock className="size-4" /> {Math.ceil(timeLeft)}s
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${timePercent}%` }}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_280px] gap-6">
        <section>
          <div
            className={`p-8 lg:p-10 bg-card border border-border/60 rounded-3xl shadow-soft text-center mb-6 ${
              shake === "soft" ? "animate-shake-soft" : shake === "tiny" ? "animate-shake-tiny" : ""
            }`}
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold leading-snug">{question.text}</h2>
            {question.image_url && (
              <img
                src={question.image_url}
                alt=""
                className="mt-5 mx-auto rounded-2xl max-h-64 object-contain"
              />
            )}
            {hasAnswered && (() => {
              const picked = question.answers.find((a) => a.id === selectedAnswer);
              const correct = !!showFeedback?.correct;
              return (
                <div className="mt-5 flex items-center justify-center gap-3 animate-fade-up">
                  <Mascot mood={correct ? "happy" : "surprised"} className="h-16 w-auto" />
                  <span className={`font-display font-bold ${correct ? "text-success" : "text-destructive"}`}>
                    {correct ? "Bien joué !" : "Aïe, raté !"}
                  </span>
                </div>
              );
            })()}
          </div>
          {players.find((p) => p.user_id === userId)?.is_eliminated && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-2xl text-center font-display font-bold">
              💀 Tu es éliminé — observe les autres jusqu'à la fin de la partie.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {question.answers.map((a, i) => {
              const picked = selectedAnswer === a.id;
              const showCorrect = hasAnswered && picked && !!showFeedback?.correct;
              const showWrong = hasAnswered && picked && showFeedback && !showFeedback.correct;
              return (
                <button
                  key={a.id}
                  onClick={() => handlePick(a)}
                  disabled={hasAnswered || timeLeft <= 0}
                  className={`group relative p-5 min-h-[88px] rounded-2xl text-left flex items-center gap-4 transition-all btn-press ${
                    showCorrect ? "bg-success text-white shadow-glow" :
                    showWrong ? "bg-destructive/15 text-destructive border-2 border-destructive" :
                    picked ? `${COLORS[i % 4]} text-white shadow-glow` :
                    `${COLORS[i % 4]} text-white hover:scale-[1.02] disabled:opacity-50`
                  }`}
                >
                  <div className="size-10 rounded-xl bg-white/25 grid place-items-center font-bold shrink-0">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-semibold text-base flex-1">{a.text}</span>
                  {showCorrect && <Check className="size-6" />}
                  {showWrong && <XIcon className="size-6" />}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className={`mt-6 p-5 rounded-2xl flex items-center justify-center gap-3 font-display font-bold text-lg ${
              showFeedback.correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}>
              {showFeedback.correct ? (
                <>
                  <Check className="size-6" />
                  Bonne réponse !
                  <span className="px-2.5 py-1 rounded-full bg-success text-white text-sm">+{showFeedback.points} pts</span>
                </>
              ) : (
                <><XIcon className="size-6" /> Mauvaise réponse</>
              )}
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground text-center">
            {answerCount ?? 0} / {players.length} joueurs ont répondu
            {isHost && (timeLeft > 0 && !everyoneAnswered) && (
              <button
                onClick={async () => {
                  advanceLockRef.current = room.current_question;
                  const next = room.current_question + 1;
                  if (next >= totalQuestions) {
                    await supabase.from("rooms").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", room.id);
                  } else {
                    await supabase.from("rooms").update({
                      current_question: next,
                      question_started_at: new Date().toISOString(),
                    }).eq("id", room.id);
                  }
                }}
                className="ml-3 inline-flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                Forcer la suivante →
              </button>
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 self-start">
          <div className="p-5 bg-card border border-border/60 rounded-2xl">
            <h3 className="font-display font-bold mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-warning" /> Classement
            </h3>
            <div className="space-y-2">
              {sortedPlayers.slice(0, 8).map((p, idx) => {
                const prof = profiles.get(p.user_id);
                const name = prof?.display_name || prof?.username || "Joueur";
                const isMe = p.user_id === userId;
                return (
                  <div key={p.id} className={`flex items-center gap-2.5 p-2 rounded-xl text-sm transition-all ${
                    isMe ? "bg-primary/10 border border-primary/20" : ""
                  } ${p.is_eliminated ? "opacity-50" : ""}`}>
                    <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">{idx + 1}</span>
                    <div className="size-7 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-xs">
                      {name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold flex-1 truncate">{name}</span>
                    {p.is_eliminated && <span className="text-xs">💀</span>}
                    <span className="text-xs font-bold tabular-nums">{p.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ──────────── RESULTS ──────────── */

function Results({ room, players, profiles, isHost }: {
  room: RoomRow; players: PlayerRow[]; profiles: Map<string, ProfileLite>; isHost: boolean;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const xpClaimedRef = useRef(false);
  const pbCheckedRef = useRef(false);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);

  const sorted = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const myRank = sorted.findIndex((p) => p.user_id === user?.id);
  const me = sorted[myRank];

  // Pull all player_answers for this room for mode-specific stats
  const { data: paStats } = useQuery({
    queryKey: ["room-pa-stats", room.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_answers")
        .select("user_id, is_correct, points_earned")
        .eq("room_id", room.id);
      return data ?? [];
    },
  });

  const perPlayer = useMemo(() => {
    const map = new Map<string, { correct: number; total: number; bonus: number }>();
    (paStats ?? []).forEach((a) => {
      const r = map.get(a.user_id) ?? { correct: 0, total: 0, bonus: 0 };
      r.total += 1;
      if (a.is_correct) r.correct += 1;
      r.bonus += a.points_earned;
      map.set(a.user_id, r);
    });
    return map;
  }, [paStats]);

  /**
   * Check personal best on this quiz.
   * If beaten → fire confetti (educational palette: blue / green / amber)
   * and persist the new record.
   */
  useEffect(() => {
    if (!user || !me || pbCheckedRef.current) return;
    pbCheckedRef.current = true;

    (async () => {
      const { data: existing } = await supabase
        .from("personal_bests")
        .select("best_score")
        .eq("user_id", user.id)
        .eq("quiz_id", room.quiz_id)
        .maybeSingle();

      const prevBest = existing?.best_score ?? 0;
      setPreviousBest(prevBest);
      const isNewBest = me.score > prevBest;

      if (isNewBest && me.score > 0) {
        setIsPersonalBest(true);
        // Confetti — soft educational tones, no aggressive colors
        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            origin: { y: 0.65 },
            spread: 70,
            startVelocity: 30,
            colors: ["#3B82F6", "#22C55E", "#F59E0B"],
            ticks: 80,
            ...opts,
            particleCount: Math.floor(180 * particleRatio),
          });
        };
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });

        // Upsert new record
        if (existing) {
          await supabase.from("personal_bests")
            .update({ best_score: me.score, best_mode: room.mode, achieved_at: new Date().toISOString() })
            .eq("user_id", user.id).eq("quiz_id", room.quiz_id);
        } else {
          await supabase.from("personal_bests")
            .insert({ user_id: user.id, quiz_id: room.quiz_id, best_score: me.score, best_mode: room.mode });
        }
      }
    })();
  }, [user, me, room.quiz_id, room.mode]);

  // Claim XP once: 10 XP per point earned (capped)
  useEffect(() => {
    if (!user || !profile || !me || xpClaimedRef.current) return;
    xpClaimedRef.current = true;
    const xpGain = Math.min(2000, Math.round(me.score / 10));
    const coinGain = Math.round(me.score / 50);
    if (xpGain === 0 && coinGain === 0) return;
    (async () => {
      const newXp = profile.xp + xpGain;
      const newLevel = Math.max(profile.level, Math.floor(newXp / 1000) + 1);
      await supabase.from("profiles").update({
        xp: newXp,
        coins: profile.coins + coinGain,
        level: newLevel,
      }).eq("id", user.id);
      refreshProfile();
    })();
  }, [user, profile, me, refreshProfile]);

  /** Instant Replay — recreate a room with the same quiz + mode and join as host. */
  const handleReplay = async () => {
    if (!user || replaying) return;
    setReplaying(true);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          host_id: user.id,
          quiz_id: room.quiz_id,
          mode: room.mode,
          settings: (room.settings ?? {}) as never,
        })
        .select("id, code")
        .single();
      if (error) throw error;
      await supabase.from("room_players")
        .insert({ room_id: newRoom.id, user_id: user.id, is_ready: true });
      // Use replace so the back button doesn't go to the finished room
      navigate({ to: "/room/$code", params: { code: newRoom.code }, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setReplaying(false);
    }
  };

  /** Share score: copy a stylized text + link to clipboard, fall back to native share if available. */
  const handleShare = async () => {
    if (!me) return;
    const url = `${window.location.origin}/join?code=${room.code}`;
    const text = `J'ai marqué ${me.score} pts sur ClassRush (mode ${room.mode}) — rang #${myRank + 1}/${players.length} 🎓\nRejoins-moi : ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mon score ClassRush", text, url });
        return;
      }
    } catch { /* user cancelled */ }
    await navigator.clipboard.writeText(text);
    toast.success("Score copié dans le presse-papiers");
  };

  const topThree = sorted.slice(0, 3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
  const podiumHeights = [120, 160, 96];
  const podiumColors = ["bg-muted-foreground/40", "bg-warning", "bg-warning/60"];
  const medalEmoji = ["🥈", "🥇", "🥉"];

  const eliminatedCount = players.filter((p) => p.is_eliminated).length;
  const survivorCount = players.length - eliminatedCount;
  const myStats = me ? perPlayer.get(me.user_id) : undefined;
  const accuracy = myStats && myStats.total ? Math.round((myStats.correct / myStats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-muted text-sm font-semibold btn-press">
            <Home className="size-4" /> Accueil
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-success/15 text-success text-xs font-bold tracking-wider uppercase">
            <Trophy className="size-3.5" /> Partie terminée
          </span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold">Résultats finaux</h1>
        </div>

        {/* Personal best banner — with victory mascot */}
        {isPersonalBest && me && (
          <section className="p-5 bg-gradient-to-r from-success/10 via-warning/10 to-primary/10 border-2 border-success/30 rounded-3xl text-center animate-fade-up flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Mascot mood="victory" className="h-24 w-auto shrink-0" />
            <div>
              <div className="inline-flex items-center gap-2 text-success font-display font-bold text-lg">
                <Sparkles className="size-5" /> Nouveau record personnel !
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {previousBest !== null && previousBest > 0
                  ? <>Tu passes de <strong>{previousBest}</strong> à <strong>{me.score}</strong> pts sur ce quiz.</>
                  : <>Premier record sur ce quiz : <strong>{me.score}</strong> pts.</>}
              </p>
            </div>
          </section>
        )}

        {/* Podium */}
        {podiumOrder.length > 0 && (
          <section className="flex items-end justify-center gap-3 md:gap-6 pt-8">
            {podiumOrder.map((p, idx) => {
              if (!p) return null;
              const realRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const prof = profiles.get(p.user_id);
              const name = prof?.display_name || prof?.username || "Joueur";
              return (
                <div key={p.id} className="flex flex-col items-center animate-fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="text-3xl mb-2">{medalEmoji[idx]}</div>
                  <div className={`size-16 md:size-20 rounded-full ${podiumColors[idx]} text-white grid place-items-center font-display font-bold text-2xl mb-3 shadow-card`}>
                    {name[0].toUpperCase()}
                  </div>
                  <div className="text-sm font-bold text-center max-w-[100px] truncate">{name}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{p.score} pts</div>
                  <div
                    className={`mt-3 w-24 md:w-32 ${podiumColors[idx]} rounded-t-2xl flex items-start justify-center pt-3 font-display font-bold text-white text-xl`}
                    style={{ height: podiumHeights[idx] }}
                  >
                    #{realRank}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* My result card */}
        {me && (
          <section className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl shadow-glow grid sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs uppercase opacity-80 tracking-wider">Ta position</div>
              <div className="font-display font-bold text-3xl mt-1">#{myRank + 1}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80 tracking-wider">Score</div>
              <div className="font-display font-bold text-3xl mt-1">{me.score}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80 tracking-wider">XP gagné</div>
              <div className="font-display font-bold text-3xl mt-1 inline-flex items-center gap-2">
                <Award className="size-7" />+{Math.min(2000, Math.round(me.score / 10))}
              </div>
            </div>
          </section>
        )}

        {/* Mode-specific stats */}
        {me && (
          <section className="p-6 bg-card border border-border/60 rounded-3xl">
            <h2 className="font-display font-bold mb-4 flex items-center gap-2">
              <Award className="size-5 text-primary" />
              Statistiques — Mode <span className="capitalize text-primary">{room.mode}</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBlock label="Bonnes réponses" value={`${myStats?.correct ?? 0}/${myStats?.total ?? 0}`} />
              <StatBlock label="Précision" value={`${accuracy}%`} accent={accuracy >= 70 ? "success" : accuracy >= 40 ? "warning" : "destructive"} />
              {room.mode === "speedrun" && (
                <StatBlock label="Bonus vitesse" value={`+${Math.max(0, (myStats?.bonus ?? 0) - (myStats?.correct ?? 0) * 100)} pts`} accent="warning" />
              )}
              {room.mode === "survival" && (
                <>
                  <StatBlock label="Statut" value={me.is_eliminated ? "💀 Éliminé" : "🛡️ Survivant"} accent={me.is_eliminated ? "destructive" : "success"} />
                  <StatBlock label="Survivants" value={`${survivorCount}/${players.length}`} />
                </>
              )}
              {room.mode !== "speedrun" && room.mode !== "survival" && (
                <StatBlock label="Points moyens" value={String(Math.round((myStats?.bonus ?? 0) / Math.max(1, myStats?.total ?? 1)))} />
              )}
              <StatBlock label="Joueurs" value={String(players.length)} />
            </div>
          </section>
        )}

        {/* Full leaderboard */}
        <section className="p-6 bg-card border border-border/60 rounded-3xl">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2">
            <Trophy className="size-5 text-warning" /> Classement complet
          </h2>
          <div className="space-y-2">
            {sorted.map((p, idx) => {
              const prof = profiles.get(p.user_id);
              const name = prof?.display_name || prof?.username || "Joueur";
              const isMe = p.user_id === user?.id;
              const ps = perPlayer.get(p.user_id);
              const acc = ps && ps.total ? Math.round((ps.correct / ps.total) * 100) : 0;
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  isMe ? "bg-primary/10 border border-primary/20" : "bg-background"
                }`}>
                  <span className="w-7 text-center font-display font-bold text-muted-foreground">#{idx + 1}</span>
                  <div className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-sm">
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{name} {isMe && <span className="text-xs text-primary">(toi)</span>}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {ps?.correct ?? 0}/{ps?.total ?? 0} bonnes · {acc}%
                      {room.mode === "survival" && p.is_eliminated && " · 💀"}
                    </div>
                  </div>
                  <span className="font-display font-bold tabular-nums">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          {isHost && (
            <button
              onClick={handleReplay}
              disabled={replaying}
              className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-glow btn-press disabled:opacity-60"
            >
              {replaying ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Rejouer
            </button>
          )}
          <button
            onClick={handleShare}
            className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-card border border-border rounded-2xl font-semibold btn-press hover:border-primary"
          >
            <Share2 className="size-4" /> Partager mon score
          </button>
          <Link to="/leaderboard" className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-card border border-border rounded-2xl font-semibold btn-press">
            <Trophy className="size-4" /> Classement global
          </Link>
          <Link to="/play" className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-card border border-border rounded-2xl font-semibold btn-press">
            <PlayCircle className="size-4" /> Autre quiz
          </Link>
          <Link to="/dashboard" className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-muted rounded-2xl font-semibold btn-press">
            <Home className="size-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" | "destructive" }) {
  const tone =
    accent === "success" ? "text-success" :
    accent === "warning" ? "text-warning" :
    accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="p-3 bg-background border border-border rounded-2xl">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display font-bold text-lg mt-0.5 tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
