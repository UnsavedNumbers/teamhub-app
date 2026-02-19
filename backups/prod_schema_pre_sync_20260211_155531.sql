


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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
    'FORCE_LOGOUT',
    'ADD_ORG_ROLE',
    'REMOVE_ORG_ROLE',
    'CHANGE_ORG_ROLE',
    'RESET_MOCK_ORGANIZATION'
);


ALTER TYPE "public"."admin_event_type" OWNER TO "postgres";


CREATE TYPE "public"."announcement_type" AS ENUM (
    'general',
    'reminder',
    'schedule_change',
    'urgent',
    'payment',
    'travel'
);


ALTER TYPE "public"."announcement_type" OWNER TO "postgres";


CREATE TYPE "public"."athlete_guardian_status" AS ENUM (
    'active',
    'pending',
    'removed'
);


ALTER TYPE "public"."athlete_guardian_status" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status" AS ENUM (
    'going',
    'late',
    'not_going'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


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


ALTER TYPE "public"."auth_event_type" OWNER TO "postgres";


CREATE TYPE "public"."billing_mode" AS ENUM (
    'platform_facilitated',
    'offline_only'
);


ALTER TYPE "public"."billing_mode" OWNER TO "postgres";


CREATE TYPE "public"."calendar_event_type" AS ENUM (
    'EVENT_CREATED',
    'EVENT_UPDATED',
    'EVENT_DELETED',
    'EVENT_CANCELLED',
    'EVENT_RSVP_SUBMITTED',
    'EVENT_RSVP_UPDATED'
);


ALTER TYPE "public"."calendar_event_type" OWNER TO "postgres";


CREATE TYPE "public"."charge_status" AS ENUM (
    'pending',
    'applied',
    'voided'
);


ALTER TYPE "public"."charge_status" OWNER TO "postgres";


CREATE TYPE "public"."charge_type" AS ENUM (
    'fee_payment',
    'late_fee',
    'discount',
    'scholarship_credit',
    'waiver_credit',
    'adjustment'
);


ALTER TYPE "public"."charge_type" OWNER TO "postgres";


CREATE TYPE "public"."checkout_session_status" AS ENUM (
    'created',
    'in_progress',
    'succeeded',
    'canceled',
    'expired'
);


ALTER TYPE "public"."checkout_session_status" OWNER TO "postgres";


CREATE TYPE "public"."child_event_type" AS ENUM (
    'CHILD_CREATED',
    'CHILD_UPDATED',
    'CHILD_DELETED',
    'CHILD_PROFILE_UPDATED'
);


ALTER TYPE "public"."child_event_type" OWNER TO "postgres";


CREATE TYPE "public"."discount_code_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."discount_code_status" OWNER TO "postgres";


CREATE TYPE "public"."discount_type" AS ENUM (
    'percent',
    'fixed'
);


ALTER TYPE "public"."discount_type" OWNER TO "postgres";


CREATE TYPE "public"."event_actor_role" AS ENUM (
    'platform_admin',
    'org_admin',
    'coach',
    'parent',
    'system'
);


ALTER TYPE "public"."event_actor_role" OWNER TO "postgres";


CREATE TYPE "public"."event_attendance_status" AS ENUM (
    'present',
    'absent',
    'late',
    'excused'
);


ALTER TYPE "public"."event_attendance_status" OWNER TO "postgres";


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
    'SYSTEM',
    'SPORT'
);


ALTER TYPE "public"."event_category" OWNER TO "postgres";


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


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."feature_flag_environment" AS ENUM (
    'dev',
    'staging',
    'prod'
);


ALTER TYPE "public"."feature_flag_environment" OWNER TO "postgres";


COMMENT ON TYPE "public"."feature_flag_environment" IS 'Environment for feature flags: dev, staging, prod';



CREATE TYPE "public"."feature_flag_event_type" AS ENUM (
    'FEATURE_FLAG_ENABLED',
    'FEATURE_FLAG_DISABLED',
    'FEATURE_FLAG_OVERRIDE_CREATED',
    'FEATURE_FLAG_OVERRIDE_DELETED'
);


ALTER TYPE "public"."feature_flag_event_type" OWNER TO "postgres";


CREATE TYPE "public"."feature_flag_value_type" AS ENUM (
    'boolean',
    'integer',
    'double'
);


ALTER TYPE "public"."feature_flag_value_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."feature_flag_value_type" IS 'Value type for feature flags: boolean, integer, double';



CREATE TYPE "public"."fee_assignment_status" AS ENUM (
    'unpaid',
    'partial',
    'paid',
    'refunded',
    'waived',
    'scholarship_applied',
    'offline_recorded'
);


ALTER TYPE "public"."fee_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."fee_scope" AS ENUM (
    'team',
    'selected_players',
    'individual'
);


ALTER TYPE "public"."fee_scope" OWNER TO "postgres";


CREATE TYPE "public"."fee_status" AS ENUM (
    'draft',
    'published',
    'closed',
    'archived'
);


ALTER TYPE "public"."fee_status" OWNER TO "postgres";


CREATE TYPE "public"."fee_type" AS ENUM (
    'registration',
    'uniform',
    'tournament',
    'travel',
    'fundraiser',
    'misc'
);


ALTER TYPE "public"."fee_type" OWNER TO "postgres";


CREATE TYPE "public"."fee_visibility" AS ENUM (
    'all_parents',
    'assigned_only'
);


ALTER TYPE "public"."fee_visibility" OWNER TO "postgres";


CREATE TYPE "public"."gallery_type" AS ENUM (
    'org',
    'team',
    'athlete',
    'event',
    'travel'
);


ALTER TYPE "public"."gallery_type" OWNER TO "postgres";


CREATE TYPE "public"."gallery_visibility" AS ENUM (
    'public',
    'team',
    'private'
);


ALTER TYPE "public"."gallery_visibility" OWNER TO "postgres";


CREATE TYPE "public"."general_rsvp_status" AS ENUM (
    'going',
    'not_going',
    'maybe'
);


ALTER TYPE "public"."general_rsvp_status" OWNER TO "postgres";


CREATE TYPE "public"."guardian_attachment_request_status" AS ENUM (
    'pending',
    'approved',
    'denied'
);


ALTER TYPE "public"."guardian_attachment_request_status" OWNER TO "postgres";


CREATE TYPE "public"."installment_frequency" AS ENUM (
    'weekly',
    'biweekly',
    'monthly'
);


ALTER TYPE "public"."installment_frequency" OWNER TO "postgres";


CREATE TYPE "public"."installment_schedule_status" AS ENUM (
    'active',
    'completed',
    'defaulted',
    'canceled'
);


ALTER TYPE "public"."installment_schedule_status" OWNER TO "postgres";


CREATE TYPE "public"."installment_status" AS ENUM (
    'upcoming',
    'due',
    'paid',
    'late',
    'skipped',
    'waived'
);


ALTER TYPE "public"."installment_status" OWNER TO "postgres";


CREATE TYPE "public"."join_request_status" AS ENUM (
    'pending',
    'approved',
    'denied'
);


ALTER TYPE "public"."join_request_status" OWNER TO "postgres";


CREATE TYPE "public"."license_plan" AS ENUM (
    'starter',
    'standard',
    'pro'
);


ALTER TYPE "public"."license_plan" OWNER TO "postgres";


CREATE TYPE "public"."license_status" AS ENUM (
    'trial',
    'active',
    'past_due',
    'canceled',
    'expired'
);


ALTER TYPE "public"."license_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'active',
    'invited',
    'removed'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_action" AS ENUM (
    'event_created',
    'event_updated',
    'event_rescheduled',
    'event_canceled',
    'event_location_updated',
    'event_time_changed',
    'event_rsvp_required',
    'event_rsvp_updated',
    'event_attendance_updated',
    'event_weather_alert',
    'travel_created',
    'travel_updated',
    'travel_canceled',
    'travel_dates_changed',
    'travel_location_changed',
    'travel_lodging_added',
    'travel_transport_added',
    'travel_overlap_detected',
    'fee_created',
    'fee_assigned',
    'fee_updated',
    'fee_removed',
    'fee_payment_partial',
    'fee_payment_completed',
    'fee_payment_failed',
    'fee_overdue',
    'payout_account_connected',
    'payout_account_issue',
    'payout_processed',
    'athlete_created',
    'athlete_updated',
    'athlete_removed',
    'athlete_added_to_team',
    'athlete_removed_from_team',
    'guardian_attached',
    'guardian_detached',
    'team_created',
    'team_updated',
    'team_archived',
    'program_created',
    'program_updated',
    'program_removed',
    'level_created',
    'level_updated',
    'level_removed',
    'uniform_size_requested',
    'uniform_size_submitted',
    'uniform_order_opened',
    'uniform_order_updated',
    'uniform_order_closed',
    'uniform_missing_info',
    'announcement_created',
    'announcement_updated',
    'announcement_deleted',
    'announcement_urgent',
    'huddle_created',
    'message_sent',
    'message_edited',
    'message_deleted',
    'message_pinned',
    'message_reported',
    'user_mentioned',
    'role_assigned',
    'role_removed',
    'access_revoked',
    'invite_sent',
    'invite_accepted',
    'invite_expired',
    'license_activated',
    'license_expiring',
    'license_expired',
    'license_upgraded',
    'feature_enabled',
    'feature_disabled',
    'system_generated_notice'
);


ALTER TYPE "public"."notification_action" OWNER TO "postgres";


CREATE TYPE "public"."notification_job_status" AS ENUM (
    'queued',
    'sent',
    'failed'
);


ALTER TYPE "public"."notification_job_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_job_type" AS ENUM (
    'new_event',
    'new_message',
    'payment_receipt',
    'event_reminder',
    'registration_confirmation',
    'team_invite',
    'password_reset',
    'welcome_email',
    'guardian_invite',
    'guardian_attachment_request_submitted',
    'guardian_attachment_request_reviewed'
);


ALTER TYPE "public"."notification_job_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_presentation" AS ENUM (
    'info',
    'warning',
    'urgent'
);


ALTER TYPE "public"."notification_presentation" OWNER TO "postgres";


CREATE TYPE "public"."offline_payment_method" AS ENUM (
    'cash',
    'check',
    'external_processor',
    'other'
);


ALTER TYPE "public"."offline_payment_method" OWNER TO "postgres";


CREATE TYPE "public"."offline_payment_status" AS ENUM (
    'recorded',
    'voided'
);


ALTER TYPE "public"."offline_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."org_member_role" AS ENUM (
    'parent',
    'coach',
    'org_admin'
);


ALTER TYPE "public"."org_member_role" OWNER TO "postgres";


CREATE TYPE "public"."org_status" AS ENUM (
    'trial',
    'active',
    'suspended',
    'expired'
);


ALTER TYPE "public"."org_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."org_status" IS 'Organization status: trial, active, suspended, expired';



CREATE TYPE "public"."org_type" AS ENUM (
    'school',
    'club',
    'league',
    'academy',
    'aau'
);


ALTER TYPE "public"."org_type" OWNER TO "postgres";


CREATE TYPE "public"."organization_event_type" AS ENUM (
    'ORG_CREATED',
    'ORG_UPDATED',
    'ORG_ACTIVATED',
    'ORG_SUSPENDED',
    'ORG_DELETED',
    'ORG_STRIPE_CONNECTED',
    'ORG_STRIPE_DISCONNECTED',
    'ORG_LICENSE_UPDATED',
    'ROLE_ADDED',
    'ROLE_REMOVED',
    'ORG_JOINED',
    'ORG_LEFT',
    'PARENT_INVITED',
    'PARENT_ATTACHED',
    'JOIN_LINK_CREATED',
    'JOIN_REQUEST_SUBMITTED',
    'JOIN_REQUEST_APPROVED',
    'JOIN_REQUEST_DENIED',
    'CHILD_CLAIM_TOKEN_CREATED',
    'CHILD_CLAIMED'
);


ALTER TYPE "public"."organization_event_type" OWNER TO "postgres";


CREATE TYPE "public"."parent_event_type" AS ENUM (
    'PARENT_PROFILE_UPDATED',
    'PARENT_EMAIL_CHANGED',
    'PARENT_PHONE_CHANGED'
);


ALTER TYPE "public"."parent_event_type" OWNER TO "postgres";


CREATE TYPE "public"."parent_invite_status" AS ENUM (
    'pending',
    'accepted',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."parent_invite_status" OWNER TO "postgres";


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


ALTER TYPE "public"."payment_event_entity_type" OWNER TO "postgres";


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


ALTER TYPE "public"."payment_event_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'due',
    'paid',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status_new" AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded'
);


ALTER TYPE "public"."payment_status_new" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'partial',
    'full'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."payout_onboarding_status" AS ENUM (
    'pending',
    'completed',
    'restricted'
);


ALTER TYPE "public"."payout_onboarding_status" OWNER TO "postgres";


CREATE TYPE "public"."photo_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."photo_status" OWNER TO "postgres";


CREATE TYPE "public"."platform_admin_role" AS ENUM (
    'super_admin',
    'support_admin',
    'finance_admin',
    'ops_admin'
);


ALTER TYPE "public"."platform_admin_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."platform_admin_role" IS 'Platform admin roles: super_admin (full access), support_admin (read + support), finance_admin (read + refunds), ops_admin (read + org/user management)';



CREATE TYPE "public"."recurrence_frequency" AS ENUM (
    'weekly',
    'custom'
);


ALTER TYPE "public"."recurrence_frequency" OWNER TO "postgres";


CREATE TYPE "public"."rsvp_status" AS ENUM (
    'going',
    'late',
    'not_going',
    'unknown'
);


ALTER TYPE "public"."rsvp_status" OWNER TO "postgres";


CREATE TYPE "public"."scan_method" AS ENUM (
    'qr',
    'manual'
);


ALTER TYPE "public"."scan_method" OWNER TO "postgres";


CREATE TYPE "public"."scholarship_funding_source" AS ENUM (
    'org_funded',
    'sponsor_funded',
    'district_funded'
);


ALTER TYPE "public"."scholarship_funding_source" OWNER TO "postgres";


CREATE TYPE "public"."scholarship_program_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."scholarship_program_status" OWNER TO "postgres";


CREATE TYPE "public"."season_event_type" AS ENUM (
    'SEASON_CREATED',
    'SEASON_UPDATED',
    'SEASON_DELETED',
    'SEASON_ACTIVATED',
    'SEASON_ARCHIVED'
);


ALTER TYPE "public"."season_event_type" OWNER TO "postgres";


CREATE TYPE "public"."sport_event_type" AS ENUM (
    'SPORT_LINKED',
    'SPORT_UNLINKED',
    'SPORT_CUSTOMIZED',
    'SPORT_CUSTOMIZATION_UPDATED',
    'SPORT_CUSTOMIZATION_REMOVED',
    'SPORT_ICON_UPLOADED',
    'SPORT_ICON_DELETED'
);


ALTER TYPE "public"."sport_event_type" OWNER TO "postgres";


CREATE TYPE "public"."start_date_rule" AS ENUM (
    'on_publish',
    'custom_date'
);


ALTER TYPE "public"."start_date_rule" OWNER TO "postgres";


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


ALTER TYPE "public"."system_event_type" OWNER TO "postgres";


CREATE TYPE "public"."team_event_type" AS ENUM (
    'TEAM_CREATED',
    'TEAM_UPDATED',
    'TEAM_DELETED',
    'TEAM_MEMBER_ADDED',
    'TEAM_MEMBER_REMOVED',
    'TEAM_INVITE_SENT',
    'TEAM_INVITE_ACCEPTED'
);


ALTER TYPE "public"."team_event_type" OWNER TO "postgres";


CREATE TYPE "public"."ticket_order_status" AS ENUM (
    'pending_payment',
    'paid',
    'refunded',
    'cancelled'
);


ALTER TYPE "public"."ticket_order_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_scan_result" AS ENUM (
    'valid',
    'already_used',
    'invalid',
    'wrong_event',
    'refunded',
    'voided',
    'not_found'
);


ALTER TYPE "public"."ticket_scan_result" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'active',
    'used',
    'refunded',
    'voided'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."ticketed_event_status" AS ENUM (
    'draft',
    'published',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."ticketed_event_status" OWNER TO "postgres";


CREATE TYPE "public"."ticketed_event_type" AS ENUM (
    'game',
    'tournament',
    'concert',
    'fundraiser',
    'other'
);


ALTER TYPE "public"."ticketed_event_type" OWNER TO "postgres";


CREATE TYPE "public"."travel_event_type" AS ENUM (
    'TRAVEL_PLAN_CREATED',
    'TRAVEL_PLAN_UPDATED',
    'TRAVEL_PLAN_DELETED',
    'TRAVEL_ITINERARY_UPDATED',
    'TRAVEL_BOOKING_CONFIRMED'
);


ALTER TYPE "public"."travel_event_type" OWNER TO "postgres";


CREATE TYPE "public"."tryout_document_status" AS ENUM (
    'missing',
    'uploaded',
    'approved',
    'rejected'
);


ALTER TYPE "public"."tryout_document_status" OWNER TO "postgres";


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


ALTER TYPE "public"."tryout_event_type" OWNER TO "postgres";


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


ALTER TYPE "public"."tryout_registration_status" OWNER TO "postgres";


CREATE TYPE "public"."uniform_event_type" AS ENUM (
    'UNIFORM_KIT_CREATED',
    'UNIFORM_KIT_UPDATED',
    'UNIFORM_ORDER_SUBMITTED',
    'UNIFORM_ORDER_UPDATED',
    'UNIFORM_ORDER_FULFILLED'
);


ALTER TYPE "public"."uniform_event_type" OWNER TO "postgres";


CREATE TYPE "public"."uniform_order_status" AS ENUM (
    'pending',
    'ordered',
    'delivered'
);


ALTER TYPE "public"."uniform_order_status" OWNER TO "postgres";


CREATE TYPE "public"."uniform_submission_status" AS ENUM (
    'not_submitted',
    'submitted',
    'locked',
    'fulfilled'
);


ALTER TYPE "public"."uniform_submission_status" OWNER TO "postgres";


CREATE TYPE "public"."user_event_type" AS ENUM (
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_ROLE_CHANGED',
    'USER_ORG_JOINED',
    'USER_ORG_LEFT'
);


ALTER TYPE "public"."user_event_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'parent',
    'coach',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."video_bookmark_visibility" AS ENUM (
    'private',
    'shared'
);


ALTER TYPE "public"."video_bookmark_visibility" OWNER TO "postgres";


CREATE TYPE "public"."video_category" AS ENUM (
    'practice',
    'game',
    'highlight',
    'training',
    'event',
    'other'
);


ALTER TYPE "public"."video_category" OWNER TO "postgres";


CREATE TYPE "public"."video_link_type" AS ENUM (
    'featured',
    'appears',
    'highlight'
);


ALTER TYPE "public"."video_link_type" OWNER TO "postgres";


CREATE TYPE "public"."video_note_scope" AS ENUM (
    'private',
    'coaches',
    'guardians',
    'all'
);


ALTER TYPE "public"."video_note_scope" OWNER TO "postgres";


CREATE TYPE "public"."video_review_status" AS ENUM (
    'pending',
    'viewed',
    'acknowledged',
    'dismissed'
);


ALTER TYPE "public"."video_review_status" OWNER TO "postgres";


CREATE TYPE "public"."video_status" AS ENUM (
    'pending_upload',
    'uploading',
    'processing',
    'ready',
    'errored',
    'deleted'
);


ALTER TYPE "public"."video_status" OWNER TO "postgres";


CREATE TYPE "public"."video_tag_type" AS ENUM (
    'skill',
    'drill',
    'play',
    'custom'
);


ALTER TYPE "public"."video_tag_type" OWNER TO "postgres";


CREATE TYPE "public"."video_visibility" AS ENUM (
    'private',
    'team',
    'organization',
    'guardians'
);


ALTER TYPE "public"."video_visibility" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_organization_invite"("p_token" "text") RETURNS TABLE("success" boolean, "organization_id" "uuid", "organization_name" "text", "role" "public"."org_member_role", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."accept_organization_invite"("p_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_organization_invite"("p_token" "text") IS 'Accepts an invite and creates organization membership. Uses SELECT FOR UPDATE NOWAIT to prevent race conditions.';



CREATE OR REPLACE FUNCTION "public"."accept_parent_invite"("p_token" "text") RETURNS TABLE("success" boolean, "organization_id" "uuid", "child_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."accept_parent_invite"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_org_role"("p_user_id" "uuid", "p_org_id" "uuid", "p_role" "public"."org_member_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT := hashtext(p_user_id::text || p_org_id::text);
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO organization_members (user_id, org_id, role)
  VALUES (p_user_id, p_org_id, p_role)
  ON CONFLICT (org_id, user_id, role) DO NOTHING;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."add_org_role"("p_user_id" "uuid", "p_org_id" "uuid", "p_role" "public"."org_member_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_org_role"("p_user_id" "uuid", "p_org_id" "uuid", "p_role" "public"."org_member_role") IS 'Add organization role to user. Idempotent - safe to call multiple times.';



CREATE OR REPLACE FUNCTION "public"."admin_activate_organization"("target_org_id" "uuid", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_activate_organization"("target_org_id" "uuid", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_activate_organization"("target_org_id" "uuid", "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."admin_add_org_role"("target_user_id" "uuid", "target_org_id" "uuid", "target_role" "public"."org_member_role", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
  org_exists BOOLEAN;
  role_added BOOLEAN;
  user_email TEXT;
  org_name TEXT;
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
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id), 
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id),
         (SELECT name FROM organizations WHERE id = target_org_id)
  INTO org_exists, org_name;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Add role (idempotent - if role already exists, returns true but no error)
  SELECT add_org_role(target_user_id, target_org_id, target_role) INTO role_added;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'ADD_ORG_ROLE',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'org_role', target_role::text,
      'user_email', user_email,
      'org_name', org_name
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'role_added', role_added);
END;
$$;


ALTER FUNCTION "public"."admin_add_org_role"("target_user_id" "uuid", "target_org_id" "uuid", "target_role" "public"."org_member_role", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_add_platform_admin"("target_email" "text", "target_role" "public"."platform_admin_role", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_add_platform_admin"("target_email" "text", "target_role" "public"."platform_admin_role", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_add_platform_admin"("target_email" "text", "target_role" "public"."platform_admin_role", "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."admin_attach_parents_to_child"("p_org_id" "uuid", "p_child_id" "uuid", "p_parent_emails" "text"[], "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_expires_in_days" integer DEFAULT 7) RETURNS TABLE("email" "text", "status" "public"."parent_invite_status", "token" "text", "user_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_attach_parents_to_child"("p_org_id" "uuid", "p_child_id" "uuid", "p_parent_emails" "text"[], "p_team_id" "uuid", "p_expires_in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_change_org_role"("target_user_id" "uuid", "target_org_id" "uuid", "old_role" "public"."org_member_role", "new_role" "public"."org_member_role", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
  org_exists BOOLEAN;
  role_exists BOOLEAN;
  role_removed BOOLEAN;
  role_added BOOLEAN;
  user_email TEXT;
  org_name TEXT;
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
  
  -- Validate old_role != new_role
  IF old_role = new_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Old role and new role cannot be the same');
  END IF;
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id),
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id),
         (SELECT name FROM organizations WHERE id = target_org_id)
  INTO org_exists, org_name;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Check if old role exists
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = target_user_id 
      AND org_id = target_org_id 
      AND role = old_role
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have the specified old role in the organization');
  END IF;
  
  -- Remove old role
  SELECT remove_org_role(target_user_id, target_org_id, old_role) INTO role_removed;
  
  -- Add new role
  SELECT add_org_role(target_user_id, target_org_id, new_role) INTO role_added;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'CHANGE_ORG_ROLE',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'old_role', old_role::text,
      'new_role', new_role::text,
      'user_email', user_email,
      'org_name', org_name
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'role_changed', role_removed AND role_added);
END;
$$;


ALTER FUNCTION "public"."admin_change_org_role"("target_user_id" "uuid", "target_org_id" "uuid", "old_role" "public"."org_member_role", "new_role" "public"."org_member_role", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_feature_flag"("p_key" "text", "p_value_type" "public"."feature_flag_value_type", "p_environment" "public"."feature_flag_environment", "p_description" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."admin_create_feature_flag"("p_key" "text", "p_value_type" "public"."feature_flag_value_type", "p_environment" "public"."feature_flag_environment", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_feature_flag"("p_feature_flag_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_delete_feature_flag"("p_feature_flag_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_disable_user"("target_user_id" "uuid", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_disable_user"("target_user_id" "uuid", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_disable_user"("target_user_id" "uuid", "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."admin_enable_user"("target_user_id" "uuid", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_enable_user"("target_user_id" "uuid", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_enable_user"("target_user_id" "uuid", "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."admin_remove_org_override"("p_feature_flag_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_expected_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_remove_org_override"("p_feature_flag_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_remove_org_role"("target_user_id" "uuid", "target_org_id" "uuid", "target_role" "public"."org_member_role", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  admin_role platform_admin_role;
  user_exists BOOLEAN;
  org_exists BOOLEAN;
  role_exists BOOLEAN;
  role_removed BOOLEAN;
  user_email TEXT;
  org_name TEXT;
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
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id),
         (SELECT email FROM users WHERE id = target_user_id)
  INTO user_exists, user_email;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = target_org_id),
         (SELECT name FROM organizations WHERE id = target_org_id)
  INTO org_exists, org_name;
  IF NOT org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Check if role exists
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = target_user_id 
      AND org_id = target_org_id 
      AND role = target_role
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have this role in the organization');
  END IF;
  
  -- Remove role
  SELECT remove_org_role(target_user_id, target_org_id, target_role) INTO role_removed;
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'REMOVE_ORG_ROLE',
    'platform_admin'::event_actor_role,
    auth.uid(),
    target_org_id,
    'user',
    target_user_id,
    jsonb_build_object(
      'admin_role', admin_role::text,
      'reason', reason,
      'org_role', target_role::text,
      'user_email', user_email,
      'org_name', org_name
    ),
    NULL,
    NULL,
    NULL
  );
  
  RETURN jsonb_build_object('success', true, 'role_removed', role_removed);
END;
$$;


ALTER FUNCTION "public"."admin_remove_org_role"("target_user_id" "uuid", "target_org_id" "uuid", "target_role" "public"."org_member_role", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_remove_platform_admin"("target_user_id" "uuid", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_remove_platform_admin"("target_user_id" "uuid", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_remove_platform_admin"("target_user_id" "uuid", "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."admin_remove_user_override"("p_feature_flag_id" "uuid", "p_user_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_expected_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_remove_user_override"("p_feature_flag_id" "uuid", "p_user_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reset_mock_organization"("target_org_id" "uuid", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  admin_role platform_admin_role;
  lock_key_1 bigint;
  lock_key_2 bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO admin_role FROM platform_admins WHERE user_id = auth.uid();
  IF admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: not a platform admin');
  END IF;
  IF admin_role NOT IN ('ops_admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: requires ops_admin or super_admin role');
  END IF;

  IF reason IS NULL OR trim(reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reason is required.');
  END IF;

  IF NOT is_mock_organization(target_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is not a mock/seed organization. Reset is only allowed for mock orgs created via seed-all.ts.');
  END IF;

  lock_key_1 := ('x' || substr(replace(target_org_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  lock_key_2 := ('x' || substr(replace(target_org_id::text, '-', ''), 17, 16))::bit(64)::bigint;
  IF NOT pg_try_advisory_xact_lock(lock_key_1, lock_key_2) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reset is already in progress for this organization.');
  END IF;

  DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE org_id = target_org_id);
  DELETE FROM offline_payment_allocations WHERE offline_payment_id IN (SELECT id FROM offline_payments WHERE org_id = target_org_id);
  DELETE FROM checkout_session_items WHERE checkout_session_id IN (SELECT id FROM checkout_sessions WHERE org_id = target_org_id);
  DELETE FROM installments WHERE installment_schedule_id IN (SELECT id FROM installment_schedules WHERE installment_plan_id IN (SELECT id FROM installment_plans WHERE org_id = target_org_id));
  DELETE FROM installment_schedules WHERE installment_plan_id IN (SELECT id FROM installment_plans WHERE org_id = target_org_id);
  DELETE FROM discount_redemptions WHERE discount_code_id IN (SELECT id FROM discount_codes WHERE org_id = target_org_id);
  DELETE FROM scholarship_awards WHERE scholarship_program_id IN (SELECT id FROM scholarship_programs WHERE org_id = target_org_id);
  DELETE FROM payment_events WHERE org_id = target_org_id;
  DELETE FROM payments WHERE org_id = target_org_id;
  DELETE FROM offline_payments WHERE org_id = target_org_id;
  DELETE FROM checkout_sessions WHERE org_id = target_org_id;
  DELETE FROM installment_plans WHERE org_id = target_org_id;
  DELETE FROM fee_assignments WHERE org_id = target_org_id;
  DELETE FROM charges WHERE org_id = target_org_id;
  DELETE FROM discount_codes WHERE org_id = target_org_id;
  DELETE FROM waivers WHERE org_id = target_org_id;
  DELETE FROM scholarship_programs WHERE org_id = target_org_id;
  DELETE FROM refunds WHERE org_id = target_org_id;
  DELETE FROM org_payment_policies WHERE org_id = target_org_id;
  DELETE FROM fees WHERE org_id = target_org_id;

  DELETE FROM messages WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);
  DELETE FROM announcements WHERE org_id = target_org_id;
  DELETE FROM announcements WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);

  DELETE FROM uniform_submission_items WHERE submission_id IN (
    SELECT id FROM uniform_submissions WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id))
  );
  DELETE FROM uniform_submissions WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id));
  DELETE FROM uniform_kit_items WHERE kit_id IN (SELECT id FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id));
  DELETE FROM uniform_kits WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);

  DELETE FROM tryouts WHERE org_id = target_org_id;
  DELETE FROM team_seasons WHERE team_id IN (SELECT id FROM teams WHERE org_id = target_org_id);
  DELETE FROM teams WHERE org_id = target_org_id;
  DELETE FROM seasons WHERE org_id = target_org_id;
  DELETE FROM levels WHERE org_id = target_org_id;
  DELETE FROM programs WHERE org_id = target_org_id;

  DELETE FROM organization_sports WHERE org_id = target_org_id;
  DELETE FROM notification_jobs WHERE org_id = target_org_id;
  DELETE FROM guardian_attachment_requests WHERE org_id = target_org_id;
  DELETE FROM stream_channels WHERE org_id = target_org_id;
  DELETE FROM athlete_guardians WHERE org_id = target_org_id;
  DELETE FROM athlete_imports WHERE org_id = target_org_id;
  DELETE FROM organization_invites WHERE org_id = target_org_id;
  DELETE FROM organization_members WHERE org_id = target_org_id;
  DELETE FROM feature_flags WHERE org_id = target_org_id;
  DELETE FROM user_notifications WHERE org_id = target_org_id;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_invites') THEN
    DELETE FROM parent_invites WHERE org_id = target_org_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'join_links') THEN
    DELETE FROM join_links WHERE org_id = target_org_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'join_requests') THEN
    DELETE FROM join_requests WHERE org_id = target_org_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'child_claim_tokens') THEN
    DELETE FROM child_claim_tokens WHERE org_id = target_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'athletes') THEN
    DELETE FROM athletes WHERE family_id IN (SELECT id FROM families WHERE org_id = target_org_id);
  END IF;
  DELETE FROM families WHERE org_id = target_org_id;

  DELETE FROM organization_advanced_settings WHERE org_id = target_org_id;
  DELETE FROM organization_notification_settings WHERE org_id = target_org_id;
  DELETE FROM organization_visibility_settings WHERE org_id = target_org_id;
  DELETE FROM organization_registration_settings WHERE org_id = target_org_id;
  DELETE FROM organization_attendance_settings WHERE org_id = target_org_id;
  DELETE FROM organization_defaults WHERE org_id = target_org_id;
  DELETE FROM organization_settings WHERE org_id = target_org_id;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_travel_contacts') THEN
    DELETE FROM organization_travel_contacts WHERE org_id = target_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'org_id') THEN
    DELETE FROM attendance WHERE org_id = target_org_id;
  END IF;

  PERFORM log_event(
    'ADMIN'::event_category,
    'RESET_MOCK_ORGANIZATION',
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_reset_mock_organization"("target_org_id" "uuid", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_reset_mock_organization"("target_org_id" "uuid", "reason" "text") IS 'Platform Admin: resets a mock/seed org by deleting all org-scoped child data. Does not delete the organization row. Re-run seed-all.ts to repopulate.';



CREATE OR REPLACE FUNCTION "public"."admin_restore_feature_flag"("p_feature_flag_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_restore_feature_flag"("p_feature_flag_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_feature_flag"("target_org_id" "uuid", "target_feature_key" "text", "target_enabled" boolean, "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
  INSERT INTO feature_flags (org_id, feature_key, enabled)
  VALUES (target_org_id, target_feature_key, target_enabled)
  ON CONFLICT (org_id, feature_key)
  DO UPDATE SET enabled = target_enabled, updated_at = NOW();
  
  -- Log event using new system
  PERFORM log_event(
    'ADMIN'::event_category,
    'SET_FEATURE_FLAG',
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_set_feature_flag"("target_org_id" "uuid", "target_feature_key" "text", "target_enabled" boolean, "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_set_feature_flag"("target_org_id" "uuid", "target_feature_key" "text", "target_enabled" boolean, "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."admin_set_org_override"("p_feature_flag_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_value_boolean" boolean DEFAULT NULL::boolean, "p_value_integer" integer DEFAULT NULL::integer, "p_value_double" double precision DEFAULT NULL::double precision, "p_expected_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_set_org_override"("p_feature_flag_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_value_boolean" boolean, "p_value_integer" integer, "p_value_double" double precision, "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_platform_default"("p_feature_flag_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_value_boolean" boolean DEFAULT NULL::boolean, "p_value_integer" integer DEFAULT NULL::integer, "p_value_double" double precision DEFAULT NULL::double precision, "p_expected_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_set_platform_default"("p_feature_flag_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_value_boolean" boolean, "p_value_integer" integer, "p_value_double" double precision, "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_user_override"("p_feature_flag_id" "uuid", "p_user_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_value_boolean" boolean DEFAULT NULL::boolean, "p_value_integer" integer DEFAULT NULL::integer, "p_value_double" double precision DEFAULT NULL::double precision, "p_expected_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_set_user_override"("p_feature_flag_id" "uuid", "p_user_id" "uuid", "p_environment" "public"."feature_flag_environment", "p_reason" "text", "p_value_boolean" boolean, "p_value_integer" integer, "p_value_double" double precision, "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_suspend_organization"("target_org_id" "uuid", "reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    'platform_admin'::event_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."admin_suspend_organization"("target_org_id" "uuid", "reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_suspend_organization"("target_org_id" "uuid", "reason" "text") IS 'Updated to use new event logging system';



CREATE OR REPLACE FUNCTION "public"."archive_old_event_logs"("p_retention_days" integer DEFAULT 730) RETURNS TABLE("archived_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."archive_old_event_logs"("p_retention_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_old_event_logs"("p_retention_days" integer) IS 'Archives events older than retention period to event_logs_archive table.';



CREATE OR REPLACE FUNCTION "public"."assign_system_features_to_new_tier"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO tier_feature_assignments (
    license_tier_id,
    feature_entitlement_id,
    included,
    role_admin,
    role_coach,
    role_parent
  )
  SELECT
    NEW.id,
    fe.id,
    true,
    true,
    true,
    false
  FROM feature_entitlements fe
  WHERE fe.is_system_feature = true
    AND fe.archived_at IS NULL;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_system_features_to_new_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."athlete_has_active_guardian"("p_athlete_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Check if there exists at least one active guardian relationship
  -- where the guardian has a valid, non-disabled auth account
  RETURN EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    JOIN users u ON u.id = ag.user_id
    JOIN auth.users au ON au.id = u.id
    WHERE ag.athlete_id = p_athlete_id
      AND ag.org_id = p_org_id
      AND ag.status = 'active'
      -- User must exist in auth.users (not soft-deleted)
      AND au.deleted_at IS NULL
      -- User must not be banned/disabled
      AND (au.banned_until IS NULL OR au.banned_until < NOW())
  );
END;
$$;


ALTER FUNCTION "public"."athlete_has_active_guardian"("p_athlete_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."athlete_has_active_guardian"("p_athlete_id" "uuid", "p_org_id" "uuid") IS 'Returns true if athlete has at least one active guardian with a valid, non-disabled auth account. 
   Used for visibility checks in admin interfaces. SECURITY DEFINER to access auth.users.';



CREATE OR REPLACE FUNCTION "public"."athlete_is_visible_to_user"("check_user_id" "uuid", "check_athlete_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_family_id uuid;
  v_org_id uuid;
begin
  -- Platform admins can see everything
  if is_platform_admin(check_user_id) then
    return true;
  end if;

  -- Resolve family/org without triggering RLS (security definer)
  select family_id into v_family_id
  from athletes
  where id = check_athlete_id;

  if v_family_id is null then
    return false;
  end if;

  select org_id into v_org_id
  from families
  where id = v_family_id;

  -- Org admins/coaches for the family org can view
  if user_has_any_org_roles(
    check_user_id,
    v_org_id,
    array['org_admin','coach']::org_member_role[]
  ) then
    return true;
  end if;

  -- Guardians of the athlete can view
  if user_is_guardian_of_child(check_user_id, check_athlete_id) then
    return true;
  end if;

  -- Members of the same family can view (parent/sibling)
  if exists (
    select 1
    from users u
    where u.id = check_user_id
      and u.family_id = v_family_id
  ) then
    return true;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."athlete_is_visible_to_user"("check_user_id" "uuid", "check_athlete_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_apply_to_tiers"("p_feature_ids" "uuid"[], "p_tier_ids" "uuid"[], "p_action" "text", "p_role_admin" boolean DEFAULT true, "p_role_coach" boolean DEFAULT true, "p_role_parent" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_feature_id UUID;
  v_tier_id UUID;
  v_processed INTEGER := 0;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  IF array_length(p_tier_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tiers provided');
  END IF;

  IF p_action NOT IN ('add', 'remove') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action must be add or remove');
  END IF;

  -- Check for locked (non-toggleable) features when removing from tiers
  IF p_action = 'remove' AND EXISTS (
    SELECT 1 FROM feature_entitlements
    WHERE id = ANY(p_feature_ids)
      AND is_toggleable = false
      AND archived_at IS NULL
  ) THEN
    DECLARE
      v_locked_features JSONB;
    BEGIN
      SELECT jsonb_agg(
        jsonb_build_object(
          'feature_key', feature_key,
          'display_name', display_name,
          'lock_reason', lock_reason
        )
      ) INTO v_locked_features
      FROM feature_entitlements
      WHERE id = ANY(p_feature_ids)
        AND is_toggleable = false
        AND archived_at IS NULL;
      
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FEATURE_LOCKED',
        'error', 'One or more features cannot be removed from tiers',
        'locked_features', v_locked_features,
        'message', 'Cannot remove locked features from license tiers. These features are required for platform functionality.'
      );
    END;
  END IF;

  -- Generate lock key
  v_lock_key := hashtext(array_to_string(p_feature_ids, ',') || array_to_string(p_tier_ids, ','));
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Process each feature-tier combination (only for toggleable features when removing)
  FOR v_feature_id IN SELECT unnest(p_feature_ids)
  LOOP
    -- Skip locked features when removing
    IF p_action = 'remove' AND EXISTS (
      SELECT 1 FROM feature_entitlements
      WHERE id = v_feature_id AND is_toggleable = false
    ) THEN
      CONTINUE;
    END IF;
    
    FOR v_tier_id IN SELECT unnest(p_tier_ids)
    LOOP
      IF p_action = 'add' THEN
        INSERT INTO tier_feature_assignments (
          license_tier_id,
          feature_entitlement_id,
          included,
          role_admin,
          role_coach,
          role_parent
        ) VALUES (
          v_tier_id,
          v_feature_id,
          true,
          p_role_admin,
          p_role_coach,
          p_role_parent
        )
        ON CONFLICT (license_tier_id, feature_entitlement_id) 
        DO UPDATE SET
          included = true,
          role_admin = p_role_admin,
          role_coach = p_role_coach,
          role_parent = p_role_parent,
          updated_at = NOW();
      ELSIF p_action = 'remove' THEN
        UPDATE tier_feature_assignments
        SET included = false,
            updated_at = NOW()
        WHERE license_tier_id = v_tier_id
          AND feature_entitlement_id = v_feature_id;
      END IF;
      v_processed := v_processed + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object(
      'feature_ids', p_feature_ids,
      'tier_ids', p_tier_ids,
      'action', p_action
    )
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."bulk_apply_to_tiers"("p_feature_ids" "uuid"[], "p_tier_ids" "uuid"[], "p_action" "text", "p_role_admin" boolean, "p_role_coach" boolean, "p_role_parent" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_feature_category"("p_feature_ids" "uuid"[], "p_new_category" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  IF p_new_category IS NULL OR p_new_category = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Category cannot be empty');
  END IF;

  -- Check for locked (non-removable) features if trying to change to a restricted category
  -- Note: Category changes are generally allowed, but we check is_removable for safety
  -- Generate lock key
  v_lock_key := hashtext(array_to_string(p_feature_ids, ','));
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Update in transaction (category changes are allowed for all features)
  UPDATE feature_entitlements
  SET category = p_new_category,
      updated_at = NOW()
  WHERE id = ANY(p_feature_ids)
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object('feature_ids', p_feature_ids, 'category', p_new_category)
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."bulk_update_feature_category"("p_feature_ids" "uuid"[], "p_new_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_feature_status"("p_feature_ids" "uuid"[], "p_new_status" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('live', 'beta', 'hidden') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Must be live, beta, or hidden');
  END IF;

  -- Check for locked (non-toggleable) features
  IF EXISTS (
    SELECT 1 FROM feature_entitlements
    WHERE id = ANY(p_feature_ids)
      AND is_toggleable = false
      AND archived_at IS NULL
  ) THEN
    -- Get locked feature details for error message
    DECLARE
      v_locked_features JSONB;
    BEGIN
      SELECT jsonb_agg(
        jsonb_build_object(
          'feature_key', feature_key,
          'display_name', display_name,
          'lock_reason', lock_reason
        )
      ) INTO v_locked_features
      FROM feature_entitlements
      WHERE id = ANY(p_feature_ids)
        AND is_toggleable = false
        AND archived_at IS NULL;
      
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FEATURE_LOCKED',
        'error', 'One or more features cannot be toggled',
        'locked_features', v_locked_features,
        'message', 'Cannot change status of locked features. These features are required for platform functionality.'
      );
    END;
  END IF;

  -- Generate lock key from feature IDs
  v_lock_key := hashtext(array_to_string(p_feature_ids, ','));
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Update in transaction (automatic rollback on error)
  UPDATE feature_entitlements
  SET rollout_status = p_new_status,
      updated_at = NOW()
  WHERE id = ANY(p_feature_ids)
    AND archived_at IS NULL
    AND is_toggleable = true; -- Only update toggleable features
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log success
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    'Bulk status update succeeded',
    jsonb_build_object('updated_count', v_updated_count, 'status', p_new_status)
  )
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count
  );
EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object('feature_ids', p_feature_ids, 'status', p_new_status)
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."bulk_update_feature_status"("p_feature_ids" "uuid"[], "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_role_visibility"("p_feature_ids" "uuid"[], "p_role_type" "text", "p_visible" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_feature_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No features provided');
  END IF;

  IF p_role_type NOT IN ('admin', 'coach', 'parent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role type must be admin, coach, or parent');
  END IF;

  -- Check for locked (non-toggleable) features when hiding visibility
  IF p_visible = false AND EXISTS (
    SELECT 1 FROM feature_entitlements fe
    WHERE fe.id = ANY(p_feature_ids)
      AND fe.is_toggleable = false
      AND fe.archived_at IS NULL
  ) THEN
    DECLARE
      v_locked_features JSONB;
    BEGIN
      SELECT jsonb_agg(
        jsonb_build_object(
          'feature_key', fe.feature_key,
          'display_name', fe.display_name,
          'lock_reason', fe.lock_reason
        )
      ) INTO v_locked_features
      FROM feature_entitlements fe
      WHERE fe.id = ANY(p_feature_ids)
        AND fe.is_toggleable = false
        AND fe.archived_at IS NULL;
      
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FEATURE_LOCKED',
        'error', 'One or more features cannot have visibility hidden',
        'locked_features', v_locked_features,
        'message', 'Cannot hide visibility of locked features. These features are required for platform functionality.'
      );
    END;
  END IF;

  -- Generate lock key
  v_lock_key := hashtext(array_to_string(p_feature_ids, ',') || p_role_type);
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCK_HELD',
      'message', 'Another bulk operation is in progress on these features'
    );
  END IF;

  -- Update based on role type (only for toggleable features when hiding)
  IF p_role_type = 'admin' THEN
    UPDATE tier_feature_assignments tfa
    SET role_admin = p_visible,
        updated_at = NOW()
    FROM feature_entitlements fe
    WHERE tfa.feature_entitlement_id = fe.id
      AND tfa.feature_entitlement_id = ANY(p_feature_ids)
      AND tfa.included = true
      AND (p_visible = true OR fe.is_toggleable = true); -- Allow hiding only if toggleable
  ELSIF p_role_type = 'coach' THEN
    UPDATE tier_feature_assignments tfa
    SET role_coach = p_visible,
        updated_at = NOW()
    FROM feature_entitlements fe
    WHERE tfa.feature_entitlement_id = fe.id
      AND tfa.feature_entitlement_id = ANY(p_feature_ids)
      AND tfa.included = true
      AND (p_visible = true OR fe.is_toggleable = true);
  ELSIF p_role_type = 'parent' THEN
    UPDATE tier_feature_assignments tfa
    SET role_parent = p_visible,
        updated_at = NOW()
    FROM feature_entitlements fe
    WHERE tfa.feature_entitlement_id = fe.id
      AND tfa.feature_entitlement_id = ANY(p_feature_ids)
      AND tfa.included = true
      AND (p_visible = true OR fe.is_toggleable = true);
  END IF;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO discovery_errors (error_type, error_message, error_details)
  VALUES (
    'bulk_operation',
    SQLERRM,
    jsonb_build_object(
      'feature_ids', p_feature_ids,
      'role_type', p_role_type,
      'visible', p_visible
    )
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."bulk_update_role_visibility"("p_feature_ids" "uuid"[], "p_role_type" "text", "p_visible" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  athlete_org_id UUID;
BEGIN
  -- Try to get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  -- Check if user is org admin (if org known)
  IF athlete_org_id IS NOT NULL AND is_org_admin(athlete_org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is parent/guardian (works even without org/family)
  RETURN is_parent_of_athlete(athlete_id_param, user_id_param);
END;
$$;


ALTER FUNCTION "public"."can_edit_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_edit_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user can edit the athlete (parent or org admin).';



CREATE OR REPLACE FUNCTION "public"."can_edit_video"("p_video_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_video RECORD;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can edit
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Org admin can edit
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin')
  );
END;
$$;


ALTER FUNCTION "public"."can_edit_video"("p_video_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_fetch_gemini"("p_place_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
BEGIN
  SELECT last_gemini_call_at INTO v_last_call
  FROM venue_insights
  WHERE place_id = p_place_id;
  
  -- NULL means never called, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."can_fetch_gemini"("p_place_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_fetch_nearby_gemini"("p_venue_key" "text", "p_event_type" "text", "p_time_window" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
  v_places_id UUID;
BEGIN
  -- Get the venue_nearby_places_id for this venue_key
  SELECT id INTO v_places_id
  FROM venue_nearby_places
  WHERE venue_key = p_venue_key;
  
  -- If no places record exists, allow (we'll create it)
  IF v_places_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if Gemini was called for this context
  SELECT gemini_called_at INTO v_last_call
  FROM venue_nearby_amenities_summaries
  WHERE venue_nearby_places_id = v_places_id
    AND event_type = p_event_type
    AND time_window = p_time_window;
  
  -- NULL means never called for this context, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."can_fetch_nearby_gemini"("p_venue_key" "text", "p_event_type" "text", "p_time_window" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_fetch_nearby_places"("p_venue_key" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
BEGIN
  SELECT last_api_call_at INTO v_last_call
  FROM venue_nearby_places
  WHERE venue_key = p_venue_key;
  
  -- NULL means never called, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."can_fetch_nearby_places"("p_venue_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_fetch_place_details"("p_place_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
BEGIN
  SELECT last_place_details_call_at INTO v_last_call
  FROM venue_insights
  WHERE place_id = p_place_id;
  
  -- NULL means never called, allow
  IF v_last_call IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed (database handles timezone)
  RETURN (NOW() - v_last_call) >= INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."can_fetch_place_details"("p_place_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_moderate_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_gallery RECORD;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins can always moderate
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Coaches can moderate team galleries
  IF v_gallery.gallery_type = 'team' AND v_gallery.entity_id IS NOT NULL THEN
    RETURN is_coach_for_team(v_gallery.entity_id, user_id_param);
  END IF;
  
  -- Coaches can moderate event/travel galleries if they coach the linked team
  IF v_gallery.gallery_type IN ('event', 'travel') AND v_gallery.entity_id IS NOT NULL THEN
    DECLARE
      v_team_id UUID;
    BEGIN
      IF v_gallery.gallery_type = 'event' THEN
        SELECT team_id INTO v_team_id FROM events WHERE id = v_gallery.entity_id;
      ELSIF v_gallery.gallery_type = 'travel' THEN
        SELECT team_id INTO v_team_id FROM travel_plans WHERE id = v_gallery.entity_id;
      END IF;
      
      IF v_team_id IS NOT NULL THEN
        RETURN is_coach_for_team(v_team_id, user_id_param);
      END IF;
    END;
  END IF;
  
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_moderate_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_moderate_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user can moderate the gallery (org_admin or coach, not parents).';



CREATE OR REPLACE FUNCTION "public"."can_perform_admin_action"("required_roles" "public"."platform_admin_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = auth.uid() 
    AND role = ANY(required_roles)
  );
$$;


ALTER FUNCTION "public"."can_perform_admin_action"("required_roles" "public"."platform_admin_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_to_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_gallery RECORD;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.allow_contributions, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins and coaches can always upload (if they can view)
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is coach for team-based galleries
  IF v_gallery.gallery_type = 'team' AND v_gallery.entity_id IS NOT NULL THEN
    IF is_coach_for_team(v_gallery.entity_id, user_id_param) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Parents can upload if allow_contributions is true
  IF v_gallery.allow_contributions THEN
    RETURN can_view_gallery(gallery_id_param, user_id_param);
  END IF;
  
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_upload_to_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_upload_to_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user can upload photos to the gallery (org_admin/coach always, parents if allow_contributions=true).';



CREATE OR REPLACE FUNCTION "public"."can_view_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  athlete_org_id UUID;
BEGIN
  -- Try to get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  -- Check if user is org admin (if org known)
  IF athlete_org_id IS NOT NULL AND is_org_admin(athlete_org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is parent/guardian (works even without org/family)
  IF is_parent_of_athlete(athlete_id_param, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is coach for any team the athlete is on
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_id_param
      AND tm.deleted_at IS NULL
      AND t.deleted_at IS NULL
      AND is_coach_for_team(t.id, user_id_param)
  );
END;
$$;


ALTER FUNCTION "public"."can_view_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_view_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user can view the athlete (parent, coach, or org admin).';



CREATE OR REPLACE FUNCTION "public"."can_view_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_gallery RECORD;
  v_team_id UUID;
  v_athlete_id UUID;
  v_event_id UUID;
  v_travel_plan_id UUID;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins can view all galleries in their org
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on gallery type
  CASE v_gallery.gallery_type
    WHEN 'org' THEN
      -- Org galleries: org members can view
      RETURN is_org_member(v_gallery.org_id, user_id_param);
      
    WHEN 'team' THEN
      -- Team galleries: coaches of that team can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_coach_for_team(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'athlete' THEN
      -- Athlete galleries: parents of that athlete can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_parent_of_athlete(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'event' THEN
      -- Event galleries: members/coaches of the team linked to the event can view
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM events
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    WHEN 'travel' THEN
      -- Travel galleries: members/coaches of the team linked to the travel plan can view
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM travel_plans
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."can_view_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_view_gallery"("gallery_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user can view the gallery (org_admin, coach, or parent based on gallery type).';



CREATE OR REPLACE FUNCTION "public"."can_view_video"("p_video_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_video RECORD;
  v_is_admin BOOLEAN;
  v_is_coach BOOLEAN;
  v_is_guardian_of_tagged BOOLEAN;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.team_id, v.visibility, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can always view
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is org admin
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check visibility rules
  CASE v_video.visibility
    WHEN 'private' THEN
      RETURN FALSE;
    
    WHEN 'organization' THEN
      -- Any org member can view
      RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = v_video.org_id AND om.user_id = p_user_id
      );
    
    WHEN 'team' THEN
      -- Team members (coaches or parents with athletes on team)
      RETURN EXISTS (
        SELECT 1 FROM public.team_memberships tm
        WHERE tm.team_id = v_video.team_id AND tm.user_id = p_user_id
      ) OR EXISTS (
        SELECT 1 FROM public.athlete_guardians ag
        JOIN public.athletes a ON a.id = ag.athlete_id
        WHERE ag.user_id = p_user_id
          AND ag.status = 'active'
          AND a.team_id = v_video.team_id
      );
    
    WHEN 'guardians' THEN
      -- Only guardians of tagged athletes
      RETURN EXISTS (
        SELECT 1 FROM public.video_athlete_links val
        JOIN public.athlete_guardians ag ON ag.athlete_id = val.athlete_id
        WHERE val.video_id = p_video_id
          AND ag.user_id = p_user_id
          AND ag.status = 'active'
      );
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."can_view_video"("p_video_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid());
$$;


ALTER FUNCTION "public"."check_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_slug_redirects"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM org_slug_history
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_slug_redirects"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_slug_redirects"() IS 'Removes expired slug redirect entries. Should be called daily by cron job.';



CREATE OR REPLACE FUNCTION "public"."clear_org_setup_flag"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Only clear if user has the flag set (optimization)
  UPDATE users 
  SET requires_org_setup = false 
  WHERE id = NEW.user_id 
  AND requires_org_setup = true;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."clear_org_setup_flag"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."clear_org_setup_flag"() IS 'Automatically clears requires_org_setup flag when user is added to an organization.';



CREATE OR REPLACE FUNCTION "public"."clear_travel_override"("p_event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  UPDATE events
  SET travel_override = NULL
  WHERE id = p_event_id;
END;
$$;


ALTER FUNCTION "public"."clear_travel_override"("p_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."clear_travel_override"("p_event_id" "uuid") IS 'Clears the travel override, reverting to computed travel status';



CREATE OR REPLACE FUNCTION "public"."coach_has_medical_access"("athlete_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  athlete_org_id UUID;
  coach_medical_access_enabled BOOLEAN;
BEGIN
  -- Get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  IF athlete_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check org settings for coach medical access
  -- TODO: This should check a specific org setting once that table is created
  -- For now, default to FALSE (coaches cannot see medical by default)
  coach_medical_access_enabled := FALSE;
  
  IF NOT coach_medical_access_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is coach for any team the athlete is on
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_id_param
      AND tm.deleted_at IS NULL
      AND t.deleted_at IS NULL
      AND is_coach_for_team(t.id, user_id_param)
  );
END;
$$;


ALTER FUNCTION "public"."coach_has_medical_access"("athlete_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."coach_has_medical_access"("athlete_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user is a coach for the athlete AND the org allows coach medical access.';



CREATE OR REPLACE FUNCTION "public"."complete_payment_processing"("p_payment_id" "uuid", "p_checkout_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$declare
  v_existing_allocs integer;
  v_fee_assignment_id uuid;
  v_amount integer;
  v_paid integer;
  v_balance integer;
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

  -- Manually update each fee_assignment balance (backup in case trigger doesn't fire)
  for v_fee_assignment_id in
    select distinct coalesce(csi.fee_assignment_id, ch.fee_assignment_id) as faid
    from checkout_session_items csi
    left join charges ch on ch.id = csi.charge_id
    where csi.checkout_session_id = p_checkout_session_id
      and coalesce(csi.fee_assignment_id, ch.fee_assignment_id) is not null
  loop
    -- Recalculate balance for this fee_assignment
    select fa.amount_cents,
           coalesce(sum(pa.amount_cents), 0)
      into v_amount, v_paid
    from fee_assignments fa
    left join payment_allocations pa on pa.fee_assignment_id = fa.id
    where fa.id = v_fee_assignment_id
    group by fa.amount_cents;

    v_balance := v_amount - v_paid;

    update fee_assignments
    set
      paid_cents_total = v_paid,
      balance_cents = v_balance,
      status = case
        when v_balance = 0 then 'paid'::fee_assignment_status
        when v_paid > 0 then 'partial'::fee_assignment_status
        else 'unpaid'::fee_assignment_status
      end,
      updated_at = now()
    where id = v_fee_assignment_id;
  end loop;

  update payments
    set status = 'succeeded', paid_at = coalesce(paid_at, now())
  where id = p_payment_id;

  update checkout_sessions
    set status = 'succeeded'
  where id = p_checkout_session_id;
end;$$;


ALTER FUNCTION "public"."complete_payment_processing"("p_payment_id" "uuid", "p_checkout_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_accepted_tryout_registration_to_team_member"("p_registration_id" "uuid", "p_team_id" "uuid", "p_season_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."convert_accepted_tryout_registration_to_team_member"("p_registration_id" "uuid", "p_team_id" "uuid", "p_season_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_athlete_with_guardians"("p_org_id" "uuid", "p_athlete_data" "jsonb", "p_guardians" "jsonb"[] DEFAULT '{}'::"jsonb"[], "p_athlete_sports" "jsonb"[] DEFAULT '{}'::"jsonb"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_athlete_id UUID;
  v_guardian JSONB;
  v_result JSONB;
  v_guardian_results JSONB[] := '{}';
  v_created_by UUID;
  v_sport JSONB;
  v_sport_id UUID;
  v_sport_type TEXT;
  v_sport_exists BOOLEAN;
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
    preferred_name,
    jersey_number,
    medical_notes,
    allergies,
    emergency_contact_name,
    emergency_contact_phone,
    phone,  -- NEW
    email,  -- NEW
    family_id,  -- Still nullable, for backward compatibility
    created_at,
    updated_at
  )
  VALUES (
    TRIM(p_athlete_data->>'first_name'),
    TRIM(p_athlete_data->>'last_name'),
    NULLIF(p_athlete_data->>'birthdate', '')::DATE,
    NULLIF(p_athlete_data->>'gender', ''),
    NULLIF(p_athlete_data->>'preferred_name', ''),
    NULLIF(p_athlete_data->>'jersey_number', ''),
    NULLIF(p_athlete_data->>'medical_notes', ''),
    NULLIF(p_athlete_data->>'allergies', ''),
    NULLIF(p_athlete_data->>'emergency_contact_name', ''),
    NULLIF(p_athlete_data->>'emergency_contact_phone', ''),
    NULLIF(p_athlete_data->>'phone', ''),  -- NEW - empty string becomes NULL
    NULLIF(p_athlete_data->>'email', ''),  -- NEW - empty string becomes NULL
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
  
  -- Link each sport (all must succeed or transaction rolls back)
  FOREACH v_sport IN ARRAY p_athlete_sports LOOP
    -- Extract sport_id and sport_type
    v_sport_id := (v_sport->>'sport_id')::UUID;
    v_sport_type := COALESCE(v_sport->>'sport_type', 'plays');
    
    -- Validate sport_id is provided
    IF v_sport_id IS NULL THEN
      RAISE EXCEPTION 'sport_id is required for each sport';
    END IF;
    
    -- Validate sport_type is valid
    IF v_sport_type NOT IN ('plays', 'interested') THEN
      RAISE EXCEPTION 'sport_type must be "plays" or "interested", got: %', v_sport_type;
    END IF;
    
    -- Validate sport exists and is a system sport
    SELECT EXISTS (
      SELECT 1 FROM sports 
      WHERE id = v_sport_id 
        AND (org_id IS NULL OR is_system = true)
    ) INTO v_sport_exists;
    
    IF NOT v_sport_exists THEN
      RAISE EXCEPTION 'Invalid sport_id: % (must be a system sport)', v_sport_id;
    END IF;
    
    -- Insert athlete sport relationship
    INSERT INTO athlete_sports (
      athlete_id,
      sport_id,
      org_id,
      sport_type
    )
    VALUES (
      v_athlete_id,
      v_sport_id,
      p_org_id,
      v_sport_type
    )
    ON CONFLICT (athlete_id, sport_id, org_id, sport_type) DO NOTHING;
  END LOOP;
  
  -- If team_id and season_id provided, create team membership
  IF p_athlete_data->>'team_id' IS NOT NULL 
     AND p_athlete_data->>'season_id' IS NOT NULL THEN
    INSERT INTO team_memberships (
      athlete_id,
      team_id,
      season_id,
      org_id,
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
    'guardian_count', ARRAY_LENGTH(v_guardian_results, 1),
    'sport_count', ARRAY_LENGTH(p_athlete_sports, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback transaction
    RAISE;
END;
$$;


ALTER FUNCTION "public"."create_athlete_with_guardians"("p_org_id" "uuid", "p_athlete_data" "jsonb", "p_guardians" "jsonb"[], "p_athlete_sports" "jsonb"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_athlete_with_guardians"("p_org_id" "uuid", "p_athlete_data" "jsonb", "p_guardians" "jsonb"[], "p_athlete_sports" "jsonb"[]) IS 'Atomically creates an athlete, links guardians, and links sports. All operations succeed or fail together. Returns athlete_id, guardian linking results, and sport count. Now includes phone and email fields.';



CREATE OR REPLACE FUNCTION "public"."create_child_claim_token"("p_child_id" "uuid", "p_org_id" "uuid", "p_team_id" "uuid", "p_season_id" "uuid", "p_expires_in_days" integer DEFAULT 7) RETURNS TABLE("token" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_child_claim_token"("p_child_id" "uuid", "p_org_id" "uuid", "p_team_id" "uuid", "p_season_id" "uuid", "p_expires_in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_fee_with_assignments"("p_fee_data" "jsonb", "p_assignments" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_fee_id UUID;
  v_org_id UUID;
  v_created_fee JSONB;
  v_assignment JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Extract org_id from fee data for security check
  v_org_id := (p_fee_data->>'org_id')::UUID;

  -- 1. Create the Fee
  INSERT INTO fees (
    org_id,
    season_id,
    title,
    description,
    fee_type,
    amount_cents,
    currency,
    due_date,
    scope,
    status,
    created_by_admin_id,
    allow_partial_payment,
    allow_installments,
    allow_discounts,
    allow_scholarships,
    visibility
  )
  VALUES (
    v_org_id,
    (p_fee_data->>'season_id')::UUID,
    (p_fee_data->>'title'),
    (p_fee_data->>'description'),
    (p_fee_data->>'fee_type')::fee_type,
    (p_fee_data->>'amount_cents')::INTEGER,
    COALESCE(p_fee_data->>'currency', 'usd'),
    (p_fee_data->>'due_date')::DATE,
    (p_fee_data->>'scope')::fee_scope,
    (p_fee_data->>'status')::fee_status,
    (p_fee_data->>'created_by_admin_id')::UUID,
    COALESCE((p_fee_data->>'allow_partial_payment')::BOOLEAN, false),
    COALESCE((p_fee_data->>'allow_installments')::BOOLEAN, false),
    COALESCE((p_fee_data->>'allow_discounts')::BOOLEAN, false),
    COALESCE((p_fee_data->>'allow_scholarships')::BOOLEAN, false),
    COALESCE((p_fee_data->>'visibility')::fee_visibility, 'all_parents')
  )
  RETURNING id INTO v_fee_id;

  -- 2. Create Assignments
  -- Loop through the assignments array
  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    INSERT INTO fee_assignments (
      org_id,
      fee_id,
      athlete_id,
      parent_id,
      amount_cents,
      balance_cents,
      status,
      due_date
    )
    VALUES (
      v_org_id,
      v_fee_id,
      (v_assignment->>'athlete_id')::UUID,
      (v_assignment->>'parent_id')::UUID,
      (p_fee_data->>'amount_cents')::INTEGER, -- Initial amount matches fee
      (p_fee_data->>'amount_cents')::INTEGER, -- Initial balance matches fee
      'unpaid',
      (p_fee_data->>'due_date')::DATE
    );
    v_count := v_count + 1;
  END LOOP;

  -- Return the created fee ID and count
  RETURN jsonb_build_object(
    'fee_id', v_fee_id,
    'assignments_created', v_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;


ALTER FUNCTION "public"."create_fee_with_assignments"("p_fee_data" "jsonb", "p_assignments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_join_link"("p_org_id" "uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_auto_approve" boolean DEFAULT false, "p_expires_in_days" integer DEFAULT 7) RETURNS TABLE("token" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_join_link"("p_org_id" "uuid", "p_team_id" "uuid", "p_auto_approve" boolean, "p_expires_in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_org_payment_policy_for_new_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO org_payment_policies (
    org_id,
    require_offline_only,
    allow_partial_payments,
    allow_installments,
    allow_discounts,
    allow_scholarships,
    allow_late_fees,
    require_purchase_order_ref
  )
  VALUES (
    NEW.id,
    false,
    true,
    true,
    true,
    true,
    false,
    false
  )
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_org_payment_policy_for_new_org"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_org_payment_policy_for_new_org"() IS 'Creates a default org_payment_policies row when a new organization is inserted';



CREATE OR REPLACE FUNCTION "public"."create_org_stream_channel"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    channel_id TEXT;
BEGIN
    -- Generate Stream channel ID
    channel_id := 'org:' || NEW.id::TEXT;
    
    -- Insert stream_channels record
    INSERT INTO stream_channels (
        stream_channel_id,
        org_id,
        channel_type
    ) VALUES (
        channel_id,
        NEW.id,
        'org'
    );
    
    -- Insert metadata
    INSERT INTO stream_channel_metadata (
        channel_id,
        name,
        description
    ) VALUES (
        (SELECT id FROM stream_channels WHERE stream_channel_id = channel_id),
        NEW.name || ' Organization',
        'Organization-wide huddle for ' || NEW.name
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_org_stream_channel"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_org_stream_channel"() IS 'Auto-creates a Stream channel when an organization is created';



CREATE OR REPLACE FUNCTION "public"."create_organization_invite"("p_org_id" "uuid", "p_email" "text", "p_roles" "public"."org_member_role"[] DEFAULT ARRAY['parent'::"public"."org_member_role"], "p_expires_in_days" integer DEFAULT 7) RETURNS TABLE("invite_token" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_organization_invite"("p_org_id" "uuid", "p_email" "text", "p_roles" "public"."org_member_role"[], "p_expires_in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization_invite"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."org_member_role" DEFAULT 'parent'::"public"."org_member_role", "p_expires_in_days" integer DEFAULT 7) RETURNS TABLE("invite_token" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_organization_invite"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."org_member_role", "p_expires_in_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_organization_invite"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."org_member_role", "p_expires_in_days" integer) IS 'Creates an invite token for a user to join an organization. Only org admins can call this.';



CREATE OR REPLACE FUNCTION "public"."create_rsvps_for_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.rsvp_enabled = true AND NEW.rsvp_type = 'athlete' THEN
    INSERT INTO event_rsvps (event_id, athlete_id, status)
    SELECT
      NEW.id,
      tm.athlete_id,
      'unknown'
    FROM team_memberships tm
    WHERE tm.team_id = NEW.team_id
      AND tm.season_id = NEW.season_id
      AND tm.status = 'active'
    ON CONFLICT (event_id, athlete_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_rsvps_for_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_rsvps_for_new_team_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO event_rsvps (event_id, athlete_id, status)
    SELECT
      e.id,
      NEW.athlete_id,
      'unknown'
    FROM events e
    WHERE e.team_id = NEW.team_id
      AND e.season_id = NEW.season_id
      AND e.rsvp_enabled = true
      AND e.rsvp_type = 'athlete'
      AND e.start_time > NOW()
    ON CONFLICT (event_id, athlete_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_rsvps_for_new_team_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_team_stream_channel"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    channel_id TEXT;
BEGIN
    -- Generate Stream channel ID
    channel_id := 'team:' || NEW.id::TEXT;
    
    -- Insert stream_channels record
    INSERT INTO stream_channels (
        stream_channel_id,
        org_id,
        team_id,
        channel_type
    ) VALUES (
        channel_id,
        NEW.org_id,
        NEW.id,
        'team'
    );
    
    -- Insert metadata
    INSERT INTO stream_channel_metadata (
        channel_id,
        name,
        description
    ) VALUES (
        (SELECT id FROM stream_channels WHERE stream_channel_id = channel_id),
        NEW.name,
        'Team huddle for ' || NEW.name
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_team_stream_channel"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_team_stream_channel"() IS 'Auto-creates a Stream channel when a team is created';



CREATE OR REPLACE FUNCTION "public"."create_uniform_kit"("p_team_id" "uuid", "p_season_id" "uuid", "p_name" "text", "p_deadline_at" timestamp with time zone, "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_uniform_kit"("p_team_id" "uuid", "p_season_id" "uuid", "p_name" "text", "p_deadline_at" timestamp with time zone, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_ticket_capacity"("p_ticket_type_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_capacity INTEGER;
BEGIN
  -- Lock row and decrement capacity
  UPDATE ticket_types
  SET capacity_remaining = capacity_remaining - p_quantity,
      updated_at = NOW()
  WHERE id = p_ticket_type_id
    AND capacity_total IS NOT NULL
    AND capacity_remaining IS NOT NULL
    AND capacity_remaining >= p_quantity
  RETURNING capacity_remaining INTO v_current_capacity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient capacity or invalid ticket type';
  END IF;

  IF v_current_capacity < 0 THEN
    RAISE EXCEPTION 'Capacity would go negative';
  END IF;
END;
$$;


ALTER FUNCTION "public"."decrement_ticket_capacity"("p_ticket_type_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_travel_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_event_type TEXT;
  v_dedupe_key TEXT;
  v_should_update BOOLEAN := FALSE;
  v_resolved_contacts JSONB;
BEGIN
  -- Publish
  IF TG_OP = 'UPDATE' AND OLD.status <> 'published' AND NEW.status = 'published' THEN
    v_event_type := 'travel_published';
    v_dedupe_key := 'travel:' || NEW.id::text || ':published:' || COALESCE(NEW.updated_at::text, now()::text);
  -- Cancel
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    v_event_type := 'travel_cancelled';
    v_dedupe_key := 'travel:' || NEW.id::text || ':cancelled:' || COALESCE(NEW.updated_at::text, now()::text);
  -- Update (only when published and relevant fields changed)
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'published' THEN
    v_should_update :=
      (COALESCE(OLD.title,'') <> COALESCE(NEW.title,'')) OR
      (COALESCE(OLD.location,'') <> COALESCE(NEW.location,'')) OR
      (OLD.start_date <> NEW.start_date) OR
      (OLD.end_date <> NEW.end_date) OR
      (COALESCE(OLD.venue_name,'') <> COALESCE(NEW.venue_name,'')) OR
      (COALESCE(OLD.venue_address,'') <> COALESCE(NEW.venue_address,'')) OR
      (COALESCE(OLD.hotel_name,'') <> COALESCE(NEW.hotel_name,'')) OR
      (COALESCE(OLD.hotel_address,'') <> COALESCE(NEW.hotel_address,'')) OR
      (COALESCE(OLD.hotel_phone,'') <> COALESCE(NEW.hotel_phone,'')) OR
      (COALESCE(OLD.hotel_confirmation,'') <> COALESCE(NEW.hotel_confirmation,'')) OR
      (COALESCE(OLD.maps_url,'') <> COALESCE(NEW.maps_url,'')) OR
      (COALESCE(OLD.itinerary_file_path,'') <> COALESCE(NEW.itinerary_file_path,'')) OR
      (COALESCE(OLD.meeting_locations::text,'') <> COALESCE(NEW.meeting_locations::text,''));

    IF v_should_update THEN
      v_event_type := 'travel_updated';
      v_dedupe_key := 'travel:' || NEW.id::text || ':updated:' || COALESCE(NEW.updated_at::text, now()::text);
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  v_resolved_contacts := public.resolve_travel_contacts_for_plan(NEW.id);

  INSERT INTO public.notification_outbox (event_type, dedupe_key, travel_plan_id, team_id, season_id, payload)
  VALUES (
    v_event_type,
    v_dedupe_key,
    NEW.id,
    NEW.team_id,
    NEW.season_id,
    jsonb_build_object(
      'title', NEW.title,
      'location', NEW.location,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status,
      'resolved_contacts', v_resolved_contacts
    )
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enqueue_travel_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_gallery_id_from_path"("storage_path" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
  path_parts TEXT[];
  gallery_id_str TEXT;
BEGIN
  -- Split path by /
  path_parts := string_to_array(storage_path, '/');
  
  -- Check if path matches pattern: orgs/{org_id}/galleries/{gallery_id}/...
  IF array_length(path_parts, 1) >= 4 
     AND path_parts[1] = 'orgs' 
     AND path_parts[3] = 'galleries' THEN
    gallery_id_str := path_parts[4];
    
    -- Validate UUID format
    IF gallery_id_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN gallery_id_str::UUID;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$_$;


ALTER FUNCTION "public"."extract_gallery_id_from_path"("storage_path" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."extract_gallery_id_from_path"("storage_path" "text") IS 'Extracts gallery_id UUID from storage path (orgs/{org_id}/galleries/{gallery_id}/...).';



CREATE OR REPLACE FUNCTION "public"."find_guardian_by_email"("p_email" "text", "p_org_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "display_name" "text", "phone" "text", "linked_athletes" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_normalized_email TEXT;
BEGIN
  v_normalized_email := normalize_email(p_email);
  
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
    AND ag.org_id = p_org_id 
    AND ag.status = 'active'
  LEFT JOIN athletes a ON a.id = ag.athlete_id 
    AND a.deleted_at IS NULL
  WHERE normalize_email(u.email) = v_normalized_email
  GROUP BY u.id, u.email, u.display_name, u.phone;
END;
$$;


ALTER FUNCTION "public"."find_guardian_by_email"("p_email" "text", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_guardian_by_email"("p_email" "text", "p_org_id" "uuid") IS 'Finds guardian by email with linked athletes. Uses org_id column.';



CREATE OR REPLACE FUNCTION "public"."format_entry_code"("code" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := normalize_entry_code(code);
  -- Format as XXXX-XXXX-XXXX if 12 chars, or XXXX-XXXX if 8 chars, etc.
  IF length(normalized) >= 12 THEN
    RETURN substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4) || '-' || substr(normalized, 9);
  ELSIF length(normalized) >= 8 THEN
    RETURN substr(normalized, 1, 4) || '-' || substr(normalized, 5);
  ELSE
    RETURN normalized;
  END IF;
END;
$$;


ALTER FUNCTION "public"."format_entry_code"("code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."format_event_location_address"("p_location_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."format_event_location_address"("p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_entry_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  safe_alphabet TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code_length INTEGER := 8 + floor(random() * 3)::INTEGER; -- 8-10 chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..code_length LOOP
    result := result || substr(safe_alphabet, floor(random() * length(safe_alphabet))::INTEGER + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_entry_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := UPPER(substr(md5(random()::text), 1, 8));
  ELSE
    -- Normalize to uppercase if provided
    NEW.invite_code := UPPER(TRIM(NEW.invite_code));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recurring_event_instances"("p_pattern_id" "uuid", "p_start_date" "date", "p_template_event_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_recurring_event_instances"("p_pattern_id" "uuid", "p_start_date" "date", "p_template_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_sport_slug"("sport_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(sport_name),
        '[^a-zA-Z0-9\s&]', '', 'g'  -- Remove special characters except spaces and &
      ),
      '\s+', '-', 'g'  -- Replace spaces and multiple spaces with single dash
    )
  );
END;
$$;


ALTER FUNCTION "public"."generate_sport_slug"("sport_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "email" "text", "phone" "text", "display_name" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "organizations" json, "roles" "text"[], "is_platform_admin" boolean, "last_sign_in_at" timestamp with time zone, "email_confirmed" boolean, "is_disabled" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  SELECT
    u.id,
    u.email,
    u.phone,
    u.display_name,
    u.created_at,
    u.updated_at,
    (
      SELECT COALESCE(
        json_agg(json_build_object('org_id', om.org_id, 'org_name', org.name, 'role', om.role)),
        '[]'::json
      )
      FROM organization_members om
      JOIN organizations org ON org.id = om.org_id
      WHERE om.user_id = u.id
    ) AS organizations,
    (
      SELECT COALESCE(array_agg(DISTINCT om.role::text), ARRAY[]::text[])
      FROM organization_members om
      WHERE om.user_id = u.id
    ) AS roles,
    EXISTS (SELECT 1 FROM platform_admins pa2 WHERE pa2.user_id = u.id) AS is_platform_admin,
    (SELECT au.created_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
    (SELECT (au.email_confirmed_at IS NOT NULL) FROM auth.users au WHERE au.id = u.id) AS email_confirmed,
    (SELECT (au.banned_until IS NOT NULL AND au.banned_until > now()) FROM auth.users au WHERE au.id = u.id) AS is_disabled
  FROM users u
  WHERE EXISTS (
    SELECT 1
    FROM platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;


ALTER FUNCTION "public"."get_admin_users"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_athlete_family_details"("p_athlete_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_family_athletes UUID[];
  v_guardian_ids UUID[];
  v_result JSONB;
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
    AND ag.org_id = p_org_id
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
  INTO v_result
  FROM athletes a
  WHERE a.id = ANY(v_family_athletes)
    AND a.deleted_at IS NULL;
  
  RETURN jsonb_build_object(
    'athletes', v_result,
    'guardian_ids', COALESCE(v_guardian_ids, ARRAY[]::UUID[])
  );
END;
$$;


ALTER FUNCTION "public"."get_athlete_family_details"("p_athlete_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_athlete_guardians"("p_athlete_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("guardian_id" "uuid", "user_id" "uuid", "email" "text", "display_name" "text", "phone" "text", "relationship_type" "text", "status" "public"."athlete_guardian_status", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT 
    ag.id AS guardian_id,
    u.id AS user_id,
    u.email,
    u.display_name,
    u.phone,
    'parent' AS relationship_type,
    ag.status,
    ag.created_at
  FROM athlete_guardians ag
  JOIN users u ON u.id = ag.user_id
  WHERE ag.athlete_id = p_athlete_id
    AND ag.org_id = p_org_id
  ORDER BY ag.created_at ASC;
$$;


ALTER FUNCTION "public"."get_athlete_guardians"("p_athlete_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_athlete_guardians"("p_athlete_id" "uuid", "p_org_id" "uuid") IS 'Returns all guardians for an athlete. Uses org_id column.';



CREATE OR REPLACE FUNCTION "public"."get_athletes_with_guardian_status"("p_org_id" "uuid", "p_limit" integer DEFAULT 1000, "p_offset" integer DEFAULT 0) RETURNS TABLE("athlete_id" "uuid", "first_name" "text", "last_name" "text", "birthdate" "date", "gender" "text", "preferred_name" "text", "jersey_number" "text", "medical_notes" "text", "allergies" "text", "emergency_contact_name" "text", "emergency_contact_phone" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "deleted_at" timestamp with time zone, "family_id" "uuid", "has_active_guardian" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id AS athlete_id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender,
    a.preferred_name,
    a.jersey_number,
    a.medical_notes,
    a.allergies,
    a.emergency_contact_name,
    a.emergency_contact_phone,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    a.family_id,
    -- Check if athlete has active guardian
    EXISTS (
      SELECT 1
      FROM athlete_guardians ag
      JOIN users u ON u.id = ag.user_id
      JOIN auth.users au ON au.id = u.id
      WHERE ag.athlete_id = a.id
        AND ag.org_id = p_org_id
        AND ag.status = 'active'
        AND au.deleted_at IS NULL
        AND (au.banned_until IS NULL OR au.banned_until < NOW())
    ) AS has_active_guardian
  FROM athletes a
  WHERE a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_athletes_with_guardian_status"("p_org_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_athletes_with_guardian_status"("p_org_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Returns athletes with their guardian status. More efficient than calling athlete_has_active_guardian 
   for each athlete individually. Used by All Athletes table. SECURITY DEFINER to access auth.users.';



CREATE OR REPLACE FUNCTION "public"."get_channel_members"("channel_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        COALESCE(om.user_id, ag.user_id) AS user_id,
        CASE
            WHEN om.role = 'coach' THEN 'coach'
            WHEN om.role = 'org_admin' THEN 'org_admin'
            WHEN ag.user_id IS NOT NULL THEN 'guardian'
            ELSE 'unknown'
        END AS role
    FROM stream_channels sc
    LEFT JOIN teams t ON t.id = sc.team_id
    LEFT JOIN team_memberships tm ON tm.team_id = t.id
    LEFT JOIN athletes a ON a.id = tm.athlete_id
    LEFT JOIN athlete_guardians ag ON ag.athlete_id = a.id AND ag.status = 'active'
    LEFT JOIN organization_members om ON om.org_id = sc.org_id
    WHERE sc.id = channel_uuid
    AND (
        (sc.channel_type = 'team' AND (ag.user_id IS NOT NULL OR om.role IN ('coach', 'org_admin'))) OR
        (sc.channel_type = 'org' AND om.role = 'org_admin') OR
        (sc.channel_type = 'dm' AND (sc.user_id_1 = auth.uid() OR sc.user_id_2 = auth.uid()))
    );
END;
$$;


ALTER FUNCTION "public"."get_channel_members"("channel_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_channel_members"("channel_uuid" "uuid") IS 'Returns all members of a Stream channel with their roles for permission checking';



CREATE OR REPLACE FUNCTION "public"."get_derived_family_for_athlete"("p_athlete_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_derived_family_for_athlete"("p_athlete_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_derived_family_for_athlete"("p_athlete_id" "uuid", "p_org_id" "uuid") IS 'Returns complete family structure for an athlete including all family members and guardians. Family is derived from shared guardian relationships.';



CREATE OR REPLACE FUNCTION "public"."get_environment_from_url"() RETURNS "public"."feature_flag_environment"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_environment_from_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_location_maps_url"("p_location_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_event_location_maps_url"("p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_rsvp_summary"("p_event_id" "uuid") RETURNS TABLE("total_children" integer, "going_count" integer, "late_count" integer, "not_going_count" integer, "unknown_count" integer, "response_rate" numeric)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_event_rsvp_summary"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_athletes_via_guardians"("p_athlete_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("athlete_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE family_athletes AS (
    -- Base case: athletes directly connected via shared guardians
    SELECT DISTINCT ag2.athlete_id
    FROM athlete_guardians ag1
    JOIN athlete_guardians ag2 ON ag1.user_id = ag2.user_id
    WHERE ag1.athlete_id = p_athlete_id
      AND ag1.org_id = p_org_id
      AND ag2.org_id = p_org_id
      AND ag1.status = 'active'
      AND ag2.status = 'active'
    
    UNION
    
    -- Recursive case: find athletes connected to already-found athletes
    SELECT DISTINCT ag3.athlete_id
    FROM family_athletes fa
    JOIN athlete_guardians ag2 ON fa.athlete_id = ag2.athlete_id
    JOIN athlete_guardians ag3 ON ag2.user_id = ag3.user_id
    WHERE ag2.org_id = p_org_id
      AND ag3.org_id = p_org_id
      AND ag2.status = 'active'
      AND ag3.status = 'active'
  )
  SELECT DISTINCT fa.athlete_id
  FROM family_athletes fa;
END;
$$;


ALTER FUNCTION "public"."get_family_athletes_via_guardians"("p_athlete_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_family_athletes_via_guardians"("p_athlete_id" "uuid", "p_org_id" "uuid") IS 'Returns family athletes via shared guardians. Uses org_id column.';



CREATE OR REPLACE FUNCTION "public"."get_feature_gate"("p_org_id" "uuid", "p_user_id" "uuid", "p_feature_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_feature_id UUID;
  v_feature feature_entitlements%ROWTYPE;
  v_tier_key TEXT;
  v_license_tier_id UUID;
  v_user_role TEXT := 'parent'; -- default
  v_is_platform_admin BOOLEAN := FALSE;
  v_tier_assignment tier_feature_assignments%ROWTYPE;
  v_org_override entitlement_overrides%ROWTYPE;
  v_user_override entitlement_overrides%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
  v_gate_action TEXT;
  v_reason_code TEXT;
  v_limit_value INTEGER;
BEGIN
  -- Check if user is platform admin
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = p_user_id
  ) INTO v_is_platform_admin;

  -- Get feature details
  SELECT * INTO v_feature
  FROM feature_entitlements
  WHERE feature_key = p_feature_key
    AND archived_at IS NULL;

  -- Feature not found
  IF v_feature.id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', 'hide',
      'reason_code', 'not_found',
      'feature_key', p_feature_key
    );
  END IF;

  -- Platform admin only feature
  IF v_feature.platform_admin_only = TRUE THEN
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'hide'),
        'reason_code', 'platform_admin_only',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- System feature (always allowed)
  IF v_feature.is_system_feature = TRUE THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'gate_action', NULL,
      'reason_code', 'system_feature',
      'feature_key', p_feature_key
    );
  END IF;

  -- No org context - allow for platform admins browsing, deny for others
  IF p_org_id IS NULL THEN
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'no_organization',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- Get org's license tier (normalize plan names to tier keys)
  SELECT 
    CASE o.license_plan::text
      WHEN 'starter' THEN 'basic'
      WHEN 'standard' THEN 'power'
      WHEN 'pro' THEN 'power'
      ELSE o.license_plan::text
    END INTO v_tier_key
  FROM organizations o
  WHERE o.id = p_org_id;

  IF v_tier_key IS NULL THEN
    -- Org not found or no license plan
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'no_organization',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- Get license tier ID
  SELECT id INTO v_license_tier_id
  FROM license_tiers
  WHERE tier_key = v_tier_key AND status = 'active';

  -- =========================================================================
  -- FIX: Handle case where license tier record doesn't exist
  -- =========================================================================
  IF v_license_tier_id IS NULL THEN
    -- License tier not found in license_tiers table
    -- Platform admins can still access
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    -- For regular users, fail with informative reason
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'license_tier_not_configured',
      'feature_key', p_feature_key,
      'tier_key', v_tier_key
    );
  END IF;

  -- Get user's role in org
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE org_id = p_org_id AND user_id = p_user_id;

  -- Default to parent if no membership found
  IF v_user_role IS NULL THEN
    -- Platform admins can still access
    IF v_is_platform_admin THEN
      v_user_role := 'org_admin'; -- Treat as admin for gate purposes
    ELSE
      v_user_role := 'parent';
    END IF;
  END IF;

  -- Check user override first (highest priority)
  SELECT * INTO v_user_override
  FROM entitlement_overrides
  WHERE target_type = 'user'
    AND target_id = p_user_id
    AND feature_entitlement_id = v_feature.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_user_override.id IS NOT NULL THEN
    IF v_user_override.override_action = 'disable' THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'disabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'enable' THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'set_limit' THEN
      v_limit_value := v_user_override.limit_value;
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- Check org override (second priority)
  SELECT * INTO v_org_override
  FROM entitlement_overrides
  WHERE target_type = 'organization'
    AND target_id = p_org_id
    AND feature_entitlement_id = v_feature.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_org_override.id IS NOT NULL THEN
    IF v_org_override.override_action = 'disable' THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'disabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'enable' THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'set_limit' THEN
      v_limit_value := v_org_override.limit_value;
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- Check tier + role assignment
  SELECT * INTO v_tier_assignment
  FROM tier_feature_assignments
  WHERE license_tier_id = v_license_tier_id
    AND feature_entitlement_id = v_feature.id
    AND included = TRUE;

  IF v_tier_assignment.id IS NULL THEN
    -- Not in tier, but platform admins can still access
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'license_tier',
      'feature_key', p_feature_key
    );
  END IF;

  -- Check role permission within tier assignment
  v_allowed := CASE v_user_role
    WHEN 'org_admin' THEN COALESCE(v_tier_assignment.role_admin, TRUE)
    WHEN 'coach' THEN COALESCE(v_tier_assignment.role_coach, TRUE)
    WHEN 'parent' THEN COALESCE(v_tier_assignment.role_parent, FALSE)
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    -- Platform admins bypass role restrictions
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'role',
      'feature_key', p_feature_key,
      'user_role', v_user_role
    );
  END IF;

  -- Feature is allowed by tier + role
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'gate_action', NULL,
    'reason_code', 'tier_assignment',
    'feature_key', p_feature_key,
    'limit_value', v_tier_assignment.limit_value
  );

EXCEPTION WHEN OTHERS THEN
  -- Fail open with overlay on any error for non-critical features
  -- Log the error for debugging
  RAISE WARNING 'get_feature_gate error for % : %', p_feature_key, SQLERRM;
  RETURN jsonb_build_object(
    'allowed', FALSE,
    'gate_action', 'overlay',
    'reason_code', 'error',
    'feature_key', p_feature_key,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."get_feature_gate"("p_org_id" "uuid", "p_user_id" "uuid", "p_feature_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_feature_gate"("p_org_id" "uuid", "p_user_id" "uuid", "p_feature_key" "text") IS 'Resolves whether a user can access a feature in an organization context. 
   Checks platform admin status, system features, overrides, tier assignments, and roles.
   Returns JSONB with allowed, gate_action, reason_code, and optional limit_value.
   Fixed to handle NULL license tier IDs when tier record does not exist.';



CREATE OR REPLACE FUNCTION "public"."get_feature_gates"("p_org_id" "uuid", "p_user_id" "uuid", "p_feature_keys" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_key TEXT;
  v_gate JSONB;
BEGIN
  -- Handle null or empty array
  IF p_feature_keys IS NULL OR array_length(p_feature_keys, 1) IS NULL THEN
    RETURN v_result;
  END IF;

  -- Resolve each feature key
  FOREACH v_key IN ARRAY p_feature_keys
  LOOP
    v_gate := get_feature_gate(p_org_id, p_user_id, v_key);
    v_result := v_result || jsonb_build_object(v_key, v_gate);
  END LOOP;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- On any error, return partial results
  RAISE WARNING 'get_feature_gates error: %', SQLERRM;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_feature_gates"("p_org_id" "uuid", "p_user_id" "uuid", "p_feature_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_feature_gates"("p_org_id" "uuid", "p_user_id" "uuid", "p_feature_keys" "text"[]) IS 'Batch version of get_feature_gate. Resolves multiple feature keys in one call.
   Returns JSONB object with feature_key as keys and gate results as values.';



CREATE OR REPLACE FUNCTION "public"."get_guardian_athletes"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("athlete_id" "uuid", "first_name" "text", "last_name" "text", "birthdate" "date", "gender" "text", "relationship_type" "text", "status" "public"."athlete_guardian_status")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT 
    a.id AS athlete_id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender,
    'parent' AS relationship_type,
    ag.status
  FROM athlete_guardians ag
  JOIN athletes a ON a.id = ag.athlete_id
  WHERE ag.user_id = p_user_id
    AND ag.org_id = p_org_id
    AND a.deleted_at IS NULL
  ORDER BY a.first_name, a.last_name;
$$;


ALTER FUNCTION "public"."get_guardian_athletes"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_guardian_athletes"("p_user_id" "uuid", "p_org_id" "uuid") IS 'Returns all athletes for a guardian. Uses org_id column.';



CREATE OR REPLACE FUNCTION "public"."get_guardian_attachment_requests_for_admin"("p_org_id" "uuid", "p_status" "public"."guardian_attachment_request_status" DEFAULT NULL::"public"."guardian_attachment_request_status") RETURNS TABLE("id" "uuid", "org_id" "uuid", "athlete_id" "uuid", "athlete_first_name" "text", "athlete_last_name" "text", "athlete_birthdate" "date", "requested_by_user_id" "uuid", "requester_email" "text", "requester_display_name" "text", "status" "public"."guardian_attachment_request_status", "reviewed_by_user_id" "uuid", "reviewer_email" "text", "reviewer_display_name" "text", "reviewed_at" timestamp with time zone, "decision_reason" "text", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is org admin
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN;
  END IF;
  
  -- Return enriched request data
  RETURN QUERY
  SELECT 
    gar.id,
    gar.org_id,
    gar.athlete_id,
    a.first_name AS athlete_first_name,
    a.last_name AS athlete_last_name,
    a.birthdate AS athlete_birthdate,
    gar.requested_by_user_id,
    u.email AS requester_email,
    u.display_name AS requester_display_name,
    gar.status,
    gar.reviewed_by_user_id,
    reviewer.email AS reviewer_email,
    reviewer.display_name AS reviewer_display_name,
    gar.reviewed_at,
    gar.decision_reason,
    gar.expires_at,
    gar.created_at,
    gar.updated_at
  FROM guardian_attachment_requests gar
  JOIN athletes a ON a.id = gar.athlete_id
  JOIN users u ON u.id = gar.requested_by_user_id
  LEFT JOIN users reviewer ON reviewer.id = gar.reviewed_by_user_id
  WHERE gar.org_id = p_org_id
    AND (p_status IS NULL OR gar.status = p_status)
  ORDER BY gar.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_guardian_attachment_requests_for_admin"("p_org_id" "uuid", "p_status" "public"."guardian_attachment_request_status") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_guardian_attachment_requests_for_admin"("p_org_id" "uuid", "p_status" "public"."guardian_attachment_request_status") IS 'Returns guardian attachment requests with enriched athlete and user data for admin review. Only accessible to org admins.';



CREATE OR REPLACE FUNCTION "public"."get_guardian_video_athletes"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT DISTINCT ag.athlete_id
  FROM public.athlete_guardians ag
  WHERE ag.user_id = p_user_id
    AND ag.org_id = p_org_id
    AND ag.status = 'active';
$$;


ALTER FUNCTION "public"."get_guardian_video_athletes"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invite_details"("p_token" "text") RETURNS TABLE("valid" boolean, "organization_name" "text", "role" "public"."org_member_role", "email" "text", "expires_at" timestamp with time zone, "expired" boolean, "already_accepted" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_invite_details"("p_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_invite_details"("p_token" "text") IS 'Gets invite details for display on the accept invite page. Can be called by anyone with the token.';



CREATE OR REPLACE FUNCTION "public"."get_org_photo_storage_limit_bytes"("p_org_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_plan TEXT;
BEGIN
  -- Prefer org_licenses.plan; fallback to organizations.license_plan
  SELECT COALESCE(ol.plan::text, o.license_plan::text)
  INTO v_plan
  FROM organizations o
  LEFT JOIN org_licenses ol ON ol.org_id = o.id
  WHERE o.id = p_org_id;

  -- Map plan to bytes: starter/trial/null = 1GB, standard = 5GB, pro = 20GB
  RETURN CASE
    WHEN v_plan = 'pro' THEN 20::BIGINT * 1024 * 1024 * 1024
    WHEN v_plan = 'standard' THEN 5::BIGINT * 1024 * 1024 * 1024
    ELSE 1::BIGINT * 1024 * 1024 * 1024
  END;
END;
$$;


ALTER FUNCTION "public"."get_org_photo_storage_limit_bytes"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_org_photo_storage_limit_bytes"("p_org_id" "uuid") IS 'Returns photo storage limit in bytes for an org based on license plan (org_licenses.plan or organizations.license_plan).';



CREATE OR REPLACE FUNCTION "public"."get_organization_users"("target_org_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "phone" "text", "display_name" "text", "roles" "text"[], "is_platform_admin" boolean, "last_sign_in_at" timestamp with time zone, "email_confirmed" boolean, "is_disabled" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Check caller is platform admin
  IF NOT EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: not a platform admin';
  END IF;

  -- Return users for this organization
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.display_name,
    ARRAY_AGG(DISTINCT om.role::TEXT) FILTER (WHERE om.org_id = target_org_id) AS roles,
    EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id) AS is_platform_admin,
    -- Fix: Use explicit alias for auth.users columns to avoid ambiguity
    (SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = u.id) AS last_sign_in_at,
    (SELECT au.email_confirmed_at IS NOT NULL FROM auth.users au WHERE au.id = u.id) AS email_confirmed,
    (SELECT au.banned_until IS NOT NULL AND au.banned_until > NOW() FROM auth.users au WHERE au.id = u.id) AS is_disabled,
    u.created_at,
    u.updated_at
  FROM users u
  INNER JOIN organization_members om ON om.user_id = u.id
  WHERE om.org_id = target_org_id
  GROUP BY u.id, u.email, u.phone, u.display_name, u.created_at, u.updated_at
  ORDER BY u.display_name, u.email;
END;
$$;


ALTER FUNCTION "public"."get_organization_users"("target_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_users"("target_org_id" "uuid") IS 'Platform admin function: Returns all users for a specific organization with their roles. More efficient than filtering admin_users view. Requires platform admin role.';



CREATE OR REPLACE FUNCTION "public"."get_orphaned_athletes"("p_org_id" "uuid") RETURNS TABLE("athlete_id" "uuid", "first_name" "text", "last_name" "text", "birthdate" "date", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT 
    a.id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.created_at
  FROM athletes a
  LEFT JOIN athlete_guardians ag ON ag.athlete_id = a.id 
    AND ag.org_id = p_org_id 
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
$$;


ALTER FUNCTION "public"."get_orphaned_athletes"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_orphaned_athletes"("p_org_id" "uuid") IS 'Returns athletes without active guardians. Uses org_id column.';



CREATE OR REPLACE FUNCTION "public"."get_parent_invite_details"("p_token" "text") RETURNS TABLE("valid" boolean, "email" "text", "athlete_id" "uuid", "org_id" "uuid", "expired" boolean, "already_accepted" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT
    pi.id,
    pi.org_id,
    pi.athlete_id,
    pi.email,
    pi.expires_at,
    pi.status
  INTO v_invite
  FROM parent_invites pi
  WHERE pi.token = p_token;
  
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::UUID, false, false, 'Invalid invite token';
    RETURN;
  END IF;
  
  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT false, v_invite.email, v_invite.athlete_id, v_invite.org_id, false, true, 'Invite already accepted';
    RETURN;
  END IF;
  
  IF v_invite.status <> 'pending' THEN
    RETURN QUERY SELECT false, v_invite.email, v_invite.athlete_id, v_invite.org_id, false, false, 'Invite is not pending';
    RETURN;
  END IF;
  
  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_invite.email, v_invite.athlete_id, v_invite.org_id, true, false, 'Invite expired';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_invite.email, v_invite.athlete_id, v_invite.org_id, false, false, 'Valid invite';
END;
$$;


ALTER FUNCTION "public"."get_parent_invite_details"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_guardian_attachment_count"("p_org_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_current_user UUID;
  v_count INTEGER;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is org admin
  IF NOT (user_is_org_admin(v_current_user, p_org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN 0;
  END IF;
  
  -- Count pending requests
  SELECT COUNT(*) INTO v_count
  FROM guardian_attachment_requests
  WHERE org_id = p_org_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_pending_guardian_attachment_count"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_guardian_attachment_count"("p_org_id" "uuid") IS 'Returns count of pending guardian attachment requests for an organization. Only accessible to org admins.';



CREATE OR REPLACE FUNCTION "public"."get_pending_invites_for_user"() RETURNS TABLE("invite_token" "text", "organization_name" "text", "role" "public"."org_member_role", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_pending_invites_for_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_invites_for_user"() IS 'Gets all pending invites for the current user based on their email.';



CREATE OR REPLACE FUNCTION "public"."get_platform_admin_role"() RETURNS "public"."platform_admin_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT role FROM platform_admins WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_platform_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_org_theme"("org_id_input" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT theme_id 
    FROM organization_settings 
    WHERE org_id = org_id_input
  );
END;
$$;


ALTER FUNCTION "public"."get_public_org_theme"("org_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schema_columns"() RETURNS TABLE("table_name" "text", "column_name" "text", "data_type" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'information_schema', 'public'
    AS $$
  SELECT table_name::TEXT, column_name::TEXT, data_type::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public';
$$;


ALTER FUNCTION "public"."get_schema_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schema_hash"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT md5(string_agg(table_name || column_name || data_type, '' ORDER BY table_name, column_name))
  INTO v_hash
  FROM information_schema.columns
  WHERE table_schema = 'public';
  
  RETURN v_hash;
END;
$$;


ALTER FUNCTION "public"."get_schema_hash"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schema_tables"() RETURNS TABLE("table_name" "text", "table_type" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'information_schema', 'public'
    AS $$
  SELECT table_name::TEXT, table_type::TEXT
  FROM information_schema.tables
  WHERE table_schema = 'public';
$$;


ALTER FUNCTION "public"."get_schema_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_travel_events_for_team"("p_team_id" "uuid", "p_upcoming_only" boolean DEFAULT true) RETURNS TABLE("event_id" "uuid", "title" "text", "start_time" timestamp with time zone, "end_time" timestamp with time zone, "hotel_name" "text", "hotel_address" "text", "location_city" "text", "location_state" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_travel_events_for_team"("p_team_id" "uuid", "p_upcoming_only" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_travel_events_for_team"("p_team_id" "uuid", "p_upcoming_only" boolean) IS 'Returns travel events for a given team, optionally filtering to upcoming only';



CREATE OR REPLACE FUNCTION "public"."get_uniform_kit_roster"("p_kit_id" "uuid") RETURNS TABLE("child_id" "uuid", "first_name" "text", "last_name" "text", "team_id" "uuid", "season_id" "uuid", "kit_id" "uuid", "kit_name" "text", "deadline_at" timestamp with time zone, "kit_locked_at" timestamp with time zone, "submission_id" "uuid", "submission_status" "public"."uniform_submission_status", "submitted_at" timestamp with time zone, "submission_locked_at" timestamp with time zone, "fulfilled_at" timestamp with time zone, "items" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_uniform_kit_roster"("p_kit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_actor_role"("p_user_id" "uuid") RETURNS "public"."event_actor_role"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_actor_role"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_actor_role"("p_user_id" "uuid") IS 'Helper function to determine actor role from user ID.';



CREATE OR REPLACE FUNCTION "public"."get_user_children"("check_user_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT child_id
  FROM child_guardians
  WHERE user_id = check_user_id
    AND status = 'active';
$$;


ALTER FUNCTION "public"."get_user_children"("check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_children"("check_user_id" "uuid") IS 'STABLE: Get all children for which user is an active guardian';



CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("check_user_id" "uuid") RETURNS TABLE("org_id" "uuid", "org_name" "text", "roles" "public"."org_member_role"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    om.org_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = check_user_id
  GROUP BY om.org_id, o.name
  ORDER BY o.name;
$$;


ALTER FUNCTION "public"."get_user_organizations"("check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_organizations"("check_user_id" "uuid") IS 'Returns all organizations for a user along with their roles per organization. Uses org_id column (renamed from organization_id).';



CREATE OR REPLACE FUNCTION "public"."get_user_roles_for_org"("check_user_id" "uuid", "check_org_id" "uuid") RETURNS "public"."org_member_role"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT ARRAY_AGG(role ORDER BY role)
  FROM organization_members
  WHERE user_id = check_user_id
    AND organization_id = check_org_id;
$$;


ALTER FUNCTION "public"."get_user_roles_for_org"("check_user_id" "uuid", "check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates user profile record when auth user is created. Handles requires_org_setup flag from metadata safely. Sets role to NULL for new multi-org auth model.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user_invite_linking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invite RECORD;
  v_linked_count INTEGER := 0;
BEGIN
  RAISE LOG 'handle_new_user_invite_linking: Processing user % (email: %)', 
    NEW.id, NEW.email;

  FOR v_invite IN 
    SELECT * FROM public.parent_invites 
    WHERE lower(email) = lower(NEW.email) 
    AND status = 'pending'
    AND expires_at > NOW()
  LOOP
    RAISE LOG 'handle_new_user_invite_linking: Found pending invite % for athlete %', 
      v_invite.id, v_invite.athlete_id;

    BEGIN
      -- FIXED: Use (athlete_id, user_id, org_id) to match actual unique constraint
      INSERT INTO public.athlete_guardians (athlete_id, user_id, org_id, status, created_at, updated_at)
      VALUES (v_invite.athlete_id, NEW.id, v_invite.org_id, 'active', NOW(), NOW())
      ON CONFLICT (athlete_id, user_id, org_id) 
      DO UPDATE SET status = 'active', updated_at = NOW();

      RAISE LOG 'handle_new_user_invite_linking: Created guardian link for athlete %', 
        v_invite.athlete_id;

      -- Add parent role to org
      PERFORM public.add_org_role(NEW.id, v_invite.org_id, 'parent');
      
      -- Mark invite as accepted
      UPDATE public.parent_invites 
      SET status = 'accepted', 
          accepted_by_user_id = NEW.id, 
          accepted_at = NOW(),
          updated_at = NOW()
      WHERE id = v_invite.id;

      v_linked_count := v_linked_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user_invite_linking: ERROR linking user % to athlete %: % (SQLSTATE: %)',
        NEW.id, v_invite.athlete_id, SQLERRM, SQLSTATE;
      -- Continue processing other invites
    END;
  END LOOP;

  RAISE LOG 'handle_new_user_invite_linking: Completed for user % - linked % athletes', 
    NEW.id, v_linked_count;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_invite_linking"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user_invite_linking"() IS 'Automatically links new users to athletes if they have pending invites. Runs after INSERT on public.users.';



CREATE OR REPLACE FUNCTION "public"."import_athletes_from_spreadsheet"("p_org_id" "uuid", "p_import_id" "uuid", "p_rows" "jsonb", "p_import_mode" "text", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_season_id" "uuid" DEFAULT NULL::"uuid", "p_assign_teams_from_spreadsheet" boolean DEFAULT false, "p_create_families" boolean DEFAULT true, "p_link_existing_families" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."import_athletes_from_spreadsheet"("p_org_id" "uuid", "p_import_id" "uuid", "p_rows" "jsonb", "p_import_mode" "text", "p_team_id" "uuid", "p_season_id" "uuid", "p_assign_teams_from_spreadsheet" boolean, "p_create_families" boolean, "p_link_existing_families" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."import_athletes_from_spreadsheet"("p_org_id" "uuid", "p_import_id" "uuid", "p_rows" "jsonb", "p_import_mode" "text", "p_team_id" "uuid", "p_season_id" "uuid", "p_assign_teams_from_spreadsheet" boolean, "p_create_families" boolean, "p_link_existing_families" boolean) IS 'Imports athletes from spreadsheet data. Requires org_admin role for the specified org_id.';



CREATE OR REPLACE FUNCTION "public"."increment_org_sport_settings_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_org_sport_settings_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_override_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Only increment if this is not a revoke operation (revoke sets revoked_at)
  -- For revoke operations, we check version in the WHERE clause
  IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    -- Revoke operation - version check happens in application
    NEW.version = OLD.version + 1;
  ELSIF NEW.revoked_at IS NULL OR NEW.revoked_at = OLD.revoked_at THEN
    -- Regular update - increment version
    NEW.version = OLD.version + 1;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_override_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ticket_capacity"("p_ticket_type_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_capacity INTEGER;
  v_total_capacity INTEGER;
BEGIN
  -- Lock row and increment capacity
  UPDATE ticket_types
  SET capacity_remaining = LEAST(
      capacity_remaining + p_quantity,
      capacity_total
    ),
      updated_at = NOW()
  WHERE id = p_ticket_type_id
    AND capacity_total IS NOT NULL
    AND capacity_remaining IS NOT NULL
  RETURNING capacity_remaining, capacity_total INTO v_current_capacity, v_total_capacity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket type not found or has no capacity limit';
  END IF;

  -- Ensure we don't exceed total capacity
  IF v_current_capacity > v_total_capacity THEN
    UPDATE ticket_types
    SET capacity_remaining = capacity_total
    WHERE id = p_ticket_type_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_ticket_capacity"("p_ticket_type_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_coach_for_team"("team_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN staff_can_access_team(team_id_param, user_id_param);
END;
$$;


ALTER FUNCTION "public"."is_coach_for_team"("team_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_mock_organization"("org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT org_id IS NOT NULL AND org_id IN (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid
  );
$$;


ALTER FUNCTION "public"."is_mock_organization"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_mock_organization"("org_id" "uuid") IS 'Returns true if org_id is one of the three mock org UUIDs from seed-all.ts. Keep in sync with src/utils/mockOrganizationUtils.ts.';



CREATE OR REPLACE FUNCTION "public"."is_org_admin"("org_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN user_is_org_admin(org_id_param, user_id_param);
END;
$$;


ALTER FUNCTION "public"."is_org_admin"("org_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_license_active"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."is_org_license_active"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_license_readonly_allowed"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."is_org_license_readonly_allowed"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("org_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN user_has_org_access(org_id_param, user_id_param);
END;
$$;


ALTER FUNCTION "public"."is_org_member"("org_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_parent_of_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM athlete_guardians ag
    WHERE ag.athlete_id = athlete_id_param
      AND ag.user_id = user_id_param
      AND ag.status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."is_parent_of_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_parent_of_athlete"("athlete_id_param" "uuid", "user_id_param" "uuid") IS 'Returns true if the user is an active guardian of the specified athlete.';



CREATE OR REPLACE FUNCTION "public"."is_parent_of_child"("check_user_id" "uuid", "check_child_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN athletes c ON c.family_id = u.family_id
    WHERE u.id = check_user_id
      AND c.id = check_child_id
  );
$$;


ALTER FUNCTION "public"."is_parent_of_child"("check_user_id" "uuid", "check_child_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_parent_of_child"("check_user_id" "uuid", "check_child_id" "uuid") IS 'Legacy function name kept for compatibility. Checks if user is parent of athlete via family_id.';



CREATE OR REPLACE FUNCTION "public"."is_platform_admin"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = check_user_id
  );
$$;


ALTER FUNCTION "public"."is_platform_admin"("check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_platform_admin"("check_user_id" "uuid") IS 'STABLE: Check if user is a platform admin. Used by RLS policies.';



CREATE OR REPLACE FUNCTION "public"."is_travel_event"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."is_travel_event"("p_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_travel_event"("p_event_id" "uuid") IS 'Determines if an event is a travel event based on various indicators including explicit flags, hotel info, location, and event type.';



CREATE OR REPLACE FUNCTION "public"."link_guardian_to_athlete"("p_athlete_id" "uuid", "p_email" "text", "p_org_id" "uuid", "p_relationship_type" "text" DEFAULT 'parent'::"text", "p_created_by_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT;
  v_normalized_email TEXT;
  v_stored_email TEXT;  -- Original email, trimmed and lowercased (preserves dots)
  v_user_id UUID;
  v_invite_id UUID;
  v_token TEXT;
  v_athlete_guardian_id UUID;
BEGIN
  -- Normalize email for matching/lookup purposes only
  v_normalized_email := normalize_email(p_email);
  
  -- Store original email (trimmed and lowercased, but preserving dots)
  -- This is what gets stored in the database and sent in emails
  v_stored_email := LOWER(TRIM(p_email));
  
  -- Acquire advisory lock on normalized email hash
  -- This prevents race conditions when multiple admins link same guardian
  v_lock_key := hashtext(v_normalized_email);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check if user exists using normalized email for matching
  SELECT id INTO v_user_id 
  FROM users 
  WHERE normalize_email(email) = v_normalized_email
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists: create or update athlete_guardians link (idempotent)
    INSERT INTO athlete_guardians (
      athlete_id,
      user_id,
      org_id,
      status
    )
    VALUES (
      p_athlete_id,
      v_user_id,
      p_org_id,
      'active'
    )
    ON CONFLICT (athlete_id, user_id, org_id)
    DO UPDATE SET
      status = 'active',
      updated_at = NOW()
    RETURNING id INTO v_athlete_guardian_id;
    
    -- Ensure user has parent role in organization
    -- This uses the existing add_org_role function which is also idempotent
    PERFORM add_org_role(v_user_id, p_org_id, 'parent');
    
    -- Convert any pending invites to accepted
    -- Use normalized email for matching, but check against stored emails
    UPDATE parent_invites
    SET 
      status = 'accepted',
      accepted_by_user_id = v_user_id,
      accepted_at = NOW()
    WHERE org_id = p_org_id
      AND athlete_id = p_athlete_id
      AND normalize_email(email) = v_normalized_email
      AND status = 'pending';
    
    RETURN jsonb_build_object(
      'type', 'guardian',
      'id', v_athlete_guardian_id,
      'user_id', v_user_id,
      'email', v_stored_email,  -- Return stored email (with dots preserved)
      'status', 'active',
      'already_existed', FOUND
    );
    
  ELSE
    -- User doesn't exist: create parent_invites (idempotent)
    -- Store original email (with dots preserved) for sending invitations
    
    -- Check for existing pending invite with normalized email match
    -- This handles Gmail addresses where user.name@gmail.com and username@gmail.com are the same
    SELECT id, token INTO v_invite_id, v_token
    FROM parent_invites
    WHERE org_id = p_org_id
      AND athlete_id = p_athlete_id
      AND normalize_email(email) = v_normalized_email
      AND status = 'pending'
    LIMIT 1;
    
    IF v_invite_id IS NOT NULL THEN
      -- Existing invite found - update it
      UPDATE parent_invites
      SET 
        expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW(),
        token = COALESCE(v_token, gen_random_uuid()::text)
      WHERE id = v_invite_id
      RETURNING token INTO v_token;
    ELSE
      -- No existing invite - create new one
      v_token := gen_random_uuid()::text;
      
      INSERT INTO parent_invites (
        org_id,
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
        v_stored_email,  -- Store original email (with dots preserved)
        'pending',
        v_token,
        NOW() + INTERVAL '30 days',
        COALESCE(p_created_by_user_id, auth.uid())
      )
      RETURNING id, token INTO v_invite_id, v_token;
    END IF;
    
    RETURN jsonb_build_object(
      'type', 'invite',
      'id', v_invite_id,
      'email', v_stored_email,  -- Return stored email (with dots preserved)
      'token', v_token,
      'status', 'pending',
      'expires_at', NOW() + INTERVAL '30 days'
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."link_guardian_to_athlete"("p_athlete_id" "uuid", "p_email" "text", "p_org_id" "uuid", "p_relationship_type" "text", "p_created_by_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."link_guardian_to_athlete"("p_athlete_id" "uuid", "p_email" "text", "p_org_id" "uuid", "p_relationship_type" "text", "p_created_by_user_id" "uuid") IS 'Links a guardian to an athlete by email. If user exists, creates athlete_guardians relationship. If not, creates parent_invite. 
   Uses normalized email for matching existing users, but stores original email (with dots preserved) for invitations. 
   Uses advisory locks to prevent race conditions. Idempotent.';



CREATE OR REPLACE FUNCTION "public"."lock_uniform_kit"("p_kit_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."lock_uniform_kit"("p_kit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_child_claim_token_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_logs
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
      'org_admin'::event_actor_role,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      NEW.org_id,
      'claim_token',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
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
      'parent'::event_actor_role,
      NEW.used_by_user_id,
      NEW.org_id,
      'claim_token',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'used_by_user_id', NEW.used_by_user_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_child_claim_token_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_child_claim_token_changes"() IS 'Audit trigger: logs CHILD_CLAIM_TOKEN_CREATED, CHILD_CLAIMED events with idempotency';



CREATE OR REPLACE FUNCTION "public"."log_event"("p_category" "public"."event_category", "p_event_type" "text", "p_actor_role" "public"."event_actor_role", "p_actor_user_id" "uuid" DEFAULT "auth"."uid"(), "p_org_id" "uuid" DEFAULT NULL::"uuid", "p_target_entity_type" "text" DEFAULT NULL::"text", "p_target_entity_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_idempotency_key" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_event"("p_category" "public"."event_category", "p_event_type" "text", "p_actor_role" "public"."event_actor_role", "p_actor_user_id" "uuid", "p_org_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_idempotency_key" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_event"("p_category" "public"."event_category", "p_event_type" "text", "p_actor_role" "public"."event_actor_role", "p_actor_user_id" "uuid", "p_org_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_idempotency_key" "uuid") IS 'Main function for logging events. Includes validation, sanitization, and idempotency support.';



CREATE OR REPLACE FUNCTION "public"."log_event_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_event_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_feature_flag_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_feature_flag_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_fee_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    v_actor_role,
    auth.uid(),
    COALESCE(NEW.org_id, OLD.org_id),
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
$$;


ALTER FUNCTION "public"."log_fee_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_fee_changes"() IS 'Auto-logs fee changes to event_logs. Prevents circular logging.';



CREATE OR REPLACE FUNCTION "public"."log_join_link_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_idempotency_key := 'INSERT:' || NEW.id::text || ':' || statement_timestamp()::text;
    
    -- Check for duplicate
    -- FIXED: Use event_logs (plural) instead of event_log
    IF EXISTS (
      SELECT 1 FROM event_logs
      WHERE metadata->>'idempotency_key' = v_idempotency_key
      AND created_at > NOW() - INTERVAL '1 second'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Log JOIN_LINK_CREATED
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_LINK_CREATED',
      'org_admin'::event_actor_role,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      NEW.org_id,
      'join_link',
      NEW.id,
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
$$;


ALTER FUNCTION "public"."log_join_link_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_join_link_changes"() IS 'Audit trigger: logs JOIN_LINK_CREATED events with idempotency. Fixed table name to event_logs.';



CREATE OR REPLACE FUNCTION "public"."log_join_request_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_logs
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
      'parent'::event_actor_role,
      NEW.requested_by_user_id,
      NEW.org_id,
      'join_request',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'season_id', NEW.season_id,
        'join_link_id', NEW.join_link_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- Log JOIN_REQUEST_APPROVED
    -- FIXED: Correct parameter order (actor_role before actor_user_id)
    PERFORM log_event(
      'ORGANIZATION',
      'JOIN_REQUEST_APPROVED',
      'org_admin'::event_actor_role,
      NEW.reviewed_by_user_id,
      NEW.org_id,
      'join_request',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
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
      'org_admin'::event_actor_role,
      NEW.reviewed_by_user_id,
      NEW.org_id,
      'join_request',
      NEW.id,
      jsonb_build_object(
        'athlete_id', NEW.athlete_id,
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
$$;


ALTER FUNCTION "public"."log_join_request_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_join_request_changes"() IS 'Audit trigger: logs JOIN_REQUEST_SUBMITTED, JOIN_REQUEST_APPROVED, JOIN_REQUEST_DENIED events with idempotency. Fixed parameter order bug in JOIN_REQUEST_APPROVED case.';



CREATE OR REPLACE FUNCTION "public"."log_organization_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    v_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."log_organization_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_organization_changes"() IS 'Auto-logs organization changes to event_logs. Prevents circular logging.';



CREATE OR REPLACE FUNCTION "public"."log_organization_member_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_idempotency_key TEXT;
  v_actor_role TEXT;
  v_is_first_role BOOLEAN;
  v_is_last_role BOOLEAN;
BEGIN
  -- Generate idempotency key based on operation and data
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.user_id, OLD.user_id)::text || ':' ||
    COALESCE(NEW.org_id, OLD.org_id)::text || ':' ||
    COALESCE(NEW.role, OLD.role)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate in last second (idempotency)
  IF EXISTS (
    SELECT 1 FROM event_logs
    WHERE metadata->>'idempotency_key' = v_idempotency_key
    AND created_at > NOW() - INTERVAL '1 second'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get actor role (best guess - may be platform admin or org admin)
  SELECT 
    CASE 
      WHEN is_platform_admin(auth.uid()) THEN 'platform_admin'
      WHEN user_has_any_org_roles(auth.uid(), COALESCE(NEW.org_id, OLD.org_id), ARRAY['org_admin']::org_member_role[]) THEN 'org_admin'
      ELSE 'system'
    END INTO v_actor_role;
  
  IF TG_OP = 'INSERT' THEN
    -- Check if this is the first role for this user in this org
    SELECT NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.user_id
        AND org_id = NEW.org_id
        AND id != NEW.id
    ) INTO v_is_first_role;
    
    -- Log ROLE_ADDED
    PERFORM log_event(
      'ORGANIZATION',
      'ROLE_ADDED',
      v_actor_role::event_actor_role,
      COALESCE(auth.uid(), NEW.user_id), -- actor (may be self-add or admin-add)
      NEW.org_id,
      'user',
      NEW.user_id,
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
        v_actor_role::event_actor_role,
        COALESCE(auth.uid(), NEW.user_id),
        NEW.org_id,
        'organization',
        NEW.org_id,
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
        AND org_id = OLD.org_id
        AND id != OLD.id
    ) INTO v_is_last_role;
    
    -- Log ROLE_REMOVED
    PERFORM log_event(
      'ORGANIZATION',
      'ROLE_REMOVED',
      v_actor_role::event_actor_role,
      COALESCE(auth.uid(), OLD.user_id),
      OLD.org_id,
      'user',
      OLD.user_id,
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
        v_actor_role::event_actor_role,
        COALESCE(auth.uid(), OLD.user_id),
        OLD.org_id,
        'organization',
        OLD.org_id,
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
$$;


ALTER FUNCTION "public"."log_organization_member_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_organization_member_changes"() IS 'Audit trigger: logs ROLE_ADDED, ROLE_REMOVED, ORG_JOINED, ORG_LEFT events with idempotency';



CREATE OR REPLACE FUNCTION "public"."log_parent_invite_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := TG_OP || ':' ||
    COALESCE(NEW.id, OLD.id)::text || ':' ||
    statement_timestamp()::text;
  
  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM event_logs
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
      'org_admin'::event_actor_role,
      COALESCE(NEW.created_by_user_id, auth.uid()),
      NEW.org_id,
      'parent_invite',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'expires_at', NEW.expires_at,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Log PARENT_ATTACHED (when invite is accepted)
    -- FIXED: Correct parameter order (actor_role before actor_user_id)
    PERFORM log_event(
      'ORGANIZATION',
      'PARENT_ATTACHED',
      'parent'::event_actor_role,
      NEW.accepted_by_user_id,
      NEW.org_id,
      'parent_invite',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'athlete_id', NEW.athlete_id,
        'team_id', NEW.team_id,
        'accepted_by_user_id', NEW.accepted_by_user_id,
        'idempotency_key', v_idempotency_key
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_parent_invite_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_parent_invite_changes"() IS 'Audit trigger: logs PARENT_INVITED, PARENT_ATTACHED events with idempotency. Fixed parameter order bug.';



CREATE OR REPLACE FUNCTION "public"."log_payment_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_event_type TEXT;
  v_actor_role event_actor_role;
  v_org_id UUID;
BEGIN
  -- Prevent circular logging
  PERFORM set_config('app.logging_disabled', 'true', true);

  -- Get organization ID from payment
  v_org_id := COALESCE(NEW.org_id, OLD.org_id);

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
$$;


ALTER FUNCTION "public"."log_payment_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_payment_changes"() IS 'Auto-logs payment status changes to event_logs. Prevents circular logging.';



CREATE OR REPLACE FUNCTION "public"."log_user_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    v_actor_role,
    auth.uid(),
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
$$;


ALTER FUNCTION "public"."log_user_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_user_changes"() IS 'Auto-logs user changes to event_logs. Prevents circular logging.';



CREATE OR REPLACE FUNCTION "public"."mark_uniform_submission_fulfilled"("p_submission_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."mark_uniform_submission_fulfilled"("p_submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_email"("email" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."normalize_email"("email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_email"("email" "text") IS 'Normalizes email addresses for matching. Handles Gmail dot and plus addressing.';



CREATE OR REPLACE FUNCTION "public"."normalize_entry_code"("code" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN upper(regexp_replace(code, '[^A-Z0-9]', '', 'g'));
END;
$$;


ALTER FUNCTION "public"."normalize_entry_code"("code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."org_is_empty"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$SELECT COUNT(*) = 0
FROM public.organization_members
WHERE org_id = check_org_id;$$;


ALTER FUNCTION "public"."org_is_empty"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."parent_can_access_team_via_membership"("check_user_id" "uuid", "check_team_id" "uuid", "check_season_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."parent_can_access_team_via_membership"("check_user_id" "uuid", "check_team_id" "uuid", "check_season_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."parent_can_access_team_via_membership"("check_user_id" "uuid", "check_team_id" "uuid", "check_season_id" "uuid") IS 'Legacy function name kept for compatibility. Checks if user can access team via athlete membership.';



CREATE OR REPLACE FUNCTION "public"."pg_advisory_lock_wrapper"("key" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  PERFORM pg_advisory_lock(key);
END;
$$;


ALTER FUNCTION "public"."pg_advisory_lock_wrapper"("key" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pg_advisory_unlock_wrapper"("key" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  PERFORM pg_advisory_unlock(key);
END;
$$;


ALTER FUNCTION "public"."pg_advisory_unlock_wrapper"("key" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_feature_archive_with_active_overrides"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Only check if feature is being archived (archived_at set)
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    -- Count active overrides for this feature
    SELECT COUNT(*) INTO active_count
    FROM entitlement_overrides
    WHERE feature_entitlement_id = NEW.id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF active_count > 0 THEN
      RAISE EXCEPTION 'Cannot archive feature "%": % active override(s) exist. Please revoke or expire overrides first.', 
        NEW.display_name, active_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_feature_archive_with_active_overrides"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_feature_archive_with_active_overrides"() IS 'Prevents archival of features that have active entitlement overrides.';



CREATE OR REPLACE FUNCTION "public"."prevent_org_delete_with_active_overrides"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active overrides for this organization
  SELECT COUNT(*) INTO active_count
  FROM entitlement_overrides
  WHERE target_type = 'organization'
    AND target_id = OLD.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF active_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete organization "%": % active override(s) exist. Please revoke or expire overrides first.', 
      OLD.name, active_count;
  END IF;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."prevent_org_delete_with_active_overrides"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_org_delete_with_active_overrides"() IS 'Prevents deletion of organizations that have active entitlement overrides.';



CREATE OR REPLACE FUNCTION "public"."prevent_slug_collision"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if the previous_slug matches any current org slug
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE slug = NEW.previous_slug AND id != NEW.org_id
  ) THEN
    RAISE EXCEPTION 'Slug % is currently in use by another organization', NEW.previous_slug;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_slug_collision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_user_delete_with_active_overrides"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active overrides for this user
  SELECT COUNT(*) INTO active_count
  FROM entitlement_overrides
  WHERE target_type = 'user'
    AND target_id = OLD.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF active_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete user "%": % active override(s) exist. Please revoke or expire overrides first.', 
      COALESCE(OLD.display_name, OLD.email, 'Unknown'), active_count;
  END IF;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."prevent_user_delete_with_active_overrides"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_user_delete_with_active_overrides"() IS 'Prevents deletion of users that have active entitlement overrides.';



CREATE OR REPLACE FUNCTION "public"."process_payment_allocation"("p_fee_assignment_id" "uuid", "p_amount_cents" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."process_payment_allocation"("p_fee_assignment_id" "uuid", "p_amount_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_guardian_attachment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_athlete RECORD;
  v_organization RECORD;
  v_requester RECORD;
  v_reviewer RECORD;
  v_app_url TEXT;
  v_review_url TEXT;
BEGIN
  -- Get app URL
  v_app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://youthsports.team'
  );
  v_review_url := v_app_url || '/admin/guardian-requests';
  
  -- Handle INSERT: Notify org admins
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    BEGIN
      -- Get athlete details
      SELECT first_name, last_name
      INTO v_athlete
      FROM athletes
      WHERE id = NEW.athlete_id;
      
      -- Get organization details
      SELECT name
      INTO v_organization
      FROM organizations
      WHERE id = NEW.org_id;
      
      -- Get requester details
      SELECT email, display_name
      INTO v_requester
      FROM users
      WHERE id = NEW.requested_by_user_id;
      
      -- Queue notification for each org admin
      INSERT INTO notification_jobs (
        org_id,
        user_id,
        email,
        type,
        payload,
        status
      )
      SELECT 
        NEW.org_id,
        om.user_id,
        u.email,
        'guardian_attachment_request_submitted',
        jsonb_build_object(
          'recipient_email', u.email,
          'athlete_first_name', COALESCE(v_athlete.first_name, ''),
          'athlete_last_name', COALESCE(v_athlete.last_name, ''),
          'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'an athlete'),
          'organization_name', COALESCE(v_organization.name, 'the organization'),
          'requester_email', COALESCE(v_requester.email, ''),
          'requester_display_name', COALESCE(v_requester.display_name, ''),
          'request_id', NEW.id,
          'review_url', v_review_url,
          'expires_at', NEW.expires_at
        ),
        'queued'
      FROM org_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.org_id = NEW.org_id
        AND om.role = 'admin'
        AND om.status = 'active'
        AND u.email IS NOT NULL;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- Log warning but don't fail the transaction
        RAISE WARNING 'Failed to queue notification for guardian attachment request submission: %', SQLERRM;
    END;
  END IF;
  
  -- Handle UPDATE: Notify requester of status change
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> OLD.status THEN
    BEGIN
      -- Get athlete details
      SELECT first_name, last_name
      INTO v_athlete
      FROM athletes
      WHERE id = NEW.athlete_id;
      
      -- Get organization details
      SELECT name
      INTO v_organization
      FROM organizations
      WHERE id = NEW.org_id;
      
      -- Get requester details
      SELECT email, display_name
      INTO v_requester
      FROM users
      WHERE id = NEW.requested_by_user_id;
      
      -- Get reviewer details (if reviewed)
      IF NEW.reviewed_by_user_id IS NOT NULL THEN
        SELECT email, display_name
        INTO v_reviewer
        FROM users
        WHERE id = NEW.reviewed_by_user_id;
      END IF;
      
      -- Queue notification to requester
      INSERT INTO notification_jobs (
        org_id,
        user_id,
        email,
        type,
        payload,
        status
      ) VALUES (
        NEW.org_id,
        NEW.requested_by_user_id,
        v_requester.email,
        'guardian_attachment_request_reviewed',
        jsonb_build_object(
          'recipient_email', v_requester.email,
          'athlete_first_name', COALESCE(v_athlete.first_name, ''),
          'athlete_last_name', COALESCE(v_athlete.last_name, ''),
          'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'an athlete'),
          'organization_name', COALESCE(v_organization.name, 'the organization'),
          'status', NEW.status,
          'decision_reason', COALESCE(NEW.decision_reason, ''),
          'reviewer_email', COALESCE(v_reviewer.email, ''),
          'reviewer_display_name', COALESCE(v_reviewer.display_name, ''),
          'reviewed_at', NEW.reviewed_at,
          'request_id', NEW.id
        ),
        'queued'
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log warning but don't fail the transaction
        RAISE WARNING 'Failed to queue notification for guardian attachment request review: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."queue_guardian_attachment_notification"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."queue_guardian_attachment_notification"() IS 'Queues email notifications for guardian attachment requests. On INSERT, notifies org admins. On UPDATE (status change), notifies requester. Non-blocking - failures are logged as warnings.';



CREATE OR REPLACE FUNCTION "public"."queue_guardian_invite_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_athlete RECORD;
  v_organization RECORD;
  v_invite_url TEXT;
  v_app_url TEXT;
BEGIN
  -- Only queue notification for new pending invites
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Get athlete details
    SELECT first_name, last_name
    INTO v_athlete
    FROM athletes
    WHERE id = NEW.athlete_id;

    -- Get organization details
    SELECT name
    INTO v_organization
    FROM organizations
    WHERE id = NEW.org_id;

    -- Build the invite URL (platform base + route manager path)
    v_app_url := COALESCE(
      current_setting('app.settings.platform_url', true),
      current_setting('app.settings.app_url', true),
      'https://platform.youthsports.team'
    );
    v_invite_url := v_app_url || '/portal/accept-invite?token=' || NEW.token || '&type=guardian';

    -- Insert notification job
    INSERT INTO notification_jobs (
      org_id,
      user_id,
      email,
      type,
      payload,
      status
    ) VALUES (
      NEW.org_id,
      NULL,
      NEW.email,
      'guardian_invite',
      jsonb_build_object(
        'recipient_email', NEW.email,
        'athlete_first_name', COALESCE(v_athlete.first_name, ''),
        'athlete_last_name', COALESCE(v_athlete.last_name, ''),
        'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'your athlete'),
        'organization_name', COALESCE(v_organization.name, 'the organization'),
        'invite_token', NEW.token,
        'invite_url', v_invite_url,
        'expires_at', NEW.expires_at
      ),
      'queued'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."queue_guardian_invite_notification"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."queue_guardian_invite_notification"() IS 'Queues an email notification when a guardian invite is created. The notification-worker Edge Function processes the queued job and sends the email via Resend.';



CREATE OR REPLACE FUNCTION "public"."redeem_child_claim_token"("p_token" "text") RETURNS TABLE("success" boolean, "child_id" "uuid", "organization_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."redeem_child_claim_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_derived_families"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Refresh concurrently to avoid blocking reads
  -- Note: CONCURRENTLY requires a unique index
  REFRESH MATERIALIZED VIEW CONCURRENTLY derived_families_mv;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_derived_families"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_derived_families"() IS 'Refreshes the derived_families_mv materialized view when guardian relationships change.';



CREATE OR REPLACE FUNCTION "public"."refresh_event_logs_recent"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_logs_recent;
END;
$$;


ALTER FUNCTION "public"."refresh_event_logs_recent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_child_for_tryout"("p_tryout_id" "uuid", "p_child_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."register_child_for_tryout"("p_tryout_id" "uuid", "p_child_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_expired_ticket_holds"() RETURNS TABLE("released_holds" integer, "released_capacity" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_hold RECORD;
  v_released_holds INTEGER := 0;
  v_released_capacity INTEGER := 0;
BEGIN
  -- Process expired holds that are not yet finalized (order still pending_payment)
  FOR v_hold IN
    SELECT th.id, th.ticket_type_id, th.qty, th.order_id
    FROM ticket_holds th
    JOIN ticket_orders ord ON ord.id = th.order_id
    WHERE th.expires_at < NOW()
      AND ord.status = 'pending_payment'
  LOOP
    -- Release capacity
    PERFORM increment_ticket_capacity(v_hold.ticket_type_id, v_hold.qty);
    
    -- Delete hold
    DELETE FROM ticket_holds WHERE id = v_hold.id;
    
    v_released_holds := v_released_holds + 1;
    v_released_capacity := v_released_capacity + v_hold.qty;
  END LOOP;

  RETURN QUERY SELECT v_released_holds, v_released_capacity;
END;
$$;


ALTER FUNCTION "public"."release_expired_ticket_holds"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_guardian_from_athlete"("p_athlete_id" "uuid", "p_user_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."remove_guardian_from_athlete"("p_athlete_id" "uuid", "p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_guardian_from_athlete"("p_athlete_id" "uuid", "p_user_id" "uuid", "p_org_id" "uuid") IS 'Removes a guardian from an athlete by setting status to removed. Soft delete approach.';



CREATE OR REPLACE FUNCTION "public"."remove_org_role"("p_user_id" "uuid", "p_org_id" "uuid", "p_role" "public"."org_member_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT := hashtext(p_user_id::text || p_org_id::text);
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  DELETE FROM organization_members
  WHERE user_id = p_user_id
    AND org_id = p_org_id
    AND role = p_role;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."remove_org_role"("p_user_id" "uuid", "p_org_id" "uuid", "p_role" "public"."org_member_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_org_role"("p_user_id" "uuid", "p_org_id" "uuid", "p_role" "public"."org_member_role") IS 'Remove organization role from user.';



CREATE OR REPLACE FUNCTION "public"."resend_guardian_invite"("p_invite_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_invite RECORD;
  v_athlete RECORD;
  v_organization RECORD;
  v_invite_url TEXT;
  v_app_url TEXT;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  -- Get the invite
  SELECT * INTO v_invite
  FROM parent_invites
  WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is no longer pending');
  END IF;

  -- Extend expiration by 30 days
  v_new_expires_at := NOW() + INTERVAL '30 days';

  -- Update the invite
  UPDATE parent_invites
  SET 
    expires_at = v_new_expires_at,
    updated_at = NOW()
  WHERE id = p_invite_id;

  -- Get athlete details
  SELECT first_name, last_name
  INTO v_athlete
  FROM athletes
  WHERE id = v_invite.athlete_id;

  -- Get organization details
  SELECT name
  INTO v_organization
  FROM organizations
  WHERE id = v_invite.org_id;

  -- Build the invite URL (platform base + route manager path)
  v_app_url := COALESCE(
    current_setting('app.settings.platform_url', true),
    current_setting('app.settings.app_url', true),
    'https://platform.youthsports.team'
  );
  v_invite_url := v_app_url || '/portal/accept-invite?token=' || v_invite.token || '&type=guardian';

  -- Queue a new notification
  INSERT INTO notification_jobs (
    org_id,
    user_id,
    email,
    type,
    payload,
    status
  ) VALUES (
    v_invite.org_id,
    NULL,
    v_invite.email,
    'guardian_invite',
    jsonb_build_object(
      'recipient_email', v_invite.email,
      'athlete_first_name', COALESCE(v_athlete.first_name, ''),
      'athlete_last_name', COALESCE(v_athlete.last_name, ''),
      'athlete_name', COALESCE(v_athlete.first_name || ' ' || v_athlete.last_name, 'your athlete'),
      'organization_name', COALESCE(v_organization.name, 'the organization'),
      'invite_token', v_invite.token,
      'invite_url', v_invite_url,
      'expires_at', v_new_expires_at,
      'is_resend', true
    ),
    'queued'
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_expires_at', v_new_expires_at
  );
END;
$$;


ALTER FUNCTION "public"."resend_guardian_invite"("p_invite_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resend_guardian_invite"("p_invite_id" "uuid") IS 'Resends a guardian invite email by extending the expiration and queuing a new notification.';



CREATE OR REPLACE FUNCTION "public"."resolve_feature_flag"("p_feature_key" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_org_id" "uuid" DEFAULT NULL::"uuid", "p_environment" "public"."feature_flag_environment" DEFAULT NULL::"public"."feature_flag_environment") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."resolve_feature_flag"("p_feature_key" "text", "p_user_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_feature_flag"("p_feature_key" "text", "p_user_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment") IS 'Resolves feature flag value with precedence: user override > org override > platform default. Returns null if not found.';



CREATE OR REPLACE FUNCTION "public"."resolve_feature_flags"("p_feature_keys" "text"[], "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_org_id" "uuid" DEFAULT NULL::"uuid", "p_environment" "public"."feature_flag_environment" DEFAULT NULL::"public"."feature_flag_environment") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."resolve_feature_flags"("p_feature_keys" "text"[], "p_user_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_feature_flags"("p_feature_keys" "text"[], "p_user_id" "uuid", "p_org_id" "uuid", "p_environment" "public"."feature_flag_environment") IS 'Batch resolution of multiple feature flags. Returns JSONB object with flag keys as keys.';



CREATE OR REPLACE FUNCTION "public"."resolve_org_from_slug"("p_slug" "text") RETURNS TABLE("org_id" "uuid", "current_slug" "text", "status" "public"."org_status", "name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  -- First, try to find org by current slug
  RETURN QUERY
  SELECT
    o.id,
    o.slug,
    o.status,
    o.name
  FROM organizations o
  WHERE o.slug = LOWER(p_slug);

  -- If not found, check slug history for redirects
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      o.id,
      o.slug as current_slug,
      o.status,
      o.name
    FROM org_slug_history h
    JOIN organizations o ON h.org_id = o.id
    WHERE h.previous_slug = LOWER(p_slug)
      AND h.expires_at > NOW()
    LIMIT 1;
  END IF;
END;
$$;


ALTER FUNCTION "public"."resolve_org_from_slug"("p_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_org_from_slug"("p_slug" "text") IS 'Resolves an org from a slug, checking both current slugs and redirect history. Returns org_id, current_slug, status, and name.';



CREATE OR REPLACE FUNCTION "public"."resolve_travel_contacts_for_plan"("p_plan_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_org_email TEXT;
  v_org_phone TEXT;
  v_cat TEXT;
  v_categories TEXT[] := ARRAY['transportation','lodging','venue','emergency','general'];
  v_result JSONB := '{}'::jsonb;
  v_contact RECORD;
  v_default_first TEXT;
  v_default_last TEXT;
  v_default_email TEXT;
  v_default_phone TEXT;
BEGIN
  -- Get plan's org via team
  SELECT t.org_id INTO v_org_id
  FROM travel_plans tp
  JOIN teams t ON t.id = tp.team_id
  WHERE tp.id = p_plan_id;
  IF v_org_id IS NULL THEN
    RETURN v_result;
  END IF;

  -- Org fallback: organizations.contact_email (schema uses contact_email, not email).
  -- Do not reference o.phone so this works when organizations has no phone column.
  SELECT COALESCE(o.contact_email, ''), NULL::TEXT
  INTO v_org_email, v_org_phone
  FROM organizations o WHERE o.id = v_org_id;

  -- Org default contact (category = 'default')
  SELECT otc.first_name, otc.last_name, otc.email, otc.phone
  INTO v_default_first, v_default_last, v_default_email, v_default_phone
  FROM organization_travel_contacts otc
  WHERE otc.org_id = v_org_id AND otc.category = 'default'
  LIMIT 1;
  v_default_first := COALESCE(v_default_first, '');
  v_default_last  := COALESCE(v_default_last, '');
  v_default_email := COALESCE(v_default_email, v_org_email);
  v_default_phone := COALESCE(v_default_phone, v_org_phone);

  FOREACH v_cat IN ARRAY v_categories
  LOOP
    -- 1) Plan custom contact (is_custom = true and valid)
    SELECT tpc.first_name, tpc.last_name, tpc.email, tpc.phone INTO v_contact
    FROM travel_plan_contacts tpc
    WHERE tpc.travel_plan_id = p_plan_id AND tpc.category = v_cat
      AND tpc.is_custom = true
      AND tpc.first_name IS NOT NULL AND trim(tpc.first_name) <> ''
      AND tpc.last_name IS NOT NULL AND trim(tpc.last_name) <> ''
      AND tpc.email IS NOT NULL AND trim(tpc.email) <> ''
    LIMIT 1;

    IF FOUND THEN
      v_result := v_result || jsonb_build_object(v_cat, jsonb_build_object(
        'first_name', COALESCE(v_contact.first_name, ''),
        'last_name',  COALESCE(v_contact.last_name, ''),
        'email',      COALESCE(v_contact.email, ''),
        'phone',      v_contact.phone
      ));
      CONTINUE;
    END IF;

    -- 2) Org category contact
    SELECT otc.first_name, otc.last_name, otc.email, otc.phone INTO v_contact
    FROM organization_travel_contacts otc
    WHERE otc.org_id = v_org_id AND otc.category = v_cat
      AND otc.email IS NOT NULL AND trim(otc.email) <> ''
    LIMIT 1;

    IF FOUND THEN
      v_result := v_result || jsonb_build_object(v_cat, jsonb_build_object(
        'first_name', COALESCE(v_contact.first_name, ''),
        'last_name',  COALESCE(v_contact.last_name, ''),
        'email',      COALESCE(v_contact.email, ''),
        'phone',      v_contact.phone
      ));
      CONTINUE;
    END IF;

    -- 3) Org default contact
    v_result := v_result || jsonb_build_object(v_cat, jsonb_build_object(
      'first_name', v_default_first,
      'last_name',  v_default_last,
      'email',      v_default_email,
      'phone',      v_default_phone
    ));
  END LOOP;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."resolve_travel_contacts_for_plan"("p_plan_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_travel_contacts_for_plan"("p_plan_id" "uuid") IS 'Returns resolved travel contacts for all five categories for a plan. Uses organizations.contact_email for org fallback.';



CREATE OR REPLACE FUNCTION "public"."review_guardian_attachment_request"("p_request_id" "uuid", "p_approve" boolean, "p_decision_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_request RECORD;
  v_current_user UUID;
  v_athlete_guardian_id UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is authenticated
  IF v_current_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Lock and get request
  BEGIN
    SELECT * INTO v_request
    FROM guardian_attachment_requests
    WHERE id = p_request_id
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Request is being processed by another admin'
      );
  END;
  
  -- Check if request exists
  IF v_request IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;
  
  -- Validate reviewer is org admin
  IF NOT (user_is_org_admin(v_current_user, v_request.org_id) OR is_platform_admin(v_current_user)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only organization admins can review requests'
    );
  END IF;
  
  -- Check request not expired
  IF v_request.expires_at <= NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request has expired'
    );
  END IF;
  
  -- Check request status is pending
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request has already been reviewed',
      'current_status', v_request.status
    );
  END IF;
  
  -- All operations in single transaction
  IF p_approve THEN
    -- Create athlete_guardians relationship
    INSERT INTO athlete_guardians (
      athlete_id,
      user_id,
      org_id,
      status
    )
    VALUES (
      v_request.athlete_id,
      v_request.requested_by_user_id,
      v_request.org_id,
      'active'
    )
    ON CONFLICT (athlete_id, user_id, org_id)
    DO UPDATE SET
      status = 'active',
      updated_at = NOW()
    RETURNING id INTO v_athlete_guardian_id;
    
    -- Ensure user has parent role
    PERFORM add_org_role(v_request.requested_by_user_id, v_request.org_id, 'parent');
    
    -- Update request status
    UPDATE guardian_attachment_requests
    SET 
      status = 'approved',
      reviewed_by_user_id = v_current_user,
      reviewed_at = NOW(),
      decision_reason = p_decision_reason
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'athlete_guardian_id', v_athlete_guardian_id,
      'message', 'Guardian attached successfully'
    );
  ELSE
    -- Deny request
    UPDATE guardian_attachment_requests
    SET 
      status = 'denied',
      reviewed_by_user_id = v_current_user,
      reviewed_at = NOW(),
      decision_reason = p_decision_reason
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'denied',
      'message', 'Request denied'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will rollback automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to review request: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."review_guardian_attachment_request"("p_request_id" "uuid", "p_approve" boolean, "p_decision_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."review_guardian_attachment_request"("p_request_id" "uuid", "p_approve" boolean, "p_decision_reason" "text") IS 'Reviews a guardian attachment request. Approves or denies with reason. All operations in single transaction. Uses row locks to prevent concurrent reviews.';



CREATE OR REPLACE FUNCTION "public"."review_join_request"("p_request_id" "uuid", "p_approve" boolean, "p_decision_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("request_id" "uuid", "status" "public"."join_request_status", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."review_join_request"("p_request_id" "uuid", "p_approve" boolean, "p_decision_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_organization_invite"("p_invite_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."revoke_organization_invite"("p_invite_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_organization_invite"("p_invite_id" "uuid") IS 'Revokes a pending invite. Only org admins can call this.';



CREATE OR REPLACE FUNCTION "public"."sanitize_metadata"("p_metadata" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sanitize_metadata"("p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sanitize_metadata"("p_metadata" "jsonb") IS 'Removes sensitive keys from metadata before storage.';



CREATE OR REPLACE FUNCTION "public"."search_athletes_for_guardian"("p_org_id" "uuid", "p_search" "text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "birthdate" "date", "gender" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_current_user UUID;
  v_escaped_search TEXT;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is authenticated
  IF v_current_user IS NULL THEN
    RETURN;
  END IF;
  
  -- Validate user has parent role in org
  IF NOT user_has_any_org_roles(v_current_user, p_org_id, ARRAY['parent']::org_member_role[]) THEN
    RETURN;
  END IF;
  
  -- Validate search text (min 2 chars)
  IF p_search IS NULL OR LENGTH(TRIM(p_search)) < 2 THEN
    RETURN;
  END IF;
  
  -- Escape special characters for ILIKE
  v_escaped_search := REPLACE(REPLACE(TRIM(p_search), '%', '\%'), '_', '\_');
  
  -- Search athletes in org, excluding those with existing guardians or where user is already guardian
  RETURN QUERY
  SELECT 
    a.id,
    a.first_name,
    a.last_name,
    a.birthdate,
    a.gender
  FROM athletes a
  WHERE a.deleted_at IS NULL
    -- Athlete must be in this org (via team_memberships or athlete_guardians)
    AND (
      EXISTS (
        SELECT 1 FROM team_memberships tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = a.id
          AND t.org_id = p_org_id
      )
      OR EXISTS (
        SELECT 1 FROM athlete_guardians ag
        WHERE ag.athlete_id = a.id
          AND ag.org_id = p_org_id
      )
    )
    -- Exclude athletes where user is already a guardian
    AND NOT EXISTS (
      SELECT 1 FROM athlete_guardians ag
      WHERE ag.athlete_id = a.id
        AND ag.user_id = v_current_user
        AND ag.org_id = p_org_id
        AND ag.status = 'active'
    )
    -- Exclude athletes that have any active guardians in this org
    AND NOT EXISTS (
      SELECT 1 FROM athlete_guardians ag
      WHERE ag.athlete_id = a.id
        AND ag.org_id = p_org_id
        AND ag.status = 'active'
    )
    -- Search by name
    AND (
      a.first_name ILIKE '%' || v_escaped_search || '%' ESCAPE '\'
      OR a.last_name ILIKE '%' || v_escaped_search || '%' ESCAPE '\'
    )
  ORDER BY a.first_name, a.last_name
  LIMIT p_limit;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty on any error
    RETURN;
END;
$$;


ALTER FUNCTION "public"."search_athletes_for_guardian"("p_org_id" "uuid", "p_search" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_athletes_for_guardian"("p_org_id" "uuid", "p_search" "text", "p_limit" integer) IS 'Allows guardians to search for athletes in orgs where they have parent role. Excludes athletes with existing guardians. Uses SECURITY DEFINER with role validation.';



CREATE OR REPLACE FUNCTION "public"."set_general_rsvp_responded_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Always set responded_at when status is set
  IF NEW.responded_at IS NULL THEN
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_general_rsvp_responded_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_huddle_report_reviewed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    IF NEW.status IN ('reviewed', 'dismissed') AND OLD.status = 'pending' THEN
        NEW.reviewed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_huddle_report_reviewed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rsvp_responded_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_rsvp_responded_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_travel_override"("p_event_id" "uuid", "p_is_travel" boolean, "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_travel_override"("p_event_id" "uuid", "p_is_travel" boolean, "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_travel_override"("p_event_id" "uuid", "p_is_travel" boolean, "p_reason" "text") IS 'Sets an admin override for travel classification on an event';



CREATE OR REPLACE FUNCTION "public"."staff_can_access_team"("check_user_id" "uuid", "check_team_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."staff_can_access_team"("check_user_id" "uuid", "check_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_guardian_attachment_request"("p_athlete_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_current_user UUID;
  v_lock_key BIGINT;
  v_existing_request RECORD;
  v_request_id UUID;
  v_athlete_exists BOOLEAN;
  v_already_guardian BOOLEAN;
  v_athlete_has_guardians BOOLEAN;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  -- Validate user is authenticated
  IF v_current_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Validate user has parent role in org
  IF NOT user_has_any_org_roles(v_current_user, p_org_id, ARRAY['parent']::org_member_role[]) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must have parent role in this organization'
    );
  END IF;
  
  -- Acquire transaction-scoped advisory lock
  v_lock_key := hashtext(p_athlete_id::text || v_current_user::text || p_org_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check if athlete exists and is in the specified org
  SELECT EXISTS (
    SELECT 1 FROM athletes a
    WHERE a.id = p_athlete_id
      AND a.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM team_memberships tm
          JOIN teams t ON t.id = tm.team_id
          WHERE tm.athlete_id = a.id
            AND t.org_id = p_org_id
        )
        OR EXISTS (
          SELECT 1 FROM athlete_guardians ag
          WHERE ag.athlete_id = a.id
            AND ag.org_id = p_org_id
        )
      )
  ) INTO v_athlete_exists;
  
  IF NOT v_athlete_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Athlete not found in this organization'
    );
  END IF;
  
  -- Check if user is already a guardian of this athlete
  SELECT EXISTS (
    SELECT 1 FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.user_id = v_current_user
      AND ag.org_id = p_org_id
      AND ag.status = 'active'
  ) INTO v_already_guardian;
  
  IF v_already_guardian THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already a guardian of this athlete'
    );
  END IF;
  
  -- Check if athlete already has active guardians
  SELECT EXISTS (
    SELECT 1 FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.org_id = p_org_id
      AND ag.status = 'active'
  ) INTO v_athlete_has_guardians;
  
  IF v_athlete_has_guardians THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This athlete already has guardians'
    );
  END IF;
  
  -- Check for existing request (idempotent)
  SELECT * INTO v_existing_request
  FROM guardian_attachment_requests
  WHERE athlete_id = p_athlete_id
    AND requested_by_user_id = v_current_user
    AND org_id = p_org_id;
  
  IF FOUND THEN
    -- Return existing request
    RETURN jsonb_build_object(
      'success', true,
      'id', v_existing_request.id,
      'status', v_existing_request.status,
      'expires_at', v_existing_request.expires_at,
      'created_at', v_existing_request.created_at,
      'already_existed', true
    );
  END IF;
  
  -- Create new request
  INSERT INTO guardian_attachment_requests (
    org_id,
    athlete_id,
    requested_by_user_id,
    status,
    expires_at
  )
  VALUES (
    p_org_id,
    p_athlete_id,
    v_current_user,
    'pending',
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'id', v_request_id,
    'status', 'pending',
    'expires_at', NOW() + INTERVAL '30 days',
    'created_at', NOW(),
    'already_existed', false
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to submit request: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."submit_guardian_attachment_request"("p_athlete_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_guardian_attachment_request"("p_athlete_id" "uuid", "p_org_id" "uuid") IS 'Submits a guardian attachment request. Idempotent - returns existing request if found. Uses advisory locks to prevent race conditions.';



CREATE OR REPLACE FUNCTION "public"."submit_join_request"("p_link_token" "text", "p_child_id" "uuid", "p_season_id" "uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "status" "public"."join_request_status", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_join_request"("p_link_token" "text", "p_child_id" "uuid", "p_season_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_uniform_sizes"("p_kit_id" "uuid", "p_child_id" "uuid", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_uniform_sizes"("p_kit_id" "uuid", "p_child_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_discovered_features"("p_discovered_features" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_lock_key BIGINT := 5001; -- Arbitrary lock ID for feature discovery
  v_lock_acquired BOOLEAN;
  v_result JSONB;
  v_feature JSONB;
  v_key TEXT;
  v_synced_count INT := 0;
  v_failed_count INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_error_msg TEXT;
BEGIN
  -- Attempt to acquire advisory lock (transaction level)
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Discovery sync is already in progress by another process.',
      'code', 'LOCK_HELD'
    );
  END IF;

  -- Validate input
  IF p_discovered_features IS NULL OR jsonb_typeof(p_discovered_features) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid input: p_discovered_features must be a JSONB array',
      'code', 'INVALID_INPUT'
    );
  END IF;

  -- Process each feature
  FOR v_feature IN SELECT * FROM jsonb_array_elements(p_discovered_features)
  LOOP
    BEGIN
      v_key := v_feature ->> 'featureKey';
      
      -- Validate required fields
      IF v_key IS NULL OR v_key = '' THEN
        v_failed_count := v_failed_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'key', COALESCE(v_key, 'unknown'),
          'error', 'Missing or empty featureKey'
        );
        CONTINUE;
      END IF;
      
      -- Upsert feature (columns are TEXT, not enums)
      INSERT INTO feature_entitlements (
        feature_key,
        display_name,
        category,
        feature_type,
        description,
        rollout_status
      ) VALUES (
        v_key,
        COALESCE(v_feature ->> 'displayName', v_key),
        COALESCE(v_feature ->> 'category', 'Support Tools'),
        COALESCE(v_feature ->> 'featureType', 'module'),
        v_feature ->> 'description',
        COALESCE(v_feature ->> 'rolloutStatus', 'live')
      )
      ON CONFLICT (feature_key) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, feature_entitlements.display_name),
        description = COALESCE(EXCLUDED.description, feature_entitlements.description),
        updated_at = NOW();

      v_synced_count := v_synced_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_error_msg := SQLERRM;
      
      -- Log error to discovery_errors table
      INSERT INTO discovery_errors (feature_key, error_type, error_message, error_details)
      VALUES (
        COALESCE(v_key, 'unknown'),
        'sync_error',
        v_error_msg,
        jsonb_build_object('feature', v_feature)
      );
      
      v_errors := v_errors || jsonb_build_object(
        'key', COALESCE(v_key, 'unknown'),
        'error', v_error_msg
      );
    END;
  END LOOP;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'synced', v_synced_count,
    'failed', v_failed_count,
    'errors', v_errors,
    'total', v_synced_count + v_failed_count
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."sync_discovered_features"("p_discovered_features" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_org_license_summary"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  lic record;
begin
  select *
    into lic
  from public.org_licenses l
  where l.org_id = sync_org_license_summary.org_id;  -- parameter qualified by function name

  if lic is null then
    return;
  end if;

  update public.organizations o
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
   where o.id = sync_org_license_summary.org_id;      -- parameter qualified
end;
$$;


ALTER FUNCTION "public"."sync_org_license_summary"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_organization_connect_status"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_payout_account_id TEXT;
  v_result JSONB;
BEGIN
  -- Get payout_account_id
  SELECT payout_account_id INTO v_payout_account_id
  FROM organizations
  WHERE id = p_org_id;

  IF v_payout_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Organization does not have a connected Stripe account',
      'code', 'NO_CONNECT_ACCOUNT'
    );
  END IF;

  -- Note: Actual Stripe API call should be done in edge function
  -- This function is a placeholder for the sync logic
  -- The edge function will call Stripe API and update the database
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sync initiated. Status will be updated via webhook.',
    'payout_account_id', v_payout_account_id
  );
END;
$$;


ALTER FUNCTION "public"."sync_organization_connect_status"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_organization_connect_status"("p_org_id" "uuid") IS 'Initiates sync of organization Stripe Connect status. Actual sync happens via Stripe API call in edge function.';



CREATE OR REPLACE FUNCTION "public"."sync_organization_license_from_org_licenses"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_org_id uuid;
begin
  -- Determine org_id for INSERT/UPDATE/DELETE
  v_org_id := coalesce(new.org_id, old.org_id);

  if v_org_id is null then
    return null;
  end if;

  -- If the license row was deleted, decide what org should show.
  -- Here: reset to trial-ish defaults (adjust to your business rules).
  if tg_op = 'DELETE' then
    update public.organizations o
    set
      license_status = 'trial'::public.license_status,
      license_plan = null,
      license_current_period_start = null,
      license_current_period_end = null,
      license_trial_ends_at = null,
      license_grace_ends_at = null,
      license_cancel_at_period_end = false,
      stripe_customer_id = null,
      stripe_subscription_id = null,
      stripe_price_id = null,
      updated_at = now()
    where o.id = v_org_id;

    return old;
  end if;

  -- INSERT or UPDATE: copy license fields over
  update public.organizations o
  set
    license_status = new.status,
    license_plan = new.plan,
    license_current_period_start = new.current_period_start,
    license_current_period_end = new.current_period_end,
    license_trial_ends_at = new.trial_ends_at,
    license_grace_ends_at = new.grace_ends_at,
    license_cancel_at_period_end = coalesce(new.cancel_at_period_end, false),
    stripe_customer_id = new.stripe_customer_id,
    stripe_subscription_id = new.stripe_subscription_id,
    stripe_price_id = new.stripe_price_id,
    updated_at = now()
  where o.id = new.org_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_organization_license_from_org_licenses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_rsvp_to_attendance"("p_event_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_rsvp_to_attendance"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_is_visible_to_user"("check_user_id" "uuid", "check_team_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
begin
  -- Short-circuit for platform admins
  if is_platform_admin(check_user_id) then
    return true;
  end if;

  select org_id into v_org_id
  from teams
  where id = check_team_id;

  -- Org members (any role) can see teams in their org
  if exists (
    select 1
    from organization_members om
    where om.user_id = check_user_id
      and om.org_id = v_org_id
  ) then
    return true;
  end if;

  -- Parents via family link
  if exists (
    select 1
    from team_memberships tm
    join athletes a on a.id = tm.athlete_id
    join users u on u.id = check_user_id and u.family_id = a.family_id
    where tm.team_id = check_team_id
  ) then
    return true;
  end if;

  -- Guardians via athlete_guardians
  if exists (
    select 1
    from team_memberships tm
    where tm.team_id = check_team_id
      and user_is_guardian_of_child(check_user_id, tm.athlete_id)
  ) then
    return true;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."team_is_visible_to_user"("check_user_id" "uuid", "check_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_membership_is_visible_to_user"("check_user_id" "uuid", "check_team_id" "uuid", "check_athlete_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
begin
  if is_platform_admin(check_user_id) then
    return true;
  end if;

  select org_id into v_org_id
  from teams
  where id = check_team_id;

  -- Org member can see memberships for teams in their org
  if exists (
    select 1
    from organization_members om
    where om.user_id = check_user_id
      and om.org_id = v_org_id
  ) then
    return true;
  end if;

  -- Parent/guardian checks
  if user_is_guardian_of_child(check_user_id, check_athlete_id) then
    return true;
  end if;

  if exists (
    select 1
    from athletes a
    join users u on u.id = check_user_id and u.family_id = a.family_id
    where a.id = check_athlete_id
  ) then
    return true;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."team_membership_is_visible_to_user"("check_user_id" "uuid", "check_team_id" "uuid", "check_athlete_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sync_org_license_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$begin
  perform sync_org_license_summary(new.org_id);
  return new;
end;$$;


ALTER FUNCTION "public"."trg_sync_org_license_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_notification_worker"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get Supabase URL from settings
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, try to construct from project ref
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;
  
  -- Only attempt to call if we have valid settings
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notification-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := '{}'::jsonb
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to trigger notification worker: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."trigger_notification_worker"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_athlete_sports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_athlete_sports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_rsvp_config"("p_event_id" "uuid", "p_rsvp_enabled" boolean, "p_rsvp_type" "text", "p_clear_existing" boolean) RETURNS TABLE("success" boolean, "error" "text", "has_data" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_enabled BOOLEAN;
  v_current_type TEXT;
  v_general_count INTEGER;
  v_athlete_count INTEGER;
  v_config_changed BOOLEAN;
BEGIN
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID is required';
  END IF;

  SELECT rsvp_enabled, rsvp_type
  INTO v_current_enabled, v_current_type
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Normalize: if RSVP disabled, force type to NULL
  IF NOT p_rsvp_enabled THEN
    p_rsvp_type := NULL;
  END IF;

  -- Validate RSVP type when enabled
  IF p_rsvp_enabled AND p_rsvp_type IS NULL THEN
    RAISE EXCEPTION 'RSVP type is required when RSVP is enabled';
  END IF;

  IF p_rsvp_enabled AND p_rsvp_type NOT IN ('general', 'athlete') THEN
    RAISE EXCEPTION 'Invalid RSVP type';
  END IF;

  v_config_changed :=
    (v_current_enabled IS DISTINCT FROM p_rsvp_enabled)
    OR (v_current_type IS DISTINCT FROM p_rsvp_type);

  IF v_config_changed THEN
    SELECT COUNT(*) INTO v_general_count
    FROM event_general_rsvps
    WHERE event_id = p_event_id;

    SELECT COUNT(*) INTO v_athlete_count
    FROM event_rsvps
    WHERE event_id = p_event_id;

    IF (v_general_count > 0 OR v_athlete_count > 0) THEN
      IF NOT p_clear_existing THEN
        RETURN QUERY SELECT false, 'existing_rsvps', true;
        RETURN;
      END IF;

      DELETE FROM event_general_rsvps WHERE event_id = p_event_id;
      DELETE FROM event_rsvps WHERE event_id = p_event_id;
    END IF;
  END IF;

  UPDATE events
  SET rsvp_enabled = p_rsvp_enabled,
      rsvp_type = p_rsvp_type,
      updated_at = NOW()
  WHERE id = p_event_id;

  RETURN QUERY SELECT true, NULL, false;
END;
$$;


ALTER FUNCTION "public"."update_event_rsvp_config"("p_event_id" "uuid", "p_rsvp_enabled" boolean, "p_rsvp_type" "text", "p_clear_existing" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feature_entitlements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_feature_entitlements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fee_assignment_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_fee_assignment_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_license_tiers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_license_tiers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_org_licenses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_org_licenses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_org_slug"("p_org_id" "uuid", "p_new_slug" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_slug TEXT;
BEGIN
  -- Enforce: only org admins or platform admins can update slug (function runs as DEFINER, so RLS is bypassed)
  IF NOT (user_is_org_admin(auth.uid(), p_org_id) OR is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to update this organization slug';
  END IF;

  -- Get current slug
  SELECT slug INTO v_old_slug
  FROM organizations
  WHERE id = p_org_id;
  
  -- Validate new slug is not in use
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE slug = LOWER(p_new_slug) AND id != p_org_id
  ) THEN
    RAISE EXCEPTION 'Slug % is already in use', p_new_slug;
  END IF;
  
  -- Delete any existing history entries where previous_slug = new_slug (prevent cycles)
  DELETE FROM org_slug_history 
  WHERE previous_slug = LOWER(p_new_slug);
  
  -- If there was an old slug, add it to history
  IF v_old_slug IS NOT NULL AND v_old_slug != LOWER(p_new_slug) THEN
    INSERT INTO org_slug_history (org_id, previous_slug, expires_at)
    VALUES (
      p_org_id,
      v_old_slug,
      NOW() + INTERVAL '12 months'
    )
    ON CONFLICT DO NOTHING; -- Ignore if already exists
  END IF;
  
  -- Update org with new slug
  UPDATE organizations
  SET slug = LOWER(p_new_slug),
      updated_at = NOW()
  WHERE id = p_org_id;
END;
$$;


ALTER FUNCTION "public"."update_org_slug"("p_org_id" "uuid", "p_new_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_org_slug"("p_org_id" "uuid", "p_new_slug" "text") IS 'Updates an org slug and automatically creates redirect history for the old slug. Prevents cycles and collisions.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Helper function for updated_at triggers. Used by feature flags system.';



CREATE OR REPLACE FUNCTION "public"."update_venue_insights_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_venue_insights_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_venue_nearby_amenities_summaries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_venue_nearby_amenities_summaries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_venue_nearby_places_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_venue_nearby_places_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_tag_usage_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_tags SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_tags SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_video_tag_usage_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_video_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_athlete"("p_athlete_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    WHERE ag.athlete_id = p_athlete_id
      AND ag.user_id = p_user_id
      AND ag.status = 'active'
  );
$$;


ALTER FUNCTION "public"."user_can_access_athlete"("p_athlete_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_can_access_athlete"("p_athlete_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user can access an athlete via guardian relationship. Used in RLS policies.';



CREATE OR REPLACE FUNCTION "public"."user_has_all_org_roles"("check_user_id" "uuid", "check_org_id" "uuid", "check_roles" "public"."org_member_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    NOT EXISTS (
      SELECT 1 FROM UNNEST(check_roles) AS missing(role)
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = check_user_id
          AND org_id = check_org_id
          AND role = missing.role
      )
    );
$$;


ALTER FUNCTION "public"."user_has_all_org_roles"("check_user_id" "uuid", "check_org_id" "uuid", "check_roles" "public"."org_member_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_any_org_roles"("check_user_id" "uuid", "check_org_id" "uuid", "check_roles" "public"."org_member_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = check_user_id
        AND org_id = check_org_id
        AND role = ANY(check_roles)
    );
$$;


ALTER FUNCTION "public"."user_has_any_org_roles"("check_user_id" "uuid", "check_org_id" "uuid", "check_roles" "public"."org_member_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_org_access"("check_user_id" "uuid", "check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT 
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = check_user_id 
      AND organization_id = check_org_id
    );
$$;


ALTER FUNCTION "public"."user_has_org_access"("check_user_id" "uuid", "check_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_org_access"("check_user_id" "uuid", "check_org_id" "uuid") IS 'STABLE: Check if user has any access to org. Used by RLS policies.';



CREATE OR REPLACE FUNCTION "public"."user_has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "check_role" "public"."org_member_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT 
    is_platform_admin(check_user_id) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = check_user_id 
      AND organization_id = check_org_id
      AND role = check_role
    );
$$;


ALTER FUNCTION "public"."user_has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "check_role" "public"."org_member_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_org_role"("check_user_id" "uuid", "check_org_id" "uuid", "check_role" "public"."org_member_role") IS 'STABLE: Check if user has specific role in org. Used by RLS policies.';



CREATE OR REPLACE FUNCTION "public"."user_is_guardian_of_child"("check_user_id" "uuid", "check_child_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM athlete_guardians ag
    WHERE ag.user_id = check_user_id
      AND ag.athlete_id = check_child_id
      AND ag.status = 'active'
  );
$$;


ALTER FUNCTION "public"."user_is_guardian_of_child"("check_user_id" "uuid", "check_child_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_is_guardian_of_child"("check_user_id" "uuid", "check_child_id" "uuid") IS 'Legacy function name kept for compatibility. Checks if user is an active guardian of athlete.';



CREATE OR REPLACE FUNCTION "public"."user_is_org_admin"("check_user_id" "uuid", "check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT user_has_org_role(check_user_id, check_org_id, 'org_admin');
$$;


ALTER FUNCTION "public"."user_is_org_admin"("check_user_id" "uuid", "check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_event_type"("p_category" "public"."event_category", "p_event_type" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM valid_event_types
    WHERE category = p_category
    AND event_type = p_event_type
  );
$$;


ALTER FUNCTION "public"."validate_event_type"("p_category" "public"."event_category", "p_event_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_event_type"("p_category" "public"."event_category", "p_event_type" "text") IS 'Validates that an event_type is valid for the given category.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_index_backup" (
    "indexname" "name",
    "indexdef" "text",
    "tablename" "name",
    "schemaname" "name"
);

ALTER TABLE ONLY "public"."_index_backup" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."_index_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_policy_consolidation_log" (
    "id" integer NOT NULL,
    "tablename" "text" NOT NULL,
    "original_policies" "text"[] NOT NULL,
    "consolidated_policy" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."_policy_consolidation_log" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."_policy_consolidation_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."_policy_consolidation_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."_policy_consolidation_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."_policy_consolidation_log_id_seq" OWNED BY "public"."_policy_consolidation_log"."id";



CREATE TABLE IF NOT EXISTS "public"."_rls_policy_backup" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);

ALTER TABLE ONLY "public"."_rls_policy_backup" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."_rls_policy_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_rls_validation_results" (
    "id" integer NOT NULL,
    "test_name" "text" NOT NULL,
    "test_category" "text" NOT NULL,
    "passed" boolean NOT NULL,
    "message" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."_rls_validation_results" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."_rls_validation_results" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."_rls_validation_results_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."_rls_validation_results_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."_rls_validation_results_id_seq" OWNED BY "public"."_rls_validation_results"."id";



CREATE TABLE IF NOT EXISTS "public"."entitlement_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "feature_entitlement_id" "uuid" NOT NULL,
    "override_action" "text" NOT NULL,
    "limit_value" integer,
    "role_admin" boolean,
    "role_coach" boolean,
    "role_parent" boolean,
    "reason" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone,
    "revoked_by" "uuid",
    "revoked_reason" "text",
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "check_limit_required_for_set_limit" CHECK ((("override_action" <> 'set_limit'::"text") OR (("override_action" = 'set_limit'::"text") AND ("limit_value" IS NOT NULL)))),
    CONSTRAINT "check_limit_value_positive" CHECK ((("override_action" <> 'set_limit'::"text") OR (("override_action" = 'set_limit'::"text") AND ("limit_value" IS NOT NULL) AND ("limit_value" > 0)))),
    CONSTRAINT "check_reason_not_empty" CHECK ((("reason" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "reason")) > 0))),
    CONSTRAINT "entitlement_overrides_override_action_check" CHECK (("override_action" = ANY (ARRAY['enable'::"text", 'disable'::"text", 'set_limit'::"text"]))),
    CONSTRAINT "entitlement_overrides_target_type_check" CHECK (("target_type" = ANY (ARRAY['organization'::"text", 'user'::"text"])))
);

ALTER TABLE ONLY "public"."entitlement_overrides" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."entitlement_overrides" OWNER TO "postgres";


COMMENT ON COLUMN "public"."entitlement_overrides"."version" IS 'Version number for optimistic locking. Increments on each update to detect concurrent modifications.';



COMMENT ON CONSTRAINT "check_limit_required_for_set_limit" ON "public"."entitlement_overrides" IS 'Ensures limit_value is provided when override_action is set_limit.';



COMMENT ON CONSTRAINT "check_limit_value_positive" ON "public"."entitlement_overrides" IS 'Ensures limit_value is positive when override_action is set_limit.';



COMMENT ON CONSTRAINT "check_reason_not_empty" ON "public"."entitlement_overrides" IS 'Ensures reason is provided and not empty.';



CREATE TABLE IF NOT EXISTS "public"."feature_discovery_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discovered_features" "jsonb" NOT NULL,
    "last_discovered_at" timestamp with time zone NOT NULL,
    "last_synced_at" timestamp with time zone,
    "discovery_version" "text",
    "schema_hash" "text",
    "sync_status" "text",
    "sync_errors" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_discovery_cache_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['pending'::"text", 'synced'::"text", 'failed'::"text"])))
);

ALTER TABLE ONLY "public"."feature_discovery_cache" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_discovery_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "feature_type" "text" NOT NULL,
    "description" "text",
    "rollout_status" "text" DEFAULT 'live'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "is_toggleable" boolean DEFAULT true NOT NULL,
    "is_removable" boolean DEFAULT true NOT NULL,
    "lock_reason" "text",
    "is_system_feature" boolean DEFAULT false NOT NULL,
    "platform_admin_only" boolean DEFAULT false NOT NULL,
    "unavailable_gate_action" "text" DEFAULT 'overlay'::"text",
    CONSTRAINT "feature_entitlements_feature_type_check" CHECK (("feature_type" = ANY (ARRAY['module'::"text", 'permission'::"text", 'limit'::"text", 'visibility'::"text", 'integration'::"text"]))),
    CONSTRAINT "feature_entitlements_rollout_status_check" CHECK (("rollout_status" = ANY (ARRAY['live'::"text", 'beta'::"text", 'hidden'::"text"]))),
    CONSTRAINT "feature_entitlements_unavailable_gate_action_check" CHECK (("unavailable_gate_action" = ANY (ARRAY['disable'::"text", 'overlay'::"text", 'hide'::"text", 'modal'::"text", 'paywall'::"text", 'custom'::"text"])))
);

ALTER TABLE ONLY "public"."feature_entitlements" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_entitlements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feature_entitlements"."is_toggleable" IS 'If false, feature status cannot be changed (always enabled)';



COMMENT ON COLUMN "public"."feature_entitlements"."is_removable" IS 'If false, feature cannot be deleted or removed from tiers';



COMMENT ON COLUMN "public"."feature_entitlements"."lock_reason" IS 'Explanation for why feature is locked (shown to admins)';



COMMENT ON COLUMN "public"."feature_entitlements"."is_system_feature" IS 'If true, feature is always available for every license tier; new tiers get it automatically.';



COMMENT ON COLUMN "public"."feature_entitlements"."platform_admin_only" IS 'If true, feature is not available to org users; only platform admins can use it.';



COMMENT ON COLUMN "public"."feature_entitlements"."unavailable_gate_action" IS 'Behavior when feature is not available: disable (grayed out), overlay (visible but blocked), hide (not shown), modal (show explanation), paywall (redirect to upgrade), custom (app-specific)';



CREATE TABLE IF NOT EXISTS "public"."feature_integration_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_entitlement_id" "uuid" NOT NULL,
    "integration_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."feature_integration_assignments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_integration_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."license_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_key" "text" NOT NULL,
    "tier_name" "text" NOT NULL,
    "description" "text",
    "stripe_price_id" "text" NOT NULL,
    "stripe_verified_at" timestamp with time zone,
    "stripe_product_name" "text",
    "stripe_amount_cents" integer,
    "stripe_interval" "text",
    "stripe_currency" "text",
    "stripe_active" boolean,
    "status" "text" DEFAULT 'active'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "license_tiers_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);

ALTER TABLE ONLY "public"."license_tiers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."license_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tier_feature_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "license_tier_id" "uuid" NOT NULL,
    "feature_entitlement_id" "uuid" NOT NULL,
    "included" boolean DEFAULT true,
    "limit_value" integer,
    "role_admin" boolean DEFAULT true,
    "role_coach" boolean DEFAULT true,
    "role_parent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."tier_feature_assignments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tier_feature_assignments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_feature_entitlements_list" WITH ("security_invoker"='true') AS
 SELECT "id",
    "feature_key",
    "display_name",
    "category",
    "feature_type",
    "description",
    "rollout_status",
    "created_at",
    "updated_at",
    "archived_at",
    "is_toggleable",
    "is_removable",
    "lock_reason",
    "is_system_feature",
    "platform_admin_only",
    "unavailable_gate_action",
    ( SELECT "count"(*) AS "count"
           FROM "public"."tier_feature_assignments" "tfa"
          WHERE (("tfa"."feature_entitlement_id" = "fe"."id") AND ("tfa"."included" = true))) AS "tier_assignments_count",
    COALESCE(( SELECT "array_agg"(DISTINCT "lt"."tier_key") AS "array_agg"
           FROM ("public"."tier_feature_assignments" "tfa"
             JOIN "public"."license_tiers" "lt" ON (("lt"."id" = "tfa"."license_tier_id")))
          WHERE (("tfa"."feature_entitlement_id" = "fe"."id") AND ("tfa"."included" = true) AND ("lt"."status" = 'active'::"text"))), ARRAY[]::"text"[]) AS "assigned_tier_keys",
    COALESCE(( SELECT "bool_or"("tfa"."role_admin") AS "bool_or"
           FROM "public"."tier_feature_assignments" "tfa"
          WHERE (("tfa"."feature_entitlement_id" = "fe"."id") AND ("tfa"."included" = true))), false) AS "visible_to_admin",
    COALESCE(( SELECT "bool_or"("tfa"."role_coach") AS "bool_or"
           FROM "public"."tier_feature_assignments" "tfa"
          WHERE (("tfa"."feature_entitlement_id" = "fe"."id") AND ("tfa"."included" = true))), false) AS "visible_to_coach",
    COALESCE(( SELECT "bool_or"("tfa"."role_parent") AS "bool_or"
           FROM "public"."tier_feature_assignments" "tfa"
          WHERE (("tfa"."feature_entitlement_id" = "fe"."id") AND ("tfa"."included" = true))), false) AS "visible_to_parent",
    COALESCE(( SELECT "array_agg"(DISTINCT "fia"."integration_name") AS "array_agg"
           FROM "public"."feature_integration_assignments" "fia"
          WHERE ("fia"."feature_entitlement_id" = "fe"."id")), ARRAY[]::"text"[]) AS "integrations",
    COALESCE(( SELECT "bool_or"(("tfa"."limit_value" IS NOT NULL)) AS "bool_or"
           FROM "public"."tier_feature_assignments" "tfa"
          WHERE (("tfa"."feature_entitlement_id" = "fe"."id") AND ("tfa"."included" = true))), false) AS "is_quantifiable",
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."feature_discovery_cache" "fdc"
              WHERE ("fdc"."discovered_features" @> "jsonb_build_array"("jsonb_build_object"('featureKey', "fe"."feature_key"))))) THEN 'auto-discovered'::"text"
            WHEN ("created_at" = "updated_at") THEN 'manually-created'::"text"
            ELSE 'override-custom'::"text"
        END AS "discovery_source",
    ( SELECT "count"(*) AS "count"
           FROM "public"."entitlement_overrides" "eo"
          WHERE (("eo"."feature_entitlement_id" = "fe"."id") AND ("eo"."revoked_at" IS NULL) AND (("eo"."expires_at" IS NULL) OR ("eo"."expires_at" > "now"())))) AS "active_overrides_count"
   FROM "public"."feature_entitlements" "fe";


ALTER VIEW "public"."admin_feature_entitlements_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "feature_key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "key" "text",
    "value_type" "public"."feature_flag_value_type",
    "description" "text",
    "environment" "public"."feature_flag_environment",
    "deleted_at" timestamp with time zone,
    "version" integer
);

ALTER TABLE ONLY "public"."feature_flags" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flags" IS 'Feature flag definitions. Supports soft deletion via deleted_at.';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."organizations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."platform_admin_role" DEFAULT 'support_admin'::"public"."platform_admin_role" NOT NULL
);

ALTER TABLE ONLY "public"."platform_admins" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."platform_admins" IS 'Global platform administrators with access to all organizations.';



CREATE OR REPLACE VIEW "public"."admin_feature_flags" WITH ("security_invoker"='true') AS
 SELECT "ff"."id",
    "ff"."org_id",
    "o"."name" AS "organization_name",
    "ff"."feature_key",
    "ff"."enabled",
    "ff"."created_at",
    "ff"."updated_at"
   FROM ("public"."feature_flags" "ff"
     JOIN "public"."organizations" "o" ON (("o"."id" = "ff"."org_id")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."platform_admins" "pa"
          WHERE ("pa"."user_id" = "auth"."uid"())))
  ORDER BY "o"."name", "ff"."feature_key";


ALTER VIEW "public"."admin_feature_flags" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_feature_flags" IS 'Platform admin view: feature flag status. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';



CREATE TABLE IF NOT EXISTS "public"."fee_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "fee_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "due_date" "date",
    "status" "public"."fee_assignment_status" DEFAULT 'unpaid'::"public"."fee_assignment_status" NOT NULL,
    "balance_cents" integer DEFAULT 0 NOT NULL,
    "paid_cents_total" integer DEFAULT 0 NOT NULL,
    "waived_cents_total" integer DEFAULT 0 NOT NULL,
    "scholarship_cents_total" integer DEFAULT 0 NOT NULL,
    "discount_cents_total" integer DEFAULT 0 NOT NULL,
    "late_fee_cents_applied" integer DEFAULT 0 NOT NULL,
    "notes_internal" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fee_assignments_balance_nonnegative" CHECK (("balance_cents" >= 0)),
    CONSTRAINT "fee_assignments_status_balance_match" CHECK (((("status" = 'paid'::"public"."fee_assignment_status") AND ("balance_cents" = 0)) OR (("status" = 'partial'::"public"."fee_assignment_status") AND ("balance_cents" > 0) AND ("balance_cents" < "amount_cents")) OR (("status" = 'unpaid'::"public"."fee_assignment_status") AND ("balance_cents" = "amount_cents")) OR ("status" = ANY (ARRAY['waived'::"public"."fee_assignment_status", 'refunded'::"public"."fee_assignment_status", 'scholarship_applied'::"public"."fee_assignment_status", 'offline_recorded'::"public"."fee_assignment_status"]))))
);

ALTER TABLE ONLY "public"."fee_assignments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "fee_type" "public"."fee_type" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "due_date" "date",
    "scope" "public"."fee_scope" NOT NULL,
    "status" "public"."fee_status" DEFAULT 'draft'::"public"."fee_status" NOT NULL,
    "allow_partial_payment" boolean DEFAULT false,
    "min_partial_cents" integer,
    "allow_late_payment" boolean DEFAULT false,
    "late_fee_cents" integer,
    "late_fee_starts_on" "date",
    "allow_installments" boolean DEFAULT false,
    "installment_plan_id" "uuid",
    "allow_discounts" boolean DEFAULT false,
    "allow_scholarships" boolean DEFAULT false,
    "visibility" "public"."fee_visibility" DEFAULT 'all_parents'::"public"."fee_visibility" NOT NULL,
    "require_acknowledgement" boolean DEFAULT false,
    "ack_text" "text",
    "created_by_admin_id" "uuid",
    "published_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."fees" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fees" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_fees_status" WITH ("security_invoker"='true') AS
 SELECT "f"."id" AS "fee_id",
    "f"."title" AS "fee_name",
    "f"."amount_cents",
    "f"."currency",
    "f"."due_date",
    "f"."status" AS "fee_status",
    "o"."id" AS "org_id",
    "o"."name" AS "organization_name",
    ( SELECT "count"(*) AS "count"
           FROM "public"."fee_assignments" "fa"
          WHERE ("fa"."fee_id" = "f"."id")) AS "assigned_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."fee_assignments" "fa"
          WHERE (("fa"."fee_id" = "f"."id") AND ("fa"."status" = 'paid'::"public"."fee_assignment_status"))) AS "paid_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."fee_assignments" "fa"
          WHERE (("fa"."fee_id" = "f"."id") AND ("fa"."status" = ANY (ARRAY['unpaid'::"public"."fee_assignment_status", 'partial'::"public"."fee_assignment_status"])))) AS "unpaid_count",
        CASE
            WHEN (( SELECT "count"(*) AS "count"
               FROM "public"."fee_assignments" "fa"
              WHERE ("fa"."fee_id" = "f"."id")) > 0) THEN "round"((((( SELECT "count"(*) AS "count"
               FROM "public"."fee_assignments" "fa"
              WHERE (("fa"."fee_id" = "f"."id") AND ("fa"."status" = 'paid'::"public"."fee_assignment_status"))))::numeric / (( SELECT "count"(*) AS "count"
               FROM "public"."fee_assignments" "fa"
              WHERE ("fa"."fee_id" = "f"."id")))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "payment_rate_percent"
   FROM ("public"."fees" "f"
     JOIN "public"."organizations" "o" ON (("o"."id" = "f"."org_id")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."platform_admins" "pa"
          WHERE ("pa"."user_id" = "auth"."uid"())));


ALTER VIEW "public"."admin_fees_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_fees_status" IS 'Platform admin view: fee status and payment rates. Protected by RLS - only accessible to platform admins via auth.uid() check in view definition.';



CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "public"."announcement_type" DEFAULT 'general'::"public"."announcement_type" NOT NULL,
    "org_id" "uuid",
    CONSTRAINT "announcements_org_id_required" CHECK (("org_id" IS NOT NULL)),
    CONSTRAINT "announcements_priority_check" CHECK (("priority" = ANY (ARRAY['normal'::"text", 'urgent'::"text"])))
);

ALTER TABLE ONLY "public"."announcements" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."announcements"."team_id" IS 'NULL for organization-wide announcements, otherwise the team ID';



COMMENT ON COLUMN "public"."announcements"."type" IS 'Type of announcement (general, reminder, schedule_change, urgent, payment, travel)';



COMMENT ON COLUMN "public"."announcements"."org_id" IS 'Organization ID - required for all announcements';



CREATE TABLE IF NOT EXISTS "public"."athlete_guardians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "status" "public"."athlete_guardian_status" DEFAULT 'pending'::"public"."athlete_guardian_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."athlete_guardians" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_guardians" OWNER TO "postgres";


COMMENT ON TABLE "public"."athlete_guardians" IS 'Links athletes to their guardians (parents/legal guardians). Multiple athletes sharing guardians form a family.';



CREATE TABLE IF NOT EXISTS "public"."athlete_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by_user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text",
    "file_size_bytes" integer,
    "total_rows" integer DEFAULT 0 NOT NULL,
    "imported_count" integer DEFAULT 0 NOT NULL,
    "updated_count" integer DEFAULT 0 NOT NULL,
    "skipped_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "results_json" "jsonb",
    "error_summary" "jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."athlete_imports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_medical_private" (
    "athlete_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "medical_notes" "text",
    "allergies" "text",
    "emergency_contact" "jsonb",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."athlete_medical_private" OWNER TO "postgres";


COMMENT ON TABLE "public"."athlete_medical_private" IS 'Sensitive medical information for athletes. Separate table with stricter RLS policies. Access controlled by org settings and user roles.';



COMMENT ON COLUMN "public"."athlete_medical_private"."medical_notes" IS 'Confidential medical notes, conditions, medications, etc. Visible only to parents/guardians, org admins, and coaches if org setting allows.';



COMMENT ON COLUMN "public"."athlete_medical_private"."allergies" IS 'Known allergies. Migrated from athletes table for consistency.';



COMMENT ON COLUMN "public"."athlete_medical_private"."emergency_contact" IS 'JSONB object with emergency contact information: {name, relationship, phone, email}. Example: {"name": "Jane Doe", "relationship": "mother", "phone": "555-1234", "email": "jane@example.com"}';



CREATE TABLE IF NOT EXISTS "public"."athlete_sport_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "sport_code" "text" NOT NULL,
    "profile_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "equipment_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "completeness_score" integer DEFAULT 0 NOT NULL,
    "last_verified_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "athlete_sport_profiles_completeness_range" CHECK ((("completeness_score" >= 0) AND ("completeness_score" <= 100))),
    CONSTRAINT "athlete_sport_profiles_sport_code_format" CHECK (("sport_code" ~ '^[a-z0-9_]+$'::"text"))
);


ALTER TABLE "public"."athlete_sport_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."athlete_sport_profiles" IS 'Sport-specific profile and equipment data for athletes. Uses JSONB for flexibility while maintaining validation through sport_field_definitions table.';



COMMENT ON COLUMN "public"."athlete_sport_profiles"."sport_code" IS 'Snake_case sport identifier (e.g., basketball, flag_football). Must match sport_field_definitions.';



COMMENT ON COLUMN "public"."athlete_sport_profiles"."profile_data" IS 'JSONB containing sport-specific profile fields (positions, experience, metrics, etc.). Schema driven by sport_field_definitions.';



COMMENT ON COLUMN "public"."athlete_sport_profiles"."equipment_data" IS 'JSONB containing sport-specific equipment sizing (jerseys, shoes, protective gear, etc.). Schema driven by sport_field_definitions.';



COMMENT ON COLUMN "public"."athlete_sport_profiles"."completeness_score" IS 'Percentage (0-100) of required fields completed based on org_sport_profile_settings. Calculated on upsert.';



COMMENT ON COLUMN "public"."athlete_sport_profiles"."last_verified_at" IS 'Timestamp when parent/guardian last verified this data is current. Used for reminder campaigns.';



CREATE TABLE IF NOT EXISTS "public"."athlete_sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sport_type" "text" DEFAULT 'plays'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "athlete_sports_sport_type_check" CHECK (("sport_type" = ANY (ARRAY['plays'::"text", 'interested'::"text"])))
);

ALTER TABLE ONLY "public"."athlete_sports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_sports" OWNER TO "postgres";


COMMENT ON TABLE "public"."athlete_sports" IS 'Junction table linking athletes to sports with relationship type. Allows athletes to have sports marked as "plays" or "interested".';



COMMENT ON COLUMN "public"."athlete_sports"."athlete_id" IS 'Reference to the athlete';



COMMENT ON COLUMN "public"."athlete_sports"."sport_id" IS 'Reference to the sport (must be a system sport)';



COMMENT ON COLUMN "public"."athlete_sports"."org_id" IS 'Organization context for the athlete-sport relationship (needed for guardian RLS and queries).';



COMMENT ON COLUMN "public"."athlete_sports"."sport_type" IS 'Type of relationship: "plays" (athlete plays this sport) or "interested" (athlete is interested in playing)';



CREATE TABLE IF NOT EXISTS "public"."athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "birthdate" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "gender" "text",
    "preferred_name" "text",
    "jersey_number" "text",
    "medical_notes" "text",
    "allergies" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "phone" "text",
    "email" "text",
    "height_cm" integer,
    "weight_kg" numeric(6,2),
    "shoe_size_value" numeric(4,1),
    "shoe_size_system" "text",
    "shoe_width" "text",
    "tshirt_size" "text",
    "shorts_size" "text",
    "dominant_hand" "text",
    "emergency_contact" "jsonb",
    CONSTRAINT "athletes_dominant_hand_valid" CHECK ((("dominant_hand" IS NULL) OR ("dominant_hand" = ANY (ARRAY['left'::"text", 'right'::"text", 'ambidextrous'::"text"])))),
    CONSTRAINT "athletes_email_format" CHECK ((("email" IS NULL) OR ("email" ~ '@'::"text"))),
    CONSTRAINT "athletes_height_cm_range" CHECK ((("height_cm" IS NULL) OR (("height_cm" >= 50) AND ("height_cm" <= 250)))),
    CONSTRAINT "athletes_phone_length" CHECK ((("phone" IS NULL) OR ("length"("phone") <= 50))),
    CONSTRAINT "athletes_shoe_size_system_valid" CHECK ((("shoe_size_system" IS NULL) OR ("shoe_size_system" = ANY (ARRAY['us'::"text", 'eu'::"text", 'uk'::"text"])))),
    CONSTRAINT "athletes_shoe_width_valid" CHECK ((("shoe_width" IS NULL) OR ("shoe_width" = ANY (ARRAY['narrow'::"text", 'standard'::"text", 'wide'::"text"])))),
    CONSTRAINT "athletes_shorts_size_valid" CHECK ((("shorts_size" IS NULL) OR ("shorts_size" = ANY (ARRAY['YS'::"text", 'YM'::"text", 'YL'::"text", 'AS'::"text", 'AM'::"text", 'AL'::"text", 'AXL'::"text", 'AXXL'::"text", 'AXXXL'::"text"])))),
    CONSTRAINT "athletes_tshirt_size_valid" CHECK ((("tshirt_size" IS NULL) OR ("tshirt_size" = ANY (ARRAY['YS'::"text", 'YM'::"text", 'YL'::"text", 'AS'::"text", 'AM'::"text", 'AL'::"text", 'AXL'::"text", 'AXXL'::"text", 'AXXXL'::"text"])))),
    CONSTRAINT "athletes_weight_kg_range" CHECK ((("weight_kg" IS NULL) OR (("weight_kg" >= (5)::numeric) AND ("weight_kg" <= (300)::numeric))))
);

ALTER TABLE ONLY "public"."athletes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."athletes" OWNER TO "postgres";


COMMENT ON TABLE "public"."athletes" IS 'Athletes in the system. Each athlete can have multiple guardians via athlete_guardians. Families are derived from shared guardian relationships.';



COMMENT ON COLUMN "public"."athletes"."family_id" IS 'Legacy field - nullable. Families are now derived from athlete_guardians relationships.';



COMMENT ON COLUMN "public"."athletes"."preferred_name" IS 'The name the athlete prefers to be called (nickname, goes by name)';



COMMENT ON COLUMN "public"."athletes"."medical_notes" IS 'DEPRECATED: Use athlete_medical_private table instead. This column will be removed in a future migration.';



COMMENT ON COLUMN "public"."athletes"."allergies" IS 'DEPRECATED: Use athlete_medical_private table instead. This column will be removed in a future migration.';



COMMENT ON COLUMN "public"."athletes"."emergency_contact_name" IS 'Name of emergency contact person';



COMMENT ON COLUMN "public"."athletes"."emergency_contact_phone" IS 'Phone number of emergency contact person';



COMMENT ON COLUMN "public"."athletes"."phone" IS 'Athlete phone number';



COMMENT ON COLUMN "public"."athletes"."email" IS 'Athlete email address';



COMMENT ON COLUMN "public"."athletes"."height_cm" IS 'Athlete height in centimeters. UI supports ft/in and cm input, stored normalized as cm.';



COMMENT ON COLUMN "public"."athletes"."weight_kg" IS 'Athlete weight in kilograms. UI supports lbs and kg input, stored normalized as kg.';



COMMENT ON COLUMN "public"."athletes"."shoe_size_value" IS 'Numeric shoe size value. System (US/EU/UK) stored separately in shoe_size_system.';



COMMENT ON COLUMN "public"."athletes"."shoe_size_system" IS 'Shoe sizing system: us, eu, or uk. Used with shoe_size_value.';



COMMENT ON COLUMN "public"."athletes"."shoe_width" IS 'Shoe width: narrow, standard, or wide. Helps with proper footwear fit.';



COMMENT ON COLUMN "public"."athletes"."tshirt_size" IS 'Universal t-shirt size. Enum: YS, YM, YL, AS, AM, AL, AXL, AXXL, AXXXL.';



COMMENT ON COLUMN "public"."athletes"."shorts_size" IS 'Universal shorts size. Enum: YS, YM, YL, AS, AM, AL, AXL, AXXL, AXXXL.';



COMMENT ON COLUMN "public"."athletes"."dominant_hand" IS 'Dominant hand: left, right, or ambidextrous. Relevant for many sports.';



COMMENT ON COLUMN "public"."athletes"."emergency_contact" IS 'JSONB emergency contact: {name, relationship, phone, email}. Replaces deprecated emergency_contact_name/phone columns.';



CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "status" "public"."attendance_status" DEFAULT 'going'::"public"."attendance_status" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."attendance" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_settings" (
    "org_id" "uuid" NOT NULL,
    "reminder_enabled" boolean DEFAULT false,
    "lock_after_hours" integer DEFAULT 24,
    "required_for_practice" boolean DEFAULT true,
    "required_for_game" boolean DEFAULT true,
    "required_for_meeting" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."attendance_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs_old" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."audit_logs_old" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs_old" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs_old" IS 'Immutable audit log for all platform admin actions. No updates or deletes allowed.';



CREATE TABLE IF NOT EXISTS "public"."billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "event_type" "text",
    "stripe_event_id" "text",
    "stripe_object_id" "text",
    "payload" "jsonb",
    "error_message" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."billing_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "charge_type" "public"."charge_type" NOT NULL,
    "fee_assignment_id" "uuid",
    "fee_id" "uuid",
    "description" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "status" "public"."charge_status" DEFAULT 'pending'::"public"."charge_status" NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."charges" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_session_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkout_session_id" "uuid" NOT NULL,
    "charge_id" "uuid" NOT NULL,
    "fee_assignment_id" "uuid",
    "amount_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."checkout_session_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."checkout_session_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "status" "public"."checkout_session_status" DEFAULT 'created'::"public"."checkout_session_status" NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "subtotal_cents" integer DEFAULT 0 NOT NULL,
    "platform_fee_cents" integer DEFAULT 0 NOT NULL,
    "total_cents" integer DEFAULT 0 NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."checkout_sessions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."checkout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_claim_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "athlete_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "used_by_user_id" "uuid",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."child_claim_tokens" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."child_claim_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."children" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "birthdate" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."children" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."derived_families_mv" AS
 WITH "family_groups" AS (
         SELECT DISTINCT "ag1"."org_id" AS "organization_id",
            "ag1"."athlete_id",
            ("md5"("array_to_string"(("array_agg"(DISTINCT "ag2"."user_id" ORDER BY "ag2"."user_id"))::"text"[], ','::"text")))::"uuid" AS "family_group_id"
           FROM ("public"."athlete_guardians" "ag1"
             JOIN "public"."athlete_guardians" "ag2" ON (("ag1"."user_id" = "ag2"."user_id")))
          WHERE (("ag1"."status" = 'active'::"public"."athlete_guardian_status") AND ("ag2"."status" = 'active'::"public"."athlete_guardian_status"))
          GROUP BY "ag1"."org_id", "ag1"."athlete_id"
        )
 SELECT "organization_id",
    "family_group_id",
    "array_agg"("athlete_id" ORDER BY "athlete_id") AS "athlete_ids",
    "count"(*) AS "athlete_count"
   FROM "family_groups"
  GROUP BY "organization_id", "family_group_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."derived_families_mv" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."derived_families_mv" IS 'Precomputed family groups for performance. Refreshed automatically when athlete_guardians changes.';



CREATE TABLE IF NOT EXISTS "public"."discount_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "public"."discount_type" NOT NULL,
    "percent_off" integer,
    "amount_off_cents" integer,
    "max_redemptions" integer,
    "redeem_by" "date",
    "applies_to_fee_id" "uuid",
    "applies_to_season_id" "uuid",
    "status" "public"."discount_code_status" DEFAULT 'active'::"public"."discount_code_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."discount_codes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discount_code_id" "uuid" NOT NULL,
    "fee_assignment_id" "uuid" NOT NULL,
    "redeemed_by_parent_id" "uuid" NOT NULL,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_cents_applied" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."discount_redemptions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discovery_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text",
    "error_type" "text",
    "error_message" "text",
    "error_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."discovery_errors" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."discovery_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "status" "public"."event_attendance_status" DEFAULT 'present'::"public"."event_attendance_status" NOT NULL,
    "notes" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."event_attendance" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_change_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "changed_by_user_id" "uuid" NOT NULL,
    "change_type" "text" NOT NULL,
    "field_name" "text",
    "old_value" "text",
    "new_value" "text",
    "notification_sent" boolean DEFAULT false,
    "notification_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_change_type" CHECK (("change_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'cancelled'::"text", 'restored'::"text", 'rescheduled'::"text", 'deleted'::"text"])))
);

ALTER TABLE ONLY "public"."event_change_history" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_change_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_general_rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "status" "public"."general_rsvp_status" NOT NULL,
    "note" "text",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "general_rsvp_response_tracking" CHECK (("responded_at" IS NOT NULL)),
    CONSTRAINT "status_check" CHECK (("status" = ANY (ARRAY['going'::"public"."general_rsvp_status", 'not_going'::"public"."general_rsvp_status", 'maybe'::"public"."general_rsvp_status"])))
);

ALTER TABLE ONLY "public"."event_general_rsvps" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_general_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "venue_name" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'US'::"text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "is_tbd" boolean DEFAULT false,
    "is_virtual" boolean DEFAULT false,
    "virtual_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "maps_url" "text",
    "place_id" "text",
    CONSTRAINT "location_has_data" CHECK ((("is_tbd" = true) OR ("is_virtual" = true) OR ("venue_name" IS NOT NULL) OR ("address_line1" IS NOT NULL))),
    CONSTRAINT "valid_latitude" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "valid_longitude" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric)))),
    CONSTRAINT "virtual_has_link" CHECK ((("is_virtual" = false) OR ("virtual_link" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."event_locations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_locations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_locations"."maps_url" IS 'Google Maps or other map service URL for this location';



COMMENT ON COLUMN "public"."event_locations"."place_id" IS 'Google Places API place_id for structured address data';



CREATE TABLE IF NOT EXISTS "public"."event_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "public"."event_category" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_user_id" "uuid",
    "actor_role" "public"."event_actor_role" NOT NULL,
    "org_id" "uuid",
    "target_entity_type" "text",
    "target_entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "idempotency_key" "uuid"
);

ALTER TABLE ONLY "public"."event_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_logs" IS 'Comprehensive event logging system for all platform actions. Immutable audit trail.';



CREATE TABLE IF NOT EXISTS "public"."event_logs_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "public"."event_category" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_user_id" "uuid",
    "actor_role" "public"."event_actor_role" NOT NULL,
    "org_id" "uuid",
    "target_entity_type" "text",
    "target_entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "idempotency_key" "uuid"
);

ALTER TABLE ONLY "public"."event_logs_archive" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_logs_archive" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_logs_archive" IS 'Archived event logs (moved from event_logs after retention period).';



CREATE TABLE IF NOT EXISTS "public"."event_rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "status" "public"."rsvp_status" DEFAULT 'unknown'::"public"."rsvp_status" NOT NULL,
    "responded_at" timestamp with time zone,
    "responded_by_user_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rsvp_response_tracking" CHECK (((("status" = 'unknown'::"public"."rsvp_status") AND ("responded_at" IS NULL)) OR (("status" <> 'unknown'::"public"."rsvp_status") AND ("responded_at" IS NOT NULL))))
);

ALTER TABLE ONLY "public"."event_rsvps" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "public"."event_type" DEFAULT 'practice'::"public"."event_type" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "location" "text",
    "arrival_time" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "uniform_notes" "text",
    "equipment_notes" "text",
    "weather_dependent" boolean DEFAULT false,
    "external_link" "text",
    "is_cancelled" boolean DEFAULT false,
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by_user_id" "uuid",
    "requires_travel" boolean DEFAULT false,
    "overnight" boolean DEFAULT false,
    "departure_time" timestamp with time zone,
    "return_time" timestamp with time zone,
    "hotel_name" "text",
    "hotel_address" "text",
    "hotel_phone" "text",
    "hotel_confirmation" "text",
    "transportation_notes" "text",
    "itinerary_file_path" "text",
    "meeting_locations" "jsonb",
    "travel_override" "jsonb",
    "rsvp_enabled" boolean DEFAULT false,
    "rsvp_type" "text",
    "description" "text",
    CONSTRAINT "cancellation_data_integrity" CHECK (((("is_cancelled" = false) AND ("cancellation_reason" IS NULL) AND ("cancelled_at" IS NULL) AND ("cancelled_by_user_id" IS NULL)) OR (("is_cancelled" = true) AND ("cancelled_at" IS NOT NULL)))),
    CONSTRAINT "rsvp_config_check" CHECK (((("rsvp_enabled" = false) AND ("rsvp_type" IS NULL)) OR (("rsvp_enabled" = true) AND ("rsvp_type" = ANY (ARRAY['general'::"text", 'athlete'::"text"]))))),
    CONSTRAINT "travel_departure_before_start" CHECK ((("departure_time" IS NULL) OR ("departure_time" < "start_time"))),
    CONSTRAINT "travel_return_after_departure" CHECK ((("departure_time" IS NULL) OR ("return_time" IS NULL) OR ("return_time" > "departure_time"))),
    CONSTRAINT "travel_return_after_end" CHECK ((("return_time" IS NULL) OR ("return_time" > "end_time"))),
    CONSTRAINT "valid_time_order" CHECK ((("end_time" > "start_time") AND (("arrival_time" IS NULL) OR ("arrival_time" < "start_time")))),
    CONSTRAINT "valid_timezone" CHECK ((("timezone" ~ '^[A-Za-z]+/[A-Za-z_]+$'::"text") OR ("timezone" = 'UTC'::"text"))),
    CONSTRAINT "valid_travel_override" CHECK ((("travel_override" IS NULL) OR (("travel_override" ? 'is_travel'::"text") AND (("travel_override" ->> 'is_travel'::"text") = ANY (ARRAY['true'::"text", 'false'::"text"])))))
);

ALTER TABLE ONLY "public"."events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."requires_travel" IS 'Explicit flag indicating this event requires travel';



COMMENT ON COLUMN "public"."events"."overnight" IS 'Whether this is an overnight trip';



COMMENT ON COLUMN "public"."events"."departure_time" IS 'When to depart for this event';



COMMENT ON COLUMN "public"."events"."return_time" IS 'When to return from this event';



COMMENT ON COLUMN "public"."events"."hotel_name" IS 'Name of the hotel for travel events';



COMMENT ON COLUMN "public"."events"."hotel_address" IS 'Full address of the hotel';



COMMENT ON COLUMN "public"."events"."hotel_phone" IS 'Hotel phone number';



COMMENT ON COLUMN "public"."events"."hotel_confirmation" IS 'Hotel reservation confirmation number';



COMMENT ON COLUMN "public"."events"."transportation_notes" IS 'Travel instructions and transportation details';



COMMENT ON COLUMN "public"."events"."itinerary_file_path" IS 'Path to itinerary file in storage';



COMMENT ON COLUMN "public"."events"."meeting_locations" IS 'Array of meeting location objects: [{name, address, time, notes, maps_url}]';



COMMENT ON COLUMN "public"."events"."travel_override" IS 'Admin override: {is_travel: boolean, reason: string, overridden_by: uuid, overridden_at: timestamptz}';



COMMENT ON COLUMN "public"."events"."description" IS 'Event description text';



CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."families" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'parent'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "family_members_role_check" CHECK (("role" = ANY (ARRAY['parent'::"text", 'guardian'::"text", 'emergency_contact'::"text"])))
);

ALTER TABLE ONLY "public"."family_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."family_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_dependency_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_features" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."feature_dependency_cycles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_dependency_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_discovery_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "correction_type" "text",
    "before_state" "jsonb",
    "after_state" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_discovery_corrections_correction_type_check" CHECK (("correction_type" = ANY (ARRAY['approve'::"text", 'reject'::"text", 'visibility_change'::"text", 'integration_add'::"text"])))
);

ALTER TABLE ONLY "public"."feature_discovery_corrections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_discovery_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_discovery_hints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "hint_type" "text",
    "hint_value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_discovery_hints_hint_type_check" CHECK (("hint_type" = ANY (ARRAY['route_pattern'::"text", 'table_pattern'::"text", 'service_pattern'::"text"])))
);

ALTER TABLE ONLY "public"."feature_discovery_hints" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_discovery_hints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flag_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "feature_flag_id" "uuid",
    "scope_type" "text",
    "scope_id" "text",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "environment" "public"."feature_flag_environment" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."feature_flag_audit_log" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flag_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flag_audit_log" IS 'Immutable audit log for all feature flag changes. Never automatically deleted.';



CREATE TABLE IF NOT EXISTS "public"."feature_flag_org_overrides" (
    "feature_flag_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "environment" "public"."feature_flag_environment" NOT NULL,
    "value_boolean" boolean,
    "value_integer" integer,
    "value_double" double precision,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_org_override_double_range" CHECK ((("value_double" IS NULL) OR (("value_double" >= ('-179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'::numeric)::double precision) AND ("value_double" <= ('179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'::numeric)::double precision)))),
    CONSTRAINT "chk_org_override_integer_range" CHECK ((("value_integer" IS NULL) OR (("value_integer" >= '-2147483648'::integer) AND ("value_integer" <= 2147483647)))),
    CONSTRAINT "chk_org_override_one_value" CHECK (((((("value_boolean" IS NOT NULL))::integer + (("value_integer" IS NOT NULL))::integer) + (("value_double" IS NOT NULL))::integer) = 1))
);

ALTER TABLE ONLY "public"."feature_flag_org_overrides" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flag_org_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flag_org_overrides" IS 'Organization-specific overrides for feature flags.';



CREATE TABLE IF NOT EXISTS "public"."feature_flag_platform_defaults" (
    "feature_flag_id" "uuid" NOT NULL,
    "environment" "public"."feature_flag_environment" NOT NULL,
    "value_boolean" boolean,
    "value_integer" integer,
    "value_double" double precision,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_platform_default_double_range" CHECK ((("value_double" IS NULL) OR (("value_double" >= ('-179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'::numeric)::double precision) AND ("value_double" <= ('179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'::numeric)::double precision)))),
    CONSTRAINT "chk_platform_default_integer_range" CHECK ((("value_integer" IS NULL) OR (("value_integer" >= '-2147483648'::integer) AND ("value_integer" <= 2147483647)))),
    CONSTRAINT "chk_platform_default_one_value" CHECK (((((("value_boolean" IS NOT NULL))::integer + (("value_integer" IS NOT NULL))::integer) + (("value_double" IS NOT NULL))::integer) = 1))
);

ALTER TABLE ONLY "public"."feature_flag_platform_defaults" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flag_platform_defaults" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flag_platform_defaults" IS 'Platform-wide default values for feature flags.';



CREATE TABLE IF NOT EXISTS "public"."feature_flag_user_overrides" (
    "feature_flag_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "environment" "public"."feature_flag_environment" NOT NULL,
    "value_boolean" boolean,
    "value_integer" integer,
    "value_double" double precision,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_user_override_double_range" CHECK ((("value_double" IS NULL) OR (("value_double" >= ('-179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'::numeric)::double precision) AND ("value_double" <= ('179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'::numeric)::double precision)))),
    CONSTRAINT "chk_user_override_integer_range" CHECK ((("value_integer" IS NULL) OR (("value_integer" >= '-2147483648'::integer) AND ("value_integer" <= 2147483647)))),
    CONSTRAINT "chk_user_override_one_value" CHECK (((((("value_boolean" IS NOT NULL))::integer + (("value_integer" IS NOT NULL))::integer) + (("value_double" IS NOT NULL))::integer) = 1))
);

ALTER TABLE ONLY "public"."feature_flag_user_overrides" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flag_user_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flag_user_overrides" IS 'User-specific overrides for feature flags.';



CREATE TABLE IF NOT EXISTS "public"."feature_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key_pattern" "text" NOT NULL,
    "integration_name" "text" NOT NULL,
    "integration_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_integrations_integration_type_check" CHECK (("integration_type" = ANY (ARRAY['payment'::"text", 'email'::"text", 'calendar'::"text", 'storage'::"text", 'other'::"text"])))
);

ALTER TABLE ONLY "public"."feature_integrations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."galleries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "gallery_type" "public"."gallery_type" NOT NULL,
    "entity_id" "uuid",
    "name" "text" NOT NULL,
    "allow_contributions" boolean DEFAULT false NOT NULL,
    "require_approval" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "visibility" "public"."gallery_visibility" DEFAULT 'team'::"public"."gallery_visibility",
    "cover_photo_id" "uuid",
    "created_by_user_id" "uuid",
    CONSTRAINT "galleries_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."galleries" OWNER TO "postgres";


COMMENT ON TABLE "public"."galleries" IS 'Photo galleries for organizations, teams, athletes, events, and travel plans.';



CREATE TABLE IF NOT EXISTS "public"."gallery_albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gallery_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gallery_albums_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."gallery_albums" OWNER TO "postgres";


COMMENT ON TABLE "public"."gallery_albums" IS 'Optional albums within galleries for organizing photos.';



CREATE TABLE IF NOT EXISTS "public"."gallery_downloads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "downloaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gallery_downloads" OWNER TO "postgres";


COMMENT ON TABLE "public"."gallery_downloads" IS 'Audit log of photo downloads (optional).';



CREATE TABLE IF NOT EXISTS "public"."gallery_photo_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gallery_photo_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."gallery_photo_tags" IS 'Athletes tagged in photos for filtering and athlete-centric views.';



CREATE TABLE IF NOT EXISTS "public"."gallery_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gallery_id" "uuid" NOT NULL,
    "album_id" "uuid",
    "storage_path" "text" NOT NULL,
    "thumbnail_path" "text",
    "status" "public"."photo_status" DEFAULT 'pending'::"public"."photo_status" NOT NULL,
    "uploaded_by_user_id" "uuid" NOT NULL,
    "taken_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "filename" "text",
    "size_bytes" bigint,
    "sort_order" integer,
    CONSTRAINT "gallery_photos_storage_path_not_empty" CHECK (("length"(TRIM(BOTH FROM "storage_path")) > 0))
);


ALTER TABLE "public"."gallery_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."gallery_photos" IS 'Photos in galleries. Storage path points to public-media bucket. Status controls moderation.';



CREATE TABLE IF NOT EXISTS "public"."gallery_share_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gallery_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gallery_share_links_token_not_empty" CHECK (("length"(TRIM(BOTH FROM "token")) > 0))
);


ALTER TABLE "public"."gallery_share_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."gallery_share_links" IS 'Shareable links for galleries (optional feature).';



CREATE TABLE IF NOT EXISTS "public"."guardian_attachment_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "requested_by_user_id" "uuid" NOT NULL,
    "status" "public"."guardian_attachment_request_status" DEFAULT 'pending'::"public"."guardian_attachment_request_status" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "decision_reason" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."guardian_attachment_requests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardian_attachment_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."guardian_attachment_requests" IS 'Guardian requests to attach themselves to existing athletes. Requires admin approval.';



COMMENT ON COLUMN "public"."guardian_attachment_requests"."status" IS 'pending: awaiting admin review, approved: guardian attached, denied: request rejected';



COMMENT ON COLUMN "public"."guardian_attachment_requests"."expires_at" IS 'Request expires after 30 days if not reviewed';



CREATE TABLE IF NOT EXISTS "public"."huddle_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "stream_message_id" "text",
    "stream_channel_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."huddle_audit_log" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."huddle_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."huddle_audit_log" IS 'Immutable audit log for message moderation actions (platform admin only)';



CREATE TABLE IF NOT EXISTS "public"."huddle_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "muted" boolean DEFAULT false NOT NULL,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "digest_enabled" boolean DEFAULT false NOT NULL,
    "email_notifications" boolean DEFAULT true NOT NULL,
    "push_notifications" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."huddle_notification_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."huddle_notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."huddle_notification_preferences" IS 'Per-user, per-channel notification preferences for huddles';



CREATE TABLE IF NOT EXISTS "public"."huddle_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reported_by_user_id" "uuid" NOT NULL,
    "stream_message_id" "text" NOT NULL,
    "stream_channel_id" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "huddle_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'dismissed'::"text"])))
);

ALTER TABLE ONLY "public"."huddle_reports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."huddle_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."huddle_reports" IS 'Message reports for moderation and safety';



CREATE TABLE IF NOT EXISTS "public"."installment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "num_installments" integer NOT NULL,
    "frequency" "public"."installment_frequency" NOT NULL,
    "day_of_month" integer,
    "start_date_rule" "public"."start_date_rule" NOT NULL,
    "down_payment_cents" integer,
    "allows_early_payoff" boolean DEFAULT false,
    "grace_days" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."installment_plans" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."installment_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installment_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fee_assignment_id" "uuid" NOT NULL,
    "installment_plan_id" "uuid" NOT NULL,
    "status" "public"."installment_schedule_status" DEFAULT 'active'::"public"."installment_schedule_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."installment_schedules" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."installment_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "installment_schedule_id" "uuid" NOT NULL,
    "installment_number" integer NOT NULL,
    "due_date" "date" NOT NULL,
    "amount_cents" integer NOT NULL,
    "status" "public"."installment_status" DEFAULT 'upcoming'::"public"."installment_status" NOT NULL,
    "paid_cents_total" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."installments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."installments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."join_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "auto_approve" boolean DEFAULT false NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."join_links" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."join_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."join_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "requested_by_user_id" "uuid" NOT NULL,
    "join_link_id" "uuid",
    "status" "public"."join_request_status" DEFAULT 'pending'::"public"."join_request_status" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "decision_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."join_requests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "level_type" "text" DEFAULT 'age_based'::"text" NOT NULL,
    "description" "text",
    "age_min" integer,
    "age_max" integer,
    "grade_min" integer,
    "grade_max" integer,
    "skill_min" integer,
    "skill_max" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."levels" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."messages_archive" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages_archive" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages_archive" IS 'Archived messages from pre-Stream Chat implementation. Read-only for historical access.';



CREATE TABLE IF NOT EXISTS "public"."migration_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_table" "text" NOT NULL,
    "source_id" "uuid",
    "error_message" "text" NOT NULL,
    "error_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."migration_errors" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."migration_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "type" "public"."notification_job_type" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "public"."notification_job_status" DEFAULT 'queued'::"public"."notification_job_status" NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."notification_jobs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offline_payment_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offline_payment_id" "uuid" NOT NULL,
    "charge_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."offline_payment_allocations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."offline_payment_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offline_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "fee_assignment_id" "uuid" NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "method" "public"."offline_payment_method" NOT NULL,
    "reference" "text",
    "received_by_admin_id" "uuid",
    "received_at" timestamp with time zone NOT NULL,
    "status" "public"."offline_payment_status" DEFAULT 'recorded'::"public"."offline_payment_status" NOT NULL,
    "notes_internal" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."offline_payments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."offline_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_licenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "status" "public"."license_status" DEFAULT 'trial'::"public"."license_status",
    "plan" "public"."license_plan",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "trial_ends_at" timestamp with time zone,
    "grace_ends_at" timestamp with time zone,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "stripe_latest_invoice_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."org_licenses" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_licenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_payment_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "require_offline_only" boolean DEFAULT false,
    "allow_partial_payments" boolean DEFAULT true,
    "allow_installments" boolean DEFAULT true,
    "allow_discounts" boolean DEFAULT true,
    "allow_scholarships" boolean DEFAULT true,
    "allow_late_fees" boolean DEFAULT false,
    "require_purchase_order_ref" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."org_payment_policies" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_payment_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_slug_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "previous_slug" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '1 year'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."org_slug_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."org_slug_history" IS 'Tracks previous org slugs for redirect purposes. Redirects expire after 12 months.';



CREATE TABLE IF NOT EXISTS "public"."org_sport_profile_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sport_code" "text" NOT NULL,
    "overrides" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_sport_profile_settings_sport_code_format" CHECK (("sport_code" ~ '^[a-z0-9_]+$'::"text")),
    CONSTRAINT "org_sport_profile_settings_version_positive" CHECK (("version" > 0))
);


ALTER TABLE "public"."org_sport_profile_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."org_sport_profile_settings" IS 'Organization-specific overrides for sport profile field requirements. Allows orgs to customize which fields are required, optional, or hidden for each sport.';



COMMENT ON COLUMN "public"."org_sport_profile_settings"."overrides" IS 'JSONB object mapping field_key to override settings. Example: {"primary_position": {"is_required": true}, "wingspan_in": {"is_enabled": false}}';



COMMENT ON COLUMN "public"."org_sport_profile_settings"."version" IS 'Version number for optimistic locking. Incremented automatically on each update to overrides.';



CREATE TABLE IF NOT EXISTS "public"."org_storage_usage" (
    "org_id" "uuid" NOT NULL,
    "bucket_id" "text" DEFAULT 'public-media'::"text" NOT NULL,
    "bytes_used" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_storage_usage_bytes_non_negative" CHECK (("bytes_used" >= 0))
);


ALTER TABLE "public"."org_storage_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."org_storage_usage" IS 'Tracks storage usage per organization for Stripe billing caps.';



CREATE TABLE IF NOT EXISTS "public"."organization_advanced_settings" (
    "org_id" "uuid" NOT NULL,
    "data_retention_days" integer,
    "enable_api_access" boolean DEFAULT false NOT NULL,
    "api_rate_limit" integer,
    "allow_data_export" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_advanced_settings_api_rate_limit_check" CHECK ((("api_rate_limit" IS NULL) OR ("api_rate_limit" > 0))),
    CONSTRAINT "organization_advanced_settings_data_retention_days_check" CHECK ((("data_retention_days" IS NULL) OR ("data_retention_days" > 0)))
);

ALTER TABLE ONLY "public"."organization_advanced_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_advanced_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_attendance_settings" (
    "org_id" "uuid" NOT NULL,
    "required_for_practice" boolean DEFAULT false NOT NULL,
    "required_for_game" boolean DEFAULT true NOT NULL,
    "required_for_meeting" boolean DEFAULT false NOT NULL,
    "submission_deadline_hours" integer DEFAULT 24 NOT NULL,
    "lock_after_days" integer,
    "allow_admin_override" boolean DEFAULT true NOT NULL,
    "enable_coach_reminders" boolean DEFAULT false NOT NULL,
    "parent_visibility" "jsonb" DEFAULT '{"can_view_own_child": true, "can_submit_attendance": false, "can_view_team_attendance": false}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_attendance_setting_submission_deadline_hours_check" CHECK ((("submission_deadline_hours" >= 0) AND ("submission_deadline_hours" <= 168))),
    CONSTRAINT "organization_attendance_settings_lock_after_days_check" CHECK ((("lock_after_days" IS NULL) OR ("lock_after_days" > 0)))
);

ALTER TABLE ONLY "public"."organization_attendance_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_attendance_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "is_custom" boolean DEFAULT false NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_contacts_category_check" CHECK (("category" = ANY (ARRAY['default'::"text", 'billing'::"text", 'uniforms'::"text", 'scheduling'::"text", 'travel'::"text", 'registration'::"text", 'general'::"text"])))
);

ALTER TABLE ONLY "public"."organization_contacts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_defaults" (
    "org_id" "uuid" NOT NULL,
    "default_season_id" "uuid",
    "default_sport_id" "uuid",
    "default_program_id" "uuid",
    "default_level_id" "uuid",
    "default_event_types" "jsonb" DEFAULT '["practice", "game", "meeting"]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."organization_defaults" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_defaults" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."org_member_role" DEFAULT 'parent'::"public"."org_member_role" NOT NULL,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "roles" "public"."org_member_role"[] DEFAULT ARRAY['parent'::"public"."org_member_role"]
);

ALTER TABLE ONLY "public"."organization_invites" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_invites" IS 'Invitation tokens for joining organizations. Tokens are one-time use.';



COMMENT ON COLUMN "public"."organization_invites"."org_id" IS 'Canonical organization ID column (renamed from organization_id)';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."org_member_role" DEFAULT 'parent'::"public"."org_member_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" GENERATED ALWAYS AS ("org_id") STORED
);

ALTER TABLE ONLY "public"."organization_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_members" IS 'Links users to organizations with role-based access. One user can belong to multiple orgs.';



COMMENT ON COLUMN "public"."organization_members"."org_id" IS 'Canonical organization ID column (renamed from organization_id)';



COMMENT ON COLUMN "public"."organization_members"."organization_id" IS 'Deprecated compatibility alias for org_id. Do not use in new code.';



CREATE TABLE IF NOT EXISTS "public"."organization_notification_settings" (
    "org_id" "uuid" NOT NULL,
    "default_channels" "jsonb" DEFAULT '["email", "in_app"]'::"jsonb",
    "attendance_reminders_enabled" boolean DEFAULT true NOT NULL,
    "schedule_change_alerts_enabled" boolean DEFAULT true NOT NULL,
    "payment_reminder_behavior" "text" DEFAULT 'immediate'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_notification_setti_payment_reminder_behavior_check" CHECK (("payment_reminder_behavior" = ANY (ARRAY['immediate'::"text", 'daily_digest'::"text"])))
);

ALTER TABLE ONLY "public"."organization_notification_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_registration_settings" (
    "org_id" "uuid" NOT NULL,
    "required_fields" "jsonb" DEFAULT '["first_name", "last_name", "date_of_birth", "email"]'::"jsonb",
    "allow_players_without_guardians" boolean DEFAULT false NOT NULL,
    "allow_guardian_self_invite" boolean DEFAULT true NOT NULL,
    "medical_form_required" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."organization_registration_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_registration_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_settings" (
    "org_id" "uuid" NOT NULL,
    "organization_name" "text" NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "default_language" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme_id" "text",
    "venue_insights_daily_limit" integer DEFAULT 100,
    "venue_insights_monthly_limit" integer DEFAULT 2000,
    "venue_insights_daily_usage" integer DEFAULT 0,
    "venue_insights_monthly_usage" integer DEFAULT 0,
    "venue_insights_last_reset_date" "date" DEFAULT CURRENT_DATE,
    CONSTRAINT "organization_settings_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);

ALTER TABLE ONLY "public"."organization_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organization_settings"."theme_id" IS 'Theme ID from themes.ts config file. NULL means use platform default.';



COMMENT ON COLUMN "public"."organization_settings"."venue_insights_daily_limit" IS 'Maximum venue insights API calls allowed per day';



COMMENT ON COLUMN "public"."organization_settings"."venue_insights_monthly_limit" IS 'Maximum venue insights API calls allowed per month';



COMMENT ON COLUMN "public"."organization_settings"."venue_insights_daily_usage" IS 'Current daily API call count';



COMMENT ON COLUMN "public"."organization_settings"."venue_insights_monthly_usage" IS 'Current monthly API call count';



COMMENT ON COLUMN "public"."organization_settings"."venue_insights_last_reset_date" IS 'Last date when daily usage was reset';



CREATE TABLE IF NOT EXISTS "public"."organization_sport_customizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "icon_path" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."organization_sport_customizations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_sport_customizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_sport_customizations" IS 'Organization-level customizations for system sports (icon/color overrides)';



COMMENT ON COLUMN "public"."organization_sport_customizations"."icon_path" IS 'Path to icon in organization-assets bucket: sports/{org_id}/{sport_id}/icon.{ext}';



COMMENT ON COLUMN "public"."organization_sport_customizations"."color" IS 'Hex color override for the sport';



CREATE TABLE IF NOT EXISTS "public"."organization_sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."organization_sports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_sports" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_sports" IS 'Junction table linking organizations to system sports they have enabled';



CREATE TABLE IF NOT EXISTS "public"."organization_travel_contacts" (
    "org_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_travel_contacts_category_check" CHECK (("category" = ANY (ARRAY['transportation'::"text", 'lodging'::"text", 'venue'::"text", 'emergency'::"text", 'general'::"text", 'default'::"text"])))
);

ALTER TABLE ONLY "public"."organization_travel_contacts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_travel_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_travel_contacts" IS 'Travel contact by category per organization. Category default is used when a plan category has no contact.';



CREATE TABLE IF NOT EXISTS "public"."organization_visibility_settings" (
    "org_id" "uuid" NOT NULL,
    "role_permissions" "jsonb" DEFAULT '{"admin": {"can_edit": true, "can_view_roster": true, "can_view_messages": true, "can_view_payments": true, "can_view_schedule": true, "can_view_attendance": true}, "coach": {"can_edit": false, "can_view_roster": true, "can_view_messages": true, "can_view_payments": false, "can_view_schedule": true, "can_view_attendance": true}, "parent": {"can_edit": false, "can_view_roster": false, "can_view_messages": true, "can_view_payments": true, "can_view_schedule": true, "can_view_attendance": true}}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."organization_visibility_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_visibility_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "athlete_id" "uuid",
    "team_id" "uuid",
    "email" "text" NOT NULL,
    "status" "public"."parent_invite_status" DEFAULT 'pending'::"public"."parent_invite_status" NOT NULL,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_by_user_id" "uuid",
    "accepted_by_user_id" "uuid",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."parent_invites" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."parent_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "charge_id" "uuid" NOT NULL,
    "fee_assignment_id" "uuid",
    "amount_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."payment_allocations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "entity_type" "public"."payment_event_entity_type" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "metadata" "jsonb",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."payment_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "checkout_session_id" "uuid",
    "parent_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "stripe_payment_intent_id" "text" NOT NULL,
    "stripe_charge_id" "text",
    "platform_fee_cents" integer DEFAULT 0 NOT NULL,
    "status" "public"."payment_status_new" DEFAULT 'pending'::"public"."payment_status_new" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "payment_type" "public"."payment_type" DEFAULT 'full'::"public"."payment_type" NOT NULL
);

ALTER TABLE ONLY "public"."payments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."payment_type" IS 'Type of payment: partial (single fee partial amount) or full (multi-fee or full balance)';



CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "gender_category" character varying(20) DEFAULT 'coed'::character varying NOT NULL,
    "description" "text",
    "age_min" integer,
    "age_max" integer,
    CONSTRAINT "check_programs_age_range" CHECK (((("age_min" IS NULL) AND ("age_max" IS NULL)) OR (("age_min" IS NOT NULL) AND ("age_max" IS NOT NULL) AND ("age_min" <= "age_max"))))
);

ALTER TABLE ONLY "public"."programs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."programs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."programs"."description" IS 'Optional description of the program';



COMMENT ON COLUMN "public"."programs"."age_min" IS 'Minimum age for program participants';



COMMENT ON COLUMN "public"."programs"."age_max" IS 'Maximum age for program participants';



CREATE TABLE IF NOT EXISTS "public"."recurring_event_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pattern_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "occurrence_date" "date" NOT NULL,
    "is_exception" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."recurring_event_instances" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_event_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_event_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_event_id" "uuid" NOT NULL,
    "frequency" "public"."recurrence_frequency" NOT NULL,
    "days_of_week" integer[] NOT NULL,
    "end_date" "date",
    "max_occurrences" integer,
    "exception_dates" "date"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "interval" integer DEFAULT 1,
    CONSTRAINT "days_of_week_not_empty" CHECK (("array_length"("days_of_week", 1) > 0)),
    CONSTRAINT "has_end_condition" CHECK ((("end_date" IS NOT NULL) OR ("max_occurrences" IS NOT NULL))),
    CONSTRAINT "positive_max_occurrences" CHECK ((("max_occurrences" IS NULL) OR ("max_occurrences" > 0))),
    CONSTRAINT "valid_days_of_week" CHECK (("days_of_week" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]))
);

ALTER TABLE ONLY "public"."recurring_event_patterns" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_event_patterns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."recurring_event_patterns"."interval" IS 'Recurrence interval (e.g., every N weeks)';



CREATE TABLE IF NOT EXISTS "public"."refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "payment_id" "uuid",
    "offline_payment_id" "uuid",
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "reason" "text" NOT NULL,
    "stripe_refund_id" "text",
    "created_by_admin_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."refunds" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scholarship_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scholarship_program_id" "uuid" NOT NULL,
    "fee_assignment_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "awarded_by_admin_id" "uuid" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes_internal" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."scholarship_awards" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."scholarship_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scholarship_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "funding_source" "public"."scholarship_funding_source" NOT NULL,
    "budget_cents_total" integer,
    "budget_cents_remaining" integer,
    "status" "public"."scholarship_program_status" DEFAULT 'active'::"public"."scholarship_program_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."scholarship_programs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."scholarship_programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."seasons" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sport_field_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sport_code" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_group" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "enum_values" "jsonb",
    "unit" "text",
    "help_text" "text",
    "is_optional" boolean DEFAULT true NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sport_field_definitions_field_group_check" CHECK (("field_group" = ANY (ARRAY['profile'::"text", 'equipment'::"text"]))),
    CONSTRAINT "sport_field_definitions_field_key_format" CHECK (("field_key" ~ '^[a-z0-9_]+$'::"text")),
    CONSTRAINT "sport_field_definitions_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'int'::"text", 'numeric'::"text", 'bool'::"text", 'enum'::"text", 'multi_enum'::"text", 'time'::"text", 'object'::"text"]))),
    CONSTRAINT "sport_field_definitions_sport_code_format" CHECK (("sport_code" ~ '^[a-z0-9_]+$'::"text"))
);


ALTER TABLE "public"."sport_field_definitions" OWNER TO "postgres";


COMMENT ON TABLE "public"."sport_field_definitions" IS 'Defines all available fields for each sport. Drives UI rendering and validation. Platform-managed, read-only for orgs.';



CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_system" boolean DEFAULT false,
    "icon" "text",
    "color" "text",
    "deleted_at" timestamp with time zone,
    "slug" "text"
);

ALTER TABLE ONLY "public"."sports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sports"."org_id" IS 'NULL for system sports, set for organization-specific sports (legacy)';



COMMENT ON COLUMN "public"."sports"."is_system" IS 'True for system-wide predefined sports that all organizations can use';



COMMENT ON COLUMN "public"."sports"."slug" IS 'URL-friendly identifier for the sport (e.g., "track-and-field", "field-hockey")';



CREATE TABLE IF NOT EXISTS "public"."stream_channel_metadata" (
    "channel_id" "uuid" NOT NULL,
    "name" "text",
    "description" "text",
    "avatar_url" "text",
    "last_activity_at" timestamp with time zone,
    "pinned_message_ids" "text"[] DEFAULT ARRAY[]::"text"[],
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."stream_channel_metadata" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_channel_metadata" OWNER TO "postgres";


COMMENT ON TABLE "public"."stream_channel_metadata" IS 'Extended metadata for Stream Chat channels including pinned messages and event links';



CREATE TABLE IF NOT EXISTS "public"."stream_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stream_channel_id" "text" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "channel_type" "text" NOT NULL,
    "user_id_1" "uuid",
    "user_id_2" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dm_channels_have_users" CHECK ((("channel_type" <> 'dm'::"text") OR (("user_id_1" IS NOT NULL) AND ("user_id_2" IS NOT NULL)))),
    CONSTRAINT "dm_users_ordered" CHECK ((("channel_type" <> 'dm'::"text") OR ("user_id_1" < "user_id_2"))),
    CONSTRAINT "org_channels_no_team_id" CHECK ((("channel_type" <> 'org'::"text") OR ("team_id" IS NULL))),
    CONSTRAINT "stream_channels_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['team'::"text", 'org'::"text", 'dm'::"text"]))),
    CONSTRAINT "team_channels_have_team_id" CHECK ((("channel_type" <> 'team'::"text") OR ("team_id" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."stream_channels" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_channels" OWNER TO "postgres";


COMMENT ON TABLE "public"."stream_channels" IS 'Maps Stream Chat channels to YouthSports entities (teams, orgs, DMs)';



CREATE TABLE IF NOT EXISTS "public"."stripe_connect_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_order_id" "uuid" NOT NULL,
    "stripe_charge_id" "text",
    "stripe_application_fee_id" "text",
    "connect_account_id" "text" NOT NULL,
    "gross_amount_cents" integer NOT NULL,
    "application_fee_cents" integer NOT NULL,
    "net_amount_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_connect_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_connect_transactions" IS 'Records Stripe Connect destination charge transactions for ticket orders. Each row represents one completed payment with platform fee and org revenue breakdown.';



COMMENT ON COLUMN "public"."stripe_connect_transactions"."ticket_order_id" IS 'Foreign key to ticket_orders. Unique constraint ensures one transaction record per order.';



COMMENT ON COLUMN "public"."stripe_connect_transactions"."connect_account_id" IS 'Stripe Connect account ID (e.g. acct_xxx) where revenue is transferred.';



COMMENT ON COLUMN "public"."stripe_connect_transactions"."gross_amount_cents" IS 'Total charge amount in cents (before platform fee).';



COMMENT ON COLUMN "public"."stripe_connect_transactions"."application_fee_cents" IS 'Platform fee amount in cents ($1 per ticket).';



COMMENT ON COLUMN "public"."stripe_connect_transactions"."net_amount_cents" IS 'Org revenue amount in cents (gross - application_fee).';



CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "outcome" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_webhook_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "status" "public"."membership_status" DEFAULT 'active'::"public"."membership_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."team_memberships" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_seasons" (
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."team_seasons" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."teams" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_access_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_access_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_holds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticketed_event_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "qty" integer NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ticket_holds_qty_check" CHECK (("qty" > 0))
);


ALTER TABLE "public"."ticket_holds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price_cents" integer NOT NULL,
    "line_total_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ticket_order_items_line_total_cents_check" CHECK (("line_total_cents" >= 0)),
    CONSTRAINT "ticket_order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "ticket_order_items_unit_price_cents_check" CHECK (("unit_price_cents" >= 0))
);


ALTER TABLE "public"."ticket_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "ticketed_event_id" "uuid" NOT NULL,
    "purchaser_user_id" "uuid",
    "purchaser_email" "text" NOT NULL,
    "purchaser_name" "text",
    "status" "public"."ticket_order_status" DEFAULT 'pending_payment'::"public"."ticket_order_status" NOT NULL,
    "subtotal_cents" integer DEFAULT 0 NOT NULL,
    "tax_cents" integer DEFAULT 0 NOT NULL,
    "fees_cents" integer DEFAULT 0 NOT NULL,
    "total_cents" integer DEFAULT 0 NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "receipt_email_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_connect_account_id" "text",
    "platform_fee_cents" integer,
    "org_revenue_cents" integer,
    "stripe_charge_id" "text",
    "stripe_application_fee_id" "text",
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."ticket_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ticket_orders"."stripe_connect_account_id" IS 'Stripe Connect account ID used for this order (snapshot at checkout time).';



COMMENT ON COLUMN "public"."ticket_orders"."platform_fee_cents" IS 'Platform fee for this order ($1 × ticket count).';



COMMENT ON COLUMN "public"."ticket_orders"."org_revenue_cents" IS 'Organization revenue for this order (total_cents - platform_fee_cents).';



COMMENT ON COLUMN "public"."ticket_orders"."stripe_charge_id" IS 'Stripe Charge ID from PaymentIntent (for refunds).';



COMMENT ON COLUMN "public"."ticket_orders"."stripe_application_fee_id" IS 'Stripe Application Fee ID (for reporting).';



COMMENT ON COLUMN "public"."ticket_orders"."processed_at" IS 'Timestamp when webhook marked order as paid and created tickets.';



CREATE TABLE IF NOT EXISTS "public"."ticket_scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "ticketed_event_id" "uuid" NOT NULL,
    "ticket_id" "uuid",
    "scanner_user_id" "uuid",
    "scan_result" "public"."ticket_scan_result" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"(),
    "client_device_id" "text",
    "raw_payload_hash" "text",
    "scan_method" "public"."scan_method",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_staff_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "ticketed_event_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_by_user_id" "uuid" NOT NULL,
    "max_uses" integer,
    "use_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_staff_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "ticketed_event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price_cents" integer DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "capacity_total" integer,
    "capacity_remaining" integer,
    "sales_start_at" timestamp with time zone,
    "sales_end_at" timestamp with time zone,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "capacity_remaining_within_total" CHECK ((("capacity_remaining" IS NULL) OR ("capacity_total" IS NULL) OR ("capacity_remaining" <= "capacity_total"))),
    CONSTRAINT "ticket_types_capacity_remaining_check" CHECK (("capacity_remaining" >= 0)),
    CONSTRAINT "ticket_types_capacity_total_check" CHECK (("capacity_total" > 0)),
    CONSTRAINT "ticket_types_description_check" CHECK (("char_length"("description") <= 250)),
    CONSTRAINT "ticket_types_price_cents_check" CHECK (("price_cents" >= 0)),
    CONSTRAINT "valid_sales_window" CHECK ((("sales_end_at" IS NULL) OR ("sales_start_at" IS NULL) OR ("sales_end_at" > "sales_start_at")))
);


ALTER TABLE "public"."ticket_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticketed_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "event_id" "uuid",
    "event_type" "public"."ticketed_event_type" DEFAULT 'other'::"public"."ticketed_event_type" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "venue_name" "text",
    "venue_address_line1" "text",
    "venue_address_line2" "text",
    "venue_city" "text",
    "venue_state" "text",
    "venue_postal_code" "text",
    "venue_country" "text" DEFAULT 'US'::"text",
    "venue_is_virtual" boolean DEFAULT false,
    "venue_virtual_link" "text",
    "sales_start_at" timestamp with time zone,
    "sales_end_at" timestamp with time zone,
    "cover_image_path" "text",
    "status" "public"."ticketed_event_status" DEFAULT 'draft'::"public"."ticketed_event_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "event_description" "text",
    "ticket_banner_url" "text",
    CONSTRAINT "ticketed_events_event_description_check" CHECK (("char_length"("event_description") <= 500)),
    CONSTRAINT "valid_sales_window" CHECK ((("sales_end_at" IS NULL) OR ("sales_start_at" IS NULL) OR ("sales_end_at" > "sales_start_at"))),
    CONSTRAINT "valid_time_order" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "valid_timezone" CHECK ((("timezone" ~ '^[A-Za-z]+/[A-Za-z_]+$'::"text") OR ("timezone" = 'UTC'::"text")))
);


ALTER TABLE "public"."ticketed_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "ticketed_event_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid" NOT NULL,
    "status" "public"."ticket_status" DEFAULT 'active'::"public"."ticket_status" NOT NULL,
    "qr_token_hash" "text" NOT NULL,
    "entry_code" "text" NOT NULL,
    "used_at" timestamp with time zone,
    "used_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."travel_plan_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "travel_plan_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "is_custom" boolean DEFAULT false NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "travel_plan_contacts_category_check" CHECK (("category" = ANY (ARRAY['transportation'::"text", 'lodging'::"text", 'venue'::"text", 'emergency'::"text", 'general'::"text"]))),
    CONSTRAINT "travel_plan_contacts_custom_required" CHECK ((("is_custom" = false) OR (("is_custom" = true) AND ("first_name" IS NOT NULL) AND ("first_name" <> ''::"text") AND ("last_name" IS NOT NULL) AND ("last_name" <> ''::"text") AND ("email" IS NOT NULL) AND ("email" <> ''::"text"))))
);

ALTER TABLE ONLY "public"."travel_plan_contacts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."travel_plan_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."travel_plan_contacts" IS 'Per-plan contact overrides by category. is_custom true means use this row; else resolve from org.';



CREATE TABLE IF NOT EXISTS "public"."travel_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "location" "text" NOT NULL,
    "venue_name" "text",
    "venue_address" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "hotel_name" "text",
    "hotel_address" "text",
    "hotel_phone" "text",
    "hotel_confirmation" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "destination_city" "text",
    "destination_state" "text",
    "destination_state_code" "text",
    "destination_country" "text" DEFAULT 'US'::"text",
    "destination_place_id" "text",
    "destination_lat" double precision,
    "destination_lng" double precision,
    "venue_place_id" "text",
    "venue_lat" double precision,
    "venue_lng" double precision,
    "hotel_place_id" "text",
    "hotel_lat" double precision,
    "hotel_lng" double precision,
    "maps_url" "text",
    "itinerary_file_path" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "meeting_locations" "jsonb"
);

ALTER TABLE ONLY "public"."travel_plans" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."travel_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryout_registration_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "required_document_id" "uuid" NOT NULL,
    "status" "public"."tryout_document_status" DEFAULT 'missing'::"public"."tryout_document_status" NOT NULL,
    "storage_bucket" "text" DEFAULT 'tryout-documents'::"text" NOT NULL,
    "storage_path" "text",
    "file_name" "text",
    "content_type" "text",
    "file_size_bytes" bigint,
    "uploaded_by_user_id" "uuid",
    "uploaded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."tryout_registration_documents" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryout_registration_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryout_registration_staff_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "author_user_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."tryout_registration_staff_notes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryout_registration_staff_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryout_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tryout_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "family_id" "uuid" NOT NULL,
    "status" "public"."tryout_registration_status" DEFAULT 'registered'::"public"."tryout_registration_status" NOT NULL,
    "jersey_number" integer,
    "notes" "text",
    "offer_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."tryout_registrations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryout_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryout_required_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tryout_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "required" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."tryout_required_documents" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryout_required_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryout_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "score" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "criteria_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tryout_scores_score_check" CHECK ((("score" >= 1) AND ("score" <= 10)))
);

ALTER TABLE ONLY "public"."tryout_scores" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryout_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "sport" "text" NOT NULL,
    "age_group" "text" NOT NULL,
    "tryout_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone,
    "location" "text" NOT NULL,
    "entry_fee" integer DEFAULT 0,
    "requirements" "text"[],
    "what_to_bring" "text"[],
    "max_spots" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."tryouts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uniform_kit_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kit_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "size_options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."uniform_kit_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."uniform_kit_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uniform_kits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "deadline_at" timestamp with time zone,
    "locked_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."uniform_kits" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."uniform_kits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uniform_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "jersey_size" "text" NOT NULL,
    "shorts_size" "text" NOT NULL,
    "socks_size" "text" NOT NULL,
    "status" "public"."uniform_order_status" DEFAULT 'pending'::"public"."uniform_order_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."uniform_orders" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."uniform_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uniform_submission_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "size" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."uniform_submission_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."uniform_submission_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uniform_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kit_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "status" "public"."uniform_submission_status" DEFAULT 'not_submitted'::"public"."uniform_submission_status" NOT NULL,
    "submitted_at" timestamp with time zone,
    "locked_at" timestamp with time zone,
    "fulfilled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."uniform_submissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."uniform_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "type" "text" DEFAULT 'system_generated_notice'::"text" NOT NULL,
    "kit_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "payload" "jsonb",
    "dedupe_key" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "public"."notification_action" DEFAULT 'system_generated_notice'::"public"."notification_action" NOT NULL,
    "presentation_type" "public"."notification_presentation" DEFAULT 'info'::"public"."notification_presentation" NOT NULL,
    "role_context" "text" DEFAULT 'guardian'::"text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "link_url" "text",
    "metadata" "jsonb",
    "actor_id" "uuid",
    CONSTRAINT "user_notifications_role_context_check" CHECK (("role_context" = ANY (ARRAY['guardian'::"text", 'coach'::"text", 'org_admin'::"text"])))
);

ALTER TABLE ONLY "public"."user_notifications" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_notifications"."action" IS 'Typed source action that generated this notification';



COMMENT ON COLUMN "public"."user_notifications"."presentation_type" IS 'How to render the notification (info|warning|urgent)';



COMMENT ON COLUMN "public"."user_notifications"."role_context" IS 'Role lens for this notification (guardian|coach|org_admin)';



COMMENT ON COLUMN "public"."user_notifications"."entity_type" IS 'Domain entity type related to the notification (event, travel, fee, announcement, etc.)';



COMMENT ON COLUMN "public"."user_notifications"."entity_id" IS 'Domain entity ID related to the notification';



COMMENT ON COLUMN "public"."user_notifications"."link_url" IS 'Deep link for the notification';



COMMENT ON COLUMN "public"."user_notifications"."metadata" IS 'Structured metadata for client rendering';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "phone" "text",
    "role" "public"."user_role" DEFAULT 'parent'::"public"."user_role" NOT NULL,
    "family_id" "uuid",
    "org_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."users" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."role" IS 'DEPRECATED: Legacy role column kept for backward compatibility. Use organization_members table for current role management. This column is nullable and should be NULL for new users.';



CREATE TABLE IF NOT EXISTS "public"."valid_event_types" (
    "category" "public"."event_category" NOT NULL,
    "event_type" "text" NOT NULL,
    "enum_name" "text" NOT NULL,
    "description" "text"
);

ALTER TABLE ONLY "public"."valid_event_types" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."valid_event_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."valid_event_types" IS 'Lookup table for valid event type combinations per category.';



CREATE TABLE IF NOT EXISTS "public"."venue_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "place_id" "text" NOT NULL,
    "place_details_json" "jsonb",
    "photos_json" "jsonb",
    "ai_summary" "text",
    "ai_what_to_expect" "text",
    "ai_generated_at" timestamp with time zone,
    "ai_validation_status" "text" DEFAULT 'pending'::"text",
    "place_details_fetched_at" timestamp with time zone,
    "last_place_details_call_at" timestamp with time zone,
    "last_gemini_call_at" timestamp with time zone,
    "fetch_in_progress" boolean DEFAULT false,
    "place_id_valid" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "photo_urls" "jsonb" DEFAULT '[]'::"jsonb"
);

ALTER TABLE ONLY "public"."venue_insights" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."venue_insights" OWNER TO "postgres";


COMMENT ON TABLE "public"."venue_insights" IS 'Stores Google Places API data and AI-generated summaries for event venues';



COMMENT ON COLUMN "public"."venue_insights"."place_id" IS 'Google Place ID from Places API';



COMMENT ON COLUMN "public"."venue_insights"."place_details_json" IS 'Full Place Details API response stored as JSONB';



COMMENT ON COLUMN "public"."venue_insights"."photos_json" IS 'Array of photo references with metadata: {reference, width, height, attribution}';



COMMENT ON COLUMN "public"."venue_insights"."ai_summary" IS 'AI-generated venue summary (2-3 sentences)';



COMMENT ON COLUMN "public"."venue_insights"."ai_what_to_expect" IS 'AI-generated tips for parents/guardians';



COMMENT ON COLUMN "public"."venue_insights"."ai_validation_status" IS 'Validation status of AI-generated content: valid, failed, pending';



COMMENT ON COLUMN "public"."venue_insights"."fetch_in_progress" IS 'Lock flag to prevent concurrent fetches for the same venue';



COMMENT ON COLUMN "public"."venue_insights"."place_id_valid" IS 'Whether the place_id is still valid (venue may have closed)';



COMMENT ON COLUMN "public"."venue_insights"."photo_urls" IS 'Array of public URLs for uploaded venue photos in Supabase Storage';



CREATE TABLE IF NOT EXISTS "public"."venue_nearby_amenities_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_nearby_places_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "time_window" "text" NOT NULL,
    "summaries_json" "jsonb",
    "gemini_called_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."venue_nearby_amenities_summaries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."venue_nearby_amenities_summaries" OWNER TO "postgres";


COMMENT ON TABLE "public"."venue_nearby_amenities_summaries" IS 'Caches Gemini-curated amenity lists per venue and event context';



COMMENT ON COLUMN "public"."venue_nearby_amenities_summaries"."event_type" IS 'Event type: game, practice, tournament, tryout, etc.';



COMMENT ON COLUMN "public"."venue_nearby_amenities_summaries"."time_window" IS 'Time of day: morning (05-11), afternoon (11-17), evening (17-05)';



COMMENT ON COLUMN "public"."venue_nearby_amenities_summaries"."summaries_json" IS 'Array of curated amenities: {place_id, name, walking_minutes, category, description}';



CREATE TABLE IF NOT EXISTS "public"."venue_nearby_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_key" "text" NOT NULL,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "raw_places_json" "jsonb",
    "fetched_at" timestamp with time zone,
    "last_api_call_at" timestamp with time zone,
    "fetch_in_progress" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."venue_nearby_places" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."venue_nearby_places" OWNER TO "postgres";


COMMENT ON TABLE "public"."venue_nearby_places" IS 'Caches Google Places Nearby Search results per venue';



COMMENT ON COLUMN "public"."venue_nearby_places"."venue_key" IS 'Unique key: "place_id:ChIJ..." when place_id available, else "lat:<lat>,lng:<lng>"';



COMMENT ON COLUMN "public"."venue_nearby_places"."raw_places_json" IS 'Normalized array of up to 40 nearby places with {place_id, name, location, types, walking_minutes}';



COMMENT ON COLUMN "public"."venue_nearby_places"."fetch_in_progress" IS 'Lock flag to prevent concurrent fetches for the same venue';



CREATE TABLE IF NOT EXISTS "public"."video_athlete_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "link_type" "public"."video_link_type" DEFAULT 'appears'::"public"."video_link_type" NOT NULL,
    "start_time_seconds" numeric(10,2),
    "end_time_seconds" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."video_athlete_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_athlete_links" IS 'Links athletes to videos they appear in';



CREATE TABLE IF NOT EXISTS "public"."video_bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text",
    "timestamp_seconds" numeric(10,2) NOT NULL,
    "visibility" "public"."video_bookmark_visibility" DEFAULT 'private'::"public"."video_bookmark_visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."video_bookmarks" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_bookmarks" IS 'User-specific saved timestamps in videos';



CREATE TABLE IF NOT EXISTS "public"."video_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "timestamp_seconds" numeric(10,2),
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."video_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_comments" IS 'Discussion comments on videos';



CREATE TABLE IF NOT EXISTS "public"."video_note_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."video_note_targets" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_note_targets" IS 'Which athletes a note is about';



CREATE TABLE IF NOT EXISTS "public"."video_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "timestamp_seconds" numeric(10,2),
    "duration_seconds" numeric(10,2),
    "scope" "public"."video_note_scope" DEFAULT 'coaches'::"public"."video_note_scope" NOT NULL,
    "drawing_data" "jsonb",
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."video_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_notes" IS 'Timestamped annotations on videos';



CREATE TABLE IF NOT EXISTS "public"."video_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "guardian_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "status" "public"."video_review_status" DEFAULT 'pending'::"public"."video_review_status" NOT NULL,
    "response_text" "text",
    "rating" integer,
    "notified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "viewed_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "video_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."video_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_reviews" IS 'Guardian review workflow for practice videos';



CREATE TABLE IF NOT EXISTS "public"."video_tag_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."video_tag_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_tag_links" IS 'Many-to-many relationship between videos and tags';



CREATE TABLE IF NOT EXISTS "public"."video_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "tag_type" "public"."video_tag_type" DEFAULT 'custom'::"public"."video_tag_type" NOT NULL,
    "color" "text",
    "description" "text",
    "usage_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."video_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_tags" IS 'Reusable tags for organizing videos within an organization';



CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "event_id" "uuid",
    "mux_asset_id" "text",
    "mux_playback_id" "text",
    "mux_upload_id" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "category" "public"."video_category" DEFAULT 'practice'::"public"."video_category" NOT NULL,
    "visibility" "public"."video_visibility" DEFAULT 'team'::"public"."video_visibility" NOT NULL,
    "status" "public"."video_status" DEFAULT 'pending_upload'::"public"."video_status" NOT NULL,
    "duration_seconds" numeric(10,2),
    "aspect_ratio" "text",
    "resolution_tier" "text",
    "max_stored_resolution" "text",
    "max_stored_frame_rate" numeric(6,2),
    "thumbnail_url" "text",
    "thumbnail_time_offset" numeric(10,2) DEFAULT 0,
    "uploaded_by" "uuid" NOT NULL,
    "upload_started_at" timestamp with time zone,
    "upload_completed_at" timestamp with time zone,
    "processing_started_at" timestamp with time zone,
    "processing_completed_at" timestamp with time zone,
    "error_type" "text",
    "error_message" "text",
    "passthrough" "jsonb",
    "recorded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


COMMENT ON TABLE "public"."videos" IS 'Main table for video metadata and Mux asset tracking';



COMMENT ON COLUMN "public"."videos"."mux_asset_id" IS 'Mux Asset ID after processing completes';



COMMENT ON COLUMN "public"."videos"."mux_playback_id" IS 'Mux Playback ID for streaming';



COMMENT ON COLUMN "public"."videos"."mux_upload_id" IS 'Mux Direct Upload ID for correlating uploads';



COMMENT ON COLUMN "public"."videos"."passthrough" IS 'JSON data passed through Mux webhooks for correlation';



CREATE TABLE IF NOT EXISTS "public"."waivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "fee_assignment_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_by_admin_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."waivers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."waivers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_policy_consolidation_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."_policy_consolidation_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_rls_validation_results" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."_rls_validation_results_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_policy_consolidation_log"
    ADD CONSTRAINT "_policy_consolidation_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_rls_validation_results"
    ADD CONSTRAINT "_rls_validation_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_guardians"
    ADD CONSTRAINT "athlete_guardians_athlete_id_user_id_org_id_key" UNIQUE ("athlete_id", "user_id", "org_id");



ALTER TABLE ONLY "public"."athlete_guardians"
    ADD CONSTRAINT "athlete_guardians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_imports"
    ADD CONSTRAINT "athlete_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_medical_private"
    ADD CONSTRAINT "athlete_medical_private_pkey" PRIMARY KEY ("athlete_id");



ALTER TABLE ONLY "public"."athlete_sport_profiles"
    ADD CONSTRAINT "athlete_sport_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_sport_profiles"
    ADD CONSTRAINT "athlete_sport_profiles_unique_athlete_sport_org" UNIQUE ("org_id", "athlete_id", "sport_code");



ALTER TABLE ONLY "public"."athlete_sports"
    ADD CONSTRAINT "athlete_sports_athlete_id_sport_id_org_id_sport_type_key" UNIQUE ("athlete_id", "sport_id", "org_id", "sport_type");



ALTER TABLE ONLY "public"."athlete_sports"
    ADD CONSTRAINT "athlete_sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_event_id_child_id_key" UNIQUE ("event_id", "athlete_id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."audit_logs_old"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_unique_stripe_event_id" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_org_id_code_key" UNIQUE ("org_id", "code");



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discount_redemptions"
    ADD CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discovery_errors"
    ADD CONSTRAINT "discovery_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entitlement_overrides"
    ADD CONSTRAINT "entitlement_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_child_id_key" UNIQUE ("event_id", "child_id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_change_history"
    ADD CONSTRAINT "event_change_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_general_rsvps"
    ADD CONSTRAINT "event_general_rsvps_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_general_rsvps"
    ADD CONSTRAINT "event_general_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_locations"
    ADD CONSTRAINT "event_locations_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."event_locations"
    ADD CONSTRAINT "event_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_logs_archive"
    ADD CONSTRAINT "event_logs_archive_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."event_logs_archive"
    ADD CONSTRAINT "event_logs_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_logs"
    ADD CONSTRAINT "event_logs_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."event_logs"
    ADD CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_event_id_athlete_id_key" UNIQUE ("event_id", "athlete_id");



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_user_id_key" UNIQUE ("family_id", "user_id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_dependency_cycles"
    ADD CONSTRAINT "feature_dependency_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_discovery_cache"
    ADD CONSTRAINT "feature_discovery_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_discovery_corrections"
    ADD CONSTRAINT "feature_discovery_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_discovery_hints"
    ADD CONSTRAINT "feature_discovery_hints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_entitlements"
    ADD CONSTRAINT "feature_entitlements_feature_key_key" UNIQUE ("feature_key");



ALTER TABLE ONLY "public"."feature_entitlements"
    ADD CONSTRAINT "feature_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flag_audit_log"
    ADD CONSTRAINT "feature_flag_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flag_org_overrides"
    ADD CONSTRAINT "feature_flag_org_overrides_pkey" PRIMARY KEY ("feature_flag_id", "org_id", "environment");



ALTER TABLE ONLY "public"."feature_flag_platform_defaults"
    ADD CONSTRAINT "feature_flag_platform_defaults_pkey" PRIMARY KEY ("feature_flag_id", "environment");



ALTER TABLE ONLY "public"."feature_flag_user_overrides"
    ADD CONSTRAINT "feature_flag_user_overrides_pkey" PRIMARY KEY ("feature_flag_id", "user_id", "environment");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_org_id_key" UNIQUE ("org_id", "feature_key");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_integration_assignments"
    ADD CONSTRAINT "feature_integration_assignmen_feature_entitlement_id_integr_key" UNIQUE ("feature_entitlement_id", "integration_name");



ALTER TABLE ONLY "public"."feature_integration_assignments"
    ADD CONSTRAINT "feature_integration_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_integrations"
    ADD CONSTRAINT "feature_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_assignments"
    ADD CONSTRAINT "fee_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_unique_org_type_entity" UNIQUE NULLS NOT DISTINCT ("org_id", "gallery_type", "entity_id");



ALTER TABLE ONLY "public"."gallery_albums"
    ADD CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_downloads"
    ADD CONSTRAINT "gallery_downloads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_photo_tags"
    ADD CONSTRAINT "gallery_photo_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_photo_tags"
    ADD CONSTRAINT "gallery_photo_tags_unique_photo_athlete" UNIQUE ("photo_id", "athlete_id");



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_share_links"
    ADD CONSTRAINT "gallery_share_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_share_links"
    ADD CONSTRAINT "gallery_share_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."guardian_attachment_requests"
    ADD CONSTRAINT "guardian_attachment_requests_athlete_id_requested_by_user_i_key" UNIQUE ("athlete_id", "requested_by_user_id", "org_id");



ALTER TABLE ONLY "public"."guardian_attachment_requests"
    ADD CONSTRAINT "guardian_attachment_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."huddle_audit_log"
    ADD CONSTRAINT "huddle_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."huddle_notification_preferences"
    ADD CONSTRAINT "huddle_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."huddle_notification_preferences"
    ADD CONSTRAINT "huddle_notification_preferences_user_id_channel_id_key" UNIQUE ("user_id", "channel_id");



ALTER TABLE ONLY "public"."huddle_reports"
    ADD CONSTRAINT "huddle_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installment_plans"
    ADD CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installment_schedules"
    ADD CONSTRAINT "installment_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."join_links"
    ADD CONSTRAINT "join_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."join_links"
    ADD CONSTRAINT "join_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."license_tiers"
    ADD CONSTRAINT "license_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."license_tiers"
    ADD CONSTRAINT "license_tiers_stripe_price_id_key" UNIQUE ("stripe_price_id");



ALTER TABLE ONLY "public"."license_tiers"
    ADD CONSTRAINT "license_tiers_tier_key_key" UNIQUE ("tier_key");



ALTER TABLE ONLY "public"."messages_archive"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migration_errors"
    ADD CONSTRAINT "migration_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_jobs"
    ADD CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offline_payment_allocations"
    ADD CONSTRAINT "offline_payment_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offline_payments"
    ADD CONSTRAINT "offline_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_licenses"
    ADD CONSTRAINT "org_licenses_org_id_key" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."org_licenses"
    ADD CONSTRAINT "org_licenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_payment_policies"
    ADD CONSTRAINT "org_payment_policies_org_id_key" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."org_payment_policies"
    ADD CONSTRAINT "org_payment_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_slug_history"
    ADD CONSTRAINT "org_slug_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_sport_profile_settings"
    ADD CONSTRAINT "org_sport_profile_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_sport_profile_settings"
    ADD CONSTRAINT "org_sport_profile_settings_unique_org_sport" UNIQUE ("org_id", "sport_code");



ALTER TABLE ONLY "public"."org_storage_usage"
    ADD CONSTRAINT "org_storage_usage_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_advanced_settings"
    ADD CONSTRAINT "organization_advanced_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_attendance_settings"
    ADD CONSTRAINT "organization_attendance_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_contacts"
    ADD CONSTRAINT "organization_contacts_org_id_category_key" UNIQUE ("org_id", "category");



ALTER TABLE ONLY "public"."organization_contacts"
    ADD CONSTRAINT "organization_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_defaults"
    ADD CONSTRAINT "organization_defaults_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_notification_settings"
    ADD CONSTRAINT "organization_notification_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_registration_settings"
    ADD CONSTRAINT "organization_registration_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organization_sport_customizations"
    ADD CONSTRAINT "organization_sport_customizations_org_id_sport_id_key" UNIQUE ("org_id", "sport_id");



ALTER TABLE ONLY "public"."organization_sport_customizations"
    ADD CONSTRAINT "organization_sport_customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_sports"
    ADD CONSTRAINT "organization_sports_org_id_sport_id_key" UNIQUE ("org_id", "sport_id");



ALTER TABLE ONLY "public"."organization_sports"
    ADD CONSTRAINT "organization_sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_travel_contacts"
    ADD CONSTRAINT "organization_travel_contacts_pkey" PRIMARY KEY ("org_id", "category");



ALTER TABLE ONLY "public"."organization_visibility_settings"
    ADD CONSTRAINT "organization_visibility_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_invites"
    ADD CONSTRAINT "parent_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_invites"
    ADD CONSTRAINT "parent_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_unique_stripe_payment_intent_id" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_org_id_sport_id_name_key" UNIQUE ("org_id", "sport_id", "name");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_event_instances"
    ADD CONSTRAINT "recurring_event_instances_pattern_id_occurrence_date_key" UNIQUE ("pattern_id", "occurrence_date");



ALTER TABLE ONLY "public"."recurring_event_instances"
    ADD CONSTRAINT "recurring_event_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_event_patterns"
    ADD CONSTRAINT "recurring_event_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scholarship_awards"
    ADD CONSTRAINT "scholarship_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scholarship_programs"
    ADD CONSTRAINT "scholarship_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_field_definitions"
    ADD CONSTRAINT "sport_field_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_field_definitions"
    ADD CONSTRAINT "sport_field_definitions_unique_sport_field" UNIQUE ("sport_code", "field_key");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_channel_metadata"
    ADD CONSTRAINT "stream_channel_metadata_pkey" PRIMARY KEY ("channel_id");



ALTER TABLE ONLY "public"."stream_channels"
    ADD CONSTRAINT "stream_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_channels"
    ADD CONSTRAINT "stream_channels_stream_channel_id_key" UNIQUE ("stream_channel_id");



ALTER TABLE ONLY "public"."stripe_connect_transactions"
    ADD CONSTRAINT "stripe_connect_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_connect_transactions"
    ADD CONSTRAINT "stripe_connect_transactions_ticket_order_id_key" UNIQUE ("ticket_order_id");



ALTER TABLE ONLY "public"."stripe_webhook_receipts"
    ADD CONSTRAINT "stripe_webhook_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_receipts"
    ADD CONSTRAINT "stripe_webhook_receipts_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_child_id_team_id_season_id_key" UNIQUE ("athlete_id", "team_id", "season_id");



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_pkey" PRIMARY KEY ("team_id", "season_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_access_links"
    ADD CONSTRAINT "ticket_access_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_access_links"
    ADD CONSTRAINT "ticket_access_links_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."ticket_holds"
    ADD CONSTRAINT "ticket_holds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_order_items"
    ADD CONSTRAINT "ticket_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_staff_links"
    ADD CONSTRAINT "ticket_staff_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_staff_links"
    ADD CONSTRAINT "ticket_staff_links_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticketed_events"
    ADD CONSTRAINT "ticketed_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_entry_code_key" UNIQUE ("entry_code");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_qr_token_hash_key" UNIQUE ("qr_token_hash");



ALTER TABLE ONLY "public"."tier_feature_assignments"
    ADD CONSTRAINT "tier_feature_assignments_license_tier_id_feature_entitlemen_key" UNIQUE ("license_tier_id", "feature_entitlement_id");



ALTER TABLE ONLY "public"."tier_feature_assignments"
    ADD CONSTRAINT "tier_feature_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."travel_plan_contacts"
    ADD CONSTRAINT "travel_plan_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."travel_plan_contacts"
    ADD CONSTRAINT "travel_plan_contacts_travel_plan_id_category_key" UNIQUE ("travel_plan_id", "category");



ALTER TABLE ONLY "public"."travel_plans"
    ADD CONSTRAINT "travel_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryout_registration_documents"
    ADD CONSTRAINT "tryout_registration_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryout_registration_documents"
    ADD CONSTRAINT "tryout_registration_documents_registration_id_required_docu_key" UNIQUE ("registration_id", "required_document_id");



ALTER TABLE ONLY "public"."tryout_registration_staff_notes"
    ADD CONSTRAINT "tryout_registration_staff_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryout_registrations"
    ADD CONSTRAINT "tryout_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryout_registrations"
    ADD CONSTRAINT "tryout_registrations_tryout_id_child_id_key" UNIQUE ("tryout_id", "athlete_id");



ALTER TABLE ONLY "public"."tryout_required_documents"
    ADD CONSTRAINT "tryout_required_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryout_required_documents"
    ADD CONSTRAINT "tryout_required_documents_tryout_id_key_key" UNIQUE ("tryout_id", "key");



ALTER TABLE ONLY "public"."tryout_scores"
    ADD CONSTRAINT "tryout_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryout_scores"
    ADD CONSTRAINT "tryout_scores_unique_per_coach_criterion" UNIQUE ("registration_id", "criteria_id", "coach_id");



ALTER TABLE ONLY "public"."tryouts"
    ADD CONSTRAINT "tryouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uniform_kit_items"
    ADD CONSTRAINT "uniform_kit_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uniform_kits"
    ADD CONSTRAINT "uniform_kits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uniform_orders"
    ADD CONSTRAINT "uniform_orders_child_id_team_id_season_id_key" UNIQUE ("athlete_id", "team_id", "season_id");



ALTER TABLE ONLY "public"."uniform_orders"
    ADD CONSTRAINT "uniform_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uniform_submission_items"
    ADD CONSTRAINT "uniform_submission_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uniform_submissions"
    ADD CONSTRAINT "uniform_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "uq_feature_flag_org_key" UNIQUE ("org_id", "feature_key");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "uq_org_member_user_org_role" UNIQUE ("org_id", "user_id", "role");



ALTER TABLE ONLY "public"."uniform_kit_items"
    ADD CONSTRAINT "uq_uniform_kit_items_kit_name" UNIQUE ("kit_id", "name");



ALTER TABLE ONLY "public"."uniform_kits"
    ADD CONSTRAINT "uq_uniform_kits_team_season_name" UNIQUE ("team_id", "season_id", "name");



ALTER TABLE ONLY "public"."uniform_submission_items"
    ADD CONSTRAINT "uq_uniform_submission_items_submission_item" UNIQUE ("submission_id", "item_id");



ALTER TABLE ONLY "public"."uniform_submissions"
    ADD CONSTRAINT "uq_uniform_submissions_kit_child" UNIQUE ("kit_id", "athlete_id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."valid_event_types"
    ADD CONSTRAINT "valid_event_types_pkey" PRIMARY KEY ("category", "event_type");



ALTER TABLE ONLY "public"."venue_insights"
    ADD CONSTRAINT "venue_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venue_insights"
    ADD CONSTRAINT "venue_insights_place_id_key" UNIQUE ("place_id");



ALTER TABLE ONLY "public"."venue_nearby_amenities_summaries"
    ADD CONSTRAINT "venue_nearby_amenities_summar_venue_nearby_places_id_event__key" UNIQUE ("venue_nearby_places_id", "event_type", "time_window");



ALTER TABLE ONLY "public"."venue_nearby_amenities_summaries"
    ADD CONSTRAINT "venue_nearby_amenities_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venue_nearby_places"
    ADD CONSTRAINT "venue_nearby_places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venue_nearby_places"
    ADD CONSTRAINT "venue_nearby_places_venue_key_key" UNIQUE ("venue_key");



ALTER TABLE ONLY "public"."video_athlete_links"
    ADD CONSTRAINT "video_athlete_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_athlete_links"
    ADD CONSTRAINT "video_athlete_links_unique" UNIQUE ("video_id", "athlete_id");



ALTER TABLE ONLY "public"."video_bookmarks"
    ADD CONSTRAINT "video_bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_note_targets"
    ADD CONSTRAINT "video_note_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_note_targets"
    ADD CONSTRAINT "video_note_targets_unique" UNIQUE ("note_id", "athlete_id");



ALTER TABLE ONLY "public"."video_notes"
    ADD CONSTRAINT "video_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_reviews"
    ADD CONSTRAINT "video_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_reviews"
    ADD CONSTRAINT "video_reviews_unique" UNIQUE ("video_id", "guardian_id", "athlete_id");



ALTER TABLE ONLY "public"."video_tag_links"
    ADD CONSTRAINT "video_tag_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tag_links"
    ADD CONSTRAINT "video_tag_links_unique" UNIQUE ("video_id", "tag_id");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_org_name_unique" UNIQUE ("org_id", "name");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_mux_asset_id_unique" UNIQUE ("mux_asset_id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_mux_upload_id_unique" UNIQUE ("mux_upload_id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waivers"
    ADD CONSTRAINT "waivers_pkey" PRIMARY KEY ("id");



CREATE INDEX "event_logs_archive_actor_user_id_created_at_idx" ON "public"."event_logs_archive" USING "btree" ("actor_user_id", "created_at" DESC);



CREATE INDEX "event_logs_archive_category_event_type_idx" ON "public"."event_logs_archive" USING "btree" ("category", "event_type");



CREATE INDEX "event_logs_archive_created_at_idx" ON "public"."event_logs_archive" USING "btree" ("created_at" DESC);



CREATE INDEX "event_logs_archive_idempotency_key_idx" ON "public"."event_logs_archive" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "event_logs_archive_org_id_created_at_idx" ON "public"."event_logs_archive" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "event_logs_archive_target_entity_type_target_entity_id_idx" ON "public"."event_logs_archive" USING "btree" ("target_entity_type", "target_entity_id");



CREATE INDEX "idx_announcements_author_id" ON "public"."announcements" USING "btree" ("author_id");



CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at");



CREATE INDEX "idx_announcements_org_id" ON "public"."announcements" USING "btree" ("org_id");



CREATE INDEX "idx_announcements_team_id" ON "public"."announcements" USING "btree" ("team_id");



CREATE INDEX "idx_announcements_type" ON "public"."announcements" USING "btree" ("type");



CREATE INDEX "idx_athlete_guardians_athlete_org_status" ON "public"."athlete_guardians" USING "btree" ("athlete_id", "org_id", "status") WHERE ("status" = 'active'::"public"."athlete_guardian_status");



CREATE INDEX "idx_athlete_guardians_athlete_user" ON "public"."athlete_guardians" USING "btree" ("athlete_id", "user_id");



CREATE INDEX "idx_athlete_guardians_org_athlete" ON "public"."athlete_guardians" USING "btree" ("org_id", "athlete_id");



CREATE INDEX "idx_athlete_guardians_user_org" ON "public"."athlete_guardians" USING "btree" ("user_id", "org_id");



CREATE INDEX "idx_athlete_guardians_user_org_status" ON "public"."athlete_guardians" USING "btree" ("user_id", "org_id", "status") WHERE ("status" = 'active'::"public"."athlete_guardian_status");



CREATE INDEX "idx_athlete_imports_created_at" ON "public"."athlete_imports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_athlete_imports_created_by" ON "public"."athlete_imports" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_athlete_imports_org_id" ON "public"."athlete_imports" USING "btree" ("org_id");



CREATE INDEX "idx_athlete_imports_status" ON "public"."athlete_imports" USING "btree" ("status");



CREATE INDEX "idx_athlete_medical_private_org" ON "public"."athlete_medical_private" USING "btree" ("org_id");



CREATE INDEX "idx_athlete_sport_profiles_athlete" ON "public"."athlete_sport_profiles" USING "btree" ("athlete_id");



CREATE INDEX "idx_athlete_sport_profiles_org" ON "public"."athlete_sport_profiles" USING "btree" ("org_id");



CREATE INDEX "idx_athlete_sport_profiles_org_sport" ON "public"."athlete_sport_profiles" USING "btree" ("org_id", "sport_code");



CREATE INDEX "idx_athlete_sport_profiles_sport" ON "public"."athlete_sport_profiles" USING "btree" ("sport_code");



CREATE INDEX "idx_athlete_sports_athlete_id" ON "public"."athlete_sports" USING "btree" ("athlete_id");



CREATE INDEX "idx_athlete_sports_athlete_org" ON "public"."athlete_sports" USING "btree" ("athlete_id", "org_id");



CREATE INDEX "idx_athlete_sports_org_id" ON "public"."athlete_sports" USING "btree" ("org_id");



CREATE INDEX "idx_athlete_sports_sport_id" ON "public"."athlete_sports" USING "btree" ("sport_id");



CREATE INDEX "idx_athletes_deleted" ON "public"."athletes" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_athletes_family_id" ON "public"."athletes" USING "btree" ("family_id");



CREATE INDEX "idx_athletes_height_cm" ON "public"."athletes" USING "btree" ("height_cm") WHERE ("height_cm" IS NOT NULL);



CREATE INDEX "idx_athletes_weight_kg" ON "public"."athletes" USING "btree" ("weight_kg") WHERE ("weight_kg" IS NOT NULL);



CREATE INDEX "idx_attendance_child_id" ON "public"."attendance" USING "btree" ("athlete_id");



CREATE INDEX "idx_attendance_event_id" ON "public"."attendance" USING "btree" ("event_id");



CREATE INDEX "idx_audit_log_actor" ON "public"."feature_flag_audit_log" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_created_at" ON "public"."feature_flag_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_environment" ON "public"."feature_flag_audit_log" USING "btree" ("environment", "created_at" DESC);



CREATE INDEX "idx_audit_log_flag" ON "public"."feature_flag_audit_log" USING "btree" ("feature_flag_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_actor" ON "public"."audit_logs_old" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs_old" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs_old" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "idx_billing_events_org_id" ON "public"."billing_events" USING "btree" ("org_id");



CREATE INDEX "idx_charges_charge_type" ON "public"."charges" USING "btree" ("charge_type");



CREATE INDEX "idx_charges_created_by_user_id" ON "public"."charges" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_charges_fee_assignment_id" ON "public"."charges" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_charges_fee_id" ON "public"."charges" USING "btree" ("fee_id");



CREATE INDEX "idx_charges_org_id" ON "public"."charges" USING "btree" ("org_id");



CREATE INDEX "idx_charges_status" ON "public"."charges" USING "btree" ("status");



CREATE INDEX "idx_checkout_session_items_charge_id" ON "public"."checkout_session_items" USING "btree" ("charge_id");



CREATE INDEX "idx_checkout_session_items_checkout_session_id" ON "public"."checkout_session_items" USING "btree" ("checkout_session_id");



CREATE INDEX "idx_checkout_session_items_fee_assignment_id" ON "public"."checkout_session_items" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_checkout_sessions_org_id" ON "public"."checkout_sessions" USING "btree" ("org_id");



CREATE INDEX "idx_checkout_sessions_parent_id" ON "public"."checkout_sessions" USING "btree" ("parent_id");



CREATE INDEX "idx_checkout_sessions_status" ON "public"."checkout_sessions" USING "btree" ("status");



CREATE INDEX "idx_checkout_sessions_stripe_checkout_session_id" ON "public"."checkout_sessions" USING "btree" ("stripe_checkout_session_id");



CREATE INDEX "idx_child_claims_child_org" ON "public"."child_claim_tokens" USING "btree" ("athlete_id", "org_id");



CREATE INDEX "idx_child_claims_season" ON "public"."child_claim_tokens" USING "btree" ("season_id");



CREATE INDEX "idx_child_claims_token" ON "public"."child_claim_tokens" USING "btree" ("token");



CREATE INDEX "idx_children_family_id" ON "public"."children" USING "btree" ("family_id");



CREATE INDEX "idx_derived_families_mv_org" ON "public"."derived_families_mv" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_derived_families_mv_org_family" ON "public"."derived_families_mv" USING "btree" ("organization_id", "family_group_id");



CREATE INDEX "idx_discount_codes_code" ON "public"."discount_codes" USING "btree" ("org_id", "code");



CREATE INDEX "idx_discount_codes_org_id" ON "public"."discount_codes" USING "btree" ("org_id");



CREATE INDEX "idx_discount_codes_status" ON "public"."discount_codes" USING "btree" ("status");



CREATE INDEX "idx_discount_redemptions_discount_code_id" ON "public"."discount_redemptions" USING "btree" ("discount_code_id");



CREATE INDEX "idx_discount_redemptions_fee_assignment_id" ON "public"."discount_redemptions" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_discount_redemptions_redeemed_by_parent_id" ON "public"."discount_redemptions" USING "btree" ("redeemed_by_parent_id");



CREATE INDEX "idx_discovery_errors_created_at" ON "public"."discovery_errors" USING "btree" ("created_at");



CREATE INDEX "idx_entitlement_overrides_active_target" ON "public"."entitlement_overrides" USING "btree" ("target_type", "target_id", "feature_entitlement_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_entitlement_overrides_feature_id" ON "public"."entitlement_overrides" USING "btree" ("feature_entitlement_id");



CREATE INDEX "idx_entitlement_overrides_revoked_at" ON "public"."entitlement_overrides" USING "btree" ("revoked_at") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_entitlement_overrides_target" ON "public"."entitlement_overrides" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_event_attendance_child_id" ON "public"."event_attendance" USING "btree" ("child_id");



CREATE INDEX "idx_event_attendance_event_id" ON "public"."event_attendance" USING "btree" ("event_id");



CREATE INDEX "idx_event_general_rsvps_event_id" ON "public"."event_general_rsvps" USING "btree" ("event_id");



CREATE INDEX "idx_event_general_rsvps_responded_at" ON "public"."event_general_rsvps" USING "btree" ("responded_at" DESC);



CREATE INDEX "idx_event_general_rsvps_status" ON "public"."event_general_rsvps" USING "btree" ("status");



CREATE INDEX "idx_event_general_rsvps_user_id" ON "public"."event_general_rsvps" USING "btree" ("user_id");



CREATE INDEX "idx_event_history_change_type" ON "public"."event_change_history" USING "btree" ("change_type");



CREATE INDEX "idx_event_history_created_at" ON "public"."event_change_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_event_history_event_id" ON "public"."event_change_history" USING "btree" ("event_id");



CREATE INDEX "idx_event_history_notification_sent" ON "public"."event_change_history" USING "btree" ("notification_sent") WHERE ("notification_sent" = false);



CREATE INDEX "idx_event_locations_city_state" ON "public"."event_locations" USING "btree" ("city", "state");



CREATE INDEX "idx_event_locations_event_id" ON "public"."event_locations" USING "btree" ("event_id");



CREATE INDEX "idx_event_locations_is_tbd" ON "public"."event_locations" USING "btree" ("is_tbd");



CREATE INDEX "idx_event_locations_is_virtual" ON "public"."event_locations" USING "btree" ("is_virtual");



CREATE INDEX "idx_event_locations_place_id" ON "public"."event_locations" USING "btree" ("place_id") WHERE ("place_id" IS NOT NULL);



CREATE INDEX "idx_event_logs_actor_user_id_created_at" ON "public"."event_logs" USING "btree" ("actor_user_id", "created_at" DESC);



CREATE INDEX "idx_event_logs_category_event_type" ON "public"."event_logs" USING "btree" ("category", "event_type");



CREATE INDEX "idx_event_logs_created_at" ON "public"."event_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_event_logs_idempotency_key" ON "public"."event_logs" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_event_logs_org_id_created_at" ON "public"."event_logs" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_event_logs_target_entity" ON "public"."event_logs" USING "btree" ("target_entity_type", "target_entity_id");



CREATE INDEX "idx_event_rsvps_athlete_id" ON "public"."event_rsvps" USING "btree" ("athlete_id");



CREATE INDEX "idx_event_rsvps_event_id" ON "public"."event_rsvps" USING "btree" ("event_id");



CREATE INDEX "idx_event_rsvps_responded_at" ON "public"."event_rsvps" USING "btree" ("responded_at" DESC);



CREATE INDEX "idx_event_rsvps_status" ON "public"."event_rsvps" USING "btree" ("status");



CREATE INDEX "idx_events_created_by_user_id" ON "public"."events" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_events_departure_time" ON "public"."events" USING "btree" ("departure_time");



CREATE INDEX "idx_events_is_cancelled" ON "public"."events" USING "btree" ("is_cancelled");



CREATE INDEX "idx_events_overnight" ON "public"."events" USING "btree" ("overnight");



CREATE INDEX "idx_events_requires_travel" ON "public"."events" USING "btree" ("requires_travel");



CREATE INDEX "idx_events_season_id" ON "public"."events" USING "btree" ("season_id");



CREATE INDEX "idx_events_start_time" ON "public"."events" USING "btree" ("start_time");



CREATE INDEX "idx_events_team_id" ON "public"."events" USING "btree" ("team_id");



CREATE INDEX "idx_events_timezone" ON "public"."events" USING "btree" ("timezone");



CREATE INDEX "idx_families_org_id" ON "public"."families" USING "btree" ("org_id");



CREATE INDEX "idx_family_members_family_id" ON "public"."family_members" USING "btree" ("family_id");



CREATE INDEX "idx_family_members_user_id" ON "public"."family_members" USING "btree" ("user_id");



CREATE INDEX "idx_feature_discovery_cache_discovered_features_gin" ON "public"."feature_discovery_cache" USING "gin" ("discovered_features" "jsonb_path_ops");



CREATE INDEX "idx_feature_discovery_hints_key" ON "public"."feature_discovery_hints" USING "btree" ("feature_key");



CREATE INDEX "idx_feature_entitlements_archived_at" ON "public"."feature_entitlements" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_feature_entitlements_category" ON "public"."feature_entitlements" USING "btree" ("category");



CREATE INDEX "idx_feature_entitlements_feature_key" ON "public"."feature_entitlements" USING "btree" ("feature_key");



CREATE INDEX "idx_feature_entitlements_feature_type" ON "public"."feature_entitlements" USING "btree" ("feature_type");



CREATE INDEX "idx_feature_entitlements_is_system_feature" ON "public"."feature_entitlements" USING "btree" ("is_system_feature") WHERE ("is_system_feature" = true);



CREATE INDEX "idx_feature_entitlements_platform_admin_only" ON "public"."feature_entitlements" USING "btree" ("platform_admin_only") WHERE ("platform_admin_only" = true);



CREATE INDEX "idx_feature_entitlements_removable" ON "public"."feature_entitlements" USING "btree" ("is_removable") WHERE ("is_removable" = false);



CREATE INDEX "idx_feature_entitlements_toggleable" ON "public"."feature_entitlements" USING "btree" ("is_toggleable") WHERE ("is_toggleable" = false);



CREATE INDEX "idx_feature_flags_deleted_at" ON "public"."feature_flags" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_feature_flags_environment" ON "public"."feature_flags" USING "btree" ("environment");



CREATE INDEX "idx_feature_flags_key" ON "public"."feature_flags" USING "btree" ("feature_key");



CREATE INDEX "idx_feature_flags_key_env" ON "public"."feature_flags" USING "btree" ("key", "environment") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_feature_flags_org" ON "public"."feature_flags" USING "btree" ("org_id");



CREATE INDEX "idx_feature_integration_assignments_feature" ON "public"."feature_integration_assignments" USING "btree" ("feature_entitlement_id");



CREATE INDEX "idx_feature_integration_assignments_integration" ON "public"."feature_integration_assignments" USING "btree" ("integration_name");



CREATE INDEX "idx_feature_integrations_pattern" ON "public"."feature_integrations" USING "btree" ("feature_key_pattern");



CREATE INDEX "idx_fee_assignments_athlete_id" ON "public"."fee_assignments" USING "btree" ("athlete_id");



CREATE INDEX "idx_fee_assignments_fee_id" ON "public"."fee_assignments" USING "btree" ("fee_id");



CREATE INDEX "idx_fee_assignments_org_id" ON "public"."fee_assignments" USING "btree" ("org_id");



CREATE INDEX "idx_fee_assignments_parent_id" ON "public"."fee_assignments" USING "btree" ("parent_id");



CREATE INDEX "idx_fee_assignments_status" ON "public"."fee_assignments" USING "btree" ("status");



CREATE INDEX "idx_fees_created_by_admin_id" ON "public"."fees" USING "btree" ("created_by_admin_id");



CREATE INDEX "idx_fees_fee_type" ON "public"."fees" USING "btree" ("fee_type");



CREATE INDEX "idx_fees_org_id" ON "public"."fees" USING "btree" ("org_id");



CREATE INDEX "idx_fees_season_id" ON "public"."fees" USING "btree" ("season_id");



CREATE INDEX "idx_fees_status" ON "public"."fees" USING "btree" ("status");



CREATE INDEX "idx_galleries_entity_id" ON "public"."galleries" USING "btree" ("entity_id") WHERE ("entity_id" IS NOT NULL);



CREATE INDEX "idx_galleries_org_id" ON "public"."galleries" USING "btree" ("org_id");



CREATE INDEX "idx_galleries_org_type" ON "public"."galleries" USING "btree" ("org_id", "gallery_type");



CREATE INDEX "idx_galleries_type" ON "public"."galleries" USING "btree" ("gallery_type");



CREATE INDEX "idx_gallery_albums_gallery_id" ON "public"."gallery_albums" USING "btree" ("gallery_id");



CREATE INDEX "idx_gallery_downloads_photo_id" ON "public"."gallery_downloads" USING "btree" ("photo_id");



CREATE INDEX "idx_gallery_downloads_user_id" ON "public"."gallery_downloads" USING "btree" ("user_id");



CREATE INDEX "idx_gallery_photo_tags_athlete_id" ON "public"."gallery_photo_tags" USING "btree" ("athlete_id");



CREATE INDEX "idx_gallery_photo_tags_photo_id" ON "public"."gallery_photo_tags" USING "btree" ("photo_id");



CREATE INDEX "idx_gallery_photos_album_id" ON "public"."gallery_photos" USING "btree" ("album_id") WHERE ("album_id" IS NOT NULL);



CREATE INDEX "idx_gallery_photos_gallery_created" ON "public"."gallery_photos" USING "btree" ("gallery_id", "created_at" DESC);



CREATE INDEX "idx_gallery_photos_gallery_id" ON "public"."gallery_photos" USING "btree" ("gallery_id");



CREATE INDEX "idx_gallery_photos_sort" ON "public"."gallery_photos" USING "btree" ("gallery_id", "sort_order", "created_at");



CREATE INDEX "idx_gallery_photos_status" ON "public"."gallery_photos" USING "btree" ("status");



CREATE INDEX "idx_gallery_photos_taken_at" ON "public"."gallery_photos" USING "btree" ("taken_at") WHERE ("taken_at" IS NOT NULL);



CREATE INDEX "idx_gallery_photos_uploaded_by" ON "public"."gallery_photos" USING "btree" ("uploaded_by_user_id");



CREATE INDEX "idx_gallery_share_links_expires_at" ON "public"."gallery_share_links" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_gallery_share_links_gallery_id" ON "public"."gallery_share_links" USING "btree" ("gallery_id");



CREATE INDEX "idx_gallery_share_links_token" ON "public"."gallery_share_links" USING "btree" ("token");



CREATE INDEX "idx_guardian_attachment_requests_athlete_org" ON "public"."guardian_attachment_requests" USING "btree" ("athlete_id", "org_id");



CREATE INDEX "idx_guardian_attachment_requests_expires_at" ON "public"."guardian_attachment_requests" USING "btree" ("expires_at");



CREATE INDEX "idx_guardian_attachment_requests_org_status" ON "public"."guardian_attachment_requests" USING "btree" ("org_id", "status");



CREATE INDEX "idx_guardian_attachment_requests_requested_by" ON "public"."guardian_attachment_requests" USING "btree" ("requested_by_user_id");



CREATE INDEX "idx_huddle_audit_action" ON "public"."huddle_audit_log" USING "btree" ("action");



CREATE INDEX "idx_huddle_audit_created" ON "public"."huddle_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_huddle_audit_message" ON "public"."huddle_audit_log" USING "btree" ("stream_message_id");



CREATE INDEX "idx_huddle_audit_user" ON "public"."huddle_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_huddle_prefs_channel" ON "public"."huddle_notification_preferences" USING "btree" ("channel_id");



CREATE INDEX "idx_huddle_prefs_muted" ON "public"."huddle_notification_preferences" USING "btree" ("user_id") WHERE ("muted" = true);



CREATE INDEX "idx_huddle_prefs_user" ON "public"."huddle_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_huddle_reports_channel" ON "public"."huddle_reports" USING "btree" ("stream_channel_id");



CREATE INDEX "idx_huddle_reports_message" ON "public"."huddle_reports" USING "btree" ("stream_message_id");



CREATE INDEX "idx_huddle_reports_reporter" ON "public"."huddle_reports" USING "btree" ("reported_by_user_id");



CREATE INDEX "idx_huddle_reports_status" ON "public"."huddle_reports" USING "btree" ("status");



CREATE INDEX "idx_installment_plans_org_id" ON "public"."installment_plans" USING "btree" ("org_id");



CREATE INDEX "idx_installment_schedules_fee_assignment_id" ON "public"."installment_schedules" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_installment_schedules_installment_plan_id" ON "public"."installment_schedules" USING "btree" ("installment_plan_id");



CREATE INDEX "idx_installment_schedules_status" ON "public"."installment_schedules" USING "btree" ("status");



CREATE INDEX "idx_installments_due_date" ON "public"."installments" USING "btree" ("due_date");



CREATE INDEX "idx_installments_installment_schedule_id" ON "public"."installments" USING "btree" ("installment_schedule_id");



CREATE INDEX "idx_installments_status" ON "public"."installments" USING "btree" ("status");



CREATE INDEX "idx_join_links_org" ON "public"."join_links" USING "btree" ("org_id");



CREATE INDEX "idx_join_links_team" ON "public"."join_links" USING "btree" ("team_id");



CREATE INDEX "idx_join_requests_athlete_team" ON "public"."join_requests" USING "btree" ("athlete_id", "team_id");



CREATE INDEX "idx_join_requests_requester" ON "public"."join_requests" USING "btree" ("requested_by_user_id");



CREATE INDEX "idx_join_requests_season" ON "public"."join_requests" USING "btree" ("season_id");



CREATE INDEX "idx_join_requests_team_status" ON "public"."join_requests" USING "btree" ("team_id", "status");



CREATE INDEX "idx_levels_org_id" ON "public"."levels" USING "btree" ("org_id");



CREATE INDEX "idx_levels_org_name" ON "public"."levels" USING "btree" ("org_id", "name");



CREATE INDEX "idx_levels_program_id" ON "public"."levels" USING "btree" ("program_id");



CREATE INDEX "idx_license_tiers_status" ON "public"."license_tiers" USING "btree" ("status");



CREATE INDEX "idx_license_tiers_stripe_price_id" ON "public"."license_tiers" USING "btree" ("stripe_price_id");



CREATE INDEX "idx_license_tiers_tier_key" ON "public"."license_tiers" USING "btree" ("tier_key");



CREATE INDEX "idx_license_tiers_version" ON "public"."license_tiers" USING "btree" ("version");



CREATE INDEX "idx_memberships_child_id" ON "public"."team_memberships" USING "btree" ("athlete_id");



CREATE INDEX "idx_memberships_season_id" ON "public"."team_memberships" USING "btree" ("season_id");



CREATE INDEX "idx_memberships_team_id" ON "public"."team_memberships" USING "btree" ("team_id");



CREATE INDEX "idx_messages_author_id" ON "public"."messages_archive" USING "btree" ("author_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages_archive" USING "btree" ("created_at");



CREATE INDEX "idx_messages_team_id" ON "public"."messages_archive" USING "btree" ("team_id");



CREATE INDEX "idx_notification_jobs_email" ON "public"."notification_jobs" USING "btree" ("email");



CREATE INDEX "idx_notification_jobs_org_id" ON "public"."notification_jobs" USING "btree" ("org_id");



CREATE INDEX "idx_notification_jobs_status_created" ON "public"."notification_jobs" USING "btree" ("status", "created_at");



CREATE INDEX "idx_notification_jobs_user_id" ON "public"."notification_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_offline_payment_allocations_charge_id" ON "public"."offline_payment_allocations" USING "btree" ("charge_id");



CREATE INDEX "idx_offline_payment_allocations_offline_payment_id" ON "public"."offline_payment_allocations" USING "btree" ("offline_payment_id");



CREATE INDEX "idx_offline_payments_child_id" ON "public"."offline_payments" USING "btree" ("child_id");



CREATE INDEX "idx_offline_payments_fee_assignment_id" ON "public"."offline_payments" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_offline_payments_org_id" ON "public"."offline_payments" USING "btree" ("org_id");



CREATE INDEX "idx_offline_payments_parent_id" ON "public"."offline_payments" USING "btree" ("parent_id");



CREATE INDEX "idx_offline_payments_received_by_admin_id" ON "public"."offline_payments" USING "btree" ("received_by_admin_id");



CREATE INDEX "idx_offline_payments_status" ON "public"."offline_payments" USING "btree" ("status");



CREATE INDEX "idx_org_invites_email" ON "public"."organization_invites" USING "btree" ("email");



CREATE INDEX "idx_org_invites_org" ON "public"."organization_invites" USING "btree" ("org_id");



CREATE INDEX "idx_org_invites_token" ON "public"."organization_invites" USING "btree" ("token") WHERE ("accepted_at" IS NULL);



CREATE INDEX "idx_org_licenses_org_id" ON "public"."org_licenses" USING "btree" ("org_id");



CREATE INDEX "idx_org_licenses_stripe_subscription_id" ON "public"."org_licenses" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_org_members_org" ON "public"."organization_members" USING "btree" ("org_id");



CREATE INDEX "idx_org_members_org_role" ON "public"."organization_members" USING "btree" ("org_id", "role");



CREATE INDEX "idx_org_members_user" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_org_members_user_org_role_covering" ON "public"."organization_members" USING "btree" ("user_id", "org_id", "role") INCLUDE ("created_at", "updated_at");



CREATE INDEX "idx_org_overrides_env" ON "public"."feature_flag_org_overrides" USING "btree" ("environment");



CREATE INDEX "idx_org_overrides_flag" ON "public"."feature_flag_org_overrides" USING "btree" ("feature_flag_id");



CREATE INDEX "idx_org_overrides_flag_org_env" ON "public"."feature_flag_org_overrides" USING "btree" ("feature_flag_id", "org_id", "environment");



CREATE INDEX "idx_org_overrides_org" ON "public"."feature_flag_org_overrides" USING "btree" ("org_id");



CREATE INDEX "idx_org_payment_policies_org_id" ON "public"."org_payment_policies" USING "btree" ("org_id");



CREATE INDEX "idx_org_sport_customizations_org_id" ON "public"."organization_sport_customizations" USING "btree" ("org_id");



CREATE INDEX "idx_org_sport_customizations_sport_id" ON "public"."organization_sport_customizations" USING "btree" ("sport_id");



CREATE INDEX "idx_org_sport_profile_settings_org" ON "public"."org_sport_profile_settings" USING "btree" ("org_id");



CREATE INDEX "idx_org_sport_profile_settings_sport" ON "public"."org_sport_profile_settings" USING "btree" ("sport_code");



CREATE INDEX "idx_org_storage_usage_bucket_id" ON "public"."org_storage_usage" USING "btree" ("bucket_id");



CREATE INDEX "idx_organization_advanced_settings_org_id" ON "public"."organization_advanced_settings" USING "btree" ("org_id");



CREATE INDEX "idx_organization_attendance_settings_org_id" ON "public"."organization_attendance_settings" USING "btree" ("org_id");



CREATE INDEX "idx_organization_contacts_org_category" ON "public"."organization_contacts" USING "btree" ("org_id", "category");



CREATE INDEX "idx_organization_contacts_org_id" ON "public"."organization_contacts" USING "btree" ("org_id");



CREATE INDEX "idx_organization_defaults_org_id" ON "public"."organization_defaults" USING "btree" ("org_id");



CREATE INDEX "idx_organization_notification_settings_org_id" ON "public"."organization_notification_settings" USING "btree" ("org_id");



CREATE INDEX "idx_organization_registration_settings_org_id" ON "public"."organization_registration_settings" USING "btree" ("org_id");



CREATE INDEX "idx_organization_settings_org_id" ON "public"."organization_settings" USING "btree" ("org_id");



CREATE INDEX "idx_organization_sports_org_id" ON "public"."organization_sports" USING "btree" ("org_id");



CREATE INDEX "idx_organization_sports_sport_id" ON "public"."organization_sports" USING "btree" ("sport_id");



CREATE INDEX "idx_organization_travel_contacts_org_id" ON "public"."organization_travel_contacts" USING "btree" ("org_id");



CREATE INDEX "idx_organization_visibility_settings_org_id" ON "public"."organization_visibility_settings" USING "btree" ("org_id");



CREATE UNIQUE INDEX "idx_override_unique_active" ON "public"."entitlement_overrides" USING "btree" ("target_type", "target_id", "feature_entitlement_id", "override_action") WHERE ("revoked_at" IS NULL);



COMMENT ON INDEX "public"."idx_override_unique_active" IS 'Prevents duplicate active overrides for the same target, feature, and action combination. Revoked overrides are excluded from this constraint.';



CREATE INDEX "idx_parent_invites_athlete_id" ON "public"."parent_invites" USING "btree" ("athlete_id");



CREATE INDEX "idx_parent_invites_org_email" ON "public"."parent_invites" USING "btree" ("org_id", "lower"("email"));



CREATE UNIQUE INDEX "idx_parent_invites_pending_unique" ON "public"."parent_invites" USING "btree" ("org_id", "athlete_id", "lower"("email")) WHERE ("status" = 'pending'::"public"."parent_invite_status");



COMMENT ON INDEX "public"."idx_parent_invites_pending_unique" IS 'Prevents duplicate pending invites for same organization, athlete, and email. Uses partial index on pending status only.';



CREATE INDEX "idx_payment_allocations_charge_id" ON "public"."payment_allocations" USING "btree" ("charge_id");



CREATE INDEX "idx_payment_allocations_fee_assignment_id" ON "public"."payment_allocations" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_payment_allocations_payment_id" ON "public"."payment_allocations" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_events_created_at" ON "public"."payment_events" USING "btree" ("created_at");



CREATE INDEX "idx_payment_events_created_by_user_id" ON "public"."payment_events" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_payment_events_entity_id" ON "public"."payment_events" USING "btree" ("entity_id");



CREATE INDEX "idx_payment_events_entity_type" ON "public"."payment_events" USING "btree" ("entity_type");



CREATE INDEX "idx_payment_events_org_id" ON "public"."payment_events" USING "btree" ("org_id");



CREATE INDEX "idx_payments_checkout_session_id" ON "public"."payments" USING "btree" ("checkout_session_id");



CREATE INDEX "idx_payments_org_id" ON "public"."payments" USING "btree" ("org_id");



CREATE INDEX "idx_payments_parent_id" ON "public"."payments" USING "btree" ("parent_id");



CREATE INDEX "idx_payments_payment_type" ON "public"."payments" USING "btree" ("payment_type");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_stripe_payment_intent_id" ON "public"."payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_platform_admins_role" ON "public"."platform_admins" USING "btree" ("role");



CREATE INDEX "idx_platform_admins_user" ON "public"."platform_admins" USING "btree" ("user_id");



CREATE INDEX "idx_platform_defaults_env" ON "public"."feature_flag_platform_defaults" USING "btree" ("environment");



CREATE INDEX "idx_platform_defaults_flag" ON "public"."feature_flag_platform_defaults" USING "btree" ("feature_flag_id");



CREATE INDEX "idx_programs_name" ON "public"."programs" USING "btree" ("name");



CREATE INDEX "idx_programs_org_id" ON "public"."programs" USING "btree" ("org_id");



CREATE INDEX "idx_programs_sport_id" ON "public"."programs" USING "btree" ("sport_id");



CREATE INDEX "idx_recurring_instances_date" ON "public"."recurring_event_instances" USING "btree" ("occurrence_date");



CREATE INDEX "idx_recurring_instances_event" ON "public"."recurring_event_instances" USING "btree" ("event_id");



CREATE INDEX "idx_recurring_instances_pattern" ON "public"."recurring_event_instances" USING "btree" ("pattern_id");



CREATE INDEX "idx_recurring_patterns_parent_event" ON "public"."recurring_event_patterns" USING "btree" ("parent_event_id");



CREATE INDEX "idx_refunds_created_by_admin_id" ON "public"."refunds" USING "btree" ("created_by_admin_id");



CREATE INDEX "idx_refunds_offline_payment_id" ON "public"."refunds" USING "btree" ("offline_payment_id");



CREATE INDEX "idx_refunds_org_id" ON "public"."refunds" USING "btree" ("org_id");



CREATE INDEX "idx_refunds_payment_id" ON "public"."refunds" USING "btree" ("payment_id");



CREATE INDEX "idx_scholarship_awards_awarded_by_admin_id" ON "public"."scholarship_awards" USING "btree" ("awarded_by_admin_id");



CREATE INDEX "idx_scholarship_awards_fee_assignment_id" ON "public"."scholarship_awards" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_scholarship_awards_scholarship_program_id" ON "public"."scholarship_awards" USING "btree" ("scholarship_program_id");



CREATE INDEX "idx_scholarship_programs_org_id" ON "public"."scholarship_programs" USING "btree" ("org_id");



CREATE INDEX "idx_scholarship_programs_status" ON "public"."scholarship_programs" USING "btree" ("status");



CREATE INDEX "idx_seasons_team_id" ON "public"."seasons" USING "btree" ("team_id");



CREATE INDEX "idx_slug_history_lookup" ON "public"."org_slug_history" USING "btree" ("previous_slug", "expires_at" DESC) INCLUDE ("org_id");



CREATE INDEX "idx_sport_field_definitions_enabled" ON "public"."sport_field_definitions" USING "btree" ("sport_code", "is_enabled") WHERE ("is_enabled" = true);



CREATE INDEX "idx_sport_field_definitions_sport" ON "public"."sport_field_definitions" USING "btree" ("sport_code");



CREATE INDEX "idx_sport_field_definitions_sport_group" ON "public"."sport_field_definitions" USING "btree" ("sport_code", "field_group");



CREATE INDEX "idx_sports_is_system" ON "public"."sports" USING "btree" ("is_system") WHERE ("is_system" = true);



CREATE INDEX "idx_sports_name" ON "public"."sports" USING "btree" ("name");



CREATE INDEX "idx_sports_org_id" ON "public"."sports" USING "btree" ("org_id");



CREATE INDEX "idx_sports_slug" ON "public"."sports" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_stream_channels_dm_users" ON "public"."stream_channels" USING "btree" ("user_id_1", "user_id_2") WHERE ("channel_type" = 'dm'::"text");



CREATE INDEX "idx_stream_channels_org" ON "public"."stream_channels" USING "btree" ("org_id");



CREATE INDEX "idx_stream_channels_team" ON "public"."stream_channels" USING "btree" ("team_id");



CREATE INDEX "idx_stream_channels_type" ON "public"."stream_channels" USING "btree" ("channel_type");



CREATE INDEX "idx_stream_metadata_activity" ON "public"."stream_channel_metadata" USING "btree" ("last_activity_at");



CREATE INDEX "idx_stream_metadata_event" ON "public"."stream_channel_metadata" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_stripe_connect_transactions_account_created" ON "public"."stripe_connect_transactions" USING "btree" ("connect_account_id", "created_at");



CREATE INDEX "idx_stripe_webhook_receipts_processed_at" ON "public"."stripe_webhook_receipts" USING "btree" ("processed_at");



CREATE INDEX "idx_stripe_webhook_receipts_stripe_event_id" ON "public"."stripe_webhook_receipts" USING "btree" ("stripe_event_id");



CREATE UNIQUE INDEX "idx_team_seasons_one_active" ON "public"."team_seasons" USING "btree" ("team_id") WHERE ("is_active" = true);



CREATE INDEX "idx_team_seasons_season_id" ON "public"."team_seasons" USING "btree" ("season_id");



CREATE INDEX "idx_team_seasons_team_id" ON "public"."team_seasons" USING "btree" ("team_id");



CREATE INDEX "idx_teams_org_id" ON "public"."teams" USING "btree" ("org_id");



CREATE INDEX "idx_ticket_access_links_expires_at" ON "public"."ticket_access_links" USING "btree" ("expires_at");



CREATE INDEX "idx_ticket_access_links_order_id" ON "public"."ticket_access_links" USING "btree" ("order_id");



CREATE INDEX "idx_ticket_access_links_token_hash" ON "public"."ticket_access_links" USING "btree" ("token_hash");



CREATE INDEX "idx_ticket_holds_expires_at" ON "public"."ticket_holds" USING "btree" ("expires_at");



CREATE INDEX "idx_ticket_holds_order_id" ON "public"."ticket_holds" USING "btree" ("order_id") WHERE ("order_id" IS NOT NULL);



CREATE INDEX "idx_ticket_holds_ticket_type_id" ON "public"."ticket_holds" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_ticket_holds_ticketed_event_id" ON "public"."ticket_holds" USING "btree" ("ticketed_event_id");



CREATE INDEX "idx_ticket_order_items_order_id" ON "public"."ticket_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_ticket_orders_org_id_created_at" ON "public"."ticket_orders" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_ticket_orders_org_processed" ON "public"."ticket_orders" USING "btree" ("org_id", "processed_at") WHERE ("processed_at" IS NOT NULL);



CREATE INDEX "idx_ticket_orders_purchaser_email_created_at" ON "public"."ticket_orders" USING "btree" ("purchaser_email", "created_at" DESC);



CREATE INDEX "idx_ticket_orders_status" ON "public"."ticket_orders" USING "btree" ("status");



CREATE INDEX "idx_ticket_orders_ticketed_event_id_created_at" ON "public"."ticket_orders" USING "btree" ("ticketed_event_id", "created_at" DESC);



CREATE INDEX "idx_ticket_scans_scanner_user_id_scanned_at" ON "public"."ticket_scans" USING "btree" ("scanner_user_id", "scanned_at" DESC) WHERE ("scanner_user_id" IS NOT NULL);



CREATE INDEX "idx_ticket_scans_ticket_id" ON "public"."ticket_scans" USING "btree" ("ticket_id") WHERE ("ticket_id" IS NOT NULL);



CREATE INDEX "idx_ticket_scans_ticketed_event_id_scanned_at" ON "public"."ticket_scans" USING "btree" ("ticketed_event_id", "scanned_at" DESC);



CREATE INDEX "idx_ticket_staff_links_expires_at" ON "public"."ticket_staff_links" USING "btree" ("expires_at");



CREATE INDEX "idx_ticket_staff_links_org_id" ON "public"."ticket_staff_links" USING "btree" ("org_id");



CREATE INDEX "idx_ticket_staff_links_ticketed_event_id" ON "public"."ticket_staff_links" USING "btree" ("ticketed_event_id");



CREATE INDEX "idx_ticket_staff_links_token_hash" ON "public"."ticket_staff_links" USING "btree" ("token_hash");



CREATE INDEX "idx_ticket_types_org_id_ticketed_event_id" ON "public"."ticket_types" USING "btree" ("org_id", "ticketed_event_id");



CREATE INDEX "idx_ticket_types_ticketed_event_id_sort_order" ON "public"."ticket_types" USING "btree" ("ticketed_event_id", "sort_order");



CREATE INDEX "idx_ticketed_events_event_id" ON "public"."ticketed_events" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_ticketed_events_org_id_starts_at" ON "public"."ticketed_events" USING "btree" ("org_id", "starts_at");



CREATE INDEX "idx_ticketed_events_status_starts_at" ON "public"."ticketed_events" USING "btree" ("status", "starts_at");



CREATE INDEX "idx_ticketed_events_team_id_starts_at" ON "public"."ticketed_events" USING "btree" ("team_id", "starts_at") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "idx_tickets_entry_code" ON "public"."tickets" USING "btree" ("entry_code");



CREATE INDEX "idx_tickets_order_id" ON "public"."tickets" USING "btree" ("order_id");



CREATE INDEX "idx_tickets_qr_token_hash" ON "public"."tickets" USING "btree" ("qr_token_hash");



CREATE INDEX "idx_tickets_ticketed_event_id_status" ON "public"."tickets" USING "btree" ("ticketed_event_id", "status");



CREATE INDEX "idx_tier_feature_assignments_feature_id" ON "public"."tier_feature_assignments" USING "btree" ("feature_entitlement_id");



CREATE INDEX "idx_tier_feature_assignments_feature_included" ON "public"."tier_feature_assignments" USING "btree" ("feature_entitlement_id", "included") WHERE ("included" = true);



CREATE INDEX "idx_tier_feature_assignments_tier_id" ON "public"."tier_feature_assignments" USING "btree" ("license_tier_id");



CREATE INDEX "idx_travel_plan_contacts_travel_plan_id" ON "public"."travel_plan_contacts" USING "btree" ("travel_plan_id");



CREATE INDEX "idx_travel_plans_season_id" ON "public"."travel_plans" USING "btree" ("season_id");



CREATE INDEX "idx_travel_plans_start_date" ON "public"."travel_plans" USING "btree" ("start_date");



CREATE INDEX "idx_travel_plans_team_id" ON "public"."travel_plans" USING "btree" ("team_id");



CREATE INDEX "idx_tryout_reg_docs_registration_id" ON "public"."tryout_registration_documents" USING "btree" ("registration_id");



CREATE INDEX "idx_tryout_reg_docs_required_document_id" ON "public"."tryout_registration_documents" USING "btree" ("required_document_id");



CREATE INDEX "idx_tryout_reg_docs_status" ON "public"."tryout_registration_documents" USING "btree" ("status");



CREATE INDEX "idx_tryout_registrations_child_id" ON "public"."tryout_registrations" USING "btree" ("athlete_id");



CREATE INDEX "idx_tryout_registrations_status" ON "public"."tryout_registrations" USING "btree" ("status");



CREATE INDEX "idx_tryout_registrations_tryout_id" ON "public"."tryout_registrations" USING "btree" ("tryout_id");



CREATE INDEX "idx_tryout_required_documents_tryout_id" ON "public"."tryout_required_documents" USING "btree" ("tryout_id");



CREATE INDEX "idx_tryout_scores_coach_id" ON "public"."tryout_scores" USING "btree" ("coach_id");



CREATE INDEX "idx_tryout_scores_criteria_id" ON "public"."tryout_scores" USING "btree" ("criteria_id");



CREATE INDEX "idx_tryout_scores_registration_id" ON "public"."tryout_scores" USING "btree" ("registration_id");



CREATE INDEX "idx_tryout_staff_notes_author_user_id" ON "public"."tryout_registration_staff_notes" USING "btree" ("author_user_id");



CREATE INDEX "idx_tryout_staff_notes_registration_id" ON "public"."tryout_registration_staff_notes" USING "btree" ("registration_id");



CREATE INDEX "idx_tryouts_org_id" ON "public"."tryouts" USING "btree" ("org_id");



CREATE INDEX "idx_tryouts_tryout_date" ON "public"."tryouts" USING "btree" ("tryout_date");



CREATE INDEX "idx_uniform_kit_items_kit" ON "public"."uniform_kit_items" USING "btree" ("kit_id");



CREATE INDEX "idx_uniform_kits_locked_at" ON "public"."uniform_kits" USING "btree" ("locked_at");



CREATE INDEX "idx_uniform_kits_team_season" ON "public"."uniform_kits" USING "btree" ("team_id", "season_id");



CREATE INDEX "idx_uniform_orders_child_id" ON "public"."uniform_orders" USING "btree" ("athlete_id");



CREATE INDEX "idx_uniform_orders_season_id" ON "public"."uniform_orders" USING "btree" ("season_id");



CREATE INDEX "idx_uniform_orders_status" ON "public"."uniform_orders" USING "btree" ("status");



CREATE INDEX "idx_uniform_orders_team_id" ON "public"."uniform_orders" USING "btree" ("team_id");



CREATE INDEX "idx_uniform_submission_items_item" ON "public"."uniform_submission_items" USING "btree" ("item_id");



CREATE INDEX "idx_uniform_submission_items_submission" ON "public"."uniform_submission_items" USING "btree" ("submission_id");



CREATE INDEX "idx_uniform_submissions_child" ON "public"."uniform_submissions" USING "btree" ("athlete_id");



CREATE INDEX "idx_uniform_submissions_kit" ON "public"."uniform_submissions" USING "btree" ("kit_id");



CREATE INDEX "idx_uniform_submissions_status" ON "public"."uniform_submissions" USING "btree" ("status");



CREATE INDEX "idx_user_notifications_action" ON "public"."user_notifications" USING "btree" ("action");



CREATE INDEX "idx_user_notifications_entity" ON "public"."user_notifications" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_user_notifications_role_ctx" ON "public"."user_notifications" USING "btree" ("role_context");



CREATE UNIQUE INDEX "idx_user_notifications_user_dedupe" ON "public"."user_notifications" USING "btree" ("user_id", "dedupe_key");



CREATE INDEX "idx_user_overrides_env" ON "public"."feature_flag_user_overrides" USING "btree" ("environment");



CREATE INDEX "idx_user_overrides_flag" ON "public"."feature_flag_user_overrides" USING "btree" ("feature_flag_id");



CREATE INDEX "idx_user_overrides_flag_user_env" ON "public"."feature_flag_user_overrides" USING "btree" ("feature_flag_id", "user_id", "environment");



CREATE INDEX "idx_user_overrides_user" ON "public"."feature_flag_user_overrides" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_family_id" ON "public"."users" USING "btree" ("family_id");



CREATE INDEX "idx_users_org_id" ON "public"."users" USING "btree" ("org_id");



CREATE INDEX "idx_valid_event_types_category" ON "public"."valid_event_types" USING "btree" ("category");



CREATE INDEX "idx_valid_event_types_event_type" ON "public"."valid_event_types" USING "btree" ("event_type");



CREATE INDEX "idx_venue_insights_fetch_in_progress" ON "public"."venue_insights" USING "btree" ("place_id") WHERE ("fetch_in_progress" = true);



CREATE INDEX "idx_venue_insights_fetched_at" ON "public"."venue_insights" USING "btree" ("place_details_fetched_at");



CREATE INDEX "idx_venue_insights_place_id" ON "public"."venue_insights" USING "btree" ("place_id");



CREATE INDEX "idx_venue_nearby_amenities_summaries_context" ON "public"."venue_nearby_amenities_summaries" USING "btree" ("venue_nearby_places_id", "event_type", "time_window");



CREATE INDEX "idx_venue_nearby_amenities_summaries_venue_id" ON "public"."venue_nearby_amenities_summaries" USING "btree" ("venue_nearby_places_id");



CREATE INDEX "idx_venue_nearby_places_fetch_in_progress" ON "public"."venue_nearby_places" USING "btree" ("venue_key") WHERE ("fetch_in_progress" = true);



CREATE INDEX "idx_venue_nearby_places_fetched_at" ON "public"."venue_nearby_places" USING "btree" ("fetched_at");



CREATE INDEX "idx_venue_nearby_places_venue_key" ON "public"."venue_nearby_places" USING "btree" ("venue_key");



CREATE INDEX "idx_video_athlete_links_athlete_id" ON "public"."video_athlete_links" USING "btree" ("athlete_id");



CREATE INDEX "idx_video_athlete_links_video_id" ON "public"."video_athlete_links" USING "btree" ("video_id");



CREATE UNIQUE INDEX "idx_video_bookmarks_unique" ON "public"."video_bookmarks" USING "btree" ("video_id", "user_id", "timestamp_seconds");



CREATE INDEX "idx_video_bookmarks_user_id" ON "public"."video_bookmarks" USING "btree" ("user_id");



CREATE INDEX "idx_video_bookmarks_video_id" ON "public"."video_bookmarks" USING "btree" ("video_id");



CREATE INDEX "idx_video_comments_author_id" ON "public"."video_comments" USING "btree" ("author_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_video_comments_parent_id" ON "public"."video_comments" USING "btree" ("parent_comment_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_video_comments_video_id" ON "public"."video_comments" USING "btree" ("video_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_video_note_targets_athlete_id" ON "public"."video_note_targets" USING "btree" ("athlete_id");



CREATE INDEX "idx_video_note_targets_note_id" ON "public"."video_note_targets" USING "btree" ("note_id");



CREATE INDEX "idx_video_notes_author_id" ON "public"."video_notes" USING "btree" ("author_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_video_notes_timestamp" ON "public"."video_notes" USING "btree" ("timestamp_seconds") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_video_notes_video_id" ON "public"."video_notes" USING "btree" ("video_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_video_reviews_athlete_id" ON "public"."video_reviews" USING "btree" ("athlete_id");



CREATE INDEX "idx_video_reviews_guardian_id" ON "public"."video_reviews" USING "btree" ("guardian_id");



CREATE INDEX "idx_video_reviews_status" ON "public"."video_reviews" USING "btree" ("status");



CREATE INDEX "idx_video_reviews_video_id" ON "public"."video_reviews" USING "btree" ("video_id");



CREATE INDEX "idx_video_tag_links_tag_id" ON "public"."video_tag_links" USING "btree" ("tag_id");



CREATE INDEX "idx_video_tag_links_video_id" ON "public"."video_tag_links" USING "btree" ("video_id");



CREATE INDEX "idx_video_tags_org_id" ON "public"."video_tags" USING "btree" ("org_id");



CREATE INDEX "idx_video_tags_tag_type" ON "public"."video_tags" USING "btree" ("tag_type");



CREATE INDEX "idx_videos_category" ON "public"."videos" USING "btree" ("category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_videos_created_at" ON "public"."videos" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_videos_event_id" ON "public"."videos" USING "btree" ("event_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_videos_mux_upload_id" ON "public"."videos" USING "btree" ("mux_upload_id");



CREATE INDEX "idx_videos_org_id" ON "public"."videos" USING "btree" ("org_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_videos_status" ON "public"."videos" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_videos_team_id" ON "public"."videos" USING "btree" ("team_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_videos_uploaded_by" ON "public"."videos" USING "btree" ("uploaded_by") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_waivers_created_by_admin_id" ON "public"."waivers" USING "btree" ("created_by_admin_id");



CREATE INDEX "idx_waivers_fee_assignment_id" ON "public"."waivers" USING "btree" ("fee_assignment_id");



CREATE INDEX "idx_waivers_org_id" ON "public"."waivers" USING "btree" ("org_id");



CREATE UNIQUE INDEX "sports_org_id_name_key" ON "public"."sports" USING "btree" ("org_id", "name") WHERE ("org_id" IS NOT NULL);



CREATE UNIQUE INDEX "sports_system_name_key" ON "public"."sports" USING "btree" ("name") WHERE (("is_system" = true) AND ("org_id" IS NULL));



CREATE UNIQUE INDEX "sports_system_slug_key" ON "public"."sports" USING "btree" ("slug") WHERE (("is_system" = true) AND ("org_id" IS NULL) AND ("slug" IS NOT NULL));



CREATE UNIQUE INDEX "uq_feature_flag_key_env_active" ON "public"."feature_flags" USING "btree" ("key", "environment") WHERE ("deleted_at" IS NULL);



CREATE OR REPLACE TRIGGER "athlete_sports_updated_at_trigger" BEFORE UPDATE ON "public"."athlete_sports" FOR EACH ROW EXECUTE FUNCTION "public"."update_athlete_sports_updated_at"();



CREATE OR REPLACE TRIGGER "auto_create_org_channel" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_org_stream_channel"();



CREATE OR REPLACE TRIGGER "auto_create_team_channel" AFTER INSERT ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."create_team_stream_channel"();



CREATE OR REPLACE TRIGGER "check_slug_collision_before_insert" BEFORE INSERT ON "public"."org_slug_history" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_slug_collision"();



CREATE OR REPLACE TRIGGER "child_claim_tokens_audit_log" AFTER INSERT OR UPDATE ON "public"."child_claim_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."log_child_claim_token_changes"();



CREATE OR REPLACE TRIGGER "create_rsvps_on_event_insert" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."create_rsvps_for_event"();



CREATE OR REPLACE TRIGGER "event_change_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."log_event_change"();



CREATE OR REPLACE TRIGGER "general_rsvp_responded_at_trigger" BEFORE INSERT OR UPDATE ON "public"."event_general_rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."set_general_rsvp_responded_at"();



CREATE OR REPLACE TRIGGER "guardian_attachment_request_notification" AFTER INSERT OR UPDATE ON "public"."guardian_attachment_requests" FOR EACH ROW EXECUTE FUNCTION "public"."queue_guardian_attachment_notification"();



COMMENT ON TRIGGER "guardian_attachment_request_notification" ON "public"."guardian_attachment_requests" IS 'Automatically queues email notifications when guardian attachment requests are created or reviewed.';



CREATE OR REPLACE TRIGGER "guardian_invite_send_notification" AFTER INSERT ON "public"."parent_invites" FOR EACH ROW EXECUTE FUNCTION "public"."queue_guardian_invite_notification"();



COMMENT ON TRIGGER "guardian_invite_send_notification" ON "public"."parent_invites" IS 'Automatically queues an email notification when a new guardian invite is created.';



CREATE OR REPLACE TRIGGER "increment_org_sport_profile_settings_version" BEFORE UPDATE ON "public"."org_sport_profile_settings" FOR EACH ROW WHEN (("old"."overrides" IS DISTINCT FROM "new"."overrides")) EXECUTE FUNCTION "public"."increment_org_sport_settings_version"();



CREATE OR REPLACE TRIGGER "join_links_audit_log" AFTER INSERT ON "public"."join_links" FOR EACH ROW EXECUTE FUNCTION "public"."log_join_link_changes"();



CREATE OR REPLACE TRIGGER "join_requests_audit_log" AFTER INSERT OR UPDATE ON "public"."join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."log_join_request_changes"();



CREATE OR REPLACE TRIGGER "on_org_member_created_clear_flag" AFTER INSERT ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."clear_org_setup_flag"();



CREATE OR REPLACE TRIGGER "on_user_created_link_invites" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_invite_linking"();



CREATE OR REPLACE TRIGGER "organization_advanced_settings_updated_at" BEFORE UPDATE ON "public"."organization_advanced_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_attendance_settings_updated_at" BEFORE UPDATE ON "public"."organization_attendance_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_defaults_updated_at" BEFORE UPDATE ON "public"."organization_defaults" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_members_audit_log" AFTER INSERT OR DELETE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."log_organization_member_changes"();



CREATE OR REPLACE TRIGGER "organization_notification_settings_updated_at" BEFORE UPDATE ON "public"."organization_notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_registration_settings_updated_at" BEFORE UPDATE ON "public"."organization_registration_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_settings_updated_at" BEFORE UPDATE ON "public"."organization_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_travel_contacts_updated_at" BEFORE UPDATE ON "public"."organization_travel_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "organization_visibility_settings_updated_at" BEFORE UPDATE ON "public"."organization_visibility_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "parent_invites_audit_log" AFTER INSERT OR UPDATE ON "public"."parent_invites" FOR EACH ROW EXECUTE FUNCTION "public"."log_parent_invite_changes"();



CREATE OR REPLACE TRIGGER "rsvp_responded_at_trigger" BEFORE INSERT OR UPDATE ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."set_rsvp_responded_at"();



CREATE OR REPLACE TRIGGER "set_huddle_prefs_updated_at" BEFORE UPDATE ON "public"."huddle_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_huddle_reports_updated_at" BEFORE UPDATE ON "public"."huddle_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_report_reviewed_at" BEFORE UPDATE ON "public"."huddle_reports" FOR EACH ROW WHEN (("new"."status" <> "old"."status")) EXECUTE FUNCTION "public"."set_huddle_report_reviewed_at"();



CREATE OR REPLACE TRIGGER "set_stream_channels_updated_at" BEFORE UPDATE ON "public"."stream_channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_stream_metadata_updated_at" BEFORE UPDATE ON "public"."stream_channel_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_team_invite_code" BEFORE INSERT ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."generate_invite_code"();



CREATE OR REPLACE TRIGGER "travel_plan_contacts_updated_at" BEFORE UPDATE ON "public"."travel_plan_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_org_licenses_updated_at" BEFORE UPDATE ON "public"."org_licenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_org_licenses_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payment_allocations_balance" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."update_fee_assignment_balance"();



CREATE OR REPLACE TRIGGER "trg_sync_organization_license" AFTER INSERT OR DELETE OR UPDATE OF "status", "plan", "current_period_start", "current_period_end", "cancel_at_period_end", "trial_ends_at", "grace_ends_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id" ON "public"."org_licenses" FOR EACH ROW EXECUTE FUNCTION "public"."sync_organization_license_from_org_licenses"();



CREATE OR REPLACE TRIGGER "trigger_assign_system_features_to_new_tier" AFTER INSERT ON "public"."license_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."assign_system_features_to_new_tier"();



CREATE OR REPLACE TRIGGER "trigger_create_org_payment_policy" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_org_payment_policy_for_new_org"();



CREATE OR REPLACE TRIGGER "trigger_feature_entitlements_updated_at" BEFORE UPDATE ON "public"."feature_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_feature_entitlements_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_increment_override_version" BEFORE UPDATE ON "public"."entitlement_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."increment_override_version"();



CREATE OR REPLACE TRIGGER "trigger_license_tiers_updated_at" BEFORE UPDATE ON "public"."license_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_license_tiers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_feature_flag_changes" BEFORE INSERT OR DELETE OR UPDATE ON "public"."feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."log_feature_flag_change"();



CREATE OR REPLACE TRIGGER "trigger_log_fee_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."fees" FOR EACH ROW EXECUTE FUNCTION "public"."log_fee_changes"();



CREATE OR REPLACE TRIGGER "trigger_log_org_override_changes" BEFORE INSERT OR DELETE OR UPDATE ON "public"."feature_flag_org_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."log_feature_flag_change"();



CREATE OR REPLACE TRIGGER "trigger_log_organization_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."log_organization_changes"();



CREATE OR REPLACE TRIGGER "trigger_log_platform_default_changes" BEFORE INSERT OR DELETE OR UPDATE ON "public"."feature_flag_platform_defaults" FOR EACH ROW EXECUTE FUNCTION "public"."log_feature_flag_change"();



CREATE OR REPLACE TRIGGER "trigger_log_user_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_changes"();



CREATE OR REPLACE TRIGGER "trigger_log_user_override_changes" BEFORE INSERT OR DELETE OR UPDATE ON "public"."feature_flag_user_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."log_feature_flag_change"();



CREATE OR REPLACE TRIGGER "trigger_prevent_feature_archive_with_overrides" BEFORE UPDATE ON "public"."feature_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_feature_archive_with_active_overrides"();



CREATE OR REPLACE TRIGGER "trigger_prevent_org_delete_with_overrides" BEFORE DELETE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_org_delete_with_active_overrides"();



CREATE OR REPLACE TRIGGER "trigger_prevent_user_delete_with_overrides" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_user_delete_with_active_overrides"();



CREATE OR REPLACE TRIGGER "trigger_refresh_derived_families" AFTER INSERT OR DELETE OR UPDATE ON "public"."athlete_guardians" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_derived_families"();



CREATE OR REPLACE TRIGGER "trigger_video_bookmarks_updated_at" BEFORE UPDATE ON "public"."video_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_video_comments_updated_at" BEFORE UPDATE ON "public"."video_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_video_notes_updated_at" BEFORE UPDATE ON "public"."video_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_video_reviews_updated_at" BEFORE UPDATE ON "public"."video_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_video_tag_links_usage" AFTER INSERT OR DELETE ON "public"."video_tag_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_tag_usage_count"();



CREATE OR REPLACE TRIGGER "trigger_video_tags_updated_at" BEFORE UPDATE ON "public"."video_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_videos_updated_at" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_updated_at"();



CREATE OR REPLACE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_athlete_guardians_updated_at" BEFORE UPDATE ON "public"."athlete_guardians" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_athlete_imports_updated_at" BEFORE UPDATE ON "public"."athlete_imports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_athlete_medical_private_updated_at" BEFORE UPDATE ON "public"."athlete_medical_private" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_athlete_sport_profiles_updated_at" BEFORE UPDATE ON "public"."athlete_sport_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_athletes_updated_at" BEFORE UPDATE ON "public"."athletes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_attendance_updated_at" BEFORE UPDATE ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_charges_updated_at" BEFORE UPDATE ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_child_claim_tokens_updated_at" BEFORE UPDATE ON "public"."child_claim_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_children_updated_at" BEFORE UPDATE ON "public"."children" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discount_codes_updated_at" BEFORE UPDATE ON "public"."discount_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_general_rsvps_updated_at" BEFORE UPDATE ON "public"."event_general_rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_locations_updated_at" BEFORE UPDATE ON "public"."event_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_rsvps_updated_at" BEFORE UPDATE ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_families_updated_at" BEFORE UPDATE ON "public"."families" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feature_flags_updated_at" BEFORE UPDATE ON "public"."feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fee_assignments_updated_at" BEFORE UPDATE ON "public"."fee_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fees_updated_at" BEFORE UPDATE ON "public"."fees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_galleries_updated_at" BEFORE UPDATE ON "public"."galleries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gallery_photos_updated_at" BEFORE UPDATE ON "public"."gallery_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_guardian_attachment_requests_updated_at" BEFORE UPDATE ON "public"."guardian_attachment_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_installment_plans_updated_at" BEFORE UPDATE ON "public"."installment_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_installment_schedules_updated_at" BEFORE UPDATE ON "public"."installment_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_installments_updated_at" BEFORE UPDATE ON "public"."installments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_join_links_updated_at" BEFORE UPDATE ON "public"."join_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_join_requests_updated_at" BEFORE UPDATE ON "public"."join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_jobs_updated_at" BEFORE UPDATE ON "public"."notification_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_org_members_updated_at" BEFORE UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_org_overrides_updated_at" BEFORE UPDATE ON "public"."feature_flag_org_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_org_payment_policies_updated_at" BEFORE UPDATE ON "public"."org_payment_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_org_sport_customizations_updated_at" BEFORE UPDATE ON "public"."organization_sport_customizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_org_sport_profile_settings_updated_at" BEFORE UPDATE ON "public"."org_sport_profile_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_org_storage_usage_updated_at" BEFORE UPDATE ON "public"."org_storage_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_contacts_updated_at" BEFORE UPDATE ON "public"."organization_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_sports_updated_at" BEFORE UPDATE ON "public"."organization_sports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_parent_invites_updated_at" BEFORE UPDATE ON "public"."parent_invites" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_platform_defaults_updated_at" BEFORE UPDATE ON "public"."feature_flag_platform_defaults" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_programs_updated_at" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_patterns_updated_at" BEFORE UPDATE ON "public"."recurring_event_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scholarship_programs_updated_at" BEFORE UPDATE ON "public"."scholarship_programs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_seasons_updated_at" BEFORE UPDATE ON "public"."seasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_updated_at" BEFORE UPDATE ON "public"."sports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_team_memberships_updated_at" BEFORE UPDATE ON "public"."team_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_orders_updated_at" BEFORE UPDATE ON "public"."ticket_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_types_updated_at" BEFORE UPDATE ON "public"."ticket_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticketed_events_updated_at" BEFORE UPDATE ON "public"."ticketed_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tickets_updated_at" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_travel_plans_updated_at" BEFORE UPDATE ON "public"."travel_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tryout_registration_documents_updated_at" BEFORE UPDATE ON "public"."tryout_registration_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tryout_registration_staff_notes_updated_at" BEFORE UPDATE ON "public"."tryout_registration_staff_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tryout_registrations_updated_at" BEFORE UPDATE ON "public"."tryout_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tryout_scores_updated_at" BEFORE UPDATE ON "public"."tryout_scores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tryouts_updated_at" BEFORE UPDATE ON "public"."tryouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_uniform_kit_items_updated_at" BEFORE UPDATE ON "public"."uniform_kit_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_uniform_kits_updated_at" BEFORE UPDATE ON "public"."uniform_kits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_uniform_orders_updated_at" BEFORE UPDATE ON "public"."uniform_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_uniform_submission_items_updated_at" BEFORE UPDATE ON "public"."uniform_submission_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_uniform_submissions_updated_at" BEFORE UPDATE ON "public"."uniform_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_overrides_updated_at" BEFORE UPDATE ON "public"."feature_flag_user_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "venue_insights_updated_at" BEFORE UPDATE ON "public"."venue_insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_venue_insights_updated_at"();



CREATE OR REPLACE TRIGGER "venue_nearby_amenities_summaries_updated_at" BEFORE UPDATE ON "public"."venue_nearby_amenities_summaries" FOR EACH ROW EXECUTE FUNCTION "public"."update_venue_nearby_amenities_summaries_updated_at"();



CREATE OR REPLACE TRIGGER "venue_nearby_places_updated_at" BEFORE UPDATE ON "public"."venue_nearby_places" FOR EACH ROW EXECUTE FUNCTION "public"."update_venue_nearby_places_updated_at"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_guardians"
    ADD CONSTRAINT "athlete_guardians_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_guardians"
    ADD CONSTRAINT "athlete_guardians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_imports"
    ADD CONSTRAINT "athlete_imports_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_imports"
    ADD CONSTRAINT "athlete_imports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_medical_private"
    ADD CONSTRAINT "athlete_medical_private_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_medical_private"
    ADD CONSTRAINT "athlete_medical_private_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_sport_profiles"
    ADD CONSTRAINT "athlete_sport_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_sport_profiles"
    ADD CONSTRAINT "athlete_sport_profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_sport_profiles"
    ADD CONSTRAINT "athlete_sport_profiles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_sports"
    ADD CONSTRAINT "athlete_sports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_sports"
    ADD CONSTRAINT "athlete_sports_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs_old"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_claim_tokens"
    ADD CONSTRAINT "child_claim_tokens_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "children_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_applies_to_fee_id_fkey" FOREIGN KEY ("applies_to_fee_id") REFERENCES "public"."fees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_applies_to_season_id_fkey" FOREIGN KEY ("applies_to_season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_redemptions"
    ADD CONSTRAINT "discount_redemptions_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_redemptions"
    ADD CONSTRAINT "discount_redemptions_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_redemptions"
    ADD CONSTRAINT "discount_redemptions_redeemed_by_parent_id_fkey" FOREIGN KEY ("redeemed_by_parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entitlement_overrides"
    ADD CONSTRAINT "entitlement_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entitlement_overrides"
    ADD CONSTRAINT "entitlement_overrides_feature_entitlement_id_fkey" FOREIGN KEY ("feature_entitlement_id") REFERENCES "public"."feature_entitlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entitlement_overrides"
    ADD CONSTRAINT "entitlement_overrides_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."event_change_history"
    ADD CONSTRAINT "event_change_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."event_change_history"
    ADD CONSTRAINT "event_change_history_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_general_rsvps"
    ADD CONSTRAINT "event_general_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_general_rsvps"
    ADD CONSTRAINT "event_general_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_locations"
    ADD CONSTRAINT "event_locations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_logs"
    ADD CONSTRAINT "event_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_logs"
    ADD CONSTRAINT "event_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_responded_by_user_id_fkey" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_discovery_corrections"
    ADD CONSTRAINT "feature_discovery_corrections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."feature_flag_audit_log"
    ADD CONSTRAINT "feature_flag_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_flag_audit_log"
    ADD CONSTRAINT "feature_flag_audit_log_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_flag_org_overrides"
    ADD CONSTRAINT "feature_flag_org_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flag_org_overrides"
    ADD CONSTRAINT "feature_flag_org_overrides_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flag_platform_defaults"
    ADD CONSTRAINT "feature_flag_platform_defaults_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flag_user_overrides"
    ADD CONSTRAINT "feature_flag_user_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flag_user_overrides"
    ADD CONSTRAINT "feature_flag_user_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_integration_assignments"
    ADD CONSTRAINT "feature_integration_assignments_feature_entitlement_id_fkey" FOREIGN KEY ("feature_entitlement_id") REFERENCES "public"."feature_entitlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_assignments"
    ADD CONSTRAINT "fee_assignments_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_assignments"
    ADD CONSTRAINT "fee_assignments_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_assignments"
    ADD CONSTRAINT "fee_assignments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_installment_plan_id_fkey" FOREIGN KEY ("installment_plan_id") REFERENCES "public"."installment_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_cover_photo_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_albums"
    ADD CONSTRAINT "gallery_albums_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_downloads"
    ADD CONSTRAINT "gallery_downloads_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_downloads"
    ADD CONSTRAINT "gallery_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_photo_tags"
    ADD CONSTRAINT "gallery_photo_tags_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gallery_share_links"
    ADD CONSTRAINT "gallery_share_links_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardian_attachment_requests"
    ADD CONSTRAINT "guardian_attachment_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardian_attachment_requests"
    ADD CONSTRAINT "guardian_attachment_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardian_attachment_requests"
    ADD CONSTRAINT "guardian_attachment_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."huddle_audit_log"
    ADD CONSTRAINT "huddle_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."huddle_notification_preferences"
    ADD CONSTRAINT "huddle_notification_preferences_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."stream_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."huddle_notification_preferences"
    ADD CONSTRAINT "huddle_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."huddle_reports"
    ADD CONSTRAINT "huddle_reports_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."huddle_reports"
    ADD CONSTRAINT "huddle_reports_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."installment_plans"
    ADD CONSTRAINT "installment_plans_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installment_schedules"
    ADD CONSTRAINT "installment_schedules_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installment_schedules"
    ADD CONSTRAINT "installment_schedules_installment_plan_id_fkey" FOREIGN KEY ("installment_plan_id") REFERENCES "public"."installment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_installment_schedule_id_fkey" FOREIGN KEY ("installment_schedule_id") REFERENCES "public"."installment_schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_links"
    ADD CONSTRAINT "join_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."join_links"
    ADD CONSTRAINT "join_links_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_links"
    ADD CONSTRAINT "join_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_join_link_id_fkey" FOREIGN KEY ("join_link_id") REFERENCES "public"."join_links"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages_archive"
    ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages_archive"
    ADD CONSTRAINT "messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_jobs"
    ADD CONSTRAINT "notification_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_jobs"
    ADD CONSTRAINT "notification_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_payment_allocations"
    ADD CONSTRAINT "offline_payment_allocations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_payment_allocations"
    ADD CONSTRAINT "offline_payment_allocations_offline_payment_id_fkey" FOREIGN KEY ("offline_payment_id") REFERENCES "public"."offline_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_payments"
    ADD CONSTRAINT "offline_payments_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_payments"
    ADD CONSTRAINT "offline_payments_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_payments"
    ADD CONSTRAINT "offline_payments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_payments"
    ADD CONSTRAINT "offline_payments_received_by_admin_id_fkey" FOREIGN KEY ("received_by_admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_licenses"
    ADD CONSTRAINT "org_licenses_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_payment_policies"
    ADD CONSTRAINT "org_payment_policies_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_slug_history"
    ADD CONSTRAINT "org_slug_history_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_sport_profile_settings"
    ADD CONSTRAINT "org_sport_profile_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_sport_profile_settings"
    ADD CONSTRAINT "org_sport_profile_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_storage_usage"
    ADD CONSTRAINT "org_storage_usage_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_advanced_settings"
    ADD CONSTRAINT "organization_advanced_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_attendance_settings"
    ADD CONSTRAINT "organization_attendance_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_contacts"
    ADD CONSTRAINT "organization_contacts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_defaults"
    ADD CONSTRAINT "organization_defaults_default_level_id_fkey" FOREIGN KEY ("default_level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_defaults"
    ADD CONSTRAINT "organization_defaults_default_program_id_fkey" FOREIGN KEY ("default_program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_defaults"
    ADD CONSTRAINT "organization_defaults_default_season_id_fkey" FOREIGN KEY ("default_season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_defaults"
    ADD CONSTRAINT "organization_defaults_default_sport_id_fkey" FOREIGN KEY ("default_sport_id") REFERENCES "public"."sports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_defaults"
    ADD CONSTRAINT "organization_defaults_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_notification_settings"
    ADD CONSTRAINT "organization_notification_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_registration_settings"
    ADD CONSTRAINT "organization_registration_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_sport_customizations"
    ADD CONSTRAINT "organization_sport_customizations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_sport_customizations"
    ADD CONSTRAINT "organization_sport_customizations_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_sports"
    ADD CONSTRAINT "organization_sports_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_sports"
    ADD CONSTRAINT "organization_sports_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_travel_contacts"
    ADD CONSTRAINT "organization_travel_contacts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_visibility_settings"
    ADD CONSTRAINT "organization_visibility_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_invites"
    ADD CONSTRAINT "parent_invites_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parent_invites"
    ADD CONSTRAINT "parent_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parent_invites"
    ADD CONSTRAINT "parent_invites_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_invites"
    ADD CONSTRAINT "parent_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_event_instances"
    ADD CONSTRAINT "recurring_event_instances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_event_instances"
    ADD CONSTRAINT "recurring_event_instances_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "public"."recurring_event_patterns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_event_patterns"
    ADD CONSTRAINT "recurring_event_patterns_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_offline_payment_id_fkey" FOREIGN KEY ("offline_payment_id") REFERENCES "public"."offline_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scholarship_awards"
    ADD CONSTRAINT "scholarship_awards_awarded_by_admin_id_fkey" FOREIGN KEY ("awarded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scholarship_awards"
    ADD CONSTRAINT "scholarship_awards_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scholarship_awards"
    ADD CONSTRAINT "scholarship_awards_scholarship_program_id_fkey" FOREIGN KEY ("scholarship_program_id") REFERENCES "public"."scholarship_programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scholarship_programs"
    ADD CONSTRAINT "scholarship_programs_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_channel_metadata"
    ADD CONSTRAINT "stream_channel_metadata_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."stream_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_channel_metadata"
    ADD CONSTRAINT "stream_channel_metadata_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stream_channels"
    ADD CONSTRAINT "stream_channels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_channels"
    ADD CONSTRAINT "stream_channels_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_channels"
    ADD CONSTRAINT "stream_channels_user_id_1_fkey" FOREIGN KEY ("user_id_1") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_channels"
    ADD CONSTRAINT "stream_channels_user_id_2_fkey" FOREIGN KEY ("user_id_2") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_connect_transactions"
    ADD CONSTRAINT "stripe_connect_transactions_ticket_order_id_fkey" FOREIGN KEY ("ticket_order_id") REFERENCES "public"."ticket_orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_access_links"
    ADD CONSTRAINT "ticket_access_links_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ticket_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_holds"
    ADD CONSTRAINT "ticket_holds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ticket_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_holds"
    ADD CONSTRAINT "ticket_holds_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_holds"
    ADD CONSTRAINT "ticket_holds_ticketed_event_id_fkey" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."ticketed_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_order_items"
    ADD CONSTRAINT "ticket_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ticket_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_order_items"
    ADD CONSTRAINT "ticket_order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_purchaser_user_id_fkey" FOREIGN KEY ("purchaser_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_ticketed_event_id_fkey" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."ticketed_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_scanner_user_id_fkey" FOREIGN KEY ("scanner_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_ticketed_event_id_fkey" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."ticketed_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_staff_links"
    ADD CONSTRAINT "ticket_staff_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_staff_links"
    ADD CONSTRAINT "ticket_staff_links_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_staff_links"
    ADD CONSTRAINT "ticket_staff_links_ticketed_event_id_fkey" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."ticketed_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_ticketed_event_id_fkey" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."ticketed_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticketed_events"
    ADD CONSTRAINT "ticketed_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticketed_events"
    ADD CONSTRAINT "ticketed_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticketed_events"
    ADD CONSTRAINT "ticketed_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ticket_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ticketed_event_id_fkey" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."ticketed_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tier_feature_assignments"
    ADD CONSTRAINT "tier_feature_assignments_feature_entitlement_id_fkey" FOREIGN KEY ("feature_entitlement_id") REFERENCES "public"."feature_entitlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tier_feature_assignments"
    ADD CONSTRAINT "tier_feature_assignments_license_tier_id_fkey" FOREIGN KEY ("license_tier_id") REFERENCES "public"."license_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_plan_contacts"
    ADD CONSTRAINT "travel_plan_contacts_travel_plan_id_fkey" FOREIGN KEY ("travel_plan_id") REFERENCES "public"."travel_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_plans"
    ADD CONSTRAINT "travel_plans_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_plans"
    ADD CONSTRAINT "travel_plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_registration_documents"
    ADD CONSTRAINT "tryout_registration_documents_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tryout_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_registration_documents"
    ADD CONSTRAINT "tryout_registration_documents_required_document_id_fkey" FOREIGN KEY ("required_document_id") REFERENCES "public"."tryout_required_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_registration_documents"
    ADD CONSTRAINT "tryout_registration_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tryout_registration_staff_notes"
    ADD CONSTRAINT "tryout_registration_staff_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_registration_staff_notes"
    ADD CONSTRAINT "tryout_registration_staff_notes_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tryout_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_registrations"
    ADD CONSTRAINT "tryout_registrations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_registrations"
    ADD CONSTRAINT "tryout_registrations_tryout_id_fkey" FOREIGN KEY ("tryout_id") REFERENCES "public"."tryouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_required_documents"
    ADD CONSTRAINT "tryout_required_documents_tryout_id_fkey" FOREIGN KEY ("tryout_id") REFERENCES "public"."tryouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_scores"
    ADD CONSTRAINT "tryout_scores_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryout_scores"
    ADD CONSTRAINT "tryout_scores_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tryout_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tryouts"
    ADD CONSTRAINT "tryouts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_kit_items"
    ADD CONSTRAINT "uniform_kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."uniform_kits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_kits"
    ADD CONSTRAINT "uniform_kits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."uniform_kits"
    ADD CONSTRAINT "uniform_kits_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_kits"
    ADD CONSTRAINT "uniform_kits_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_orders"
    ADD CONSTRAINT "uniform_orders_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_orders"
    ADD CONSTRAINT "uniform_orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_submission_items"
    ADD CONSTRAINT "uniform_submission_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."uniform_kit_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_submission_items"
    ADD CONSTRAINT "uniform_submission_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."uniform_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uniform_submissions"
    ADD CONSTRAINT "uniform_submissions_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."uniform_kits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."uniform_kits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_nearby_amenities_summaries"
    ADD CONSTRAINT "venue_nearby_amenities_summaries_venue_nearby_places_id_fkey" FOREIGN KEY ("venue_nearby_places_id") REFERENCES "public"."venue_nearby_places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_athlete_links"
    ADD CONSTRAINT "video_athlete_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_athlete_links"
    ADD CONSTRAINT "video_athlete_links_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_bookmarks"
    ADD CONSTRAINT "video_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_bookmarks"
    ADD CONSTRAINT "video_bookmarks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."video_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_note_targets"
    ADD CONSTRAINT "video_note_targets_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."video_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_notes"
    ADD CONSTRAINT "video_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_notes"
    ADD CONSTRAINT "video_notes_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_reviews"
    ADD CONSTRAINT "video_reviews_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_reviews"
    ADD CONSTRAINT "video_reviews_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tag_links"
    ADD CONSTRAINT "video_tag_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_tag_links"
    ADD CONSTRAINT "video_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."video_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tag_links"
    ADD CONSTRAINT "video_tag_links_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."waivers"
    ADD CONSTRAINT "waivers_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waivers"
    ADD CONSTRAINT "waivers_fee_assignment_id_fkey" FOREIGN KEY ("fee_assignment_id") REFERENCES "public"."fee_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waivers"
    ADD CONSTRAINT "waivers_organization_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage org users" ON "public"."users" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"public"."user_role") AND ("u"."org_id" = "users"."org_id")))));



CREATE POLICY "Admins can view org users" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"public"."user_role") AND ("u"."org_id" = "users"."org_id")))));



CREATE POLICY "Allow user signup insert" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Coaches can view org users" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'coach'::"public"."user_role") AND ("u"."org_id" = "users"."org_id")))));



CREATE POLICY "Coaches can view team ticketed events" ON "public"."ticketed_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'coach'::"public"."user_role") AND ("users"."org_id" = "ticketed_events"."org_id")))));



CREATE POLICY "Enable read access for all users" ON "public"."athletes" FOR SELECT USING (true);



CREATE POLICY "Org admins can manage their org's staff links" ON "public"."ticket_staff_links" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."org_id" = "ticket_staff_links"."org_id") AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Org admins can read their org's connect transactions" ON "public"."stripe_connect_transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."ticket_orders" "tord"
     JOIN "public"."organization_members" "om" ON (("om"."org_id" = "tord"."org_id")))
  WHERE (("tord"."id" = "stripe_connect_transactions"."ticket_order_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'org_admin'::"public"."org_member_role")))));



CREATE POLICY "Org admins can view their org's ticket orders" ON "public"."ticket_orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."org_id" = "ticket_orders"."org_id") AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Org admins can view their org's ticket scans" ON "public"."ticket_scans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."org_id" = "ticket_scans"."org_id") AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Org admins can view their org's ticketed events" ON "public"."ticketed_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."org_id" = "ticketed_events"."org_id") AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Org admins can view their org's tickets" ON "public"."tickets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."org_id" = "tickets"."org_id") AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Org staff can manage ticket staff links" ON "public"."ticket_staff_links" USING ("public"."is_platform_admin"("auth"."uid"())) WITH CHECK ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Platform admins can view webhook receipts" ON "public"."stripe_webhook_receipts" FOR SELECT USING ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Public can view published ticketed events" ON "public"."ticketed_events" FOR SELECT USING (("status" = 'published'::"public"."ticketed_event_status"));



CREATE POLICY "Purchasers can view their own ticket orders" ON "public"."ticket_orders" FOR SELECT USING ((("purchaser_user_id" = "auth"."uid"()) OR ("purchaser_email" = ( SELECT "users"."email"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Purchasers can view their own tickets" ON "public"."tickets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ticket_orders" "ord"
  WHERE (("ord"."id" = "tickets"."order_id") AND (("ord"."purchaser_user_id" = "auth"."uid"()) OR ("ord"."purchaser_email" = ( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



CREATE POLICY "Scanner users can view their own scans" ON "public"."ticket_scans" FOR SELECT USING ((("scanner_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."org_id" = "ticket_scans"."org_id") AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'coach'::"public"."user_role"])))))));



CREATE POLICY "Service role full access to stripe_connect_transactions" ON "public"."stripe_connect_transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create families during signup" ON "public"."families" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view order items for visible orders" ON "public"."ticket_order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ticket_orders" "ord"
  WHERE ("ord"."id" = "ticket_order_items"."order_id"))));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view ticket types for visible events" ON "public"."ticket_types" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ticketed_events" "te"
  WHERE ("te"."id" = "ticket_types"."ticketed_event_id"))));



ALTER TABLE "public"."_index_backup" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_index_backup__platform_admin_all" ON "public"."_index_backup" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."_policy_consolidation_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_policy_consolidation_log__platform_admin_all" ON "public"."_policy_consolidation_log" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."_rls_policy_backup" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_rls_policy_backup__platform_admin_all" ON "public"."_rls_policy_backup" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."_rls_validation_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_rls_validation_results__platform_admin_all" ON "public"."_rls_validation_results" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements__delete" ON "public"."announcements" FOR DELETE TO "authenticated" USING (("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id") OR "public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "announcements__org_insert" ON "public"."announcements" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "announcements__org_select" ON "public"."announcements" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "announcements__org_update" ON "public"."announcements" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



ALTER TABLE "public"."athlete_guardians" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athlete_guardians__athlete_guardian_read" ON "public"."athlete_guardians" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "athlete_guardians__delete" ON "public"."athlete_guardians" FOR DELETE TO "authenticated" USING (("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id") OR "public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "athlete_guardians__org_insert" ON "public"."athlete_guardians" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_guardians__org_select" ON "public"."athlete_guardians" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_guardians__org_update" ON "public"."athlete_guardians" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



ALTER TABLE "public"."athlete_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athlete_imports__org_delete" ON "public"."athlete_imports" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_imports__org_insert" ON "public"."athlete_imports" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_imports__org_select" ON "public"."athlete_imports" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_imports__org_update" ON "public"."athlete_imports" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_imports__platform_admin_all" ON "public"."athlete_imports" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."athlete_medical_private" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athlete_medical_private_delete_policy" ON "public"."athlete_medical_private" FOR DELETE USING ("public"."is_org_admin"("org_id", "auth"."uid"()));



CREATE POLICY "athlete_medical_private_insert_policy" ON "public"."athlete_medical_private" FOR INSERT WITH CHECK ((("public"."is_parent_of_athlete"("athlete_id", "auth"."uid"()) OR "public"."is_org_admin"("org_id", "auth"."uid"())) AND ("org_id" = ( SELECT "athlete_medical_private"."org_id"
   FROM "public"."athletes"
  WHERE ("athletes"."id" = "athlete_medical_private"."athlete_id")))));



CREATE POLICY "athlete_medical_private_select_policy" ON "public"."athlete_medical_private" FOR SELECT USING (("public"."is_org_admin"("org_id", "auth"."uid"()) OR "public"."is_parent_of_athlete"("athlete_id", "auth"."uid"()) OR "public"."coach_has_medical_access"("athlete_id", "auth"."uid"())));



CREATE POLICY "athlete_medical_private_update_policy" ON "public"."athlete_medical_private" FOR UPDATE USING (("public"."is_parent_of_athlete"("athlete_id", "auth"."uid"()) OR "public"."is_org_admin"("org_id", "auth"."uid"()))) WITH CHECK ((("public"."is_parent_of_athlete"("athlete_id", "auth"."uid"()) OR "public"."is_org_admin"("org_id", "auth"."uid"())) AND ("org_id" = ( SELECT "athlete_medical_private"."org_id"
   FROM "public"."athletes"
  WHERE ("athletes"."id" = "athlete_medical_private"."athlete_id")))));



ALTER TABLE "public"."athlete_sport_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athlete_sport_profiles_delete_policy" ON "public"."athlete_sport_profiles" FOR DELETE USING ("public"."is_org_admin"("org_id", "auth"."uid"()));



CREATE POLICY "athlete_sport_profiles_insert_policy" ON "public"."athlete_sport_profiles" FOR INSERT WITH CHECK (("public"."can_edit_athlete"("athlete_id", "auth"."uid"()) AND ("org_id" = ( SELECT "athlete_sport_profiles"."org_id"
   FROM "public"."athletes"
  WHERE ("athletes"."id" = "athlete_sport_profiles"."athlete_id")))));



CREATE POLICY "athlete_sport_profiles_select_policy" ON "public"."athlete_sport_profiles" FOR SELECT USING ("public"."can_view_athlete"("athlete_id", "auth"."uid"()));



CREATE POLICY "athlete_sport_profiles_update_policy" ON "public"."athlete_sport_profiles" FOR UPDATE USING ("public"."can_edit_athlete"("athlete_id", "auth"."uid"())) WITH CHECK (("public"."can_edit_athlete"("athlete_id", "auth"."uid"()) AND ("org_id" = ( SELECT "athlete_sport_profiles"."org_id"
   FROM "public"."athletes"
  WHERE ("athletes"."id" = "athlete_sport_profiles"."athlete_id")))));



ALTER TABLE "public"."athlete_sports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athlete_sports__athlete_guardian_read" ON "public"."athlete_sports" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "athlete_sports__org_delete" ON "public"."athlete_sports" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_sports__org_insert" ON "public"."athlete_sports" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_sports__org_select" ON "public"."athlete_sports" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_sports__org_update" ON "public"."athlete_sports" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "athlete_sports__platform_admin_all" ON "public"."athlete_sports" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "athlete_sports_delete_policy" ON "public"."athlete_sports" FOR DELETE USING ("public"."can_edit_athlete"("athlete_id", "auth"."uid"()));



CREATE POLICY "athlete_sports_insert_policy" ON "public"."athlete_sports" FOR INSERT WITH CHECK ("public"."can_edit_athlete"("athlete_id", "auth"."uid"()));



CREATE POLICY "athlete_sports_select_policy" ON "public"."athlete_sports" FOR SELECT USING ("public"."can_view_athlete"("athlete_id", "auth"."uid"()));



CREATE POLICY "athlete_sports_update_policy" ON "public"."athlete_sports" FOR UPDATE USING ("public"."can_edit_athlete"("athlete_id", "auth"."uid"()));



ALTER TABLE "public"."athletes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athletes__guardian_select" ON "public"."athletes" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "id"));



CREATE POLICY "athletes__platform_admin_all" ON "public"."athletes" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "athletes_select_policy" ON "public"."athletes" FOR SELECT USING ("public"."athlete_is_visible_to_user"(( SELECT "auth"."uid"() AS "uid"), "id"));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance__athlete_guardian_read" ON "public"."attendance" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "attendance__platform_admin_all" ON "public"."attendance" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."attendance_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_settings__org_delete" ON "public"."attendance_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "attendance_settings__org_insert" ON "public"."attendance_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "attendance_settings__org_select" ON "public"."attendance_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "attendance_settings__org_update" ON "public"."attendance_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "attendance_settings__platform_admin_all" ON "public"."attendance_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."audit_logs_old" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_old__platform_admin_all" ON "public"."audit_logs_old" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_events__org_delete" ON "public"."billing_events" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "billing_events__org_insert" ON "public"."billing_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "billing_events__org_select" ON "public"."billing_events" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "billing_events__org_update" ON "public"."billing_events" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "billing_events__platform_admin_all" ON "public"."billing_events" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."charges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "charges__org_delete" ON "public"."charges" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "charges__org_insert" ON "public"."charges" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "charges__org_select" ON "public"."charges" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "charges__org_update" ON "public"."charges" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "charges__platform_admin_all" ON "public"."charges" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."checkout_session_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkout_session_items__platform_admin_all" ON "public"."checkout_session_items" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."checkout_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkout_sessions__org_delete" ON "public"."checkout_sessions" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "checkout_sessions__org_insert" ON "public"."checkout_sessions" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "checkout_sessions__org_select" ON "public"."checkout_sessions" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "checkout_sessions__org_update" ON "public"."checkout_sessions" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "checkout_sessions__platform_admin_all" ON "public"."checkout_sessions" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."child_claim_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_claim_tokens__athlete_guardian_read" ON "public"."child_claim_tokens" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "child_claim_tokens__org_delete" ON "public"."child_claim_tokens" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "child_claim_tokens__org_insert" ON "public"."child_claim_tokens" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "child_claim_tokens__org_select" ON "public"."child_claim_tokens" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "child_claim_tokens__org_update" ON "public"."child_claim_tokens" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "child_claim_tokens__platform_admin_all" ON "public"."child_claim_tokens" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."children" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discount_codes__org_delete" ON "public"."discount_codes" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "discount_codes__org_insert" ON "public"."discount_codes" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "discount_codes__org_select" ON "public"."discount_codes" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "discount_codes__org_update" ON "public"."discount_codes" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "discount_codes__platform_admin_all" ON "public"."discount_codes" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."discount_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discount_redemptions__platform_admin_all" ON "public"."discount_redemptions" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."discovery_errors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discovery_errors__platform_admin_all" ON "public"."discovery_errors" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."entitlement_overrides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entitlement_overrides__platform_admin_all" ON "public"."entitlement_overrides" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."event_attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_attendance__child_guardian_read" ON "public"."event_attendance" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "child_id"));



CREATE POLICY "event_attendance__platform_admin_all" ON "public"."event_attendance" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."event_change_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_change_history__platform_admin_all" ON "public"."event_change_history" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."event_general_rsvps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_general_rsvps__platform_admin_all" ON "public"."event_general_rsvps" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "event_general_rsvps__user_owner" ON "public"."event_general_rsvps" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."event_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_locations__athlete_read" ON "public"."event_locations" TO "authenticated" USING (("public"."is_platform_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."team_memberships" "tm" ON (("tm"."team_id" = "e"."team_id")))
  WHERE (("e"."id" = "event_locations"."event_id") AND ("tm"."athlete_id" = "auth"."uid"()))))));



COMMENT ON POLICY "event_locations__athlete_read" ON "public"."event_locations" IS 'Athletes can read event locations for their teams events';



CREATE POLICY "event_locations__parent_read" ON "public"."event_locations" TO "authenticated" USING (("public"."is_platform_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM (("public"."events" "e"
     JOIN "public"."team_memberships" "tm" ON (("tm"."team_id" = "e"."team_id")))
     JOIN "public"."athlete_guardians" "ag" ON (("ag"."athlete_id" = "tm"."athlete_id")))
  WHERE (("e"."id" = "event_locations"."event_id") AND ("ag"."user_id" = "auth"."uid"()) AND ("ag"."status" = 'active'::"public"."athlete_guardian_status"))))));



COMMENT ON POLICY "event_locations__parent_read" ON "public"."event_locations" IS 'Parents/guardians can read event locations for their childrens teams events';



CREATE POLICY "event_locations__platform_admin_all" ON "public"."event_locations" TO "authenticated" USING ("public"."is_platform_admin"("auth"."uid"())) WITH CHECK ("public"."is_platform_admin"("auth"."uid"()));



COMMENT ON POLICY "event_locations__platform_admin_all" ON "public"."event_locations" IS 'Platform admins have full access to all event locations';



CREATE POLICY "event_locations__read_with_event" ON "public"."event_locations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE ("e"."id" = "event_locations"."event_id"))));



COMMENT ON POLICY "event_locations__read_with_event" ON "public"."event_locations" IS 'Anyone who can read the event can read its location (event RLS handles access control)';



CREATE POLICY "event_locations__staff_all" ON "public"."event_locations" TO "authenticated" USING (("public"."is_platform_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."teams" "t" ON (("t"."id" = "e"."team_id")))
  WHERE (("e"."id" = "event_locations"."event_id") AND "public"."staff_can_access_team"("auth"."uid"(), "t"."id")))))) WITH CHECK (("public"."is_platform_admin"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."teams" "t" ON (("t"."id" = "e"."team_id")))
  WHERE (("e"."id" = "event_locations"."event_id") AND "public"."staff_can_access_team"("auth"."uid"(), "t"."id"))))));



COMMENT ON POLICY "event_locations__staff_all" ON "public"."event_locations" IS 'Staff (org_admins/coaches) have full access to event locations for their teams';



ALTER TABLE "public"."event_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_logs__org_delete" ON "public"."event_logs" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs__org_insert" ON "public"."event_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs__org_select" ON "public"."event_logs" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs__org_update" ON "public"."event_logs" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs__platform_admin_all" ON "public"."event_logs" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."event_logs_archive" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_logs_archive__org_delete" ON "public"."event_logs_archive" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs_archive__org_insert" ON "public"."event_logs_archive" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs_archive__org_select" ON "public"."event_logs_archive" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs_archive__org_update" ON "public"."event_logs_archive" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "event_logs_archive__platform_admin_all" ON "public"."event_logs_archive" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."event_rsvps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_rsvps__athlete_guardian_read" ON "public"."event_rsvps" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "event_rsvps__platform_admin_all" ON "public"."event_rsvps" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events__platform_admin_all" ON "public"."events" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "events__team_select" ON "public"."events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "events"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



CREATE POLICY "events_write_policy" ON "public"."events" USING (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "team_id"))) WITH CHECK (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "team_id")));



COMMENT ON POLICY "events_write_policy" ON "public"."events" IS 'Platform admins or staff (org admins/coaches) for the team can insert/update/delete events.';



ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "families__org_delete" ON "public"."families" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "families__org_insert" ON "public"."families" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "families__org_select" ON "public"."families" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "families__org_update" ON "public"."families" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "families__platform_admin_all" ON "public"."families" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."family_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "family_members__family_guardian_read" ON "public"."family_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."family_id" = "a"."family_id") AND "public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "a"."id")))));



CREATE POLICY "family_members__platform_admin_all" ON "public"."family_members" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "family_members__user_owner" ON "public"."family_members" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_dependency_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_dependency_cycles__platform_admin_all" ON "public"."feature_dependency_cycles" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_discovery_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_discovery_cache__platform_admin_all" ON "public"."feature_discovery_cache" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_discovery_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_discovery_corrections__platform_admin_all" ON "public"."feature_discovery_corrections" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_discovery_hints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_discovery_hints__platform_admin_all" ON "public"."feature_discovery_hints" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_entitlements__platform_admin_all" ON "public"."feature_entitlements" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_flag_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flag_audit_log__platform_admin_all" ON "public"."feature_flag_audit_log" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_flag_org_overrides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flag_org_overrides__org_delete" ON "public"."feature_flag_org_overrides" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flag_org_overrides__org_insert" ON "public"."feature_flag_org_overrides" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flag_org_overrides__org_select" ON "public"."feature_flag_org_overrides" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flag_org_overrides__org_update" ON "public"."feature_flag_org_overrides" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flag_org_overrides__platform_admin_all" ON "public"."feature_flag_org_overrides" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_flag_platform_defaults" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flag_platform_defaults__platform_admin_all" ON "public"."feature_flag_platform_defaults" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_flag_user_overrides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flag_user_overrides__platform_admin_all" ON "public"."feature_flag_user_overrides" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "feature_flag_user_overrides__user_owner" ON "public"."feature_flag_user_overrides" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flags__org_delete" ON "public"."feature_flags" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flags__org_insert" ON "public"."feature_flags" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flags__org_select" ON "public"."feature_flags" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flags__org_update" ON "public"."feature_flags" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "feature_flags__platform_admin_all" ON "public"."feature_flags" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_integration_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_integration_assignments__platform_admin_all" ON "public"."feature_integration_assignments" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_integrations__platform_admin_all" ON "public"."feature_integrations" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."fee_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fee_assignments__athlete_guardian_read" ON "public"."fee_assignments" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "fee_assignments__org_delete" ON "public"."fee_assignments" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fee_assignments__org_insert" ON "public"."fee_assignments" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fee_assignments__org_select" ON "public"."fee_assignments" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fee_assignments__org_update" ON "public"."fee_assignments" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fee_assignments__platform_admin_all" ON "public"."fee_assignments" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."fees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fees__org_delete" ON "public"."fees" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fees__org_insert" ON "public"."fees" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fees__org_select" ON "public"."fees" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fees__org_update" ON "public"."fees" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "fees__platform_admin_all" ON "public"."fees" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."galleries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "galleries_delete_policy" ON "public"."galleries" FOR DELETE USING ("public"."can_moderate_gallery"("id", "auth"."uid"()));



CREATE POLICY "galleries_insert_policy" ON "public"."galleries" FOR INSERT WITH CHECK (("public"."is_org_admin"("org_id", "auth"."uid"()) OR (("gallery_type" = 'team'::"public"."gallery_type") AND ("entity_id" IS NOT NULL) AND "public"."is_coach_for_team"("entity_id", "auth"."uid"()))));



CREATE POLICY "galleries_select_policy" ON "public"."galleries" FOR SELECT USING ("public"."can_view_gallery"("id", "auth"."uid"()));



CREATE POLICY "galleries_update_policy" ON "public"."galleries" FOR UPDATE USING ("public"."can_moderate_gallery"("id", "auth"."uid"())) WITH CHECK ("public"."can_moderate_gallery"("id", "auth"."uid"()));



ALTER TABLE "public"."gallery_albums" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gallery_albums_delete_policy" ON "public"."gallery_albums" FOR DELETE USING ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()));



CREATE POLICY "gallery_albums_insert_policy" ON "public"."gallery_albums" FOR INSERT WITH CHECK ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()));



CREATE POLICY "gallery_albums_select_policy" ON "public"."gallery_albums" FOR SELECT USING ("public"."can_view_gallery"("gallery_id", "auth"."uid"()));



CREATE POLICY "gallery_albums_update_policy" ON "public"."gallery_albums" FOR UPDATE USING ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"())) WITH CHECK ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()));



ALTER TABLE "public"."gallery_downloads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gallery_downloads_insert_policy" ON "public"."gallery_downloads" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."gallery_photos" "gp"
  WHERE (("gp"."id" = "gallery_downloads"."photo_id") AND "public"."can_view_gallery"("gp"."gallery_id", "auth"."uid"()) AND ("gp"."status" = 'approved'::"public"."photo_status"))))));



CREATE POLICY "gallery_downloads_select_policy" ON "public"."gallery_downloads" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."gallery_photos" "gp"
  WHERE (("gp"."id" = "gallery_downloads"."photo_id") AND "public"."can_moderate_gallery"("gp"."gallery_id", "auth"."uid"()))))));



ALTER TABLE "public"."gallery_photo_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gallery_photo_tags_delete_policy" ON "public"."gallery_photo_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."gallery_photos" "gp"
  WHERE (("gp"."id" = "gallery_photo_tags"."photo_id") AND "public"."can_moderate_gallery"("gp"."gallery_id", "auth"."uid"())))));



CREATE POLICY "gallery_photo_tags_insert_policy" ON "public"."gallery_photo_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."gallery_photos" "gp"
  WHERE (("gp"."id" = "gallery_photo_tags"."photo_id") AND "public"."can_moderate_gallery"("gp"."gallery_id", "auth"."uid"())))));



CREATE POLICY "gallery_photo_tags_select_policy" ON "public"."gallery_photo_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."gallery_photos" "gp"
  WHERE (("gp"."id" = "gallery_photo_tags"."photo_id") AND "public"."can_view_gallery"("gp"."gallery_id", "auth"."uid"())))));



ALTER TABLE "public"."gallery_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gallery_photos_delete_policy" ON "public"."gallery_photos" FOR DELETE USING (("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()) OR ("uploaded_by_user_id" = "auth"."uid"())));



CREATE POLICY "gallery_photos_insert_policy" ON "public"."gallery_photos" FOR INSERT WITH CHECK ("public"."can_upload_to_gallery"("gallery_id", "auth"."uid"()));



CREATE POLICY "gallery_photos_select_policy" ON "public"."gallery_photos" FOR SELECT USING (("public"."can_view_gallery"("gallery_id", "auth"."uid"()) AND (("status" = 'approved'::"public"."photo_status") OR ("uploaded_by_user_id" = "auth"."uid"()) OR "public"."can_moderate_gallery"("gallery_id", "auth"."uid"()))));



CREATE POLICY "gallery_photos_update_policy" ON "public"."gallery_photos" FOR UPDATE USING (("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()) OR (("uploaded_by_user_id" = "auth"."uid"()) AND ("status" = 'pending'::"public"."photo_status")))) WITH CHECK (("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()) OR (("uploaded_by_user_id" = "auth"."uid"()) AND ("status" = 'pending'::"public"."photo_status"))));



ALTER TABLE "public"."gallery_share_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gallery_share_links_delete_policy" ON "public"."gallery_share_links" FOR DELETE USING ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()));



CREATE POLICY "gallery_share_links_insert_policy" ON "public"."gallery_share_links" FOR INSERT WITH CHECK ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()));



CREATE POLICY "gallery_share_links_select_policy" ON "public"."gallery_share_links" FOR SELECT USING ("public"."can_moderate_gallery"("gallery_id", "auth"."uid"()));



ALTER TABLE "public"."guardian_attachment_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guardian_attachment_requests__athlete_guardian_read" ON "public"."guardian_attachment_requests" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "guardian_attachment_requests__org_delete" ON "public"."guardian_attachment_requests" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "guardian_attachment_requests__org_insert" ON "public"."guardian_attachment_requests" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "guardian_attachment_requests__org_select" ON "public"."guardian_attachment_requests" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "guardian_attachment_requests__org_update" ON "public"."guardian_attachment_requests" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "guardian_attachment_requests__platform_admin_all" ON "public"."guardian_attachment_requests" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."huddle_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "huddle_audit_log__platform_admin_all" ON "public"."huddle_audit_log" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "huddle_audit_log__user_owner" ON "public"."huddle_audit_log" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."huddle_notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "huddle_notification_preferences__platform_admin_all" ON "public"."huddle_notification_preferences" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "huddle_notification_preferences__user_owner" ON "public"."huddle_notification_preferences" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."huddle_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "huddle_reports__platform_admin_all" ON "public"."huddle_reports" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."installment_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "installment_plans__org_delete" ON "public"."installment_plans" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "installment_plans__org_insert" ON "public"."installment_plans" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "installment_plans__org_select" ON "public"."installment_plans" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "installment_plans__org_update" ON "public"."installment_plans" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "installment_plans__platform_admin_all" ON "public"."installment_plans" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."installment_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "installment_schedules__platform_admin_all" ON "public"."installment_schedules" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."installments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "installments__platform_admin_all" ON "public"."installments" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."join_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "join_links__org_delete" ON "public"."join_links" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_links__org_insert" ON "public"."join_links" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_links__org_select" ON "public"."join_links" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_links__org_update" ON "public"."join_links" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_links__platform_admin_all" ON "public"."join_links" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."join_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "join_requests__athlete_guardian_read" ON "public"."join_requests" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "join_requests__org_delete" ON "public"."join_requests" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_requests__org_insert" ON "public"."join_requests" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_requests__org_select" ON "public"."join_requests" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_requests__org_update" ON "public"."join_requests" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "join_requests__platform_admin_all" ON "public"."join_requests" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "levels__org_delete" ON "public"."levels" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "levels__org_insert" ON "public"."levels" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "levels__org_select" ON "public"."levels" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "levels__org_update" ON "public"."levels" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "levels__platform_admin_all" ON "public"."levels" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."license_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "license_tiers__platform_admin_all" ON "public"."license_tiers" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."messages_archive" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_archive__platform_admin_all" ON "public"."messages_archive" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "messages_archive__team_select" ON "public"."messages_archive" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "messages_archive"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



ALTER TABLE "public"."migration_errors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "migration_errors__platform_admin_all" ON "public"."migration_errors" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notification_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_jobs__org_delete" ON "public"."notification_jobs" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "notification_jobs__org_insert" ON "public"."notification_jobs" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "notification_jobs__org_select" ON "public"."notification_jobs" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "notification_jobs__org_update" ON "public"."notification_jobs" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "notification_jobs__platform_admin_all" ON "public"."notification_jobs" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notification_jobs__user_owner" ON "public"."notification_jobs" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."offline_payment_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offline_payment_allocations__platform_admin_all" ON "public"."offline_payment_allocations" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."offline_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offline_payments__child_guardian_read" ON "public"."offline_payments" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "child_id"));



CREATE POLICY "offline_payments__org_delete" ON "public"."offline_payments" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "offline_payments__org_insert" ON "public"."offline_payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "offline_payments__org_select" ON "public"."offline_payments" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "offline_payments__org_update" ON "public"."offline_payments" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "offline_payments__platform_admin_all" ON "public"."offline_payments" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "org_admin_all" ON "public"."organizations" TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "id"));



ALTER TABLE "public"."org_licenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_licenses__org_delete" ON "public"."org_licenses" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_licenses__org_insert" ON "public"."org_licenses" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_licenses__org_select" ON "public"."org_licenses" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_licenses__org_update" ON "public"."org_licenses" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_licenses__platform_admin_all" ON "public"."org_licenses" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."org_payment_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_payment_policies__org_delete" ON "public"."org_payment_policies" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_payment_policies__org_insert" ON "public"."org_payment_policies" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_payment_policies__org_select" ON "public"."org_payment_policies" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_payment_policies__org_update" ON "public"."org_payment_policies" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "org_payment_policies__platform_admin_all" ON "public"."org_payment_policies" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."org_sport_profile_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_sport_profile_settings_delete_policy" ON "public"."org_sport_profile_settings" FOR DELETE USING ("public"."is_org_admin"("org_id", "auth"."uid"()));



CREATE POLICY "org_sport_profile_settings_insert_policy" ON "public"."org_sport_profile_settings" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id", "auth"."uid"()));



CREATE POLICY "org_sport_profile_settings_select_policy" ON "public"."org_sport_profile_settings" FOR SELECT USING ("public"."is_org_member"("org_id", "auth"."uid"()));



CREATE POLICY "org_sport_profile_settings_update_policy" ON "public"."org_sport_profile_settings" FOR UPDATE USING ("public"."is_org_admin"("org_id", "auth"."uid"())) WITH CHECK ("public"."is_org_admin"("org_id", "auth"."uid"()));



ALTER TABLE "public"."org_storage_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_storage_usage_select_policy" ON "public"."org_storage_usage" FOR SELECT USING ("public"."is_org_admin"("org_id", "auth"."uid"()));



CREATE POLICY "org_storage_usage_update_policy" ON "public"."org_storage_usage" FOR UPDATE USING ("public"."is_org_admin"("org_id", "auth"."uid"())) WITH CHECK ("public"."is_org_admin"("org_id", "auth"."uid"()));



ALTER TABLE "public"."organization_advanced_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_advanced_settings__org_delete" ON "public"."organization_advanced_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_advanced_settings__org_insert" ON "public"."organization_advanced_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_advanced_settings__org_select" ON "public"."organization_advanced_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_advanced_settings__org_update" ON "public"."organization_advanced_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_advanced_settings__platform_admin_all" ON "public"."organization_advanced_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_attendance_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_attendance_settings__org_delete" ON "public"."organization_attendance_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_attendance_settings__org_insert" ON "public"."organization_attendance_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_attendance_settings__org_select" ON "public"."organization_attendance_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_attendance_settings__org_update" ON "public"."organization_attendance_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_attendance_settings__platform_admin_all" ON "public"."organization_attendance_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_contacts__org_delete" ON "public"."organization_contacts" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_contacts__org_insert" ON "public"."organization_contacts" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_contacts__org_select" ON "public"."organization_contacts" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_contacts__org_update" ON "public"."organization_contacts" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_contacts__platform_admin_all" ON "public"."organization_contacts" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_defaults" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_defaults__org_delete" ON "public"."organization_defaults" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_defaults__org_insert" ON "public"."organization_defaults" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_defaults__org_select" ON "public"."organization_defaults" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_defaults__org_update" ON "public"."organization_defaults" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_defaults__platform_admin_all" ON "public"."organization_defaults" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_invites__org_delete" ON "public"."organization_invites" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_invites__org_insert" ON "public"."organization_invites" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_invites__org_select" ON "public"."organization_invites" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_invites__org_update" ON "public"."organization_invites" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_invites__platform_admin_all" ON "public"."organization_invites" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members__org_delete" ON "public"."organization_members" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_members__org_insert" ON "public"."organization_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_members__org_select" ON "public"."organization_members" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_members__org_update" ON "public"."organization_members" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_members__platform_admin_all" ON "public"."organization_members" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "organization_members__user_owner" ON "public"."organization_members" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_notification_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_notification_settings__org_delete" ON "public"."organization_notification_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_notification_settings__org_insert" ON "public"."organization_notification_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_notification_settings__org_select" ON "public"."organization_notification_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_notification_settings__org_update" ON "public"."organization_notification_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_notification_settings__platform_admin_all" ON "public"."organization_notification_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_registration_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_registration_settings__org_delete" ON "public"."organization_registration_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_registration_settings__org_insert" ON "public"."organization_registration_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_registration_settings__org_select" ON "public"."organization_registration_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_registration_settings__org_update" ON "public"."organization_registration_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_registration_settings__platform_admin_all" ON "public"."organization_registration_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_settings__org_delete" ON "public"."organization_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_settings__org_insert" ON "public"."organization_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_settings__org_select" ON "public"."organization_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_settings__org_update" ON "public"."organization_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_settings__platform_admin_all" ON "public"."organization_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_sport_customizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_sport_customizations__org_delete" ON "public"."organization_sport_customizations" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sport_customizations__org_insert" ON "public"."organization_sport_customizations" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sport_customizations__org_select" ON "public"."organization_sport_customizations" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sport_customizations__org_update" ON "public"."organization_sport_customizations" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sport_customizations__platform_admin_all" ON "public"."organization_sport_customizations" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_sports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_sports__org_delete" ON "public"."organization_sports" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sports__org_insert" ON "public"."organization_sports" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sports__org_select" ON "public"."organization_sports" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sports__org_update" ON "public"."organization_sports" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_sports__platform_admin_all" ON "public"."organization_sports" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_travel_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_travel_contacts__org_delete" ON "public"."organization_travel_contacts" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_travel_contacts__org_insert" ON "public"."organization_travel_contacts" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_travel_contacts__org_select" ON "public"."organization_travel_contacts" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_travel_contacts__org_update" ON "public"."organization_travel_contacts" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_travel_contacts__platform_admin_all" ON "public"."organization_travel_contacts" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_visibility_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_visibility_settings__org_delete" ON "public"."organization_visibility_settings" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_visibility_settings__org_insert" ON "public"."organization_visibility_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_visibility_settings__org_select" ON "public"."organization_visibility_settings" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_visibility_settings__org_update" ON "public"."organization_visibility_settings" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "organization_visibility_settings__platform_admin_all" ON "public"."organization_visibility_settings" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations__platform_admin_all" ON "public"."organizations" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."parent_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_invites__athlete_guardian_read" ON "public"."parent_invites" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "parent_invites__org_delete" ON "public"."parent_invites" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "parent_invites__org_insert" ON "public"."parent_invites" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "parent_invites__org_select" ON "public"."parent_invites" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "parent_invites__org_update" ON "public"."parent_invites" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "parent_invites__platform_admin_all" ON "public"."parent_invites" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payment_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_allocations__platform_admin_all" ON "public"."payment_allocations" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payment_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_events__org_delete" ON "public"."payment_events" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payment_events__org_insert" ON "public"."payment_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payment_events__org_select" ON "public"."payment_events" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payment_events__org_update" ON "public"."payment_events" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payment_events__platform_admin_all" ON "public"."payment_events" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments__org_delete" ON "public"."payments" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payments__org_insert" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payments__org_select" ON "public"."payments" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payments__org_update" ON "public"."payments" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "payments__platform_admin_all" ON "public"."payments" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins__self_select" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "platform_admins__user_owner" ON "public"."platform_admins" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "programs__org_delete" ON "public"."programs" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "programs__org_insert" ON "public"."programs" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "programs__org_select" ON "public"."programs" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "programs__org_update" ON "public"."programs" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "programs__platform_admin_all" ON "public"."programs" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."recurring_event_instances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recurring_event_instances__platform_admin_all" ON "public"."recurring_event_instances" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."recurring_event_patterns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recurring_event_patterns__platform_admin_all" ON "public"."recurring_event_patterns" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "recurring_patterns_write_policy" ON "public"."recurring_event_patterns" USING (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."teams" "t" ON (("t"."id" = "e"."team_id")))
  WHERE (("e"."id" = "recurring_event_patterns"."parent_event_id") AND "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "t"."id")))))) WITH CHECK (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."teams" "t" ON (("t"."id" = "e"."team_id")))
  WHERE (("e"."id" = "recurring_event_patterns"."parent_event_id") AND "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "t"."id"))))));



COMMENT ON POLICY "recurring_patterns_write_policy" ON "public"."recurring_event_patterns" IS 'Platform admins or staff (org admins/coaches) of the parent event team may insert/update/delete recurring patterns.';



ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "refunds__org_delete" ON "public"."refunds" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "refunds__org_insert" ON "public"."refunds" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "refunds__org_select" ON "public"."refunds" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "refunds__org_update" ON "public"."refunds" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "refunds__platform_admin_all" ON "public"."refunds" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."scholarship_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scholarship_awards__platform_admin_all" ON "public"."scholarship_awards" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."scholarship_programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scholarship_programs__org_delete" ON "public"."scholarship_programs" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "scholarship_programs__org_insert" ON "public"."scholarship_programs" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "scholarship_programs__org_select" ON "public"."scholarship_programs" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "scholarship_programs__org_update" ON "public"."scholarship_programs" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "scholarship_programs__platform_admin_all" ON "public"."scholarship_programs" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons__platform_admin_all" ON "public"."seasons" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."sport_field_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sport_field_definitions_select_policy" ON "public"."sport_field_definitions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sports__org_delete" ON "public"."sports" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "sports__org_insert" ON "public"."sports" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "sports__org_update" ON "public"."sports" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "sports__platform_admin_all" ON "public"."sports" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "sports_authenticated_users_select" ON "public"."sports" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."stream_channel_metadata" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stream_channel_metadata__platform_admin_all" ON "public"."stream_channel_metadata" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."stream_channels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stream_channels__org_delete" ON "public"."stream_channels" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "stream_channels__org_insert" ON "public"."stream_channels" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "stream_channels__org_select" ON "public"."stream_channels" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "stream_channels__org_update" ON "public"."stream_channels" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "stream_channels__platform_admin_all" ON "public"."stream_channels" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."stripe_connect_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_memberships__athlete_guardian_read" ON "public"."team_memberships" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "team_memberships__platform_admin_all" ON "public"."team_memberships" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "team_memberships__team_select" ON "public"."team_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_memberships"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



ALTER TABLE "public"."team_seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_seasons__platform_admin_all" ON "public"."team_seasons" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "team_seasons__team_select" ON "public"."team_seasons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_seasons"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams__org_delete" ON "public"."teams" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "teams__org_insert" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "teams__org_select" ON "public"."teams" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "teams__org_update" ON "public"."teams" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "teams__platform_admin_all" ON "public"."teams" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."ticket_access_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_holds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_staff_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_types_write_policy" ON "public"."ticket_types" USING (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."ticketed_events" "te"
  WHERE (("te"."id" = "ticket_types"."ticketed_event_id") AND "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "te"."team_id")))))) WITH CHECK (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."ticketed_events" "te"
  WHERE (("te"."id" = "ticket_types"."ticketed_event_id") AND "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "te"."team_id"))))));



COMMENT ON POLICY "ticket_types_write_policy" ON "public"."ticket_types" IS 'Platform admins or staff (org admins/coaches) of the ticketed event team may insert/update/delete ticket types.';



ALTER TABLE "public"."ticketed_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticketed_events_write_policy" ON "public"."ticketed_events" USING (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "team_id"))) WITH CHECK (("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")) OR "public"."staff_can_access_team"(( SELECT "auth"."uid"() AS "uid"), "team_id")));



COMMENT ON POLICY "ticketed_events_write_policy" ON "public"."ticketed_events" IS 'Platform admins or staff (org admins/coaches) of the team may insert/update/delete ticketed_events.';



ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tier_feature_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tier_feature_assignments__platform_admin_all" ON "public"."tier_feature_assignments" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."travel_plan_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "travel_plan_contacts__platform_admin_all" ON "public"."travel_plan_contacts" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."travel_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "travel_plans__platform_admin_all" ON "public"."travel_plans" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "travel_plans__team_select" ON "public"."travel_plans" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "travel_plans"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



ALTER TABLE "public"."tryout_registration_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tryout_registration_documents__platform_admin_all" ON "public"."tryout_registration_documents" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."tryout_registration_staff_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tryout_registration_staff_notes__platform_admin_all" ON "public"."tryout_registration_staff_notes" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."tryout_registrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tryout_registrations__athlete_guardian_read" ON "public"."tryout_registrations" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "tryout_registrations__family_guardian_read" ON "public"."tryout_registrations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."family_id" = "a"."family_id") AND "public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "a"."id")))));



CREATE POLICY "tryout_registrations__platform_admin_all" ON "public"."tryout_registrations" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."tryout_required_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tryout_required_documents__platform_admin_all" ON "public"."tryout_required_documents" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."tryout_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tryout_scores__platform_admin_all" ON "public"."tryout_scores" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."tryouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tryouts__org_delete" ON "public"."tryouts" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "tryouts__org_insert" ON "public"."tryouts" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "tryouts__org_select" ON "public"."tryouts" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "tryouts__org_update" ON "public"."tryouts" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "tryouts__platform_admin_all" ON "public"."tryouts" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."uniform_kit_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uniform_kit_items__platform_admin_all" ON "public"."uniform_kit_items" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."uniform_kits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uniform_kits__platform_admin_all" ON "public"."uniform_kits" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "uniform_kits__team_select" ON "public"."uniform_kits" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "uniform_kits"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



ALTER TABLE "public"."uniform_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uniform_orders__athlete_guardian_read" ON "public"."uniform_orders" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "uniform_orders__platform_admin_all" ON "public"."uniform_orders" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "uniform_orders__team_select" ON "public"."uniform_orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "uniform_orders"."team_id") AND "public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "t"."org_id")))));



ALTER TABLE "public"."uniform_submission_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uniform_submission_items__platform_admin_all" ON "public"."uniform_submission_items" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."uniform_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uniform_submissions__athlete_guardian_read" ON "public"."uniform_submissions" FOR SELECT TO "authenticated" USING ("public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"));



CREATE POLICY "uniform_submissions__platform_admin_all" ON "public"."uniform_submissions" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_notifications__org_delete" ON "public"."user_notifications" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "user_notifications__org_insert" ON "public"."user_notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "user_notifications__org_select" ON "public"."user_notifications" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "user_notifications__org_update" ON "public"."user_notifications" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "user_notifications__platform_admin_all" ON "public"."user_notifications" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_notifications__user_owner" ON "public"."user_notifications" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users__family_guardian_read" ON "public"."users" FOR SELECT TO "authenticated" USING ((("family_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."family_id" = "users"."family_id") AND "public"."user_is_guardian_of_child"(( SELECT "auth"."uid"() AS "uid"), "a"."id"))))));



CREATE POLICY "users__org_delete" ON "public"."users" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "users__org_insert" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id") OR "public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "users__org_select" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "users__org_update" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "users__platform_admin_all" ON "public"."users" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users__self_select" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "users__self_update" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."valid_event_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "valid_event_types__platform_admin_all" ON "public"."valid_event_types" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."venue_insights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venue_insights__platform_admin_all" ON "public"."venue_insights" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."venue_nearby_amenities_summaries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venue_nearby_amenities_summaries__platform_admin_all" ON "public"."venue_nearby_amenities_summaries" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."venue_nearby_places" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venue_nearby_places__platform_admin_all" ON "public"."venue_nearby_places" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."video_athlete_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_athlete_links_delete_policy" ON "public"."video_athlete_links" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_athlete_links"."video_id") AND "public"."can_edit_video"("v"."id", "auth"."uid"())))));



CREATE POLICY "video_athlete_links_insert_policy" ON "public"."video_athlete_links" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_athlete_links"."video_id") AND "public"."can_edit_video"("v"."id", "auth"."uid"())))));



CREATE POLICY "video_athlete_links_select_policy" ON "public"."video_athlete_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_athlete_links"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"())))));



CREATE POLICY "video_athlete_links_update_policy" ON "public"."video_athlete_links" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_athlete_links"."video_id") AND "public"."can_edit_video"("v"."id", "auth"."uid"())))));



ALTER TABLE "public"."video_bookmarks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_bookmarks_delete_policy" ON "public"."video_bookmarks" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "video_bookmarks_insert_policy" ON "public"."video_bookmarks" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_bookmarks"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"()))))));



CREATE POLICY "video_bookmarks_select_policy" ON "public"."video_bookmarks" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("visibility" = 'shared'::"public"."video_bookmark_visibility") AND (EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_bookmarks"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"())))))));



CREATE POLICY "video_bookmarks_update_policy" ON "public"."video_bookmarks" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."video_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_comments_delete_policy" ON "public"."video_comments" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "video_comments_insert_policy" ON "public"."video_comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_comments"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"()))))));



CREATE POLICY "video_comments_select_policy" ON "public"."video_comments" FOR SELECT USING ((("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_comments"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"()))))));



CREATE POLICY "video_comments_update_policy" ON "public"."video_comments" FOR UPDATE USING ((("author_id" = "auth"."uid"()) AND ("deleted_at" IS NULL))) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."video_note_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_note_targets_delete_policy" ON "public"."video_note_targets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."video_notes" "vn"
  WHERE (("vn"."id" = "video_note_targets"."note_id") AND ("vn"."author_id" = "auth"."uid"())))));



CREATE POLICY "video_note_targets_insert_policy" ON "public"."video_note_targets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."video_notes" "vn"
  WHERE (("vn"."id" = "video_note_targets"."note_id") AND ("vn"."author_id" = "auth"."uid"())))));



CREATE POLICY "video_note_targets_select_policy" ON "public"."video_note_targets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."video_notes" "vn"
  WHERE (("vn"."id" = "video_note_targets"."note_id") AND ("vn"."deleted_at" IS NULL)))));



ALTER TABLE "public"."video_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_notes_delete_policy" ON "public"."video_notes" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "video_notes_insert_policy" ON "public"."video_notes" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."videos" "v"
     JOIN "public"."organization_members" "om" ON (("om"."org_id" = "v"."org_id")))
  WHERE (("v"."id" = "video_notes"."video_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['org_admin'::"public"."org_member_role", 'coach'::"public"."org_member_role"])))))));



CREATE POLICY "video_notes_select_policy" ON "public"."video_notes" FOR SELECT USING ((("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_notes"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"())))) AND (("author_id" = "auth"."uid"()) OR ("scope" = 'all'::"public"."video_note_scope") OR (("scope" = 'coaches'::"public"."video_note_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."videos" "v"
     JOIN "public"."organization_members" "om" ON (("om"."org_id" = "v"."org_id")))
  WHERE (("v"."id" = "video_notes"."video_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['org_admin'::"public"."org_member_role", 'coach'::"public"."org_member_role"])))))) OR (("scope" = 'guardians'::"public"."video_note_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."video_note_targets" "vnt"
     JOIN "public"."athlete_guardians" "ag" ON (("ag"."athlete_id" = "vnt"."athlete_id")))
  WHERE (("vnt"."note_id" = "video_notes"."id") AND ("ag"."user_id" = "auth"."uid"()) AND ("ag"."status" = 'active'::"public"."athlete_guardian_status"))))))));



CREATE POLICY "video_notes_update_policy" ON "public"."video_notes" FOR UPDATE USING ((("author_id" = "auth"."uid"()) AND ("deleted_at" IS NULL))) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."video_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_reviews_insert_policy" ON "public"."video_reviews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."videos" "v"
     JOIN "public"."organization_members" "om" ON (("om"."org_id" = "v"."org_id")))
  WHERE (("v"."id" = "video_reviews"."video_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['org_admin'::"public"."org_member_role", 'coach'::"public"."org_member_role"]))))));



CREATE POLICY "video_reviews_select_policy" ON "public"."video_reviews" FOR SELECT USING ((("guardian_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."videos" "v"
     JOIN "public"."organization_members" "om" ON (("om"."org_id" = "v"."org_id")))
  WHERE (("v"."id" = "video_reviews"."video_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['org_admin'::"public"."org_member_role", 'coach'::"public"."org_member_role"])))))));



CREATE POLICY "video_reviews_update_policy" ON "public"."video_reviews" FOR UPDATE USING (("guardian_id" = "auth"."uid"())) WITH CHECK (("guardian_id" = "auth"."uid"()));



ALTER TABLE "public"."video_tag_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_tag_links_delete_policy" ON "public"."video_tag_links" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_tag_links"."video_id") AND "public"."can_edit_video"("v"."id", "auth"."uid"())))));



CREATE POLICY "video_tag_links_insert_policy" ON "public"."video_tag_links" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_tag_links"."video_id") AND "public"."can_edit_video"("v"."id", "auth"."uid"())))));



CREATE POLICY "video_tag_links_select_policy" ON "public"."video_tag_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "video_tag_links"."video_id") AND ("v"."deleted_at" IS NULL) AND "public"."can_view_video"("v"."id", "auth"."uid"())))));



ALTER TABLE "public"."video_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_tags_delete_policy" ON "public"."video_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."org_id" = "video_tags"."org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'org_admin'::"public"."org_member_role")))));



CREATE POLICY "video_tags_insert_policy" ON "public"."video_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."org_id" = "om"."org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['org_admin'::"public"."org_member_role", 'coach'::"public"."org_member_role"]))))));



CREATE POLICY "video_tags_select_policy" ON "public"."video_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."org_id" = "video_tags"."org_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "video_tags_update_policy" ON "public"."video_tags" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."org_id" = "video_tags"."org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'org_admin'::"public"."org_member_role")))));



ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "videos_delete_policy" ON "public"."videos" FOR DELETE USING ("public"."can_edit_video"("id", "auth"."uid"()));



CREATE POLICY "videos_insert_policy" ON "public"."videos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."org_id" = "om"."org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['org_admin'::"public"."org_member_role", 'coach'::"public"."org_member_role"]))))));



CREATE POLICY "videos_select_policy" ON "public"."videos" FOR SELECT USING ((("deleted_at" IS NULL) AND "public"."can_view_video"("id", "auth"."uid"())));



CREATE POLICY "videos_service_role_policy" ON "public"."videos" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "videos_update_policy" ON "public"."videos" FOR UPDATE USING ("public"."can_edit_video"("id", "auth"."uid"())) WITH CHECK ("public"."can_edit_video"("id", "auth"."uid"()));



ALTER TABLE "public"."waivers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waivers__org_delete" ON "public"."waivers" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "waivers__org_insert" ON "public"."waivers" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "waivers__org_select" ON "public"."waivers" FOR SELECT TO "authenticated" USING ("public"."user_has_org_access"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "waivers__org_update" ON "public"."waivers" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id")) WITH CHECK ("public"."user_is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "org_id"));



CREATE POLICY "waivers__platform_admin_all" ON "public"."waivers" TO "authenticated" USING ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."announcements";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."attendance";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages_archive";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;







































































































































































































