-- 1. Add comment privacy flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_comments BOOLEAN DEFAULT FALSE;

-- 2. Add status message (reason) to project applicants
ALTER TABLE public.project_participants ADD COLUMN IF NOT EXISTS status_message TEXT;
