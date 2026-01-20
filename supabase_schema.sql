-- Full Database Schema
-- Generated from remote Supabase database

-- SCHEMAS
CREATE SCHEMA IF NOT EXISTS "public";

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE "auth"."aal_level" AS ENUM (
  'aal1',
  'aal2',
  'aal3'
);

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
  's256',
  'plain'
);

CREATE TYPE "auth"."factor_status" AS ENUM (
  'unverified',
  'verified'
);

CREATE TYPE "auth"."factor_type" AS ENUM (
  'totp',
  'webauthn',
  'phone'
);

CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
  'pending',
  'approved',
  'denied',
  'expired'
);

CREATE TYPE "auth"."oauth_client_type" AS ENUM (
  'public',
  'confidential'
);

CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
  'dynamic',
  'manual'
);

CREATE TYPE "auth"."oauth_response_type" AS ENUM (
  'code'
);

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
  'confirmation_token',
  'reauthentication_token',
  'recovery_token',
  'email_change_token_new',
  'email_change_token_current',
  'phone_change_token'
);

CREATE TYPE "public"."admin_event_type" AS ENUM (
  'ACTIVATE_ORGANIZATION',
  'SUSPEND_ORGANIZATION',
  'DISABLE_USER',
  'ENABLE_USER',
  'SET_FEATURE_FLAG',
  'ADD_PLATFORM_ADMIN',
  'REMOVE_PLATFORM_ADMIN',
  'UPDATE_PLATFORM_ADMIN',
  'PII_VIEWED',
  'ISSUE_REFUND',
  'MARK_DISPUTE',
  'RESEND_VERIFICATION',
  'FORCE_LOGOUT'
);

CREATE TYPE "public"."athlete_guardian_status" AS ENUM (
  'active',
  'pending',
  'removed'
);

CREATE TYPE "public"."attendance_status" AS ENUM (
  'going',
  'late',
  'not_going'
);

CREATE TYPE "public"."auth_event_type" AS ENUM (
  'USER_SIGNED_UP',
  'USER_LOGGED_IN',
  'USER_LOGGED_OUT',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'EMAIL_VERIFIED',
  'EMAIL_VERIFICATION_SENT',
  'ACCOUNT_DISABLED',
  'ACCOUNT_ENABLED'
);

CREATE TYPE "public"."billing_mode" AS ENUM (
  'platform_facilitated',
  'offline_only'
);

CREATE TYPE "public"."calendar_event_type" AS ENUM (
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_DELETED',
  'EVENT_CANCELLED',
  'EVENT_RSVP_SUBMITTED',
  'EVENT_RSVP_UPDATED'
);

CREATE TYPE "public"."charge_status" AS ENUM (
  'pending',
  'applied',
  'voided'
);

CREATE TYPE "public"."charge_type" AS ENUM (
  'fee_payment',
  'late_fee',
  'discount',
  'scholarship_credit',
  'waiver_credit',
  'adjustment'
);

CREATE TYPE "public"."checkout_session_status" AS ENUM (
  'created',
  'in_progress',
  'succeeded',
  'canceled',
  'expired'
);

CREATE TYPE "public"."child_event_type" AS ENUM (
  'CHILD_CREATED',
  'CHILD_UPDATED',
  'CHILD_DELETED',
  'CHILD_PROFILE_UPDATED'
);

CREATE TYPE "public"."discount_code_status" AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE "public"."discount_type" AS ENUM (
  'percent',
  'fixed'
);

CREATE TYPE "public"."event_actor_role" AS ENUM (
  'platform_admin',
  'org_admin',
  'coach',
  'parent',
  'system'
);

CREATE TYPE "public"."event_attendance_status" AS ENUM (
  'present',
  'absent',
  'late',
  'excused'
);

CREATE TYPE "public"."event_category" AS ENUM (
  'AUTH',
  'ORGANIZATION',
  'USER',
  'PARENT',
  'CHILD',
  'TEAM',
  'SEASON',
  'EVENT',
  'PAYMENT',
  'TRYOUT',
  'TRAVEL',
  'UNIFORM',
  'FEATURE_FLAG',
  'ADMIN',
  'SYSTEM'
);

CREATE TYPE "public"."event_type" AS ENUM (
  'practice',
  'game',
  'tournament',
  'meeting',
  'tryout',
  'travel',
  'pickup_dropoff',
  'social',
  'blackout'
);

CREATE TYPE "public"."feature_flag_environment" AS ENUM (
  'dev',
  'staging',
  'prod'
);

CREATE TYPE "public"."feature_flag_event_type" AS ENUM (
  'FEATURE_FLAG_ENABLED',
  'FEATURE_FLAG_DISABLED',
  'FEATURE_FLAG_OVERRIDE_CREATED',
  'FEATURE_FLAG_OVERRIDE_DELETED'
);

CREATE TYPE "public"."feature_flag_value_type" AS ENUM (
  'boolean',
  'integer',
  'double'
);

CREATE TYPE "public"."fee_assignment_status" AS ENUM (
  'unpaid',
  'partial',
  'paid',
  'refunded',
  'waived',
  'scholarship_applied',
  'offline_recorded'
);

CREATE TYPE "public"."fee_scope" AS ENUM (
  'team',
  'selected_players',
  'individual'
);

CREATE TYPE "public"."fee_status" AS ENUM (
  'draft',
  'published',
  'closed',
  'archived'
);

CREATE TYPE "public"."fee_type" AS ENUM (
  'registration',
  'uniform',
  'tournament',
  'travel',
  'fundraiser',
  'misc'
);

CREATE TYPE "public"."fee_visibility" AS ENUM (
  'all_parents',
  'assigned_only'
);

CREATE TYPE "public"."installment_frequency" AS ENUM (
  'weekly',
  'biweekly',
  'monthly'
);

CREATE TYPE "public"."installment_schedule_status" AS ENUM (
  'active',
  'completed',
  'defaulted',
  'canceled'
);

CREATE TYPE "public"."installment_status" AS ENUM (
  'upcoming',
  'due',
  'paid',
  'late',
  'skipped',
  'waived'
);

CREATE TYPE "public"."join_request_status" AS ENUM (
  'pending',
  'approved',
  'denied'
);

CREATE TYPE "public"."license_plan" AS ENUM (
  'starter',
  'standard',
  'pro'
);

CREATE TYPE "public"."license_status" AS ENUM (
  'trial',
  'active',
  'past_due',
  'canceled',
  'expired'
);

CREATE TYPE "public"."membership_status" AS ENUM (
  'active',
  'invited',
  'removed'
);

CREATE TYPE "public"."offline_payment_method" AS ENUM (
  'cash',
  'check',
  'external_processor',
  'other'
);

CREATE TYPE "public"."offline_payment_status" AS ENUM (
  'recorded',
  'voided'
);

CREATE TYPE "public"."org_member_role" AS ENUM (
  'parent',
  'coach',
  'org_admin'
);

CREATE TYPE "public"."org_status" AS ENUM (
  'trial',
  'active',
  'suspended',
  'expired'
);

CREATE TYPE "public"."org_type" AS ENUM (
  'school',
  'club',
  'league',
  'academy',
  'aau'
);

CREATE TYPE "public"."organization_event_type" AS ENUM (
  'ORG_CREATED',
  'ORG_UPDATED',
  'ORG_ACTIVATED',
  'ORG_SUSPENDED',
  'ORG_DELETED',
  'ORG_STRIPE_CONNECTED',
  'ORG_STRIPE_DISCONNECTED',
  'ORG_LICENSE_UPDATED'
);

CREATE TYPE "public"."parent_event_type" AS ENUM (
  'PARENT_PROFILE_UPDATED',
  'PARENT_EMAIL_CHANGED',
  'PARENT_PHONE_CHANGED'
);

CREATE TYPE "public"."parent_invite_status" AS ENUM (
  'pending',
  'accepted',
  'cancelled',
  'expired'
);

CREATE TYPE "public"."payment_event_entity_type" AS ENUM (
  'fee',
  'fee_assignment',
  'charge',
  'checkout_session',
  'payment',
  'offline_payment',
  'refund',
  'waiver',
  'scholarship_award',
  'discount_redemption'
);

CREATE TYPE "public"."payment_event_type" AS ENUM (
  'FEE_CREATED',
  'FEE_UPDATED',
  'FEE_DELETED',
  'FEE_ASSIGNED',
  'FEE_UNASSIGNED',
  'PAYMENT_STARTED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'OFFLINE_PAYMENT_RECORDED',
  'OFFLINE_PAYMENT_VOIDED',
  'DISCOUNT_APPLIED',
  'WAIVER_APPLIED',
  'SCHOLARSHIP_APPLIED'
);

CREATE TYPE "public"."payment_status" AS ENUM (
  'due',
  'paid',
  'refunded'
);

CREATE TYPE "public"."payment_status_new" AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE "public"."payout_onboarding_status" AS ENUM (
  'pending',
  'completed',
  'restricted'
);

CREATE TYPE "public"."platform_admin_role" AS ENUM (
  'super_admin',
  'support_admin',
  'finance_admin',
  'ops_admin'
);

CREATE TYPE "public"."recurrence_frequency" AS ENUM (
  'weekly',
  'custom'
);

CREATE TYPE "public"."rsvp_status" AS ENUM (
  'going',
  'late',
  'not_going',
  'unknown'
);

CREATE TYPE "public"."scholarship_funding_source" AS ENUM (
  'org_funded',
  'sponsor_funded',
  'district_funded'
);

CREATE TYPE "public"."scholarship_program_status" AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE "public"."season_event_type" AS ENUM (
  'SEASON_CREATED',
  'SEASON_UPDATED',
  'SEASON_DELETED',
  'SEASON_ACTIVATED',
  'SEASON_ARCHIVED'
);

CREATE TYPE "public"."start_date_rule" AS ENUM (
  'on_publish',
  'custom_date'
);

CREATE TYPE "public"."system_event_type" AS ENUM (
  'SCHEDULED_JOB_STARTED',
  'SCHEDULED_JOB_COMPLETED',
  'SCHEDULED_JOB_FAILED',
  'WEBHOOK_RECEIVED',
  'WEBHOOK_PROCESSED',
  'WEBHOOK_FAILED',
  'DATABASE_BACKUP',
  'SYSTEM_ALERT'
);

CREATE TYPE "public"."team_event_type" AS ENUM (
  'TEAM_CREATED',
  'TEAM_UPDATED',
  'TEAM_DELETED',
  'TEAM_MEMBER_ADDED',
  'TEAM_MEMBER_REMOVED',
  'TEAM_INVITE_SENT',
  'TEAM_INVITE_ACCEPTED'
);

CREATE TYPE "public"."travel_event_type" AS ENUM (
  'TRAVEL_PLAN_CREATED',
  'TRAVEL_PLAN_UPDATED',
  'TRAVEL_PLAN_DELETED',
  'TRAVEL_ITINERARY_UPDATED',
  'TRAVEL_BOOKING_CONFIRMED'
);

CREATE TYPE "public"."tryout_document_status" AS ENUM (
  'missing',
  'uploaded',
  'approved',
  'rejected'
);

CREATE TYPE "public"."tryout_event_type" AS ENUM (
  'TRYOUT_CREATED',
  'TRYOUT_UPDATED',
  'TRYOUT_DELETED',
  'TRYOUT_REGISTRATION_STARTED',
  'TRYOUT_REGISTRATION_COMPLETED',
  'TRYOUT_CHECKED_IN',
  'TRYOUT_EVALUATED',
  'TRYOUT_OFFERED',
  'TRYOUT_ACCEPTED',
  'TRYOUT_DECLINED',
  'TRYOUT_REJECTED'
);

CREATE TYPE "public"."tryout_registration_status" AS ENUM (
  'registered',
  'checked_in',
  'evaluated',
  'offered',
  'accepted',
  'declined',
  'rejected',
  'withdrawn',
  'waitlisted',
  'not_selected'
);

CREATE TYPE "public"."uniform_event_type" AS ENUM (
  'UNIFORM_KIT_CREATED',
  'UNIFORM_KIT_UPDATED',
  'UNIFORM_ORDER_SUBMITTED',
  'UNIFORM_ORDER_UPDATED',
  'UNIFORM_ORDER_FULFILLED'
);

CREATE TYPE "public"."uniform_order_status" AS ENUM (
  'pending',
  'ordered',
  'delivered'
);

CREATE TYPE "public"."uniform_submission_status" AS ENUM (
  'not_submitted',
  'submitted',
  'locked',
  'fulfilled'
);

CREATE TYPE "public"."user_event_type" AS ENUM (
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'USER_ROLE_CHANGED',
  'USER_ORG_JOINED',
  'USER_ORG_LEFT'
);

CREATE TYPE "public"."user_role" AS ENUM (
  'parent',
  'coach',
  'admin'
);

CREATE TYPE "realtime"."action" AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'ERROR'
);

CREATE TYPE "realtime"."equality_op" AS ENUM (
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'in'
);

CREATE TYPE "storage"."buckettype" AS ENUM (
  'STANDARD',
  'ANALYTICS',
  'VECTOR'
);

-- TABLES IN SCHEMA: auth
CREATE TABLE "auth"."audit_log_entries" (

);

CREATE TABLE "auth"."flow_state" (

);

CREATE TABLE "auth"."identities" (

);

CREATE TABLE "auth"."instances" (

);

CREATE TABLE "auth"."mfa_amr_claims" (

);

CREATE TABLE "auth"."mfa_challenges" (

);

CREATE TABLE "auth"."mfa_factors" (

);

CREATE TABLE "auth"."oauth_authorizations" (

);

CREATE TABLE "auth"."oauth_client_states" (

);

CREATE TABLE "auth"."oauth_clients" (

);

CREATE TABLE "auth"."oauth_consents" (

);

CREATE TABLE "auth"."one_time_tokens" (

);

CREATE TABLE "auth"."refresh_tokens" (

);

CREATE TABLE "auth"."saml_providers" (

);

CREATE TABLE "auth"."saml_relay_states" (

);

CREATE TABLE "auth"."schema_migrations" (

);

CREATE TABLE "auth"."sessions" (

);

CREATE TABLE "auth"."sso_domains" (

);

CREATE TABLE "auth"."sso_providers" (

);

CREATE TABLE "auth"."users" (

);

-- TABLES IN SCHEMA: public
CREATE TABLE "public"."announcements" (

);

CREATE TABLE "public"."athlete_guardians" (

);

CREATE TABLE "public"."athlete_imports" (

);

CREATE TABLE "public"."athletes" (

);

CREATE TABLE "public"."attendance" (

);

CREATE TABLE "public"."attendance_settings" (

);

CREATE TABLE "public"."audit_logs_old" (

);

CREATE TABLE "public"."billing_events" (

);

CREATE TABLE "public"."charges" (

);

CREATE TABLE "public"."checkout_session_items" (

);

CREATE TABLE "public"."checkout_sessions" (

);

CREATE TABLE "public"."child_claim_tokens" (

);

CREATE TABLE "public"."discount_codes" (

);

CREATE TABLE "public"."discount_redemptions" (

);

CREATE TABLE "public"."event_attendance" (

);

CREATE TABLE "public"."event_change_history" (

);

CREATE TABLE "public"."event_locations" (

);

CREATE TABLE "public"."event_logs" (

);

CREATE TABLE "public"."event_logs_archive" (

);

CREATE TABLE "public"."event_rsvps" (

);

CREATE TABLE "public"."events" (

);

CREATE TABLE "public"."families" (

);

CREATE TABLE "public"."family_members" (

);

CREATE TABLE "public"."feature_flag_audit_log" (

);

CREATE TABLE "public"."feature_flag_org_overrides" (

);

CREATE TABLE "public"."feature_flag_platform_defaults" (

);

CREATE TABLE "public"."feature_flag_user_overrides" (

);

CREATE TABLE "public"."feature_flags" (

);

CREATE TABLE "public"."fee_assignments" (

);

CREATE TABLE "public"."fees" (

);

CREATE TABLE "public"."installment_plans" (

);

CREATE TABLE "public"."installment_schedules" (

);

CREATE TABLE "public"."installments" (

);

CREATE TABLE "public"."join_links" (

);

CREATE TABLE "public"."join_requests" (

);

CREATE TABLE "public"."levels" (

);

CREATE TABLE "public"."license_tiers" (

);

CREATE TABLE "public"."messages" (

);

CREATE TABLE "public"."migration_errors" (

);

CREATE TABLE "public"."offline_payment_allocations" (

);

CREATE TABLE "public"."offline_payments" (

);

CREATE TABLE "public"."org_licenses" (

);

CREATE TABLE "public"."org_payment_policies" (

);

CREATE TABLE "public"."organization_advanced_settings" (

);

CREATE TABLE "public"."organization_attendance_settings" (

);

CREATE TABLE "public"."organization_defaults" (

);

CREATE TABLE "public"."organization_invites" (

);

CREATE TABLE "public"."organization_members" (

);

CREATE TABLE "public"."organization_notification_settings" (

);

CREATE TABLE "public"."organization_registration_settings" (

);

CREATE TABLE "public"."organization_settings" (

);

CREATE TABLE "public"."organization_sports" (

);

CREATE TABLE "public"."organization_visibility_settings" (

);

CREATE TABLE "public"."organizations" (

);

CREATE TABLE "public"."parent_invites" (

);

CREATE TABLE "public"."payment_allocations" (

);

CREATE TABLE "public"."payment_events" (

);

CREATE TABLE "public"."payments" (

);

CREATE TABLE "public"."platform_admins" (

);

CREATE TABLE "public"."programs" (

);

CREATE TABLE "public"."recurring_event_instances" (

);

CREATE TABLE "public"."recurring_event_patterns" (

);

CREATE TABLE "public"."refunds" (

);

CREATE TABLE "public"."scholarship_awards" (

);

CREATE TABLE "public"."scholarship_programs" (

);

CREATE TABLE "public"."seasons" (

);

CREATE TABLE "public"."sports" (

);

CREATE TABLE "public"."team_memberships" (

);

CREATE TABLE "public"."team_seasons" (

);

CREATE TABLE "public"."teams" (

);

CREATE TABLE "public"."travel_plans" (

);

CREATE TABLE "public"."tryout_registration_documents" (

);

CREATE TABLE "public"."tryout_registration_staff_notes" (

);

CREATE TABLE "public"."tryout_registrations" (

);

CREATE TABLE "public"."tryout_required_documents" (

);

CREATE TABLE "public"."tryout_scores" (

);

CREATE TABLE "public"."tryouts" (

);

CREATE TABLE "public"."uniform_kit_items" (

);

CREATE TABLE "public"."uniform_kits" (

);

CREATE TABLE "public"."uniform_orders" (

);

CREATE TABLE "public"."uniform_submission_items" (

);

CREATE TABLE "public"."uniform_submissions" (

);

CREATE TABLE "public"."users" (

);

CREATE TABLE "public"."valid_event_types" (

);

CREATE TABLE "public"."waivers" (

);

-- TABLES IN SCHEMA: realtime
CREATE TABLE "realtime"."messages_2026_01_17" (

);

CREATE TABLE "realtime"."messages_2026_01_18" (

);

CREATE TABLE "realtime"."messages_2026_01_19" (

);

CREATE TABLE "realtime"."messages_2026_01_20" (

);

CREATE TABLE "realtime"."messages_2026_01_21" (

);

CREATE TABLE "realtime"."messages_2026_01_22" (

);

CREATE TABLE "realtime"."messages_2026_01_23" (

);

CREATE TABLE "realtime"."schema_migrations" (

);

CREATE TABLE "realtime"."subscription" (

);

-- TABLES IN SCHEMA: storage
CREATE TABLE "storage"."buckets" (

);

CREATE TABLE "storage"."buckets_analytics" (

);

CREATE TABLE "storage"."buckets_vectors" (

);

CREATE TABLE "storage"."migrations" (

);

CREATE TABLE "storage"."objects" (

);

CREATE TABLE "storage"."prefixes" (

);

CREATE TABLE "storage"."s3_multipart_uploads" (

);

CREATE TABLE "storage"."s3_multipart_uploads_parts" (

);

CREATE TABLE "storage"."vector_indexes" (

);

-- TABLES IN SCHEMA: supabase_migrations
CREATE TABLE "supabase_migrations"."schema_migrations" (

);

-- TABLES IN SCHEMA: vault
CREATE TABLE "vault"."secrets" (

);

-- FOREIGN KEYS

-- INDEXES
CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id);
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);
CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id);
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);
CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id);
CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider);
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);
CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id);
CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id);
CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method);
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);
CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id);
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);
CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at);
CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id);
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);
CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);
CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code);
CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id);
CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id);
CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);
CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id);
CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);
CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id);
CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);
CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);
CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id);
CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id);
CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);
CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id);
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);
CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id);
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);
CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token);
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);
CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id);
CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id);
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);
CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id);
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);
CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version);
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);
CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);
CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id);
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));
CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id);
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);
CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id);
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));
CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);
CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone);
CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id);
CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id);
CREATE INDEX idx_announcements_author_id ON public.announcements USING btree (author_id);
CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at);
CREATE INDEX idx_announcements_team_id ON public.announcements USING btree (team_id);
CREATE UNIQUE INDEX athlete_guardians_athlete_id_user_id_organization_id_key ON public.athlete_guardians USING btree (athlete_id, user_id, organization_id);
CREATE UNIQUE INDEX athlete_guardians_pkey ON public.athlete_guardians USING btree (id);
CREATE INDEX idx_athlete_guardians_athlete_org_status ON public.athlete_guardians USING btree (athlete_id, organization_id, status) WHERE (status = 'active'::athlete_guardian_status);
CREATE INDEX idx_athlete_guardians_athlete_user ON public.athlete_guardians USING btree (athlete_id, user_id);
CREATE INDEX idx_athlete_guardians_org_athlete ON public.athlete_guardians USING btree (organization_id, athlete_id);
CREATE INDEX idx_athlete_guardians_user_org ON public.athlete_guardians USING btree (user_id, organization_id);
CREATE INDEX idx_athlete_guardians_user_org_status ON public.athlete_guardians USING btree (user_id, organization_id, status) WHERE (status = 'active'::athlete_guardian_status);
CREATE UNIQUE INDEX athlete_imports_pkey ON public.athlete_imports USING btree (id);
CREATE INDEX idx_athlete_imports_created_at ON public.athlete_imports USING btree (created_at DESC);
CREATE INDEX idx_athlete_imports_created_by ON public.athlete_imports USING btree (created_by_user_id);
CREATE INDEX idx_athlete_imports_org_id ON public.athlete_imports USING btree (org_id);
CREATE INDEX idx_athlete_imports_status ON public.athlete_imports USING btree (status);
CREATE UNIQUE INDEX children_pkey ON public.athletes USING btree (id);
CREATE INDEX idx_athletes_deleted ON public.athletes USING btree (id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_athletes_family_id ON public.athletes USING btree (family_id);
CREATE UNIQUE INDEX attendance_event_id_child_id_key ON public.attendance USING btree (event_id, athlete_id);
CREATE UNIQUE INDEX attendance_pkey ON public.attendance USING btree (id);
CREATE INDEX idx_attendance_child_id ON public.attendance USING btree (athlete_id);
CREATE INDEX idx_attendance_event_id ON public.attendance USING btree (event_id);
CREATE UNIQUE INDEX attendance_settings_pkey ON public.attendance_settings USING btree (org_id);
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs_old USING btree (id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs_old USING btree (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs_old USING btree (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs_old USING btree (entity_type, entity_id, created_at DESC);
CREATE UNIQUE INDEX billing_events_pkey ON public.billing_events USING btree (id);
CREATE UNIQUE INDEX billing_events_stripe_event_id_key ON public.billing_events USING btree (stripe_event_id);
CREATE UNIQUE INDEX billing_events_unique_stripe_event_id ON public.billing_events USING btree (stripe_event_id);
CREATE INDEX idx_billing_events_organization_id ON public.billing_events USING btree (organization_id);
CREATE INDEX idx_billing_events_stripe_event_id ON public.billing_events USING btree (stripe_event_id);
CREATE UNIQUE INDEX charges_pkey ON public.charges USING btree (id);
CREATE INDEX idx_charges_charge_type ON public.charges USING btree (charge_type);
CREATE INDEX idx_charges_created_by_user_id ON public.charges USING btree (created_by_user_id);
CREATE INDEX idx_charges_fee_assignment_id ON public.charges USING btree (fee_assignment_id);
CREATE INDEX idx_charges_fee_id ON public.charges USING btree (fee_id);
CREATE INDEX idx_charges_organization_id ON public.charges USING btree (organization_id);
CREATE INDEX idx_charges_status ON public.charges USING btree (status);
CREATE UNIQUE INDEX checkout_session_items_pkey ON public.checkout_session_items USING btree (id);
CREATE INDEX idx_checkout_session_items_charge_id ON public.checkout_session_items USING btree (charge_id);
CREATE INDEX idx_checkout_session_items_checkout_session_id ON public.checkout_session_items USING btree (checkout_session_id);
CREATE INDEX idx_checkout_session_items_fee_assignment_id ON public.checkout_session_items USING btree (fee_assignment_id);
CREATE UNIQUE INDEX checkout_sessions_pkey ON public.checkout_sessions USING btree (id);
CREATE INDEX idx_checkout_sessions_organization_id ON public.checkout_sessions USING btree (organization_id);
CREATE INDEX idx_checkout_sessions_parent_id ON public.checkout_sessions USING btree (parent_id);
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions USING btree (status);
CREATE INDEX idx_checkout_sessions_stripe_checkout_session_id ON public.checkout_sessions USING btree (stripe_checkout_session_id);
CREATE UNIQUE INDEX child_claim_tokens_pkey ON public.child_claim_tokens USING btree (id);
CREATE UNIQUE INDEX child_claim_tokens_token_key ON public.child_claim_tokens USING btree (token);
CREATE INDEX idx_child_claims_child_org ON public.child_claim_tokens USING btree (athlete_id, organization_id);
CREATE INDEX idx_child_claims_season ON public.child_claim_tokens USING btree (season_id);
CREATE INDEX idx_child_claims_token ON public.child_claim_tokens USING btree (token);
CREATE INDEX idx_derived_families_mv_org ON public.derived_families_mv USING btree (organization_id);
CREATE UNIQUE INDEX idx_derived_families_mv_org_family ON public.derived_families_mv USING btree (organization_id, family_group_id);
CREATE UNIQUE INDEX discount_codes_organization_id_code_key ON public.discount_codes USING btree (organization_id, code);
CREATE UNIQUE INDEX discount_codes_pkey ON public.discount_codes USING btree (id);
CREATE INDEX idx_discount_codes_code ON public.discount_codes USING btree (organization_id, code);
CREATE INDEX idx_discount_codes_organization_id ON public.discount_codes USING btree (organization_id);
CREATE INDEX idx_discount_codes_status ON public.discount_codes USING btree (status);
CREATE UNIQUE INDEX discount_redemptions_pkey ON public.discount_redemptions USING btree (id);
CREATE INDEX idx_discount_redemptions_discount_code_id ON public.discount_redemptions USING btree (discount_code_id);
CREATE INDEX idx_discount_redemptions_fee_assignment_id ON public.discount_redemptions USING btree (fee_assignment_id);
CREATE INDEX idx_discount_redemptions_redeemed_by_parent_id ON public.discount_redemptions USING btree (redeemed_by_parent_id);
CREATE UNIQUE INDEX event_attendance_event_id_child_id_key ON public.event_attendance USING btree (event_id, child_id);
CREATE UNIQUE INDEX event_attendance_pkey ON public.event_attendance USING btree (id);
CREATE INDEX idx_event_attendance_child_id ON public.event_attendance USING btree (child_id);
CREATE INDEX idx_event_attendance_event_id ON public.event_attendance USING btree (event_id);
CREATE UNIQUE INDEX event_change_history_pkey ON public.event_change_history USING btree (id);
CREATE INDEX idx_event_history_change_type ON public.event_change_history USING btree (change_type);
CREATE INDEX idx_event_history_created_at ON public.event_change_history USING btree (created_at DESC);
CREATE INDEX idx_event_history_event_id ON public.event_change_history USING btree (event_id);
CREATE INDEX idx_event_history_notification_sent ON public.event_change_history USING btree (notification_sent) WHERE (notification_sent = false);
CREATE UNIQUE INDEX event_locations_event_id_key ON public.event_locations USING btree (event_id);
CREATE UNIQUE INDEX event_locations_pkey ON public.event_locations USING btree (id);
CREATE INDEX idx_event_locations_city_state ON public.event_locations USING btree (city, state);
CREATE INDEX idx_event_locations_event_id ON public.event_locations USING btree (event_id);
CREATE INDEX idx_event_locations_is_tbd ON public.event_locations USING btree (is_tbd);
CREATE INDEX idx_event_locations_is_virtual ON public.event_locations USING btree (is_virtual);
CREATE UNIQUE INDEX event_logs_idempotency_key_key ON public.event_logs USING btree (idempotency_key);
CREATE UNIQUE INDEX event_logs_pkey ON public.event_logs USING btree (id);
CREATE INDEX idx_event_logs_actor_user_id_created_at ON public.event_logs USING btree (actor_user_id, created_at DESC);
CREATE INDEX idx_event_logs_category_event_type ON public.event_logs USING btree (category, event_type);
CREATE INDEX idx_event_logs_created_at ON public.event_logs USING btree (created_at DESC);
CREATE INDEX idx_event_logs_idempotency_key ON public.event_logs USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_event_logs_org_id_created_at ON public.event_logs USING btree (org_id, created_at DESC);
CREATE INDEX idx_event_logs_target_entity ON public.event_logs USING btree (target_entity_type, target_entity_id);
CREATE INDEX event_logs_archive_actor_user_id_created_at_idx ON public.event_logs_archive USING btree (actor_user_id, created_at DESC);
CREATE INDEX event_logs_archive_category_event_type_idx ON public.event_logs_archive USING btree (category, event_type);
CREATE INDEX event_logs_archive_created_at_idx ON public.event_logs_archive USING btree (created_at DESC);
CREATE INDEX event_logs_archive_idempotency_key_idx ON public.event_logs_archive USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX event_logs_archive_idempotency_key_key ON public.event_logs_archive USING btree (idempotency_key);
CREATE INDEX event_logs_archive_org_id_created_at_idx ON public.event_logs_archive USING btree (org_id, created_at DESC);
CREATE UNIQUE INDEX event_logs_archive_pkey ON public.event_logs_archive USING btree (id);
CREATE INDEX event_logs_archive_target_entity_type_target_entity_id_idx ON public.event_logs_archive USING btree (target_entity_type, target_entity_id);
CREATE INDEX idx_event_logs_recent_category ON public.event_logs_recent USING btree (category);
CREATE INDEX idx_event_logs_recent_created_at ON public.event_logs_recent USING btree (created_at DESC);
CREATE INDEX idx_event_logs_recent_org_id ON public.event_logs_recent USING btree (org_id);
CREATE UNIQUE INDEX event_rsvps_event_id_child_id_key ON public.event_rsvps USING btree (event_id, child_id);
CREATE UNIQUE INDEX event_rsvps_pkey ON public.event_rsvps USING btree (id);
CREATE INDEX idx_event_rsvps_child_id ON public.event_rsvps USING btree (child_id);
CREATE INDEX idx_event_rsvps_event_id ON public.event_rsvps USING btree (event_id);
CREATE INDEX idx_event_rsvps_responded_at ON public.event_rsvps USING btree (responded_at DESC);
CREATE INDEX idx_event_rsvps_status ON public.event_rsvps USING btree (status);
CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);
CREATE INDEX idx_events_created_by_user_id ON public.events USING btree (created_by_user_id);
CREATE INDEX idx_events_departure_time ON public.events USING btree (departure_time);
CREATE INDEX idx_events_is_cancelled ON public.events USING btree (is_cancelled);
CREATE INDEX idx_events_overnight ON public.events USING btree (overnight);
CREATE INDEX idx_events_requires_travel ON public.events USING btree (requires_travel);
CREATE INDEX idx_events_season_id ON public.events USING btree (season_id);
CREATE INDEX idx_events_start_time ON public.events USING btree (start_time);
CREATE INDEX idx_events_team_id ON public.events USING btree (team_id);
CREATE INDEX idx_events_timezone ON public.events USING btree (timezone);
CREATE UNIQUE INDEX families_pkey ON public.families USING btree (id);
CREATE INDEX idx_families_org_id ON public.families USING btree (org_id);
CREATE UNIQUE INDEX family_members_family_id_user_id_key ON public.family_members USING btree (family_id, user_id);
CREATE UNIQUE INDEX family_members_pkey ON public.family_members USING btree (id);
CREATE INDEX idx_family_members_family_id ON public.family_members USING btree (family_id);
CREATE INDEX idx_family_members_user_id ON public.family_members USING btree (user_id);
CREATE UNIQUE INDEX feature_flag_audit_log_pkey ON public.feature_flag_audit_log USING btree (id);
CREATE INDEX idx_audit_log_actor ON public.feature_flag_audit_log USING btree (actor_id, created_at DESC);
CREATE INDEX idx_audit_log_created_at ON public.feature_flag_audit_log USING btree (created_at DESC);
CREATE INDEX idx_audit_log_environment ON public.feature_flag_audit_log USING btree (environment, created_at DESC);
CREATE INDEX idx_audit_log_flag ON public.feature_flag_audit_log USING btree (feature_flag_id, created_at DESC);
CREATE UNIQUE INDEX feature_flag_org_overrides_pkey ON public.feature_flag_org_overrides USING btree (feature_flag_id, org_id, environment);
CREATE INDEX idx_org_overrides_env ON public.feature_flag_org_overrides USING btree (environment);
CREATE INDEX idx_org_overrides_flag ON public.feature_flag_org_overrides USING btree (feature_flag_id);
CREATE INDEX idx_org_overrides_flag_org_env ON public.feature_flag_org_overrides USING btree (feature_flag_id, org_id, environment);
CREATE INDEX idx_org_overrides_org ON public.feature_flag_org_overrides USING btree (org_id);
CREATE UNIQUE INDEX feature_flag_platform_defaults_pkey ON public.feature_flag_platform_defaults USING btree (feature_flag_id, environment);
CREATE INDEX idx_platform_defaults_env ON public.feature_flag_platform_defaults USING btree (environment);
CREATE INDEX idx_platform_defaults_flag ON public.feature_flag_platform_defaults USING btree (feature_flag_id);
CREATE UNIQUE INDEX feature_flag_user_overrides_pkey ON public.feature_flag_user_overrides USING btree (feature_flag_id, user_id, environment);
CREATE INDEX idx_user_overrides_env ON public.feature_flag_user_overrides USING btree (environment);
CREATE INDEX idx_user_overrides_flag ON public.feature_flag_user_overrides USING btree (feature_flag_id);
CREATE INDEX idx_user_overrides_flag_user_env ON public.feature_flag_user_overrides USING btree (feature_flag_id, user_id, environment);
CREATE INDEX idx_user_overrides_user ON public.feature_flag_user_overrides USING btree (user_id);
CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id);
CREATE INDEX idx_feature_flags_deleted_at ON public.feature_flags USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_feature_flags_environment ON public.feature_flags USING btree (environment);
CREATE INDEX idx_feature_flags_key ON public.feature_flags USING btree (feature_key);
CREATE INDEX idx_feature_flags_key_env ON public.feature_flags USING btree (key, environment) WHERE (deleted_at IS NULL);
CREATE INDEX idx_feature_flags_org ON public.feature_flags USING btree (organization_id);
CREATE UNIQUE INDEX uq_feature_flag_key_env_active ON public.feature_flags USING btree (key, environment) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_feature_flag_org_key ON public.feature_flags USING btree (organization_id, feature_key);
CREATE UNIQUE INDEX fee_assignments_pkey ON public.fee_assignments USING btree (id);
CREATE INDEX idx_fee_assignments_child_id ON public.fee_assignments USING btree (child_id);
CREATE INDEX idx_fee_assignments_fee_id ON public.fee_assignments USING btree (fee_id);
CREATE INDEX idx_fee_assignments_organization_id ON public.fee_assignments USING btree (organization_id);
CREATE INDEX idx_fee_assignments_parent_id ON public.fee_assignments USING btree (parent_id);
CREATE INDEX idx_fee_assignments_status ON public.fee_assignments USING btree (status);
CREATE UNIQUE INDEX fees_pkey ON public.fees USING btree (id);
CREATE INDEX idx_fees_created_by_admin_id ON public.fees USING btree (created_by_admin_id);
CREATE INDEX idx_fees_fee_type ON public.fees USING btree (fee_type);
CREATE INDEX idx_fees_organization_id ON public.fees USING btree (organization_id);
CREATE INDEX idx_fees_season_id ON public.fees USING btree (season_id);
CREATE INDEX idx_fees_status ON public.fees USING btree (status);
CREATE INDEX idx_installment_plans_organization_id ON public.installment_plans USING btree (organization_id);
CREATE UNIQUE INDEX installment_plans_pkey ON public.installment_plans USING btree (id);
CREATE INDEX idx_installment_schedules_fee_assignment_id ON public.installment_schedules USING btree (fee_assignment_id);
CREATE INDEX idx_installment_schedules_installment_plan_id ON public.installment_schedules USING btree (installment_plan_id);
CREATE INDEX idx_installment_schedules_status ON public.installment_schedules USING btree (status);
CREATE UNIQUE INDEX installment_schedules_pkey ON public.installment_schedules USING btree (id);
CREATE INDEX idx_installments_due_date ON public.installments USING btree (due_date);
CREATE INDEX idx_installments_installment_schedule_id ON public.installments USING btree (installment_schedule_id);
CREATE INDEX idx_installments_status ON public.installments USING btree (status);
CREATE UNIQUE INDEX installments_pkey ON public.installments USING btree (id);
CREATE INDEX idx_join_links_org ON public.join_links USING btree (organization_id);
CREATE INDEX idx_join_links_team ON public.join_links USING btree (team_id);
CREATE UNIQUE INDEX join_links_pkey ON public.join_links USING btree (id);
CREATE UNIQUE INDEX join_links_token_key ON public.join_links USING btree (token);
CREATE INDEX idx_join_requests_athlete_team ON public.join_requests USING btree (athlete_id, team_id);
CREATE INDEX idx_join_requests_requester ON public.join_requests USING btree (requested_by_user_id);
CREATE INDEX idx_join_requests_season ON public.join_requests USING btree (season_id);
CREATE INDEX idx_join_requests_team_status ON public.join_requests USING btree (team_id, status);
CREATE UNIQUE INDEX join_requests_pkey ON public.join_requests USING btree (id);
CREATE INDEX idx_levels_org_id ON public.levels USING btree (org_id);
CREATE INDEX idx_levels_org_name ON public.levels USING btree (org_id, name);
CREATE INDEX idx_levels_program_id ON public.levels USING btree (program_id);
CREATE UNIQUE INDEX levels_pkey ON public.levels USING btree (id);
CREATE INDEX idx_license_tiers_status ON public.license_tiers USING btree (status);
CREATE INDEX idx_license_tiers_stripe_price_id ON public.license_tiers USING btree (stripe_price_id);
CREATE INDEX idx_license_tiers_tier_key ON public.license_tiers USING btree (tier_key);
CREATE INDEX idx_license_tiers_version ON public.license_tiers USING btree (version);
CREATE UNIQUE INDEX license_tiers_pkey ON public.license_tiers USING btree (id);
CREATE UNIQUE INDEX license_tiers_stripe_price_id_key ON public.license_tiers USING btree (stripe_price_id);
CREATE UNIQUE INDEX license_tiers_tier_key_key ON public.license_tiers USING btree (tier_key);
CREATE INDEX idx_messages_author_id ON public.messages USING btree (author_id);
CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);
CREATE INDEX idx_messages_team_id ON public.messages USING btree (team_id);
CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);
CREATE UNIQUE INDEX migration_errors_pkey ON public.migration_errors USING btree (id);
CREATE INDEX idx_offline_payment_allocations_charge_id ON public.offline_payment_allocations USING btree (charge_id);
CREATE INDEX idx_offline_payment_allocations_offline_payment_id ON public.offline_payment_allocations USING btree (offline_payment_id);
CREATE UNIQUE INDEX offline_payment_allocations_pkey ON public.offline_payment_allocations USING btree (id);
CREATE INDEX idx_offline_payments_child_id ON public.offline_payments USING btree (child_id);
CREATE INDEX idx_offline_payments_fee_assignment_id ON public.offline_payments USING btree (fee_assignment_id);
CREATE INDEX idx_offline_payments_organization_id ON public.offline_payments USING btree (organization_id);
CREATE INDEX idx_offline_payments_parent_id ON public.offline_payments USING btree (parent_id);
CREATE INDEX idx_offline_payments_received_by_admin_id ON public.offline_payments USING btree (received_by_admin_id);
CREATE INDEX idx_offline_payments_status ON public.offline_payments USING btree (status);
CREATE UNIQUE INDEX offline_payments_pkey ON public.offline_payments USING btree (id);
CREATE INDEX idx_org_licenses_organization_id ON public.org_licenses USING btree (organization_id);
CREATE INDEX idx_org_licenses_stripe_subscription_id ON public.org_licenses USING btree (stripe_subscription_id);
CREATE UNIQUE INDEX org_licenses_organization_id_key ON public.org_licenses USING btree (organization_id);
CREATE UNIQUE INDEX org_licenses_pkey ON public.org_licenses USING btree (id);
CREATE INDEX idx_org_payment_policies_organization_id ON public.org_payment_policies USING btree (organization_id);
CREATE UNIQUE INDEX org_payment_policies_organization_id_key ON public.org_payment_policies USING btree (organization_id);
CREATE UNIQUE INDEX org_payment_policies_pkey ON public.org_payment_policies USING btree (id);
CREATE INDEX idx_organization_advanced_settings_org_id ON public.organization_advanced_settings USING btree (org_id);
CREATE UNIQUE INDEX organization_advanced_settings_pkey ON public.organization_advanced_settings USING btree (org_id);
CREATE INDEX idx_organization_attendance_settings_org_id ON public.organization_attendance_settings USING btree (org_id);
CREATE UNIQUE INDEX organization_attendance_settings_pkey ON public.organization_attendance_settings USING btree (org_id);
CREATE INDEX idx_organization_defaults_org_id ON public.organization_defaults USING btree (org_id);
CREATE UNIQUE INDEX organization_defaults_pkey ON public.organization_defaults USING btree (org_id);
CREATE INDEX idx_org_invites_email ON public.organization_invites USING btree (email);
CREATE INDEX idx_org_invites_org ON public.organization_invites USING btree (organization_id);
CREATE INDEX idx_org_invites_token ON public.organization_invites USING btree (token) WHERE (accepted_at IS NULL);
CREATE UNIQUE INDEX organization_invites_pkey ON public.organization_invites USING btree (id);
CREATE UNIQUE INDEX organization_invites_token_key ON public.organization_invites USING btree (token);
CREATE INDEX idx_org_members_org ON public.organization_members USING btree (organization_id);
CREATE INDEX idx_org_members_org_role ON public.organization_members USING btree (organization_id, role);
CREATE INDEX idx_org_members_user ON public.organization_members USING btree (user_id);
CREATE INDEX idx_org_members_user_org ON public.organization_members USING btree (user_id, organization_id, role);
CREATE INDEX idx_org_members_user_org_role ON public.organization_members USING btree (user_id, organization_id, role);
CREATE INDEX idx_org_members_user_org_role_covering ON public.organization_members USING btree (user_id, organization_id, role) INCLUDE (created_at, updated_at);
CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id);
CREATE UNIQUE INDEX uq_org_member_user_org_role ON public.organization_members USING btree (organization_id, user_id, role);
CREATE INDEX idx_organization_notification_settings_org_id ON public.organization_notification_settings USING btree (org_id);
CREATE UNIQUE INDEX organization_notification_settings_pkey ON public.organization_notification_settings USING btree (org_id);
CREATE INDEX idx_organization_registration_settings_org_id ON public.organization_registration_settings USING btree (org_id);
CREATE UNIQUE INDEX organization_registration_settings_pkey ON public.organization_registration_settings USING btree (org_id);
CREATE INDEX idx_organization_settings_org_id ON public.organization_settings USING btree (org_id);
CREATE UNIQUE INDEX organization_settings_pkey ON public.organization_settings USING btree (org_id);
CREATE INDEX idx_organization_sports_org_id ON public.organization_sports USING btree (organization_id);
CREATE INDEX idx_organization_sports_sport_id ON public.organization_sports USING btree (sport_id);
CREATE UNIQUE INDEX organization_sports_organization_id_sport_id_key ON public.organization_sports USING btree (organization_id, sport_id);
CREATE UNIQUE INDEX organization_sports_pkey ON public.organization_sports USING btree (id);
CREATE INDEX idx_organization_visibility_settings_org_id ON public.organization_visibility_settings USING btree (org_id);
CREATE UNIQUE INDEX organization_visibility_settings_pkey ON public.organization_visibility_settings USING btree (org_id);
CREATE INDEX idx_organizations_billing_mode ON public.organizations USING btree (billing_mode);
CREATE INDEX idx_organizations_org_type ON public.organizations USING btree (org_type);
CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);
CREATE INDEX idx_organizations_status ON public.organizations USING btree (status);
CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);
CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);
CREATE INDEX idx_parent_invites_athlete_id ON public.parent_invites USING btree (athlete_id);
CREATE INDEX idx_parent_invites_org_email ON public.parent_invites USING btree (organization_id, lower(email));
CREATE UNIQUE INDEX idx_parent_invites_pending_unique ON public.parent_invites USING btree (organization_id, athlete_id, lower(email)) WHERE (status = 'pending'::parent_invite_status);
CREATE UNIQUE INDEX parent_invites_pkey ON public.parent_invites USING btree (id);
CREATE UNIQUE INDEX parent_invites_token_key ON public.parent_invites USING btree (token);
CREATE INDEX idx_payment_allocations_charge_id ON public.payment_allocations USING btree (charge_id);
CREATE INDEX idx_payment_allocations_fee_assignment_id ON public.payment_allocations USING btree (fee_assignment_id);
CREATE INDEX idx_payment_allocations_payment_id ON public.payment_allocations USING btree (payment_id);
CREATE UNIQUE INDEX payment_allocations_pkey ON public.payment_allocations USING btree (id);
CREATE INDEX idx_payment_events_created_at ON public.payment_events USING btree (created_at);
CREATE INDEX idx_payment_events_created_by_user_id ON public.payment_events USING btree (created_by_user_id);
CREATE INDEX idx_payment_events_entity_id ON public.payment_events USING btree (entity_id);
CREATE INDEX idx_payment_events_entity_type ON public.payment_events USING btree (entity_type);
CREATE INDEX idx_payment_events_organization_id ON public.payment_events USING btree (organization_id);
CREATE UNIQUE INDEX payment_events_pkey ON public.payment_events USING btree (id);
CREATE INDEX idx_payments_checkout_session_id ON public.payments USING btree (checkout_session_id);
CREATE INDEX idx_payments_organization_id ON public.payments USING btree (organization_id);
CREATE INDEX idx_payments_parent_id ON public.payments USING btree (parent_id);
CREATE INDEX idx_payments_status ON public.payments USING btree (status);
CREATE INDEX idx_payments_stripe_payment_intent_id ON public.payments USING btree (stripe_payment_intent_id);
CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);
CREATE UNIQUE INDEX payments_unique_stripe_payment_intent_id ON public.payments USING btree (stripe_payment_intent_id);
CREATE INDEX idx_platform_admins_role ON public.platform_admins USING btree (role);
CREATE INDEX idx_platform_admins_user ON public.platform_admins USING btree (user_id);
CREATE UNIQUE INDEX platform_admins_pkey ON public.platform_admins USING btree (user_id);
CREATE INDEX idx_programs_name ON public.programs USING btree (name);
CREATE INDEX idx_programs_org_id ON public.programs USING btree (org_id);
CREATE INDEX idx_programs_sport_id ON public.programs USING btree (sport_id);
CREATE UNIQUE INDEX programs_org_id_sport_id_name_key ON public.programs USING btree (org_id, sport_id, name);
CREATE UNIQUE INDEX programs_pkey ON public.programs USING btree (id);
CREATE INDEX idx_recurring_instances_date ON public.recurring_event_instances USING btree (occurrence_date);
CREATE INDEX idx_recurring_instances_event ON public.recurring_event_instances USING btree (event_id);
CREATE INDEX idx_recurring_instances_pattern ON public.recurring_event_instances USING btree (pattern_id);
CREATE UNIQUE INDEX recurring_event_instances_pattern_id_occurrence_date_key ON public.recurring_event_instances USING btree (pattern_id, occurrence_date);
CREATE UNIQUE INDEX recurring_event_instances_pkey ON public.recurring_event_instances USING btree (id);
CREATE INDEX idx_recurring_patterns_parent_event ON public.recurring_event_patterns USING btree (parent_event_id);
CREATE UNIQUE INDEX recurring_event_patterns_pkey ON public.recurring_event_patterns USING btree (id);
CREATE INDEX idx_refunds_created_by_admin_id ON public.refunds USING btree (created_by_admin_id);
CREATE INDEX idx_refunds_offline_payment_id ON public.refunds USING btree (offline_payment_id);
CREATE INDEX idx_refunds_organization_id ON public.refunds USING btree (organization_id);
CREATE INDEX idx_refunds_payment_id ON public.refunds USING btree (payment_id);
CREATE UNIQUE INDEX refunds_pkey ON public.refunds USING btree (id);
CREATE INDEX idx_scholarship_awards_awarded_by_admin_id ON public.scholarship_awards USING btree (awarded_by_admin_id);
CREATE INDEX idx_scholarship_awards_fee_assignment_id ON public.scholarship_awards USING btree (fee_assignment_id);
CREATE INDEX idx_scholarship_awards_scholarship_program_id ON public.scholarship_awards USING btree (scholarship_program_id);
CREATE UNIQUE INDEX scholarship_awards_pkey ON public.scholarship_awards USING btree (id);
CREATE INDEX idx_scholarship_programs_organization_id ON public.scholarship_programs USING btree (organization_id);
CREATE INDEX idx_scholarship_programs_status ON public.scholarship_programs USING btree (status);
CREATE UNIQUE INDEX scholarship_programs_pkey ON public.scholarship_programs USING btree (id);
CREATE INDEX idx_seasons_is_active ON public.seasons USING btree (is_active);
CREATE INDEX idx_seasons_org_id ON public.seasons USING btree (org_id);
CREATE UNIQUE INDEX idx_seasons_org_unique ON public.seasons USING btree (org_id, name, start_date, end_date);
CREATE INDEX idx_seasons_organization_id ON public.seasons USING btree (organization_id);
CREATE INDEX idx_seasons_program_id ON public.seasons USING btree (program_id);
CREATE INDEX idx_seasons_sport_id ON public.seasons USING btree (sport_id);
CREATE INDEX idx_seasons_team_id ON public.seasons USING btree (team_id);
CREATE UNIQUE INDEX seasons_pkey ON public.seasons USING btree (id);
CREATE INDEX idx_sports_is_system ON public.sports USING btree (is_system) WHERE (is_system = true);
CREATE INDEX idx_sports_name ON public.sports USING btree (name);
CREATE INDEX idx_sports_org_id ON public.sports USING btree (org_id);
CREATE UNIQUE INDEX sports_org_id_name_key ON public.sports USING btree (org_id, name) WHERE (org_id IS NOT NULL);
CREATE UNIQUE INDEX sports_pkey ON public.sports USING btree (id);
CREATE UNIQUE INDEX sports_system_name_key ON public.sports USING btree (name) WHERE ((is_system = true) AND (org_id IS NULL));
CREATE INDEX idx_memberships_child_id ON public.team_memberships USING btree (athlete_id);
CREATE INDEX idx_memberships_season_id ON public.team_memberships USING btree (season_id);
CREATE INDEX idx_memberships_team_id ON public.team_memberships USING btree (team_id);
CREATE UNIQUE INDEX team_memberships_child_id_team_id_season_id_key ON public.team_memberships USING btree (athlete_id, team_id, season_id);
CREATE UNIQUE INDEX team_memberships_pkey ON public.team_memberships USING btree (id);
CREATE UNIQUE INDEX idx_team_seasons_one_active ON public.team_seasons USING btree (team_id) WHERE (is_active = true);
CREATE INDEX idx_team_seasons_season_id ON public.team_seasons USING btree (season_id);
CREATE INDEX idx_team_seasons_team_id ON public.team_seasons USING btree (team_id);
CREATE UNIQUE INDEX team_seasons_pkey ON public.team_seasons USING btree (team_id, season_id);
CREATE INDEX idx_teams_is_active ON public.teams USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_teams_level_id ON public.teams USING btree (level_id);
CREATE INDEX idx_teams_org_id ON public.teams USING btree (org_id);
CREATE INDEX idx_teams_program_id ON public.teams USING btree (program_id);
CREATE INDEX idx_teams_sport_id ON public.teams USING btree (sport_id);
CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);
CREATE INDEX idx_travel_plans_season_id ON public.travel_plans USING btree (season_id);
CREATE INDEX idx_travel_plans_start_date ON public.travel_plans USING btree (start_date);
CREATE INDEX idx_travel_plans_team_id ON public.travel_plans USING btree (team_id);
CREATE UNIQUE INDEX travel_plans_pkey ON public.travel_plans USING btree (id);
CREATE INDEX idx_tryout_reg_docs_registration_id ON public.tryout_registration_documents USING btree (registration_id);
CREATE INDEX idx_tryout_reg_docs_required_document_id ON public.tryout_registration_documents USING btree (required_document_id);
CREATE INDEX idx_tryout_reg_docs_status ON public.tryout_registration_documents USING btree (status);
CREATE UNIQUE INDEX tryout_registration_documents_pkey ON public.tryout_registration_documents USING btree (id);
CREATE UNIQUE INDEX tryout_registration_documents_registration_id_required_docu_key ON public.tryout_registration_documents USING btree (registration_id, required_document_id);
CREATE INDEX idx_tryout_staff_notes_author_user_id ON public.tryout_registration_staff_notes USING btree (author_user_id);
CREATE INDEX idx_tryout_staff_notes_registration_id ON public.tryout_registration_staff_notes USING btree (registration_id);
CREATE UNIQUE INDEX tryout_registration_staff_notes_pkey ON public.tryout_registration_staff_notes USING btree (id);
CREATE INDEX idx_tryout_registrations_child_id ON public.tryout_registrations USING btree (athlete_id);
CREATE INDEX idx_tryout_registrations_status ON public.tryout_registrations USING btree (status);
CREATE INDEX idx_tryout_registrations_tryout_id ON public.tryout_registrations USING btree (tryout_id);
CREATE UNIQUE INDEX tryout_registrations_pkey ON public.tryout_registrations USING btree (id);
CREATE UNIQUE INDEX tryout_registrations_tryout_id_child_id_key ON public.tryout_registrations USING btree (tryout_id, athlete_id);
CREATE INDEX idx_tryout_required_documents_tryout_id ON public.tryout_required_documents USING btree (tryout_id);
CREATE UNIQUE INDEX tryout_required_documents_pkey ON public.tryout_required_documents USING btree (id);
CREATE UNIQUE INDEX tryout_required_documents_tryout_id_key_key ON public.tryout_required_documents USING btree (tryout_id, key);
CREATE INDEX idx_tryout_scores_coach_id ON public.tryout_scores USING btree (coach_id);
CREATE INDEX idx_tryout_scores_criteria_id ON public.tryout_scores USING btree (criteria_id);
CREATE INDEX idx_tryout_scores_registration_id ON public.tryout_scores USING btree (registration_id);
CREATE UNIQUE INDEX tryout_scores_pkey ON public.tryout_scores USING btree (id);
CREATE UNIQUE INDEX tryout_scores_unique_per_coach_criterion ON public.tryout_scores USING btree (registration_id, criteria_id, coach_id);
CREATE INDEX idx_tryouts_org_id ON public.tryouts USING btree (org_id);
CREATE INDEX idx_tryouts_tryout_date ON public.tryouts USING btree (tryout_date);
CREATE UNIQUE INDEX tryouts_pkey ON public.tryouts USING btree (id);
CREATE INDEX idx_uniform_kit_items_kit ON public.uniform_kit_items USING btree (kit_id);
CREATE UNIQUE INDEX uniform_kit_items_pkey ON public.uniform_kit_items USING btree (id);
CREATE UNIQUE INDEX uq_uniform_kit_items_kit_name ON public.uniform_kit_items USING btree (kit_id, name);
CREATE INDEX idx_uniform_kits_locked_at ON public.uniform_kits USING btree (locked_at);
CREATE INDEX idx_uniform_kits_team_season ON public.uniform_kits USING btree (team_id, season_id);
CREATE UNIQUE INDEX uniform_kits_pkey ON public.uniform_kits USING btree (id);
CREATE UNIQUE INDEX uq_uniform_kits_team_season_name ON public.uniform_kits USING btree (team_id, season_id, name);
CREATE INDEX idx_uniform_orders_child_id ON public.uniform_orders USING btree (athlete_id);
CREATE INDEX idx_uniform_orders_season_id ON public.uniform_orders USING btree (season_id);
CREATE INDEX idx_uniform_orders_status ON public.uniform_orders USING btree (status);
CREATE INDEX idx_uniform_orders_team_id ON public.uniform_orders USING btree (team_id);
CREATE UNIQUE INDEX uniform_orders_child_id_team_id_season_id_key ON public.uniform_orders USING btree (athlete_id, team_id, season_id);
CREATE UNIQUE INDEX uniform_orders_pkey ON public.uniform_orders USING btree (id);
CREATE INDEX idx_uniform_submission_items_item ON public.uniform_submission_items USING btree (item_id);
CREATE INDEX idx_uniform_submission_items_submission ON public.uniform_submission_items USING btree (submission_id);
CREATE UNIQUE INDEX uniform_submission_items_pkey ON public.uniform_submission_items USING btree (id);
CREATE UNIQUE INDEX uq_uniform_submission_items_submission_item ON public.uniform_submission_items USING btree (submission_id, item_id);
CREATE INDEX idx_uniform_submissions_child ON public.uniform_submissions USING btree (child_id);
CREATE INDEX idx_uniform_submissions_kit ON public.uniform_submissions USING btree (kit_id);
CREATE INDEX idx_uniform_submissions_status ON public.uniform_submissions USING btree (status);
CREATE UNIQUE INDEX uniform_submissions_pkey ON public.uniform_submissions USING btree (id);
CREATE UNIQUE INDEX uq_uniform_submissions_kit_child ON public.uniform_submissions USING btree (kit_id, child_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_family_id ON public.users USING btree (family_id);
CREATE INDEX idx_users_org_id ON public.users USING btree (org_id);
CREATE INDEX idx_users_preferences ON public.users USING gin (preferences);
CREATE INDEX idx_users_requires_org_setup ON public.users USING btree (requires_org_setup) WHERE (requires_org_setup = true);
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
CREATE INDEX idx_valid_event_types_category ON public.valid_event_types USING btree (category);
CREATE INDEX idx_valid_event_types_event_type ON public.valid_event_types USING btree (event_type);
CREATE UNIQUE INDEX valid_event_types_pkey ON public.valid_event_types USING btree (category, event_type);
CREATE INDEX idx_waivers_created_by_admin_id ON public.waivers USING btree (created_by_admin_id);
CREATE INDEX idx_waivers_fee_assignment_id ON public.waivers USING btree (fee_assignment_id);
CREATE INDEX idx_waivers_organization_id ON public.waivers USING btree (organization_id);
CREATE UNIQUE INDEX waivers_pkey ON public.waivers USING btree (id);
CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_pkey ON ONLY realtime.messages USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_17_inserted_at_topic_idx ON realtime.messages_2026_01_17 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_17_pkey ON realtime.messages_2026_01_17 USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_18_inserted_at_topic_idx ON realtime.messages_2026_01_18 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_18_pkey ON realtime.messages_2026_01_18 USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_19_inserted_at_topic_idx ON realtime.messages_2026_01_19 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_19_pkey ON realtime.messages_2026_01_19 USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_20_inserted_at_topic_idx ON realtime.messages_2026_01_20 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_20_pkey ON realtime.messages_2026_01_20 USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_21_inserted_at_topic_idx ON realtime.messages_2026_01_21 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_21_pkey ON realtime.messages_2026_01_21 USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_22_inserted_at_topic_idx ON realtime.messages_2026_01_22 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_22_pkey ON realtime.messages_2026_01_22 USING btree (id, inserted_at);
CREATE INDEX messages_2026_01_23_inserted_at_topic_idx ON realtime.messages_2026_01_23 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
CREATE UNIQUE INDEX messages_2026_01_23_pkey ON realtime.messages_2026_01_23 USING btree (id, inserted_at);
CREATE UNIQUE INDEX schema_migrations_pkey ON realtime.schema_migrations USING btree (version);
CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);
CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id);
CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);
CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id);
CREATE UNIQUE INDEX buckets_analytics_pkey ON storage.buckets_analytics USING btree (id);
CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX buckets_vectors_pkey ON storage.buckets_vectors USING btree (id);
CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name);
CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id);
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);
CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");
CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");
CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id);
CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);
CREATE UNIQUE INDEX prefixes_pkey ON storage.prefixes USING btree (bucket_id, level, name);
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);
CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id);
CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id);
CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);
CREATE UNIQUE INDEX vector_indexes_pkey ON storage.vector_indexes USING btree (id);
CREATE UNIQUE INDEX schema_migrations_pkey ON supabase_migrations.schema_migrations USING btree (version);
CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL);
CREATE UNIQUE INDEX secrets_pkey ON vault.secrets USING btree (id);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$
;

CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$
;

CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$
;

CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
;

CREATE OR REPLACE FUNCTION extensions.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

CREATE OR REPLACE FUNCTION extensions.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
;

CREATE OR REPLACE FUNCTION extensions.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
;

CREATE OR REPLACE FUNCTION extensions.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$
;

CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$
;

CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$
;

CREATE OR REPLACE FUNCTION extensions.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$
;

CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$function$
;

CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone)
 RETURNS SETOF record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_11$function$
;

CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)
 RETURNS record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$
;

CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false)
 RETURNS timestamp with time zone
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_11$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$
;

CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$
;

CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;

CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, "operationName" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE c
AS '$libdir/pg_graphql', $function$resolve_wrapper$function$
;

CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    comment on column public.account.name is '@graphql.name: myField'
    */
    select
        coalesce(
            (
                regexp_match(
                    comment_,
                    '@graphql\((.+)\)'
                )
            )[1]::jsonb,
            jsonb_build_object()
        )
$function$
;

CREATE OR REPLACE FUNCTION graphql.exception(message text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
begin
    raise exception using errcode='22000', message=message;
end;
$function$
;

CREATE OR REPLACE FUNCTION graphql.get_schema_version()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    select last_value from graphql.seq_schema_version;
$function$
;

CREATE OR REPLACE FUNCTION graphql.increment_schema_version()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform pg_catalog.nextval('graphql.seq_schema_version');
end;
$function$
;

CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, "operationName" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    res jsonb;
    message_text text;
begin
  begin
    select graphql._internal_resolve("query" := "query",
                                     "variables" := "variables",
                                     "operationName" := "operationName",
                                     "extensions" := "extensions") into res;
    return res;
  exception
    when others then
    get stacked diagnostics message_text = message_text;
    return
    jsonb_build_object('data', null,
                       'errors', jsonb_build_array(jsonb_build_object('message', message_text)));
  end;
end;
$function$
;

CREATE OR REPLACE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE sql
AS $function$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $function$
;

CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token text)
 RETURNS TABLE(success boolean, organization_id uuid, organization_name text, role org_member_role, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
  v_current_user_id UUID;
  v_user_email TEXT;
  v_roles org_member_role[];
  v_primary_role org_member_role;
  v_role org_member_role;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'You must be logged in to accept an invite';
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM users WHERE id = v_current_user_id;

  BEGIN
    SELECT 
      oi.id,
      oi.organization_id,
      o.name AS org_name,
      oi.email,
      oi.role,
      oi.roles,
      oi.expires_at,
      oi.accepted_at
    INTO v_invite
    FROM organization_invites oi
    JOIN organizations o ON o.id = oi.organization_id
    WHERE oi.token = p_token
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'Invite is being processed by another request';
      RETURN;
  END;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'Invalid invite token';
    RETURN;
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite has already been accepted';
    RETURN;
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::org_member_role, 'This invite has expired';
    RETURN;
  END IF;

  v_roles := COALESCE(
    NULLIF(v_invite.roles, ARRAY[]::org_member_role[]),
    ARRAY[v_invite.role]::org_member_role[]
  );

  IF CARDINALITY(v_roles) = 0 THEN
    v_roles := ARRAY['parent']::org_member_role[];
  END IF;

  v_primary_role :=
    CASE
      WHEN 'org_admin' = ANY(v_roles) THEN 'org_admin'
      WHEN 'coach' = ANY(v_roles) THEN 'coach'
      ELSE 'parent'
    END;

  UPDATE organization_invites
  SET accepted_at = NOW(),
      role = v_primary_role
  WHERE id = v_invite.id;

  FOREACH v_role IN ARRAY v_roles LOOP
    PERFORM add_org_role(v_current_user_id, v_invite.organization_id, v_role);
  END LOOP;

  UPDATE users
  SET
    org_id = COALESCE(org_id, v_invite.organization_id),
    role = CASE
      WHEN v_primary_role = 'org_admin' THEN 'admin'::user_role
      WHEN v_primary_role = 'coach' THEN 'coach'::user_role
      ELSE 'parent'::user_role
    END
  WHERE id = v_current_user_id
    AND org_id IS NULL;

  RETURN QUERY SELECT true, v_invite.organization_id, v_invite.org_name, v_primary_role, 'Successfully joined organization';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_parent_invite(p_token text)
 RETURNS TABLE(success boolean, organization_id uuid, child_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
  v_current_user UUID := auth.uid();
  v_user_email TEXT;
BEGIN
  IF v_current_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Login required';
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM users WHERE id = v_current_user;

  BEGIN
    SELECT
      id,
      organization_id,
      child_id,
      email,
      token,
      expires_at,
      status
    INTO v_invite
    FROM parent_invites
    WHERE token = p_token
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invite is being processed';
      RETURN;
  END;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid token';
    RETURN;
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN QUERY SELECT false, v_invite.organization_id, v_invite.child_id, 'Invite already processed';
    RETURN;
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_invite.organization_id, v_invite.child_id, 'Invite expired';
    RETURN;
  END IF;

  IF LOWER(v_invite.email) <> LOWER(v_user_email) THEN
    RETURN QUERY SELECT false, v_invite.organization_id, v_invite.child_id, 'Email mismatch';
    RETURN;
  END IF;

  INSERT INTO child_guardians (child_id, user_id, organization_id, status)
  VALUES (v_invite.child_id, v_current_user, v_invite.organization_id, 'active')
  ON CONFLICT (child_id, user_id, organization_id)
  DO UPDATE SET status = 'active', updated_at = NOW();

  PERFORM add_org_role(v_current_user, v_invite.organization_id, 'parent');

  UPDATE parent_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by_user_id = v_current_user
  WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.organization_id, v_invite.child_id, 'Parent attached';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_org_role(p_user_id uuid, p_org_id uuid, p_role org_member_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_lock_key BIGINT := hashtext(p_user_id::text || p_org_id::text);
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (p_user_id, p_org_id, p_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_activate_organization(target_org_id uuid, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action (ops_admin or super_admin)
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Perform update
  UPDATE organizations SET status = 'active', updated_at = NOW() WHERE id = target_org_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'ACTIVATE_ORGANIZATION',
    auth.uid(),
    'platform_admin'::event_actor_role,
    target_org_id,
    'organization',
    target_org_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_add_platform_admin(target_email text, target_role platform_admin_role, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  target_user_id UUID;
  already_admin BOOLEAN;
  action_taken TEXT;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Only super_admin can manage platform admins
  IF admin_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires super_admin role');
  END IF;
  
  -- Validate inputs
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  IF target_email IS NULL OR trim(target_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id FROM users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found with that email');
  END IF;
  
  -- Check if already an admin
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = target_user_id) INTO already_admin;
  IF already_admin THEN
    -- Update role instead
    UPDATE platform_admins SET role = target_role WHERE user_id = target_user_id;
    action_taken := 'updated';
  ELSE
    -- Insert new admin
    INSERT INTO platform_admins (user_id, role) VALUES (target_user_id, target_role);
    action_taken := 'added';
  END IF;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    CASE WHEN already_admin THEN 'UPDATE_PLATFORM_ADMIN' ELSE 'ADD_PLATFORM_ADMIN' END,
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'platform_admin',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'target_email', target_email,
      'target_role', target_role::text
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'action', action_taken);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_attach_parents_to_child(p_org_id uuid, p_child_id uuid, p_parent_emails text[], p_team_id uuid DEFAULT NULL::uuid, p_expires_in_days integer DEFAULT 7)
 RETURNS TABLE(email text, status parent_invite_status, token text, user_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user UUID := auth.uid();
  v_email TEXT;
  v_user_id UUID;
  v_token TEXT;
BEGIN
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RAISE EXCEPTION 'Only organization admins can attach parents';
  END IF;

  IF p_parent_emails IS NULL OR CARDINALITY(p_parent_emails) = 0 THEN
    RAISE EXCEPTION 'At least one parent email is required';
  END IF;

  FOREACH v_email IN ARRAY (
    SELECT DISTINCT LOWER(email)
    FROM UNNEST(p_parent_emails) AS email
    WHERE TRIM(email) <> ''
  ) LOOP
    SELECT id INTO v_user_id FROM users WHERE LOWER(email) = v_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      PERFORM add_org_role(v_user_id, p_org_id, 'parent');
      INSERT INTO child_guardians (child_id, user_id, organization_id, status)
      VALUES (p_child_id, v_user_id, p_org_id, 'active')
      ON CONFLICT (child_id, user_id, organization_id)
      DO UPDATE SET status = 'active', updated_at = NOW();
      RETURN QUERY SELECT v_email, 'active'::parent_invite_status, NULL::TEXT, v_user_id, 'Parent attached immediately'::TEXT;
    ELSE
      v_token := gen_random_uuid()::text;
      INSERT INTO parent_invites (
        organization_id,
        child_id,
        team_id,
        email,
        token,
        expires_at,
        status,
        created_by_user_id
      ) VALUES (
        p_org_id,
        p_child_id,
        p_team_id,
        v_email,
        v_token,
        NOW() + (p_expires_in_days || ' days')::interval,
        'pending',
        v_current_user
      );
      RETURN QUERY SELECT v_email, 'pending'::parent_invite_status, v_token, NULL::UUID, 'Parent invited'::TEXT;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_feature_flag(p_key text, p_value_type feature_flag_value_type, p_environment feature_flag_environment, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_flag_id UUID;
  v_admin_role platform_admin_role;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate inputs
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag key is required');
  END IF;
  
  IF p_key !~ '^[a-z0-9_]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag key must contain only lowercase letters, numbers, and underscores');
  END IF;
  
  -- Check for duplicate key (excluding soft-deleted)
  IF EXISTS (
    SELECT 1 FROM feature_flags 
    WHERE key = p_key 
      AND environment = p_environment 
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag key already exists in this environment');
  END IF;
  
  -- Create flag
  INSERT INTO feature_flags (key, value_type, description, environment)
  VALUES (p_key, p_value_type, p_description, p_environment)
  RETURNING id INTO v_flag_id;
  
  RETURN jsonb_build_object('success', true, 'flag_id', v_flag_id);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_feature_flag(p_feature_flag_id uuid, p_environment feature_flag_environment, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Soft delete flag
  UPDATE feature_flags
  SET deleted_at = NOW(),
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found or already deleted');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_disable_user(target_user_id uuid, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Ban user for 100 years (effectively permanent)
  UPDATE auth.users SET banned_until = NOW() + INTERVAL '100 years' WHERE id = target_user_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'DISABLE_USER',
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'user',
    target_user_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_enable_user(target_user_id uuid, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Unban user
  UPDATE auth.users SET banned_until = NULL WHERE id = target_user_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'ENABLE_USER',
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'user',
    target_user_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_remove_org_override(p_feature_flag_id uuid, p_org_id uuid, p_environment feature_flag_environment, p_reason text, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_version INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_org_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND org_id = p_org_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Delete override
  DELETE FROM feature_flag_org_overrides
  WHERE feature_flag_id = p_feature_flag_id
    AND org_id = p_org_id
    AND environment = p_environment;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Override not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_remove_platform_admin(target_user_id uuid, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  target_role platform_admin_role;
  super_admin_count INTEGER;
  admin_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Only super_admin can manage platform admins
  IF admin_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check target exists as admin
  SELECT role INTO target_role FROM platform_admins WHERE user_id = target_user_id;
  IF target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a platform admin');
  END IF;
  
  -- Cannot remove yourself
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove yourself');
  END IF;
  
  -- Check if this would remove the last super_admin
  IF target_role = 'super_admin' THEN
    SELECT COUNT(*) INTO super_admin_count FROM platform_admins WHERE role = 'super_admin';
    IF super_admin_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last super_admin');
    END IF;
  END IF;
  
  -- Remove admin
  DELETE FROM platform_admins WHERE user_id = target_user_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'REMOVE_PLATFORM_ADMIN',
    auth.uid(),
    'platform_admin'::event_actor_role,
    NULL,
    'platform_admin',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'removed_role', target_role::text
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_remove_user_override(p_feature_flag_id uuid, p_user_id uuid, p_environment feature_flag_environment, p_reason text, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_version INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_user_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND user_id = p_user_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Delete override
  DELETE FROM feature_flag_user_overrides
  WHERE feature_flag_id = p_feature_flag_id
    AND user_id = p_user_id
    AND environment = p_environment;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Override not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_restore_feature_flag(p_feature_flag_id uuid, p_environment feature_flag_environment, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Restore flag
  UPDATE feature_flags
  SET deleted_at = NULL,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found or not deleted');
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_feature_flag(target_org_id uuid, target_feature_key text, target_enabled boolean, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate inputs
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  IF target_feature_key IS NULL OR trim(target_feature_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature key is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Upsert feature flag
  INSERT INTO feature_flags (organization_id, feature_key, enabled)
  VALUES (target_org_id, target_feature_key, target_enabled)
  ON CONFLICT (organization_id, feature_key)
  DO UPDATE SET enabled = target_enabled, updated_at = NOW();
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'SET_FEATURE_FLAG',
    auth.uid(),
    'platform_admin'::event_actor_role,
    target_org_id,
    'feature_flag',
    target_org_id, -- Using org_id as entity_id since feature flags are per-org
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'feature_key', target_feature_key,
      'enabled', target_enabled
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_org_override(p_feature_flag_id uuid, p_org_id uuid, p_environment feature_flag_environment, p_reason text, p_value_boolean boolean DEFAULT NULL::boolean, p_value_integer integer DEFAULT NULL::integer, p_value_double double precision DEFAULT NULL::double precision, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_flag_value_type feature_flag_value_type;
  v_current_version INTEGER;
  v_value_count INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Get flag value type
  SELECT value_type INTO v_flag_value_type
  FROM feature_flags
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF v_flag_value_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found');
  END IF;
  
  -- Count non-null values
  v_value_count := (p_value_boolean IS NOT NULL)::int + 
                   (p_value_integer IS NOT NULL)::int + 
                   (p_value_double IS NOT NULL)::int;
  
  IF v_value_count != 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exactly one value must be provided');
  END IF;
  
  -- Validate value type matches
  IF v_flag_value_type = 'boolean' AND p_value_boolean IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is boolean, but boolean value not provided');
  END IF;
  
  IF v_flag_value_type = 'integer' AND p_value_integer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is integer, but integer value not provided');
  END IF;
  
  IF v_flag_value_type = 'double' AND p_value_double IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is double, but double value not provided');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_org_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND org_id = p_org_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Upsert org override
  INSERT INTO feature_flag_org_overrides (
    feature_flag_id, org_id, environment, value_boolean, value_integer, value_double, version
  )
  VALUES (
    p_feature_flag_id, p_org_id, p_environment, p_value_boolean, p_value_integer, p_value_double, 1
  )
  ON CONFLICT (feature_flag_id, org_id, environment)
  DO UPDATE SET
    value_boolean = EXCLUDED.value_boolean,
    value_integer = EXCLUDED.value_integer,
    value_double = EXCLUDED.value_double,
    version = feature_flag_org_overrides.version + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_platform_default(p_feature_flag_id uuid, p_environment feature_flag_environment, p_reason text, p_value_boolean boolean DEFAULT NULL::boolean, p_value_integer integer DEFAULT NULL::integer, p_value_double double precision DEFAULT NULL::double precision, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_flag_value_type feature_flag_value_type;
  v_current_version INTEGER;
  v_value_count INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Get flag value type
  SELECT value_type INTO v_flag_value_type
  FROM feature_flags
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF v_flag_value_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found');
  END IF;
  
  -- Count non-null values
  v_value_count := (p_value_boolean IS NOT NULL)::int + 
                   (p_value_integer IS NOT NULL)::int + 
                   (p_value_double IS NOT NULL)::int;
  
  IF v_value_count != 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exactly one value must be provided');
  END IF;
  
  -- Validate value type matches
  IF v_flag_value_type = 'boolean' AND p_value_boolean IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is boolean, but boolean value not provided');
  END IF;
  
  IF v_flag_value_type = 'integer' AND p_value_integer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is integer, but integer value not provided');
  END IF;
  
  IF v_flag_value_type = 'double' AND p_value_double IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is double, but double value not provided');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = p_feature_flag_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: flag was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Upsert platform default
  INSERT INTO feature_flag_platform_defaults (
    feature_flag_id, environment, value_boolean, value_integer, value_double, version
  )
  VALUES (
    p_feature_flag_id, p_environment, p_value_boolean, p_value_integer, p_value_double, 1
  )
  ON CONFLICT (feature_flag_id, environment)
  DO UPDATE SET
    value_boolean = EXCLUDED.value_boolean,
    value_integer = EXCLUDED.value_integer,
    value_double = EXCLUDED.value_double,
    version = feature_flag_platform_defaults.version + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_user_override(p_feature_flag_id uuid, p_user_id uuid, p_environment feature_flag_environment, p_reason text, p_value_boolean boolean DEFAULT NULL::boolean, p_value_integer integer DEFAULT NULL::integer, p_value_double double precision DEFAULT NULL::double precision, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_flag_value_type feature_flag_value_type;
  v_current_version INTEGER;
  v_value_count INTEGER;
BEGIN
  -- Check platform admin
  IF NOT check_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get flag value type
  SELECT value_type INTO v_flag_value_type
  FROM feature_flags
  WHERE id = p_feature_flag_id
    AND environment = p_environment
    AND deleted_at IS NULL;
  
  IF v_flag_value_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature flag not found');
  END IF;
  
  -- Count non-null values
  v_value_count := (p_value_boolean IS NOT NULL)::int + 
                   (p_value_integer IS NOT NULL)::int + 
                   (p_value_double IS NOT NULL)::int;
  
  IF v_value_count != 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exactly one value must be provided');
  END IF;
  
  -- Validate value type matches
  IF v_flag_value_type = 'boolean' AND p_value_boolean IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is boolean, but boolean value not provided');
  END IF;
  
  IF v_flag_value_type = 'integer' AND p_value_integer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is integer, but integer value not provided');
  END IF;
  
  IF v_flag_value_type = 'double' AND p_value_double IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Flag value type is double, but double value not provided');
  END IF;
  
  -- Check version if provided (optimistic locking)
  IF p_expected_version IS NOT NULL THEN
    SELECT version INTO v_current_version
    FROM feature_flag_user_overrides
    WHERE feature_flag_id = p_feature_flag_id
      AND user_id = p_user_id
      AND environment = p_environment;
    
    IF v_current_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object('success', false, 'error', 'Version conflict: override was modified by another admin. Please refresh and try again.');
    END IF;
  END IF;
  
  -- Upsert user override
  INSERT INTO feature_flag_user_overrides (
    feature_flag_id, user_id, environment, value_boolean, value_integer, value_double, version
  )
  VALUES (
    p_feature_flag_id, p_user_id, p_environment, p_value_boolean, p_value_integer, p_value_double, 1
  )
  ON CONFLICT (feature_flag_id, user_id, environment)
  DO UPDATE SET
    value_boolean = EXCLUDED.value_boolean,
    value_integer = EXCLUDED.value_integer,
    value_double = EXCLUDED.value_double,
    version = feature_flag_user_overrides.version + 1,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_suspend_organization(target_org_id uuid, reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  admin_role platform_admin_role;
  org_exists BOOLEAN;
BEGIN
  -- Check caller is platform admin
  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  
  -- Check role allows this action
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;
  
  -- Validate reason
  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
  END IF;
  
  -- Check org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id) INTO org_exists;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Perform update
  UPDATE organizations SET status = 'suspended', updated_at = NOW() WHERE id = target_org_id;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'SUSPEND_ORGANIZATION',
    auth.uid(),
    'platform_admin'::event_actor_role,
    target_org_id,
    'organization',
    target_org_id,
    jsonb_build_object('admin_role', admin_role::text, 'reason', reason),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.archive_old_event_logs(p_retention_days integer DEFAULT 730)
 RETURNS TABLE(archived_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

  -- Move old events to archive
  INSERT INTO event_logs_archive
  SELECT * FROM event_logs
  WHERE created_at < v_cutoff_date;

  -- Delete archived events from main table
  DELETE FROM event_logs
  WHERE created_at < v_cutoff_date;

  -- Return count of archived records
  RETURN QUERY SELECT COUNT(*)::BIGINT FROM event_logs_archive WHERE created_at < v_cutoff_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_perform_admin_action(required_roles platform_admin_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = auth.uid() 
    AND role = ANY(required_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.clear_org_setup_flag()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only clear if user has the flag set (optimization)
  UPDATE users 
  SET requires_org_setup = false 
  WHERE id = NEW.user_id 
  AND requires_org_setup = true;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_travel_override(p_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE events
  SET travel_override = NULL
  WHERE id = p_event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_payment_processing(p_payment_id uuid, p_checkout_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_existing_allocs integer;
begin
  -- lock primary rows to avoid concurrent updates
  perform 1 from payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;

  perform 1 from checkout_sessions where id = p_checkout_session_id for update;
  if not found then
    raise exception 'checkout_session % not found', p_checkout_session_id;
  end if;

  select count(*) into v_existing_allocs from payment_allocations where payment_id = p_payment_id;
  if v_existing_allocs > 0 then
    return; -- already processed
  end if;

  insert into payment_allocations (payment_id, charge_id, fee_assignment_id, amount_cents)
  select
    p_payment_id,
    csi.charge_id,
    coalesce(csi.fee_assignment_id, ch.fee_assignment_id),
    csi.amount_cents
  from checkout_session_items csi
  left join charges ch on ch.id = csi.charge_id
  where csi.checkout_session_id = p_checkout_session_id;

  update payments
    set status = 'succeeded', paid_at = coalesce(paid_at, now())
  where id = p_payment_id;

  update checkout_sessions
    set status = 'succeeded'
  where id = p_checkout_session_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.convert_accepted_tryout_registration_to_team_member(p_registration_id uuid, p_team_id uuid, p_season_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_child_id UUID;
  v_tryout_id UUID;
  v_org_id UUID;
  v_membership_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.child_id, r.tryout_id
    INTO v_child_id, v_tryout_id
  FROM tryout_registrations r
  WHERE r.id = p_registration_id;

  IF v_tryout_id IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  SELECT t.org_id INTO v_org_id
  FROM tryouts t
  WHERE t.id = v_tryout_id;

  -- Must be staff in org
  IF NOT (
    user_has_org_access(v_user_id, v_org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = v_user_id AND u.role IN ('admin','coach') AND u.org_id = v_org_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify team belongs to org
  IF NOT EXISTS (
    SELECT 1 FROM teams tm
    WHERE tm.id = p_team_id AND tm.org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to organization';
  END IF;

  -- Verify season belongs to org via seasons.organization_id when available, or via team
  IF NOT EXISTS (
    SELECT 1
    FROM seasons s
    WHERE s.id = p_season_id
      AND (
        (s.organization_id IS NOT NULL AND s.organization_id = v_org_id)
        OR (s.team_id = p_team_id)
      )
  ) THEN
    RAISE EXCEPTION 'Season does not belong to organization/team';
  END IF;

  INSERT INTO team_memberships (child_id, team_id, season_id, status)
  VALUES (v_child_id, p_team_id, p_season_id, 'active')
  ON CONFLICT (child_id, team_id, season_id) DO UPDATE
    SET status = 'active',
        updated_at = NOW()
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_athlete_with_guardians(p_org_id uuid, p_athlete_data jsonb, p_guardians jsonb[] DEFAULT '{}'::jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_athlete_id UUID;
  v_guardian JSONB;
  v_result JSONB;
  v_guardian_results JSONB[] := '{}';
  v_created_by UUID;
BEGIN
  -- Get current user
  v_created_by := auth.uid();
  
  -- Validate required fields
  IF p_athlete_data->>'first_name' IS NULL OR TRIM(p_athlete_data->>'first_name') = '' THEN
    RAISE EXCEPTION 'first_name is required';
  END IF;
  
  IF p_athlete_data->>'last_name' IS NULL OR TRIM(p_athlete_data->>'last_name') = '' THEN
    RAISE EXCEPTION 'last_name is required';
  END IF;
  
  -- Create athlete
  INSERT INTO athletes (
    first_name,
    last_name,
    birthdate,
    gender,
    jersey_number,
    medical_notes,
    allergies,
    emergency_contact_name,
    emergency_contact_phone,
    family_id,  -- Still nullable, for backward compatibility
    created_at,
    updated_at
  )
  VALUES (
    TRIM(p_athlete_data->>'first_name'),
    TRIM(p_athlete_data->>'last_name'),
    NULLIF(p_athlete_data->>'birthdate', '')::DATE,
    NULLIF(p_athlete_data->>'gender', ''),
    NULLIF(p_athlete_data->>'jersey_number', ''),
    NULLIF(p_athlete_data->>'medical_notes', ''),
    NULLIF(p_athlete_data->>'allergies', ''),
    NULLIF(p_athlete_data->>'emergency_contact_name', ''),
    NULLIF(p_athlete_data->>'emergency_contact_phone', ''),
    NULLIF(p_athlete_data->>'family_id', '')::UUID,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_athlete_id;
  
  -- Link each guardian (all must succeed or transaction rolls back)
  FOREACH v_guardian IN ARRAY p_guardians LOOP
    -- Validate guardian email
    IF v_guardian->>'email' IS NULL OR TRIM(v_guardian->>'email') = '' THEN
      RAISE EXCEPTION 'Guardian email is required';
    END IF;
    
    -- Link guardian
    v_result := link_guardian_to_athlete(
      v_athlete_id,
      v_guardian->>'email',
      p_org_id,
      COALESCE(v_guardian->>'relationship_type', 'parent'),
      v_created_by
    );
    
    -- Add to results array
    v_guardian_results := array_append(v_guardian_results, v_result);
  END LOOP;
  
  -- If team_id and season_id provided, create team membership
  IF p_athlete_data->>'team_id' IS NOT NULL 
     AND p_athlete_data->>'season_id' IS NOT NULL THEN
    INSERT INTO team_memberships (
      athlete_id,
      team_id,
      season_id,
      organization_id,
      status,
      created_at
    )
    VALUES (
      v_athlete_id,
      (p_athlete_data->>'team_id')::UUID,
      (p_athlete_data->>'season_id')::UUID,
      p_org_id,
      'active',
      NOW()
    )
    ON CONFLICT (athlete_id, team_id, season_id) DO NOTHING;
  END IF;
  
  -- Return success with all details
  RETURN jsonb_build_object(
    'success', true,
    'athlete_id', v_athlete_id,
    'guardians', v_guardian_results,
    'guardian_count', ARRAY_LENGTH(v_guardian_results, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback transaction
    RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_child_claim_token(p_child_id uuid, p_org_id uuid, p_team_id uuid, p_season_id uuid, p_expires_in_days integer DEFAULT 7)
 RETURNS TABLE(token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user UUID := auth.uid();
  v_token TEXT := gen_random_uuid()::text;
  v_expires_at TIMESTAMPTZ := NOW() + (p_expires_in_days || ' days')::interval;
BEGIN
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RAISE EXCEPTION 'Only organization admins can create child claim tokens';
  END IF;

  INSERT INTO child_claim_tokens (
    organization_id,
    team_id,
    season_id,
    child_id,
    token,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    p_team_id,
    p_season_id,
    p_child_id,
    v_token,
    v_expires_at,
    v_current_user
  );

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_join_link(p_org_id uuid, p_team_id uuid DEFAULT NULL::uuid, p_auto_approve boolean DEFAULT false, p_expires_in_days integer DEFAULT 7)
 RETURNS TABLE(token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_token TEXT := gen_random_uuid()::text;
  v_current_user UUID := auth.uid();
  v_expiration TIMESTAMPTZ := NOW() + (p_expires_in_days || ' days')::interval;
BEGIN
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RAISE EXCEPTION 'Only organization admins can create join links';
  END IF;

  INSERT INTO join_links (
    organization_id,
    team_id,
    token,
    auto_approve,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    p_team_id,
    v_token,
    p_auto_approve,
    v_expiration,
    v_current_user
  );

  RETURN QUERY SELECT v_token, v_expiration;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization_invite(p_org_id uuid, p_email text, p_roles org_member_role[] DEFAULT ARRAY['parent'::org_member_role], p_expires_in_days integer DEFAULT 7)
 RETURNS TABLE(invite_token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_current_user_id UUID;
  v_roles org_member_role[] := COALESCE(p_roles, ARRAY['parent']::org_member_role[]);
BEGIN
  -- Normalize to non-empty array
  IF CARDINALITY(v_roles) = 0 THEN
    v_roles := ARRAY['parent']::org_member_role[];
  END IF;

  v_current_user_id := auth.uid();

  IF NOT (user_is_org_admin(v_current_user_id, p_org_id) OR is_platform_admin(v_current_user_id)) THEN
    RAISE EXCEPTION 'Only organization admins can create invites';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = p_org_id
      AND LOWER(u.email) = LOWER(p_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_invites
    WHERE organization_id = p_org_id
      AND LOWER(email) = LOWER(p_email)
      AND accepted_at IS NULL
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'A pending invite already exists for this email';
  END IF;

  v_token := gen_random_uuid()::text;
  v_expires_at := NOW() + (p_expires_in_days || ' days')::interval;

  INSERT INTO organization_invites (
    organization_id,
    email,
    role,
    roles,
    token,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    LOWER(p_email),
    v_roles[1],
    v_roles,
    v_token,
    v_expires_at,
    v_current_user_id
  );

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization_invite(p_org_id uuid, p_email text, p_role org_member_role DEFAULT 'parent'::org_member_role, p_expires_in_days integer DEFAULT 7)
 RETURNS TABLE(invite_token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Check if user is org admin or platform admin
  IF NOT (user_is_org_admin(v_current_user_id, p_org_id) OR is_platform_admin(v_current_user_id)) THEN
    RAISE EXCEPTION 'Only organization admins can create invites';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = p_org_id
    AND LOWER(u.email) = LOWER(p_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;
  
  -- Check if there's already a pending invite
  IF EXISTS (
    SELECT 1 FROM organization_invites
    WHERE organization_id = p_org_id
    AND LOWER(email) = LOWER(p_email)
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'A pending invite already exists for this email';
  END IF;
  
  -- Generate token and expiration
  v_token := gen_random_uuid()::text;
  v_expires_at := NOW() + (p_expires_in_days || ' days')::interval;
  
  -- Create the invite
  INSERT INTO organization_invites (
    organization_id,
    email,
    role,
    token,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_org_id,
    LOWER(p_email),
    p_role,
    v_token,
    v_expires_at,
    v_current_user_id
  );
  
  -- Return the token and expiration
  RETURN QUERY SELECT v_token, v_expires_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_rsvps_for_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Create RSVP records for all active team members
  INSERT INTO event_rsvps (event_id, child_id, status)
  SELECT 
    NEW.id,
    tm.child_id,
    'unknown'
  FROM team_memberships tm
  WHERE tm.team_id = NEW.team_id
  AND tm.season_id = NEW.season_id
  AND tm.status = 'active'
  ON CONFLICT (event_id, child_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_uniform_kit(p_team_id uuid, p_season_id uuid, p_name text, p_deadline_at timestamp with time zone, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kit_id UUID;
  v_item JSONB;
  v_item_name TEXT;
  v_required BOOLEAN;
  v_size_options JSONB;
  v_sort_order INT;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Kit name is required';
  END IF;

  IF NOT staff_can_access_team(auth.uid(), p_team_id) THEN
    RAISE EXCEPTION 'Not authorized to create kits for this team';
  END IF;

  -- Upsert kit (idempotent)
  INSERT INTO uniform_kits (team_id, season_id, name, deadline_at, locked_at, created_by)
  VALUES (p_team_id, p_season_id, trim(p_name), p_deadline_at, NULL, auth.uid())
  ON CONFLICT (team_id, season_id, name)
  DO UPDATE SET
    deadline_at = EXCLUDED.deadline_at,
    updated_at = NOW()
  RETURNING id INTO v_kit_id;

  -- Items are required for a useful kit
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a JSON array';
  END IF;

  -- Upsert kit items by (kit_id, name)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_name := NULLIF(trim(COALESCE(v_item->>'name', '')), '');
    IF v_item_name IS NULL THEN
      RAISE EXCEPTION 'Each item requires a non-empty name';
    END IF;

    v_required := COALESCE((v_item->>'required')::boolean, true);
    v_size_options := COALESCE(v_item->'size_options', '[]'::jsonb);
    v_sort_order := COALESCE((v_item->>'sort_order')::int, 0);

    INSERT INTO uniform_kit_items (kit_id, name, required, size_options, sort_order)
    VALUES (v_kit_id, v_item_name, v_required, v_size_options, v_sort_order)
    ON CONFLICT (kit_id, name)
    DO UPDATE SET
      required = EXCLUDED.required,
      size_options = EXCLUDED.size_options,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW();
  END LOOP;

  RETURN v_kit_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_guardian_by_email(p_email text, p_org_id uuid)
 RETURNS TABLE(user_id uuid, email text, display_name text, phone text, linked_athletes jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_normalized_email TEXT;
BEGIN
  -- Normalize email for matching
  v_normalized_email := normalize_email(p_email);
  
  -- Return user and their linked athletes
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'first_name', a.first_name,
          'last_name', a.last_name,
          'birthdate', a.birthdate
        )
        ORDER BY a.first_name, a.last_name
      ) FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS linked_athletes
  FROM users u
  LEFT JOIN athlete_guardians ag ON ag.user_id = u.id 
    AND ag.organization_id = p_org_id 
    AND ag.status = 'active'
  LEFT JOIN athletes a ON a.id = ag.athlete_id 
    AND a.deleted_at IS NULL
  WHERE normalize_email(u.email) = v_normalized_email
  GROUP BY u.id, u.email, u.display_name, u.phone;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.format_event_location_address(p_location_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_location RECORD;
  v_address TEXT := '';
BEGIN
  SELECT * INTO v_location
  FROM event_locations
  WHERE id = p_location_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Handle special cases
  IF v_location.is_tbd THEN
    RETURN 'Location TBD';
  END IF;
  
  IF v_location.is_virtual THEN
    RETURN 'Virtual Event';
  END IF;
  
  -- Build address string
  IF v_location.venue_name IS NOT NULL THEN
    v_address := v_location.venue_name;
  END IF;
  
  IF v_location.address_line1 IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_location.address_line1;
  END IF;
  
  IF v_location.address_line2 IS NOT NULL THEN
    v_address := v_address || ', ' || v_location.address_line2;
  END IF;
  
  IF v_location.city IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_location.city;
  END IF;
  
  IF v_location.state IS NOT NULL THEN
    IF v_location.city IS NOT NULL THEN
      v_address := v_address || ', ';
    ELSIF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_location.state;
  END IF;
  
  IF v_location.postal_code IS NOT NULL THEN
    v_address := v_address || ' ' || v_location.postal_code;
  END IF;
  
  RETURN v_address;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_recurring_event_instances(p_pattern_id uuid, p_start_date date, p_template_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_athlete_guardians(p_athlete_id uuid, p_org_id uuid)
 RETURNS TABLE(guardian_id uuid, user_id uuid, email text, display_name text, phone text, relationship_type text, status athlete_guardian_status, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    ag.id AS guardian_id,
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    'parent' AS relationship_type,  -- Future: store in athlete_guardians
    ag.status,
    ag.created_at
  FROM athlete_guardians ag
  JOIN users u ON u.id = ag.user_id
  WHERE ag.athlete_id = p_athlete_id
    AND ag.organization_id = p_org_id
  ORDER BY ag.created_at ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_derived_family_for_athlete(p_athlete_id uuid, p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_family_athletes UUID[];
  v_guardian_ids UUID[];
  v_athletes JSONB;
  v_guardians JSONB;
BEGIN
  -- Get all athletes in this family
  SELECT ARRAY_AGG(DISTINCT athlete_id)
  INTO v_family_athletes
  FROM get_family_athletes_via_guardians(p_athlete_id, p_org_id);
  
  -- Handle case where athlete has no guardians
  IF v_family_athletes IS NULL OR ARRAY_LENGTH(v_family_athletes, 1) IS NULL THEN
    v_family_athletes := ARRAY[p_athlete_id];
  END IF;
  
  -- Get all guardians for this family
  SELECT ARRAY_AGG(DISTINCT ag.user_id)
  INTO v_guardian_ids
  FROM athlete_guardians ag
  WHERE ag.athlete_id = ANY(v_family_athletes)
    AND ag.organization_id = p_org_id
    AND ag.status = 'active';
  
  -- Build athlete details
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'first_name', a.first_name,
        'last_name', a.last_name,
        'birthdate', a.birthdate,
        'gender', a.gender
      )
      ORDER BY a.first_name, a.last_name
    ),
    '[]'::jsonb
  )
  INTO v_athletes
  FROM athletes a
  WHERE a.id = ANY(v_family_athletes)
    AND a.deleted_at IS NULL;
  
  -- Build guardian details
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'display_name', u.display_name,
        'phone', u.phone
      )
      ORDER BY u.display_name, u.email
    ),
    '[]'::jsonb
  )
  INTO v_guardians
  FROM users u
  WHERE u.id = ANY(v_guardian_ids);
  
  RETURN jsonb_build_object(
    'athlete_ids', v_family_athletes,
    'guardian_ids', COALESCE(v_guardian_ids, ARRAY[]::UUID[]),
    'athletes', v_athletes,
    'guardians', COALESCE(v_guardians, '[]'::jsonb),
    'is_derived', true,
    'has_guardians', v_guardian_ids IS NOT NULL AND ARRAY_LENGTH(v_guardian_ids, 1) > 0
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_environment_from_url()
 RETURNS feature_flag_environment
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  api_url TEXT;
BEGIN
  -- Try to get from current_setting if available
  BEGIN
    api_url := current_setting('app.settings.api_url', true);
  EXCEPTION
    WHEN OTHERS THEN
      -- If not available, default to 'dev' (safe default)
      RETURN 'dev';
  END;
  
  -- Parse URL pattern
  IF api_url LIKE '%-dev%' OR api_url LIKE '%localhost%' OR api_url LIKE '%127.0.0.1%' THEN
    RETURN 'dev';
  ELSIF api_url LIKE '%-staging%' THEN
    RETURN 'staging';
  ELSE
    RETURN 'prod';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_location_maps_url(p_location_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_location RECORD;
  v_address TEXT;
BEGIN
  SELECT * INTO v_location
  FROM event_locations
  WHERE id = p_location_id;
  
  IF NOT FOUND OR v_location.is_tbd OR v_location.is_virtual THEN
    RETURN NULL;
  END IF;
  
  -- If GPS coordinates are available, use them
  IF v_location.latitude IS NOT NULL AND v_location.longitude IS NOT NULL THEN
    RETURN 'https://www.google.com/maps/search/?api=1&query=' || 
           v_location.latitude || ',' || v_location.longitude;
  END IF;
  
  -- Otherwise, use the formatted address
  v_address := format_event_location_address(p_location_id);
  IF v_address IS NOT NULL THEN
    RETURN 'https://www.google.com/maps/search/?api=1&query=' || 
           replace(v_address, ' ', '+');
  END IF;
  
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_rsvp_summary(p_event_id uuid)
 RETURNS TABLE(total_children integer, going_count integer, late_count integer, not_going_count integer, unknown_count integer, response_rate numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_children,
    COUNT(*) FILTER (WHERE status = 'going')::INTEGER AS going_count,
    COUNT(*) FILTER (WHERE status = 'late')::INTEGER AS late_count,
    COUNT(*) FILTER (WHERE status = 'not_going')::INTEGER AS not_going_count,
    COUNT(*) FILTER (WHERE status = 'unknown')::INTEGER AS unknown_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status != 'unknown')::DECIMAL / COUNT(*)) * 100, 2)
    END AS response_rate
  FROM event_rsvps
  WHERE event_id = p_event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_athletes_via_guardians(p_athlete_id uuid, p_org_id uuid)
 RETURNS TABLE(athlete_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE family_athletes AS (
    -- Base case: athletes directly connected via shared guardians
    SELECT DISTINCT ag2.athlete_id
    FROM athlete_guardians ag1
    JOIN athlete_guardians ag2 ON ag1.user_id = ag2.user_id
    WHERE ag1.athlete_id = p_athlete_id
      AND ag1.organization_id = p_org_id
      AND ag2.organization_id = p_org_id
      AND ag1.status = 'active'
      AND ag2.status = 'active'
    
    UNION
    
    -- Recursive case: find athletes connected to already-found athletes
    SELECT DISTINCT ag3.athlete_id
    FROM family_athletes fa
    JOIN athlete_guardians ag2 ON fa.athlete_id = ag2.athlete_id
    JOIN athlete_guardians ag3 ON ag2.user_id = ag3.user_id
    WHERE ag2.organization_id = p_org_id
      AND ag3.organization_id = p_org_id
      AND ag2.status = 'active'
      AND ag3.status = 'active'
  )
  SELECT DISTINCT fa.athlete_id
  FROM family_athletes fa;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_guardian_athletes(p_user_id uuid, p_org_id uuid)
 RETURNS TABLE(athlete_id uuid, first_name text, last_name text, birthdate date, gender text, relationship_type text, status athlete_guardian_status)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    a.id AS athlete_id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender,
    'parent' AS relationship_type,  -- Future: store in athlete_guardians
    ag.status
  FROM athlete_guardians ag
  JOIN athletes a ON a.id = ag.athlete_id
  WHERE ag.user_id = p_user_id
    AND ag.organization_id = p_org_id
    AND a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_invite_details(p_token text)
 RETURNS TABLE(valid boolean, organization_name text, role org_member_role, email text, expires_at timestamp with time zone, expired boolean, already_accepted boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
BEGIN
  -- Get invite details
  SELECT 
    oi.organization_id,
    o.name as org_name,
    oi.email,
    oi.role,
    oi.expires_at,
    oi.accepted_at
  INTO v_invite
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  WHERE oi.token = p_token;
  
  -- Check if invite exists
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      NULL::TEXT, 
      NULL::org_member_role, 
      NULL::TEXT, 
      NULL::TIMESTAMPTZ, 
      false, 
      false, 
      'Invalid invite token';
    RETURN;
  END IF;
  
  -- Check various states
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      false, 
      v_invite.org_name, 
      v_invite.role, 
      v_invite.email, 
      v_invite.expires_at, 
      false, 
      true, 
      'This invite has already been accepted';
    RETURN;
  END IF;
  
  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      false, 
      v_invite.org_name, 
      v_invite.role, 
      v_invite.email, 
      v_invite.expires_at, 
      true, 
      false, 
      'This invite has expired';
    RETURN;
  END IF;
  
  -- Valid invite
  RETURN QUERY SELECT 
    true, 
    v_invite.org_name, 
    v_invite.role, 
    v_invite.email, 
    v_invite.expires_at, 
    false, 
    false, 
    'Valid invite';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_orphaned_athletes(p_org_id uuid)
 RETURNS TABLE(athlete_id uuid, first_name text, last_name text, birthdate date, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    a.id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.created_at
  FROM athletes a
  LEFT JOIN athlete_guardians ag ON ag.athlete_id = a.id 
    AND ag.organization_id = p_org_id 
    AND ag.status = 'active'
  WHERE ag.id IS NULL
    AND a.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN teams t ON t.id = tm.team_id
      JOIN programs p ON p.id = t.program_id
      WHERE tm.athlete_id = a.id
      AND p.org_id = p_org_id
    )
  ORDER BY a.created_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pending_invites_for_user()
 RETURNS TABLE(invite_token text, organization_name text, role org_member_role, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO v_user_email FROM users WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    oi.token,
    o.name,
    oi.role,
    oi.expires_at
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  WHERE LOWER(oi.email) = LOWER(v_user_email)
  AND oi.accepted_at IS NULL
  AND oi.expires_at > NOW()
  ORDER BY oi.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_platform_admin_role()
 RETURNS platform_admin_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM platform_admins WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_travel_events_for_team(p_team_id uuid, p_upcoming_only boolean DEFAULT true)
 RETURNS TABLE(event_id uuid, title text, start_time timestamp with time zone, end_time timestamp with time zone, hotel_name text, hotel_address text, location_city text, location_state text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    e.hotel_name,
    e.hotel_address,
    el.city,
    el.state
  FROM events e
  LEFT JOIN event_locations el ON el.event_id = e.id
  WHERE e.team_id = p_team_id
    AND is_travel_event(e.id) = true
    AND (NOT p_upcoming_only OR e.start_time >= now())
    AND e.is_cancelled = false
  ORDER BY e.start_time ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_uniform_kit_roster(p_kit_id uuid)
 RETURNS TABLE(child_id uuid, first_name text, last_name text, team_id uuid, season_id uuid, kit_id uuid, kit_name text, deadline_at timestamp with time zone, kit_locked_at timestamp with time zone, submission_id uuid, submission_status uniform_submission_status, submitted_at timestamp with time zone, submission_locked_at timestamp with time zone, fulfilled_at timestamp with time zone, items jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH kit AS (
    SELECT k.*
    FROM uniform_kits k
    WHERE k.id = p_kit_id
  ),
  roster AS (
    SELECT tm.child_id, tm.team_id, tm.season_id
    FROM kit
    JOIN team_memberships tm
      ON tm.team_id = kit.team_id
     AND tm.season_id = kit.season_id
     AND tm.status = 'active'
  ),
  subs AS (
    SELECT s.*
    FROM uniform_submissions s
    WHERE s.kit_id = p_kit_id
  )
  SELECT
    c.id AS child_id,
    c.first_name,
    c.last_name,
    kit.team_id,
    kit.season_id,
    kit.id AS kit_id,
    kit.name AS kit_name,
    kit.deadline_at,
    kit.locked_at AS kit_locked_at,
    s.id AS submission_id,
    COALESCE(s.status, 'not_submitted'::uniform_submission_status) AS submission_status,
    s.submitted_at,
    s.locked_at AS submission_locked_at,
    s.fulfilled_at,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'item_id', ki.id,
          'name', ki.name,
          'required', ki.required,
          'sort_order', ki.sort_order,
          'size_options', ki.size_options,
          'size', si.size
        )
        ORDER BY ki.sort_order, ki.name
      ), '[]'::jsonb)
      FROM uniform_kit_items ki
      LEFT JOIN uniform_submission_items si
        ON si.item_id = ki.id
       AND si.submission_id = s.id
      WHERE ki.kit_id = kit.id
    ) AS items
  FROM kit
  JOIN roster r ON true
  JOIN children c ON c.id = r.child_id
  LEFT JOIN subs s
    ON s.kit_id = kit.id
   AND s.child_id = c.id
  WHERE staff_can_access_team(auth.uid(), kit.team_id)
  ORDER BY c.last_name, c.first_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_actor_role(p_user_id uuid)
 RETURNS event_actor_role
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_user_id) THEN 'platform_admin'::event_actor_role
    WHEN EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = p_user_id AND role = 'org_admin'
    ) THEN 'org_admin'::event_actor_role
    WHEN EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = p_user_id AND role = 'coach'
    ) THEN 'coach'::event_actor_role
    WHEN EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = p_user_id AND role = 'parent'
    ) THEN 'parent'::event_actor_role
    ELSE 'parent'::event_actor_role
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_children(check_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT child_id
  FROM child_guardians
  WHERE user_id = check_user_id
    AND status = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organizations(check_user_id uuid)
 RETURNS TABLE(organization_id uuid, org_name text, roles org_member_role[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    om.organization_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = check_user_id
  GROUP BY om.organization_id, o.name
  ORDER BY o.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_roles_for_org(check_user_id uuid, check_org_id uuid)
 RETURNS org_member_role[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT ARRAY_AGG(role ORDER BY role)
  FROM organization_members
  WHERE user_id = check_user_id
    AND organization_id = check_org_id;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_display_name TEXT;
  v_requires_org_setup BOOLEAN;
  v_metadata_value JSONB;
BEGIN
  -- Extract display_name safely
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NULL
  );

  -- Extract requires_org_setup from metadata - handle both JSON boolean and string
  v_metadata_value := NEW.raw_user_meta_data->'requires_org_setup';
  
  -- Handle boolean conversion safely
  -- JSON can have boolean true/false or string "true"/"false"
  IF v_metadata_value IS NULL THEN
    v_requires_org_setup := false;
  ELSIF jsonb_typeof(v_metadata_value) = 'boolean' THEN
    -- Direct boolean value in JSON
    v_requires_org_setup := v_metadata_value::boolean;
  ELSIF jsonb_typeof(v_metadata_value) = 'string' THEN
    -- String representation of boolean
    IF v_metadata_value::text = '"true"' OR v_metadata_value::text = '"True"' OR v_metadata_value::text = '"TRUE"' THEN
      v_requires_org_setup := true;
    ELSE
      v_requires_org_setup := false;
    END IF;
  ELSE
    -- Fallback to false for any other type
    v_requires_org_setup := false;
  END IF;

  -- Insert user record with all required fields
  INSERT INTO public.users (id, email, phone, display_name, requires_org_setup, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_display_name,
    v_requires_org_setup,
    NULL  -- role is nullable, set to NULL for new auth model
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    requires_org_setup = COALESCE(EXCLUDED.requires_org_setup, users.requires_org_setup);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with full details for debugging
    RAISE WARNING 'Error in handle_new_user() trigger for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    -- Still return NEW to allow auth user creation to succeed
    -- The profile can be created manually if needed
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.import_athletes_from_spreadsheet(p_org_id uuid, p_import_id uuid, p_rows jsonb, p_import_mode text, p_team_id uuid DEFAULT NULL::uuid, p_season_id uuid DEFAULT NULL::uuid, p_assign_teams_from_spreadsheet boolean DEFAULT false, p_create_families boolean DEFAULT true, p_link_existing_families boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_row JSONB;
  v_result JSONB;
  v_imported_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_created_ids UUID[] := ARRAY[]::UUID[];
  v_row_result JSONB;
  v_child_id UUID;
  v_family_id UUID;
  v_guardian_email TEXT;
  v_team_id_to_assign UUID;
  v_season_id_to_assign UUID;
  v_team_name TEXT;
  v_season_name TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user is org admin
  IF NOT user_is_org_admin(v_user_id, p_org_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only org admins can import athletes'
    );
  END IF;

  -- Update import status to processing
  UPDATE athlete_imports
  SET status = 'processing', started_at = NOW()
  WHERE id = p_import_id AND org_id = p_org_id;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      -- Extract row data
      DECLARE
        v_first_name TEXT := v_row->>'athlete_first_name';
        v_last_name TEXT := v_row->>'athlete_last_name';
        v_dob DATE := (v_row->>'athlete_date_of_birth')::DATE;
        v_gender TEXT := v_row->>'athlete_gender';
        v_jersey_number TEXT := v_row->>'athlete_jersey_number';
        v_grade TEXT := v_row->>'athlete_grade';
        v_email TEXT := v_row->>'athlete_email';
        v_phone TEXT := v_row->>'athlete_phone';
        v_medical_notes TEXT := v_row->>'notes_medical';
        v_allergies TEXT := v_row->>'notes_allergies';
        v_guardian1_email TEXT := v_row->>'guardian1_email';
        v_guardian1_first_name TEXT := v_row->>'guardian1_first_name';
        v_guardian1_last_name TEXT := v_row->>'guardian1_last_name';
        v_guardian1_phone TEXT := v_row->>'guardian1_phone';
        v_guardian2_email TEXT := v_row->>'guardian2_email';
        v_guardian2_first_name TEXT := v_row->>'guardian2_first_name';
        v_guardian2_last_name TEXT := v_row->>'guardian2_last_name';
        v_guardian2_phone TEXT := v_row->>'guardian2_phone';
        v_team_name TEXT := v_row->>'team_name';
        v_season_name TEXT := v_row->>'season_name';
        v_membership_role TEXT := COALESCE(v_row->>'membership_role', 'player');
        v_row_number INTEGER := (v_row->>'row_number')::INTEGER;
        v_row_status TEXT := COALESCE(v_row->>'status', 'ready');
      BEGIN
        -- Skip rows with errors
        IF v_row_status = 'error' THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'row_number', v_row_number,
            'message', COALESCE(v_row->>'error_message', 'Row marked as error')
          );
          CONTINUE;
        END IF;

        -- Validate required fields
        IF v_first_name IS NULL OR v_first_name = '' OR
           v_last_name IS NULL OR v_last_name = '' OR
           v_dob IS NULL THEN
          v_error_count := v_error_count + 1;
          v_errors := v_errors || jsonb_build_object(
            'row_number', v_row_number,
            'message', 'Missing required fields: first_name, last_name, or date_of_birth'
          );
          CONTINUE;
        END IF;

        -- Find or create family
        v_family_id := NULL;
        IF p_create_families THEN
          -- Try to find existing family by guardian email
          IF p_link_existing_families AND v_guardian1_email IS NOT NULL AND v_guardian1_email != '' THEN
            SELECT f.id INTO v_family_id
            FROM families f
            JOIN family_members fm ON fm.family_id = f.id
            JOIN users u ON u.id = fm.user_id
            WHERE f.org_id = p_org_id
              AND u.email = v_guardian1_email
            LIMIT 1;
          END IF;

          -- Create new family if not found
          IF v_family_id IS NULL THEN
            INSERT INTO families (org_id, name)
            VALUES (p_org_id, v_last_name || ' Family')
            RETURNING id INTO v_family_id;

            -- Create guardian users and link to family if provided
            IF v_guardian1_email IS NOT NULL AND v_guardian1_email != '' THEN
              -- Check if user exists
              DECLARE
                v_guardian1_user_id UUID;
              BEGIN
                SELECT id INTO v_guardian1_user_id
                FROM users
                WHERE email = v_guardian1_email
                LIMIT 1;

                -- Create user if doesn't exist (simplified - in production might want invite flow)
                IF v_guardian1_user_id IS NULL THEN
                  -- Note: User creation should be handled separately via auth flow
                  -- For now, we'll just create the family and note that guardian needs to be invited
                  NULL;
                ELSE
                  -- Link existing user to family
                  INSERT INTO family_members (family_id, user_id, role, is_primary)
                  VALUES (v_family_id, v_guardian1_user_id, 'owner', true)
                  ON CONFLICT DO NOTHING;
                END IF;
              END;
            END IF;
          END IF;
        END IF;

        -- Find existing child
        SELECT id INTO v_child_id
        FROM children
        WHERE family_id = v_family_id
          AND first_name = v_first_name
          AND last_name = v_last_name
          AND birthdate = v_dob
        LIMIT 1;

        -- Handle import mode
        IF v_child_id IS NOT NULL THEN
          -- Child exists
          IF p_import_mode = 'create_only' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
          ELSIF p_import_mode IN ('update_and_create', 'update_only') THEN
            -- Update existing child (only non-null fields)
            UPDATE children
            SET 
              first_name = COALESCE(v_first_name, first_name),
              last_name = COALESCE(v_last_name, last_name),
              birthdate = COALESCE(v_dob, birthdate),
              updated_at = NOW()
            WHERE id = v_child_id;
            v_updated_count := v_updated_count + 1;
          END IF;
        ELSE
          -- Child doesn't exist
          IF p_import_mode = 'update_only' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
          ELSE
            -- Create new child
            INSERT INTO children (family_id, first_name, last_name, birthdate)
            VALUES (v_family_id, v_first_name, v_last_name, v_dob)
            RETURNING id INTO v_child_id;
            v_imported_count := v_imported_count + 1;
            v_created_ids := v_created_ids || v_child_id;
          END IF;
        END IF;

        -- Assign to team if specified
        IF v_child_id IS NOT NULL THEN
          -- Determine team and season
          IF p_assign_teams_from_spreadsheet AND v_team_name IS NOT NULL THEN
            -- Look up team by name
            SELECT id INTO v_team_id_to_assign
            FROM teams
            WHERE org_id = p_org_id AND name = v_team_name
            LIMIT 1;

            -- Look up season by name
            IF v_season_name IS NOT NULL THEN
              SELECT id INTO v_season_id_to_assign
              FROM seasons
              WHERE org_id = p_org_id AND name = v_season_name
              LIMIT 1;
            END IF;
          ELSE
            -- Use provided team/season
            v_team_id_to_assign := p_team_id;
            v_season_id_to_assign := p_season_id;
          END IF;

          -- Create team membership if team and season are available
          IF v_team_id_to_assign IS NOT NULL AND v_season_id_to_assign IS NOT NULL THEN
            INSERT INTO team_memberships (child_id, team_id, season_id, status)
            VALUES (v_child_id, v_team_id_to_assign, v_season_id_to_assign, 'active')
            ON CONFLICT (child_id, team_id, season_id) DO NOTHING;
          END IF;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'row_number', v_row_number,
          'message', SQLERRM
        );
      END;
    END;
  END LOOP;

  -- Update import record with results
  UPDATE athlete_imports
  SET 
    status = 'completed',
    completed_at = NOW(),
    imported_count = v_imported_count,
    updated_count = v_updated_count,
    skipped_count = v_skipped_count,
    error_count = v_error_count,
    results_json = jsonb_build_object(
      'imported_count', v_imported_count,
      'updated_count', v_updated_count,
      'skipped_count', v_skipped_count,
      'error_count', v_error_count,
      'created_ids', v_created_ids,
      'errors', v_errors,
      'warnings', v_warnings
    ),
    error_summary = v_errors
  WHERE id = p_import_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'imported_count', v_imported_count,
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count,
    'error_count', v_error_count,
    'errors', v_errors
  );

EXCEPTION WHEN OTHERS THEN
  -- Update import record with error
  UPDATE athlete_imports
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_summary = jsonb_build_object('error', SQLERRM)
  WHERE id = p_import_id;

  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_license_active(org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  lic record;
begin
  select * into lic from org_licenses where organization_id = org_id;
  if lic is null then
    return false;
  end if;

  if lic.status = 'trial' and lic.trial_ends_at > now() then
    return true;
  end if;

  if lic.status = 'active' and lic.current_period_end > now() then
    return true;
  end if;

  if lic.status = 'past_due' and lic.grace_ends_at > now() then
    return true;
  end if;

  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_license_readonly_allowed(org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  lic record;
begin
  select * into lic from org_licenses where organization_id = org_id;
  if lic is null then
    return false;
  end if;

  if is_org_license_active(org_id) then
    return true;
  end if;

  if lic.status = 'canceled' and lic.current_period_end > now() then
    return true;
  end if;

  if lic.status = 'past_due' and lic.grace_ends_at > now() then
    return true;
  end if;

  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_parent_of_child(check_user_id uuid, check_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN athletes c ON c.family_id = u.family_id
    WHERE u.id = check_user_id
      AND c.id = check_child_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_platform_admin(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = check_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_travel_event(p_event_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_event RECORD;
  v_org RECORD;
  v_location RECORD;
  v_override JSONB;
  v_is_travel BOOLEAN := false;
BEGIN
  -- Load event with team relation
  SELECT 
    e.*,
    t.org_id
  INTO v_event
  FROM events e
  JOIN teams t ON t.id = e.team_id
  WHERE e.id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check for admin override first (see Issue 4)
  v_override := v_event.travel_override;
  IF v_override IS NOT NULL AND v_override->>'is_travel' IS NOT NULL THEN
    RETURN (v_override->>'is_travel')::boolean;
  END IF;
  
  -- Rule 1: Explicit travel flag (high confidence)
  IF v_event.requires_travel = true THEN
    RETURN true;
  END IF;
  
  -- Rule 2: Overnight flag (high confidence)
  IF v_event.overnight = true THEN
    RETURN true;
  END IF;
  
  -- Rule 3: Hotel information present (high confidence)
  IF v_event.hotel_name IS NOT NULL OR v_event.hotel_address IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Rule 4: Travel times specified (medium confidence)
  IF v_event.departure_time IS NOT NULL OR v_event.return_time IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Rule 5: Transportation notes or itinerary present
  IF v_event.transportation_notes IS NOT NULL OR v_event.itinerary_file_path IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Rule 6: Event type 'travel' is explicit indicator (see Issue 10)
  IF v_event.type = 'travel' THEN
    RETURN true;
  END IF;
  
  -- Rule 7: Location-based detection (if org has primary location - see Issue 5)
  -- Location is a supporting indicator, not a requirement
  IF v_event.org_id IS NOT NULL THEN
    -- Load org location settings
    SELECT primary_city, primary_state, primary_region_radius_miles
    INTO v_org
    FROM organizations
    WHERE id = v_event.org_id;
    
    -- Only use location detection if org has primary location set
    IF v_org.primary_city IS NOT NULL AND v_org.primary_state IS NOT NULL THEN
      -- Load event location if exists
      SELECT * INTO v_location
      FROM event_locations
      WHERE event_id = p_event_id;
      
      IF FOUND THEN
        -- Different state is strong indicator
        IF v_location.state IS NOT NULL AND v_location.state != v_org.primary_state THEN
          RETURN true;
        END IF;
        
        -- Different city + tournament type suggests travel
        IF v_location.city IS NOT NULL AND v_location.city != v_org.primary_city THEN
          IF v_event.type = 'tournament' THEN
            RETURN true;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Rule 8: Multi-day events (>24 hours) with away location
  IF EXTRACT(EPOCH FROM (v_event.end_time - v_event.start_time)) > 86400 THEN
    -- Check if location is different from org's primary
    SELECT * INTO v_location FROM event_locations WHERE event_id = p_event_id;
    
    IF FOUND AND v_location.city IS NOT NULL THEN
      SELECT primary_city INTO v_org FROM organizations WHERE id = v_event.org_id;
      IF v_org.primary_city IS NOT NULL AND v_location.city != v_org.primary_city THEN
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_guardian_to_athlete(p_athlete_id uuid, p_email text, p_org_id uuid, p_relationship_type text DEFAULT 'parent'::text, p_created_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_lock_key BIGINT;
  v_normalized_email TEXT;
  v_user_id UUID;
  v_invite_id UUID;
  v_token TEXT;
  v_athlete_guardian_id UUID;
BEGIN
  -- Normalize email
  v_normalized_email := normalize_email(p_email);
  
  -- Acquire advisory lock on normalized email hash
  -- This prevents race conditions when multiple admins link same guardian
  v_lock_key := hashtext(v_normalized_email);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check if user exists
  SELECT id INTO v_user_id 
  FROM users 
  WHERE normalize_email(email) = v_normalized_email
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists: create or update athlete_guardians link (idempotent)
    INSERT INTO athlete_guardians (
      athlete_id,
      user_id,
      organization_id,
      status
    )
    VALUES (
      p_athlete_id,
      v_user_id,
      p_org_id,
      'active'
    )
    ON CONFLICT (athlete_id, user_id, organization_id)
    DO UPDATE SET
      status = 'active',
      updated_at = NOW()
    RETURNING id INTO v_athlete_guardian_id;
    
    -- Ensure user has parent role in organization
    -- This uses the existing add_org_role function which is also idempotent
    PERFORM add_org_role(v_user_id, p_org_id, 'parent');
    
    -- Convert any pending invites to accepted
    UPDATE parent_invites
    SET 
      status = 'accepted',
      accepted_by_user_id = v_user_id,
      accepted_at = NOW()
    WHERE organization_id = p_org_id
      AND athlete_id = p_athlete_id
      AND LOWER(email) = v_normalized_email
      AND status = 'pending';
    
    RETURN jsonb_build_object(
      'type', 'guardian',
      'id', v_athlete_guardian_id,
      'user_id', v_user_id,
      'email', v_normalized_email,
      'status', 'active',
      'already_existed', FOUND
    );
    
  ELSE
    -- User doesn't exist: create parent_invites (idempotent)
    v_token := gen_random_uuid()::text;
    
    INSERT INTO parent_invites (
      organization_id,
      athlete_id,
      email,
      status,
      token,
      expires_at,
      created_by_user_id
    )
    VALUES (
      p_org_id,
      p_athlete_id,
      v_normalized_email,
      'pending',
      v_token,
      NOW() + INTERVAL '30 days',
      COALESCE(p_created_by_user_id, auth.uid())
    )
    ON CONFLICT (organization_id, athlete_id, LOWER(email))
    WHERE status = 'pending'
    DO UPDATE SET
      expires_at = NOW() + INTERVAL '30 days',
      updated_at = NOW(),
      token = EXCLUDED.token
    RETURNING id, token INTO v_invite_id, v_token;
    
    RETURN jsonb_build_object(
      'type', 'invite',
      'id', v_invite_id,
      'email', v_normalized_email,
      'token', v_token,
      'status', 'pending',
      'expires_at', NOW() + INTERVAL '30 days'
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.lock_uniform_kit(p_kit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT team_id INTO v_team_id
  FROM uniform_kits
  WHERE id = p_kit_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Kit not found';
  END IF;

  IF NOT staff_can_access_team(auth.uid(), v_team_id) THEN
    RAISE EXCEPTION 'Not authorized to lock this kit';
  END IF;

  -- Set kit lock if not already set
  UPDATE uniform_kits
  SET locked_at = COALESCE(locked_at, v_now),
      updated_at = NOW()
  WHERE id = p_kit_id;

  -- Transition submissions (do not override fulfilled)
  UPDATE uniform_submissions
  SET status = 'locked',
      locked_at = COALESCE(locked_at, v_now),
      updated_at = NOW()
  WHERE kit_id = p_kit_id
    AND status <> 'fulfilled';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_child_claim_token_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_log
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Log CHILD_CLAIM_TOKEN_CREATED
    PERFORM log_event(
      'ORGANIZATION',
      'CHILD_CLAIM_TOKEN_CREATED',
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'org_admin',
      NEW.organization_id,
      'claim_token',
      NEW.id::text,
      jsonb_build_object(
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
    -- Log CHILD_CLAIMED (when token is redeemed)
    PERFORM log_event(
      'ORGANIZATION',
      'CHILD_CLAIMED',
      NEW.used_by_user_id,
      'parent',
      NEW.organization_id,
      'claim_token',
      NEW.id::text,
      jsonb_build_object(
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'used_by_user_id', NEW.used_by_user_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_event(p_category event_category, p_event_type text, p_actor_role event_actor_role, p_actor_user_id uuid DEFAULT auth.uid(), p_org_id uuid DEFAULT NULL::uuid, p_target_entity_type text DEFAULT NULL::text, p_target_entity_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_idempotency_key uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_id UUID;
  v_metadata_size INTEGER;
  v_logging_disabled BOOLEAN;
BEGIN
  -- Check if logging is disabled (prevents circular logging)
  v_logging_disabled := current_setting('app.logging_disabled', true) = 'true';
  IF v_logging_disabled THEN
    RETURN NULL;
  END IF;

  -- Validate event type against category
  IF NOT validate_event_type(p_category, p_event_type) THEN
    RAISE EXCEPTION 'Event type % is not valid for category %', p_event_type, p_category;
  END IF;

  -- Check idempotency key (if provided)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_event_id FROM event_logs WHERE idempotency_key = p_idempotency_key;
    IF v_event_id IS NOT NULL THEN
      RETURN v_event_id; -- Return existing event ID
    END IF;
  END IF;

  -- Sanitize metadata
  p_metadata := sanitize_metadata(p_metadata);

  -- Check metadata size (max 100KB)
  v_metadata_size := pg_column_size(p_metadata);
  IF v_metadata_size > 102400 THEN
    RAISE EXCEPTION 'Metadata size % bytes exceeds maximum of 102400 bytes', v_metadata_size;
  END IF;

  -- Insert event with SAVEPOINT for non-blocking failure
  BEGIN
    INSERT INTO event_logs (
      category,
      event_type,
      actor_user_id,
      actor_role,
      org_id,
      target_entity_type,
      target_entity_id,
      metadata,
      ip_address,
      user_agent,
      idempotency_key
    )
    VALUES (
      p_category,
      p_event_type,
      p_actor_user_id,
      p_actor_role,
      p_org_id,
      p_target_entity_type,
      p_target_entity_id,
      p_metadata,
      p_ip_address,
      p_user_agent,
      p_idempotency_key
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the main transaction
      RAISE WARNING 'Failed to log event: %', SQLERRM;
      RETURN NULL;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_event_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Log event creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO event_change_history (
      event_id,
      changed_by_user_id,
      change_type
    ) VALUES (
      NEW.id,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'created'
    );
    RETURN NEW;
  END IF;

  -- Log event updates
  IF TG_OP = 'UPDATE' THEN
    -- Log time changes (rescheduling)
    IF OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'rescheduled',
        'time',
        jsonb_build_object('start', OLD.start_time, 'end', OLD.end_time)::text,
        jsonb_build_object('start', NEW.start_time, 'end', NEW.end_time)::text
      );
    END IF;

    -- Log location changes
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'updated',
        'location',
        OLD.location,
        NEW.location
      );
    END IF;

    -- Log cancellation
    IF OLD.is_cancelled = false AND NEW.is_cancelled = true THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        COALESCE(NEW.cancelled_by_user_id, auth.uid()),
        'cancelled',
        'cancellation_reason',
        NULL,
        NEW.cancellation_reason
      );
    END IF;

    -- Log restoration (uncancellation)
    IF OLD.is_cancelled = true AND NEW.is_cancelled = false THEN
      INSERT INTO event_change_history (
        event_id,
        changed_by_user_id,
        change_type
      ) VALUES (
        NEW.id,
        auth.uid(),
        'restored'
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Log event deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO event_change_history (
      event_id,
      changed_by_user_id,
      change_type
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted'
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_feature_flag_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  old_val JSONB;
  new_val JSONB;
  scope_type_val TEXT;
  scope_id_val TEXT;
  action_val TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
  END IF;
  
  -- Determine scope
  IF TG_TABLE_NAME = 'feature_flag_platform_defaults' THEN
    scope_type_val := 'platform';
    scope_id_val := NULL;
  ELSIF TG_TABLE_NAME = 'feature_flag_org_overrides' THEN
    scope_type_val := 'organization';
    scope_id_val := COALESCE(NEW.org_id::TEXT, OLD.org_id::TEXT);
  ELSIF TG_TABLE_NAME = 'feature_flag_user_overrides' THEN
    scope_type_val := 'user';
    scope_id_val := COALESCE(NEW.user_id::TEXT, OLD.user_id::TEXT);
  ELSIF TG_TABLE_NAME = 'feature_flags' THEN
    scope_type_val := 'flag';
    scope_id_val := NULL;
  END IF;
  
  -- Build old and new value JSONB
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_val := jsonb_build_object(
      'value_boolean', OLD.value_boolean,
      'value_integer', OLD.value_integer,
      'value_double', OLD.value_double,
      'version', OLD.version
    );
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_val := jsonb_build_object(
      'value_boolean', NEW.value_boolean,
      'value_integer', NEW.value_integer,
      'value_double', NEW.value_double,
      'version', NEW.version
    );
  END IF;
  
  -- For feature_flags table, capture different fields
  IF TG_TABLE_NAME = 'feature_flags' THEN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_val := jsonb_build_object(
        'key', OLD.key,
        'value_type', OLD.value_type,
        'description', OLD.description,
        'environment', OLD.environment,
        'deleted_at', OLD.deleted_at,
        'version', OLD.version
      );
    END IF;
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_val := jsonb_build_object(
        'key', NEW.key,
        'value_type', NEW.value_type,
        'description', NEW.description,
        'environment', NEW.environment,
        'deleted_at', NEW.deleted_at,
        'version', NEW.version
      );
    END IF;
  END IF;
  
  -- Insert audit log entry
  INSERT INTO feature_flag_audit_log (
    actor_id,
    action,
    feature_flag_id,
    scope_type,
    scope_id,
    old_value,
    new_value,
    environment
  ) VALUES (
    auth.uid(),
    action_val,
    COALESCE(NEW.id, OLD.id),
    scope_type_val,
    scope_id_val,
    old_val,
    new_val,
    COALESCE(NEW.environment, OLD.environment)
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_fee_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'FEE_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'FEE_UPDATED';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'FEE_DELETED';
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'PAYMENT'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    COALESCE(NEW.organization_id, OLD.organization_id),
    'fee',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'title', COALESCE(NEW.title, OLD.title),
      'amount_cents', COALESCE(NEW.amount_cents, OLD.amount_cents),
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_join_link_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_idempotency_key := 'INSERT:' || NEW.id::text || ':' || statement_timestamp()::text;
    
    -- Check for duplicate
    IF EXISTS (
      SELECT 1 FROM event_log
      WHERE metadata->>'idempotency_key' = v_idempotency_key
      AND created_at > NOW() - INTERVAL '1 second'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Log JOIN_LINK_CREATED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_LINK_CREATED',
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'org_admin',
      NEW.organization_id,
      'join_link',
      NEW.id::text,
      jsonb_build_object(
        'team_id', NEW.team_id,
        'auto_approve', NEW.auto_approve,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_join_request_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_log
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Log JOIN_REQUEST_SUBMITTED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_SUBMITTED',
      NEW.requested_by_user_id,
      'parent',
      NEW.organization_id,
      'join_request',
      NEW.id::text,
      jsonb_build_object(
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'join_link_id', NEW.join_link_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- Log JOIN_REQUEST_APPROVED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_APPROVED',
      NEW.reviewed_by_user_id,
      'org_admin',
      NEW.organization_id,
      'join_request',
      NEW.id::text,
      jsonb_build_object(
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'requested_by_user_id', NEW.requested_by_user_id,
        'decision_reason', NEW.decision_reason,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'denied' THEN
    -- Log JOIN_REQUEST_DENIED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_DENIED',
      NEW.reviewed_by_user_id,
      'org_admin',
      NEW.organization_id,
      'join_request',
      NEW.id::text,
      jsonb_build_object(
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'requested_by_user_id', NEW.requested_by_user_id,
        'decision_reason', NEW.decision_reason,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_organization_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'ORG_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'ORG_UPDATED';
    -- Check for specific status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'active' THEN
        v_event_type := 'ORG_ACTIVATED';
      ELSIF NEW.status = 'suspended' THEN
        v_event_type := 'ORG_SUSPENDED';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'ORG_DELETED';
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'ORGANIZATION'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    COALESCE(NEW.id, OLD.id),
    'organization',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_name', OLD.name,
      'new_name', NEW.name
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_organization_member_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_idempotency_key TEXT;
  v_actor_role TEXT;
  v_is_first_role BOOLEAN;
  v_is_last_role BOOLEAN;
BEGIN
  -- Generate idempotency key based on operation and data
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.user_id, OLD.user_id)::text || ':' ||
    COALESCE(NEW.organization_id, OLD.organization_id)::text || ':' ||
    COALESCE(NEW.role, OLD.role)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate in last second (idempotency)
  IF EXISTS (
    SELECT 1 FROM event_log
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get actor role (best guess - may be platform admin or org admin)
  SELECT 
    CASE 
      WHEN is_platform_admin(auth.uid()) THEN 'platform_admin'
      WHEN user_has_any_org_roles(auth.uid(), COALESCE(NEW.organization_id, OLD.organization_id), ARRAY['org_admin']::org_member_role[]) THEN 'org_admin'
      ELSE 'system'
    END INTO v_actor_role;
  
  IF TG_OP = 'INSERT' THEN
    -- Check if this is the first role for this user in this org
    SELECT NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.user_id
        AND organization_id = NEW.organization_id
        AND id != NEW.id
    ) INTO v_is_first_role;
    
    -- Log ROLE_ADDED
    PERFORM log_event(
      'ORGANIZATION',
      'ROLE_ADDED',
      COALESCE(auth.uid(), NEW.user_id), -- actor (may be self-add or admin-add)
      v_actor_role::text,
      NEW.organization_id,
      'user',
      NEW.user_id::text,
      jsonb_build_object(
        'role', NEW.role,
        'idempotency_key', v_idempotency_key
      )
    );
    
    -- If first role, also log ORG_JOINED
    IF v_is_first_role THEN
      PERFORM log_event(
        'ORGANIZATION',
        'ORG_JOINED',
        COALESCE(auth.uid(), NEW.user_id),
        v_actor_role::text,
        NEW.organization_id,
        'organization',
        NEW.organization_id::text,
        jsonb_build_object(
          'first_role', NEW.role,
          'user_id', NEW.user_id,
          'idempotency_key', v_idempotency_key || ':joined'
        )
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if this was the last role for this user in this org
    SELECT NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = OLD.user_id
        AND organization_id = OLD.organization_id
        AND id != OLD.id
    ) INTO v_is_last_role;
    
    -- Log ROLE_REMOVED
    PERFORM log_event(
      'ORGANIZATION',
      'ROLE_REMOVED',
      COALESCE(auth.uid(), OLD.user_id),
      v_actor_role::text,
      OLD.organization_id,
      'user',
      OLD.user_id::text,
      jsonb_build_object(
        'role', OLD.role,
        'idempotency_key', v_idempotency_key
      )
    );
    
    -- If last role, also log ORG_LEFT
    IF v_is_last_role THEN
      PERFORM log_event(
        'ORGANIZATION',
        'ORG_LEFT',
        COALESCE(auth.uid(), OLD.user_id),
        v_actor_role::text,
        OLD.organization_id,
        'organization',
        OLD.organization_id::text,
        jsonb_build_object(
          'last_role', OLD.role,
          'user_id', OLD.user_id,
          'idempotency_key', v_idempotency_key || ':left'
        )
      );
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_parent_invite_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_log
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Log PARENT_INVITED
    PERFORM log_event(
      'ORGANIZATION',
      'PARENT_INVITED',
      COALESCE(NEW.created_by_user_id, auth.uid()),
      'org_admin',
      NEW.organization_id,
      'parent_invite',
      NEW.id::text,
      jsonb_build_object(
        'email', NEW.email,
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Log PARENT_ATTACHED (when invite is accepted)
    PERFORM log_event(
      'ORGANIZATION',
      'PARENT_ATTACHED',
      NEW.accepted_by_user_id,
      'parent',
      NEW.organization_id,
      'parent_invite',
      NEW.id::text,
      jsonb_build_object(
        'email', NEW.email,
        'child_id', NEW.child_id,
        'team_id', NEW.team_id,
        'accepted_by_user_id', NEW.accepted_by_user_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_payment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
  v_org_id UUID;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Get organization ID from payment
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  -- Determine event type based on status changes
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'PAYMENT_STARTED';
    IF NEW.status = 'succeeded' THEN
      v_event_type := 'PAYMENT_SUCCEEDED';
    ELSIF NEW.status = 'failed' THEN
      v_event_type := 'PAYMENT_FAILED';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'succeeded' THEN
        v_event_type := 'PAYMENT_SUCCEEDED';
      ELSIF NEW.status = 'failed' THEN
        v_event_type := 'PAYMENT_FAILED';
      ELSIF NEW.status = 'refunded' THEN
        v_event_type := 'PAYMENT_REFUNDED';
      ELSIF NEW.status = 'partially_refunded' THEN
        v_event_type := 'PAYMENT_PARTIALLY_REFUNDED';
      ELSE
        v_event_type := 'PAYMENT_STARTED';
      END IF;
    ELSE
      -- Status didn't change, just an update
      RETURN NEW;
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'PAYMENT'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    v_org_id,
    'payment',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'amount_cents', COALESCE(NEW.amount_cents, OLD.amount_cents),
      'currency', COALESCE(NEW.currency, OLD.currency),
      'old_status', OLD.status,
      'new_status', NEW.status,
      'stripe_payment_intent_id', COALESCE(NEW.stripe_payment_intent_id, OLD.stripe_payment_intent_id)
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_user_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'USER_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'USER_UPDATED';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'USER_DELETED';
  END IF;

  -- Get actor role
  v_actor_role := get_user_actor_role(auth.uid());

  -- Log the event
  PERFORM log_event(
    'USER'::event_category,
    v_event_type,
    auth.uid(),
    v_actor_role,
    NULL, -- org_id not directly on users table
    'user',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old_email', OLD.email,
      'new_email', NEW.email,
      'old_display_name', OLD.display_name,
      'new_display_name', NEW.display_name
    ),
    NULL,
    NULL,
    NULL
  );

  -- Reset logging flag
  PERFORM set_config('app.logging_disabled', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_uniform_submission_fulfilled(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT k.team_id INTO v_team_id
  FROM uniform_submissions s
  JOIN uniform_kits k ON k.id = s.kit_id
  WHERE s.id = p_submission_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF NOT staff_can_access_team(auth.uid(), v_team_id) THEN
    RAISE EXCEPTION 'Not authorized to fulfill this submission';
  END IF;

  UPDATE uniform_submissions
  SET status = 'fulfilled',
      fulfilled_at = COALESCE(fulfilled_at, NOW()),
      updated_at = NOW()
  WHERE id = p_submission_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_email(email text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_local TEXT;
  v_domain TEXT;
  v_normalized TEXT;
BEGIN
  -- Handle null/empty
  IF email IS NULL OR TRIM(email) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Lowercase and trim
  v_normalized := LOWER(TRIM(email));
  
  -- Split into local and domain parts
  v_local := SPLIT_PART(v_normalized, '@', 1);
  v_domain := SPLIT_PART(v_normalized, '@', 2);
  
  -- Gmail-specific normalization (remove dots from local part)
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    v_local := REPLACE(v_local, '.', '');
    -- Gmail also ignores everything after + in local part
    v_local := SPLIT_PART(v_local, '+', 1);
  END IF;
  
  RETURN v_local || '@' || v_domain;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.parent_can_access_team_via_membership(check_user_id uuid, check_team_id uuid, check_season_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN athletes c ON c.family_id = u.family_id
    JOIN team_memberships tm ON tm.athlete_id = c.id
    WHERE u.id = check_user_id
      AND tm.team_id = check_team_id
      AND tm.season_id = check_season_id
      AND tm.status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.process_payment_allocation(p_fee_assignment_id uuid, p_amount_cents integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_fee fee_assignments%rowtype;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'p_amount_cents must be positive';
  end if;

  select * into v_fee
  from fee_assignments
  where id = p_fee_assignment_id
  for update nowait;

  if not found then
    raise exception 'fee_assignment % not found', p_fee_assignment_id;
  end if;

  if v_fee.balance_cents < p_amount_cents then
    raise exception 'insufficient balance on fee_assignment %', p_fee_assignment_id;
  end if;

  update fee_assignments
    set
      paid_cents_total = paid_cents_total + p_amount_cents,
      balance_cents = balance_cents - p_amount_cents,
      status = case
        when balance_cents - p_amount_cents <= 0 then 'paid'
        when paid_cents_total + p_amount_cents > 0 then 'partial'
        else 'unpaid'
      end,
      updated_at = now()
  where id = p_fee_assignment_id;
exception
  when lock_not_available then
    raise exception 'fee_assignment % is being updated; retry', p_fee_assignment_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_child_claim_token(p_token text)
 RETURNS TABLE(success boolean, child_id uuid, organization_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_token RECORD;
  v_current_user UUID := auth.uid();
BEGIN
  IF v_current_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Login required';
    RETURN;
  END IF;

  SELECT *
  INTO v_token
  FROM child_claim_tokens
  WHERE token = p_token
  FOR UPDATE NOWAIT;

  IF v_token IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid token';
    RETURN;
  END IF;

  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_token.child_id, v_token.organization_id, 'Token expired';
    RETURN;
  END IF;

  IF v_token.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, v_token.child_id, v_token.organization_id, 'Token already used';
    RETURN;
  END IF;

  INSERT INTO child_guardians (child_id, user_id, organization_id, status)
  VALUES (v_token.child_id, v_current_user, v_token.organization_id, 'active')
  ON CONFLICT (child_id, user_id, organization_id)
  DO UPDATE SET status = 'active', updated_at = NOW();

  PERFORM add_org_role(v_current_user, v_token.organization_id, 'parent');

  IF v_token.team_id IS NOT NULL THEN
    INSERT INTO team_memberships (child_id, team_id, season_id, status)
    VALUES (v_token.child_id, v_token.team_id, v_token.season_id, 'active')
    ON CONFLICT (child_id, team_id, season_id) DO NOTHING;
  END IF;

  UPDATE child_claim_tokens
  SET used_at = NOW(),
      used_by_user_id = v_current_user
  WHERE id = v_token.id;

  RETURN QUERY SELECT true, v_token.child_id, v_token.organization_id, 'Child claimed';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_derived_families()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Refresh concurrently to avoid blocking reads
  -- Note: CONCURRENTLY requires a unique index
  REFRESH MATERIALIZED VIEW CONCURRENTLY derived_families_mv;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_event_logs_recent()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_logs_recent;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_child_for_tryout(p_tryout_id uuid, p_child_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_family_id UUID;
  v_tryout_org_id UUID;
  v_deadline TIMESTAMPTZ;
  v_capacity INTEGER;
  v_active_count INTEGER;
  v_registration_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.family_id INTO v_family_id
  FROM users u
  WHERE u.id = v_user_id;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'User is not a parent with a family';
  END IF;

  -- Verify child belongs to family
  IF NOT EXISTS (
    SELECT 1 FROM children c
    WHERE c.id = p_child_id AND c.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Child does not belong to user family';
  END IF;

  -- Lock tryout row to prevent capacity races
  SELECT t.org_id, t.registration_deadline_at, COALESCE(t.capacity, t.max_spots)
    INTO v_tryout_org_id, v_deadline, v_capacity
  FROM tryouts t
  WHERE t.id = p_tryout_id
  FOR UPDATE;

  IF v_tryout_org_id IS NULL THEN
    RAISE EXCEPTION 'Tryout not found';
  END IF;

  -- Verify org access (multi-org aware, legacy fallback)
  IF NOT (
    user_has_org_access(v_user_id, v_tryout_org_id)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = v_user_id AND u.org_id = v_tryout_org_id)
  ) THEN
    RAISE EXCEPTION 'No access to this organization';
  END IF;

  IF v_deadline IS NOT NULL AND NOW() > v_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count
    FROM tryout_registrations r
    WHERE r.tryout_id = p_tryout_id
      AND r.status <> 'withdrawn';

    IF v_active_count >= v_capacity THEN
      RAISE EXCEPTION 'Tryout is at capacity';
    END IF;
  END IF;

  INSERT INTO tryout_registrations (tryout_id, child_id, family_id, status)
  VALUES (p_tryout_id, p_child_id, v_family_id, 'registered')
  ON CONFLICT (tryout_id, child_id) DO UPDATE
    SET status = 'registered',
        updated_at = NOW()
  RETURNING id INTO v_registration_id;

  -- Pre-create document rows for required docs (status=missing) for this registration
  INSERT INTO tryout_registration_documents (registration_id, required_document_id, status)
  SELECT v_registration_id, rd.id, 'missing'
  FROM tryout_required_documents rd
  WHERE rd.tryout_id = p_tryout_id
  ON CONFLICT (registration_id, required_document_id) DO NOTHING;

  RETURN v_registration_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_guardian_from_athlete(p_athlete_id uuid, p_user_id uuid, p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_updated BOOLEAN;
BEGIN
  -- Update status to 'removed' (soft delete)
  UPDATE athlete_guardians
  SET 
    status = 'removed',
    updated_at = NOW()
  WHERE athlete_id = p_athlete_id
    AND user_id = p_user_id
    AND organization_id = p_org_id
    AND status = 'active';
  
  v_updated := FOUND;
  
  -- Check if user has any other active athlete guardians in this org
  -- If not, consider removing parent role (optional)
  -- For now, we keep the role as they may still have access to other features
  
  RETURN jsonb_build_object(
    'success', v_updated,
    'athlete_id', p_athlete_id,
    'user_id', p_user_id,
    'status', 'removed'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_org_role(p_user_id uuid, p_org_id uuid, p_role org_member_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_lock_key BIGINT := hashtext(p_user_id::text || p_org_id::text);
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  DELETE FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_org_id
    AND role = p_role;

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_feature_flag(p_feature_key text, p_user_id uuid DEFAULT NULL::uuid, p_org_id uuid DEFAULT NULL::uuid, p_environment feature_flag_environment DEFAULT NULL::feature_flag_environment)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_environment feature_flag_environment;
  v_flag_id UUID;
  v_value_type feature_flag_value_type;
  v_resolved_value JSONB;
  v_resolved_from TEXT;
  v_source_id TEXT;
  v_user_value BOOLEAN;
  v_user_value_int INTEGER;
  v_user_value_double DOUBLE PRECISION;
  v_org_value BOOLEAN;
  v_org_value_int INTEGER;
  v_org_value_double DOUBLE PRECISION;
  v_platform_value BOOLEAN;
  v_platform_value_int INTEGER;
  v_platform_value_double DOUBLE PRECISION;
BEGIN
  -- Determine environment
  v_environment := COALESCE(p_environment, get_environment_from_url());
  
  -- Find flag (excluding soft-deleted)
  SELECT id, value_type INTO v_flag_id, v_value_type
  FROM feature_flags
  WHERE key = p_feature_key
    AND environment = v_environment
    AND deleted_at IS NULL;
  
  -- If flag doesn't exist, return null
  IF v_flag_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check user override (highest priority)
  IF p_user_id IS NOT NULL THEN
    IF v_value_type = 'boolean' THEN
      SELECT value_boolean INTO v_user_value
      FROM feature_flag_user_overrides
      WHERE feature_flag_id = v_flag_id
        AND user_id = p_user_id
        AND environment = v_environment;
      
      IF v_user_value IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_user_value,
          'value_type', v_value_type,
          'resolved_from', 'user',
          'source_id', p_user_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'integer' THEN
      SELECT value_integer INTO v_user_value_int
      FROM feature_flag_user_overrides
      WHERE feature_flag_id = v_flag_id
        AND user_id = p_user_id
        AND environment = v_environment;
      
      IF v_user_value_int IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_user_value_int,
          'value_type', v_value_type,
          'resolved_from', 'user',
          'source_id', p_user_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'double' THEN
      SELECT value_double INTO v_user_value_double
      FROM feature_flag_user_overrides
      WHERE feature_flag_id = v_flag_id
        AND user_id = p_user_id
        AND environment = v_environment;
      
      IF v_user_value_double IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_user_value_double,
          'value_type', v_value_type,
          'resolved_from', 'user',
          'source_id', p_user_id::TEXT
        );
      END IF;
    END IF;
  END IF;
  
  -- Check org override (second priority)
  IF p_org_id IS NOT NULL THEN
    IF v_value_type = 'boolean' THEN
      SELECT value_boolean INTO v_org_value
      FROM feature_flag_org_overrides
      WHERE feature_flag_id = v_flag_id
        AND org_id = p_org_id
        AND environment = v_environment;
      
      IF v_org_value IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_org_value,
          'value_type', v_value_type,
          'resolved_from', 'organization',
          'source_id', p_org_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'integer' THEN
      SELECT value_integer INTO v_org_value_int
      FROM feature_flag_org_overrides
      WHERE feature_flag_id = v_flag_id
        AND org_id = p_org_id
        AND environment = v_environment;
      
      IF v_org_value_int IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_org_value_int,
          'value_type', v_value_type,
          'resolved_from', 'organization',
          'source_id', p_org_id::TEXT
        );
      END IF;
    ELSIF v_value_type = 'double' THEN
      SELECT value_double INTO v_org_value_double
      FROM feature_flag_org_overrides
      WHERE feature_flag_id = v_flag_id
        AND org_id = p_org_id
        AND environment = v_environment;
      
      IF v_org_value_double IS NOT NULL THEN
        RETURN jsonb_build_object(
          'value', v_org_value_double,
          'value_type', v_value_type,
          'resolved_from', 'organization',
          'source_id', p_org_id::TEXT
        );
      END IF;
    END IF;
  END IF;
  
  -- Check platform default (lowest priority)
  IF v_value_type = 'boolean' THEN
    SELECT value_boolean INTO v_platform_value
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = v_flag_id
      AND environment = v_environment;
    
    IF v_platform_value IS NOT NULL THEN
      RETURN jsonb_build_object(
        'value', v_platform_value,
        'value_type', v_value_type,
        'resolved_from', 'platform',
        'source_id', NULL
      );
    END IF;
  ELSIF v_value_type = 'integer' THEN
    SELECT value_integer INTO v_platform_value_int
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = v_flag_id
      AND environment = v_environment;
    
    IF v_platform_value_int IS NOT NULL THEN
      RETURN jsonb_build_object(
        'value', v_platform_value_int,
        'value_type', v_value_type,
        'resolved_from', 'platform',
        'source_id', NULL
      );
    END IF;
  ELSIF v_value_type = 'double' THEN
    SELECT value_double INTO v_platform_value_double
    FROM feature_flag_platform_defaults
    WHERE feature_flag_id = v_flag_id
      AND environment = v_environment;
    
    IF v_platform_value_double IS NOT NULL THEN
      RETURN jsonb_build_object(
        'value', v_platform_value_double,
        'value_type', v_value_type,
        'resolved_from', 'platform',
        'source_id', NULL
      );
    END IF;
  END IF;
  
  -- No value found at any level, return null
  RETURN NULL;
  
EXCEPTION
  WHEN OTHERS THEN
    -- On any error, return null (graceful degradation)
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_feature_flags(p_feature_keys text[], p_user_id uuid DEFAULT NULL::uuid, p_org_id uuid DEFAULT NULL::uuid, p_environment feature_flag_environment DEFAULT NULL::feature_flag_environment)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_key TEXT;
  v_resolved JSONB;
BEGIN
  -- Resolve each flag key
  FOREACH v_key IN ARRAY p_feature_keys
  LOOP
    v_resolved := resolve_feature_flag(v_key, p_user_id, p_org_id, p_environment);
    IF v_resolved IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(v_key, v_resolved);
    END IF;
  END LOOP;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- On any error, return partial results
    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.review_join_request(p_request_id uuid, p_approve boolean, p_decision_reason text DEFAULT NULL::text)
 RETURNS TABLE(request_id uuid, status join_request_status, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_current_user UUID := auth.uid();
  v_new_status join_request_status;
BEGIN
  SELECT *
  INTO v_request
  FROM join_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;

  IF v_request IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Request not found';
    RETURN;
  END IF;

  IF NOT (user_is_org_admin(v_current_user, v_request.organization_id) OR is_platform_admin(v_current_user)) THEN
    RETURN QUERY SELECT p_request_id, 'denied', 'Unauthorized';
    RETURN;
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN QUERY SELECT p_request_id, v_request.status, 'Request already reviewed';
    RETURN;
  END IF;

  IF p_approve THEN
    INSERT INTO team_memberships (child_id, team_id, season_id, status)
    VALUES (v_request.child_id, v_request.team_id, v_request.season_id, 'active')
    ON CONFLICT (child_id, team_id, season_id) DO NOTHING;

    INSERT INTO child_guardians (child_id, user_id, organization_id, status)
    VALUES (v_request.child_id, v_request.requested_by_user_id, v_request.organization_id, 'active')
    ON CONFLICT (child_id, user_id, organization_id)
    DO UPDATE SET status = 'active', updated_at = NOW();

    PERFORM add_org_role(v_request.requested_by_user_id, v_request.organization_id, 'parent');

    v_new_status := 'approved';
  ELSE
    v_new_status := 'denied';
  END IF;

  UPDATE join_requests
  SET status = v_new_status,
      reviewed_by_user_id = v_current_user,
      reviewed_at = NOW(),
      decision_reason = p_decision_reason
  WHERE id = p_request_id;

  RETURN QUERY SELECT p_request_id, v_new_status, 'Review processed';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_organization_invite(p_invite_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_org_id UUID;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Get the org_id of the invite
  SELECT organization_id INTO v_org_id
  FROM organization_invites
  WHERE id = p_invite_id AND accepted_at IS NULL;
  
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permissions
  IF NOT (user_is_org_admin(v_current_user_id, v_org_id) OR is_platform_admin(v_current_user_id)) THEN
    RAISE EXCEPTION 'Only organization admins can revoke invites';
  END IF;
  
  -- Delete the invite
  DELETE FROM organization_invites WHERE id = p_invite_id;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sanitize_metadata(p_metadata jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  sanitized JSONB := '{}'::JSONB;
  key TEXT;
  value JSONB;
  lower_key TEXT;
  sensitive_keys TEXT[] := ARRAY['password', 'token', 'secret', 'api_key', 'stripe_id', 'stripe_secret', 'access_token', 'refresh_token'];
BEGIN
  -- If metadata is null or empty, return empty object
  IF p_metadata IS NULL OR p_metadata = '{}'::JSONB THEN
    RETURN '{}'::JSONB;
  END IF;

  -- Iterate through all keys
  FOR key, value IN SELECT * FROM jsonb_each(p_metadata)
  LOOP
    lower_key := lower(key);
    
    -- Check if key contains any sensitive terms
    IF EXISTS (
      SELECT 1 FROM unnest(sensitive_keys) AS sk 
      WHERE lower_key LIKE '%' || sk || '%'
    ) THEN
      -- Redact sensitive values
      sanitized := sanitized || jsonb_build_object(key, '[REDACTED]');
    ELSE
      -- Keep non-sensitive values
      sanitized := sanitized || jsonb_build_object(key, value);
    END IF;
  END LOOP;

  RETURN sanitized;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_rsvp_responded_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If status is changing from unknown to something else, set responded_at
  IF OLD.status = 'unknown' AND NEW.status != 'unknown' AND NEW.responded_at IS NULL THEN
    NEW.responded_at := NOW();
    NEW.responded_by_user_id := auth.uid();
  END IF;
  
  -- If status is changing back to unknown, clear responded_at
  IF NEW.status = 'unknown' THEN
    NEW.responded_at := NULL;
    NEW.responded_by_user_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_travel_override(p_event_id uuid, p_is_travel boolean, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update override
  UPDATE events
  SET travel_override = jsonb_build_object(
    'is_travel', p_is_travel,
    'reason', COALESCE(p_reason, 'No reason provided'),
    'overridden_by', auth.uid(),
    'overridden_at', now()
  )
  WHERE id = p_event_id;
  
  -- Log override action to event_logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_logs') THEN
    INSERT INTO event_logs (
      category, event_type, actor_user_id, org_id, target_entity_type, target_entity_id, metadata
    )
    SELECT 
      'TRAVEL',
      'TRAVEL_OVERRIDE_SET',
      auth.uid(),
      t.org_id,
      'event',
      p_event_id,
      jsonb_build_object(
        'is_travel', p_is_travel,
        'reason', p_reason,
        'computed_value', is_travel_event(p_event_id)
      )
    FROM events e
    JOIN teams t ON t.id = e.team_id
    WHERE e.id = p_event_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.staff_can_access_team(check_user_id uuid, check_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.id = check_team_id
      AND (
        -- Platform admins can access all orgs
        is_platform_admin(check_user_id)
        OR
        -- Org admins/coaches for the team's org can access
        user_has_org_role(check_user_id, t.org_id, 'org_admin')
        OR
        user_has_org_role(check_user_id, t.org_id, 'coach')
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.submit_join_request(p_link_token text, p_child_id uuid, p_season_id uuid, p_team_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(request_id uuid, status join_request_status, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_link RECORD;
  v_current_user UUID := auth.uid();
  v_target_team UUID;
  v_status join_request_status;
  v_request_id UUID;
BEGIN
  IF v_current_user IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Login required';
    RETURN;
  END IF;

  SELECT
    id,
    organization_id,
    team_id,
    auto_approve,
    expires_at
  INTO v_link
  FROM join_links
  WHERE token = p_link_token
  FOR UPDATE NOWAIT;

  IF v_link IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Invalid join link';
    RETURN;
  END IF;

  IF v_link.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'Join link expired';
    RETURN;
  END IF;

  v_target_team := COALESCE(v_link.team_id, p_team_id);
  IF v_target_team IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'denied', 'No team selected';
    RETURN;
  END IF;

  v_status := CASE WHEN v_link.auto_approve THEN 'approved' ELSE 'pending' END;

  INSERT INTO join_requests (
    organization_id,
    team_id,
    season_id,
    child_id,
    requested_by_user_id,
    join_link_id,
    status
  ) VALUES (
    v_link.organization_id,
    v_target_team,
    p_season_id,
    p_child_id,
    v_current_user,
    v_link.id,
    v_status
  )
  RETURNING id INTO v_request_id;

  IF v_link.auto_approve THEN
    INSERT INTO team_memberships (child_id, team_id, season_id, status)
    VALUES (p_child_id, v_target_team, p_season_id, 'active')
    ON CONFLICT (child_id, team_id, season_id) DO NOTHING;

    INSERT INTO child_guardians (child_id, user_id, organization_id, status)
    VALUES (p_child_id, v_current_user, v_link.organization_id, 'active')
    ON CONFLICT (child_id, user_id, organization_id)
    DO UPDATE SET status = 'active', updated_at = NOW();

    PERFORM add_org_role(v_current_user, v_link.organization_id, 'parent');
  END IF;

  RETURN QUERY SELECT v_request_id, v_status, 'Join request submitted';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_uniform_sizes(p_kit_id uuid, p_child_id uuid, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_season_id UUID;
  v_deadline_at TIMESTAMPTZ;
  v_locked_at TIMESTAMPTZ;
  v_submission_id UUID;
  v_item JSONB;
  v_item_id UUID;
  v_size TEXT;
  v_missing_required_count INT;
BEGIN
  -- Validate kit
  SELECT team_id, season_id, deadline_at, locked_at
  INTO v_team_id, v_season_id, v_deadline_at, v_locked_at
  FROM uniform_kits
  WHERE id = p_kit_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Kit not found';
  END IF;

  -- AuthZ: must be parent/guardian of child and on the kit's team/season
  IF NOT is_parent_of_child(auth.uid(), p_child_id) THEN
    RAISE EXCEPTION 'Not authorized for this child';
  END IF;

  IF NOT parent_can_access_team_via_membership(auth.uid(), v_team_id, v_season_id) THEN
    RAISE EXCEPTION 'Not authorized for this team/season';
  END IF;

  -- Lock/deadline enforcement
  IF v_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Submissions are locked';
  END IF;

  IF v_deadline_at IS NOT NULL AND NOW() > v_deadline_at THEN
    RAISE EXCEPTION 'Deadline has passed';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a JSON array';
  END IF;

  -- Validate required items are present in payload
  SELECT COUNT(*) INTO v_missing_required_count
  FROM uniform_kit_items ki
  WHERE ki.kit_id = p_kit_id
    AND ki.required = true
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_items) e
      WHERE (e->>'item_id')::uuid = ki.id
    );

  IF v_missing_required_count > 0 THEN
    RAISE EXCEPTION 'Missing required item sizes';
  END IF;

  -- Upsert submission (idempotent per kit+child)
  INSERT INTO uniform_submissions (kit_id, child_id, status, submitted_at)
  VALUES (p_kit_id, p_child_id, 'submitted', NOW())
  ON CONFLICT (kit_id, child_id)
  DO UPDATE SET
    status = 'submitted',
    submitted_at = COALESCE(uniform_submissions.submitted_at, NOW()),
    updated_at = NOW()
  RETURNING id INTO v_submission_id;

  -- Upsert each item size (with validation against kit + size options)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'item_id')::uuid;
    v_size := NULLIF(trim(COALESCE(v_item->>'size', '')), '');

    IF v_item_id IS NULL OR v_size IS NULL THEN
      RAISE EXCEPTION 'Each item requires item_id and size';
    END IF;

    -- Validate item belongs to kit
    IF NOT EXISTS (
      SELECT 1
      FROM uniform_kit_items ki
      WHERE ki.id = v_item_id
        AND ki.kit_id = p_kit_id
    ) THEN
      RAISE EXCEPTION 'Invalid item for kit';
    END IF;

    -- Validate size is in size_options if size_options is non-empty
    IF EXISTS (
      SELECT 1
      FROM uniform_kit_items ki
      WHERE ki.id = v_item_id
        AND ki.kit_id = p_kit_id
        AND jsonb_typeof(ki.size_options) = 'array'
        AND jsonb_array_length(ki.size_options) > 0
        AND NOT (ki.size_options ? v_size)
    ) THEN
      RAISE EXCEPTION 'Invalid size for item';
    END IF;

    INSERT INTO uniform_submission_items (submission_id, item_id, size)
    VALUES (v_submission_id, v_item_id, v_size)
    ON CONFLICT (submission_id, item_id)
    DO UPDATE SET
      size = EXCLUDED.size,
      updated_at = NOW();
  END LOOP;

  RETURN v_submission_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_org_license_summary(org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  lic record;
begin
  select * into lic from org_licenses where organization_id = org_id;

  if lic is null then
    return;
  end if;

  update organizations
    set
      license_status = lic.status,
      license_plan = lic.plan,
      license_current_period_start = lic.current_period_start,
      license_current_period_end = lic.current_period_end,
      license_trial_ends_at = lic.trial_ends_at,
      license_grace_ends_at = lic.grace_ends_at,
      license_cancel_at_period_end = lic.cancel_at_period_end,
      stripe_customer_id = lic.stripe_customer_id,
      stripe_subscription_id = lic.stripe_subscription_id,
      stripe_price_id = lic.stripe_price_id,
      updated_at = now()
  where id = org_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_rsvp_to_attendance(p_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert or update attendance records based on RSVP status
  INSERT INTO attendance (event_id, child_id, status, note)
  SELECT 
    r.event_id,
    r.child_id,
    CASE 
      WHEN r.status = 'going' THEN 'going'::attendance_status
      WHEN r.status = 'late' THEN 'late'::attendance_status
      WHEN r.status = 'not_going' THEN 'not_going'::attendance_status
      ELSE 'going'::attendance_status -- Default to going for unknown
    END,
    r.note
  FROM event_rsvps r
  WHERE r.event_id = p_event_id
  AND r.status != 'unknown'
  ON CONFLICT (event_id, child_id) DO UPDATE
  SET 
    status = EXCLUDED.status,
    note = EXCLUDED.note,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_sync_org_license_summary()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform sync_org_license_summary(new.organization_id);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_fee_assignment_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_fee_assignment_id uuid;
  v_amount integer;
  v_paid integer;
  v_waived integer;
  v_scholarship integer;
  v_discount integer;
  v_late integer;
  v_balance integer;
begin
  v_fee_assignment_id := coalesce(new.fee_assignment_id, old.fee_assignment_id);
  if v_fee_assignment_id is null then
    return null;
  end if;

  select amount_cents, waived_cents_total, scholarship_cents_total, discount_cents_total, late_fee_cents_applied
    into v_amount, v_waived, v_scholarship, v_discount, v_late
    from fee_assignments
    where id = v_fee_assignment_id
    for update;

  select coalesce(sum(amount_cents), 0)
    into v_paid
    from payment_allocations
    where fee_assignment_id = v_fee_assignment_id;

  v_balance := v_amount + coalesce(v_late, 0) - v_paid - v_waived - v_scholarship + v_discount;

  if v_balance < 0 then
    raise exception 'fee_assignment % would have negative balance (%).', v_fee_assignment_id, v_balance;
  end if;

  update fee_assignments
    set
      paid_cents_total = v_paid,
      balance_cents = v_balance,
      status = case
        when status in ('waived', 'refunded', 'offline_recorded', 'scholarship_applied') then status
        when v_balance = 0 then 'paid'
        when v_paid > 0 then 'partial'
        else 'unpaid'
      end,
      updated_at = now()
  where id = v_fee_assignment_id;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_org_licenses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_can_access_athlete(p_athlete_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.user_id = p_user_id
      AND ag.status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_all_org_roles(check_user_id uuid, check_org_id uuid, check_roles org_member_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    is_platform_admin(check_user_id) OR
    NOT EXISTS (
      SELECT 1 FROM UNNEST(check_roles) AS missing(role)
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = check_user_id
          AND organization_id = check_org_id
          AND role = missing.role
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_any_org_roles(check_user_id uuid, check_org_id uuid, check_roles org_member_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = check_user_id
        AND organization_id = check_org_id
        AND role = ANY(check_roles)
    );
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_org_access(check_user_id uuid, check_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = check_user_id 
      AND organization_id = check_org_id
    );
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_org_role(check_user_id uuid, check_org_id uuid, check_role org_member_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = check_user_id 
      AND organization_id = check_org_id
      AND role = check_role
    );
$function$
;

CREATE OR REPLACE FUNCTION public.user_is_guardian_of_child(check_user_id uuid, check_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    WHERE ag.user_id = check_user_id
      AND ag.athlete_id = check_child_id
      AND ag.status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(check_user_id uuid, check_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT user_has_org_role(check_user_id, check_org_id, 'org_admin');
$function$
;

CREATE OR REPLACE FUNCTION public.validate_event_type(p_category event_category, p_event_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM valid_event_types
    WHERE category = p_category
    AND event_type = p_event_type
  );
$function$
;

CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))
 RETURNS SETOF realtime.wal_rls
 LANGUAGE plpgsql
AS $function$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$function$
;

CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$function$
;

CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])
 RETURNS text
 LANGUAGE sql
AS $function$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $function$
;

CREATE OR REPLACE FUNCTION realtime."cast"(val text, type_ regtype)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $function$
;

CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $function$
;

CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $function$
;

CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)
 RETURNS SETOF realtime.wal_rls
 LANGUAGE sql
 SET log_min_messages TO 'fatal'
AS $function$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $function$
;

CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $function$
;

CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $function$
;

CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)
 RETURNS regrole
 LANGUAGE sql
 IMMUTABLE
AS $function$ select role_name::regrole $function$
;

CREATE OR REPLACE FUNCTION realtime.topic()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select nullif(current_setting('realtime.topic', true), '')::text;
$function$
;

CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$
;

CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.delete_prefix_hierarchy_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$
;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.get_level(name text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT array_length(string_to_array("name", '/'), 1);
$function$
;

CREATE OR REPLACE FUNCTION storage.get_prefix(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$function$
;

CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$
;

CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.objects_delete_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.objects_insert_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.objects_update_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.objects_update_level_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.objects_update_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.prefixes_delete_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.prefixes_insert_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$function$
;

CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$
;

CREATE OR REPLACE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$
;

CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$
;

CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$
;

CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$
;

CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$
;

CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  rec record;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (
    new_secret,
    new_name,
    new_description
  )
  RETURNING * INTO rec;
  UPDATE vault.secrets s
  SET secret = encode(vault._crypto_aead_det_encrypt(
    message := convert_to(rec.secret, 'utf8'),
    additional := convert_to(s.id::text, 'utf8'),
    key_id := 0,
    context := 'pgsodium'::bytea,
    nonce := rec.nonce
  ), 'base64')
  WHERE id = rec.id;
  RETURN rec.id;
END
$function$
;

CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);
BEGIN
  UPDATE vault.secrets s
  SET
    secret = CASE WHEN new_secret IS NULL THEN s.secret
                  ELSE encode(vault._crypto_aead_det_encrypt(
                    message := convert_to(new_secret, 'utf8'),
                    additional := convert_to(s.id::text, 'utf8'),
                    key_id := 0,
                    context := 'pgsodium'::bytea,
                    nonce := s.nonce
                  ), 'base64') END,
    name = coalesce(new_name, s.name),
    description = coalesce(new_description, s.description),
    updated_at = now()
  WHERE s.id = secret_id;
END
$function$
;

-- VIEWS
CREATE OR REPLACE VIEW "extensions"."pg_stat_statements" AS null;

CREATE OR REPLACE VIEW "extensions"."pg_stat_statements_info" AS null;

-- TRIGGERS
-- RLS POLICIES
-- Policy: Staff can create announcements on public.announcements
-- Command: INSERT, Roles: {public}
-- With Check: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = announcements.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))

-- Policy: Team members can view announcements on public.announcements
-- Command: SELECT, Roles: {public}
-- Using: ((EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = announcements.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id)))) OR (EXISTS ( SELECT 1
   FROM ((users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
     JOIN team_memberships tm ON ((tm.athlete_id = c.id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (tm.team_id = announcements.team_id) AND (tm.status = 'active'::membership_status)))))

-- Policy: Org admins can view org guardians on public.athlete_guardians
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (team_memberships tm
     JOIN teams t ON ((t.id = tm.team_id)))
  WHERE ((tm.athlete_id = athlete_guardians.athlete_id) AND user_has_any_org_roles(auth.uid(), t.org_id, ARRAY['org_admin'::org_member_role]))))

-- Policy: Platform admins can view all guardians on public.athlete_guardians
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Users can view own guardian relationships on public.athlete_guardians
-- Command: SELECT, Roles: {public}
-- Using: (auth.uid() = user_id)

-- Policy: Org admins can create imports on public.athlete_imports
-- Command: INSERT, Roles: {public}
-- With Check: user_is_org_admin(auth.uid(), org_id)

-- Policy: Org admins can update their org imports on public.athlete_imports
-- Command: UPDATE, Roles: {public}
-- Using: user_is_org_admin(auth.uid(), org_id)

-- Policy: Org admins can view their org imports on public.athlete_imports
-- Command: SELECT, Roles: {public}
-- Using: user_is_org_admin(auth.uid(), org_id)

-- Policy: Coaches can view org team children on public.athletes
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (team_memberships tm
     JOIN teams t ON ((t.id = tm.team_id)))
  WHERE ((tm.athlete_id = athletes.id) AND user_has_any_org_roles(auth.uid(), t.org_id, ARRAY['coach'::org_member_role, 'org_admin'::org_member_role]))))

-- Policy: Guardians can manage their children on public.athletes
-- Command: ALL, Roles: {public}
-- Using: user_is_guardian_of_child(auth.uid(), id)
-- With Check: user_is_guardian_of_child(auth.uid(), id)

-- Policy: Org admins can manage org children on public.athletes
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (team_memberships tm
     JOIN teams t ON ((t.id = tm.team_id)))
  WHERE ((tm.athlete_id = athletes.id) AND user_has_any_org_roles(auth.uid(), t.org_id, ARRAY['org_admin'::org_member_role]))))

-- Policy: Org admins can view org children on public.athletes
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (team_memberships tm
     JOIN teams t ON ((t.id = tm.team_id)))
  WHERE ((tm.athlete_id = athletes.id) AND user_has_any_org_roles(auth.uid(), t.org_id, ARRAY['org_admin'::org_member_role]))))

-- Policy: Admins can manage attendance on public.attendance
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     JOIN events e ON ((e.id = attendance.event_id)))
     JOIN teams t ON ((t.id = e.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Coaches can view attendance on public.attendance
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     JOIN events e ON ((e.id = attendance.event_id)))
     JOIN teams t ON ((t.id = e.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Guardians can manage their children attendance on public.attendance
-- Command: ALL, Roles: {public}
-- Using: user_is_guardian_of_child(auth.uid(), athlete_id)
-- With Check: user_is_guardian_of_child(auth.uid(), athlete_id)

-- Policy: Everyone can view settings on public.attendance_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid())))

-- Policy: Org admins can manage changes on public.attendance_settings
-- Command: ALL, Roles: {public}
-- Using: (org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'org_admin'::org_member_role))))

-- Policy: Deny delete on audit logs on public.audit_logs_old
-- Command: DELETE, Roles: {public}
-- Using: false

-- Policy: Deny update on audit logs on public.audit_logs_old
-- Command: UPDATE, Roles: {public}
-- Using: false

-- Policy: Platform admins can insert audit logs on public.audit_logs_old
-- Command: INSERT, Roles: {public}
-- With Check: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Platform admins can view audit logs on public.audit_logs_old
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Admins can manage charges on public.charges
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = charges.organization_id))))

-- Policy: Parents can view their charges on public.charges
-- Command: SELECT, Roles: {public}
-- Using: ((EXISTS ( SELECT 1
   FROM (users u
     JOIN fee_assignments fa ON ((fa.id = charges.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = fa.parent_id)))) OR ((fee_assignment_id IS NULL) AND (EXISTS ( SELECT 1
   FROM (users u
     JOIN fees f ON ((f.id = charges.fee_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.org_id = f.organization_id))))))

-- Policy: Admins can view checkout session items on public.checkout_session_items
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN checkout_sessions cs ON ((cs.id = checkout_session_items.checkout_session_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = cs.organization_id))))

-- Policy: Parents can view their checkout session items on public.checkout_session_items
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN checkout_sessions cs ON ((cs.id = checkout_session_items.checkout_session_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = cs.parent_id))))

-- Policy: Admins can view checkout sessions on public.checkout_sessions
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = checkout_sessions.organization_id))))

-- Policy: Parents can manage their checkout sessions on public.checkout_sessions
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.id = checkout_sessions.parent_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.id = checkout_sessions.parent_id))))

-- Policy: Anyone can view active claim tokens on public.child_claim_tokens
-- Command: SELECT, Roles: {public}
-- Using: ((used_at IS NULL) AND (expires_at > now()))

-- Policy: Org admins can view claim tokens on public.child_claim_tokens
-- Command: SELECT, Roles: {public}
-- Using: user_has_any_org_roles(auth.uid(), organization_id, ARRAY['org_admin'::org_member_role])

-- Policy: Platform admins can view all claim tokens on public.child_claim_tokens
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Admins can manage discount codes on public.discount_codes
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = discount_codes.organization_id))))

-- Policy: Coaches can view discount codes on public.discount_codes
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'coach'::user_role) AND (users.org_id = discount_codes.organization_id))))

-- Policy: Parents can view active discount codes on public.discount_codes
-- Command: SELECT, Roles: {public}
-- Using: ((status = 'active'::discount_code_status) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.org_id = discount_codes.organization_id)))))

-- Policy: Admins can view discount redemptions on public.discount_redemptions
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN discount_codes dc ON ((dc.id = discount_redemptions.discount_code_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = dc.organization_id))))

-- Policy: Parents can view their discount redemptions on public.discount_redemptions
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.id = discount_redemptions.redeemed_by_parent_id))))

-- Policy: Coaches can manage attendance for their teams on public.event_attendance
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (events e
     JOIN teams t ON ((t.id = e.team_id)))
  WHERE ((e.id = event_attendance.event_id) AND (t.org_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'coach'::org_member_role)))))))

-- Policy: Org admins can manage attendance on public.event_attendance
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (events e
     JOIN teams t ON ((t.id = e.team_id)))
  WHERE ((e.id = event_attendance.event_id) AND (t.org_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'org_admin'::org_member_role)))))))

-- Policy: Parents can view attendance for their children on public.event_attendance
-- Command: SELECT, Roles: {public}
-- Using: (child_id IN ( SELECT athletes.id
   FROM athletes
  WHERE (athletes.family_id IN ( SELECT family_members.family_id
           FROM family_members
          WHERE (family_members.user_id = auth.uid())))))

-- Policy: Staff can view event history on public.event_change_history
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((events e
     JOIN teams t ON ((t.id = e.team_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((e.id = event_change_history.event_id) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))

-- Policy: System can insert history on public.event_change_history
-- Command: INSERT, Roles: {public}
-- With Check: true

-- Policy: Admins can manage event locations on public.event_locations
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((events e
     JOIN teams t ON ((t.id = e.team_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((e.id = event_locations.event_id) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Users can view event locations on public.event_locations
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM events
  WHERE (events.id = event_locations.event_id)))

-- Policy: Authenticated users can insert event logs on public.event_logs
-- Command: INSERT, Roles: {public}
-- With Check: (auth.role() = 'authenticated'::text)

-- Policy: Deny delete on event logs on public.event_logs
-- Command: DELETE, Roles: {public}
-- Using: false

-- Policy: Deny update on event logs on public.event_logs
-- Command: UPDATE, Roles: {public}
-- Using: false

-- Policy: Platform admins can view all event logs on public.event_logs
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Parents can manage their children's RSVPs on public.event_rsvps
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (c.id = event_rsvps.child_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM (users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (c.id = event_rsvps.child_id))))

-- Policy: Staff can update event RSVPs on public.event_rsvps
-- Command: UPDATE, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((events e
     JOIN teams t ON ((t.id = e.team_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((e.id = event_rsvps.event_id) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))

-- Policy: Staff can view event RSVPs on public.event_rsvps
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((events e
     JOIN teams t ON ((t.id = e.team_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((e.id = event_rsvps.event_id) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))

-- Policy: Admins can manage events on public.events
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = events.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Coaches can view events on public.events
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = events.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Guardians can view their children events on public.events
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM team_memberships tm
  WHERE ((tm.team_id = events.team_id) AND (tm.status = 'active'::membership_status) AND user_is_guardian_of_child(auth.uid(), tm.athlete_id))))

-- Policy: Admins can manage families on public.families
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = families.org_id))))

-- Policy: Coaches can view families on public.families
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'coach'::user_role) AND (users.org_id = families.org_id))))

-- Policy: Parents can update their family on public.families
-- Command: UPDATE, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.family_id = families.id) AND (users.role = 'parent'::user_role))))

-- Policy: Parents can view their family on public.families
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.family_id = families.id))))

-- Policy: Users can create families during signup on public.families
-- Command: INSERT, Roles: {public}
-- With Check: true

-- Policy: Users can view their own family memberships on public.family_members
-- Command: SELECT, Roles: {public}
-- Using: (user_id = auth.uid())

-- Policy: Deny delete on audit log on public.feature_flag_audit_log
-- Command: DELETE, Roles: {public}
-- Using: false

-- Policy: Deny update on audit log on public.feature_flag_audit_log
-- Command: UPDATE, Roles: {public}
-- Using: false

-- Policy: Platform admins can insert audit log on public.feature_flag_audit_log
-- Command: INSERT, Roles: {public}
-- With Check: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Platform admins can view audit log on public.feature_flag_audit_log
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Org admins can view org overrides on public.feature_flag_org_overrides
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.organization_id = feature_flag_org_overrides.org_id) AND (om.role = 'org_admin'::org_member_role))))

-- Policy: Platform admins can manage org overrides on public.feature_flag_org_overrides
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Platform admins can manage platform defaults on public.feature_flag_platform_defaults
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Platform admins can manage user overrides on public.feature_flag_user_overrides
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Users can view own overrides on public.feature_flag_user_overrides
-- Command: SELECT, Roles: {public}
-- Using: (auth.uid() = user_id)

-- Policy: Org admins can view org feature flags on public.feature_flags
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (organization_members om
     JOIN feature_flag_org_overrides ffo ON ((ffo.org_id = om.organization_id)))
  WHERE ((om.user_id = auth.uid()) AND (om.role = 'org_admin'::org_member_role) AND (ffo.feature_flag_id = feature_flags.id))))

-- Policy: Org admins can view own feature flags on public.feature_flags
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.organization_id = feature_flags.organization_id) AND (om.role = 'org_admin'::org_member_role))))

-- Policy: Platform admins can manage feature flags on public.feature_flags
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Platform admins can view feature flags on public.feature_flags
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE (pa.user_id = auth.uid())))

-- Policy: Admins can manage fee assignments on public.fee_assignments
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = fee_assignments.organization_id))))

-- Policy: Coaches can view fee assignment status on public.fee_assignments
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     JOIN athletes c ON ((c.id = fee_assignments.child_id)))
     JOIN families f ON ((f.id = c.family_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (u.org_id = f.org_id))))

-- Policy: Parents can view their fee assignments on public.fee_assignments
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.id = fee_assignments.parent_id))))

-- Policy: Admins can manage fees on public.fees
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = fees.organization_id))))

-- Policy: Coaches can view published fees on public.fees
-- Command: SELECT, Roles: {public}
-- Using: ((status = ANY (ARRAY['published'::fee_status, 'closed'::fee_status])) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'coach'::user_role) AND (users.org_id = fees.organization_id)))))

-- Policy: Parents can view published fees on public.fees
-- Command: SELECT, Roles: {public}
-- Using: ((status = ANY (ARRAY['published'::fee_status, 'closed'::fee_status])) AND ((visibility = 'all_parents'::fee_visibility) OR (EXISTS ( SELECT 1
   FROM ((users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
     JOIN fee_assignments fa ON ((fa.child_id = c.id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (fa.fee_id = fees.id))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.org_id = fees.organization_id)))))

-- Policy: org_admins_can_create_fees_if_license_active on public.fees
-- Command: INSERT, Roles: {authenticated}
-- With Check: (user_has_org_role(auth.uid(), organization_id, 'org_admin'::org_member_role) AND is_org_license_active(organization_id))

-- Policy: Admins can manage installment plans on public.installment_plans
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = installment_plans.organization_id))))

-- Policy: Users can view installment plans on public.installment_plans
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.org_id = installment_plans.organization_id))))

-- Policy: Admins can manage installment schedules on public.installment_schedules
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN fee_assignments fa ON ((fa.id = installment_schedules.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = fa.organization_id))))

-- Policy: Parents can view their installment schedules on public.installment_schedules
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN fee_assignments fa ON ((fa.id = installment_schedules.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = fa.parent_id))))

-- Policy: Admins can manage installments on public.installments
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     JOIN installment_schedules isch ON ((isch.id = installments.installment_schedule_id)))
     JOIN fee_assignments fa ON ((fa.id = isch.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = fa.organization_id))))

-- Policy: Parents can view their installments on public.installments
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     JOIN installment_schedules isch ON ((isch.id = installments.installment_schedule_id)))
     JOIN fee_assignments fa ON ((fa.id = isch.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = fa.parent_id))))

-- Policy: Anyone can view active join links on public.join_links
-- Command: SELECT, Roles: {public}
-- Using: (expires_at > now())

-- Policy: Org admins can view org join links on public.join_links
-- Command: SELECT, Roles: {public}
-- Using: user_has_any_org_roles(auth.uid(), organization_id, ARRAY['org_admin'::org_member_role])

-- Policy: Platform admins can view all join links on public.join_links
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Authenticated users can submit join requests on public.join_requests
-- Command: INSERT, Roles: {public}
-- With Check: (auth.uid() = requested_by_user_id)

-- Policy: Org admins can view org join requests on public.join_requests
-- Command: SELECT, Roles: {public}
-- Using: user_has_any_org_roles(auth.uid(), organization_id, ARRAY['org_admin'::org_member_role])

-- Policy: Platform admins can view all join requests on public.join_requests
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Users can view own join requests on public.join_requests
-- Command: SELECT, Roles: {public}
-- Using: (auth.uid() = requested_by_user_id)

-- Policy: Team members can send messages on public.messages
-- Command: INSERT, Roles: {public}
-- With Check: ((EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = messages.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id)))) OR (EXISTS ( SELECT 1
   FROM ((users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
     JOIN team_memberships tm ON ((tm.athlete_id = c.id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (tm.team_id = messages.team_id) AND (tm.status = 'active'::membership_status)))))

-- Policy: Team members can view messages on public.messages
-- Command: SELECT, Roles: {public}
-- Using: ((EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = messages.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id)))) OR (EXISTS ( SELECT 1
   FROM ((users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
     JOIN team_memberships tm ON ((tm.athlete_id = c.id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (tm.team_id = messages.team_id) AND (tm.status = 'active'::membership_status)))))

-- Policy: Admins can view offline payment allocations on public.offline_payment_allocations
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN offline_payments op ON ((op.id = offline_payment_allocations.offline_payment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = op.organization_id))))

-- Policy: Parents can view their offline payment allocations on public.offline_payment_allocations
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN offline_payments op ON ((op.id = offline_payment_allocations.offline_payment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = op.parent_id))))

-- Policy: Admins can manage offline payments on public.offline_payments
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = offline_payments.organization_id))))

-- Policy: Parents can view their offline payments on public.offline_payments
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.id = offline_payments.parent_id))))

-- Policy: Admins can manage payment policies on public.org_payment_policies
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = org_payment_policies.organization_id))))

-- Policy: Users can view payment policies on public.org_payment_policies
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.org_id = org_payment_policies.organization_id))))

-- Policy: organization_advanced_settings_insert on public.organization_advanced_settings
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_advanced_settings_select on public.organization_advanced_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_advanced_settings_update on public.organization_advanced_settings
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_attendance_settings_insert on public.organization_attendance_settings
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_attendance_settings_select on public.organization_attendance_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_attendance_settings_update on public.organization_attendance_settings
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_defaults_insert on public.organization_defaults
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_defaults_select on public.organization_defaults
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_defaults_update on public.organization_defaults
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: Anyone can view invite by token on public.organization_invites
-- Command: SELECT, Roles: {public}
-- Using: ((accepted_at IS NULL) AND (expires_at > now()))

-- Policy: Org admins can create invites on public.organization_invites
-- Command: INSERT, Roles: {public}
-- With Check: user_is_org_admin(auth.uid(), organization_id)

-- Policy: Org admins can delete org invites on public.organization_invites
-- Command: DELETE, Roles: {public}
-- Using: user_is_org_admin(auth.uid(), organization_id)

-- Policy: Org admins can view org invites on public.organization_invites
-- Command: SELECT, Roles: {public}
-- Using: user_is_org_admin(auth.uid(), organization_id)

-- Policy: Platform admins can create all invites on public.organization_invites
-- Command: INSERT, Roles: {public}
-- With Check: is_platform_admin(auth.uid())

-- Policy: Platform admins can delete all invites on public.organization_invites
-- Command: DELETE, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Platform admins can view all invites on public.organization_invites
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Org admins can delete org memberships on public.organization_members
-- Command: DELETE, Roles: {public}
-- Using: (user_is_org_admin(auth.uid(), organization_id) AND (role <> 'org_admin'::org_member_role) AND (user_id <> auth.uid()))

-- Policy: Org admins can manage org memberships on public.organization_members
-- Command: INSERT, Roles: {public}
-- With Check: (user_is_org_admin(auth.uid(), organization_id) AND (role <> 'org_admin'::org_member_role))

-- Policy: Org admins can update org memberships on public.organization_members
-- Command: UPDATE, Roles: {public}
-- Using: (user_is_org_admin(auth.uid(), organization_id) AND (role <> 'org_admin'::org_member_role))

-- Policy: Org admins can view org memberships on public.organization_members
-- Command: SELECT, Roles: {public}
-- Using: user_is_org_admin(auth.uid(), organization_id)

-- Policy: Platform admins can manage all memberships on public.organization_members
-- Command: ALL, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Platform admins can view all memberships on public.organization_members
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Users can view own memberships on public.organization_members
-- Command: SELECT, Roles: {public}
-- Using: (auth.uid() = user_id)

-- Policy: organization_notification_settings_insert on public.organization_notification_settings
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_notification_settings_select on public.organization_notification_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_notification_settings_update on public.organization_notification_settings
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_registration_settings_insert on public.organization_registration_settings
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_registration_settings_select on public.organization_registration_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_registration_settings_update on public.organization_registration_settings
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_settings_insert on public.organization_settings
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_settings_select on public.organization_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_settings_update on public.organization_settings
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: Org admins can link system sports on public.organization_sports
-- Command: INSERT, Roles: {public}
-- With Check: ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'org_admin'::org_member_role)))) AND (sport_id IN ( SELECT sports.id
   FROM sports
  WHERE (sports.is_system = true))))

-- Policy: Org admins can unlink sports on public.organization_sports
-- Command: DELETE, Roles: {public}
-- Using: (organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'org_admin'::org_member_role))))

-- Policy: Org members can view organization sports on public.organization_sports
-- Command: SELECT, Roles: {public}
-- Using: (organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid())))

-- Policy: organization_visibility_settings_insert on public.organization_visibility_settings
-- Command: INSERT, Roles: {public}
-- With Check: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: organization_visibility_settings_select on public.organization_visibility_settings
-- Command: SELECT, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.id = auth.uid())))

-- Policy: organization_visibility_settings_update on public.organization_visibility_settings
-- Command: UPDATE, Roles: {public}
-- Using: (org_id IN ( SELECT users.org_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))

-- Policy: Anyone can create organizations on public.organizations
-- Command: INSERT, Roles: {authenticated}
-- With Check: true

-- Policy: Members can view their orgs on public.organizations
-- Command: SELECT, Roles: {authenticated}
-- Using: (EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = organizations.id))))

-- Policy: Org admins can update their org on public.organizations
-- Command: UPDATE, Roles: {authenticated}
-- Using: user_is_org_admin(auth.uid(), id)
-- With Check: user_is_org_admin(auth.uid(), id)

-- Policy: Platform admins can view all orgs on public.organizations
-- Command: SELECT, Roles: {authenticated}
-- Using: is_platform_admin(auth.uid())

-- Policy: Platform admins full access on public.organizations
-- Command: ALL, Roles: {authenticated}
-- Using: is_platform_admin(auth.uid())
-- With Check: is_platform_admin(auth.uid())

-- Policy: Org admins can view parent invites on public.parent_invites
-- Command: SELECT, Roles: {public}
-- Using: user_has_any_org_roles(auth.uid(), organization_id, ARRAY['org_admin'::org_member_role])

-- Policy: Platform admins can view all parent invites on public.parent_invites
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Users can view their pending invites on public.parent_invites
-- Command: SELECT, Roles: {public}
-- Using: ((lower(email) = lower(( SELECT users.email
   FROM users
  WHERE (users.id = auth.uid())))) AND (status = 'pending'::parent_invite_status) AND (expires_at > now()))

-- Policy: Admins can view payment allocations on public.payment_allocations
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN payments p ON ((p.id = payment_allocations.payment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = p.organization_id))))

-- Policy: Parents can view their payment allocations on public.payment_allocations
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN payments p ON ((p.id = payment_allocations.payment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = p.parent_id))))

-- Policy: Admins can view payment events on public.payment_events
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = payment_events.organization_id))))

-- Policy: Admins can view payments on public.payments
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = payments.organization_id))))

-- Policy: Parents can view their payments on public.payments
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.id = payments.parent_id))))

-- Policy: Platform admins can manage all on public.platform_admins
-- Command: ALL, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Platform admins can view all on public.platform_admins
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Org admins can manage programs on public.programs
-- Command: ALL, Roles: {public}
-- Using: (user_is_org_admin(auth.uid(), org_id) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = programs.org_id)))))

-- Policy: Users can view programs on public.programs
-- Command: SELECT, Roles: {public}
-- Using: (user_has_org_access(auth.uid(), org_id) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.org_id = programs.org_id)))))

-- Policy: Admins can manage recurring instances on public.recurring_event_instances
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((events e
     JOIN teams t ON ((t.id = e.team_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((e.id = recurring_event_instances.event_id) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Users can view recurring instances on public.recurring_event_instances
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM events
  WHERE (events.id = recurring_event_instances.event_id)))

-- Policy: Admins can manage recurring patterns on public.recurring_event_patterns
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((events e
     JOIN teams t ON ((t.id = e.team_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((e.id = recurring_event_patterns.parent_event_id) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Users can view recurring patterns on public.recurring_event_patterns
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM events
  WHERE (events.id = recurring_event_patterns.parent_event_id)))

-- Policy: Admins can manage refunds on public.refunds
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = refunds.organization_id))))

-- Policy: Parents can view their refunds on public.refunds
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     LEFT JOIN payments p ON ((p.id = refunds.payment_id)))
     LEFT JOIN offline_payments op ON ((op.id = refunds.offline_payment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (((p.id IS NOT NULL) AND (u.id = p.parent_id)) OR ((op.id IS NOT NULL) AND (u.id = op.parent_id))))))

-- Policy: Admins can manage scholarship awards on public.scholarship_awards
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN scholarship_programs sp ON ((sp.id = scholarship_awards.scholarship_program_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = sp.organization_id))))

-- Policy: Parents can view their scholarship awards on public.scholarship_awards
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN fee_assignments fa ON ((fa.id = scholarship_awards.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = fa.parent_id))))

-- Policy: Admins can manage scholarship programs on public.scholarship_programs
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = scholarship_programs.organization_id))))

-- Policy: Coaches can view scholarship programs on public.scholarship_programs
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'coach'::user_role) AND (users.org_id = scholarship_programs.organization_id))))

-- Policy: Parents can view active scholarship programs on public.scholarship_programs
-- Command: SELECT, Roles: {public}
-- Using: ((status = 'active'::scholarship_program_status) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::user_role) AND (users.org_id = scholarship_programs.organization_id)))))

-- Policy: Admins can manage seasons on public.seasons
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.org_id = u.org_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (t.id = seasons.team_id))))

-- Policy: Coaches can view seasons on public.seasons
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.org_id = u.org_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (t.id = seasons.team_id))))

-- Policy: Guardians can view their children seasons on public.seasons
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM team_memberships tm
  WHERE ((tm.season_id = seasons.id) AND user_is_guardian_of_child(auth.uid(), tm.athlete_id))))

-- Policy: org_admins_can_create_seasons_if_license_active on public.seasons
-- Command: INSERT, Roles: {authenticated}
-- With Check: (user_has_org_role(auth.uid(), organization_id, 'org_admin'::org_member_role) AND is_org_license_active(organization_id))

-- Policy: Org admins can create sports on public.sports
-- Command: INSERT, Roles: {public}
-- With Check: ((is_system = true) AND (org_id IS NULL))

-- Policy: Org admins can manage sports on public.sports
-- Command: ALL, Roles: {public}
-- Using: (user_is_org_admin(auth.uid(), org_id) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = sports.org_id)))))

-- Policy: Org members can view sports on public.sports
-- Command: SELECT, Roles: {public}
-- Using: ((deleted_at IS NULL) AND (((is_system = true) AND (org_id IS NULL)) OR (org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid())))))

-- Policy: Users can view sports on public.sports
-- Command: SELECT, Roles: {public}
-- Using: (user_has_org_access(auth.uid(), org_id) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.org_id = sports.org_id)))))

-- Policy: Admins can manage memberships on public.team_memberships
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = team_memberships.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Coaches can view team memberships on public.team_memberships
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = team_memberships.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Guardians can view their children memberships on public.team_memberships
-- Command: SELECT, Roles: {public}
-- Using: user_is_guardian_of_child(auth.uid(), athlete_id)

-- Policy: Admins can manage teams on public.teams
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = teams.org_id))))

-- Policy: Anyone can lookup team by invite code on public.teams
-- Command: SELECT, Roles: {public}
-- Using: true

-- Policy: Coaches can view teams on public.teams
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'coach'::user_role) AND (users.org_id = teams.org_id))))

-- Policy: Guardians can view their children teams on public.teams
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM team_memberships tm
  WHERE ((tm.team_id = teams.id) AND user_is_guardian_of_child(auth.uid(), tm.athlete_id))))

-- Policy: Admins can manage travel plans on public.travel_plans
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = travel_plans.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Coaches can view travel plans on public.travel_plans
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = travel_plans.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Parents can view travel plans on public.travel_plans
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM ((users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
     JOIN team_memberships tm ON ((tm.athlete_id = c.id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (tm.team_id = travel_plans.team_id) AND (tm.status = 'active'::membership_status))))

-- Policy: Parents can manage tryout registration documents on public.tryout_registration_documents
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((r.id = tryout_registration_documents.registration_id) AND (u.role = 'parent'::user_role) AND (u.family_id = r.family_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((r.id = tryout_registration_documents.registration_id) AND (u.role = 'parent'::user_role) AND (u.family_id = r.family_id))))

-- Policy: Staff can view tryout registration documents on public.tryout_registration_documents
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((r.id = tryout_registration_documents.registration_id) AND (user_has_org_access(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))))))

-- Policy: Staff can manage tryout staff notes on public.tryout_registration_staff_notes
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((r.id = tryout_registration_staff_notes.registration_id) AND (user_has_org_access(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))))))
-- With Check: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((r.id = tryout_registration_staff_notes.registration_id) AND (user_has_org_access(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))))))

-- Policy: Admins can update registrations on public.tryout_registrations
-- Command: UPDATE, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN tryouts t ON ((t.id = tryout_registrations.tryout_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Parents can manage registrations on public.tryout_registrations
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.family_id = tryout_registrations.family_id))))

-- Policy: Staff can view registrations on public.tryout_registrations
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN tryouts t ON ((t.id = tryout_registrations.tryout_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))

-- Policy: Anyone can view tryout required documents on public.tryout_required_documents
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM tryouts t
  WHERE (t.id = tryout_required_documents.tryout_id)))

-- Policy: Org admins can manage tryout required documents on public.tryout_required_documents
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM tryouts t
  WHERE ((t.id = tryout_required_documents.tryout_id) AND (user_is_org_admin(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))))))

-- Policy: Staff can manage tryout scores on public.tryout_scores
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((r.id = tryout_scores.registration_id) AND (user_has_org_access(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))))))
-- With Check: (EXISTS ( SELECT 1
   FROM (tryout_registrations r
     JOIN tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((r.id = tryout_scores.registration_id) AND (user_has_org_access(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id))))))))

-- Policy: Admins can manage tryouts on public.tryouts
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = tryouts.org_id))))

-- Policy: Anyone can view tryouts on public.tryouts
-- Command: SELECT, Roles: {public}
-- Using: true

-- Policy: Parents can view uniform kit items on public.uniform_kit_items
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM uniform_kits k
  WHERE ((k.id = uniform_kit_items.kit_id) AND parent_can_access_team_via_membership(auth.uid(), k.team_id, k.season_id))))

-- Policy: Staff can manage uniform kit items on public.uniform_kit_items
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM uniform_kits k
  WHERE ((k.id = uniform_kit_items.kit_id) AND staff_can_access_team(auth.uid(), k.team_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM uniform_kits k
  WHERE ((k.id = uniform_kit_items.kit_id) AND staff_can_access_team(auth.uid(), k.team_id))))

-- Policy: Parents can view uniform kits on public.uniform_kits
-- Command: SELECT, Roles: {public}
-- Using: parent_can_access_team_via_membership(auth.uid(), team_id, season_id)

-- Policy: Staff can manage uniform kits on public.uniform_kits
-- Command: ALL, Roles: {public}
-- Using: staff_can_access_team(auth.uid(), team_id)
-- With Check: staff_can_access_team(auth.uid(), team_id)

-- Policy: Admins can manage uniform orders on public.uniform_orders
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = uniform_orders.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Coaches can view uniform orders on public.uniform_orders
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN teams t ON ((t.id = uniform_orders.team_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::user_role) AND (u.org_id = t.org_id))))

-- Policy: Parents can manage their uniform orders on public.uniform_orders
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (c.id = uniform_orders.athlete_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM (users u
     JOIN athletes c ON ((c.family_id = u.family_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (c.id = uniform_orders.athlete_id))))

-- Policy: Parents can view uniform submission items on public.uniform_submission_items
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (uniform_submissions s
     JOIN uniform_kits k ON ((k.id = s.kit_id)))
  WHERE ((s.id = uniform_submission_items.submission_id) AND is_parent_of_child(auth.uid(), s.child_id) AND parent_can_access_team_via_membership(auth.uid(), k.team_id, k.season_id))))

-- Policy: Staff can manage uniform submission items on public.uniform_submission_items
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (uniform_submissions s
     JOIN uniform_kits k ON ((k.id = s.kit_id)))
  WHERE ((s.id = uniform_submission_items.submission_id) AND staff_can_access_team(auth.uid(), k.team_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM (uniform_submissions s
     JOIN uniform_kits k ON ((k.id = s.kit_id)))
  WHERE ((s.id = uniform_submission_items.submission_id) AND staff_can_access_team(auth.uid(), k.team_id))))

-- Policy: Parents can view uniform submissions on public.uniform_submissions
-- Command: SELECT, Roles: {public}
-- Using: (is_parent_of_child(auth.uid(), child_id) AND (EXISTS ( SELECT 1
   FROM uniform_kits k
  WHERE ((k.id = uniform_submissions.kit_id) AND parent_can_access_team_via_membership(auth.uid(), k.team_id, k.season_id)))))

-- Policy: Staff can manage uniform submissions on public.uniform_submissions
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM uniform_kits k
  WHERE ((k.id = uniform_submissions.kit_id) AND staff_can_access_team(auth.uid(), k.team_id))))
-- With Check: (EXISTS ( SELECT 1
   FROM uniform_kits k
  WHERE ((k.id = uniform_submissions.kit_id) AND staff_can_access_team(auth.uid(), k.team_id))))

-- Policy: Allow user signup insert on public.users
-- Command: INSERT, Roles: {public}
-- With Check: (auth.uid() = id)

-- Policy: Coaches can view org users v2 on public.users
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = users.id) AND (EXISTS ( SELECT 1
           FROM organization_members my_om
          WHERE ((my_om.user_id = auth.uid()) AND (my_om.organization_id = om.organization_id) AND (my_om.role = ANY (ARRAY['coach'::org_member_role, 'org_admin'::org_member_role]))))))))

-- Policy: Org admins can view org users v2 on public.users
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = users.id) AND user_is_org_admin(auth.uid(), om.organization_id))))

-- Policy: Platform admins can manage all users on public.users
-- Command: ALL, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Platform admins can view all users on public.users
-- Command: SELECT, Roles: {public}
-- Using: is_platform_admin(auth.uid())

-- Policy: Users can update own profile on public.users
-- Command: UPDATE, Roles: {public}
-- Using: (auth.uid() = id)

-- Policy: Users can view own profile on public.users
-- Command: SELECT, Roles: {public}
-- Using: (auth.uid() = id)

-- Policy: Admins can manage waivers on public.waivers
-- Command: ALL, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role) AND (users.org_id = waivers.organization_id))))

-- Policy: Parents can view their waivers on public.waivers
-- Command: SELECT, Roles: {public}
-- Using: (EXISTS ( SELECT 1
   FROM (users u
     JOIN fee_assignments fa ON ((fa.id = waivers.fee_assignment_id)))
  WHERE ((u.id = auth.uid()) AND (u.role = 'parent'::user_role) AND (u.id = fa.parent_id))))

-- Policy: Org admins can delete their import files on storage.objects
-- Command: DELETE, Roles: {public}
-- Using: ((bucket_id = 'athlete-imports'::text) AND user_is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid))

-- Policy: Org admins can read their import files on storage.objects
-- Command: SELECT, Roles: {public}
-- Using: ((bucket_id = 'athlete-imports'::text) AND user_is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid))

-- Policy: Org admins can upload import files on storage.objects
-- Command: INSERT, Roles: {public}
-- With Check: ((bucket_id = 'athlete-imports'::text) AND user_is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid))

-- Policy: Tryout docs: parents can delete own objects on storage.objects
-- Command: DELETE, Roles: {public}
-- Using: ((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((tryout_registration_documents d
     JOIN tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::user_role) AND (u.family_id = r.family_id)))))

-- Policy: Tryout docs: parents can read own objects on storage.objects
-- Command: SELECT, Roles: {public}
-- Using: ((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((tryout_registration_documents d
     JOIN tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::user_role) AND (u.family_id = r.family_id)))))

-- Policy: Tryout docs: parents can update own objects on storage.objects
-- Command: UPDATE, Roles: {public}
-- Using: ((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((tryout_registration_documents d
     JOIN tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::user_role) AND (u.family_id = r.family_id)))))

-- Policy: Tryout docs: parents can upload own objects on storage.objects
-- Command: INSERT, Roles: {public}
-- With Check: ((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((tryout_registration_documents d
     JOIN tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN users u ON ((u.id = auth.uid())))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::user_role) AND (u.family_id = r.family_id)))))

-- Policy: Tryout docs: staff can read org objects on storage.objects
-- Command: SELECT, Roles: {public}
-- Using: ((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((tryout_registration_documents d
     JOIN tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((d.storage_path = objects.name) AND (user_has_org_access(auth.uid(), t.org_id) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::user_role, 'coach'::user_role])) AND (u.org_id = t.org_id)))))))))

