-- Add home_location JSONB column for storing Google Place data
alter table public.users
  add column home_location jsonb;

comment on column public.users.home_location is
  'Google Place home location: { place_id, formatted_address, zip_code, coordinates: { lat, lng }, city, state, country }';
