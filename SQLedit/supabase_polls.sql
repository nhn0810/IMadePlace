-- 1. Create the 'poll_votes' table
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    block_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, block_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Anyone can view poll votes" 
ON public.poll_votes FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their vote" 
ON public.poll_votes FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their vote" 
ON public.poll_votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their vote" 
ON public.poll_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
