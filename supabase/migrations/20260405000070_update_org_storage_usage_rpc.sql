CREATE OR REPLACE FUNCTION public.update_org_storage_usage(
  p_org_id uuid,
  p_bucket_id text DEFAULT 'public-media',
  p_bytes_delta bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.org_storage_usage (org_id, bucket_id, bytes_used, updated_at)
  VALUES (p_org_id, p_bucket_id, GREATEST(0, p_bytes_delta), now())
  ON CONFLICT (org_id) DO UPDATE SET
    bytes_used = GREATEST(0, org_storage_usage.bytes_used + p_bytes_delta),
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.update_org_storage_usage(uuid, text, bigint) IS
  'Increment or decrement org storage usage for a bucket. Used by gallery upload/delete. SECURITY DEFINER so client can call without INSERT on org_storage_usage.';

-- Ensure RLS is enabled
ALTER TABLE public.org_storage_usage ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the INSERT policy
DROP POLICY IF EXISTS org_storage_usage_insert_policy ON public.org_storage_usage;

CREATE POLICY org_storage_usage_insert_policy ON public.org_storage_usage
  FOR INSERT
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));