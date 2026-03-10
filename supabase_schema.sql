-- 1. Create Enums safely
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('master', 'admin', 'user', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_category AS ENUM ('imade', 'youmake', 'iuse');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_status AS ENUM ('waiting', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  auto_login_consent BOOLEAN DEFAULT FALSE,
  banned_until TIMESTAMPTZ, -- If set to future or '9999-12-31', user is banned
  ban_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category post_category NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status post_status DEFAULT 'waiting',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 6. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Visit Stats Table
CREATE TABLE IF NOT EXISTS public.visit_stats (
  visit_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  total_visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0
);

-- 7.5 Create Blocks Table (For DM Blocking)
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- 8. Trigger for Auto-Profile Creation and 'Master' Role assignment
-- (TRIGGER REMOVED: Now handled by Next.js Callback to prevent OAuth Database Errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 9. Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read profiles. Users can update their own profile.
CREATE POLICY "Profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Posts: 
-- Read: Everyone can read
CREATE POLICY "Posts are viewable by everyone." 
  ON public.posts FOR SELECT USING (true);

-- Insert: 
--  Banned users CANNOT insert.
--  'imade' -> Master/Admin only
--  'youmake' -> Master/Admin/User
--  'iuse' -> Master/Admin/User
CREATE POLICY "Users can insert posts based on category." 
  ON public.posts FOR INSERT WITH CHECK (
    auth.uid() = author_id AND 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (banned_until IS NULL OR banned_until <= NOW()))) AND
    (
      (category = 'imade' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin')))) OR
      (category IN ('youmake', 'iuse') AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin', 'user'))))
    )
  );

-- Update: 
-- Author can update their own post (if not banned).
-- Admin/Master can update any post's status in 'youmake'.
CREATE POLICY "Users can update their own posts or admins can update status." 
  ON public.posts FOR UPDATE USING (
    (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (banned_until IS NULL OR banned_until <= NOW()))) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );

-- Delete: 
-- Author can delete their own post. Master/Admin can delete any post.
CREATE POLICY "Users can delete their own or admin can delete any." 
  ON public.posts FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );

-- Comments:
-- Read: Everyone can read.
-- Insert: Master/Admin/User can insert, provided they are not banned.
CREATE POLICY "Comments are viewable by everyone." 
  ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments." 
  ON public.comments FOR INSERT WITH CHECK (
    auth.uid() = author_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin', 'user') AND (banned_until IS NULL OR banned_until <= NOW()))
  );
-- Delete: Author or Admin/Master.
CREATE POLICY "Users can delete own comments or admin can delete any." 
  ON public.comments FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );

-- Likes:
-- Read: Everyone
-- Insert/Delete: Master/Admin/User can like.
CREATE POLICY "Likes are viewable by everyone." 
  ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can give likes." 
  ON public.likes FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin', 'user'))
  );
CREATE POLICY "Users can remove their likes." 
  ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Messages:
-- Users can read/insert messages they sent or received.
CREATE POLICY "Users can access their own messages." 
  ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Users can send messages IF:
-- 1. They are authenticated.
-- 2. AND (They are NOT banned OR they are sending to a 'master')
-- 3. AND (They are NOT blocked by the receiver OR the sender is a master/admin)
CREATE POLICY "Users can send messages." 
  ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin', 'user')) AND
    (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (banned_until IS NULL OR banned_until <= NOW())) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = receiver_id AND role = 'master')
    ) AND
    (
      NOT EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = receiver_id AND blocked_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin'))
    )
  );

-- Blocks:
-- Read: Everyone can read their own blocks.
CREATE POLICY "Users can see blocks they created or are affected by." 
  ON public.blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
-- Insert: Anyone can block anyone, except they cannot block Master/Admin
CREATE POLICY "Users can block others except admins." 
  ON public.blocks FOR INSERT WITH CHECK (
    auth.uid() = blocker_id AND 
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = blocked_id AND role IN ('master', 'admin'))
  );
-- Delete: Only the blocker can unblock
CREATE POLICY "Blockers can unblock." 
  ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);
