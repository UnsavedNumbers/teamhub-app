-- Phase 08: Recurring Events Support
-- ====================================
-- Implements recurring event patterns and instance tracking

-- Create recurrence frequency enum
DO $$ BEGIN
  CREATE TYPE recurrence_frequency AS ENUM ('weekly', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create recurring event patterns table
CREATE TABLE IF NOT EXISTS recurring_event_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  frequency recurrence_frequency NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  end_date DATE,
  max_occurrences INTEGER,
  exception_dates DATE[], -- Dates to skip
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure at least one day is selected
  CONSTRAINT days_of_week_not_empty CHECK (array_length(days_of_week, 1) > 0),
  
  -- Ensure days are valid (0-6)
  CONSTRAINT valid_days_of_week CHECK (
    days_of_week <@ ARRAY[0,1,2,3,4,5,6]
  ),
  
  -- Ensure at least one end condition is specified
  CONSTRAINT has_end_condition CHECK (
    end_date IS NOT NULL OR max_occurrences IS NOT NULL
  ),
  
  -- Ensure max_occurrences is positive
  CONSTRAINT positive_max_occurrences CHECK (
    max_occurrences IS NULL OR max_occurrences > 0
  )
);

-- Create recurring event instances table
CREATE TABLE IF NOT EXISTS recurring_event_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES recurring_event_patterns(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  is_exception BOOLEAN DEFAULT false, -- True if this instance was modified from pattern
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique occurrence per pattern
  UNIQUE(pattern_id, occurrence_date)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_parent_event ON recurring_event_patterns(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_pattern ON recurring_event_instances(pattern_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_event ON recurring_event_instances(event_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_date ON recurring_event_instances(occurrence_date);

-- Add trigger for updated_at on patterns
CREATE TRIGGER update_recurring_patterns_updated_at
  BEFORE UPDATE ON recurring_event_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on recurring event tables
ALTER TABLE recurring_event_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_event_instances ENABLE ROW LEVEL SECURITY;

-- Users can view recurring patterns for events they can see
CREATE POLICY "Users can view recurring patterns" ON recurring_event_patterns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = recurring_event_patterns.parent_event_id
      -- RLS on events table handles visibility
    )
  );

-- Admins can manage recurring patterns for their org's events
CREATE POLICY "Admins can manage recurring patterns" ON recurring_event_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = recurring_event_patterns.parent_event_id
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Users can view recurring instances for events they can see
CREATE POLICY "Users can view recurring instances" ON recurring_event_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = recurring_event_instances.event_id
      -- RLS on events table handles visibility
    )
  );

-- Admins can manage recurring instances for their org's events
CREATE POLICY "Admins can manage recurring instances" ON recurring_event_instances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN teams t ON t.id = e.team_id
      JOIN users u ON u.id = auth.uid()
      WHERE e.id = recurring_event_instances.event_id
      AND u.role = 'admin'
      AND u.org_id = t.org_id
    )
  );

-- Function to generate recurring event instances
CREATE OR REPLACE FUNCTION generate_recurring_event_instances(
  p_pattern_id UUID,
  p_start_date DATE,
  p_template_event_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_pattern RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_count INTEGER := 0;
  v_max_count INTEGER;
  v_day_of_week INTEGER;
  v_new_event_id UUID;
  v_template_event RECORD;
  v_time_offset INTERVAL;
BEGIN
  -- Get the pattern details
  SELECT * INTO v_pattern
  FROM recurring_event_patterns
  WHERE id = p_pattern_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pattern not found: %', p_pattern_id;
  END IF;
  
  -- Get the template event
  SELECT * INTO v_template_event
  FROM events
  WHERE id = p_template_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template event not found: %', p_template_event_id;
  END IF;
  
  -- Calculate time offset for each instance
  v_time_offset := v_template_event.start_time::time - p_start_date::timestamp;
  
  -- Determine end date
  v_end_date := COALESCE(v_pattern.end_date, p_start_date + INTERVAL '1 year');
  v_max_count := COALESCE(v_pattern.max_occurrences, 365);
  
  -- Start from the given start date
  v_current_date := p_start_date;
  
  -- Generate instances
  WHILE v_current_date <= v_end_date AND v_count < v_max_count LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;
    
    -- Check if this day matches the pattern
    IF v_day_of_week = ANY(v_pattern.days_of_week) THEN
      -- Check if this date is not in exception_dates
      IF v_pattern.exception_dates IS NULL OR v_current_date != ALL(v_pattern.exception_dates) THEN
        -- Create new event instance
        INSERT INTO events (
          team_id,
          season_id,
          title,
          type,
          start_time,
          end_time,
          arrival_time,
          timezone,
          location,
          notes,
          uniform_notes,
          equipment_notes,
          weather_dependent,
          external_link,
          created_by_user_id
        ) VALUES (
          v_template_event.team_id,
          v_template_event.season_id,
          v_template_event.title,
          v_template_event.type,
          v_current_date::timestamp + v_time_offset,
          v_current_date::timestamp + v_time_offset + (v_template_event.end_time - v_template_event.start_time),
          CASE 
            WHEN v_template_event.arrival_time IS NOT NULL 
            THEN v_current_date::timestamp + (v_template_event.arrival_time::time - v_template_event.start_time::time)
            ELSE NULL
          END,
          v_template_event.timezone,
          v_template_event.location,
          v_template_event.notes,
          v_template_event.uniform_notes,
          v_template_event.equipment_notes,
          v_template_event.weather_dependent,
          v_template_event.external_link,
          v_template_event.created_by_user_id
        )
        RETURNING id INTO v_new_event_id;
        
        -- Link instance to pattern
        INSERT INTO recurring_event_instances (
          pattern_id,
          event_id,
          occurrence_date,
          is_exception
        ) VALUES (
          p_pattern_id,
          v_new_event_id,
          v_current_date,
          false
        );
        
        v_count := v_count + 1;
      END IF;
    END IF;
    
    -- Move to next day
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
