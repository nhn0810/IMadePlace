-- Add a collaborator_ids array column to the posts table
-- Using UUID array to store the profiles ids 
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS collaborator_ids UUID[] DEFAULT '{}';
