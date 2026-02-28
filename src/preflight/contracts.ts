// @ts-nocheck
import type {
  BucketRequirement,
  EnumRequirement,
  ForeignKeyRequirement,
  IndexRequirement,
  RpcRequirement,
  TableRequirement,
  TriggerRequirement,
} from './types'

export const TABLE_REQUIREMENTS: TableRequirement[] = [
  { key: 'orgs', schema: 'public', candidates: ['organizations', 'orgs'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'name', expectedTypes: ['text', 'varchar'], nullable: false },
    { name: 'current_tier_id', expectedTypes: ['uuid'], nullable: true },
    { name: 'is_demo_org', expectedTypes: ['boolean'], nullable: false },
  ]},
  { key: 'org_memberships', schema: 'public', candidates: ['organization_members', 'org_memberships'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'user_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'role', expectedTypes: ['enum:org_member_role'], nullable: false },
  ]},
  { key: 'users', schema: 'public', candidates: ['users'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'email', expectedTypes: ['text', 'varchar'], nullable: true },
    { name: 'role', expectedTypes: ['enum:user_role'], nullable: true },
  ]},
  { key: 'teams', schema: 'public', candidates: ['teams'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'name', expectedTypes: ['text', 'varchar'], nullable: false },
    { name: 'level_id', expectedTypes: ['uuid'], nullable: true },
  ]},
  { key: 'programs', schema: 'public', candidates: ['programs'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'sport_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'levels', schema: 'public', candidates: ['levels'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'program_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'seasons', schema: 'public', candidates: ['seasons'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'start_date', expectedTypes: ['date'], nullable: false },
    { name: 'end_date', expectedTypes: ['date'], nullable: false },
  ]},
  { key: 'athletes', schema: 'public', candidates: ['athletes'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: true },
    { name: 'first_name', expectedTypes: ['text', 'varchar'], nullable: false },
    { name: 'last_name', expectedTypes: ['text', 'varchar'], nullable: false },
  ]},
  { key: 'guardians', schema: 'public', candidates: ['guardians'], required: false, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'athletes_guardians', schema: 'public', candidates: ['athlete_guardians', 'athletes_guardians'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'athlete_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'user_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'team_roster', schema: 'public', candidates: ['team_memberships', 'team_roster'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'team_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'athlete_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'season_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'team_coaches', schema: 'public', candidates: ['team_coaches'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'team_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'coach_user_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'staff_assignments', schema: 'public', candidates: ['staff_assignments'], required: false, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'events', schema: 'public', candidates: ['events'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'team_id', expectedTypes: ['uuid'], nullable: true },
    { name: 'start_time', expectedTypes: ['timestamptz'], nullable: false },
    { name: 'end_time', expectedTypes: ['timestamptz'], nullable: false },
  ]},
  { key: 'attendance', schema: 'public', candidates: ['attendance'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'event_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'athlete_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'event_rsvps', schema: 'public', candidates: ['event_rsvps'], required: false, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'event_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'athlete_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'travel_plans', schema: 'public', candidates: ['travel_plans'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'team_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'season_id', expectedTypes: ['uuid'], nullable: false },
  ]},
]

TABLE_REQUIREMENTS.push(
  { key: 'facilities', schema: 'public', candidates: ['facilities'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'facility_resources', schema: 'public', candidates: ['facility_resources'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'facility_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'facility_blackouts', schema: 'public', candidates: ['facility_blackouts'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'start_at', expectedTypes: ['timestamptz'], nullable: false },
    { name: 'end_at', expectedTypes: ['timestamptz'], nullable: false },
  ]},
  { key: 'facility_reservations', schema: 'public', candidates: ['facility_reservations'], required: true, requiredColumns: [
    { name: 'id', expectedTypes: ['uuid'], nullable: false },
    { name: 'org_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'facility_id', expectedTypes: ['uuid'], nullable: false },
    { name: 'resource_id', expectedTypes: ['uuid'], nullable: false },
  ]},
  { key: 'galleries', schema: 'public', candidates: ['galleries'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'gallery_photos', schema: 'public', candidates: ['gallery_photos'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'gallery_id', expectedTypes: ['uuid'], nullable: false }, { name: 'storage_path', expectedTypes: ['text', 'varchar'], nullable: false }]},
  { key: 'videos', schema: 'public', candidates: ['videos'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }, { name: 'uploaded_by', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'video_notes', schema: 'public', candidates: ['video_notes'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'video_id', expectedTypes: ['uuid'], nullable: false }, { name: 'author_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'video_comments', schema: 'public', candidates: ['video_comments'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'video_id', expectedTypes: ['uuid'], nullable: false }, { name: 'author_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'video_bookmarks', schema: 'public', candidates: ['video_bookmarks'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'video_id', expectedTypes: ['uuid'], nullable: false }, { name: 'user_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'ticketed_events', schema: 'public', candidates: ['ticketed_events'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'ticket_types', schema: 'public', candidates: ['ticket_types'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'ticketed_event_id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'orders', schema: 'public', candidates: ['ticket_orders', 'orders'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }, { name: 'status', expectedTypes: ['enum:ticket_order_status'], nullable: false }]},
  { key: 'order_items', schema: 'public', candidates: ['ticket_order_items', 'order_items'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'order_id', expectedTypes: ['uuid'], nullable: false }, { name: 'ticket_type_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'ticket_scans', schema: 'public', candidates: ['ticket_scans'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }, { name: 'ticketed_event_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'refunds', schema: 'public', candidates: ['refunds'], required: false, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'org_licenses', schema: 'public', candidates: ['org_licenses'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: true }, { name: 'stripe_customer_id', expectedTypes: ['text', 'varchar'], nullable: true }, { name: 'stripe_subscription_id', expectedTypes: ['text', 'varchar'], nullable: true }]},
  { key: 'tiers', schema: 'public', candidates: ['license_tiers', 'tiers'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'tier_key', expectedTypes: ['text', 'varchar'], nullable: false }, { name: 'stripe_price_id', expectedTypes: ['text', 'varchar'], nullable: false }]},
  { key: 'tier_features', schema: 'public', candidates: ['tier_feature_assignments', 'tier_features'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'license_tier_id', expectedTypes: ['uuid'], nullable: false }, { name: 'feature_entitlement_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'feature_entitlements', schema: 'public', candidates: ['feature_entitlements'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'feature_key', expectedTypes: ['text', 'varchar'], nullable: false }, { name: 'platform_admin_only', expectedTypes: ['boolean'], nullable: false }, { name: 'excluded_from_discovery', expectedTypes: ['boolean'], nullable: false }]},
  { key: 'notification_types', schema: 'public', candidates: ['notification_types'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'key', expectedTypes: ['text', 'varchar'], nullable: false }, { name: 'supports_email', expectedTypes: ['boolean'], nullable: false }]},
  { key: 'email_templates', schema: 'public', candidates: ['email_templates'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'slug', expectedTypes: ['text', 'varchar'], nullable: false }, { name: 'notification_type_id', expectedTypes: ['uuid'], nullable: true }]},
  { key: 'user_notification_preferences', schema: 'public', candidates: ['user_notification_preferences'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'user_id', expectedTypes: ['uuid'], nullable: false }, { name: 'notification_type_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'in_app_notifications', schema: 'public', candidates: ['user_notifications', 'in_app_notifications'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'user_id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'notifications_outbox', schema: 'public', candidates: ['notifications_outbox'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }, { name: 'notification_type_id', expectedTypes: ['uuid'], nullable: false }, { name: 'target_user_id', expectedTypes: ['uuid'], nullable: false }, { name: 'idempotency_key', expectedTypes: ['text', 'varchar'], nullable: false }]},
  { key: 'sport_profiles', schema: 'public', candidates: ['athlete_sport_profiles', 'sport_profiles'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'athlete_id', expectedTypes: ['uuid'], nullable: false }, { name: 'org_id', expectedTypes: ['uuid'], nullable: false }, { name: 'sport_code', expectedTypes: ['text', 'varchar'], nullable: false }]},
  { key: 'sport_profile_extensions', schema: 'public', candidates: ['athlete_sport_stats_v2', 'athlete_sport_evaluations_v2'], required: false, requiredColumns: [{ name: 'athlete_identity_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'sub_orgs', schema: 'public', candidates: ['sub_orgs', 'sub_organizations', 'sub_org_settings'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'sub_org_memberships', schema: 'public', candidates: ['sub_org_memberships', 'sub_organization_memberships'], required: false, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'demo_organizations', schema: 'public', candidates: ['demo_organizations'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'organization_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'demo_sessions', schema: 'public', candidates: ['demo_sessions'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'organization_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'demo_account_roles', schema: 'public', candidates: ['demo_account_roles'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'organization_id', expectedTypes: ['uuid'], nullable: false }, { name: 'user_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'demo_org_pocs', schema: 'public', candidates: ['demo_org_pocs'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'organization_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'demo_codes', schema: 'public', candidates: ['demo_codes'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'organization_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'athlete_identities_v2', schema: 'public', candidates: ['athlete_identities_v2'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'canonical_athlete_id', expectedTypes: ['uuid'], nullable: true }]},
  { key: 'athlete_identity_links_v2', schema: 'public', candidates: ['athlete_identity_links_v2'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'identity_id', expectedTypes: ['uuid'], nullable: false }, { name: 'athlete_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'athlete_identity_merge_inbox_v2', schema: 'public', candidates: ['athlete_identity_merge_inbox_v2'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'identity_id', expectedTypes: ['uuid'], nullable: false }]},
  { key: 'athlete_sport_filter_preferences_v2', schema: 'public', candidates: ['athlete_sport_filter_preferences_v2'], required: true, requiredColumns: [{ name: 'user_id', expectedTypes: ['uuid'], nullable: false }, { name: 'context_hash', expectedTypes: ['text', 'varchar'], nullable: false }, { name: 'sport_filter', expectedTypes: ['text', 'varchar'], nullable: false }]},
  { key: 'v2_write_outbox', schema: 'public', candidates: ['v2_write_outbox'], required: true, requiredColumns: [{ name: 'id', expectedTypes: ['uuid'], nullable: false }, { name: 'idempotency_key', expectedTypes: ['text', 'varchar'], nullable: false }, { name: 'status', expectedTypes: ['text', 'varchar'], nullable: false }]},
)

export const FOREIGN_KEY_REQUIREMENTS: ForeignKeyRequirement[] = [
  { fromTableKey: 'teams', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'programs', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'levels', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'seasons', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'athletes', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'team_roster', fromColumn: 'team_id', toTableKey: 'teams', toColumn: 'id', required: true },
  { fromTableKey: 'team_roster', fromColumn: 'athlete_id', toTableKey: 'athletes', toColumn: 'id', required: true },
  { fromTableKey: 'team_roster', fromColumn: 'season_id', toTableKey: 'seasons', toColumn: 'id', required: true },
  { fromTableKey: 'team_coaches', fromColumn: 'team_id', toTableKey: 'teams', toColumn: 'id', required: true },
  { fromTableKey: 'team_coaches', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'events', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'events', fromColumn: 'team_id', toTableKey: 'teams', toColumn: 'id', required: true },
  { fromTableKey: 'attendance', fromColumn: 'event_id', toTableKey: 'events', toColumn: 'id', required: true },
  { fromTableKey: 'attendance', fromColumn: 'athlete_id', toTableKey: 'athletes', toColumn: 'id', required: true },
  { fromTableKey: 'event_rsvps', fromColumn: 'event_id', toTableKey: 'events', toColumn: 'id', required: false },
  { fromTableKey: 'event_rsvps', fromColumn: 'athlete_id', toTableKey: 'athletes', toColumn: 'id', required: false },
  { fromTableKey: 'athletes_guardians', fromColumn: 'athlete_id', toTableKey: 'athletes', toColumn: 'id', required: true },
  { fromTableKey: 'sport_profiles', fromColumn: 'athlete_id', toTableKey: 'athletes', toColumn: 'id', required: true },
  { fromTableKey: 'orders', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'orders', fromColumn: 'ticketed_event_id', toTableKey: 'ticketed_events', toColumn: 'id', required: true },
  { fromTableKey: 'order_items', fromColumn: 'order_id', toTableKey: 'orders', toColumn: 'id', required: true },
  { fromTableKey: 'order_items', fromColumn: 'ticket_type_id', toTableKey: 'ticket_types', toColumn: 'id', required: true },
  { fromTableKey: 'ticket_types', fromColumn: 'ticketed_event_id', toTableKey: 'ticketed_events', toColumn: 'id', required: true },
  { fromTableKey: 'ticket_scans', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'notifications_outbox', fromColumn: 'org_id', toTableKey: 'orgs', toColumn: 'id', required: true },
  { fromTableKey: 'notifications_outbox', fromColumn: 'notification_type_id', toTableKey: 'notification_types', toColumn: 'id', required: true },
  { fromTableKey: 'user_notification_preferences', fromColumn: 'notification_type_id', toTableKey: 'notification_types', toColumn: 'id', required: true },
]

export const INDEX_REQUIREMENTS: IndexRequirement[] = [
  { tableKey: 'teams', columns: ['org_id'], required: true },
  { tableKey: 'programs', columns: ['org_id'], required: true },
  { tableKey: 'levels', columns: ['org_id'], required: true },
  { tableKey: 'seasons', columns: ['org_id'], required: true },
  { tableKey: 'athletes', columns: ['org_id'], required: true },
  { tableKey: 'events', columns: ['org_id'], required: true },
  { tableKey: 'events', columns: ['start_time'], required: true },
  { tableKey: 'events', columns: ['org_id', 'start_time'], orderedPrefix: true, required: true },
  { tableKey: 'events', columns: ['org_id', 'team_id'], orderedPrefix: true, required: true },
  { tableKey: 'sport_profiles', columns: ['athlete_id'], required: true },
  { tableKey: 'in_app_notifications', columns: ['user_id'], required: true },
  { tableKey: 'ticket_types', columns: ['ticketed_event_id'], required: true },
  { tableKey: 'order_items', columns: ['order_id'], required: true },
  { tableKey: 'notifications_outbox', columns: ['idempotency_key'], required: true },
  { tableKey: 'notifications_outbox', columns: ['status', 'created_at'], orderedPrefix: true, required: true },
  { tableKey: 'v2_write_outbox', columns: ['idempotency_key'], required: true },
]

export const SENSITIVE_RLS_TABLE_KEYS = ['orgs', 'teams', 'athletes', 'sport_profiles', 'orders', 'order_items', 'attendance', 'user_notification_preferences', 'in_app_notifications', 'facilities', 'ticket_scans', 'org_licenses', 'notifications_outbox', 'athlete_identities_v2', 'athlete_identity_links_v2', 'athlete_identity_merge_inbox_v2', 'athlete_sport_filter_preferences_v2', 'v2_write_outbox']

export const REQUIRED_POLICY_ROLE_PATTERNS = [
  { role: 'coach', patterns: ['coach'] },
  { role: 'guardian', patterns: ['guardian', 'parent'] },
  { role: 'org_admin', patterns: ['org_admin'] },
]

export const RPC_REQUIREMENTS: RpcRequirement[] = [
  { name: 'get_org_dashboard_kpis', argTypes: ['uuid'], returnTypes: ['jsonb'], required: true },
  { name: 'get_coach_team_kpis', argTypes: ['uuid', 'uuid'], returnTypes: ['jsonb'], required: true },
  { name: 'get_coach_sport_profile_insights', argTypes: ['uuid', 'uuid', 'text', 'jsonb'], returnTypes: ['jsonb'], required: true },
  { name: 'get_attendance_summary', argTypes: ['uuid', 'uuid[]', 'jsonb'], returnTypes: ['jsonb'], required: true },
  { name: 'get_ticketing_summary', argTypes: ['uuid', 'jsonb'], returnTypes: ['jsonb'], required: true },
  { name: 'get_facilities_utilization', argTypes: ['uuid', 'jsonb'], returnTypes: ['jsonb'], required: true },
  { name: 'notify', returnTypes: ['jsonb', 'void'], required: false },
  { name: 'sync_stripe_subscription', returnTypes: ['jsonb', 'void'], required: false },
  { name: 'get_unified_athlete_profile_v2', returnTypes: ['jsonb'], required: true },
  { name: 'get_unified_athlete_schedule_v2', returnTypes: ['jsonb'], required: true },
  { name: 'get_unified_athlete_documents_v2', returnTypes: ['jsonb'], required: true },
  { name: 'upsert_sport_filter_preference_v2', returnTypes: ['jsonb'], required: true },
  { name: 'resolve_athlete_identity_link_v2', returnTypes: ['jsonb'], required: true },
  { name: 'list_identity_merge_inbox_v2', returnTypes: ['jsonb'], required: true },
  { name: 'create_identity_link_v2', returnTypes: ['jsonb'], required: true },
  { name: 'get_athlete_profile_v2_fan', returnTypes: ['jsonb'], required: true },
  { name: 'enqueue_v2_write_outbox_event', returnTypes: ['jsonb', 'void'], required: true },
  { name: 'run_v2_write_outbox_reconciliation', returnTypes: ['jsonb'], required: true },
]

export const ENUM_REQUIREMENTS: EnumRequirement[] = [
  { enumCandidates: ['notification_channel'], requiredValueGroups: [['in_app'], ['email']], required: true },
  { enumCandidates: ['ticket_order_status', 'order_status'], requiredValueGroups: [['pending', 'pending_payment'], ['completed', 'paid'], ['refunded']], required: true },
  { enumCandidates: ['license_status'], requiredValueGroups: [['active'], ['trial', 'trialing'], ['past_due'], ['canceled', 'cancelled']], required: true },
  { enumCandidates: ['org_member_role'], requiredValueGroups: [['org_admin'], ['coach'], ['staff'], ['guardian', 'parent']], required: true },
  { enumCandidates: ['user_role'], requiredValueGroups: [['platform_admin'], ['org_admin'], ['coach'], ['guardian', 'parent']], required: true },
  { enumCandidates: ['event_status', 'ticketed_event_status'], requiredValueGroups: [['scheduled', 'published', 'draft'], ['canceled', 'cancelled']], required: true },
]

export const TRIGGER_REQUIREMENTS: TriggerRequirement[] = [
  { tableKey: 'notifications_outbox', triggerName: 'update_notifications_outbox_processed_at', functionName: 'update_notifications_outbox_processed_at', required: true },
  { tableKey: 'org_licenses', triggerName: 'trg_sync_organization_license', functionName: 'sync_organization_license_from_org_licenses', required: true },
  { tableKey: 'videos', triggerName: 'trigger_videos_updated_at', functionName: 'update_video_updated_at', required: true },
  { tableKey: 'orders', triggerName: 'update_ticket_orders_updated_at', functionName: 'update_updated_at_column', required: true },
  { tableKey: 'ticket_scans', triggerName: 'update_ticket_scans_updated_at', functionName: 'update_updated_at_column', required: false },
]

export const BUCKET_REQUIREMENTS: BucketRequirement[] = [
  { logicalName: 'org-media', candidates: ['org-media', 'organization-assets', 'public-media'], required: true },
  { logicalName: 'video-uploads', candidates: ['video-uploads', 'public-media'], required: true },
  { logicalName: 'ticket-assets', candidates: ['ticket-assets', 'ticketing-seat-maps'], required: true },
]

export const SENSITIVE_NON_PUBLIC_BUCKETS = ['org-media', 'organization-assets', 'video-uploads', 'ticket-assets', 'athlete-imports', 'bulk-imports']
export const STRIPE_ENV_VARS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
export const REQUIRED_NOTIFICATION_OUTBOX_COLUMNS = ['id', 'org_id', 'target_user_id', 'notification_type_id', 'channel', 'status', 'idempotency_key', 'payload_json', 'created_at']
export const DEFAULT_TIER_KEYS = ['tier1', 'tier2', 'tier3']
export const ROLE_REQUIREMENTS = ['platform_admin', 'org_admin', 'coach', 'staff', 'guardian', 'athlete', 'fan']


