import { OverrideStatus, OverrideTargetType } from '@/types/licenseTiers.types'
import type { Database, Json } from './database.types'

// Re-export Json for use in other modules
export type { Json }

// Additional tables and views that are not present in the generated database.types.ts
// This augments the Supabase schema used by the client to cover license/entitlements tables and views.
type AdditionalTables = {
  organization_settings: {
    Row: {
      org_id: string
      organization_name: string
      timezone: string
      default_language: string | null
      theme_id: string | null
      status: 'active' | 'inactive'
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_settings']['Row']>
    Relationships: []
  }
  organization_defaults: {
    Row: {
      org_id: string
      default_season_id: string | null
      default_sport_id: string | null
      default_program_id: string | null
      default_level_id: string | null
      default_event_types: string[] | null
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_defaults']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_defaults']['Row']>
    Relationships: []
  }
  organization_attendance_settings: {
    Row: {
      org_id: string
      required_for_practice: boolean
      required_for_game: boolean
      required_for_meeting: boolean
      submission_deadline_hours: number
      lock_after_days: number | null
      allow_admin_override: boolean
      enable_coach_reminders: boolean
      parent_visibility: Json | null
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_attendance_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_attendance_settings']['Row']>
    Relationships: []
  }
  organization_registration_settings: {
    Row: {
      org_id: string
      required_fields: string[] | null
      allow_players_without_guardians: boolean
      allow_guardian_self_invite: boolean
      medical_form_required: boolean
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_registration_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_registration_settings']['Row']>
    Relationships: []
  }
  organization_visibility_settings: {
    Row: {
      org_id: string
      role_permissions: Json | null
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_visibility_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_visibility_settings']['Row']>
    Relationships: []
  }
  organization_notification_settings: {
    Row: {
      org_id: string
      default_channels: string[] | null
      attendance_reminders_enabled: boolean
      schedule_change_alerts_enabled: boolean
      payment_reminder_behavior: 'immediate' | 'daily_digest'
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_notification_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_notification_settings']['Row']>
    Relationships: []
  }
  organization_advanced_settings: {
    Row: {
      org_id: string
      data_retention_days: number | null
      enable_api_access: boolean
      api_rate_limit: number | null
      allow_data_export: boolean
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['organization_advanced_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['organization_advanced_settings']['Row']>
    Relationships: []
  }
  license_tiers: {
    Row: {
      id: string
      tier_key: string
      tier_name: string
      description: string | null
      stripe_price_id: string
      stripe_verified_at: string | null
      stripe_product_name: string | null
      stripe_amount_cents: number | null
      stripe_interval: string | null
      stripe_currency: string | null
      stripe_active: boolean | null
      status: 'active' | 'archived'
      version: number | null
      created_at: string
      updated_at: string
    }
    Insert: Partial<AdditionalTables['license_tiers']['Row']> & {
      tier_key: string
      tier_name: string
      stripe_price_id: string
    }
    Update: Partial<AdditionalTables['license_tiers']['Row']>
    Relationships: []
  }
  feature_entitlements: {
    Row: {
      id: string
      feature_key: string
      display_name: string
      category: string
      feature_type: 'module' | 'permission' | 'limit' | 'visibility' | 'integration'
      description: string | null
      rollout_status: 'live' | 'beta' | 'hidden'
      created_at: string
      updated_at: string
      archived_at: string | null
    }
    Insert: Partial<AdditionalTables['feature_entitlements']['Row']> & {
      feature_key: string
      display_name: string
      category: string
      feature_type: AdditionalTables['feature_entitlements']['Row']['feature_type']
    }
    Update: Partial<AdditionalTables['feature_entitlements']['Row']>
    Relationships: []
  }
  tier_feature_assignments: {
    Row: {
      id: string
      license_tier_id: string
      feature_entitlement_id: string
      included: boolean
      limit_value: number | null
      role_admin: boolean
      role_coach: boolean
      role_parent: boolean
      created_at: string
      updated_at: string
    }
    Insert: Partial<AdditionalTables['tier_feature_assignments']['Row']> & {
      license_tier_id: string
      feature_entitlement_id: string
      included: boolean
    }
    Update: Partial<AdditionalTables['tier_feature_assignments']['Row']>
    Relationships: []
  }
  entitlement_overrides: {
    Row: {
      id: string
      target_type: 'organization' | 'user'
      target_id: string
      feature_entitlement_id: string
      override_action: 'enable' | 'disable' | 'set_limit'
      limit_value: number | null
      role_admin: boolean | null
      role_coach: boolean | null
      role_parent: boolean | null
      reason: string
      expires_at: string | null
      created_by: string
      created_at: string
      updated_at: string
      revoked_at: string | null
      revoked_by: string | null
      revoked_reason: string | null
      version: number
    }
    Insert: Partial<AdditionalTables['entitlement_overrides']['Row']> & {
      target_type: 'organization' | 'user'
      target_id: string
      feature_entitlement_id: string
      override_action: AdditionalTables['entitlement_overrides']['Row']['override_action']
      created_by: string
    }
    Update: Partial<AdditionalTables['entitlement_overrides']['Row']>
    Relationships: []
  }
  entitlement_audit_log: {
    Row: {
      id: string
      actor_id: string | null
      actor_email: string | null
      action: string
      target_type: string | null
      target_id: string | null
      before_state: Json | null
      after_state: Json | null
      reason: string | null
      created_at: string
    }
    Insert: AdditionalTables['entitlement_audit_log']['Row']
    Update: Partial<AdditionalTables['entitlement_audit_log']['Row']>
    Relationships: []
  }
  feature_dependencies: {
    Row: {
      id: string
      feature_id: string
      depends_on_feature_id: string
      created_at: string
      updated_at: string
    }
    Insert: Partial<AdditionalTables['feature_dependencies']['Row']> & {
      feature_id: string
      depends_on_feature_id: string
    }
    Update: Partial<AdditionalTables['feature_dependencies']['Row']>
    Relationships: []
  }
  event_general_rsvps: {
    Row: {
      id: string
      event_id: string
      user_id: string | null
      status: 'going' | 'not_going' | 'maybe'
      note: string | null
      responded_at: string | null
      created_at: string | null
      updated_at: string | null
    }
    Insert: Partial<AdditionalTables['event_general_rsvps']['Row']> & {
      event_id: string
      user_id?: string | null
      status: 'going' | 'not_going' | 'maybe'
      responded_at?: string | null
    }
    Update: Partial<AdditionalTables['event_general_rsvps']['Row']>
    Relationships: [
      {
        foreignKeyName: 'event_general_rsvps_event_id_fkey'
        columns: ['event_id']
        isOneToOne: false
        referencedRelation: 'events'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'event_general_rsvps_user_id_fkey'
        columns: ['user_id']
        isOneToOne: false
        referencedRelation: 'users'
        referencedColumns: ['id']
      }
    ]
  }
  user_notifications: {
    Row: {
      id: string
      user_id: string
      org_id: string
      team_id: string | null
      type: string
      kit_id: string | null
      title: string
      body: string
      payload: Json | null
      dedupe_key: string
      read_at: string | null
      created_at: string
    }
    Insert: Partial<AdditionalTables['user_notifications']['Row']> & {
      user_id: string
      org_id: string
      title: string
      body: string
      dedupe_key: string
      type: string
    }
    Update: Partial<AdditionalTables['user_notifications']['Row']>
    Relationships: [
      {
        foreignKeyName: 'user_notifications_user_id_fkey'
        columns: ['user_id']
        isOneToOne: false
        referencedRelation: 'users'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'user_notifications_org_id_fkey'
        columns: ['org_id']
        isOneToOne: false
        referencedRelation: 'organizations'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'user_notifications_team_id_fkey'
        columns: ['team_id']
        isOneToOne: false
        referencedRelation: 'teams'
        referencedColumns: ['id']
      }
    ]
  }
  levels: {
    Row: {
      id: string
      org_id: string
      program_id: string
      name: string
      level_type: 'age_based' | 'grade_based' | 'skill_based'
      description: string | null
      age_min: number | null
      age_max: number | null
      grade_min: number | null
      grade_max: number | null
      skill_min: number | null
      skill_max: number | null
      created_at: string
      updated_at: string
      deleted_at: string | null
    }
    Insert: Partial<AdditionalTables['levels']['Row']> & {
      org_id: string
      program_id: string
      name: string
      level_type: 'age_based' | 'grade_based' | 'skill_based'
    }
    Update: Partial<AdditionalTables['levels']['Row']>
    Relationships: []
  }
  attendance_settings: {
    Row: {
      org_id: string
      reminder_enabled: boolean
      lock_after_hours: number
      required_for_practice: boolean
      required_for_game: boolean
      required_for_meeting: boolean
      created_at: string
      updated_at: string
    }
    Insert: Partial<AdditionalTables['attendance_settings']['Row']> & {
      org_id: string
    }
    Update: Partial<AdditionalTables['attendance_settings']['Row']>
    Relationships: []
  }
  team_seasons: {
    Row: {
      id: string
      team_id: string
      season_id: string
      is_active: boolean
      created_at: string | null
      updated_at: string | null
    }
    Insert: {
      id?: string
      team_id: string
      season_id: string
      is_active?: boolean
      created_at?: string | null
      updated_at?: string | null
    }
    Update: {
      id?: string
      team_id?: string
      season_id?: string
      is_active?: boolean
      created_at?: string | null
      updated_at?: string | null
    }
    Relationships: []
  }
}

type ViewDef<Row> = {
  Row: Row
  Relationships: []
  // include these if your generated views have them:
  Insert: never
  Update: never
}

type AdditionalViews = {
  admin_license_tiers_list: ViewDef<
    AdditionalTables['license_tiers']['Row'] & {
      included_features_count: number
      orgs_using_count: number
    }
  > 
  admin_entitlement_overrides_list: ViewDef<
    AdditionalTables['entitlement_overrides']['Row'] & {
      target_name: string | null
      feature_key: string
      feature_name: string
      created_by_email: string | null
      revoked_by_email: string | null
      target_type: OverrideTargetType
      status: OverrideStatus
    }
  >
  admin_feature_entitlements_list: ViewDef<
    AdditionalTables['feature_entitlements']['Row'] & {
      tier_assignments_count: number
      active_overrides_count: number
    }
  >
  admin_audit_log: ViewDef<{
    id: string
    actor_id: string | null
    actor_email: string | null
    actor_name: string | null
    action: string
    entity_type: string
    entity_id: string
    metadata: Record<string, unknown>
    created_at: string}
  >
  team_seasons_view: ViewDef<{
    team_id: string
    season_id: string
    org_id: string
    name: string
    start_date: string
    end_date: string
    season_is_active: boolean
    is_active: boolean
  }>
  // Admin feature flag views - these exist in database.types.ts but we ensure they're typed correctly
  admin_feature_flags_list: {
    Row: {
      id: string
      key: string
      value_type: Database['public']['Enums']['feature_flag_value_type']
      description: string | null
      environment: Database['public']['Enums']['feature_flag_environment']
      deleted_at: string | null
      version: number
      created_at: string
      updated_at: string
      default_value_boolean: boolean | null
      default_value_integer: number | null
      default_value_double: number | null
      org_override_count: number
      user_override_count: number
    }
  }
  admin_feature_flag_overrides: {
    Row: {
      override_type: 'org' | 'user'
      feature_flag_id: string
      feature_key: string
      scope_id: string
      scope_name: string
      environment: Database['public']['Enums']['feature_flag_environment']
      value_boolean: boolean | null
      value_integer: number | null
      value_double: number | null
      version: number
      created_at: string
      updated_at: string
    }
  }
  admin_feature_flag_audit: {
    Row: {
      id: string
      actor_id: string | null
      actor_email: string | null
      actor_name: string | null
      action: string
      feature_flag_id: string | null
      feature_key: string | null
      scope_type: string | null
      scope_id: string | null
      old_value: Json | null
      new_value: Json | null
      environment: Database['public']['Enums']['feature_flag_environment']
      created_at: string
    }
  }
  admin_fees_status: {
    Row: {
      fee_id: string
      fee_name: string
      amount_cents: number
      currency: string | null
      due_date: string | null
      fee_status: Database['public']['Enums']['fee_status']
      org_id: string
      organization_name: string
      assigned_count: number
      paid_count: number
      unpaid_count: number
      payment_rate_percent: number
    }
  }
  admin_license_metrics: ViewDef<{
    active_tiers: number
    total_features: number
    orgs_on_basic: number
    orgs_on_power: number
    active_overrides: number
    tiers_missing_price_id: number
    features_without_assignment: number
    tiers_with_archived_features?: number
  }>
}

// RPC response type for admin functions
type AdminRpcResponse = {
  success: boolean
  error?: string
  action?: string
  flag_id?: string
}

type AdditionalFunctions = {
  resolve_feature_flag: {
    Args: {
      p_feature_key: string
      p_user_id?: string | null
      p_org_id?: string | null
      p_environment?: string | null
    }
    Returns: {
      value: unknown
      value_type: 'boolean' | 'integer' | 'double' | 'string' | null
      resolved_from: 'platform' | 'organization' | 'user' | null
      source_id: string | null
    }
  }
  resolve_feature_flags: {
    Args: {
      p_feature_keys: string[]
      p_user_id?: string | null
      p_org_id?: string | null
      p_environment?: string | null
    }
    Returns: {
      feature_key: string
      value: unknown
      value_type: 'boolean' | 'integer' | 'double' | 'string' | null
      resolved_from: 'platform' | 'organization' | 'user' | null
      source_id: string | null
    }[]
  }
  // Admin RPCs with typed return values
  admin_activate_organization: {
    Args: {
      target_org_id: string
      reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_suspend_organization: {
    Args: {
      target_org_id: string
      reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_disable_user: {
    Args: {
      target_user_id: string
      reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_enable_user: {
    Args: {
      target_user_id: string
      reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_add_platform_admin: {
    Args: {
      target_email: string
      target_role: Database['public']['Enums']['platform_admin_role']
      reason: string
    }
    Returns: AdminRpcResponse & { action?: 'added' | 'updated' }
  }
  admin_remove_platform_admin: {
    Args: {
      target_user_id: string
      reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_create_feature_flag: {
    Args: {
      p_key: string
      p_value_type: Database['public']['Enums']['feature_flag_value_type']
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_description?: string
    }
    Returns: AdminRpcResponse & { flag_id?: string }
  }
  admin_set_platform_default: {
    Args: {
      p_feature_flag_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
      p_value_boolean?: boolean | null
      p_value_integer?: number | null
      p_value_double?: number | null
      p_expected_version?: number | null
    }
    Returns: AdminRpcResponse
  }
  admin_set_org_override: {
    Args: {
      p_feature_flag_id: string
      p_org_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
      p_value_boolean?: boolean | null
      p_value_integer?: number | null
      p_value_double?: number | null
      p_expected_version?: number | null
    }
    Returns: AdminRpcResponse
  }
  admin_set_user_override: {
    Args: {
      p_feature_flag_id: string
      p_user_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
      p_value_boolean?: boolean | null
      p_value_integer?: number | null
      p_value_double?: number | null
      p_expected_version?: number | null
    }
    Returns: AdminRpcResponse
  }
  admin_remove_org_override: {
    Args: {
      p_feature_flag_id: string
      p_org_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
      p_expected_version?: number | null
    }
    Returns: AdminRpcResponse
  }
  admin_remove_user_override: {
    Args: {
      p_feature_flag_id: string
      p_user_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
      p_expected_version?: number | null
    }
    Returns: AdminRpcResponse
  }
  admin_delete_feature_flag: {
    Args: {
      p_feature_flag_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_restore_feature_flag: {
    Args: {
      p_feature_flag_id: string
      p_environment: Database['public']['Enums']['feature_flag_environment']
      p_reason: string
    }
    Returns: AdminRpcResponse
  }
  admin_set_feature_flag: {
    Args: {
      target_feature_key: string
      target_org_id: string
      target_enabled: boolean
      reason: string
    }
    Returns: AdminRpcResponse
  }
  log_event: {
    Args: {
      p_category: Database['public']['Enums']['event_category']
      p_event_type: string
      p_actor_role: Database['public']['Enums']['event_actor_role']
      p_actor_user_id?: string | null
      p_org_id?: string | null
      p_target_entity_type?: string | null
      p_target_entity_id?: string | null
      p_metadata?: Json | null
      p_ip_address?: string | null
      p_user_agent?: string | null
      p_idempotency_key?: string | null
    }
    Returns: string | null // Returns UUID of created event or null
  }
  is_child_eligible_for_event: {
    Args: {
      p_child_id: string
      p_event_id: string
    }
    Returns: boolean
  }
  get_user_organizations: {
    Args: {
      check_user_id: string
    }
    Returns: {
      org_id: string
      org_name: string
      roles: string[]
    }[]
  }
  update_event_rsvp_config: {
    Args: {
      p_event_id: string
      p_rsvp_enabled: boolean
      p_rsvp_type: 'general' | 'athlete' | null
      p_clear_existing: boolean
    }
    Returns: { success: boolean; error?: string }
  }
  get_event_rsvp_summary: {
    Args: {
      p_event_id: string
    }
    Returns: {
      going_count: number
      late_count: number
      not_going_count: number
      unknown_count: number
      total_children: number
      response_rate: number
    }
  }
  set_travel_override: {
    Args: {
      p_event_id: string
      p_is_travel: boolean
      p_reason: string | null
    }
    Returns: void
  }
  clear_travel_override: {
    Args: {
      p_event_id: string
    }
    Returns: void
  }
}

export type SupabaseExtended = Omit<Database, 'public'> & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & AdditionalTables
    Views: Database['public']['Views'] & AdditionalViews
    Functions: Database['public']['Functions'] & AdditionalFunctions
    Enums: Database['public']['Enums']
    CompositeTypes: Database['public']['CompositeTypes']
  }
}
