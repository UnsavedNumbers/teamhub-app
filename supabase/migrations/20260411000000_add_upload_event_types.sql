-- Add and backfill event types used by app and edge functions.
-- Idempotent: safe to run multiple times.
-- Includes SYSTEM upload lifecycle events plus SEASON/SPORT events used in UI flows.

INSERT INTO public.valid_event_types (category, event_type, enum_name, description)
VALUES
  ('SEASON', 'SEASON_CREATED', 'season_event_type', 'A season was created.'),
  ('SEASON', 'SEASON_UPDATED', 'season_event_type', 'A season was updated.'),
  ('SEASON', 'SEASON_DELETED', 'season_event_type', 'A season was deleted.'),
  ('SEASON', 'SEASON_ACTIVATED', 'season_event_type', 'A season was activated.'),
  ('SEASON', 'SEASON_ARCHIVED', 'season_event_type', 'A season was archived.'),
  ('SPORT', 'SPORT_LINKED', 'sport_event_type', 'A system sport was linked to an organization.'),
  ('SPORT', 'SPORT_UNLINKED', 'sport_event_type', 'A sport was unlinked from an organization.'),
  ('SPORT', 'SPORT_CUSTOMIZED', 'sport_event_type', 'A sport icon/color customization was applied.'),
  ('SPORT', 'SPORT_CUSTOMIZATION_UPDATED', 'sport_event_type', 'A sport customization was updated.'),
  ('SPORT', 'SPORT_CUSTOMIZATION_REMOVED', 'sport_event_type', 'A sport customization was removed.'),
  ('SPORT', 'SPORT_ICON_UPLOADED', 'sport_event_type', 'A sport icon was uploaded.'),
  ('SPORT', 'SPORT_ICON_DELETED', 'sport_event_type', 'A sport icon was deleted.'),
  ('SYSTEM', 'PHOTO_UPLOADED', 'system_event_type', 'A gallery photo was uploaded.'),
  ('SYSTEM', 'ATHLETE_PHOTO_UPLOADED', 'system_event_type', 'An athlete profile photo was uploaded.'),
  ('SYSTEM', 'VIDEO_UPLOAD_STARTED', 'system_event_type', 'A video direct upload was created and started.'),
  ('SYSTEM', 'VIDEO_UPLOAD_COMPLETED', 'system_event_type', 'A video upload finished and the asset became ready.'),
  ('SYSTEM', 'VIDEO_UPLOAD_FAILED', 'system_event_type', 'A video upload or processing job failed.'),
  ('SYSTEM', 'VIDEO_UPLOAD_CANCELLED', 'system_event_type', 'A video upload was cancelled and marked deleted.'),
  ('SYSTEM', 'ORG_LOGO_UPLOADED', 'system_event_type', 'An organization logo was uploaded.'),
  ('SYSTEM', 'EVENT_BANNER_UPLOADED', 'system_event_type', 'An event ticket banner image was uploaded.')
ON CONFLICT (category, event_type) DO UPDATE
SET
  enum_name = EXCLUDED.enum_name,
  description = EXCLUDED.description;
