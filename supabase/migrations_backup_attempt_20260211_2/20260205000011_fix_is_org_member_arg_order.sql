-- Fix is_org_member argument order (user_has_org_access expects user_id, org_id)
CREATE OR REPLACE FUNCTION public.is_org_member(
  org_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN user_has_org_access(user_id_param, org_id_param);
END;
$$;

COMMENT ON FUNCTION public.is_org_member(uuid, uuid) IS
'Checks if user has any access to org (member, admin, platform admin).';
