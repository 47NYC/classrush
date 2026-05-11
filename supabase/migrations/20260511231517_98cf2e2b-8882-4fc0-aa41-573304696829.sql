
-- ============ ENUM EXTENSIONS ============
ALTER TYPE public.game_mode ADD VALUE IF NOT EXISTS 'survival';
ALTER TYPE public.game_mode ADD VALUE IF NOT EXISTS 'speedrun';

-- ============ FRIENDSHIPS ============
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');

CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_involved" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships_insert_self" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friendships_update_involved" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships_delete_involved" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER friendships_set_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

-- ============ ROOM INVITES ============
CREATE TABLE public.room_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  room_code TEXT NOT NULL,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_involved" ON public.room_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "invites_insert_self" ON public.room_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "invites_update_to_user" ON public.room_invites
  FOR UPDATE TO authenticated
  USING (auth.uid() = to_user OR auth.uid() = from_user);

CREATE POLICY "invites_delete_involved" ON public.room_invites
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites;

-- ============ SHOP ============
CREATE TYPE public.item_category AS ENUM ('avatar', 'theme', 'badge', 'frame');
CREATE TYPE public.item_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category public.item_category NOT NULL,
  rarity public.item_rarity NOT NULL DEFAULT 'common',
  price INTEGER NOT NULL DEFAULT 100,
  preview_emoji TEXT,
  preview_color TEXT, -- e.g. "#FF6B6B" or oklch string for themes
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_items_select_all" ON public.shop_items
  FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_inventory_unique UNIQUE (user_id, item_id)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_select_all" ON public.user_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inventory_insert_self" ON public.user_inventory
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Equipped slots on profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_avatar_item UUID,
  ADD COLUMN IF NOT EXISTS equipped_theme_item UUID;

-- ============ SEED SHOP ============
INSERT INTO public.shop_items (slug, name, description, category, rarity, price, preview_emoji, preview_color) VALUES
  ('avatar-fox', 'Renard malin', 'Un avatar pour les rusés.', 'avatar', 'common', 200, '🦊', '#F97316'),
  ('avatar-owl', 'Hibou savant', 'Pour les studieux.', 'avatar', 'common', 200, '🦉', '#7C3AED'),
  ('avatar-rocket', 'Fusée éclair', 'Vitesse de la lumière.', 'avatar', 'rare', 500, '🚀', '#EF4444'),
  ('avatar-crown', 'Roi du quiz', 'Réservé aux légendes.', 'avatar', 'legendary', 2500, '👑', '#FACC15'),
  ('avatar-ninja', 'Ninja silencieux', 'Discret mais redoutable.', 'avatar', 'epic', 1200, '🥷', '#0EA5E9'),
  ('avatar-unicorn', 'Licorne magique', 'Brille de mille feux.', 'avatar', 'epic', 1200, '🦄', '#EC4899'),
  ('theme-ocean', 'Thème Océan', 'Dégradé bleu profond.', 'theme', 'rare', 600, '🌊', '#0EA5E9'),
  ('theme-sunset', 'Thème Coucher de soleil', 'Orange et rose.', 'theme', 'rare', 600, '🌅', '#F97316'),
  ('theme-forest', 'Thème Forêt', 'Verts naturels.', 'theme', 'common', 300, '🌲', '#16A34A'),
  ('theme-galaxy', 'Thème Galaxie', 'Violet cosmique.', 'theme', 'legendary', 2000, '🌌', '#7C3AED'),
  ('badge-streak', 'Badge Série', 'Pour les acharnés.', 'badge', 'common', 150, '🔥', '#EF4444'),
  ('badge-genius', 'Badge Génie', 'Cerveau au top.', 'badge', 'epic', 1000, '🧠', '#A855F7'),
  ('frame-gold', 'Cadre doré', 'Encadre ton avatar en or.', 'frame', 'epic', 1500, '✨', '#FACC15')
ON CONFLICT (slug) DO NOTHING;

-- ============ STORAGE: quiz-images bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "quiz_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'quiz-images');

CREATE POLICY "quiz_images_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quiz-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "quiz_images_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'quiz-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "quiz_images_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quiz-images' AND auth.uid()::text = (storage.foldername(name))[1]);
