-- Add tryout-specific notification actions, notification_types rows,
-- and baseline email templates tied to each tryout notification type.

-- 1) Extend notification_action enum
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_registration_confirmed';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_payment_received';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_waitlisted';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_promoted_from_waitlist';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_reminder_x_days';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_reminder_day_before';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_day_of_reminder';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_results_published';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_evaluator_assigned';
ALTER TYPE public.notification_action ADD VALUE IF NOT EXISTS 'tryout_evaluation_due';

-- 2) Register notification_types
INSERT INTO public.notification_types (
  key,
  display_name,
  description,
  eligible_roles,
  supports_email,
  category,
  default_in_app_enabled,
  default_email_enabled
) VALUES
  ('tryout_registration_confirmed', 'Tryout Registration Confirmed', 'Sent after a guardian completes tryout registration.', ARRAY['guardian', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_payment_received', 'Tryout Payment Received', 'Sent when tryout registration payment is successfully collected.', ARRAY['guardian', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_waitlisted', 'Tryout Waitlisted', 'Sent when a registration moves to waitlist.', ARRAY['guardian', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_promoted_from_waitlist', 'Tryout Promoted From Waitlist', 'Sent when a waitlisted athlete is promoted to an available spot.', ARRAY['guardian', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_reminder_x_days', 'Tryout Reminder (X Days)', 'Scheduled reminder sent several days before a tryout session.', ARRAY['guardian', 'athlete', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_reminder_day_before', 'Tryout Reminder (Day Before)', 'Reminder sent one day before a tryout session.', ARRAY['guardian', 'athlete', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_day_of_reminder', 'Tryout Reminder (Day Of)', 'Reminder sent on the day of the tryout session.', ARRAY['guardian', 'athlete', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_results_published', 'Tryout Results Published', 'Sent when a tryout publishes final athlete outcomes.', ARRAY['guardian', 'athlete', 'org_admin', 'coach'], true, 'Tryouts', true, true),
  ('tryout_evaluator_assigned', 'Tryout Evaluator Assigned', 'Sent to coaches assigned to evaluate a tryout.', ARRAY['coach', 'org_admin'], true, 'Tryouts', true, true),
  ('tryout_evaluation_due', 'Tryout Evaluation Due', 'Reminder sent to evaluators for incomplete scorecards.', ARRAY['coach', 'org_admin'], true, 'Tryouts', true, true)
ON CONFLICT (key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  eligible_roles = EXCLUDED.eligible_roles,
  supports_email = EXCLUDED.supports_email,
  category = EXCLUDED.category,
  default_in_app_enabled = EXCLUDED.default_in_app_enabled,
  default_email_enabled = EXCLUDED.default_email_enabled,
  updated_at = NOW();

-- 3) Seed baseline email templates for tryout notifications
INSERT INTO public.email_templates (
  slug,
  name,
  type,
  category,
  subject_template,
  body_content,
  html_content,
  preview_text,
  description,
  required_variables,
  is_active,
  notification_type_id
) VALUES
  (
    'tryout-registration-confirmed',
    'Tryout Registration Confirmed',
    'registration_confirmation',
    'Tryouts',
    'Registration confirmed for {{tryout_name}}',
    'Hi {{recipient_name}}, your registration for {{athlete_name}} in {{tryout_name}} is confirmed.',
    '<p>Hi {{recipient_name}},</p><p>Your registration for <strong>{{athlete_name}}</strong> in <strong>{{tryout_name}}</strong> is confirmed.</p><p>Session: {{session_date}} at {{session_time}}</p><p>Location: {{location}}</p>',
    'Your tryout registration is confirmed.',
    'Sent after guardian registration submission succeeds.',
    '["recipient_name","athlete_name","tryout_name","session_date","session_time","location"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_registration_confirmed')
  ),
  (
    'tryout-payment-received',
    'Tryout Payment Received',
    'payment_receipt',
    'Tryouts',
    'Payment received for {{tryout_name}}',
    'Hi {{recipient_name}}, we received your payment of {{amount}} for {{athlete_name}}.',
    '<p>Hi {{recipient_name}},</p><p>We received your payment of <strong>{{amount}}</strong> for <strong>{{athlete_name}}</strong>.</p><p>Tryout: {{tryout_name}}</p><p>Receipt ID: {{receipt_id}}</p>',
    'Your tryout payment has been received.',
    'Sent when tryout payment is successful.',
    '["recipient_name","athlete_name","tryout_name","amount","receipt_id"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_payment_received')
  ),
  (
    'tryout-waitlisted',
    'Tryout Waitlisted',
    'event_reminder',
    'Tryouts',
    '{{athlete_name}} has been waitlisted for {{tryout_name}}',
    'Hi {{recipient_name}}, {{athlete_name}} is currently on the waitlist for {{tryout_name}}.',
    '<p>Hi {{recipient_name}},</p><p><strong>{{athlete_name}}</strong> is currently on the waitlist for <strong>{{tryout_name}}</strong>.</p><p>We will notify you if a spot opens.</p>',
    'You are currently on the waitlist.',
    'Sent when a registration moves to waitlist.',
    '["recipient_name","athlete_name","tryout_name"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_waitlisted')
  ),
  (
    'tryout-promoted-from-waitlist',
    'Tryout Promoted From Waitlist',
    'event_reminder',
    'Tryouts',
    'Spot available for {{athlete_name}} in {{tryout_name}}',
    'Hi {{recipient_name}}, a tryout spot opened for {{athlete_name}}.',
    '<p>Hi {{recipient_name}},</p><p>A spot opened for <strong>{{athlete_name}}</strong> in <strong>{{tryout_name}}</strong>.</p><p>Please confirm by {{response_deadline}}.</p>',
    'A tryout spot is now available.',
    'Sent when waitlisted registration is promoted.',
    '["recipient_name","athlete_name","tryout_name","response_deadline"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_promoted_from_waitlist')
  ),
  (
    'tryout-reminder-x-days',
    'Tryout Reminder (X Days)',
    'event_reminder',
    'Tryouts',
    '{{tryout_name}} starts in {{days_until}} day(s)',
    'Reminder: {{athlete_name}} is scheduled for {{tryout_name}} in {{days_until}} day(s).',
    '<p>Reminder: <strong>{{athlete_name}}</strong> is scheduled for <strong>{{tryout_name}}</strong> in <strong>{{days_until}}</strong> day(s).</p><p>{{session_date}} at {{session_time}} - {{location}}</p>',
    'Tryout reminder.',
    'Scheduled reminder several days in advance.',
    '["athlete_name","tryout_name","days_until","session_date","session_time","location"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_reminder_x_days')
  ),
  (
    'tryout-reminder-day-before',
    'Tryout Reminder (Day Before)',
    'event_reminder',
    'Tryouts',
    'Reminder: {{tryout_name}} is tomorrow',
    'Reminder: {{athlete_name}} has {{tryout_name}} tomorrow.',
    '<p>Reminder: <strong>{{athlete_name}}</strong> has <strong>{{tryout_name}}</strong> tomorrow.</p><p>{{session_date}} at {{session_time}} - {{location}}</p>',
    'Your tryout is tomorrow.',
    'Reminder sent one day before.',
    '["athlete_name","tryout_name","session_date","session_time","location"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_reminder_day_before')
  ),
  (
    'tryout-reminder-day-of',
    'Tryout Reminder (Day Of)',
    'event_reminder',
    'Tryouts',
    'Today: {{tryout_name}}',
    'Today is {{athlete_name}}''s tryout for {{tryout_name}}.',
    '<p>Today is <strong>{{athlete_name}}</strong>''s tryout for <strong>{{tryout_name}}</strong>.</p><p>{{session_time}} - {{location}}</p>',
    'Your tryout is today.',
    'Reminder sent on the day of tryout.',
    '["athlete_name","tryout_name","session_time","location"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_day_of_reminder')
  ),
  (
    'tryout-results-published',
    'Tryout Results Published',
    'new_message',
    'Tryouts',
    'Results published for {{tryout_name}}',
    'Results are available for {{athlete_name}} in {{tryout_name}}.',
    '<p>Results are now available for <strong>{{athlete_name}}</strong> in <strong>{{tryout_name}}</strong>.</p><p>Outcome: {{result_status}}</p>',
    'Tryout results are now available.',
    'Sent when results are published.',
    '["athlete_name","tryout_name","result_status"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_results_published')
  ),
  (
    'tryout-evaluator-assigned',
    'Tryout Evaluator Assigned',
    'new_message',
    'Tryouts',
    'You were assigned as evaluator for {{tryout_name}}',
    'You are assigned to evaluate athletes for {{tryout_name}}.',
    '<p>You have been assigned to evaluate athletes for <strong>{{tryout_name}}</strong>.</p><p>Session: {{session_date}} at {{session_time}}</p>',
    'New evaluator assignment.',
    'Sent to coaches when assigned as evaluators.',
    '["tryout_name","session_date","session_time"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_evaluator_assigned')
  ),
  (
    'tryout-evaluation-due',
    'Tryout Evaluation Due',
    'event_reminder',
    'Tryouts',
    'Evaluation due: {{tryout_name}}',
    'You still have {{pending_count}} pending evaluations for {{tryout_name}}.',
    '<p>You still have <strong>{{pending_count}}</strong> pending evaluations for <strong>{{tryout_name}}</strong>.</p><p>Please complete scorecards by {{due_at}}.</p>',
    'Pending tryout evaluations need completion.',
    'Reminder for incomplete evaluator scorecards.',
    '["tryout_name","pending_count","due_at"]'::jsonb,
    true,
    (SELECT id FROM public.notification_types WHERE key = 'tryout_evaluation_due')
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_content = EXCLUDED.body_content,
  html_content = EXCLUDED.html_content,
  preview_text = EXCLUDED.preview_text,
  description = EXCLUDED.description,
  required_variables = EXCLUDED.required_variables,
  is_active = EXCLUDED.is_active,
  notification_type_id = EXCLUDED.notification_type_id,
  updated_at = NOW();
