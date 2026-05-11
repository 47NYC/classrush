import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, Check, GripVertical,
  Globe, Lock, Clock, Award,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId")({
  head: () => ({
    meta: [
      { title: "Éditeur de quiz — ClassRush" },
    ],
  }),
  component: QuizEditor,
});

type QuizMeta = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: "easy" | "medium" | "hard";
  is_public: boolean;
};

type AnswerRow = {
  id: string;
  question_id: string;
  position: number;
  text: string;
  is_correct: boolean;
};

type QuestionRow = {
  id: string;
  quiz_id: string;
  position: number;
  text: string;
  time_limit: number;
  points: number;
  answers: AnswerRow[];
};

const DIFFICULTIES: QuizMeta["difficulty"][] = ["easy", "medium", "hard"];

function QuizEditor() {
  const { quizId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-editor", quizId],
    queryFn: async () => {
      const { data: quiz, error: qErr } = await supabase
        .from("quizzes")
        .select("id, title, description, category, difficulty, is_public")
        .eq("id", quizId)
        .single();
      if (qErr) throw qErr;

      const { data: questions, error: qsErr } = await supabase
        .from("questions")
        .select("id, quiz_id, position, text, time_limit, points, answers(id, question_id, position, text, is_correct)")
        .eq("quiz_id", quizId)
        .order("position");
      if (qsErr) throw qsErr;

      const sorted: QuestionRow[] = (questions ?? []).map((q) => ({
        ...q,
        answers: [...(q.answers ?? [])].sort((a, b) => a.position - b.position),
      })) as QuestionRow[];

      return { quiz: quiz as QuizMeta, questions: sorted };
    },
  });

  const [meta, setMeta] = useState<QuizMeta | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setMeta(data.quiz);
      setQuestions(data.questions);
      setDirty(false);
    }
  }, [data]);

  const updateMeta = <K extends keyof QuizMeta>(key: K, value: QuizMeta[K]) => {
    setMeta((m) => (m ? { ...m, [key]: value } : m));
    setDirty(true);
  };

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      {
        id: `new-${crypto.randomUUID()}`,
        quiz_id: quizId,
        position: qs.length,
        text: "",
        time_limit: 20,
        points: 100,
        answers: [
          { id: `new-${crypto.randomUUID()}`, question_id: "", position: 0, text: "", is_correct: true },
          { id: `new-${crypto.randomUUID()}`, question_id: "", position: 1, text: "", is_correct: false },
          { id: `new-${crypto.randomUUID()}`, question_id: "", position: 2, text: "", is_correct: false },
          { id: `new-${crypto.randomUUID()}`, question_id: "", position: 3, text: "", is_correct: false },
        ],
      },
    ]);
    setDirty(true);
  };

  const removeQuestion = (qid: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== qid).map((q, i) => ({ ...q, position: i })));
    setDirty(true);
  };

  const updateQuestion = (qid: string, patch: Partial<QuestionRow>) => {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
    setDirty(true);
  };

  const updateAnswer = (qid: string, aid: string, patch: Partial<AnswerRow>) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id !== qid
          ? q
          : { ...q, answers: q.answers.map((a) => (a.id === aid ? { ...a, ...patch } : a)) }
      )
    );
    setDirty(true);
  };

  const setCorrect = (qid: string, aid: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id !== qid
          ? q
          : { ...q, answers: q.answers.map((a) => ({ ...a, is_correct: a.id === aid })) }
      )
    );
    setDirty(true);
  };

  const handleSave = async () => {
    if (!meta) return;
    if (!meta.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        toast.error("Toutes les questions doivent avoir un énoncé");
        return;
      }
      const filled = q.answers.filter((a) => a.text.trim()).length;
      if (filled < 2) {
        toast.error("Chaque question a besoin d'au moins 2 réponses");
        return;
      }
      if (!q.answers.some((a) => a.is_correct && a.text.trim())) {
        toast.error("Chaque question doit avoir une bonne réponse");
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Update quiz meta
      const { error: metaErr } = await supabase
        .from("quizzes")
        .update({
          title: meta.title.trim(),
          description: meta.description?.trim() || null,
          category: meta.category?.trim() || null,
          difficulty: meta.difficulty,
          is_public: meta.is_public,
        })
        .eq("id", quizId);
      if (metaErr) throw metaErr;

      // 2. Delete removed questions (cascade-ish: delete answers first)
      const existingIds = (data?.questions ?? []).map((q) => q.id);
      const keptIds = questions.filter((q) => !q.id.startsWith("new-")).map((q) => q.id);
      const toDelete = existingIds.filter((id) => !keptIds.includes(id));
      if (toDelete.length) {
        await supabase.from("answers").delete().in("question_id", toDelete);
        await supabase.from("questions").delete().in("id", toDelete);
      }

      // 3. Upsert questions one-by-one to preserve answers cleanly
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const isNew = q.id.startsWith("new-");
        let questionId = q.id;

        if (isNew) {
          const { data: ins, error: insErr } = await supabase
            .from("questions")
            .insert({
              quiz_id: quizId,
              position: i,
              text: q.text.trim(),
              time_limit: q.time_limit,
              points: q.points,
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          questionId = ins.id;
        } else {
          const { error: updErr } = await supabase
            .from("questions")
            .update({
              position: i,
              text: q.text.trim(),
              time_limit: q.time_limit,
              points: q.points,
            })
            .eq("id", q.id);
          if (updErr) throw updErr;
        }

        // Replace all answers for this question (simpler than diffing)
        await supabase.from("answers").delete().eq("question_id", questionId);
        const validAnswers = q.answers
          .filter((a) => a.text.trim())
          .map((a, idx) => ({
            question_id: questionId,
            position: idx,
            text: a.text.trim(),
            is_correct: a.is_correct,
          }));
        if (validAnswers.length) {
          const { error: aErr } = await supabase.from("answers").insert(validAnswers);
          if (aErr) throw aErr;
        }
      }

      toast.success("Quiz enregistré");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["quiz-editor", quizId] });
      queryClient.invalidateQueries({ queryKey: ["my-quizzes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !meta) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <main className="flex-1 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <main className="flex-1 p-10">
          <p className="text-destructive">Quiz introuvable.</p>
          <Link to="/quizzes" className="text-primary text-sm">← Retour</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border/60">
          <div className="px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
            <Link to="/quizzes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Mes quiz
            </Link>
            <div className="flex items-center gap-3">
              {dirty && <span className="text-xs text-muted-foreground hidden sm:inline">Modifications non enregistrées</span>}
              <button
                onClick={() => updateMeta("is_public", !meta.is_public)}
                className="inline-flex items-center gap-2 h-10 px-4 bg-card border border-border rounded-2xl text-sm font-semibold btn-press"
              >
                {meta.is_public ? <Globe className="size-4 text-success" /> : <Lock className="size-4" />}
                {meta.is_public ? "Public" : "Privé"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold shadow-glow btn-press disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
          {/* Meta */}
          <section className="p-6 bg-card border border-border/60 rounded-2xl space-y-4">
            <input
              type="text"
              value={meta.title}
              onChange={(e) => updateMeta("title", e.target.value)}
              placeholder="Titre du quiz"
              className="w-full bg-transparent outline-none font-display text-2xl font-bold placeholder:text-muted-foreground/40"
            />
            <textarea
              value={meta.description ?? ""}
              onChange={(e) => updateMeta("description", e.target.value)}
              placeholder="Décrivez votre quiz en quelques mots…"
              rows={2}
              className="w-full bg-transparent outline-none text-sm resize-none placeholder:text-muted-foreground/60"
            />
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Catégorie</span>
                <input
                  type="text"
                  value={meta.category ?? ""}
                  onChange={(e) => updateMeta("category", e.target.value)}
                  placeholder="Maths, Géo…"
                  className="h-9 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Difficulté</span>
                <div className="inline-flex bg-background border border-border rounded-xl p-0.5">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => updateMeta("difficulty", d)}
                      className={`px-3 h-8 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        meta.difficulty === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d === "easy" ? "Facile" : d === "medium" ? "Moyen" : "Difficile"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                index={idx}
                question={q}
                onChange={(patch) => updateQuestion(q.id, patch)}
                onAnswerChange={(aid, patch) => updateAnswer(q.id, aid, patch)}
                onSetCorrect={(aid) => setCorrect(q.id, aid)}
                onDelete={() => removeQuestion(q.id)}
              />
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="w-full h-14 inline-flex items-center justify-center gap-2 bg-card border-2 border-dashed border-border rounded-2xl font-semibold text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="size-4" /> Ajouter une question
          </button>

          {questions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Commencez par ajouter une question.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function QuestionCard({
  index, question, onChange, onAnswerChange, onSetCorrect, onDelete,
}: {
  index: number;
  question: QuestionRow;
  onChange: (patch: Partial<QuestionRow>) => void;
  onAnswerChange: (aid: string, patch: Partial<AnswerRow>) => void;
  onSetCorrect: (aid: string) => void;
  onDelete: () => void;
}) {
  const COLORS = [
    "bg-primary text-primary-foreground",
    "bg-warning text-white",
    "bg-success text-white",
    "bg-destructive text-white",
  ];
  return (
    <article className="p-5 bg-card border border-border/60 rounded-2xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center text-muted-foreground">
          <GripVertical className="size-4" />
          <div className="mt-2 size-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">
            {index + 1}
          </div>
        </div>
        <input
          type="text"
          value={question.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Énoncé de la question…"
          className="flex-1 bg-transparent outline-none font-semibold text-base placeholder:text-muted-foreground/50"
        />
        <button
          onClick={onDelete}
          className="size-9 grid place-items-center bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20"
          aria-label="Supprimer la question"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pl-10">
        <label className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <input
            type="number"
            min={5}
            max={120}
            value={question.time_limit}
            onChange={(e) => onChange({ time_limit: Number(e.target.value) || 20 })}
            className="w-14 h-7 px-2 bg-background border border-border rounded-md text-center tabular-nums outline-none focus:border-primary"
          />
          sec
        </label>
        <label className="inline-flex items-center gap-1.5">
          <Award className="size-3.5" />
          <input
            type="number"
            min={10}
            max={2000}
            step={10}
            value={question.points}
            onChange={(e) => onChange({ points: Number(e.target.value) || 100 })}
            className="w-16 h-7 px-2 bg-background border border-border rounded-md text-center tabular-nums outline-none focus:border-primary"
          />
          pts
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 pl-10">
        {question.answers.map((a, i) => (
          <div
            key={a.id}
            className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-colors ${
              a.is_correct ? "border-success bg-success/5" : "border-border bg-background"
            }`}
          >
            <div className={`size-8 rounded-lg grid place-items-center font-bold text-xs shrink-0 ${COLORS[i % 4]}`}>
              {String.fromCharCode(65 + i)}
            </div>
            <input
              type="text"
              value={a.text}
              onChange={(e) => onAnswerChange(a.id, { text: e.target.value })}
              placeholder={`Réponse ${String.fromCharCode(65 + i)}`}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm"
            />
            <button
              onClick={() => onSetCorrect(a.id)}
              className={`size-7 rounded-md grid place-items-center shrink-0 transition-colors ${
                a.is_correct
                  ? "bg-success text-white"
                  : "bg-muted text-muted-foreground hover:bg-success/20 hover:text-success"
              }`}
              aria-label="Marquer comme bonne réponse"
              title="Marquer comme bonne réponse"
            >
              <Check className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}
