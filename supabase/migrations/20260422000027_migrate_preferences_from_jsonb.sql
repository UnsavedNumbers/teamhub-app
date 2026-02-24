-- Migrate existing JSONB preferences from users.preferences->notifications_v2 to relational table
-- This migration reads the old JSONB structure and converts it to user_notification_preferences rows

-- Helper function to extract notification preferences from JSONB
CREATE OR REPLACE FUNCTION migrate_notification_preferences()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  org_id_val TEXT;
  role_val TEXT;
  group_record JSONB;
  action_record JSONB;
  notification_type_key_val TEXT;
  notification_type_id_val UUID;
  channels_array TEXT[];
  in_app_enabled_val BOOLEAN;
  email_enabled_val BOOLEAN;
  inserted_count INTEGER := 0;
BEGIN
  -- Loop through all users with preferences
  FOR user_record IN 
    SELECT id, preferences 
    FROM public.users 
    WHERE preferences IS NOT NULL 
      AND preferences->'notifications_v2' IS NOT NULL
  LOOP
    -- Loop through orgs in notifications_v2
    FOR org_id_val, group_record IN 
      SELECT * FROM jsonb_each(user_record.preferences->'notifications_v2')
    LOOP
      -- Loop through roles in org
      FOR role_val, group_record IN 
        SELECT * FROM jsonb_each(group_record::jsonb)
      LOOP
        -- Normalize role (parent -> guardian)
        IF role_val = 'parent' THEN
          role_val := 'guardian';
        END IF;
        
        -- Skip invalid roles
        IF role_val NOT IN ('org_admin', 'coach', 'guardian', 'athlete', 'staff', 'fan') THEN
          CONTINUE;
        END IF;
        
        -- Loop through groups (if group_record is an array)
        IF jsonb_typeof(group_record) = 'array' THEN
          FOR group_record IN SELECT * FROM jsonb_array_elements(group_record::jsonb)
          LOOP
            -- Extract channels
            channels_array := ARRAY(SELECT jsonb_array_elements_text(group_record->'channels'));
            in_app_enabled_val := 'in_app' = ANY(channels_array);
            email_enabled_val := 'email' = ANY(channels_array);
            
            -- Check if group is enabled (allEnabled or individual action enabled)
            IF (group_record->>'allEnabled')::boolean = true THEN
              -- All actions in group are enabled
              -- We need to map group ID to notification types
              -- For now, we'll skip group-level preferences and handle action-level
              CONTINUE;
            END IF;
            
            -- Loop through actions in group
            IF group_record->'actions' IS NOT NULL THEN
              FOR action_record IN SELECT * FROM jsonb_array_elements(group_record->'actions')
              LOOP
                -- Get action ID (notification type key)
                notification_type_key_val := action_record->>'id';
                
                -- Skip if action not enabled
                IF (action_record->>'enabled')::boolean != true THEN
                  CONTINUE;
                END IF;
                
                -- Find notification_type_id
                SELECT id INTO notification_type_id_val
                FROM public.notification_types
                WHERE key = notification_type_key_val;
                
                -- Skip if notification type not found
                IF notification_type_id_val IS NULL THEN
                  CONTINUE;
                END IF;
                
                -- Insert preference (using ON CONFLICT to handle duplicates)
                INSERT INTO public.user_notification_preferences (
                  user_id,
                  org_id,
                  role,
                  notification_type_id,
                  in_app_enabled,
                  email_enabled
                ) VALUES (
                  user_record.id,
                  org_id_val::UUID,
                  role_val,
                  notification_type_id_val,
                  in_app_enabled_val,
                  email_enabled_val
                )
                ON CONFLICT (user_id, org_id, role, notification_type_id) 
                DO UPDATE SET
                  in_app_enabled = EXCLUDED.in_app_enabled,
                  email_enabled = EXCLUDED.email_enabled,
                  updated_at = NOW();
                
                inserted_count := inserted_count + 1;
              END LOOP;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migrated % notification preferences from JSONB to relational table', inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_notification_preferences();

-- Drop the helper function
DROP FUNCTION IF EXISTS migrate_notification_preferences();

COMMENT ON TABLE public.user_notification_preferences IS 'Migrated from users.preferences->notifications_v2 JSONB structure. Old JSONB preferences are preserved but new preferences are stored here.';
