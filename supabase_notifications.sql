-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means global announcement
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who caused it?
  type TEXT NOT NULL, -- 'message', 'announcement', 'system'
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read notifications addressed to them, OR global announcements (user_id IS NULL)
CREATE POLICY "Users can view their own notifications and global ones"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Only Masters/Admins can INSERT global announcements. System triggers handle the rest.
CREATE POLICY "Admins can insert global announcements"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    user_id IS NULL AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );

-- Users can UPDATE their own notifications (e.g. mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL); -- We track read status via client side state for globals or via a separate mapping, but for simplicity we let them UPDATE if it's theirs

-- 3. Enable Realtime
-- First check if publication exists, otherwise create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add relevant tables to the publication so WebSockets receive changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. DB Trigger: Auto-create notification on new DM
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, sender_id, type, content, link)
  VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    '새 메시지가 도착했습니다: ' || SUBSTRING(NEW.content, 1, 20) || '...',
    '/messages/' || NEW.sender_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();
