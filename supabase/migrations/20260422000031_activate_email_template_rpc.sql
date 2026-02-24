-- Atomically activate one email template: deactivate others with the same
-- notification_type_id, then set the given template active. Prevents races
-- where two separate PATCHes could leave the wrong row active after refresh.
CREATE OR REPLACE FUNCTION public.activate_email_template(p_template_id uuid)
RETURNS public.email_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_type_id uuid;
  v_row public.email_templates;
BEGIN
  SELECT notification_type_id INTO v_notification_type_id
  FROM public.email_templates
  WHERE id = p_template_id;

  IF v_notification_type_id IS NOT NULL THEN
    UPDATE public.email_templates
    SET is_active = false
    WHERE notification_type_id = v_notification_type_id
      AND id IS DISTINCT FROM p_template_id;
  END IF;

  UPDATE public.email_templates
  SET is_active = true
  WHERE id = p_template_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.activate_email_template(uuid) IS
  'Activates the given email template and deactivates others with the same notification_type_id. Use instead of separate updates to avoid races.';
