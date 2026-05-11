create table public.player_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete set null,
  is_correct boolean not null default false,
  points_earned int not null default 0,
  answered_at timestamptz not null default now(),
  unique (room_id, user_id, question_id)
);

alter table public.player_answers enable row level security;

create index player_answers_room_idx on public.player_answers(room_id, question_id);

-- Anyone in the room can read (needed for leaderboard / spectators)
create policy "pa_select_room" on public.player_answers for select
  to authenticated using (true);

-- Only insert own answer; cannot update or delete (lock-in)
create policy "pa_insert_self" on public.player_answers for insert
  to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.room_players rp
      where rp.room_id = player_answers.room_id and rp.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.player_answers;