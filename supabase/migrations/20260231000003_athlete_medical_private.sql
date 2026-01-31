-- Migration: Create athlete_medical_private table and migrate medical data
-- ==========================================================================
-- Purpose: Separate medical_notes and emergency_contact into a protected table
-- for stricter access control. Coaches should not always have medical access.

-- Create the athlete_medical_private table
CREATE TABLE IF NOT EXISTS athlete_medical_private (
  athlete_id UUID PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  medical_notes TEXT NULL,
  allergies TEXT NULL,
  emergency_contact JSONB NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for org lookups
CREATE INDEX IF NOT EXISTS idx_athlete_medical_private_org 
  ON athlete_medical_private(org_id);

-- Add trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_athlete_medical_private_updated_at'
  ) THEN
    CREATE TRIGGER update_athlete_medical_private_updated_at
      BEFORE UPDATE ON athlete_medical_private
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS (policies will be added in a later migration)
ALTER TABLE athlete_medical_private ENABLE ROW LEVEL SECURITY;

-- Add table comment for documentation
COMMENT ON TABLE athlete_medical_private IS 
  'Sensitive medical information for athletes. Separate table with stricter RLS policies. Access controlled by org settings and user roles.';

COMMENT ON COLUMN athlete_medical_private.medical_notes IS 
  'Confidential medical notes, conditions, medications, etc. Visible only to parents/guardians, org admins, and coaches if org setting allows.';

COMMENT ON COLUMN athlete_medical_private.allergies IS 
  'Known allergies. Migrated from athletes table for consistency.';

COMMENT ON COLUMN athlete_medical_private.emergency_contact IS 
  'JSONB object with emergency contact information: {name, relationship, phone, email}. Example: {"name": "Jane Doe", "relationship": "mother", "phone": "555-1234", "email": "jane@example.com"}';

-- ============================================================================
-- DATA MIGRATION: Move existing medical data from athletes table
-- ============================================================================
-- This migration is idempotent - it will only migrate data that hasn't been migrated yet

DO $$
DECLARE
  migrated_count INT := 0;
  athlete_rec RECORD;
BEGIN
  RAISE NOTICE 'Starting medical data migration from athletes table...';
  
  -- Migrate medical_notes, allergies, and emergency contact data
  FOR athlete_rec IN 
    SELECT 
      a.id as athlete_id,
      f.org_id,
      a.medical_notes,
      a.allergies,
      a.emergency_contact_name,
      a.emergency_contact_phone
    FROM athletes a
    JOIN families f ON f.id = a.family_id
    WHERE (
      a.medical_notes IS NOT NULL 
      OR a.allergies IS NOT NULL 
      OR a.emergency_contact_name IS NOT NULL 
      OR a.emergency_contact_phone IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM athlete_medical_private amp 
      WHERE amp.athlete_id = a.id
    )
    AND f.org_id IS NOT NULL
  LOOP
    -- Build emergency_contact JSONB
    DECLARE
      emergency_contact_json JSONB := '{}'::jsonb;
    BEGIN
      IF athlete_rec.emergency_contact_name IS NOT NULL THEN
        emergency_contact_json := jsonb_set(
          emergency_contact_json, 
          '{name}', 
          to_jsonb(athlete_rec.emergency_contact_name)
        );
      END IF;
      
      IF athlete_rec.emergency_contact_phone IS NOT NULL THEN
        emergency_contact_json := jsonb_set(
          emergency_contact_json, 
          '{phone}', 
          to_jsonb(athlete_rec.emergency_contact_phone)
        );
      END IF;
      
      -- Set relationship to 'parent' as default for migrated data
      IF athlete_rec.emergency_contact_name IS NOT NULL THEN
        emergency_contact_json := jsonb_set(
          emergency_contact_json, 
          '{relationship}', 
          to_jsonb('parent'::text)
        );
      END IF;
      
      -- Insert into athlete_medical_private
      INSERT INTO athlete_medical_private (
        athlete_id,
        org_id,
        medical_notes,
        allergies,
        emergency_contact,
        created_at,
        updated_at
      ) VALUES (
        athlete_rec.athlete_id,
        athlete_rec.org_id,
        athlete_rec.medical_notes,
        athlete_rec.allergies,
        CASE 
          WHEN emergency_contact_json::text = '{}'::text THEN NULL 
          ELSE emergency_contact_json 
        END,
        NOW(),
        NOW()
      );
      
      migrated_count := migrated_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE 'Medical data migration complete. Migrated % athlete records.', migrated_count;
END $$;

-- ============================================================================
-- CLEANUP: Drop old columns from athletes table
-- ============================================================================
-- WARNING: This is a destructive operation. Ensure data migration completed successfully
-- before running this section. Comment out if you want to keep old columns temporarily.

DO $$
BEGIN
  -- Check if migration was successful before dropping columns
  DECLARE
    athletes_with_medical INT;
    migrated_medical INT;
  BEGIN
    SELECT COUNT(*) INTO athletes_with_medical
    FROM athletes
    WHERE medical_notes IS NOT NULL 
       OR allergies IS NOT NULL 
       OR emergency_contact_name IS NOT NULL 
       OR emergency_contact_phone IS NOT NULL;
    
    SELECT COUNT(*) INTO migrated_medical
    FROM athlete_medical_private;
    
    IF migrated_medical >= athletes_with_medical THEN
      RAISE NOTICE 'Migration verified. Dropping old columns from athletes table...';
      
      -- Drop emergency contact columns
      IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'athletes' 
        AND column_name = 'emergency_contact_name'
      ) THEN
        ALTER TABLE athletes DROP COLUMN emergency_contact_name;
        RAISE NOTICE 'Dropped column: emergency_contact_name';
      END IF;
      
      IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'athletes' 
        AND column_name = 'emergency_contact_phone'
      ) THEN
        ALTER TABLE athletes DROP COLUMN emergency_contact_phone;
        RAISE NOTICE 'Dropped column: emergency_contact_phone';
      END IF;
      
      -- Note: We're keeping medical_notes and allergies columns in athletes table
      -- for backward compatibility. They will be deprecated but not removed yet.
      -- Future migrations can remove them after confirming all code uses the new table.
      
      RAISE NOTICE 'Old emergency contact columns dropped successfully.';
      RAISE NOTICE 'Note: medical_notes and allergies columns retained for backward compatibility.';
    ELSE
      RAISE WARNING 'Migration verification failed. Found % athletes with medical data but only % migrated records.', 
        athletes_with_medical, migrated_medical;
      RAISE WARNING 'Skipping column drops for safety. Please investigate.';
    END IF;
  END;
END $$;

-- Add deprecation comments to remaining columns
COMMENT ON COLUMN athletes.medical_notes IS 
  'DEPRECATED: Use athlete_medical_private table instead. This column will be removed in a future migration.';

COMMENT ON COLUMN athletes.allergies IS 
  'DEPRECATED: Use athlete_medical_private table instead. This column will be removed in a future migration.';
