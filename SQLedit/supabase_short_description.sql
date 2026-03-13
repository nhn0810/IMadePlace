-- Add short_description column to posts table to store brief project summaries for "I made" posts.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS short_description TEXT;
