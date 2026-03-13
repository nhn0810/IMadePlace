-- 1. Extend Messages Table for Group Chats
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- 2. Extend Notifications Table for Context
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;

-- 3. Create a table to track last read time per user per chat room
CREATE TABLE IF NOT EXISTS public.chat_room_reads (
  room_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- 4. Update existing message trigger to NOT fire for group messages (room_id is NOT NULL)
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire for 1:1 messages (where room_id is NULL)
  IF (NEW.room_id IS NULL) THEN
    INSERT INTO public.notifications (user_id, sender_id, type, content, link)
    VALUES (
      NEW.receiver_id,
      NEW.sender_id,
      'message',
      '새 메시지가 도착했습니다: ' || SUBSTRING(NEW.content, 1, 20) || '...',
      '/messages/' || NEW.sender_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Main Notification Logic for Projects and Group Chats
CREATE OR REPLACE FUNCTION public.handle_notifications_upsert()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  notif_type TEXT;
  notif_content TEXT;
  notif_link TEXT;
  existing_notif_id UUID;
  post_title TEXT;
BEGIN
  -- Logic for PROJECT APPLICATIONS
  IF (TG_TABLE_NAME = 'project_participants') THEN
    SELECT title INTO post_title FROM public.posts WHERE id = NEW.post_id;
    
    IF (TG_OP = 'INSERT') THEN
      SELECT author_id INTO target_user_id FROM public.posts WHERE id = NEW.post_id;
      IF (target_user_id = NEW.user_id) THEN RETURN NEW; END IF;
      
      notif_type := 'apply-request';
      notif_content := '[' || COALESCE(post_title, '프로젝트') || '] 새 신청이 발생했습니다!';
      notif_link := '/my-projects?tab=recruiting';
      
      -- Deduplicate unread requests
      SELECT id INTO existing_notif_id 
      FROM public.notifications 
      WHERE user_id = target_user_id AND project_id = NEW.post_id AND type = 'apply-request' AND is_read = FALSE
      LIMIT 1;

      IF existing_notif_id IS NOT NULL THEN
        UPDATE public.notifications SET created_at = NOW() WHERE id = existing_notif_id;
        RETURN NEW;
      END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
      -- Case 1: Accepted (pending -> accepted)
      IF (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
        target_user_id := NEW.user_id;
        notif_type := 'apply-accepted';
        notif_content := '[' || COALESCE(post_title, '프로젝트') || '] 신청이 수락되었습니다!';
        notif_link := '/my-projects?tab=in_progress';
      
      -- Case 2: Rejected (if status becomes 'rejected', though currently we delete on reject)
      -- Keeping here for future-proofing or if the flow changes
      ELSIF (OLD.status = 'pending' AND NEW.status = 'rejected') THEN
        target_user_id := NEW.user_id;
        notif_type := 'apply-rejected';
        notif_content := '[' || COALESCE(post_title, '프로젝트') || '] 신청이 거절되었습니다.';
        notif_link := NULL;
      END IF;
    END IF;

    IF notif_type IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, sender_id, type, content, link, project_id)
      VALUES (target_user_id, auth.uid(), notif_type, notif_content, notif_link, NEW.post_id);
    END IF;

  -- Logic for GROUP MESSAGES
  ELSIF (TG_TABLE_NAME = 'messages') THEN
    IF NEW.room_id IS NOT NULL THEN
      SELECT title INTO post_title FROM public.posts WHERE id = NEW.room_id;
      
      INSERT INTO public.notifications (user_id, sender_id, type, content, link, project_id)
      SELECT 
        p.user_id, 
        NEW.sender_id, 
        'group-message', 
        '[' || COALESCE(post_title, '프로젝트') || '] 팀 채팅방에 새 메시지가 있습니다.', 
        '/my-projects?tab=in_progress&chat=' || NEW.room_id,
        NEW.room_id
      FROM (
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

-- 6. Indices and Triggers (Safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedupe_group_msg 
ON public.notifications (user_id, project_id) 
WHERE type = 'group-message' AND is_read = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedupe_apply_req
ON public.notifications (user_id, project_id)
WHERE type = 'apply-request' AND is_read = FALSE;

DROP TRIGGER IF EXISTS on_participant_change ON public.project_participants;
CREATE TRIGGER on_participant_change
  AFTER INSERT OR UPDATE ON public.project_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_notifications_upsert();

-- Reuse handle_notifications_upsert for group message notifications
DROP TRIGGER IF EXISTS on_group_message_created ON public.messages;
CREATE TRIGGER on_group_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW 
  WHEN (NEW.room_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_notifications_upsert();

-- 7. Access Control for Group Chat
DROP POLICY IF EXISTS "Users can access messages for projects they are in." ON public.messages;
CREATE POLICY "Users can access messages for projects they are in."
  ON public.messages
  FOR SELECT
  USING (
    room_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE id = room_id AND (author_id = auth.uid() OR collaborator_ids @> ARRAY[auth.uid()]::UUID[])
    )
  );

-- 8. Cleanup Trigger: When project starts, delete pending applicants
CREATE OR REPLACE FUNCTION public.cleanup_pending_applicants()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status = 'recruiting' AND NEW.status = 'in_progress') THEN
    DELETE FROM public.project_participants 
    WHERE post_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_start_cleanup ON public.posts;
CREATE TRIGGER on_project_start_cleanup
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_pending_applicants();
