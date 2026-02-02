-- Add event_description and ticket_banner_url to ticketed_events
ALTER TABLE "public"."ticketed_events" 
ADD COLUMN "event_description" text CHECK (char_length(event_description) <= 500),
ADD COLUMN "ticket_banner_url" text;

-- Add check constraint to ticket_types description
-- First update any existing descriptions that are too long (highly unlikely but good practice)
UPDATE "public"."ticket_types" SET "description" = LEFT("description", 250) WHERE char_length("description") > 250;

ALTER TABLE "public"."ticket_types" 
ADD CONSTRAINT "ticket_types_description_check" CHECK (char_length(description) <= 250);

-- Function to get public theme ID securely
CREATE OR REPLACE FUNCTION get_public_org_theme(org_id_input uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass RLS
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT theme_id 
    FROM organization_settings 
    WHERE org_id = org_id_input
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_org_theme(uuid) TO anon, authenticated, service_role;
