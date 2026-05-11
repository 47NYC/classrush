-- ENUMS
create type public.app_role as enum ('user', 'teacher', 'admin');
create type public.game_mode as enum ('classic', 'survival', 'team', 'speed', 'boss', 'race', 'treasure', 'arena', 'chaos', 'tournament');
create type public.room_status as enum ('lobby', 'live', 'finished', 'cancelled');
create type public.difficulty as enum ('easy', 'medium', 'hard');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  level int not null default 1,
  xp int not null default 0,
  coins int not null default 0,
  friend_code text unique not null default upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8)),
  referral_code text unique not null default upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8)),
  referred_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- USER ROLES (separate, never on profile)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- QUIZZES
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  category text,
  difficulty public.difficulty not null default 'medium',
  is_public boolean not null default true,
  plays_count int not null default 0,
  likes_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.quizzes enable row level security;

-- QUESTIONS
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position int not null default 0,
  text text not null,
  image_url text,
  time_limit int not null default 20,
  points int not null default 100,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create index questions_quiz_idx on public.questions(quiz_id, position);

-- ANSWERS
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  position int not null default 0,
  text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.answers enable row level security;
create index answers_question_idx on public.answers(question_id, position);

-- ROOMS
create or replace function public.generate_room_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default public.generate_room_code(),
  host_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  mode public.game_mode not null default 'classic',
  status public.room_status not null default 'lobby',
  is_private boolean not null default false,
  max_players int not null default 30,
  current_question int not null default 0,
  question_started_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table public.rooms enable row level security;
create index rooms_code_idx on public.rooms(code);

-- ROOM PLAYERS
create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  is_ready boolean not null default false,
  is_eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);
alter table public.room_players enable row level security;
create index room_players_room_idx on public.room_players(room_id);

-- TRIGGERS: auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger quizzes_updated before update on public.quizzes
  for each row execute function public.set_updated_at();

-- AUTO-CREATE PROFILE + ROLE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user'
  );
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', final_username),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS POLICIES

-- profiles: anyone authenticated can read public fields; user can update own
create policy "profiles_select_all" on public.profiles for select
  to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update
  to authenticated using (auth.uid() = id);

-- user_roles: user can read own roles; only admins manage
create policy "roles_select_own" on public.user_roles for select
  to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "roles_admin_manage" on public.user_roles for all
  to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- quizzes: read public OR own; CRUD own
create policy "quizzes_select_public_or_own" on public.quizzes for select
  to authenticated using (is_public = true or creator_id = auth.uid());
create policy "quizzes_insert_own" on public.quizzes for insert
  to authenticated with check (creator_id = auth.uid());
create policy "quizzes_update_own" on public.quizzes for update
  to authenticated using (creator_id = auth.uid());
create policy "quizzes_delete_own" on public.quizzes for delete
  to authenticated using (creator_id = auth.uid());

-- questions: visible if quiz visible; CRUD if quiz owner
create policy "questions_select" on public.questions for select
  to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id
      and (q.is_public = true or q.creator_id = auth.uid()))
  );
create policy "questions_modify_owner" on public.questions for all
  to authenticated using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.creator_id = auth.uid())
  );

-- answers: same rule as questions
create policy "answers_select" on public.answers for select
  to authenticated using (
    exists (
      select 1 from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_id and (z.is_public = true or z.creator_id = auth.uid())
    )
  );
create policy "answers_modify_owner" on public.answers for all
  to authenticated using (
    exists (
      select 1 from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_id and z.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_id and z.creator_id = auth.uid()
    )
  );

-- rooms: visible to host or any authenticated user (so they can join by code)
create policy "rooms_select_all" on public.rooms for select
  to authenticated using (true);
create policy "rooms_insert_own" on public.rooms for insert
  to authenticated with check (host_id = auth.uid());
create policy "rooms_update_host" on public.rooms for update
  to authenticated using (host_id = auth.uid());
create policy "rooms_delete_host" on public.rooms for delete
  to authenticated using (host_id = auth.uid());

-- room_players: see all in same room; insert/update self
create policy "rp_select_room" on public.room_players for select
  to authenticated using (true);
create policy "rp_insert_self" on public.room_players for insert
  to authenticated with check (user_id = auth.uid());
create policy "rp_update_self_or_host" on public.room_players for update
  to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid())
  );
create policy "rp_delete_self_or_host" on public.room_players for delete
  to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid())
  );

-- REALTIME
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;