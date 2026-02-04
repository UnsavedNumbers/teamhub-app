-- Fix is_org_admin function parameter order
-- The function was calling user_is_org_admin with parameters in wrong order

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id_param uuid, user_id_param uuid DEFAULT auth.uid()) 
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Fixed: user_is_org_admin expects (user_id, org_id) not (org_id, user_id)
  RETURN user_is_org_admin(user_id_param, org_id_param);
END;
$$;

COMMENT ON FUNCTION public.is_org_admin(uuid, uuid) IS 'Returns true if the user is an org admin for the given organization. Fixed parameter order in v20260203.';
