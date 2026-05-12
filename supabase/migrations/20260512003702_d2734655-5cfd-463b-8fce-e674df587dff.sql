CREATE TABLE public.personal_bests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_mode TEXT,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT personal_bests_unique UNIQUE (user_id, quiz_id)
);

ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_select_own" ON public.personal_bests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pb_insert_own" ON public.personal_bests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pb_update_own" ON public.personal_bests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
