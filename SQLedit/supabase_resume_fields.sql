-- Add Resume/Portfolio fields to Profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intro_sections JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS allows users to update these fields (already covered by "Users can update their own profile" policy, but good to verify)
-- Policy "Users can update their own profile." 
-- ON public.profiles FOR UPDATE USING (auth.uid() = id);
