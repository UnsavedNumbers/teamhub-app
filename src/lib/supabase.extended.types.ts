import type { Database, Json } from './database.types'
import type {
  NotificationAction,
  NotificationEntityType,
  NotificationPresentation,
  NotificationRole,
} from '../types/notifications'

// Re-export Json and Database for use in other modules
export type { Json, Database }

// Additional tables that are NOT present in the generated database.types.ts
type AdditionalTables = {
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
    Insert: Partial<AdditionalTables['entitlement_audit_log']['Row']> & {
      action: string
    }
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
      status: 'going' | 'not_going' | 'maybe'
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
      action: NotificationAction
      presentation_type: NotificationPresentation
      role_context: NotificationRole
      entity_type: NotificationEntityType | null
      entity_id: string | null
      link_url: string | null
      metadata: Json | null
      actor_id: string | null
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
      action: NotificationAction
      role_context: NotificationRole
      presentation_type?: NotificationPresentation
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
}

// Additional views that are NOT present in database.types.ts
type AdditionalViews = {
  // admin_feature_flags_list view with additional computed columns
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
    Insert: never
    Update: never
    Relationships: []
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
    Insert: never
    Update: never
    Relationships: []
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
    Insert: never
    Update: never
    Relationships: []
  }
  admin_audit_log: {
    Row: {
      id: string
      actor_id: string | null
      actor_email: string | null
      actor_name: string | null
      action: string
      entity_type: string
      entity_id: string
      metadata: Record<string, unknown>
      created_at: string
    }
    Insert: never
    Update: never
    Relationships: []
  }
}

// Additional RPC functions that are NOT present in database.types.ts
type AdditionalFunctions = {
  // Role management functions
  admin_add_org_role: {
    Args: {
      target_user_id: string
      target_org_id: string
      target_role: Database['public']['Enums']['org_member_role']
      reason: string
    }
    Returns: {
      success: boolean
      role_added?: boolean
      error?: string
    }
  }
  admin_remove_org_role: {
    Args: {
      target_user_id: string
      target_org_id: string
      target_role: Database['public']['Enums']['org_member_role']
      reason: string
    }
    Returns: {
      success: boolean
      role_removed?: boolean
      error?: string
    }
  }
  admin_change_org_role: {
    Args: {
      target_user_id: string
      target_org_id: string
      old_role: Database['public']['Enums']['org_member_role']
      new_role: Database['public']['Enums']['org_member_role']
      reason: string
    }
    Returns: {
      success: boolean
      role_changed?: boolean
      error?: string
    }
  }
  // Event RSVP functions
  update_event_rsvp_config: {
    Args: {
      p_event_id: string
      p_rsvp_enabled: boolean
      p_rsvp_type: 'general' | 'athlete' | null
      p_clear_existing: boolean
    }
    Returns: { success: boolean; error?: string }
  }
  is_child_eligible_for_event: {
    Args: {
      p_child_id: string
      p_event_id: string
    }
    Returns: boolean
  }
  // Invite acceptance functions
  accept_parent_invite: {
    Args: {
      p_token: string
    }
    Returns: Array<{
      success: boolean
      organization_id?: string
      athlete_id?: string
      child_id?: string
      message?: string
    }>
  }
  accept_organization_invite: {
    Args: {
      p_token: string
    }
    Returns: Array<{
      success: boolean
      org_id?: string
      organization_name?: string
      role?: string
      message?: string
    }>
  }
  // Guardian status functions
  athlete_has_active_guardian: {
    Args: {
      p_athlete_id: string
      p_org_id: string
    }
    Returns: boolean
  }
  get_athletes_with_guardian_status: {
    Args: {
      p_org_id: string
      p_limit?: number
      p_offset?: number
    }
    Returns: Array<{
      athlete_id: string
      first_name: string
      last_name: string
      birthdate: string | null
      gender: string | null
      preferred_name: string | null
      jersey_number: string | null
      medical_notes: string | null
      allergies: string | null
      emergency_contact_name: string | null
      emergency_contact_phone: string | null
      created_at: string
      updated_at: string
      deleted_at: string | null
      family_id: string | null
      has_active_guardian: boolean
    }>
  }
  // Feature Gate functions
  get_feature_gate: {
    Args: {
      p_org_id: string | null
      p_user_id: string
      p_feature_key: string
    }
    Returns: {
      allowed: boolean
      gate_action: 'disable' | 'overlay' | 'hide' | 'modal' | 'paywall' | 'custom' | null
      reason_code: string
      feature_key: string
      limit_value?: number
      current_usage?: number
      user_role?: string
      error?: string
    }
  }
  get_feature_gates: {
    Args: {
      p_org_id: string | null
      p_user_id: string
      p_feature_keys: string[]
    }
    Returns: Record<string, {
      allowed: boolean
      gate_action: 'disable' | 'overlay' | 'hide' | 'modal' | 'paywall' | 'custom' | null
      reason_code: string
      feature_key: string
      limit_value?: number
      current_usage?: number
      user_role?: string
      error?: string
    }>
  }
}

// Override status and target types for entitlement overrides
export type OverrideStatus = 'active' | 'expired' | 'revoked'
export type OverrideTargetType = 'organization' | 'user'

export type SupabaseExtended = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Views' | 'Functions'> & {
    Tables: Database['public']['Tables'] & AdditionalTables
    Views: Database['public']['Views'] & AdditionalViews
    Functions: Database['public']['Functions'] & AdditionalFunctions
    Enums: Database['public']['Enums']
    CompositeTypes: Database['public']['CompositeTypes']
  }
}
