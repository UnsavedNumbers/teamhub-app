-- Seed baseline test data (idempotent)
-- Organizations
insert into organizations (id, name, website, phone, created_at)
values
  ('org-springfield', 'Springfield Youth Sports', 'https://springfield.example.com', '555-1001', now()),
  ('org-riverside', 'Riverside Athletics', 'https://riverside.example.com', '555-1002', now()),
  ('org-mountain', 'Mountain View Sports Club', 'https://mountainview.example.com', '555-1003', now())
on conflict (id) do nothing;

-- Organization settings
insert into organization_settings (org_id, organization_name, timezone, status)
values
  ('org-springfield', 'Springfield Youth Sports', 'America/Chicago', 'active'),
  ('org-riverside', 'Riverside Athletics', 'America/Los_Angeles', 'active'),
  ('org-mountain', 'Mountain View Sports Club', 'America/Denver', 'active')
on conflict (org_id) do nothing;

-- Sports
insert into sports (id, org_id, name, icon)
values
  ('sport-soccer', null, 'Soccer', 'soccer-ball'),
  ('sport-basketball', null, 'Basketball', 'basketball'),
  ('sport-baseball', null, 'Baseball', 'baseball'),
  ('sport-volleyball', null, 'Volleyball', 'volleyball')
on conflict (id) do nothing;

-- Programs
insert into programs (id, org_id, sport_id, name)
values
  ('prog-soc-rec', 'org-springfield', 'sport-soccer', 'Recreational Soccer'),
  ('prog-soc-comp', 'org-springfield', 'sport-soccer', 'Competitive Soccer'),
  ('prog-bb-youth', 'org-riverside', 'sport-basketball', 'Youth Basketball'),
  ('prog-base-u12', 'org-mountain', 'sport-baseball', 'U12 Baseball')
on conflict (id) do nothing;

-- Levels
insert into levels (id, org_id, program_id, name, level_type)
values
  ('lvl-soc-u10', 'org-springfield', 'prog-soc-rec', 'U10', 'age_based'),
  ('lvl-soc-u12', 'org-springfield', 'prog-soc-comp', 'U12', 'age_based'),
  ('lvl-bb-u14', 'org-riverside', 'prog-bb-youth', 'U14', 'age_based'),
  ('lvl-base-u12', 'org-mountain', 'prog-base-u12', 'U12', 'age_based')
on conflict (id) do nothing;

-- Seasons
insert into seasons (id, org_id, name, start_date, end_date)
values
  ('season-spring', 'org-springfield', 'Spring Season', now() - interval '30 days', now() + interval '90 days'),
  ('season-summer', 'org-riverside', 'Summer Season', now() - interval '15 days', now() + interval '120 days'),
  ('season-fall', 'org-mountain', 'Fall Season', now() + interval '30 days', now() + interval '180 days')
on conflict (id) do nothing;

-- Teams
insert into teams (id, org_id, name, level_id, program_id, sport_id, is_active)
values
  ('team-soc-u12-a', 'org-springfield', 'U12 Lions', 'lvl-soc-u12', 'prog-soc-comp', 'sport-soccer', true),
  ('team-soc-u10-a', 'org-springfield', 'U10 Eagles', 'lvl-soc-u10', 'prog-soc-rec', 'sport-soccer', true),
  ('team-bb-u14-a', 'org-riverside', 'U14 Hoops', 'lvl-bb-u14', 'prog-bb-youth', 'sport-basketball', true),
  ('team-base-u12', 'org-mountain', 'U12 Bears', 'lvl-base-u12', 'prog-base-u12', 'sport-baseball', true)
on conflict (id) do nothing;

-- Team seasons
insert into team_seasons (team_id, season_id, is_active)
values
  ('team-soc-u12-a', 'season-spring', true),
  ('team-soc-u10-a', 'season-spring', true),
  ('team-bb-u14-a', 'season-summer', true),
  ('team-base-u12', 'season-fall', true)
on conflict (team_id, season_id) do nothing;

-- Basic fees
insert into fees (id, org_id, title, amount_cents, currency, status, scope, fee_type, visibility, due_date)
values
  ('fee-soc-reg', 'org-springfield', 'Spring Soccer Registration', 15000, 'usd', 'published', 'team', 'registration', 'all_parents', now() + interval '30 days'),
  ('fee-bb-reg', 'org-riverside', 'Summer Hoops Registration', 12500, 'usd', 'published', 'team', 'registration', 'all_parents', now() + interval '45 days')
on conflict (id) do nothing;

-- Uniform kits
insert into uniform_kits (id, team_id, season_id, name, created_at)
values
  ('kit-soc-u12', 'team-soc-u12-a', 'season-spring', 'U12 Soccer Kit', now()),
  ('kit-bb-u14', 'team-bb-u14-a', 'season-summer', 'U14 Hoops Kit', now())
on conflict (id) do nothing;

-- Uniform items
insert into uniform_kit_items (id, kit_id, name, required, size_options, sort_order)
values
  ('kit-item-jersey', 'kit-soc-u12', 'Jersey', true, '{"sizes":["YS","YM","YL","AS","AM"]}', 1),
  ('kit-item-shorts', 'kit-soc-u12', 'Shorts', true, '{"sizes":["YS","YM","YL","AS","AM"]}', 2),
  ('kit-item-jersey-bb', 'kit-bb-u14', 'Jersey', true, '{"sizes":["YM","YL","AS","AM","AL"]}', 1)
on conflict (id) do nothing;

-- Tryouts
insert into tryouts (id, org_id, title, tryout_date, start_time, end_time, location, age_group, entry_fee, sport)
values
  ('tryout-soc-u12', 'org-springfield', 'U12 Competitive Tryout', (now() + interval '15 days')::date, '09:00', '11:00', 'Main Field', 'U12', 2500, 'soccer'),
  ('tryout-bb-u14', 'org-riverside', 'U14 Elite Tryout', (now() + interval '20 days')::date, '10:00', '12:00', 'Gym 1', 'U14', 3000, 'basketball')
on conflict (id) do nothing;

-- Messages
insert into messages (id, org_id, team_id, title, body, created_at)
values
  ('msg-team-soc', 'org-springfield', 'team-soc-u12-a', 'Welcome', 'Welcome to the U12 season!', now())
on conflict (id) do nothing;
