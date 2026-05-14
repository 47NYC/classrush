-- Harden core game, profile, shop, friends, and visibility rules

-- Ensure friend codes are unique and fast to look up
CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_unique ON public.profiles (friend_code);
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_unique
  ON public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
CREATE UNIQUE INDEX IF NOT EXISTS player_answers_once_per_question
  ON public.player_answers (room_id, question_id, user_id);

-- Idempotent reward claims per player and room
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid NOT NULL,
  xp_gain integer NOT NULL DEFAULT 0,
  coin_gain integer NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, room_id)
);
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reward_claims_select_own ON public.reward_claims;
CREATE POLICY reward_claims_select_own ON public.reward_claims
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Helper: room visibility without recursive room_players policies
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players rp
    WHERE rp.room_id = _room_id AND rp.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id AND r.host_id = _user_id
  );
$$;

-- Public-safe profile lookup for UI lists
CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, level integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.level
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
  LIMIT 100;
$$;

-- Public-safe global leaderboard: order privately by XP, expose pseudo + level only
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(rank_position bigint, id uuid, username text, display_name text, level integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_number() OVER (ORDER BY p.xp DESC, p.level DESC, p.created_at ASC) AS rank_position,
         p.id, p.username, p.display_name, p.level
  FROM public.profiles p
  ORDER BY p.xp DESC, p.level DESC, p.created_at ASC
  LIMIT least(greatest(coalesce(_limit, 50), 1), 100);
$$;

-- Friend request by friend code; callers never need direct access to other users' friend codes
CREATE OR REPLACE FUNCTION public.send_friend_request_by_code(_code text)
RETURNS TABLE(friendship_id uuid, target_name text, relationship_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(_code, ''), '[^A-Z0-9]', '', 'g'));
  target public.profiles%ROWTYPE;
  existing public.friendships%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  IF length(normalized) < 4 THEN
    RAISE EXCEPTION 'Code ami invalide';
  END IF;

  SELECT * INTO target FROM public.profiles WHERE friend_code = normalized LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun joueur avec ce code';
  END IF;
  IF target.id = uid THEN
    RAISE EXCEPTION 'Ce code ami est le tien';
  END IF;

  SELECT * INTO existing
  FROM public.friendships f
  WHERE (f.requester_id = uid AND f.addressee_id = target.id)
     OR (f.requester_id = target.id AND f.addressee_id = uid)
  LIMIT 1;

  IF FOUND THEN
    friendship_id := existing.id;
    target_name := coalesce(target.display_name, target.username);
    relationship_status := existing.status::text;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.friendships(requester_id, addressee_id, status)
  VALUES (uid, target.id, 'pending')
  RETURNING id INTO friendship_id;

  target_name := coalesce(target.display_name, target.username);
  relationship_status := 'pending';
  RETURN NEXT;
END;
$$;

-- Client-safe room quiz payload: never returns answers.is_correct
CREATE OR REPLACE FUNCTION public.get_room_quiz(_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  payload jsonb;
BEGIN
  IF uid IS NULL OR NOT public.is_room_member(_room_id, uid) THEN
    RAISE EXCEPTION 'Accès à la room refusé';
  END IF;

  SELECT jsonb_build_object(
    'id', z.id,
    'title', z.title,
    'cover_url', z.cover_url,
    'questions', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'position', q.position,
          'text', q.text,
          'image_url', q.image_url,
          'time_limit', q.time_limit,
          'points', q.points,
          'answers', coalesce((
            SELECT jsonb_agg(
              jsonb_build_object('id', a.id, 'position', a.position, 'text', a.text)
              ORDER BY a.position
            )
            FROM public.answers a
            WHERE a.question_id = q.id
          ), '[]'::jsonb)
        )
        ORDER BY q.position
      )
      FROM public.questions q
      WHERE q.quiz_id = z.id
    ), '[]'::jsonb)
  ) INTO payload
  FROM public.rooms r
  JOIN public.quizzes z ON z.id = r.quiz_id
  WHERE r.id = _room_id;

  RETURN payload;
END;
$$;

-- Authoritative answer submission and score update
CREATE OR REPLACE FUNCTION public.submit_answer(_room_id uuid, _question_id uuid, _answer_id uuid)
RETURNS TABLE(answer_id uuid, is_correct boolean, points_earned integer, total_score integer, is_eliminated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r record;
  q record;
  a record;
  existing record;
  elapsed_seconds numeric;
  speed_ratio numeric;
  speed_factor numeric;
  earned integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  SELECT * INTO r FROM public.rooms WHERE id = _room_id;
  IF NOT FOUND OR r.status <> 'live' THEN
    RAISE EXCEPTION 'La partie nest pas en cours';
  END IF;
  IF NOT public.is_room_member(_room_id, uid) THEN
    RAISE EXCEPTION 'Tu ne fais pas partie de cette room';
  END IF;

  SELECT * INTO existing
  FROM public.player_answers pa
  WHERE pa.room_id = _room_id AND pa.question_id = _question_id AND pa.user_id = uid
  LIMIT 1;
  IF FOUND THEN
    SELECT rp.score, rp.is_eliminated INTO total_score, is_eliminated
    FROM public.room_players rp WHERE rp.room_id = _room_id AND rp.user_id = uid;
    answer_id := existing.answer_id;
    is_correct := existing.is_correct;
    points_earned := existing.points_earned;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO q FROM public.questions WHERE id = _question_id AND quiz_id = r.quiz_id;
  IF NOT FOUND OR q.position <> r.current_question THEN
    RAISE EXCEPTION 'Question invalide';
  END IF;

  SELECT * INTO a FROM public.answers WHERE id = _answer_id AND question_id = _question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réponse invalide';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.room_players rp
    WHERE rp.room_id = _room_id AND rp.user_id = uid AND rp.is_eliminated = true
  ) THEN
    RAISE EXCEPTION 'Tu es éliminé';
  END IF;

  elapsed_seconds := greatest(0, extract(epoch FROM (now() - coalesce(r.question_started_at, now()))));
  speed_ratio := greatest(0, least(1, (q.time_limit::numeric - elapsed_seconds) / greatest(q.time_limit, 1)));
  IF r.mode = 'speedrun' THEN
    speed_factor := 0.25 + 1.5 * speed_ratio;
  ELSIF r.mode = 'survival' THEN
    speed_factor := 0.5 + 0.5 * speed_ratio;
  ELSE
    speed_factor := 0.5 + 0.5 * speed_ratio;
  END IF;

  IF a.is_correct THEN
    earned := round(q.points * speed_factor)::integer;
  END IF;

  PERFORM set_config('app.bypass_room_player_guard', 'on', true);

  INSERT INTO public.player_answers(room_id, user_id, question_id, answer_id, is_correct, points_earned)
  VALUES (_room_id, uid, _question_id, _answer_id, a.is_correct, earned)
  ON CONFLICT (room_id, question_id, user_id) DO NOTHING;

  UPDATE public.room_players rp
  SET score = rp.score + earned,
      is_eliminated = CASE WHEN r.mode = 'survival' AND NOT a.is_correct THEN true ELSE rp.is_eliminated END
  WHERE rp.room_id = _room_id AND rp.user_id = uid
  RETURNING rp.score, rp.is_eliminated INTO total_score, is_eliminated;

  answer_id := _answer_id;
  is_correct := a.is_correct;
  points_earned := earned;
  RETURN NEXT;
END;
$$;

-- Idempotent personal best recording from the protected room score
CREATE OR REPLACE FUNCTION public.record_personal_best(_room_id uuid)
RETURNS TABLE(is_personal_best boolean, previous_best integer, current_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r record;
  score_now integer;
  prior integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO r FROM public.rooms WHERE id = _room_id;
  IF NOT FOUND OR r.status <> 'finished' THEN RAISE EXCEPTION 'Partie non terminée'; END IF;
  SELECT rp.score INTO score_now FROM public.room_players rp WHERE rp.room_id = _room_id AND rp.user_id = uid;
  IF score_now IS NULL THEN RAISE EXCEPTION 'Score introuvable'; END IF;

  SELECT pb.best_score INTO prior FROM public.personal_bests pb WHERE pb.user_id = uid AND pb.quiz_id = r.quiz_id;
  prior := coalesce(prior, 0);
  previous_best := prior;
  current_score := score_now;
  is_personal_best := score_now > prior AND score_now > 0;

  IF is_personal_best THEN
    INSERT INTO public.personal_bests(user_id, quiz_id, best_score, best_mode, achieved_at)
    VALUES (uid, r.quiz_id, score_now, r.mode::text, now())
    ON CONFLICT (user_id, quiz_id) DO UPDATE
      SET best_score = EXCLUDED.best_score,
          best_mode = EXCLUDED.best_mode,
          achieved_at = EXCLUDED.achieved_at
      WHERE public.personal_bests.best_score < EXCLUDED.best_score;
  END IF;
  RETURN NEXT;
END;
$$;

-- Idempotent reward claim from protected room score
CREATE OR REPLACE FUNCTION public.claim_game_rewards(_room_id uuid)
RETURNS TABLE(xp_gain integer, coin_gain integer, new_xp integer, new_level integer, new_coins integer, already_claimed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r_status room_status;
  score_now integer;
  claim public.reward_claims%ROWTYPE;
  prof public.profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT status INTO r_status FROM public.rooms WHERE id = _room_id;
  IF r_status IS NULL OR r_status <> 'finished' THEN RAISE EXCEPTION 'Partie non terminée'; END IF;

  SELECT * INTO claim FROM public.reward_claims WHERE room_id = _room_id AND user_id = uid;
  IF FOUND THEN
    SELECT * INTO prof FROM public.profiles WHERE id = uid;
    xp_gain := claim.xp_gain;
    coin_gain := claim.coin_gain;
    new_xp := prof.xp;
    new_level := prof.level;
    new_coins := prof.coins;
    already_claimed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT rp.score INTO score_now FROM public.room_players rp WHERE rp.room_id = _room_id AND rp.user_id = uid;
  IF score_now IS NULL THEN RAISE EXCEPTION 'Score introuvable'; END IF;

  xp_gain := least(2000, round(score_now / 10.0)::integer);
  coin_gain := round(score_now / 50.0)::integer;

  INSERT INTO public.reward_claims(user_id, room_id, xp_gain, coin_gain)
  VALUES (uid, _room_id, xp_gain, coin_gain)
  RETURNING * INTO claim;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles p
  SET xp = p.xp + xp_gain,
      coins = p.coins + coin_gain,
      level = greatest(p.level, floor((p.xp + xp_gain) / 1000.0)::integer + 1)
  WHERE p.id = uid
  RETURNING * INTO prof;

  new_xp := prof.xp;
  new_level := prof.level;
  new_coins := prof.coins;
  already_claimed := false;
  RETURN NEXT;
END;
$$;

-- Atomic shop purchase
CREATE OR REPLACE FUNCTION public.purchase_item(_item_id uuid)
RETURNS TABLE(ok boolean, message text, coins_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_items%ROWTYPE;
  prof public.profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO item FROM public.shop_items WHERE id = _item_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Objet introuvable'; END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;

  IF EXISTS (SELECT 1 FROM public.user_inventory ui WHERE ui.user_id = uid AND ui.item_id = _item_id) THEN
    ok := true; message := 'Déjà possédé'; coins_remaining := prof.coins; RETURN NEXT; RETURN;
  END IF;

  IF prof.coins < item.price THEN
    RAISE EXCEPTION 'Pas assez de pièces';
  END IF;

  INSERT INTO public.user_inventory(user_id, item_id) VALUES (uid, _item_id);

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles p SET coins = p.coins - item.price WHERE p.id = uid RETURNING * INTO prof;

  ok := true; message := 'Achat validé'; coins_remaining := prof.coins; RETURN NEXT;
END;
$$;

-- Guards against direct sensitive profile and score manipulation
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_direct_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_profile_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.display_name IS NOT NULL THEN
    NEW.display_name := nullif(trim(NEW.display_name), '');
    IF NEW.display_name IS NOT NULL AND length(NEW.display_name) > 40 THEN
      RAISE EXCEPTION 'Pseudo trop long';
    END IF;
  END IF;

  IF NEW.coins IS DISTINCT FROM OLD.coins
     OR NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.friend_code IS DISTINCT FROM OLD.friend_code
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'Champ de profil protégé';
  END IF;

  IF NEW.equipped_avatar_item IS DISTINCT FROM OLD.equipped_avatar_item AND NEW.equipped_avatar_item IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_inventory ui
      JOIN public.shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = NEW.id AND ui.item_id = NEW.equipped_avatar_item AND si.category = 'avatar'
    ) THEN
      RAISE EXCEPTION 'Avatar non possédé';
    END IF;
  END IF;

  IF NEW.equipped_theme_item IS DISTINCT FROM OLD.equipped_theme_item AND NEW.equipped_theme_item IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_inventory ui
      JOIN public.shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = NEW.id AND ui.item_id = NEW.equipped_theme_item AND si.category = 'theme'
    ) THEN
      RAISE EXCEPTION 'Thème non possédé';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sensitive_guard ON public.profiles;
CREATE TRIGGER profiles_sensitive_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_direct_update();

CREATE OR REPLACE FUNCTION public.prevent_room_player_score_direct_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_room_player_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score OR NEW.is_eliminated IS DISTINCT FROM OLD.is_eliminated THEN
    RAISE EXCEPTION 'Score protégé';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_players_score_guard ON public.room_players;
CREATE TRIGGER room_players_score_guard
BEFORE UPDATE ON public.room_players
FOR EACH ROW EXECUTE FUNCTION public.prevent_room_player_score_direct_update();

-- RLS tightening
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS answers_select ON public.answers;
DROP POLICY IF EXISTS answers_select_owner ON public.answers;
CREATE POLICY answers_select_owner ON public.answers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.quizzes z ON z.id = q.quiz_id
    WHERE q.id = answers.question_id AND z.creator_id = auth.uid()
  ));

DROP POLICY IF EXISTS pa_insert_self ON public.player_answers;
DROP POLICY IF EXISTS pa_select_room ON public.player_answers;
CREATE POLICY pa_select_room_participants ON public.player_answers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS rp_select_room ON public.room_players;
CREATE POLICY rp_select_room_participants ON public.room_players
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS inventory_select_all ON public.user_inventory;
DROP POLICY IF EXISTS inventory_insert_self ON public.user_inventory;
CREATE POLICY inventory_select_own ON public.user_inventory
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS friendships_update_involved ON public.friendships;
DROP POLICY IF EXISTS friendships_update_addressee ON public.friendships;
CREATE POLICY friendships_update_addressee ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS pb_insert_own ON public.personal_bests;
DROP POLICY IF EXISTS pb_update_own ON public.personal_bests;

-- Storage: keep public URLs usable, but prevent broad authenticated listing via the API
DROP POLICY IF EXISTS quiz_images_public_read ON storage.objects;
DROP POLICY IF EXISTS quiz_images_owner_read ON storage.objects;
CREATE POLICY quiz_images_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quiz-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function execution grants
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_global_leaderboard(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_friend_request_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_room_quiz(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_answer(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_personal_best(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_game_rewards(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_item(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_sensitive_direct_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_room_player_score_direct_update() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_personal_best(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_game_rewards(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(uuid) TO authenticated;

-- Convert harmless helpers away from SECURITY DEFINER where possible
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;