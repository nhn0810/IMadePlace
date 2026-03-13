-- Start of Supabase Migration Script for Project Tags & Recruitment Mechanics

-- 1. Add new columns to the Existing 'posts' table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS recruitment_end_date TIMESTAMPTZ;

-- 2. Create the 'project_participants' recruitment queue table
CREATE TABLE IF NOT EXISTS public.project_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    UNIQUE(post_id, user_id)
);

-- 3. Enable RLS on the new table
ALTER TABLE public.project_participants ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for project_participants
-- Anyone can see participants
CREATE POLICY "Anyone can view project participants" 
ON public.project_participants FOR SELECT 
USING (true);

-- Users can insert themselves into the queue (applying to join)
CREATE POLICY "Users can insert themselves" 
ON public.project_participants FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Post authors can delete or update participant status
CREATE POLICY "Post authors can manage participants" 
ON public.project_participants FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = project_participants.post_id 
    AND author_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own application" 
ON public.project_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Post authors can remove participants" 
ON public.project_participants FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = project_participants.post_id 
    AND author_id = auth.uid()
  )
);
