-- Add visibility toggle for resume/portfolio info
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_resume BOOLEAN DEFAULT false;
