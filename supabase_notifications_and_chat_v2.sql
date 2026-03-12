-- 1. Extend Messages Table for Group Chats
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- 2. Extend Notifications Table for Context and Deduplication
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;

-- 3. Create a table to track last read time per user per chat room (group DMs)
CREATE TABLE IF NOT EXISTS public.chat_room_reads (
  room_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- 4. Function for Recruitment & Message Notifications with Deduplication
CREATE OR REPLACE FUNCTION public.handle_notifications_upsert()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  notif_type TEXT;
  notif_content TEXT;
  notif_link TEXT;
  existing_notif_id UUID;
BEGIN
  -- Logic for PROJECT APPLICATIONS (Recruitment)
  IF (TG_TABLE_NAME = 'project_participants') THEN
    -- Get the post owner
    SELECT author_id INTO target_user_id FROM public.posts WHERE id = NEW.post_id;
    
    IF (target_user_id = NEW.user_id) THEN RETURN NEW; END IF; -- Should not happen but safety first

    IF (TG_OP = 'INSERT') THEN
      notif_type := 'apply-request';
      notif_content := '새 프로젝트 신청이 있습니다!';
      notif_link := '/my-projects?tab=recruiting';
      
      -- Check if an unread 'apply-request' already exists for this project and user
      SELECT id INTO existing_notif_id 
      FROM public.notifications 
      WHERE user_id = target_user_id AND project_id = NEW.post_id AND type = 'apply-request' AND is_read = FALSE
      LIMIT 1;

      IF existing_notif_id IS NOT NULL THEN
        UPDATE public.notifications SET created_at = NOW() WHERE id = existing_notif_id;
        RETURN NEW;
      END IF;

    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'waiting' AND NEW.status = 'accepted') THEN
      target_user_id := NEW.user_id;
      notif_type := 'apply-accepted';
      notif_content := '프로젝트 신청이 수락되었습니다!';
      notif_link := '/my-projects?tab=in_progress';
    END IF;

    IF notif_type IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, sender_id, type, content, link, project_id)
      VALUES (target_user_id, auth.uid(), notif_type, notif_content, notif_link, NEW.post_id);
    END IF;

  -- Logic for MESSAGES (Group and Individual)
  ELSIF (TG_TABLE_NAME = 'messages') THEN
    IF NEW.room_id IS NOT NULL THEN
      -- Group Message Notification Logic
      -- This is complex for 1-to-many. 
      -- We'll just notify participants who are NOT the sender.
      -- However, the user wants "1 notification per room" behavior.
      
      INSERT INTO public.notifications (user_id, sender_id, type, content, link, project_id)
      SELECT 
        p.user_id, 
        NEW.sender_id, 
        'group-message', 
        '단체 채팅방에 새 메시지가 있습니다.', 
        '/messages/' || NEW.room_id,
        NEW.room_id
      FROM (
        -- Get author and accepted participants
        SELECT author_id as user_id FROM public.posts WHERE id = NEW.room_id
        UNION
        SELECT user_id FROM public.project_participants WHERE post_id = NEW.room_id AND status = 'accepted'
      ) p
      WHERE p.user_id != NEW.sender_id
      ON CONFLICT (user_id, project_id) WHERE type = 'group-message' AND is_read = FALSE
      DO UPDATE SET 
        created_at = NOW(),
        sender_id = EXCLUDED.sender_id;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The "ON CONFLICT" above requires a UNIQUE INDEX to work with deduplication logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedupe_group_msg 
ON public.notifications (user_id, project_id) 
WHERE type = 'group-message' AND is_read = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedupe_apply_req
ON public.notifications (user_id, project_id)
WHERE type = 'apply-request' AND is_read = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS on_participant_change ON public.project_participants;
CREATE TRIGGER on_participant_change
  AFTER INSERT OR UPDATE ON public.project_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_notifications_upsert();

-- Update existing message trigger to handle group context if needed
-- (Actually, the user wants the same logic for group DM notifications as individual)
-- Let's keep individual messages and group messages separate for now in the logic.

-- 5. Access Control for Group Chat (RLS)
CREATE POLICY "Users can access messages for projects they are in."
  ON public.messages
  FOR SELECT
  USING (
    room_id IS NULL OR -- Individual DM policy handles this via other clauses
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE id = room_id AND (author_id = auth.uid() OR collaborator_ids @> ARRAY[auth.uid()]::UUID[])
    )
  );

-- 6. Cleanup Trigger: When project starts, delete pending applicants
CREATE OR REPLACE FUNCTION public.cleanup_pending_applicants()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status = 'waiting' AND NEW.status = 'in_progress') THEN
    DELETE FROM public.project_participants 
    WHERE post_id = NEW.id AND status = 'waiting';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_start_cleanup ON public.posts;
CREATE TRIGGER on_project_start_cleanup
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_pending_applicants();
