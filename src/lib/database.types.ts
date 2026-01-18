export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          priority: string | null
          team_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          priority?: string | null
          team_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          priority?: string | null
          team_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          child_id: string
          created_at: string | null
          event_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          event_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          org_id: string
          reminder_enabled: boolean
          lock_after_hours: number | null
          required_for_practice: boolean
          required_for_game: boolean
          required_for_meeting: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          org_id: string
          reminder_enabled?: boolean
          lock_after_hours?: number | null
          required_for_practice?: boolean
          required_for_game?: boolean
          required_for_meeting?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          org_id?: string
          reminder_enabled?: boolean
          lock_after_hours?: number | null
          required_for_practice?: boolean
          required_for_game?: boolean
          required_for_meeting?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_old: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string | null
          id: string
          organization_id: string | null
          payload: Json | null
          processed_at: string | null
          stripe_event_id: string | null
          stripe_object_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id?: string | null
          stripe_object_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id?: string | null
          stripe_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount_cents: number
          charge_type: Database["public"]["Enums"]["charge_type"]
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          description: string
          fee_assignment_id: string | null
          fee_id: string | null
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          charge_type: Database["public"]["Enums"]["charge_type"]
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          description: string
          fee_assignment_id?: string | null
          fee_id?: string | null
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          charge_type?: Database["public"]["Enums"]["charge_type"]
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          description?: string
          fee_assignment_id?: string | null
          fee_id?: string | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "charges_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["fee_id"]
          },
          {
            foreignKeyName: "charges_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_session_items: {
        Row: {
          amount_cents: number
          charge_id: string
          checkout_session_id: string
          created_at: string | null
          fee_assignment_id: string | null
          id: string
        }
        Insert: {
          amount_cents: number
          charge_id: string
          checkout_session_id: string
          created_at?: string | null
          fee_assignment_id?: string | null
          id?: string
        }
        Update: {
          amount_cents?: number
          charge_id?: string
          checkout_session_id?: string
          created_at?: string | null
          fee_assignment_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_session_items_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_session_items_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_session_items_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "checkout_session_items_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          organization_id: string
          parent_id: string
          platform_fee_cents: number
          status: Database["public"]["Enums"]["checkout_session_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id: string
          parent_id: string
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["checkout_session_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string
          parent_id?: string
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["checkout_session_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      child_claim_tokens: {
        Row: {
          child_id: string
          created_at: string | null
          created_by_user_id: string | null
          expires_at: string
          id: string
          organization_id: string
          season_id: string
          team_id: string | null
          token: string
          updated_at: string | null
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at: string
          id?: string
          organization_id: string
          season_id: string
          team_id?: string | null
          token?: string
          updated_at?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          season_id?: string
          team_id?: string | null
          token?: string
          updated_at?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_claim_tokens_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      child_guardians: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["child_guardian_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["child_guardian_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["child_guardian_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "child_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "child_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birthdate: string | null
          created_at: string | null
          family_id: string | null
          first_name: string
          id: string
          last_name: string
          updated_at: string | null
        }
        Insert: {
          birthdate?: string | null
          created_at?: string | null
          family_id?: string | null
          first_name: string
          id?: string
          last_name: string
          updated_at?: string | null
        }
        Update: {
          birthdate?: string | null
          created_at?: string | null
          family_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          amount_off_cents: number | null
          applies_to_fee_id: string | null
          applies_to_season_id: string | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          id: string
          max_redemptions: number | null
          organization_id: string
          percent_off: number | null
          redeem_by: string | null
          status: Database["public"]["Enums"]["discount_code_status"]
          updated_at: string | null
        }
        Insert: {
          amount_off_cents?: number | null
          applies_to_fee_id?: string | null
          applies_to_season_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          id?: string
          max_redemptions?: number | null
          organization_id: string
          percent_off?: number | null
          redeem_by?: string | null
          status?: Database["public"]["Enums"]["discount_code_status"]
          updated_at?: string | null
        }
        Update: {
          amount_off_cents?: number | null
          applies_to_fee_id?: string | null
          applies_to_season_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          id?: string
          max_redemptions?: number | null
          organization_id?: string
          percent_off?: number | null
          redeem_by?: string | null
          status?: Database["public"]["Enums"]["discount_code_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_applies_to_fee_id_fkey"
            columns: ["applies_to_fee_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["fee_id"]
          },
          {
            foreignKeyName: "discount_codes_applies_to_fee_id_fkey"
            columns: ["applies_to_fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_applies_to_season_id_fkey"
            columns: ["applies_to_season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "discount_codes_applies_to_season_id_fkey"
            columns: ["applies_to_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_redemptions: {
        Row: {
          amount_cents_applied: number
          created_at: string | null
          discount_code_id: string
          fee_assignment_id: string
          id: string
          redeemed_at: string
          redeemed_by_parent_id: string
        }
        Insert: {
          amount_cents_applied: number
          created_at?: string | null
          discount_code_id: string
          fee_assignment_id: string
          id?: string
          redeemed_at?: string
          redeemed_by_parent_id: string
        }
        Update: {
          amount_cents_applied?: number
          created_at?: string | null
          discount_code_id?: string
          fee_assignment_id?: string
          id?: string
          redeemed_at?: string
          redeemed_by_parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "discount_redemptions_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_redeemed_by_parent_id_fkey"
            columns: ["redeemed_by_parent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_redeemed_by_parent_id_fkey"
            columns: ["redeemed_by_parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_redeemed_by_parent_id_fkey"
            columns: ["redeemed_by_parent_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          child_id: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          recorded_by_user_id: string | null
          status: Database["public"]["Enums"]["event_attendance_status"]
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          recorded_by_user_id?: string | null
          status?: Database["public"]["Enums"]["event_attendance_status"]
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          recorded_by_user_id?: string | null
          status?: Database["public"]["Enums"]["event_attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "event_attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      event_change_history: {
        Row: {
          change_type: string
          changed_by_user_id: string
          created_at: string | null
          event_id: string
          field_name: string | null
          id: string
          new_value: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          old_value: string | null
        }
        Insert: {
          change_type: string
          changed_by_user_id: string
          created_at?: string | null
          event_id: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          old_value?: string | null
        }
        Update: {
          change_type?: string
          changed_by_user_id?: string
          created_at?: string | null
          event_id?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_change_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_change_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_change_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_change_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          event_id: string
          id: string
          is_tbd: boolean | null
          is_virtual: boolean | null
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          postal_code: string | null
          state: string | null
          updated_at: string | null
          venue_name: string | null
          virtual_link: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_tbd?: boolean | null
          is_virtual?: boolean | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          venue_name?: string | null
          virtual_link?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_tbd?: boolean | null
          is_virtual?: boolean | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          venue_name?: string | null
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          actor_role: Database["public"]["Enums"]["event_actor_role"]
          actor_user_id: string | null
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          ip_address: string | null
          metadata: Json | null
          org_id: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          user_agent: string | null
        }
        Insert: {
          actor_role: Database["public"]["Enums"]["event_actor_role"]
          actor_user_id?: string | null
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_role?: Database["public"]["Enums"]["event_actor_role"]
          actor_user_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs_archive: {
        Row: {
          actor_role: Database["public"]["Enums"]["event_actor_role"]
          actor_user_id: string | null
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          ip_address: string | null
          metadata: Json | null
          org_id: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          user_agent: string | null
        }
        Insert: {
          actor_role: Database["public"]["Enums"]["event_actor_role"]
          actor_user_id?: string | null
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_role?: Database["public"]["Enums"]["event_actor_role"]
          actor_user_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      event_general_rsvps: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          status: Database["public"]["Enums"]["general_rsvp_status"]
          note: string | null
          responded_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          status?: Database["public"]["Enums"]["general_rsvp_status"]
          note?: string | null
          responded_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          status?: Database["public"]["Enums"]["general_rsvp_status"]
          note?: string | null
          responded_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_general_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_general_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          child_id: string
          created_at: string | null
          event_id: string
          id: string
          note: string | null
          responded_at: string | null
          responded_by_user_id: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          event_id: string
          id?: string
          note?: string | null
          responded_at?: string | null
          responded_by_user_id?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          note?: string | null
          responded_at?: string | null
          responded_by_user_id?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "event_rsvps_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_responded_by_user_id_fkey"
            columns: ["responded_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_responded_by_user_id_fkey"
            columns: ["responded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_responded_by_user_id_fkey"
            columns: ["responded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          arrival_time: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          departure_time: string | null
          end_time: string
          equipment_notes: string | null
          external_link: string | null
          hotel_address: string | null
          hotel_confirmation: string | null
          hotel_name: string | null
          hotel_phone: string | null
          id: string
          is_cancelled: boolean | null
          itinerary_file_path: string | null
          location: string | null
          meeting_locations: Json | null
          notes: string | null
          overnight: boolean | null
          requires_travel: boolean | null
          return_time: string | null
          rsvp_enabled: boolean | null
          rsvp_type: string | null
          season_id: string
          start_time: string
          team_id: string
          timezone: string
          title: string
          transportation_notes: string | null
          travel_override: Json | null
          type: Database["public"]["Enums"]["event_type"]
          uniform_notes: string | null
          updated_at: string | null
          weather_dependent: boolean | null
        }
        Insert: {
          arrival_time?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          departure_time?: string | null
          end_time: string
          equipment_notes?: string | null
          external_link?: string | null
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          id?: string
          is_cancelled?: boolean | null
          itinerary_file_path?: string | null
          location?: string | null
          meeting_locations?: Json | null
          notes?: string | null
          overnight?: boolean | null
          requires_travel?: boolean | null
          return_time?: string | null
          rsvp_enabled?: boolean | null
          rsvp_type?: string | null
          season_id: string
          start_time: string
          team_id: string
          timezone?: string
          title: string
          transportation_notes?: string | null
          travel_override?: Json | null
          type?: Database["public"]["Enums"]["event_type"]
          uniform_notes?: string | null
          updated_at?: string | null
          weather_dependent?: boolean | null
        }
        Update: {
          arrival_time?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          departure_time?: string | null
          end_time?: string
          equipment_notes?: string | null
          external_link?: string | null
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          id?: string
          is_cancelled?: boolean | null
          itinerary_file_path?: string | null
          location?: string | null
          meeting_locations?: Json | null
          notes?: string | null
          overnight?: boolean | null
          requires_travel?: boolean | null
          return_time?: string | null
          rsvp_enabled?: boolean | null
          rsvp_type?: string | null
          season_id?: string
          start_time?: string
          team_id?: string
          timezone?: string
          title?: string
          transportation_notes?: string | null
          travel_override?: Json | null
          type?: Database["public"]["Enums"]["event_type"]
          uniform_notes?: string | null
          updated_at?: string | null
          weather_dependent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "events_cancelled_by_user_id_fkey"
            columns: ["cancelled_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_cancelled_by_user_id_fkey"
            columns: ["cancelled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_cancelled_by_user_id_fkey"
            columns: ["cancelled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "families_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "families_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_primary: boolean | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_primary?: boolean | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_primary?: boolean | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          scope_id: string | null
          scope_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scope_id?: string | null
          scope_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          environment?: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scope_id?: string | null
          scope_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_org_overrides: {
        Row: {
          created_at: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string
          org_id: string
          updated_at: string
          value_boolean: boolean | null
          value_double: number | null
          value_integer: number | null
          version: number
        }
        Insert: {
          created_at?: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string
          org_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_double?: number | null
          value_integer?: number | null
          version?: number
        }
        Update: {
          created_at?: string
          environment?: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id?: string
          org_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_double?: number | null
          value_integer?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_org_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_org_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_org_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_org_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flag_org_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_org_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flag_org_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_platform_defaults: {
        Row: {
          created_at: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string
          updated_at: string
          value_boolean: boolean | null
          value_double: number | null
          value_integer: number | null
          version: number
        }
        Insert: {
          created_at?: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_double?: number | null
          value_integer?: number | null
          version?: number
        }
        Update: {
          created_at?: string
          environment?: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_double?: number | null
          value_integer?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_platform_defaults_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_platform_defaults_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_platform_defaults_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_user_overrides: {
        Row: {
          created_at: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string
          updated_at: string
          user_id: string
          value_boolean: boolean | null
          value_double: number | null
          value_integer: number | null
          version: number
        }
        Insert: {
          created_at?: string
          environment: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id: string
          updated_at?: string
          user_id: string
          value_boolean?: boolean | null
          value_double?: number | null
          value_integer?: number | null
          version?: number
        }
        Update: {
          created_at?: string
          environment?: Database["public"]["Enums"]["feature_flag_environment"]
          feature_flag_id?: string
          updated_at?: string
          user_id?: string
          value_boolean?: boolean | null
          value_double?: number | null
          value_integer?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_user_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_user_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_user_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_user_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_user_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_user_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          enabled: boolean
          environment:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_key: string
          id: string
          key: string | null
          organization_id: string
          updated_at: string | null
          value_type:
            | Database["public"]["Enums"]["feature_flag_value_type"]
            | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean
          environment?:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_key: string
          id?: string
          key?: string | null
          organization_id: string
          updated_at?: string | null
          value_type?:
            | Database["public"]["Enums"]["feature_flag_value_type"]
            | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean
          environment?:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_key?: string
          id?: string
          key?: string | null
          organization_id?: string
          updated_at?: string | null
          value_type?:
            | Database["public"]["Enums"]["feature_flag_value_type"]
            | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_assignments: {
        Row: {
          amount_cents: number
          balance_cents: number
          child_id: string
          created_at: string | null
          currency: string | null
          discount_cents_total: number
          due_date: string | null
          fee_id: string
          id: string
          late_fee_cents_applied: number
          notes_internal: string | null
          organization_id: string
          paid_cents_total: number
          parent_id: string
          scholarship_cents_total: number
          status: Database["public"]["Enums"]["fee_assignment_status"]
          updated_at: string | null
          waived_cents_total: number
        }
        Insert: {
          amount_cents: number
          balance_cents?: number
          child_id: string
          created_at?: string | null
          currency?: string | null
          discount_cents_total?: number
          due_date?: string | null
          fee_id: string
          id?: string
          late_fee_cents_applied?: number
          notes_internal?: string | null
          organization_id: string
          paid_cents_total?: number
          parent_id: string
          scholarship_cents_total?: number
          status?: Database["public"]["Enums"]["fee_assignment_status"]
          updated_at?: string | null
          waived_cents_total?: number
        }
        Update: {
          amount_cents?: number
          balance_cents?: number
          child_id?: string
          created_at?: string | null
          currency?: string | null
          discount_cents_total?: number
          due_date?: string | null
          fee_id?: string
          id?: string
          late_fee_cents_applied?: number
          notes_internal?: string | null
          organization_id?: string
          paid_cents_total?: number
          parent_id?: string
          scholarship_cents_total?: number
          status?: Database["public"]["Enums"]["fee_assignment_status"]
          updated_at?: string | null
          waived_cents_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "fee_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["fee_id"]
          },
          {
            foreignKeyName: "fee_assignments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          ack_text: string | null
          allow_discounts: boolean | null
          allow_installments: boolean | null
          allow_late_payment: boolean | null
          allow_partial_payment: boolean | null
          allow_scholarships: boolean | null
          amount_cents: number
          closed_at: string | null
          created_at: string | null
          created_by_admin_id: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          fee_type: Database["public"]["Enums"]["fee_type"]
          id: string
          installment_plan_id: string | null
          late_fee_cents: number | null
          late_fee_starts_on: string | null
          min_partial_cents: number | null
          organization_id: string
          published_at: string | null
          require_acknowledgement: boolean | null
          scope: Database["public"]["Enums"]["fee_scope"]
          season_id: string | null
          status: Database["public"]["Enums"]["fee_status"]
          title: string
          updated_at: string | null
          visibility: Database["public"]["Enums"]["fee_visibility"]
        }
        Insert: {
          ack_text?: string | null
          allow_discounts?: boolean | null
          allow_installments?: boolean | null
          allow_late_payment?: boolean | null
          allow_partial_payment?: boolean | null
          allow_scholarships?: boolean | null
          amount_cents: number
          closed_at?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          fee_type: Database["public"]["Enums"]["fee_type"]
          id?: string
          installment_plan_id?: string | null
          late_fee_cents?: number | null
          late_fee_starts_on?: string | null
          min_partial_cents?: number | null
          organization_id: string
          published_at?: string | null
          require_acknowledgement?: boolean | null
          scope: Database["public"]["Enums"]["fee_scope"]
          season_id?: string | null
          status?: Database["public"]["Enums"]["fee_status"]
          title: string
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["fee_visibility"]
        }
        Update: {
          ack_text?: string | null
          allow_discounts?: boolean | null
          allow_installments?: boolean | null
          allow_late_payment?: boolean | null
          allow_partial_payment?: boolean | null
          allow_scholarships?: boolean | null
          amount_cents?: number
          closed_at?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          installment_plan_id?: string | null
          late_fee_cents?: number | null
          late_fee_starts_on?: string | null
          min_partial_cents?: number | null
          organization_id?: string
          published_at?: string | null
          require_acknowledgement?: boolean | null
          scope?: Database["public"]["Enums"]["fee_scope"]
          season_id?: string | null
          status?: Database["public"]["Enums"]["fee_status"]
          title?: string
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["fee_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "fees_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "fees_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          allows_early_payoff: boolean | null
          created_at: string | null
          day_of_month: number | null
          down_payment_cents: number | null
          frequency: Database["public"]["Enums"]["installment_frequency"]
          grace_days: number | null
          id: string
          name: string
          num_installments: number
          organization_id: string
          start_date_rule: Database["public"]["Enums"]["start_date_rule"]
          updated_at: string | null
        }
        Insert: {
          allows_early_payoff?: boolean | null
          created_at?: string | null
          day_of_month?: number | null
          down_payment_cents?: number | null
          frequency: Database["public"]["Enums"]["installment_frequency"]
          grace_days?: number | null
          id?: string
          name: string
          num_installments: number
          organization_id: string
          start_date_rule: Database["public"]["Enums"]["start_date_rule"]
          updated_at?: string | null
        }
        Update: {
          allows_early_payoff?: boolean | null
          created_at?: string | null
          day_of_month?: number | null
          down_payment_cents?: number | null
          frequency?: Database["public"]["Enums"]["installment_frequency"]
          grace_days?: number | null
          id?: string
          name?: string
          num_installments?: number
          organization_id?: string
          start_date_rule?: Database["public"]["Enums"]["start_date_rule"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_schedules: {
        Row: {
          created_at: string | null
          fee_assignment_id: string
          id: string
          installment_plan_id: string
          status: Database["public"]["Enums"]["installment_schedule_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fee_assignment_id: string
          id?: string
          installment_plan_id: string
          status?: Database["public"]["Enums"]["installment_schedule_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fee_assignment_id?: string
          id?: string
          installment_plan_id?: string
          status?: Database["public"]["Enums"]["installment_schedule_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_schedules_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "installment_schedules_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_schedules_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount_cents: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          installment_schedule_id: string
          paid_cents_total: number
          status: Database["public"]["Enums"]["installment_status"]
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          installment_schedule_id: string
          paid_cents_total?: number
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          installment_schedule_id?: string
          paid_cents_total?: number
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_installment_schedule_id_fkey"
            columns: ["installment_schedule_id"]
            isOneToOne: false
            referencedRelation: "installment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      join_links: {
        Row: {
          auto_approve: boolean
          created_at: string | null
          created_by_user_id: string | null
          expires_at: string
          id: string
          organization_id: string
          team_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          auto_approve?: boolean
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at: string
          id?: string
          organization_id: string
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          auto_approve?: boolean
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "join_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "join_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          child_id: string
          created_at: string | null
          decision_reason: string | null
          id: string
          join_link_id: string | null
          organization_id: string
          requested_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          season_id: string
          status: Database["public"]["Enums"]["join_request_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          decision_reason?: string | null
          id?: string
          join_link_id?: string | null
          organization_id: string
          requested_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["join_request_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          decision_reason?: string | null
          id?: string
          join_link_id?: string | null
          organization_id?: string
          requested_by_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          season_id?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "join_requests_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_join_link_id_fkey"
            columns: ["join_link_id"]
            isOneToOne: false
            referencedRelation: "join_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "join_requests_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      license_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          stripe_active: boolean | null
          stripe_amount_cents: number | null
          stripe_currency: string | null
          stripe_interval: string | null
          stripe_price_id: string
          stripe_product_name: string | null
          stripe_verified_at: string | null
          tier_key: string
          tier_name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_active?: boolean | null
          stripe_amount_cents?: number | null
          stripe_currency?: string | null
          stripe_interval?: string | null
          stripe_price_id: string
          stripe_product_name?: string | null
          stripe_verified_at?: string | null
          tier_key: string
          tier_name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_active?: boolean | null
          stripe_amount_cents?: number | null
          stripe_currency?: string | null
          stripe_interval?: string | null
          stripe_price_id?: string
          stripe_product_name?: string | null
          stripe_verified_at?: string | null
          tier_key?: string
          tier_name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      levels: {
        Row: {
          id: string
          org_id: string
          program_id: string
          name: string
          level_type: string
          description: string | null
          age_min: number | null
          age_max: number | null
          grade_min: number | null
          grade_max: number | null
          skill_min: number | null
          skill_max: number | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          program_id: string
          name: string
          level_type?: Database["public"]["Enums"]["level_type"]
          description?: string | null
          age_min?: number | null
          age_max?: number | null
          grade_min?: number | null
          grade_max?: number | null
          skill_min?: number | null
          skill_max?: number | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          program_id?: string
          name?: string
          level_type?: Database["public"]["Enums"]["level_type"]
          description?: string | null
          age_min?: number | null
          age_max?: number | null
          grade_min?: number | null
          grade_max?: number | null
          skill_min?: number | null
          skill_max?: number | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          team_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          team_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_errors: {
        Row: {
          created_at: string | null
          error_data: Json | null
          error_message: string
          id: string
          source_id: string | null
          source_table: string
        }
        Insert: {
          created_at?: string | null
          error_data?: Json | null
          error_message: string
          id?: string
          source_id?: string | null
          source_table: string
        }
        Update: {
          created_at?: string | null
          error_data?: Json | null
          error_message?: string
          id?: string
          source_id?: string | null
          source_table?: string
        }
        Relationships: []
      }
      offline_payment_allocations: {
        Row: {
          amount_cents: number
          charge_id: string
          created_at: string | null
          id: string
          offline_payment_id: string
        }
        Insert: {
          amount_cents: number
          charge_id: string
          created_at?: string | null
          id?: string
          offline_payment_id: string
        }
        Update: {
          amount_cents?: number
          charge_id?: string
          created_at?: string | null
          id?: string
          offline_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_payment_allocations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payment_allocations_offline_payment_id_fkey"
            columns: ["offline_payment_id"]
            isOneToOne: false
            referencedRelation: "offline_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_payments: {
        Row: {
          amount_cents: number
          child_id: string
          created_at: string | null
          currency: string | null
          fee_assignment_id: string
          id: string
          method: Database["public"]["Enums"]["offline_payment_method"]
          notes_internal: string | null
          organization_id: string
          parent_id: string
          received_at: string
          received_by_admin_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["offline_payment_status"]
        }
        Insert: {
          amount_cents: number
          child_id: string
          created_at?: string | null
          currency?: string | null
          fee_assignment_id: string
          id?: string
          method: Database["public"]["Enums"]["offline_payment_method"]
          notes_internal?: string | null
          organization_id: string
          parent_id: string
          received_at: string
          received_by_admin_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["offline_payment_status"]
        }
        Update: {
          amount_cents?: number
          child_id?: string
          created_at?: string | null
          currency?: string | null
          fee_assignment_id?: string
          id?: string
          method?: Database["public"]["Enums"]["offline_payment_method"]
          notes_internal?: string | null
          organization_id?: string
          parent_id?: string
          received_at?: string
          received_by_admin_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["offline_payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "offline_payments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "offline_payments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "offline_payments_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_received_by_admin_id_fkey"
            columns: ["received_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_received_by_admin_id_fkey"
            columns: ["received_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_received_by_admin_id_fkey"
            columns: ["received_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      org_licenses: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          grace_ends_at: string | null
          id: string
          organization_id: string | null
          plan: Database["public"]["Enums"]["license_plan"] | null
          status: Database["public"]["Enums"]["license_status"] | null
          stripe_customer_id: string | null
          stripe_latest_invoice_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_ends_at?: string | null
          id?: string
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["license_plan"] | null
          status?: Database["public"]["Enums"]["license_status"] | null
          stripe_customer_id?: string | null
          stripe_latest_invoice_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_ends_at?: string | null
          id?: string
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["license_plan"] | null
          status?: Database["public"]["Enums"]["license_status"] | null
          stripe_customer_id?: string | null
          stripe_latest_invoice_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_payment_policies: {
        Row: {
          allow_discounts: boolean | null
          allow_installments: boolean | null
          allow_late_fees: boolean | null
          allow_partial_payments: boolean | null
          allow_scholarships: boolean | null
          created_at: string | null
          id: string
          organization_id: string
          require_offline_only: boolean | null
          require_purchase_order_ref: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_discounts?: boolean | null
          allow_installments?: boolean | null
          allow_late_fees?: boolean | null
          allow_partial_payments?: boolean | null
          allow_scholarships?: boolean | null
          created_at?: string | null
          id?: string
          organization_id: string
          require_offline_only?: boolean | null
          require_purchase_order_ref?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_discounts?: boolean | null
          allow_installments?: boolean | null
          allow_late_fees?: boolean | null
          allow_partial_payments?: boolean | null
          allow_scholarships?: boolean | null
          created_at?: string | null
          id?: string
          organization_id?: string
          require_offline_only?: boolean | null
          require_purchase_order_ref?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by_user_id: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          roles: Database["public"]["Enums"]["org_member_role"][] | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email: string
          expires_at: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          roles?: Database["public"]["Enums"]["org_member_role"][] | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          roles?: Database["public"]["Enums"]["org_member_role"][] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_mode: Database["public"]["Enums"]["billing_mode"] | null
          contact_email: string | null
          created_at: string | null
          currency: string | null
          id: string
          license_cancel_at_period_end: boolean | null
          license_current_period_end: string | null
          license_current_period_start: string | null
          license_grace_ends_at: string | null
          license_plan: Database["public"]["Enums"]["license_plan"] | null
          license_status: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"] | null
          payout_account_id: string | null
          payout_descriptor: string | null
          payout_onboarding_status:
            | Database["public"]["Enums"]["payout_onboarding_status"]
            | null
          payouts_enabled: boolean | null
          primary_city: string | null
          primary_region_radius_miles: number | null
          primary_state: string | null
          refund_policy: string | null
          slug: string | null
          status: Database["public"]["Enums"]["org_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_mode?: Database["public"]["Enums"]["billing_mode"] | null
          contact_email?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          license_cancel_at_period_end?: boolean | null
          license_current_period_end?: string | null
          license_current_period_start?: string | null
          license_grace_ends_at?: string | null
          license_plan?: Database["public"]["Enums"]["license_plan"] | null
          license_status?: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at?: string | null
          name: string
          org_type?: Database["public"]["Enums"]["org_type"] | null
          payout_account_id?: string | null
          payout_descriptor?: string | null
          payout_onboarding_status?:
            | Database["public"]["Enums"]["payout_onboarding_status"]
            | null
          payouts_enabled?: boolean | null
          primary_city?: string | null
          primary_region_radius_miles?: number | null
          primary_state?: string | null
          refund_policy?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_mode?: Database["public"]["Enums"]["billing_mode"] | null
          contact_email?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          license_cancel_at_period_end?: boolean | null
          license_current_period_end?: string | null
          license_current_period_start?: string | null
          license_grace_ends_at?: string | null
          license_plan?: Database["public"]["Enums"]["license_plan"] | null
          license_status?: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at?: string | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"] | null
          payout_account_id?: string | null
          payout_descriptor?: string | null
          payout_onboarding_status?:
            | Database["public"]["Enums"]["payout_onboarding_status"]
            | null
          payouts_enabled?: boolean | null
          primary_city?: string | null
          primary_region_radius_miles?: number | null
          primary_state?: string | null
          refund_policy?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      parent_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          child_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["parent_invite_status"]
          team_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          child_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email: string
          expires_at: string
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["parent_invite_status"]
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          child_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["parent_invite_status"]
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_invites_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "parent_invites_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "parent_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount_cents: number
          charge_id: string
          created_at: string | null
          fee_assignment_id: string | null
          id: string
          payment_id: string
        }
        Insert: {
          amount_cents: number
          charge_id: string
          created_at?: string | null
          fee_assignment_id?: string | null
          id?: string
          payment_id: string
        }
        Update: {
          amount_cents?: number
          charge_id?: string
          created_at?: string | null
          fee_assignment_id?: string | null
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "payment_allocations_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          action: string
          created_at: string | null
          created_by_user_id: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["payment_event_entity_type"]
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by_user_id?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["payment_event_entity_type"]
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by_user_id?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["payment_event_entity_type"]
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          checkout_session_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          organization_id: string
          paid_at: string | null
          parent_id: string
          platform_fee_cents: number
          status: Database["public"]["Enums"]["payment_status_new"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string
        }
        Insert: {
          amount_cents: number
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          parent_id: string
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["payment_status_new"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id: string
        }
        Update: {
          amount_cents?: number
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          parent_id?: string
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["payment_status_new"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["platform_admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["platform_admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["platform_admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_event_instances: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_exception: boolean | null
          occurrence_date: string
          pattern_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_exception?: boolean | null
          occurrence_date: string
          pattern_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_exception?: boolean | null
          occurrence_date?: string
          pattern_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_event_instances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_event_instances_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "recurring_event_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_event_patterns: {
        Row: {
          created_at: string | null
          days_of_week: number[]
          end_date: string | null
          exception_dates: string[] | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          max_occurrences: number | null
          parent_event_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_of_week: number[]
          end_date?: string | null
          exception_dates?: string[] | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          max_occurrences?: number | null
          parent_event_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_of_week?: number[]
          end_date?: string | null
          exception_dates?: string[] | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          max_occurrences?: number | null
          parent_event_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_event_patterns_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string | null
          created_by_admin_id: string
          currency: string | null
          id: string
          offline_payment_id: string | null
          organization_id: string
          payment_id: string | null
          reason: string
          stripe_refund_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          created_by_admin_id: string
          currency?: string | null
          id?: string
          offline_payment_id?: string | null
          organization_id: string
          payment_id?: string | null
          reason: string
          stripe_refund_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          created_by_admin_id?: string
          currency?: string | null
          id?: string
          offline_payment_id?: string | null
          organization_id?: string
          payment_id?: string | null
          reason?: string
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_offline_payment_id_fkey"
            columns: ["offline_payment_id"]
            isOneToOne: false
            referencedRelation: "offline_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_awards: {
        Row: {
          amount_cents: number
          awarded_at: string
          awarded_by_admin_id: string
          created_at: string | null
          fee_assignment_id: string
          id: string
          notes_internal: string | null
          scholarship_program_id: string
        }
        Insert: {
          amount_cents: number
          awarded_at?: string
          awarded_by_admin_id: string
          created_at?: string | null
          fee_assignment_id: string
          id?: string
          notes_internal?: string | null
          scholarship_program_id: string
        }
        Update: {
          amount_cents?: number
          awarded_at?: string
          awarded_by_admin_id?: string
          created_at?: string | null
          fee_assignment_id?: string
          id?: string
          notes_internal?: string | null
          scholarship_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_awards_awarded_by_admin_id_fkey"
            columns: ["awarded_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_awarded_by_admin_id_fkey"
            columns: ["awarded_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_awarded_by_admin_id_fkey"
            columns: ["awarded_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "scholarship_awards_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_scholarship_program_id_fkey"
            columns: ["scholarship_program_id"]
            isOneToOne: false
            referencedRelation: "scholarship_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_programs: {
        Row: {
          budget_cents_remaining: number | null
          budget_cents_total: number | null
          created_at: string | null
          description: string | null
          funding_source: Database["public"]["Enums"]["scholarship_funding_source"]
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["scholarship_program_status"]
          updated_at: string | null
        }
        Insert: {
          budget_cents_remaining?: number | null
          budget_cents_total?: number | null
          created_at?: string | null
          description?: string | null
          funding_source: Database["public"]["Enums"]["scholarship_funding_source"]
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["scholarship_program_status"]
          updated_at?: string | null
        }
        Update: {
          budget_cents_remaining?: number | null
          budget_cents_total?: number | null
          created_at?: string | null
          description?: string | null
          funding_source?: Database["public"]["Enums"]["scholarship_funding_source"]
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["scholarship_program_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          program_id: string | null
          sport_id: string | null
          start_date: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          program_id?: string | null
          sport_id?: string | null
          start_date: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          program_id?: string | null
          sport_id?: string | null
          start_date?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          season_id: string
          status: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          season_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          season_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "team_memberships_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          level_id: string | null
          name: string
          org_id: string
          program_id: string | null
          sport_id: string | null
          max_roster_size: number | null
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_id?: string | null
          name: string
          org_id: string
          program_id?: string | null
          sport_id?: string | null
          max_roster_size?: number | null
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level_id?: string | null
          name?: string
          org_id?: string
          program_id?: string | null
          sport_id?: string | null
          max_roster_size?: number | null
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_plans: {
        Row: {
          created_at: string | null
          end_date: string
          hotel_address: string | null
          hotel_confirmation: string | null
          hotel_name: string | null
          hotel_phone: string | null
          id: string
          location: string
          notes: string | null
          season_id: string
          start_date: string
          team_id: string
          title: string
          updated_at: string | null
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          id?: string
          location: string
          notes?: string | null
          season_id: string
          start_date: string
          team_id: string
          title: string
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          id?: string
          location?: string
          notes?: string | null
          season_id?: string
          start_date?: string
          team_id?: string
          title?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_plans_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "travel_plans_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "travel_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_registration_documents: {
        Row: {
          content_type: string | null
          created_at: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          registration_id: string
          required_document_id: string
          status: Database["public"]["Enums"]["tryout_document_status"]
          storage_bucket: string
          storage_path: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          registration_id: string
          required_document_id: string
          status?: Database["public"]["Enums"]["tryout_document_status"]
          storage_bucket?: string
          storage_path?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          registration_id?: string
          required_document_id?: string
          status?: Database["public"]["Enums"]["tryout_document_status"]
          storage_bucket?: string
          storage_path?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryout_registration_documents_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tryout_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_documents_required_document_id_fkey"
            columns: ["required_document_id"]
            isOneToOne: false
            referencedRelation: "tryout_required_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_registration_staff_notes: {
        Row: {
          author_user_id: string
          created_at: string | null
          id: string
          note: string
          registration_id: string
          updated_at: string | null
        }
        Insert: {
          author_user_id: string
          created_at?: string | null
          id?: string
          note: string
          registration_id: string
          updated_at?: string | null
        }
        Update: {
          author_user_id?: string
          created_at?: string | null
          id?: string
          note?: string
          registration_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryout_registration_staff_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_staff_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_staff_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registration_staff_notes_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tryout_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_registrations: {
        Row: {
          child_id: string
          created_at: string | null
          family_id: string
          id: string
          jersey_number: number | null
          notes: string | null
          offer_deadline: string | null
          status: Database["public"]["Enums"]["tryout_registration_status"]
          tryout_id: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          family_id: string
          id?: string
          jersey_number?: number | null
          notes?: string | null
          offer_deadline?: string | null
          status?: Database["public"]["Enums"]["tryout_registration_status"]
          tryout_id: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          family_id?: string
          id?: string
          jersey_number?: number | null
          notes?: string | null
          offer_deadline?: string | null
          status?: Database["public"]["Enums"]["tryout_registration_status"]
          tryout_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryout_registrations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "tryout_registrations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registrations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registrations_tryout_id_fkey"
            columns: ["tryout_id"]
            isOneToOne: false
            referencedRelation: "tryouts"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_required_documents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          label: string
          required: boolean
          tryout_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          required?: boolean
          tryout_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          required?: boolean
          tryout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tryout_required_documents_tryout_id_fkey"
            columns: ["tryout_id"]
            isOneToOne: false
            referencedRelation: "tryouts"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_scores: {
        Row: {
          category: string
          coach_id: string
          created_at: string | null
          criteria_id: string | null
          id: string
          notes: string | null
          registration_id: string
          score: number
          updated_at: string | null
        }
        Insert: {
          category: string
          coach_id: string
          created_at?: string | null
          criteria_id?: string | null
          id?: string
          notes?: string | null
          registration_id: string
          score: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          coach_id?: string
          created_at?: string | null
          criteria_id?: string | null
          id?: string
          notes?: string | null
          registration_id?: string
          score?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryout_scores_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_scores_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_scores_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_scores_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tryout_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tryouts: {
        Row: {
          age_group: string
          created_at: string | null
          end_time: string | null
          entry_fee: number | null
          id: string
          location: string
          max_spots: number | null
          org_id: string
          requirements: string[] | null
          sport: string
          start_time: string
          title: string
          tryout_date: string
          updated_at: string | null
          what_to_bring: string[] | null
        }
        Insert: {
          age_group: string
          created_at?: string | null
          end_time?: string | null
          entry_fee?: number | null
          id?: string
          location: string
          max_spots?: number | null
          org_id: string
          requirements?: string[] | null
          sport: string
          start_time: string
          title: string
          tryout_date: string
          updated_at?: string | null
          what_to_bring?: string[] | null
        }
        Update: {
          age_group?: string
          created_at?: string | null
          end_time?: string | null
          entry_fee?: number | null
          id?: string
          location?: string
          max_spots?: number | null
          org_id?: string
          requirements?: string[] | null
          sport?: string
          start_time?: string
          title?: string
          tryout_date?: string
          updated_at?: string | null
          what_to_bring?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tryouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tryouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tryouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_kit_items: {
        Row: {
          created_at: string | null
          id: string
          kit_id: string
          name: string
          required: boolean
          size_options: Json
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kit_id: string
          name: string
          required?: boolean
          size_options?: Json
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kit_id?: string
          name?: string
          required?: boolean
          size_options?: Json
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniform_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "uniform_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_kits: {
        Row: {
          created_at: string | null
          created_by: string | null
          deadline_at: string | null
          id: string
          locked_at: string | null
          name: string
          season_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deadline_at?: string | null
          id?: string
          locked_at?: string | null
          name: string
          season_id: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deadline_at?: string | null
          id?: string
          locked_at?: string | null
          name?: string
          season_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniform_kits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_kits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_kits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_kits_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "uniform_kits_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_kits_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "uniform_kits_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_orders: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          jersey_size: string
          notes: string | null
          season_id: string
          shorts_size: string
          socks_size: string
          status: Database["public"]["Enums"]["uniform_order_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          jersey_size: string
          notes?: string | null
          season_id: string
          shorts_size: string
          socks_size: string
          status?: Database["public"]["Enums"]["uniform_order_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          jersey_size?: string
          notes?: string | null
          season_id?: string
          shorts_size?: string
          socks_size?: string
          status?: Database["public"]["Enums"]["uniform_order_status"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniform_orders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "uniform_orders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_orders_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "uniform_orders_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "uniform_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_submission_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          size: string
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          size: string
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          size?: string
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniform_submission_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "uniform_kit_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "uniform_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_submissions: {
        Row: {
          child_id: string
          created_at: string | null
          fulfilled_at: string | null
          id: string
          kit_id: string
          locked_at: string | null
          status: Database["public"]["Enums"]["uniform_submission_status"]
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          kit_id: string
          locked_at?: string | null
          status?: Database["public"]["Enums"]["uniform_submission_status"]
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          kit_id?: string
          locked_at?: string | null
          status?: Database["public"]["Enums"]["uniform_submission_status"]
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniform_submissions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "uniform_submissions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_submissions_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "uniform_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          family_id: string | null
          id: string
          org_id: string | null
          permissions: Json | null
          phone: string | null
          preferences: Json | null
          requires_org_setup: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          family_id?: string | null
          id: string
          org_id?: string | null
          permissions?: Json | null
          phone?: string | null
          preferences?: Json | null
          requires_org_setup?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          family_id?: string | null
          id?: string
          org_id?: string | null
          permissions?: Json | null
          phone?: string | null
          preferences?: Json | null
          requires_org_setup?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          team_id?: string | null
          type: string
          kit_id?: string | null
          title: string
          body: string
          payload?: Json | null
          dedupe_key: string
          read_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          team_id?: string | null
          type?: string
          kit_id?: string | null
          title?: string
          body?: string
          payload?: Json | null
          dedupe_key?: string
          read_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "uniform_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      valid_event_types: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          description: string | null
          enum_name: string
          event_type: string
        }
        Insert: {
          category: Database["public"]["Enums"]["event_category"]
          description?: string | null
          enum_name: string
          event_type: string
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          description?: string | null
          enum_name?: string
          event_type?: string
        }
        Relationships: []
      }
      waivers: {
        Row: {
          amount_cents: number
          created_at: string | null
          created_by_admin_id: string
          fee_assignment_id: string
          id: string
          organization_id: string
          reason: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          created_by_admin_id: string
          fee_assignment_id: string
          id?: string
          organization_id: string
          reason: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          created_by_admin_id?: string
          fee_assignment_id?: string
          id?: string
          organization_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "waivers_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["fee_assignment_id"]
          },
          {
            foreignKeyName: "waivers_fee_assignment_id_fkey"
            columns: ["fee_assignment_id"]
            isOneToOne: false
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_event_logs: {
        Row: {
          actor_email: string | null
          actor_name: string | null
          actor_role: Database["public"]["Enums"]["event_actor_role"] | null
          actor_user_id: string | null
          category: Database["public"]["Enums"]["event_category"] | null
          created_at: string | null
          event_type: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          org_id: string | null
          organization_name: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_feature_flag_audit: {
        Row: {
          action: string | null
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          environment:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_flag_id: string | null
          feature_key: string | null
          id: string | null
          new_value: Json | null
          old_value: Json | null
          scope_id: string | null
          scope_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_flags_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_feature_flag_overrides: {
        Row: {
          created_at: string | null
          environment:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_flag_id: string | null
          feature_key: string | null
          override_type: string | null
          scope_id: string | null
          scope_name: string | null
          updated_at: string | null
          value_boolean: boolean | null
          value_double: number | null
          value_integer: number | null
          version: number | null
        }
        Relationships: []
      }
      admin_feature_flags: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          feature_key: string | null
          id: string | null
          organization_id: string | null
          organization_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_feature_flags_list: {
        Row: {
          created_at: string | null
          default_value_boolean: boolean | null
          default_value_double: number | null
          default_value_integer: number | null
          deleted_at: string | null
          description: string | null
          environment:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          id: string | null
          key: string | null
          org_override_count: number | null
          updated_at: string | null
          user_override_count: number | null
          value_type:
            | Database["public"]["Enums"]["feature_flag_value_type"]
            | null
          version: number | null
        }
        Relationships: []
      }
      admin_fees_status: {
        Row: {
          amount_cents: number | null
          assigned_count: number | null
          currency: string | null
          due_date: string | null
          fee_id: string | null
          fee_name: string | null
          fee_status: Database["public"]["Enums"]["fee_status"] | null
          organization_id: string | null
          organization_name: string | null
          paid_count: number | null
          payment_rate_percent: number | null
          unpaid_count: number | null
        }
        Relationships: []
      }
      admin_organizations: {
        Row: {
          created_at: string | null
          id: string | null
          license_current_period_end: string | null
          license_plan: Database["public"]["Enums"]["license_plan"] | null
          license_status: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at: string | null
          name: string | null
          org_type: Database["public"]["Enums"]["org_type"] | null
          payout_account_id: string | null
          payouts_enabled: boolean | null
          sport_count: number | null
          status: Database["public"]["Enums"]["org_status"] | null
          stripe_connected: boolean | null
          team_count: number | null
          updated_at: string | null
          user_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          license_current_period_end?: string | null
          license_plan?: Database["public"]["Enums"]["license_plan"] | null
          license_status?: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at?: string | null
          name?: string | null
          org_type?: Database["public"]["Enums"]["org_type"] | null
          payout_account_id?: string | null
          payouts_enabled?: boolean | null
          sport_count?: never
          status?: Database["public"]["Enums"]["org_status"] | null
          stripe_connected?: never
          team_count?: never
          updated_at?: string | null
          user_count?: never
        }
        Update: {
          created_at?: string | null
          id?: string | null
          license_current_period_end?: string | null
          license_plan?: Database["public"]["Enums"]["license_plan"] | null
          license_status?: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at?: string | null
          name?: string | null
          org_type?: Database["public"]["Enums"]["org_type"] | null
          payout_account_id?: string | null
          payouts_enabled?: boolean | null
          sport_count?: never
          status?: Database["public"]["Enums"]["org_status"] | null
          stripe_connected?: never
          team_count?: never
          updated_at?: string | null
          user_count?: never
        }
        Relationships: []
      }
      admin_payments: {
        Row: {
          amount_cents: number | null
          child_id: string | null
          child_name: string | null
          created_at: string | null
          currency: string | null
          fee_assignment_id: string | null
          fee_id: string | null
          fee_title: string | null
          id: string | null
          organization_id: string | null
          organization_name: string | null
          parent_email: string | null
          parent_name: string | null
          status: Database["public"]["Enums"]["payment_status_new"] | null
          stripe_payment_intent_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["fee_id"]
          },
          {
            foreignKeyName: "fee_assignments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_platform_health: {
        Row: {
          active_organizations: number | null
          failed_payments: number | null
          platform_admin_count: number | null
          successful_payments: number | null
          suspended_organizations: number | null
          total_children: number | null
          total_payment_volume_cents: number | null
          total_teams: number | null
          total_users: number | null
          trial_organizations: number | null
        }
        Relationships: []
      }
      admin_structure: {
        Row: {
          organization_id: string | null
          organization_name: string | null
          player_count: number | null
          season_active: boolean | null
          season_id: string | null
          season_name: string | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          email_confirmed: boolean | null
          id: string | null
          is_platform_admin: boolean | null
          last_sign_in_at: string | null
          organizations: Json | null
          phone: string | null
          roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          email_confirmed?: never
          id?: string | null
          is_platform_admin?: never
          last_sign_in_at?: never
          organizations?: never
          phone?: string | null
          roles?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          email_confirmed?: never
          id?: string | null
          is_platform_admin?: never
          last_sign_in_at?: never
          organizations?: never
          phone?: string | null
          roles?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      event_logs_recent: {
        Row: {
          actor_email: string | null
          actor_name: string | null
          actor_role: Database["public"]["Enums"]["event_actor_role"] | null
          actor_user_id: string | null
          category: Database["public"]["Enums"]["event_category"] | null
          created_at: string | null
          event_type: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          org_id: string | null
          organization_name: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users_legacy: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          family_id: string | null
          id: string | null
          org_id: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_organization_invite: {
        Args: { p_token: string }
        Returns: {
          message: string
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["org_member_role"]
          success: boolean
        }[]
      }
      accept_parent_invite: {
        Args: { p_token: string }
        Returns: {
          child_id: string
          message: string
          organization_id: string
          success: boolean
        }[]
      }
      add_org_role: {
        Args: {
          p_org_id: string
          p_role: Database["public"]["Enums"]["org_member_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      admin_activate_organization: {
        Args: { reason: string; target_org_id: string }
        Returns: Json
      }
      admin_add_platform_admin: {
        Args: {
          reason: string
          target_email: string
          target_role: Database["public"]["Enums"]["platform_admin_role"]
        }
        Returns: Json
      }
      admin_attach_parents_to_child: {
        Args: {
          p_child_id: string
          p_expires_in_days?: number
          p_org_id: string
          p_parent_emails: string[]
          p_team_id?: string
        }
        Returns: {
          email: string
          message: string
          status: Database["public"]["Enums"]["parent_invite_status"]
          token: string
          user_id: string
        }[]
      }
      admin_create_feature_flag: {
        Args: {
          p_description?: string
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_key: string
          p_value_type: Database["public"]["Enums"]["feature_flag_value_type"]
        }
        Returns: Json
      }
      admin_delete_feature_flag: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_feature_flag_id: string
          p_reason: string
        }
        Returns: Json
      }
      admin_disable_user: {
        Args: { reason: string; target_user_id: string }
        Returns: Json
      }
      admin_enable_user: {
        Args: { reason: string; target_user_id: string }
        Returns: Json
      }
      admin_remove_org_override: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_expected_version?: number
          p_feature_flag_id: string
          p_org_id: string
          p_reason: string
        }
        Returns: Json
      }
      admin_remove_platform_admin: {
        Args: { reason: string; target_user_id: string }
        Returns: Json
      }
      admin_remove_user_override: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_expected_version?: number
          p_feature_flag_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_restore_feature_flag: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_feature_flag_id: string
          p_reason: string
        }
        Returns: Json
      }
      admin_set_feature_flag: {
        Args: {
          reason: string
          target_enabled: boolean
          target_feature_key: string
          target_org_id: string
        }
        Returns: Json
      }
      admin_set_org_override: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_expected_version?: number
          p_feature_flag_id: string
          p_org_id: string
          p_reason: string
          p_value_boolean?: boolean
          p_value_double?: number
          p_value_integer?: number
        }
        Returns: Json
      }
      admin_set_platform_default: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_expected_version?: number
          p_feature_flag_id: string
          p_reason: string
          p_value_boolean?: boolean
          p_value_double?: number
          p_value_integer?: number
        }
        Returns: Json
      }
      admin_set_user_override: {
        Args: {
          p_environment: Database["public"]["Enums"]["feature_flag_environment"]
          p_expected_version?: number
          p_feature_flag_id: string
          p_reason: string
          p_user_id: string
          p_value_boolean?: boolean
          p_value_double?: number
          p_value_integer?: number
        }
        Returns: Json
      }
      admin_suspend_organization: {
        Args: { reason: string; target_org_id: string }
        Returns: Json
      }
      archive_old_event_logs: {
        Args: { p_retention_days?: number }
        Returns: {
          archived_count: number
        }[]
      }
      can_perform_admin_action: {
        Args: {
          required_roles: Database["public"]["Enums"]["platform_admin_role"][]
        }
        Returns: boolean
      }
      check_platform_admin: { Args: never; Returns: boolean }
      clear_travel_override: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      complete_payment_processing: {
        Args: { p_checkout_session_id: string; p_payment_id: string }
        Returns: undefined
      }
      convert_accepted_tryout_registration_to_team_member: {
        Args: {
          p_registration_id: string
          p_season_id: string
          p_team_id: string
        }
        Returns: string
      }
      create_child_claim_token: {
        Args: {
          p_child_id: string
          p_expires_in_days?: number
          p_org_id: string
          p_season_id: string
          p_team_id: string
        }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      create_join_link: {
        Args: {
          p_auto_approve?: boolean
          p_expires_in_days?: number
          p_org_id: string
          p_team_id?: string
        }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      create_organization_invite:
        | {
            Args: {
              p_email: string
              p_expires_in_days?: number
              p_org_id: string
              p_role?: Database["public"]["Enums"]["org_member_role"]
            }
            Returns: {
              expires_at: string
              invite_token: string
            }[]
          }
        | {
            Args: {
              p_email: string
              p_expires_in_days?: number
              p_org_id: string
              p_roles?: Database["public"]["Enums"]["org_member_role"][]
            }
            Returns: {
              expires_at: string
              invite_token: string
            }[]
          }
      create_uniform_kit: {
        Args: {
          p_deadline_at: string
          p_items: Json
          p_name: string
          p_season_id: string
          p_team_id: string
        }
        Returns: string
      }
      format_event_location_address: {
        Args: { p_location_id: string }
        Returns: string
      }
      generate_recurring_event_instances: {
        Args: {
          p_pattern_id: string
          p_start_date: string
          p_template_event_id: string
        }
        Returns: number
      }
      get_environment_from_url: {
        Args: never
        Returns: Database["public"]["Enums"]["feature_flag_environment"]
      }
      get_event_location_maps_url: {
        Args: { p_location_id: string }
        Returns: string
      }
      get_event_rsvp_summary: {
        Args: { p_event_id: string }
        Returns: {
          going_count: number
          late_count: number
          not_going_count: number
          response_rate: number
          total_children: number
          unknown_count: number
        }[]
      }
      is_child_eligible_for_event: {
        Args: { p_child_id: string; p_event_id: string }
        Returns: boolean
      }
      update_event_rsvp_config: {
        Args: {
          p_event_id: string
          p_rsvp_enabled: boolean
          p_rsvp_type: string | null
          p_clear_existing?: boolean
        }
        Returns: { error?: string; has_data?: boolean }
      }
      get_invite_details: {
        Args: { p_token: string }
        Returns: {
          already_accepted: boolean
          email: string
          expired: boolean
          expires_at: string
          message: string
          organization_name: string
          role: Database["public"]["Enums"]["org_member_role"]
          valid: boolean
        }[]
      }
      get_pending_invites_for_user: {
        Args: never
        Returns: {
          expires_at: string
          invite_token: string
          organization_name: string
          role: Database["public"]["Enums"]["org_member_role"]
        }[]
      }
      get_platform_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["platform_admin_role"]
      }
      get_travel_events_for_team: {
        Args: { p_team_id: string; p_upcoming_only?: boolean }
        Returns: {
          end_time: string
          event_id: string
          hotel_address: string
          hotel_name: string
          location_city: string
          location_state: string
          start_time: string
          title: string
        }[]
      }
      get_uniform_kit_roster: {
        Args: { p_kit_id: string }
        Returns: {
          child_id: string
          deadline_at: string
          first_name: string
          fulfilled_at: string
          items: Json
          kit_id: string
          kit_locked_at: string
          kit_name: string
          last_name: string
          season_id: string
          submission_id: string
          submission_locked_at: string
          submission_status: Database["public"]["Enums"]["uniform_submission_status"]
          submitted_at: string
          team_id: string
        }[]
      }
      get_user_actor_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["event_actor_role"]
      }
      get_user_children: { Args: { check_user_id: string }; Returns: string[] }
      get_user_organizations: {
        Args: { check_user_id: string }
        Returns: {
          org_name: string
          organization_id: string
          roles: Database["public"]["Enums"]["org_member_role"][]
        }[]
      }
      get_user_roles_for_org: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: Database["public"]["Enums"]["org_member_role"][]
      }
      is_org_license_active: { Args: { org_id: string }; Returns: boolean }
      is_org_license_readonly_allowed: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_parent_of_child: {
        Args: { check_child_id: string; check_user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_travel_event: { Args: { p_event_id: string }; Returns: boolean }
      lock_uniform_kit: { Args: { p_kit_id: string }; Returns: undefined }
      log_event: {
        Args: {
          p_actor_role: Database["public"]["Enums"]["event_actor_role"]
          p_actor_user_id?: string
          p_category: Database["public"]["Enums"]["event_category"]
          p_event_type: string
          p_idempotency_key?: string
          p_ip_address?: string
          p_metadata?: Json
          p_org_id?: string
          p_target_entity_id?: string
          p_target_entity_type?: string
          p_user_agent?: string
        }
        Returns: string
      }
      mark_uniform_submission_fulfilled: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      parent_can_access_team_via_membership: {
        Args: {
          check_season_id: string
          check_team_id: string
          check_user_id: string
        }
        Returns: boolean
      }
      process_payment_allocation: {
        Args: { p_amount_cents: number; p_fee_assignment_id: string }
        Returns: undefined
      }
      redeem_child_claim_token: {
        Args: { p_token: string }
        Returns: {
          child_id: string
          message: string
          organization_id: string
          success: boolean
        }[]
      }
      refresh_event_logs_recent: { Args: never; Returns: undefined }
      register_child_for_tryout: {
        Args: { p_child_id: string; p_tryout_id: string }
        Returns: string
      }
      remove_org_role: {
        Args: {
          p_org_id: string
          p_role: Database["public"]["Enums"]["org_member_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      resolve_feature_flag: {
        Args: {
          p_environment?: Database["public"]["Enums"]["feature_flag_environment"]
          p_feature_key: string
          p_org_id?: string
          p_user_id?: string
        }
        Returns: Json
      }
      resolve_feature_flags: {
        Args: {
          p_environment?: Database["public"]["Enums"]["feature_flag_environment"]
          p_feature_keys: string[]
          p_org_id?: string
          p_user_id?: string
        }
        Returns: Json
      }
      review_join_request: {
        Args: {
          p_approve: boolean
          p_decision_reason?: string
          p_request_id: string
        }
        Returns: {
          message: string
          request_id: string
          status: Database["public"]["Enums"]["join_request_status"]
        }[]
      }
      revoke_organization_invite: {
        Args: { p_invite_id: string }
        Returns: boolean
      }
      sanitize_metadata: { Args: { p_metadata: Json }; Returns: Json }
      set_travel_override: {
        Args: { p_event_id: string; p_is_travel: boolean; p_reason?: string }
        Returns: undefined
      }
      staff_can_access_team: {
        Args: { check_team_id: string; check_user_id: string }
        Returns: boolean
      }
      submit_join_request: {
        Args: {
          p_child_id: string
          p_link_token: string
          p_season_id: string
          p_team_id?: string
        }
        Returns: {
          message: string
          request_id: string
          status: Database["public"]["Enums"]["join_request_status"]
        }[]
      }
      submit_uniform_sizes: {
        Args: { p_child_id: string; p_items: Json; p_kit_id: string }
        Returns: string
      }
      sync_org_license_summary: { Args: { org_id: string }; Returns: undefined }
      sync_rsvp_to_attendance: { Args: { p_event_id: string }; Returns: number }
      user_has_all_org_roles: {
        Args: {
          check_org_id: string
          check_roles: Database["public"]["Enums"]["org_member_role"][]
          check_user_id: string
        }
        Returns: boolean
      }
      user_has_any_org_roles: {
        Args: {
          check_org_id: string
          check_roles: Database["public"]["Enums"]["org_member_role"][]
          check_user_id: string
        }
        Returns: boolean
      }
      user_has_org_access: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      user_has_org_role: {
        Args: {
          check_org_id: string
          check_role: Database["public"]["Enums"]["org_member_role"]
          check_user_id: string
        }
        Returns: boolean
      }
      user_is_guardian_of_child: {
        Args: { check_child_id: string; check_user_id: string }
        Returns: boolean
      }
      user_is_org_admin: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      validate_event_type: {
        Args: {
          p_category: Database["public"]["Enums"]["event_category"]
          p_event_type: string
        }
        Returns: boolean
      }
    }
    Enums: {
      admin_event_type:
        | "ACTIVATE_ORGANIZATION"
        | "SUSPEND_ORGANIZATION"
        | "DISABLE_USER"
        | "ENABLE_USER"
        | "SET_FEATURE_FLAG"
        | "ADD_PLATFORM_ADMIN"
        | "REMOVE_PLATFORM_ADMIN"
        | "UPDATE_PLATFORM_ADMIN"
        | "PII_VIEWED"
        | "ISSUE_REFUND"
        | "MARK_DISPUTE"
        | "RESEND_VERIFICATION"
        | "FORCE_LOGOUT"
      attendance_status: "going" | "late" | "not_going"
      auth_event_type:
        | "USER_SIGNED_UP"
        | "USER_LOGGED_IN"
        | "USER_LOGGED_OUT"
        | "PASSWORD_RESET_REQUESTED"
        | "PASSWORD_RESET_COMPLETED"
        | "EMAIL_VERIFIED"
        | "EMAIL_VERIFICATION_SENT"
        | "ACCOUNT_DISABLED"
        | "ACCOUNT_ENABLED"
      billing_mode: "platform_facilitated" | "offline_only"
      calendar_event_type:
        | "EVENT_CREATED"
        | "EVENT_UPDATED"
        | "EVENT_DELETED"
        | "EVENT_CANCELLED"
        | "EVENT_RSVP_SUBMITTED"
        | "EVENT_RSVP_UPDATED"
      charge_status: "pending" | "applied" | "voided"
      charge_type:
        | "fee_payment"
        | "late_fee"
        | "discount"
        | "scholarship_credit"
        | "waiver_credit"
        | "adjustment"
      checkout_session_status:
        | "created"
        | "in_progress"
        | "succeeded"
        | "canceled"
        | "expired"
      child_event_type:
        | "CHILD_CREATED"
        | "CHILD_UPDATED"
        | "CHILD_DELETED"
        | "CHILD_PROFILE_UPDATED"
      child_guardian_status: "active" | "pending" | "removed"
      discount_code_status: "active" | "inactive"
      discount_type: "percent" | "fixed"
      event_actor_role:
        | "platform_admin"
        | "org_admin"
        | "coach"
        | "parent"
        | "system"
      event_attendance_status: "present" | "absent" | "late" | "excused"
      event_category:
        | "AUTH"
        | "ORGANIZATION"
        | "USER"
        | "PARENT"
        | "CHILD"
        | "TEAM"
        | "SEASON"
        | "EVENT"
        | "PAYMENT"
        | "TRYOUT"
        | "TRAVEL"
        | "UNIFORM"
        | "FEATURE_FLAG"
        | "ADMIN"
        | "SYSTEM"
      event_type:
        | "practice"
        | "game"
        | "tournament"
        | "meeting"
        | "tryout"
        | "travel"
        | "pickup_dropoff"
        | "social"
        | "blackout"
      feature_flag_environment: "dev" | "staging" | "prod"
      feature_flag_event_type:
        | "FEATURE_FLAG_ENABLED"
        | "FEATURE_FLAG_DISABLED"
        | "FEATURE_FLAG_OVERRIDE_CREATED"
        | "FEATURE_FLAG_OVERRIDE_DELETED"
      feature_flag_value_type: "boolean" | "integer" | "double"
      fee_assignment_status:
        | "unpaid"
        | "partial"
        | "paid"
        | "refunded"
        | "waived"
        | "scholarship_applied"
        | "offline_recorded"
      fee_scope: "team" | "selected_players" | "individual"
      fee_status: "draft" | "published" | "closed" | "archived"
      fee_type:
        | "registration"
        | "uniform"
        | "tournament"
        | "travel"
        | "fundraiser"
        | "misc"
      fee_visibility: "all_parents" | "assigned_only"
      general_rsvp_status: "going" | "not_going" | "maybe"
      installment_frequency: "weekly" | "biweekly" | "monthly"
      installment_schedule_status:
        | "active"
        | "completed"
        | "defaulted"
        | "canceled"
      installment_status:
        | "upcoming"
        | "due"
        | "paid"
        | "late"
        | "skipped"
        | "waived"
      join_request_status: "pending" | "approved" | "denied"
      level_type: "age" | "grade" | "skill" | "custom"
      license_plan: "starter" | "standard" | "pro"
      license_status: "trial" | "active" | "past_due" | "canceled" | "expired"
      membership_status: "active" | "invited" | "removed"
      offline_payment_method: "cash" | "check" | "external_processor" | "other"
      offline_payment_status: "recorded" | "voided"
      org_member_role: "parent" | "coach" | "org_admin"
      org_status: "trial" | "active" | "suspended" | "expired"
      org_type: "school" | "club" | "league" | "academy" | "aau"
      organization_event_type:
        | "ORG_CREATED"
        | "ORG_UPDATED"
        | "ORG_ACTIVATED"
        | "ORG_SUSPENDED"
        | "ORG_DELETED"
        | "ORG_STRIPE_CONNECTED"
        | "ORG_STRIPE_DISCONNECTED"
        | "ORG_LICENSE_UPDATED"
      parent_event_type:
        | "PARENT_PROFILE_UPDATED"
        | "PARENT_EMAIL_CHANGED"
        | "PARENT_PHONE_CHANGED"
      parent_invite_status: "pending" | "accepted" | "cancelled" | "expired"
      payment_event_entity_type:
        | "fee"
        | "fee_assignment"
        | "charge"
        | "checkout_session"
        | "payment"
        | "offline_payment"
        | "refund"
        | "waiver"
        | "scholarship_award"
        | "discount_redemption"
      payment_event_type:
        | "FEE_CREATED"
        | "FEE_UPDATED"
        | "FEE_DELETED"
        | "FEE_ASSIGNED"
        | "FEE_UNASSIGNED"
        | "PAYMENT_STARTED"
        | "PAYMENT_SUCCEEDED"
        | "PAYMENT_FAILED"
        | "PAYMENT_REFUNDED"
        | "PAYMENT_PARTIALLY_REFUNDED"
        | "OFFLINE_PAYMENT_RECORDED"
        | "OFFLINE_PAYMENT_VOIDED"
        | "DISCOUNT_APPLIED"
        | "WAIVER_APPLIED"
        | "SCHOLARSHIP_APPLIED"
      payment_status: "due" | "paid" | "refunded"
      payment_status_new:
        | "pending"
        | "succeeded"
        | "failed"
        | "refunded"
        | "partially_refunded"
      payout_onboarding_status: "pending" | "completed" | "restricted"
      platform_admin_role:
        | "super_admin"
        | "support_admin"
        | "finance_admin"
        | "ops_admin"
      recurrence_frequency: "weekly" | "custom"
      rsvp_status: "going" | "late" | "not_going" | "unknown"
      scholarship_funding_source:
        | "org_funded"
        | "sponsor_funded"
        | "district_funded"
      scholarship_program_status: "active" | "inactive"
      season_event_type:
        | "SEASON_CREATED"
        | "SEASON_UPDATED"
        | "SEASON_DELETED"
        | "SEASON_ACTIVATED"
        | "SEASON_ARCHIVED"
      start_date_rule: "on_publish" | "custom_date"
      system_event_type:
        | "SCHEDULED_JOB_STARTED"
        | "SCHEDULED_JOB_COMPLETED"
        | "SCHEDULED_JOB_FAILED"
        | "WEBHOOK_RECEIVED"
        | "WEBHOOK_PROCESSED"
        | "WEBHOOK_FAILED"
        | "DATABASE_BACKUP"
        | "SYSTEM_ALERT"
      team_event_type:
        | "TEAM_CREATED"
        | "TEAM_UPDATED"
        | "TEAM_DELETED"
        | "TEAM_MEMBER_ADDED"
        | "TEAM_MEMBER_REMOVED"
        | "TEAM_INVITE_SENT"
        | "TEAM_INVITE_ACCEPTED"
      travel_event_type:
        | "TRAVEL_PLAN_CREATED"
        | "TRAVEL_PLAN_UPDATED"
        | "TRAVEL_PLAN_DELETED"
        | "TRAVEL_ITINERARY_UPDATED"
        | "TRAVEL_BOOKING_CONFIRMED"
      tryout_document_status: "missing" | "uploaded" | "approved" | "rejected"
      tryout_event_type:
        | "TRYOUT_CREATED"
        | "TRYOUT_UPDATED"
        | "TRYOUT_DELETED"
        | "TRYOUT_REGISTRATION_STARTED"
        | "TRYOUT_REGISTRATION_COMPLETED"
        | "TRYOUT_CHECKED_IN"
        | "TRYOUT_EVALUATED"
        | "TRYOUT_OFFERED"
        | "TRYOUT_ACCEPTED"
        | "TRYOUT_DECLINED"
        | "TRYOUT_REJECTED"
      tryout_registration_status:
        | "registered"
        | "checked_in"
        | "evaluated"
        | "offered"
        | "accepted"
        | "declined"
        | "rejected"
        | "withdrawn"
        | "waitlisted"
        | "not_selected"
      uniform_event_type:
        | "UNIFORM_KIT_CREATED"
        | "UNIFORM_KIT_UPDATED"
        | "UNIFORM_ORDER_SUBMITTED"
        | "UNIFORM_ORDER_UPDATED"
        | "UNIFORM_ORDER_FULFILLED"
      uniform_order_status: "pending" | "ordered" | "delivered"
      uniform_submission_status:
        | "not_submitted"
        | "submitted"
        | "locked"
        | "fulfilled"
      user_event_type:
        | "USER_CREATED"
        | "USER_UPDATED"
        | "USER_DELETED"
        | "USER_ROLE_CHANGED"
        | "USER_ORG_JOINED"
        | "USER_ORG_LEFT"
      user_role: "parent" | "coach" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_event_type: [
        "ACTIVATE_ORGANIZATION",
        "SUSPEND_ORGANIZATION",
        "DISABLE_USER",
        "ENABLE_USER",
        "SET_FEATURE_FLAG",
        "ADD_PLATFORM_ADMIN",
        "REMOVE_PLATFORM_ADMIN",
        "UPDATE_PLATFORM_ADMIN",
        "PII_VIEWED",
        "ISSUE_REFUND",
        "MARK_DISPUTE",
        "RESEND_VERIFICATION",
        "FORCE_LOGOUT",
      ],
      attendance_status: ["going", "late", "not_going"],
      auth_event_type: [
        "USER_SIGNED_UP",
        "USER_LOGGED_IN",
        "USER_LOGGED_OUT",
        "PASSWORD_RESET_REQUESTED",
        "PASSWORD_RESET_COMPLETED",
        "EMAIL_VERIFIED",
        "EMAIL_VERIFICATION_SENT",
        "ACCOUNT_DISABLED",
        "ACCOUNT_ENABLED",
      ],
      billing_mode: ["platform_facilitated", "offline_only"],
      calendar_event_type: [
        "EVENT_CREATED",
        "EVENT_UPDATED",
        "EVENT_DELETED",
        "EVENT_CANCELLED",
        "EVENT_RSVP_SUBMITTED",
        "EVENT_RSVP_UPDATED",
      ],
      charge_status: ["pending", "applied", "voided"],
      charge_type: [
        "fee_payment",
        "late_fee",
        "discount",
        "scholarship_credit",
        "waiver_credit",
        "adjustment",
      ],
      checkout_session_status: [
        "created",
        "in_progress",
        "succeeded",
        "canceled",
        "expired",
      ],
      child_event_type: [
        "CHILD_CREATED",
        "CHILD_UPDATED",
        "CHILD_DELETED",
        "CHILD_PROFILE_UPDATED",
      ],
      child_guardian_status: ["active", "pending", "removed"],
      discount_code_status: ["active", "inactive"],
      discount_type: ["percent", "fixed"],
      event_actor_role: [
        "platform_admin",
        "org_admin",
        "coach",
        "parent",
        "system",
      ],
      event_attendance_status: ["present", "absent", "late", "excused"],
      event_category: [
        "AUTH",
        "ORGANIZATION",
        "USER",
        "PARENT",
        "CHILD",
        "TEAM",
        "SEASON",
        "EVENT",
        "PAYMENT",
        "TRYOUT",
        "TRAVEL",
        "UNIFORM",
        "FEATURE_FLAG",
        "ADMIN",
        "SYSTEM",
      ],
      event_type: [
        "practice",
        "game",
        "tournament",
        "meeting",
        "tryout",
        "travel",
        "pickup_dropoff",
        "social",
        "blackout",
      ],
      feature_flag_environment: ["dev", "staging", "prod"],
      feature_flag_event_type: [
        "FEATURE_FLAG_ENABLED",
        "FEATURE_FLAG_DISABLED",
        "FEATURE_FLAG_OVERRIDE_CREATED",
        "FEATURE_FLAG_OVERRIDE_DELETED",
      ],
      feature_flag_value_type: ["boolean", "integer", "double"],
      fee_assignment_status: [
        "unpaid",
        "partial",
        "paid",
        "refunded",
        "waived",
        "scholarship_applied",
        "offline_recorded",
      ],
      fee_scope: ["team", "selected_players", "individual"],
      fee_status: ["draft", "published", "closed", "archived"],
      fee_type: [
        "registration",
        "uniform",
        "tournament",
        "travel",
        "fundraiser",
        "misc",
      ],
      fee_visibility: ["all_parents", "assigned_only"],
      general_rsvp_status: ["going", "not_going", "maybe"],
      installment_frequency: ["weekly", "biweekly", "monthly"],
      installment_schedule_status: [
        "active",
        "completed",
        "defaulted",
        "canceled",
      ],
      installment_status: [
        "upcoming",
        "due",
        "paid",
        "late",
        "skipped",
        "waived",
      ],
      join_request_status: ["pending", "approved", "denied"],
      level_type: ["age", "grade", "skill", "custom"],
      license_plan: ["starter", "standard", "pro"],
      license_status: ["trial", "active", "past_due", "canceled", "expired"],
      membership_status: ["active", "invited", "removed"],
      offline_payment_method: ["cash", "check", "external_processor", "other"],
      offline_payment_status: ["recorded", "voided"],
      org_member_role: ["parent", "coach", "org_admin"],
      org_status: ["trial", "active", "suspended", "expired"],
      org_type: ["school", "club", "league", "academy", "aau"],
      organization_event_type: [
        "ORG_CREATED",
        "ORG_UPDATED",
        "ORG_ACTIVATED",
        "ORG_SUSPENDED",
        "ORG_DELETED",
        "ORG_STRIPE_CONNECTED",
        "ORG_STRIPE_DISCONNECTED",
        "ORG_LICENSE_UPDATED",
      ],
      parent_event_type: [
        "PARENT_PROFILE_UPDATED",
        "PARENT_EMAIL_CHANGED",
        "PARENT_PHONE_CHANGED",
      ],
      parent_invite_status: ["pending", "accepted", "cancelled", "expired"],
      payment_event_entity_type: [
        "fee",
        "fee_assignment",
        "charge",
        "checkout_session",
        "payment",
        "offline_payment",
        "refund",
        "waiver",
        "scholarship_award",
        "discount_redemption",
      ],
      payment_event_type: [
        "FEE_CREATED",
        "FEE_UPDATED",
        "FEE_DELETED",
        "FEE_ASSIGNED",
        "FEE_UNASSIGNED",
        "PAYMENT_STARTED",
        "PAYMENT_SUCCEEDED",
        "PAYMENT_FAILED",
        "PAYMENT_REFUNDED",
        "PAYMENT_PARTIALLY_REFUNDED",
        "OFFLINE_PAYMENT_RECORDED",
        "OFFLINE_PAYMENT_VOIDED",
        "DISCOUNT_APPLIED",
        "WAIVER_APPLIED",
        "SCHOLARSHIP_APPLIED",
      ],
      payment_status: ["due", "paid", "refunded"],
      payment_status_new: [
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      payout_onboarding_status: ["pending", "completed", "restricted"],
      platform_admin_role: [
        "super_admin",
        "support_admin",
        "finance_admin",
        "ops_admin",
      ],
      recurrence_frequency: ["weekly", "custom"],
      rsvp_status: ["going", "late", "not_going", "unknown"],
      scholarship_funding_source: [
        "org_funded",
        "sponsor_funded",
        "district_funded",
      ],
      scholarship_program_status: ["active", "inactive"],
      season_event_type: [
        "SEASON_CREATED",
        "SEASON_UPDATED",
        "SEASON_DELETED",
        "SEASON_ACTIVATED",
        "SEASON_ARCHIVED",
      ],
      start_date_rule: ["on_publish", "custom_date"],
      system_event_type: [
        "SCHEDULED_JOB_STARTED",
        "SCHEDULED_JOB_COMPLETED",
        "SCHEDULED_JOB_FAILED",
        "WEBHOOK_RECEIVED",
        "WEBHOOK_PROCESSED",
        "WEBHOOK_FAILED",
        "DATABASE_BACKUP",
        "SYSTEM_ALERT",
      ],
      team_event_type: [
        "TEAM_CREATED",
        "TEAM_UPDATED",
        "TEAM_DELETED",
        "TEAM_MEMBER_ADDED",
        "TEAM_MEMBER_REMOVED",
        "TEAM_INVITE_SENT",
        "TEAM_INVITE_ACCEPTED",
      ],
      travel_event_type: [
        "TRAVEL_PLAN_CREATED",
        "TRAVEL_PLAN_UPDATED",
        "TRAVEL_PLAN_DELETED",
        "TRAVEL_ITINERARY_UPDATED",
        "TRAVEL_BOOKING_CONFIRMED",
      ],
      tryout_document_status: ["missing", "uploaded", "approved", "rejected"],
      tryout_event_type: [
        "TRYOUT_CREATED",
        "TRYOUT_UPDATED",
        "TRYOUT_DELETED",
        "TRYOUT_REGISTRATION_STARTED",
        "TRYOUT_REGISTRATION_COMPLETED",
        "TRYOUT_CHECKED_IN",
        "TRYOUT_EVALUATED",
        "TRYOUT_OFFERED",
        "TRYOUT_ACCEPTED",
        "TRYOUT_DECLINED",
        "TRYOUT_REJECTED",
      ],
      tryout_registration_status: [
        "registered",
        "checked_in",
        "evaluated",
        "offered",
        "accepted",
        "declined",
        "rejected",
        "withdrawn",
        "waitlisted",
        "not_selected",
      ],
      uniform_event_type: [
        "UNIFORM_KIT_CREATED",
        "UNIFORM_KIT_UPDATED",
        "UNIFORM_ORDER_SUBMITTED",
        "UNIFORM_ORDER_UPDATED",
        "UNIFORM_ORDER_FULFILLED",
      ],
      uniform_order_status: ["pending", "ordered", "delivered"],
      uniform_submission_status: [
        "not_submitted",
        "submitted",
        "locked",
        "fulfilled",
      ],
      user_event_type: [
        "USER_CREATED",
        "USER_UPDATED",
        "USER_DELETED",
        "USER_ROLE_CHANGED",
        "USER_ORG_JOINED",
        "USER_ORG_LEFT",
      ],
      user_role: ["parent", "coach", "admin"],
    },
  },
} as const
