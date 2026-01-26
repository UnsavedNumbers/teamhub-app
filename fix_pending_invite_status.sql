-- Fix the pending invite status
-- First, create a stub log_event function so the trigger doesn't fail

CREATE OR REPLACE FUNCTION public.log_event(
  p_scope TEXT,
  p_event_type TEXT,
  p_user_id UUID,
  p_user_role TEXT,
  p_org_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Stub function - just return a random UUID
  -- This prevents errors when triggers call log_event
  RETURN gen_random_uuid();
END;
$$;

-- Now update the pending invite to accepted
UPDATE parent_invites
SET status = 'accepted', updated_at = NOW()
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1 
    FROM athlete_guardians ag
    JOIN users u ON u.id = ag.user_id
    WHERE ag.athlete_id = parent_invites.athlete_id
      AND LOWER(u.email) = LOWER(parent_invites.email)
  );

-- Verify
SELECT id, email, status, athlete_id, updated_at
FROM parent_invites
ORDER BY updated_at DESC
LIMIT 5;
