-- Extend gallery_type enum for additional entities and add helper RPC

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'gallery_type' AND e.enumlabel = 'program'
  ) THEN
    ALTER TYPE public.gallery_type ADD VALUE 'program';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'gallery_type' AND e.enumlabel = 'season'
  ) THEN
    ALTER TYPE public.gallery_type ADD VALUE 'season';
  END IF;
END $$
-- Helper: get or create static gallery for a polymorphic entity
CREATE OR REPLACE FUNCTION public.get_or_create_static_gallery(
  p_org_id UUID,
  p_entity_type public.gallery_type,
  p_entity_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_gallery_id UUID;
BEGIN
  SELECT id
  INTO v_gallery_id
  FROM public.galleries
  WHERE org_id = p_org_id
    AND gallery_type = p_entity_type
    AND entity_id = p_entity_id
  LIMIT 1;

  IF v_gallery_id IS NULL THEN
    INSERT INTO public.galleries (
      org_id,
      gallery_type,
      entity_id,
      name,
      allow_contributions,
      require_approval,
      created_by_user_id
    )
    VALUES (
      p_org_id,
      p_entity_type,
      p_entity_id,
      'Photos',
      true,
      true,
      p_user_id
    )
    RETURNING id INTO v_gallery_id;
  END IF;

  RETURN v_gallery_id;
END;
$$