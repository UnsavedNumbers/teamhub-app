-- Add SPORT category event types to valid_event_types lookup
-- ===========================================================
-- Migration 20260126000001 added SPORT to event_category and sport_event_type
-- enum but did not insert these into valid_event_types, so log_event()
-- validation rejected SPORT_LINKED (and other sport events).

INSERT INTO valid_event_types (category, event_type, enum_name, description) VALUES
-- SPORT (organization_sports link and customizations)
('SPORT', 'SPORT_LINKED', 'sport_event_type', 'Sport linked to organization'),
('SPORT', 'SPORT_UNLINKED', 'sport_event_type', 'Sport unlinked from organization'),
('SPORT', 'SPORT_CUSTOMIZED', 'sport_event_type', 'Sport customization created'),
('SPORT', 'SPORT_CUSTOMIZATION_UPDATED', 'sport_event_type', 'Sport customization updated'),
('SPORT', 'SPORT_CUSTOMIZATION_REMOVED', 'sport_event_type', 'Sport customization removed'),
('SPORT', 'SPORT_ICON_UPLOADED', 'sport_event_type', 'Sport icon uploaded'),
('SPORT', 'SPORT_ICON_DELETED', 'sport_event_type', 'Sport icon deleted')
ON CONFLICT (category, event_type) DO NOTHING;
