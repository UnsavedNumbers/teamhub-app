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
      _index_backup: {
        Row: {
          indexdef: string | null
          indexname: unknown
          schemaname: unknown
          tablename: unknown
        }
        Insert: {
          indexdef?: string | null
          indexname?: unknown
          schemaname?: unknown
          tablename?: unknown
        }
        Update: {
          indexdef?: string | null
          indexname?: unknown
          schemaname?: unknown
          tablename?: unknown
        }
        Relationships: []
      }
      _policy_consolidation_log: {
        Row: {
          consolidated_policy: string
          created_at: string | null
          id: number
          operation: string
          original_policies: string[]
          tablename: string
        }
        Insert: {
          consolidated_policy: string
          created_at?: string | null
          id?: number
          operation: string
          original_policies: string[]
          tablename: string
        }
        Update: {
          consolidated_policy?: string
          created_at?: string | null
          id?: number
          operation?: string
          original_policies?: string[]
          tablename?: string
        }
        Relationships: []
      }
      _rls_policy_backup: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown
          tablename: unknown
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown
          tablename?: unknown
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown
          tablename?: unknown
          with_check?: string | null
        }
        Relationships: []
      }
      _rls_validation_results: {
        Row: {
          created_at: string | null
          details: Json | null
          id: number
          message: string | null
          passed: boolean
          test_category: string
          test_name: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: number
          message?: string | null
          passed: boolean
          test_category: string
          test_name: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: number
          message?: string | null
          passed?: boolean
          test_category?: string
          test_name?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          org_id: string | null
          priority: string | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at: string | null
          visible_to_fans: boolean | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          org_id?: string | null
          priority?: string | null
          team_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string | null
          visible_to_fans?: boolean | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          org_id?: string | null
          priority?: string | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string | null
          visible_to_fans?: boolean | null
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
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      athlete_guardians: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          org_id: string
          status: Database["public"]["Enums"]["athlete_guardian_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["athlete_guardian_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["athlete_guardian_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_guardians_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_guardians_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_imports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by_user_id: string
          error_count: number
          error_summary: Json | null
          file_name: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          imported_count: number
          org_id: string
          results_json: Json | null
          skipped_count: number
          started_at: string | null
          status: string
          total_rows: number
          updated_at: string | null
          updated_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id: string
          error_count?: number
          error_summary?: Json | null
          file_name: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          imported_count?: number
          org_id: string
          results_json?: Json | null
          skipped_count?: number
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string | null
          updated_count?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string
          error_count?: number
          error_summary?: Json | null
          file_name?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          imported_count?: number
          org_id?: string
          results_json?: Json | null
          skipped_count?: number
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string | null
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_imports_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_imports_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_medical_private: {
        Row: {
          allergies: string | null
          athlete_id: string
          created_at: string
          emergency_contact: Json | null
          medical_notes: string | null
          org_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergies?: string | null
          athlete_id: string
          created_at?: string
          emergency_contact?: Json | null
          medical_notes?: string | null
          org_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergies?: string | null
          athlete_id?: string
          created_at?: string
          emergency_contact?: Json | null
          medical_notes?: string | null
          org_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_medical_private_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_medical_private_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_medical_private_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_medical_private_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_medical_private_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_medical_private_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_medical_private_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_medical_private_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_sport_profiles: {
        Row: {
          athlete_id: string
          completeness_score: number
          created_at: string
          created_by: string | null
          equipment_data: Json
          id: string
          last_verified_at: string | null
          org_id: string
          profile_data: Json
          sport_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          athlete_id: string
          completeness_score?: number
          created_at?: string
          created_by?: string | null
          equipment_data?: Json
          id?: string
          last_verified_at?: string | null
          org_id: string
          profile_data?: Json
          sport_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          athlete_id?: string
          completeness_score?: number
          created_at?: string
          created_by?: string | null
          equipment_data?: Json
          id?: string
          last_verified_at?: string | null
          org_id?: string
          profile_data?: Json
          sport_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_sport_profiles_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sport_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_sports: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          org_id: string
          sport_id: string
          sport_type: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          org_id: string
          sport_id: string
          sport_type?: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          org_id?: string
          sport_id?: string
          sport_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_sports_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_sports_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          allergies: string | null
          birthdate: string | null
          created_at: string | null
          deleted_at: string | null
          dominant_hand: string | null
          email: string | null
          emergency_contact: Json | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          family_id: string | null
          first_name: string
          gender: string | null
          has_profile_photo: boolean | null
          height_cm: number | null
          id: string
          jersey_number: string | null
          last_name: string
          medical_notes: string | null
          org_id: string | null
          phone: string | null
          preferred_name: string | null
          privacy_level: Database["public"]["Enums"]["entity_privacy_level"]
          profile_photo_updated_at: string | null
          shoe_size_system: string | null
          shoe_size_value: number | null
          shoe_width: string | null
          shorts_size: string | null
          tshirt_size: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          allergies?: string | null
          birthdate?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dominant_hand?: string | null
          email?: string | null
          emergency_contact?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          family_id?: string | null
          first_name: string
          gender?: string | null
          has_profile_photo?: boolean | null
          height_cm?: number | null
          id?: string
          jersey_number?: string | null
          last_name: string
          medical_notes?: string | null
          org_id?: string | null
          phone?: string | null
          preferred_name?: string | null
          privacy_level?: Database["public"]["Enums"]["entity_privacy_level"]
          profile_photo_updated_at?: string | null
          shoe_size_system?: string | null
          shoe_size_value?: number | null
          shoe_width?: string | null
          shorts_size?: string | null
          tshirt_size?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          allergies?: string | null
          birthdate?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dominant_hand?: string | null
          email?: string | null
          emergency_contact?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          family_id?: string | null
          first_name?: string
          gender?: string | null
          has_profile_photo?: boolean | null
          height_cm?: number | null
          id?: string
          jersey_number?: string | null
          last_name?: string
          medical_notes?: string | null
          org_id?: string | null
          phone?: string | null
          preferred_name?: string | null
          privacy_level?: Database["public"]["Enums"]["entity_privacy_level"]
          profile_photo_updated_at?: string | null
          shoe_size_system?: string | null
          shoe_size_value?: number | null
          shoe_width?: string | null
          shorts_size?: string | null
          tshirt_size?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athletes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athletes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          athlete_id: string
          created_at: string | null
          event_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          event_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
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
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
          created_at: string
          lock_after_hours: number | null
          org_id: string
          reminder_enabled: boolean | null
          required_for_game: boolean | null
          required_for_meeting: boolean | null
          required_for_practice: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          lock_after_hours?: number | null
          org_id: string
          reminder_enabled?: boolean | null
          required_for_game?: boolean | null
          required_for_meeting?: boolean | null
          required_for_practice?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          lock_after_hours?: number | null
          org_id?: string
          reminder_enabled?: boolean | null
          required_for_game?: boolean | null
          required_for_meeting?: boolean | null
          required_for_practice?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
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
        ]
      }
      billing_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string | null
          id: string
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id?: string | null
          stripe_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_import_job_rows: {
        Row: {
          actions_json: Json | null
          created_at: string | null
          data_json: Json
          errors_json: Json | null
          id: string
          job_id: string
          normalized_email: string
          resolved_user_id: string | null
          row_number: number
          sheet_name: string
          validation_status: string
          warnings_json: Json | null
        }
        Insert: {
          actions_json?: Json | null
          created_at?: string | null
          data_json: Json
          errors_json?: Json | null
          id?: string
          job_id: string
          normalized_email: string
          resolved_user_id?: string | null
          row_number: number
          sheet_name: string
          validation_status: string
          warnings_json?: Json | null
        }
        Update: {
          actions_json?: Json | null
          created_at?: string | null
          data_json?: Json
          errors_json?: Json | null
          id?: string
          job_id?: string
          normalized_email?: string
          resolved_user_id?: string | null
          row_number?: number
          sheet_name?: string
          validation_status?: string
          warnings_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_job_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_job_rows_resolved_user_id_fkey"
            columns: ["resolved_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_job_rows_resolved_user_id_fkey"
            columns: ["resolved_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_import_jobs: {
        Row: {
          created_at: string | null
          created_by: string
          error_summary: Json | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          finished_at: string | null
          id: string
          org_id: string
          progress_json: Json | null
          results_path: string | null
          started_at: string | null
          status: string
          totals_json: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          error_summary?: Json | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          finished_at?: string | null
          id?: string
          org_id: string
          progress_json?: Json | null
          results_path?: string | null
          started_at?: string | null
          status?: string
          totals_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          error_summary?: Json | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          finished_at?: string | null
          id?: string
          org_id?: string
          progress_json?: Json | null
          results_path?: string | null
          started_at?: string | null
          status?: string
          totals_json?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "bulk_import_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "bulk_import_jobs_org_id_fkey"
            columns: ["org_id"]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "charges_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey"
            columns: ["org_id"]
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
        ]
      }
      child_claim_tokens: {
        Row: {
          athlete_id: string
          created_at: string | null
          created_by_user_id: string | null
          expires_at: string
          id: string
          org_id: string
          season_id: string
          team_id: string | null
          token: string
          updated_at: string | null
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at: string
          id?: string
          org_id: string
          season_id: string
          team_id?: string | null
          token?: string
          updated_at?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          expires_at?: string
          id?: string
          org_id?: string
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
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "child_claim_tokens_organization_id_fkey"
            columns: ["org_id"]
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
            foreignKeyName: "child_claim_tokens_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
        ]
      }
      demo_account_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_codes: {
        Row: {
          allowed_roles: Json
          created_at: string
          created_by: string | null
          demo_code: string
          demo_org_id: string
          expires_at: string
          id: string
          poc_id: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: Json
          created_at?: string
          created_by?: string | null
          demo_code: string
          demo_org_id: string
          expires_at: string
          id?: string
          poc_id?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: Json
          created_at?: string
          created_by?: string | null
          demo_code?: string
          demo_org_id?: string
          expires_at?: string
          id?: string
          poc_id?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_codes_demo_org_id_fkey"
            columns: ["demo_org_id"]
            isOneToOne: false
            referencedRelation: "demo_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_codes_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "demo_org_pocs"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_org_pocs: {
        Row: {
          created_at: string
          demo_org_id: string
          email: string
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_org_id: string
          email: string
          first_name: string
          id?: string
          is_primary?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_org_id?: string
          email?: string
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_org_pocs_demo_org_id_fkey"
            columns: ["demo_org_id"]
            isOneToOne: false
            referencedRelation: "demo_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_organizations: {
        Row: {
          allowed_roles: Json
          city: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          last_login_at: string | null
          name: string
          notes: string | null
          org_size: string | null
          org_type: string | null
          organization_id: string | null
          payment_enabled: boolean
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sports_sponsored: Json
          state: string | null
          status: string
          ticketing_enabled: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: Json
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_login_at?: string | null
          name: string
          notes?: string | null
          org_size?: string | null
          org_type?: string | null
          organization_id?: string | null
          payment_enabled?: boolean
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sports_sponsored?: Json
          state?: string | null
          status?: string
          ticketing_enabled?: boolean
          timezone: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: Json
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_login_at?: string | null
          name?: string
          notes?: string | null
          org_size?: string | null
          org_type?: string | null
          organization_id?: string | null
          payment_enabled?: boolean
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sports_sponsored?: Json
          state?: string | null
          status?: string
          ticketing_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "demo_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "demo_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_sessions: {
        Row: {
          demo_code: string
          demo_org_id: string
          expires_at: string
          id: string
          last_activity_at: string
          organization_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          demo_code: string
          demo_org_id: string
          expires_at: string
          id?: string
          last_activity_at?: string
          organization_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          demo_code?: string
          demo_org_id?: string
          expires_at?: string
          id?: string
          last_activity_at?: string
          organization_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_sessions_demo_code_fkey"
            columns: ["demo_code"]
            isOneToOne: false
            referencedRelation: "demo_codes"
            referencedColumns: ["demo_code"]
          },
          {
            foreignKeyName: "demo_sessions_demo_org_id_fkey"
            columns: ["demo_org_id"]
            isOneToOne: false
            referencedRelation: "demo_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "demo_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "demo_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            foreignKeyName: "discount_codes_applies_to_season_id_fkey"
            columns: ["applies_to_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["org_id"]
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
        ]
      }
      discovery_errors: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          error_type: string | null
          feature_key: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          error_type?: string | null
          feature_key?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          error_type?: string | null
          feature_key?: string | null
          id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_content: string
          created_at: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          preview_text: string | null
          required_variables: Json | null
          slug: string
          subject_template: string
          type: Database["public"]["Enums"]["notification_job_type"]
          updated_at: string | null
          updated_by_user_id: string | null
          variables: Json | null
        }
        Insert: {
          body_content: string
          created_at?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          preview_text?: string | null
          required_variables?: Json | null
          slug: string
          subject_template: string
          type: Database["public"]["Enums"]["notification_job_type"]
          updated_at?: string | null
          updated_by_user_id?: string | null
          variables?: Json | null
        }
        Update: {
          body_content?: string
          created_at?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          preview_text?: string | null
          required_variables?: Json | null
          slug?: string
          subject_template?: string
          type?: Database["public"]["Enums"]["notification_job_type"]
          updated_at?: string | null
          updated_by_user_id?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      entitlement_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          feature_entitlement_id: string
          id: string
          limit_value: number | null
          override_action: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          role_admin: boolean | null
          role_coach: boolean | null
          role_parent: boolean | null
          target_id: string
          target_type: string
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature_entitlement_id: string
          id?: string
          limit_value?: number | null
          override_action: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          role_admin?: boolean | null
          role_coach?: boolean | null
          role_parent?: boolean | null
          target_id: string
          target_type: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature_entitlement_id?: string
          id?: string
          limit_value?: number | null
          override_action?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          role_admin?: boolean | null
          role_coach?: boolean | null
          role_parent?: boolean | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_overrides_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_overrides_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
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
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "event_attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            foreignKeyName: "event_change_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_general_rsvps: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          note: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["general_rsvp_status"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          note?: string | null
          responded_at?: string | null
          status: Database["public"]["Enums"]["general_rsvp_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          note?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["general_rsvp_status"]
          updated_at?: string | null
          user_id?: string | null
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
            referencedRelation: "admin_users"
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
          place_id: string | null
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
          place_id?: string | null
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
          place_id?: string | null
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
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
      event_rsvps: {
        Row: {
          athlete_id: string
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
          athlete_id: string
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
          athlete_id?: string
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
            foreignKeyName: "event_rsvps_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "event_rsvps_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
          description: string | null
          end_time: string
          equipment_notes: string | null
          external_link: string | null
          facility_id: string | null
          facility_resource_id: string | null
          hotel_address: string | null
          hotel_confirmation: string | null
          hotel_name: string | null
          hotel_phone: string | null
          id: string
          is_cancelled: boolean | null
          itinerary_file_path: string | null
          location: string | null
          location_mode: string | null
          meeting_locations: Json | null
          notes: string | null
          org_id: string
          overnight: boolean | null
          requires_travel: boolean | null
          return_time: string | null
          rsvp_enabled: boolean | null
          rsvp_type: string | null
          season_id: string | null
          seat_map_id: string | null
          start_time: string
          team_id: string | null
          timezone: string
          title: string
          transportation_notes: string | null
          travel_override: Json | null
          type: Database["public"]["Enums"]["event_type"]
          uniform_notes: string | null
          updated_at: string | null
          venue_id: string | null
          visibility: Database["public"]["Enums"]["event_visibility"] | null
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
          description?: string | null
          end_time: string
          equipment_notes?: string | null
          external_link?: string | null
          facility_id?: string | null
          facility_resource_id?: string | null
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          id?: string
          is_cancelled?: boolean | null
          itinerary_file_path?: string | null
          location?: string | null
          location_mode?: string | null
          meeting_locations?: Json | null
          notes?: string | null
          org_id: string
          overnight?: boolean | null
          requires_travel?: boolean | null
          return_time?: string | null
          rsvp_enabled?: boolean | null
          rsvp_type?: string | null
          season_id?: string | null
          seat_map_id?: string | null
          start_time: string
          team_id?: string | null
          timezone?: string
          title: string
          transportation_notes?: string | null
          travel_override?: Json | null
          type?: Database["public"]["Enums"]["event_type"]
          uniform_notes?: string | null
          updated_at?: string | null
          venue_id?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"] | null
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
          description?: string | null
          end_time?: string
          equipment_notes?: string | null
          external_link?: string | null
          facility_id?: string | null
          facility_resource_id?: string | null
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          id?: string
          is_cancelled?: boolean | null
          itinerary_file_path?: string | null
          location?: string | null
          location_mode?: string | null
          meeting_locations?: Json | null
          notes?: string | null
          org_id?: string
          overnight?: boolean | null
          requires_travel?: boolean | null
          return_time?: string | null
          rsvp_enabled?: boolean | null
          rsvp_type?: string | null
          season_id?: string | null
          seat_map_id?: string | null
          start_time?: string
          team_id?: string | null
          timezone?: string
          title?: string
          transportation_notes?: string | null
          travel_override?: Json | null
          type?: Database["public"]["Enums"]["event_type"]
          uniform_notes?: string | null
          updated_at?: string | null
          venue_id?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"] | null
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
            foreignKeyName: "events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_facility_resource_id_fkey"
            columns: ["facility_resource_id"]
            isOneToOne: false
            referencedRelation: "facility_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      export_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          file_url: string | null
          format: string
          id: string
          org_id: string
          report_config: Json
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format: string
          id?: string
          org_id: string
          report_config: Json
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          org_id?: string
          report_config?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "export_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "export_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address_mode: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          entry_instructions: string | null
          facility_type: string | null
          formatted_address: string | null
          id: string
          is_public: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          org_id: string
          parking_notes: string | null
          place_id: string | null
          postal_code: string | null
          state: string | null
          status: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_mode?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          entry_instructions?: string | null
          facility_type?: string | null
          formatted_address?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          org_id: string
          parking_notes?: string | null
          place_id?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_mode?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          entry_instructions?: string | null
          facility_type?: string | null
          formatted_address?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_id?: string
          parking_notes?: string | null
          place_id?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_blackouts: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          facility_id: string | null
          id: string
          org_id: string
          reason: string | null
          repeats_rule: string | null
          resource_id: string | null
          start_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          facility_id?: string | null
          id?: string
          org_id: string
          reason?: string | null
          repeats_rule?: string | null
          resource_id?: string | null
          start_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          facility_id?: string | null
          id?: string
          org_id?: string
          reason?: string | null
          repeats_rule?: string | null
          resource_id?: string | null
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_blackouts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_blackouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facility_blackouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_blackouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facility_blackouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_blackouts_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "facility_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_reservations: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          event_id: string | null
          facility_id: string
          id: string
          notes: string | null
          org_id: string
          program_id: string | null
          reservation_type: string
          resource_id: string
          sport_id: string | null
          start_at: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          event_id?: string | null
          facility_id: string
          id?: string
          notes?: string | null
          org_id: string
          program_id?: string | null
          reservation_type: string
          resource_id: string
          sport_id?: string | null
          start_at: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          event_id?: string | null
          facility_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          program_id?: string | null
          reservation_type?: string
          resource_id?: string
          sport_id?: string | null
          start_at?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reservations_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facility_reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facility_reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reservations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "facility_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_resources: {
        Row: {
          capacity: number | null
          created_at: string
          dimensions: Json | null
          facility_id: string
          id: string
          indoor: boolean | null
          lighting: boolean | null
          name: string
          notes: string | null
          org_id: string
          reservable: boolean | null
          resource_type: string | null
          sport_tags: string[] | null
          status: string | null
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          dimensions?: Json | null
          facility_id: string
          id?: string
          indoor?: boolean | null
          lighting?: boolean | null
          name: string
          notes?: string | null
          org_id: string
          reservable?: boolean | null
          resource_type?: string | null
          sport_tags?: string[] | null
          status?: string | null
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          dimensions?: Json | null
          facility_id?: string
          id?: string
          indoor?: boolean | null
          lighting?: boolean | null
          name?: string
          notes?: string | null
          org_id?: string
          reservable?: boolean | null
          resource_type?: string | null
          sport_tags?: string[] | null
          status?: string | null
          surface_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_resources_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_resources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facility_resources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_resources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "facility_resources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
        ]
      }
      fan_calendar_cache: {
        Row: {
          calendar_data: Json
          expires_at: string
          generated_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          calendar_data: Json
          expires_at: string
          generated_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          calendar_data?: Json
          expires_at?: string
          generated_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_calendar_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_calendar_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_event_bookmarks: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_event_bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_event_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_event_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_feed: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          expires_at: string | null
          fan_user_id: string
          id: string
          read: boolean | null
          source_entity_id: string
          source_entity_name: string | null
          source_entity_type: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          expires_at?: string | null
          fan_user_id: string
          id?: string
          read?: boolean | null
          source_entity_id: string
          source_entity_name?: string | null
          source_entity_type: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          expires_at?: string | null
          fan_user_id?: string
          id?: string
          read?: boolean | null
          source_entity_id?: string
          source_entity_name?: string | null
          source_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_feed_fan_user_id_fkey"
            columns: ["fan_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_feed_fan_user_id_fkey"
            columns: ["fan_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_org_follows: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_org_follows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "fan_org_follows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_org_follows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "fan_org_follows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_org_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_org_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string
          depends_on_key: string
          feature_key: string
          id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string
          depends_on_key: string
          feature_key: string
          id?: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string
          depends_on_key?: string
          feature_key?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_dependencies_depends_on_key_fkey"
            columns: ["depends_on_key"]
            isOneToOne: false
            referencedRelation: "admin_entitlement_overrides_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_dependencies_depends_on_key_fkey"
            columns: ["depends_on_key"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_dependencies_depends_on_key_fkey"
            columns: ["depends_on_key"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_dependencies_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "admin_entitlement_overrides_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_dependencies_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_dependencies_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      feature_dependency_cycles: {
        Row: {
          created_at: string | null
          cycle_features: string[]
          id: string
        }
        Insert: {
          created_at?: string | null
          cycle_features: string[]
          id?: string
        }
        Update: {
          created_at?: string | null
          cycle_features?: string[]
          id?: string
        }
        Relationships: []
      }
      feature_discovery_cache: {
        Row: {
          created_at: string | null
          discovered_features: Json
          discovery_version: string | null
          id: string
          last_discovered_at: string
          last_synced_at: string | null
          schema_hash: string | null
          sync_errors: Json | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discovered_features: Json
          discovery_version?: string | null
          id?: string
          last_discovered_at: string
          last_synced_at?: string | null
          schema_hash?: string | null
          sync_errors?: Json | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discovered_features?: Json
          discovery_version?: string | null
          id?: string
          last_discovered_at?: string
          last_synced_at?: string | null
          schema_hash?: string | null
          sync_errors?: Json | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_discovery_corrections: {
        Row: {
          after_state: Json | null
          before_state: Json | null
          correction_type: string | null
          created_at: string | null
          created_by: string | null
          feature_key: string
          id: string
        }
        Insert: {
          after_state?: Json | null
          before_state?: Json | null
          correction_type?: string | null
          created_at?: string | null
          created_by?: string | null
          feature_key: string
          id?: string
        }
        Update: {
          after_state?: Json | null
          before_state?: Json | null
          correction_type?: string | null
          created_at?: string | null
          created_by?: string | null
          feature_key?: string
          id?: string
        }
        Relationships: []
      }
      feature_discovery_hints: {
        Row: {
          created_at: string | null
          feature_key: string
          hint_type: string | null
          hint_value: string
          id: string
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          hint_type?: string | null
          hint_value: string
          id?: string
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          hint_type?: string | null
          hint_value?: string
          id?: string
        }
        Relationships: []
      }
      feature_entitlements: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          feature_key: string
          feature_type: string
          id: string
          is_removable: boolean
          is_system_feature: boolean
          is_toggleable: boolean
          lock_reason: string | null
          owner_team: string | null
          parent_feature_key: string | null
          platform_admin_only: boolean
          rollout_status: string | null
          unavailable_gate_action: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          feature_key: string
          feature_type: string
          id?: string
          is_removable?: boolean
          is_system_feature?: boolean
          is_toggleable?: boolean
          lock_reason?: string | null
          owner_team?: string | null
          parent_feature_key?: string | null
          platform_admin_only?: boolean
          rollout_status?: string | null
          unavailable_gate_action?: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          feature_key?: string
          feature_type?: string
          id?: string
          is_removable?: boolean
          is_system_feature?: boolean
          is_toggleable?: boolean
          lock_reason?: string | null
          owner_team?: string | null
          parent_feature_key?: string | null
          platform_admin_only?: boolean
          rollout_status?: string | null
          unavailable_gate_action?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_entitlements_parent_feature_key_fkey"
            columns: ["parent_feature_key"]
            isOneToOne: false
            referencedRelation: "admin_entitlement_overrides_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_entitlements_parent_feature_key_fkey"
            columns: ["parent_feature_key"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_entitlements_parent_feature_key_fkey"
            columns: ["parent_feature_key"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["feature_key"]
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
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          enabled: boolean | null
          environment:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_key: string | null
          id: string
          key: string | null
          org_id: string | null
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
          enabled?: boolean | null
          environment?:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_key?: string | null
          id?: string
          key?: string | null
          org_id?: string | null
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
          enabled?: boolean | null
          environment?:
            | Database["public"]["Enums"]["feature_flag_environment"]
            | null
          feature_key?: string | null
          id?: string
          key?: string | null
          org_id?: string | null
          updated_at?: string | null
          value_type?:
            | Database["public"]["Enums"]["feature_flag_value_type"]
            | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_integration_assignments: {
        Row: {
          created_at: string | null
          feature_entitlement_id: string
          id: string
          integration_name: string
        }
        Insert: {
          created_at?: string | null
          feature_entitlement_id: string
          id?: string
          integration_name: string
        }
        Update: {
          created_at?: string | null
          feature_entitlement_id?: string
          id?: string
          integration_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_integration_assignments_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_integration_assignments_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_integrations: {
        Row: {
          created_at: string | null
          feature_key_pattern: string
          id: string
          integration_name: string
          integration_type: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key_pattern: string
          id?: string
          integration_name: string
          integration_type?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key_pattern?: string
          id?: string
          integration_name?: string
          integration_type?: string | null
        }
        Relationships: []
      }
      fee_assignments: {
        Row: {
          amount_cents: number
          athlete_id: string
          balance_cents: number
          created_at: string | null
          currency: string | null
          discount_cents_total: number
          due_date: string | null
          fee_id: string
          id: string
          late_fee_cents_applied: number
          notes_internal: string | null
          org_id: string
          paid_cents_total: number
          parent_id: string
          scholarship_cents_total: number
          status: Database["public"]["Enums"]["fee_assignment_status"]
          updated_at: string | null
          waived_cents_total: number
        }
        Insert: {
          amount_cents: number
          athlete_id: string
          balance_cents?: number
          created_at?: string | null
          currency?: string | null
          discount_cents_total?: number
          due_date?: string | null
          fee_id: string
          id?: string
          late_fee_cents_applied?: number
          notes_internal?: string | null
          org_id: string
          paid_cents_total?: number
          parent_id: string
          scholarship_cents_total?: number
          status?: Database["public"]["Enums"]["fee_assignment_status"]
          updated_at?: string | null
          waived_cents_total?: number
        }
        Update: {
          amount_cents?: number
          athlete_id?: string
          balance_cents?: number
          created_at?: string | null
          currency?: string | null
          discount_cents_total?: number
          due_date?: string | null
          fee_id?: string
          id?: string
          late_fee_cents_applied?: number
          notes_internal?: string | null
          org_id?: string
          paid_cents_total?: number
          parent_id?: string
          scholarship_cents_total?: number
          status?: Database["public"]["Enums"]["fee_assignment_status"]
          updated_at?: string | null
          waived_cents_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_assignments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "fee_assignments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "fee_assignments_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            foreignKeyName: "fees_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "fees_organization_id_fkey"
            columns: ["org_id"]
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
          {
            foreignKeyName: "fees_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
          },
        ]
      }
      galleries: {
        Row: {
          allow_contributions: boolean
          can_download: boolean | null
          cover_generated_at: string | null
          cover_generation_status: string | null
          cover_photo_id: string | null
          cover_thumbnails: Json | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          entity_id: string | null
          fans_can_see: boolean
          gallery_type: Database["public"]["Enums"]["gallery_type"]
          id: string
          is_system_generated: boolean
          name: string
          org_id: string
          require_approval: boolean
          updated_at: string
          visibility: Database["public"]["Enums"]["gallery_visibility"] | null
        }
        Insert: {
          allow_contributions?: boolean
          can_download?: boolean | null
          cover_generated_at?: string | null
          cover_generation_status?: string | null
          cover_photo_id?: string | null
          cover_thumbnails?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          entity_id?: string | null
          fans_can_see?: boolean
          gallery_type: Database["public"]["Enums"]["gallery_type"]
          id?: string
          is_system_generated?: boolean
          name: string
          org_id: string
          require_approval?: boolean
          updated_at?: string
          visibility?: Database["public"]["Enums"]["gallery_visibility"] | null
        }
        Update: {
          allow_contributions?: boolean
          can_download?: boolean | null
          cover_generated_at?: string | null
          cover_generation_status?: string | null
          cover_photo_id?: string | null
          cover_thumbnails?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          entity_id?: string | null
          fans_can_see?: boolean
          gallery_type?: Database["public"]["Enums"]["gallery_type"]
          id?: string
          is_system_generated?: boolean
          name?: string
          org_id?: string
          require_approval?: boolean
          updated_at?: string
          visibility?: Database["public"]["Enums"]["gallery_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "galleries_cover_photo_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galleries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "galleries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galleries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "galleries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_albums: {
        Row: {
          created_at: string
          description: string | null
          gallery_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gallery_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gallery_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_downloads: {
        Row: {
          downloaded_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_downloads_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photo_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photo_bookmarks_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photo_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photo_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photo_tags: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          photo_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          photo_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photo_tags_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "gallery_photo_tags_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          album_id: string | null
          blurhash: string | null
          can_download: boolean | null
          created_at: string
          filename: string | null
          gallery_id: string
          id: string
          size_bytes: number | null
          sort_order: number | null
          status: Database["public"]["Enums"]["photo_status"]
          storage_path: string
          taken_at: string | null
          thumbnail_lg_path: string | null
          thumbnail_md_path: string | null
          thumbnail_path: string | null
          thumbnail_sm_path: string | null
          updated_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          album_id?: string | null
          blurhash?: string | null
          can_download?: boolean | null
          created_at?: string
          filename?: string | null
          gallery_id: string
          id?: string
          size_bytes?: number | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["photo_status"]
          storage_path: string
          taken_at?: string | null
          thumbnail_lg_path?: string | null
          thumbnail_md_path?: string | null
          thumbnail_path?: string | null
          thumbnail_sm_path?: string | null
          updated_at?: string
          uploaded_by_user_id: string
        }
        Update: {
          album_id?: string | null
          blurhash?: string | null
          can_download?: boolean | null
          created_at?: string
          filename?: string | null
          gallery_id?: string
          id?: string
          size_bytes?: number | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["photo_status"]
          storage_path?: string
          taken_at?: string | null
          thumbnail_lg_path?: string | null
          thumbnail_md_path?: string | null
          thumbnail_path?: string | null
          thumbnail_sm_path?: string | null
          updated_at?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photos_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photos_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photos_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          gallery_id: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          gallery_id: string
          id?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          gallery_id?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_share_links_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_zip_downloads: {
        Row: {
          created_at: string | null
          gallery_id: string | null
          id: string
          photo_count: number | null
          size_bytes: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          gallery_id?: string | null
          id?: string
          photo_count?: number | null
          size_bytes?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          gallery_id?: string | null
          id?: string
          photo_count?: number | null
          size_bytes?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_zip_downloads_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_zip_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_zip_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_attachment_requests: {
        Row: {
          athlete_id: string
          created_at: string | null
          decision_reason: string | null
          expires_at: string
          id: string
          org_id: string
          requested_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["guardian_attachment_request_status"]
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          decision_reason?: string | null
          expires_at?: string
          id?: string
          org_id: string
          requested_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guardian_attachment_request_status"]
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          decision_reason?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          requested_by_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["guardian_attachment_request_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_attachment_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_attachment_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_category_page_mappings: {
        Row: {
          category_slug: string
          created_at: string
          featured_image_url: string | null
          id: string
          page_content_html: string | null
          updated_at: string
          wordpress_page_id: number
        }
        Insert: {
          category_slug: string
          created_at?: string
          featured_image_url?: string | null
          id?: string
          page_content_html?: string | null
          updated_at?: string
          wordpress_page_id: number
        }
        Update: {
          category_slug?: string
          created_at?: string
          featured_image_url?: string | null
          id?: string
          page_content_html?: string | null
          updated_at?: string
          wordpress_page_id?: number
        }
        Relationships: []
      }
      help_role_category_mappings: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          wordpress_category_id: number
          wordpress_category_name: string
          wordpress_category_slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          wordpress_category_id: number
          wordpress_category_name: string
          wordpress_category_slug: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          wordpress_category_id?: number
          wordpress_category_name?: string
          wordpress_category_slug?: string
        }
        Relationships: []
      }
      help_section_tag_combinations: {
        Row: {
          created_at: string
          id: string
          section_id: string
          tag_ids: number[]
        }
        Insert: {
          created_at?: string
          id?: string
          section_id: string
          tag_ids: number[]
        }
        Update: {
          created_at?: string
          id?: string
          section_id?: string
          tag_ids?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "help_section_tag_combinations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "help_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      help_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_wordpress_cache: {
        Row: {
          cache_type: string
          data: Json
          expires_at: string | null
          id: string
          synced_at: string
          wordpress_id: number
          wordpress_slug: string
        }
        Insert: {
          cache_type: string
          data: Json
          expires_at?: string | null
          id?: string
          synced_at?: string
          wordpress_id: number
          wordpress_slug: string
        }
        Update: {
          cache_type?: string
          data?: Json
          expires_at?: string | null
          id?: string
          synced_at?: string
          wordpress_id?: number
          wordpress_slug?: string
        }
        Relationships: []
      }
      help_wordpress_config: {
        Row: {
          api_url: string
          auth_method: string
          connection_status: string
          created_at: string
          credentials_encrypted: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_url: string
          auth_method: string
          connection_status?: string
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_url?: string
          auth_method?: string
          connection_status?: string
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_wordpress_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_wordpress_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      huddle_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          stream_channel_id: string | null
          stream_message_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          stream_channel_id?: string | null
          stream_message_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          stream_channel_id?: string | null
          stream_message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "huddle_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      huddle_notification_preferences: {
        Row: {
          channel_id: string
          created_at: string
          digest_enabled: boolean
          email_notifications: boolean
          id: string
          muted: boolean
          push_notifications: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          digest_enabled?: boolean
          email_notifications?: boolean
          id?: string
          muted?: boolean
          push_notifications?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          digest_enabled?: boolean
          email_notifications?: boolean
          id?: string
          muted?: boolean
          push_notifications?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "huddle_notification_preferences_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "stream_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      huddle_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string | null
          reported_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          stream_channel_id: string
          stream_message_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          stream_channel_id: string
          stream_message_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_by_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          stream_channel_id?: string
          stream_message_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "huddle_reports_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_reports_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_reports_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_reports_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          org_id: string
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
          org_id: string
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
          org_id?: string
          start_date_rule?: Database["public"]["Enums"]["start_date_rule"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "installment_plans_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "join_links_organization_id_fkey"
            columns: ["org_id"]
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
          athlete_id: string
          created_at: string | null
          decision_reason: string | null
          id: string
          join_link_id: string | null
          org_id: string
          requested_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          season_id: string
          status: Database["public"]["Enums"]["join_request_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          decision_reason?: string | null
          id?: string
          join_link_id?: string | null
          org_id: string
          requested_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["join_request_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          decision_reason?: string | null
          id?: string
          join_link_id?: string | null
          org_id?: string
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
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "join_requests_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "join_requests_organization_id_fkey"
            columns: ["org_id"]
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
            foreignKeyName: "join_requests_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
      levels: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          grade_max: number | null
          grade_min: number | null
          id: string
          level_type: string
          name: string
          org_id: string
          program_id: string
          skill_max: number | null
          skill_min: number | null
          updated_at: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          level_type?: string
          name: string
          org_id: string
          program_id: string
          skill_max?: number | null
          skill_min?: number | null
          updated_at?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          level_type?: string
          name?: string
          org_id?: string
          program_id?: string
          skill_max?: number | null
          skill_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
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
      messages_archive: {
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
      notification_digest_buffer: {
        Row: {
          created_at: string
          digest_window: string
          group_id: string
          id: string
          notification_ids: string[]
          org_id: string
          processed_at: string | null
          role_context: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_window?: string
          group_id: string
          id?: string
          notification_ids: string[]
          org_id: string
          processed_at?: string | null
          role_context: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          digest_window?: string
          group_id?: string
          id?: string
          notification_ids?: string[]
          org_id?: string
          processed_at?: string | null
          role_context?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_digest_buffer_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_digest_buffer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          created_at: string
          email: string
          error: string | null
          id: string
          next_retry_at: string | null
          org_id: string | null
          payload: Json
          retry_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_job_status"]
          type: Database["public"]["Enums"]["notification_job_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          error?: string | null
          id?: string
          next_retry_at?: string | null
          org_id?: string | null
          payload?: Json
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_job_status"]
          type: Database["public"]["Enums"]["notification_job_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          next_retry_at?: string | null
          org_id?: string | null
          payload?: Json
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_job_status"]
          type?: Database["public"]["Enums"]["notification_job_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "notification_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "notification_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "offline_payments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "offline_payments_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
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
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_licenses_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
          require_offline_only?: boolean | null
          require_purchase_order_ref?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_payment_policies_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_slug_history: {
        Row: {
          changed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          org_id: string
          previous_slug: string
        }
        Insert: {
          changed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          org_id: string
          previous_slug: string
        }
        Update: {
          changed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          previous_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_slug_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_slug_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_slug_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_slug_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sport_profile_settings: {
        Row: {
          created_at: string
          id: string
          org_id: string
          overrides: Json
          sport_code: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          overrides?: Json
          sport_code: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          overrides?: Json
          sport_code?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_sport_profile_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_sport_profile_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sport_profile_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_sport_profile_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sport_profile_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sport_profile_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_storage_usage: {
        Row: {
          bucket_id: string
          bytes_used: number
          org_id: string
          updated_at: string
        }
        Insert: {
          bucket_id?: string
          bytes_used?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          bytes_used?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_storage_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_storage_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_storage_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_storage_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_user_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          org_user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          org_user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          org_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_user_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_user_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_advanced_settings: {
        Row: {
          allow_data_export: boolean
          api_rate_limit: number | null
          created_at: string
          data_retention_days: number | null
          enable_api_access: boolean
          org_id: string
          updated_at: string
        }
        Insert: {
          allow_data_export?: boolean
          api_rate_limit?: number | null
          created_at?: string
          data_retention_days?: number | null
          enable_api_access?: boolean
          org_id: string
          updated_at?: string
        }
        Update: {
          allow_data_export?: boolean
          api_rate_limit?: number | null
          created_at?: string
          data_retention_days?: number | null
          enable_api_access?: boolean
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_advanced_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_advanced_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_advanced_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_advanced_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_attendance_settings: {
        Row: {
          allow_admin_override: boolean
          created_at: string
          enable_coach_reminders: boolean
          lock_after_days: number | null
          org_id: string
          parent_visibility: Json | null
          required_for_game: boolean
          required_for_meeting: boolean
          required_for_practice: boolean
          submission_deadline_hours: number
          updated_at: string
        }
        Insert: {
          allow_admin_override?: boolean
          created_at?: string
          enable_coach_reminders?: boolean
          lock_after_days?: number | null
          org_id: string
          parent_visibility?: Json | null
          required_for_game?: boolean
          required_for_meeting?: boolean
          required_for_practice?: boolean
          submission_deadline_hours?: number
          updated_at?: string
        }
        Update: {
          allow_admin_override?: boolean
          created_at?: string
          enable_coach_reminders?: boolean
          lock_after_days?: number | null
          org_id?: string
          parent_visibility?: Json | null
          required_for_game?: boolean
          required_for_meeting?: boolean
          required_for_practice?: boolean
          submission_deadline_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_attendance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_contacts: {
        Row: {
          category: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_custom: boolean
          last_name: string
          org_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_custom?: boolean
          last_name?: string
          org_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_custom?: boolean
          last_name?: string
          org_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_defaults: {
        Row: {
          created_at: string
          default_event_types: Json | null
          default_level_id: string | null
          default_program_id: string | null
          default_season_id: string | null
          default_sport_id: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_event_types?: Json | null
          default_level_id?: string | null
          default_program_id?: string | null
          default_season_id?: string | null
          default_sport_id?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_event_types?: Json | null
          default_level_id?: string | null
          default_program_id?: string | null
          default_season_id?: string | null
          default_sport_id?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_defaults_default_level_id_fkey"
            columns: ["default_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_defaults_default_program_id_fkey"
            columns: ["default_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_defaults_default_season_id_fkey"
            columns: ["default_season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "organization_defaults_default_season_id_fkey"
            columns: ["default_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_defaults_default_season_id_fkey"
            columns: ["default_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "organization_defaults_default_sport_id_fkey"
            columns: ["default_sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_defaults_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_defaults_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_defaults_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_defaults_org_id_fkey"
            columns: ["org_id"]
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          ended_at: string | null
          ended_reason: string | null
          id: string
          is_active: boolean | null
          org_id: string
          organization_id: string | null
          permissions: Json | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["org_member_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          is_active?: boolean | null
          org_id: string
          organization_id?: string | null
          permissions?: Json | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["org_member_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string
          organization_id?: string | null
          permissions?: Json | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["org_member_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
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
        ]
      }
      organization_notification_settings: {
        Row: {
          attendance_reminders_enabled: boolean
          created_at: string
          default_channels: Json | null
          org_id: string
          payment_reminder_behavior: string
          schedule_change_alerts_enabled: boolean
          updated_at: string
        }
        Insert: {
          attendance_reminders_enabled?: boolean
          created_at?: string
          default_channels?: Json | null
          org_id: string
          payment_reminder_behavior?: string
          schedule_change_alerts_enabled?: boolean
          updated_at?: string
        }
        Update: {
          attendance_reminders_enabled?: boolean
          created_at?: string
          default_channels?: Json | null
          org_id?: string
          payment_reminder_behavior?: string
          schedule_change_alerts_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_registration_settings: {
        Row: {
          allow_guardian_self_invite: boolean
          allow_players_without_guardians: boolean
          created_at: string
          medical_form_required: boolean
          org_id: string
          required_fields: Json | null
          updated_at: string
        }
        Insert: {
          allow_guardian_self_invite?: boolean
          allow_players_without_guardians?: boolean
          created_at?: string
          medical_form_required?: boolean
          org_id: string
          required_fields?: Json | null
          updated_at?: string
        }
        Update: {
          allow_guardian_self_invite?: boolean
          allow_players_without_guardians?: boolean
          created_at?: string
          medical_form_required?: boolean
          org_id?: string
          required_fields?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_registration_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_registration_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_registration_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_registration_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          default_language: string | null
          org_id: string
          organization_name: string
          status: string
          theme_id: string | null
          timezone: string
          updated_at: string
          venue_insights_daily_limit: number | null
          venue_insights_daily_usage: number | null
          venue_insights_last_reset_date: string | null
          venue_insights_monthly_limit: number | null
          venue_insights_monthly_usage: number | null
        }
        Insert: {
          created_at?: string
          default_language?: string | null
          org_id: string
          organization_name: string
          status?: string
          theme_id?: string | null
          timezone?: string
          updated_at?: string
          venue_insights_daily_limit?: number | null
          venue_insights_daily_usage?: number | null
          venue_insights_last_reset_date?: string | null
          venue_insights_monthly_limit?: number | null
          venue_insights_monthly_usage?: number | null
        }
        Update: {
          created_at?: string
          default_language?: string | null
          org_id?: string
          organization_name?: string
          status?: string
          theme_id?: string | null
          timezone?: string
          updated_at?: string
          venue_insights_daily_limit?: number | null
          venue_insights_daily_usage?: number | null
          venue_insights_last_reset_date?: string | null
          venue_insights_monthly_limit?: number | null
          venue_insights_monthly_usage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sport_customizations: {
        Row: {
          color: string | null
          created_at: string
          icon_path: string | null
          id: string
          org_id: string
          sport_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon_path?: string | null
          id?: string
          org_id: string
          sport_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon_path?: string | null
          id?: string
          org_id?: string
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_sport_customizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_sport_customizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_sport_customizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_sport_customizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_sport_customizations_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sports: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_sports_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_sports_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_sports_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_sports_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_travel_contacts: {
        Row: {
          category: string
          email: string
          first_name: string
          last_name: string
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          category: string
          email: string
          first_name: string
          last_name: string
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          email?: string
          first_name?: string
          last_name?: string
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_travel_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_travel_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_travel_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_travel_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_visibility_settings: {
        Row: {
          created_at: string
          fan_visibility_defaults: Json | null
          org_id: string
          role_permissions: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fan_visibility_defaults?: Json | null
          org_id: string
          role_permissions?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fan_visibility_defaults?: Json | null
          org_id?: string
          role_permissions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_visibility_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_visibility_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_visibility_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_visibility_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_mode: Database["public"]["Enums"]["billing_mode"] | null
          branding_email_footer_text: string | null
          branding_email_from_name: string | null
          branding_primary_color: string | null
          branding_secondary_color: string | null
          city: string | null
          connect_link_created_at: string | null
          contact_email: string | null
          created_at: string | null
          currency: string | null
          current_tier_id: string | null
          default_seat_map_id: string | null
          default_ticket_fees_cents: number | null
          demo_org_id: string | null
          description: string | null
          email: string | null
          id: string
          inherits_license: boolean
          is_demo_org: boolean
          latitude: number | null
          license_cancel_at_period_end: boolean | null
          license_current_period_end: string | null
          license_current_period_start: string | null
          license_grace_ends_at: string | null
          license_status: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"] | null
          parent_org_id: string | null
          payout_account_id: string | null
          payout_descriptor: string | null
          payout_onboarding_status:
            | Database["public"]["Enums"]["payout_onboarding_status"]
            | null
          payouts_enabled: boolean | null
          phone: string | null
          place_id: string | null
          primary_city: string | null
          primary_region_radius_miles: number | null
          primary_state: string | null
          privacy_level: Database["public"]["Enums"]["entity_privacy_level"]
          profile_visible_to_fans: boolean | null
          refund_policy: string | null
          slug: string | null
          state: string | null
          status: Database["public"]["Enums"]["org_status"]
          stripe_customer_id: string | null
          stripe_payouts_disabled_reason: string | null
          stripe_payouts_enabled: boolean | null
          stripe_price_id: string | null
          stripe_requirements_deadline: string | null
          stripe_requirements_due: Json | null
          stripe_requirements_errors: Json | null
          stripe_status_updated_at: string | null
          stripe_subscription_id: string | null
          sub_org_max_count: number | null
          sub_org_public_registration_enabled: boolean | null
          sub_org_require_approval: boolean | null
          ticket_terms: string | null
          ticketing_enabled: boolean | null
          updated_at: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          billing_mode?: Database["public"]["Enums"]["billing_mode"] | null
          branding_email_footer_text?: string | null
          branding_email_from_name?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          city?: string | null
          connect_link_created_at?: string | null
          contact_email?: string | null
          created_at?: string | null
          currency?: string | null
          current_tier_id?: string | null
          default_seat_map_id?: string | null
          default_ticket_fees_cents?: number | null
          demo_org_id?: string | null
          description?: string | null
          email?: string | null
          id?: string
          inherits_license?: boolean
          is_demo_org?: boolean
          latitude?: number | null
          license_cancel_at_period_end?: boolean | null
          license_current_period_end?: string | null
          license_current_period_start?: string | null
          license_grace_ends_at?: string | null
          license_status?: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          org_type?: Database["public"]["Enums"]["org_type"] | null
          parent_org_id?: string | null
          payout_account_id?: string | null
          payout_descriptor?: string | null
          payout_onboarding_status?:
            | Database["public"]["Enums"]["payout_onboarding_status"]
            | null
          payouts_enabled?: boolean | null
          phone?: string | null
          place_id?: string | null
          primary_city?: string | null
          primary_region_radius_miles?: number | null
          primary_state?: string | null
          privacy_level?: Database["public"]["Enums"]["entity_privacy_level"]
          profile_visible_to_fans?: boolean | null
          refund_policy?: string | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          stripe_payouts_disabled_reason?: string | null
          stripe_payouts_enabled?: boolean | null
          stripe_price_id?: string | null
          stripe_requirements_deadline?: string | null
          stripe_requirements_due?: Json | null
          stripe_requirements_errors?: Json | null
          stripe_status_updated_at?: string | null
          stripe_subscription_id?: string | null
          sub_org_max_count?: number | null
          sub_org_public_registration_enabled?: boolean | null
          sub_org_require_approval?: boolean | null
          ticket_terms?: string | null
          ticketing_enabled?: boolean | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          billing_mode?: Database["public"]["Enums"]["billing_mode"] | null
          branding_email_footer_text?: string | null
          branding_email_from_name?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          city?: string | null
          connect_link_created_at?: string | null
          contact_email?: string | null
          created_at?: string | null
          currency?: string | null
          current_tier_id?: string | null
          default_seat_map_id?: string | null
          default_ticket_fees_cents?: number | null
          demo_org_id?: string | null
          description?: string | null
          email?: string | null
          id?: string
          inherits_license?: boolean
          is_demo_org?: boolean
          latitude?: number | null
          license_cancel_at_period_end?: boolean | null
          license_current_period_end?: string | null
          license_current_period_start?: string | null
          license_grace_ends_at?: string | null
          license_status?: Database["public"]["Enums"]["license_status"] | null
          license_trial_ends_at?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"] | null
          parent_org_id?: string | null
          payout_account_id?: string | null
          payout_descriptor?: string | null
          payout_onboarding_status?:
            | Database["public"]["Enums"]["payout_onboarding_status"]
            | null
          payouts_enabled?: boolean | null
          phone?: string | null
          place_id?: string | null
          primary_city?: string | null
          primary_region_radius_miles?: number | null
          primary_state?: string | null
          privacy_level?: Database["public"]["Enums"]["entity_privacy_level"]
          profile_visible_to_fans?: boolean | null
          refund_policy?: string | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          stripe_payouts_disabled_reason?: string | null
          stripe_payouts_enabled?: boolean | null
          stripe_price_id?: string | null
          stripe_requirements_deadline?: string | null
          stripe_requirements_due?: Json | null
          stripe_requirements_errors?: Json | null
          stripe_status_updated_at?: string | null
          stripe_subscription_id?: string | null
          sub_org_max_count?: number | null
          sub_org_public_registration_enabled?: boolean | null
          sub_org_require_approval?: boolean | null
          ticket_terms?: string | null
          ticketing_enabled?: boolean | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "admin_license_tiers_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_default_seat_map_id_fkey"
            columns: ["default_seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_demo_org_id_fkey"
            columns: ["demo_org_id"]
            isOneToOne: false
            referencedRelation: "demo_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organizations_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organizations_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          athlete_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          email: string
          expires_at: string
          id: string
          org_id: string
          status: Database["public"]["Enums"]["parent_invite_status"]
          team_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          athlete_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email: string
          expires_at: string
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["parent_invite_status"]
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          athlete_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
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
            foreignKeyName: "parent_invites_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "parent_invites_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "parent_invites_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by_user_id?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["payment_event_entity_type"]
          id?: string
          metadata?: Json | null
          org_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by_user_id?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["payment_event_entity_type"]
          id?: string
          metadata?: Json | null
          org_id?: string
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
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
          paid_at: string | null
          parent_id: string
          payment_type: Database["public"]["Enums"]["payment_type"]
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
          org_id: string
          paid_at?: string | null
          parent_id: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
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
          org_id?: string
          paid_at?: string | null
          parent_id?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["org_id"]
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
        ]
      }
      programs: {
        Row: {
          age_max: number | null
          age_min: number | null
          color: string | null
          created_at: string | null
          description: string | null
          gender_category: string
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          slug: string | null
          sport: string | null
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          gender_category?: string
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          slug?: string | null
          sport?: string | null
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          gender_category?: string
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          slug?: string | null
          sport?: string | null
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
      purchases: {
        Row: {
          created_at: string | null
          currency: string | null
          event_id: string
          id: string
          org_id: string
          payment_intent_id: string | null
          payment_method: string | null
          refund_eligible: boolean | null
          status: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          event_id: string
          id?: string
          org_id: string
          payment_intent_id?: string | null
          payment_method?: string | null
          refund_eligible?: boolean | null
          status?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          event_id?: string
          id?: string
          org_id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          refund_eligible?: boolean | null
          status?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          interval: number | null
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
          interval?: number | null
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
          interval?: number | null
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
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            foreignKeyName: "refunds_offline_payment_id_fkey"
            columns: ["offline_payment_id"]
            isOneToOne: false
            referencedRelation: "offline_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["org_id"]
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
      saved_reports: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_shared: boolean | null
          name: string
          org_id: string
          share_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          org_id: string
          share_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          org_id?: string
          share_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "saved_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "saved_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          format: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          org_id: string
          recipients: string[]
          report_config: Json
          schedule: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          format: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          org_id: string
          recipients: string[]
          report_config: Json
          schedule: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          format?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          org_id?: string
          recipients?: string[]
          report_config?: Json
          schedule?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "scheduled_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "scheduled_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          org_id: string
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
          org_id: string
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
          org_id?: string
          status?: Database["public"]["Enums"]["scholarship_program_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "scholarship_programs_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string
          program_id: string | null
          slug: string | null
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
          org_id: string
          program_id?: string | null
          slug?: string | null
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
          org_id?: string
          program_id?: string | null
          slug?: string | null
          sport_id?: string | null
          start_date?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
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
      seat_assignments: {
        Row: {
          assigned_at: string
          id: string
          seat_map_section_id: string
          ticket_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          seat_map_section_id: string
          ticket_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          seat_map_section_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_seat_map_section_id_fkey"
            columns: ["seat_map_section_id"]
            isOneToOne: false
            referencedRelation: "seat_map_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_holds: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          seat_map_section_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          seat_map_section_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          seat_map_section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_seat_map_section_id_fkey"
            columns: ["seat_map_section_id"]
            isOneToOne: false
            referencedRelation: "seat_map_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_map_sections: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          position_metadata: Json
          row_identifier: string
          seat_attributes: Json
          seat_identifier: string
          seat_map_id: string
          section_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          position_metadata?: Json
          row_identifier: string
          seat_attributes?: Json
          seat_identifier: string
          seat_map_id: string
          section_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          position_metadata?: Json
          row_identifier?: string
          seat_attributes?: Json
          seat_identifier?: string
          seat_map_id?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_map_sections_seat_map_id_fkey"
            columns: ["seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_map_snapshots: {
        Row: {
          chart_image_url: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          published_at: string
          seat_map_id: string
          section_count: number
          sections_data: Json
          version: number
        }
        Insert: {
          chart_image_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          published_at?: string
          seat_map_id: string
          section_count?: number
          sections_data?: Json
          version: number
        }
        Update: {
          chart_image_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          published_at?: string
          seat_map_id?: string
          section_count?: number
          sections_data?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "seat_map_snapshots_seat_map_id_fkey"
            columns: ["seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_maps: {
        Row: {
          chart_image_url: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          org_id: string
          published_at: string | null
          published_snapshot_id: string | null
          status: string
          team_id: string | null
          ticketed_event_id: string | null
          updated_at: string
          venue_id: string | null
          version: number
        }
        Insert: {
          chart_image_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          org_id: string
          published_at?: string | null
          published_snapshot_id?: string | null
          status?: string
          team_id?: string | null
          ticketed_event_id?: string | null
          updated_at?: string
          venue_id?: string | null
          version?: number
        }
        Update: {
          chart_image_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          published_at?: string | null
          published_snapshot_id?: string | null
          status?: string
          team_id?: string | null
          ticketed_event_id?: string | null
          updated_at?: string
          venue_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "seat_maps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "seat_maps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "seat_maps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seat_maps_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_field_definitions: {
        Row: {
          created_at: string
          enum_values: Json | null
          field_group: string
          field_key: string
          field_label: string
          field_type: string
          help_text: string | null
          id: string
          is_enabled: boolean
          is_optional: boolean
          sort_order: number
          sport_code: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          enum_values?: Json | null
          field_group: string
          field_key: string
          field_label: string
          field_type: string
          help_text?: string | null
          id?: string
          is_enabled?: boolean
          is_optional?: boolean
          sort_order?: number
          sport_code: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          enum_values?: Json | null
          field_group?: string
          field_key?: string
          field_label?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_enabled?: boolean
          is_optional?: boolean
          sort_order?: number
          sport_code?: string
          unit?: string | null
        }
        Relationships: []
      }
      sports: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          org_id: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          org_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          org_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
      stream_channel_metadata: {
        Row: {
          avatar_url: string | null
          channel_id: string
          created_at: string
          description: string | null
          event_id: string | null
          last_activity_at: string | null
          name: string | null
          pinned_message_ids: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          channel_id: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          last_activity_at?: string | null
          name?: string | null
          pinned_message_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          channel_id?: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          last_activity_at?: string | null
          name?: string | null
          pinned_message_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_channel_metadata_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "stream_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channel_metadata_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_channels: {
        Row: {
          channel_type: string
          created_at: string
          id: string
          org_id: string
          stream_channel_id: string
          team_id: string | null
          updated_at: string
          user_id_1: string | null
          user_id_2: string | null
        }
        Insert: {
          channel_type: string
          created_at?: string
          id?: string
          org_id: string
          stream_channel_id: string
          team_id?: string | null
          updated_at?: string
          user_id_1?: string | null
          user_id_2?: string | null
        }
        Update: {
          channel_type?: string
          created_at?: string
          id?: string
          org_id?: string
          stream_channel_id?: string
          team_id?: string | null
          updated_at?: string
          user_id_1?: string | null
          user_id_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "stream_channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "stream_channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "stream_channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channels_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channels_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channels_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_channels_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_transactions: {
        Row: {
          application_fee_cents: number
          connect_account_id: string
          created_at: string
          gross_amount_cents: number
          id: string
          net_amount_cents: number
          stripe_application_fee_id: string | null
          stripe_charge_id: string | null
          ticket_order_id: string
        }
        Insert: {
          application_fee_cents: number
          connect_account_id: string
          created_at?: string
          gross_amount_cents: number
          id?: string
          net_amount_cents: number
          stripe_application_fee_id?: string | null
          stripe_charge_id?: string | null
          ticket_order_id: string
        }
        Update: {
          application_fee_cents?: number
          connect_account_id?: string
          created_at?: string
          gross_amount_cents?: number
          id?: string
          net_amount_cents?: number
          stripe_application_fee_id?: string | null
          stripe_charge_id?: string | null
          ticket_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_transactions_ticket_order_id_fkey"
            columns: ["ticket_order_id"]
            isOneToOne: true
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_receipts: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          outcome: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          outcome: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          outcome?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      sub_org_requests: {
        Row: {
          contact_email: string
          contact_name: string
          created_at: string
          created_sub_org_id: string | null
          id: string
          parent_org_id: string
          requested_name: string
          requested_sport_codes: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          school_league_type: string | null
          status: Database["public"]["Enums"]["sub_org_request_status"]
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          created_at?: string
          created_sub_org_id?: string | null
          id?: string
          parent_org_id: string
          requested_name: string
          requested_sport_codes?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_league_type?: string | null
          status?: Database["public"]["Enums"]["sub_org_request_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          created_at?: string
          created_sub_org_id?: string | null
          id?: string
          parent_org_id?: string
          requested_name?: string
          requested_sport_codes?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_league_type?: string | null
          status?: Database["public"]["Enums"]["sub_org_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_org_requests_created_sub_org_id_fkey"
            columns: ["created_sub_org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "sub_org_requests_created_sub_org_id_fkey"
            columns: ["created_sub_org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_org_requests_created_sub_org_id_fkey"
            columns: ["created_sub_org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "sub_org_requests_created_sub_org_id_fkey"
            columns: ["created_sub_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_org_requests_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "sub_org_requests_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_org_requests_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "sub_org_requests_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_org_settings: {
        Row: {
          branding_overrides: Json | null
          created_at: string
          enabled_features: Json | null
          enabled_sports: string[] | null
          id: string
          status: Database["public"]["Enums"]["sub_org_status"]
          sub_org_id: string
          updated_at: string
        }
        Insert: {
          branding_overrides?: Json | null
          created_at?: string
          enabled_features?: Json | null
          enabled_sports?: string[] | null
          id?: string
          status?: Database["public"]["Enums"]["sub_org_status"]
          sub_org_id: string
          updated_at?: string
        }
        Update: {
          branding_overrides?: Json | null
          created_at?: string
          enabled_features?: Json | null
          enabled_sports?: string[] | null
          id?: string
          status?: Database["public"]["Enums"]["sub_org_status"]
          sub_org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_org_settings_sub_org_id_fkey"
            columns: ["sub_org_id"]
            isOneToOne: true
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "sub_org_settings_sub_org_id_fkey"
            columns: ["sub_org_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_org_settings_sub_org_id_fkey"
            columns: ["sub_org_id"]
            isOneToOne: true
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "sub_org_settings_sub_org_id_fkey"
            columns: ["sub_org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_coaches: {
        Row: {
          coach_user_id: string
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          org_id: string
          role: string | null
          start_at: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          coach_user_id: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          org_id: string
          role?: string | null
          start_at?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          coach_user_id?: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          org_id?: string
          role?: string | null
          start_at?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "team_coaches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "team_coaches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_coaches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          athlete_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          season_id: string
          status: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          season_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          season_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "team_memberships_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
      team_seasons: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          season_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          season_id: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          season_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_seasons_team_id_fkey"
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
          default_seat_map_id: string | null
          home_venue_id: string | null
          id: string
          invite_code: string
          is_active: boolean
          level_id: string | null
          max_roster_size: number | null
          name: string
          org_id: string
          privacy_level: Database["public"]["Enums"]["entity_privacy_level"]
          program_id: string | null
          sport_id: string | null
          updated_at: string | null
          visible_to_fans: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_seat_map_id?: string | null
          home_venue_id?: string | null
          id?: string
          invite_code: string
          is_active?: boolean
          level_id?: string | null
          max_roster_size?: number | null
          name: string
          org_id: string
          privacy_level?: Database["public"]["Enums"]["entity_privacy_level"]
          program_id?: string | null
          sport_id?: string | null
          updated_at?: string | null
          visible_to_fans?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_seat_map_id?: string | null
          home_venue_id?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          level_id?: string | null
          max_roster_size?: number | null
          name?: string
          org_id?: string
          privacy_level?: Database["public"]["Enums"]["entity_privacy_level"]
          program_id?: string | null
          sport_id?: string | null
          updated_at?: string | null
          visible_to_fans?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_default_seat_map_id_fkey"
            columns: ["default_seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_home_venue_id_fkey"
            columns: ["home_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_access_links: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          order_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          order_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          order_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_access_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_holds: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          order_id: string | null
          qty: number
          ticket_type_id: string
          ticketed_event_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          order_id?: string | null
          qty: number
          ticket_type_id: string
          ticketed_event_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          order_id?: string | null
          qty?: number
          ticket_type_id?: string
          ticketed_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_holds_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_holds_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_order_items: {
        Row: {
          created_at: string | null
          id: string
          line_total_cents: number
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_total_cents: number
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string | null
          id?: string
          line_total_cents?: number
          order_id?: string
          quantity?: number
          ticket_type_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_orders: {
        Row: {
          created_at: string | null
          fees_cents: number
          id: string
          org_id: string
          org_revenue_cents: number | null
          platform_fee_cents: number | null
          processed_at: string | null
          purchaser_email: string
          purchaser_name: string | null
          purchaser_user_id: string | null
          receipt_email_sent_at: string | null
          status: Database["public"]["Enums"]["ticket_order_status"]
          stripe_application_fee_id: string | null
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_connect_account_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          ticketed_event_id: string
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fees_cents?: number
          id?: string
          org_id: string
          org_revenue_cents?: number | null
          platform_fee_cents?: number | null
          processed_at?: string | null
          purchaser_email: string
          purchaser_name?: string | null
          purchaser_user_id?: string | null
          receipt_email_sent_at?: string | null
          status?: Database["public"]["Enums"]["ticket_order_status"]
          stripe_application_fee_id?: string | null
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          ticketed_event_id: string
          total_cents?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fees_cents?: number
          id?: string
          org_id?: string
          org_revenue_cents?: number | null
          platform_fee_cents?: number | null
          processed_at?: string | null
          purchaser_email?: string
          purchaser_name?: string | null
          purchaser_user_id?: string | null
          receipt_email_sent_at?: string | null
          status?: Database["public"]["Enums"]["ticket_order_status"]
          stripe_application_fee_id?: string | null
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          ticketed_event_id?: string
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_purchaser_user_id_fkey"
            columns: ["purchaser_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_purchaser_user_id_fkey"
            columns: ["purchaser_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reservations: {
        Row: {
          created_at: string | null
          event_id: string
          expires_at: string
          id: string
          quantity: number
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          expires_at: string
          id?: string
          quantity: number
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          quantity?: number
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_scans: {
        Row: {
          client_device_id: string | null
          created_at: string | null
          id: string
          org_id: string
          raw_payload_hash: string | null
          scan_method: Database["public"]["Enums"]["scan_method"] | null
          scan_result: Database["public"]["Enums"]["ticket_scan_result"]
          scanned_at: string | null
          scanner_user_id: string | null
          ticket_id: string | null
          ticketed_event_id: string
        }
        Insert: {
          client_device_id?: string | null
          created_at?: string | null
          id?: string
          org_id: string
          raw_payload_hash?: string | null
          scan_method?: Database["public"]["Enums"]["scan_method"] | null
          scan_result: Database["public"]["Enums"]["ticket_scan_result"]
          scanned_at?: string | null
          scanner_user_id?: string | null
          ticket_id?: string | null
          ticketed_event_id: string
        }
        Update: {
          client_device_id?: string | null
          created_at?: string | null
          id?: string
          org_id?: string
          raw_payload_hash?: string | null
          scan_method?: Database["public"]["Enums"]["scan_method"] | null
          scan_result?: Database["public"]["Enums"]["ticket_scan_result"]
          scanned_at?: string | null
          scanner_user_id?: string | null
          ticket_id?: string | null
          ticketed_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_scans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_scans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_scans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_scans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_scans_scanner_user_id_fkey"
            columns: ["scanner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_scans_scanner_user_id_fkey"
            columns: ["scanner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_scans_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_scans_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_staff_links: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          expires_at: string
          id: string
          max_uses: number | null
          org_id: string
          ticketed_event_id: string
          token_hash: string
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          expires_at: string
          id?: string
          max_uses?: number | null
          org_id: string
          ticketed_event_id: string
          token_hash: string
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          expires_at?: string
          id?: string
          max_uses?: number | null
          org_id?: string
          ticketed_event_id?: string
          token_hash?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_staff_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_staff_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_staff_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_staff_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_staff_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_staff_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_staff_links_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          capacity_remaining: number | null
          capacity_total: number | null
          created_at: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          price_cents: number
          sales_end_at: string | null
          sales_start_at: string | null
          seat_map_id: string | null
          seating_mode: string
          sort_order: number | null
          ticketed_event_id: string
          updated_at: string | null
        }
        Insert: {
          capacity_remaining?: number | null
          capacity_total?: number | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          price_cents?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          seat_map_id?: string | null
          seating_mode?: string
          sort_order?: number | null
          ticketed_event_id: string
          updated_at?: string | null
        }
        Update: {
          capacity_remaining?: number | null
          capacity_total?: number | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          price_cents?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          seat_map_id?: string | null
          seating_mode?: string
          sort_order?: number | null
          ticketed_event_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticket_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_seat_map_id_fkey"
            columns: ["seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticketed_events: {
        Row: {
          cover_image_path: string | null
          created_at: string | null
          description: string | null
          ends_at: string
          event_description: string | null
          event_id: string | null
          event_type: Database["public"]["Enums"]["ticketed_event_type"]
          id: string
          is_home: boolean | null
          opponent: string | null
          org_id: string
          program_id: string | null
          program_name_cached: string | null
          sale_status: Database["public"]["Enums"]["ticket_sale_status"] | null
          sales_end_at: string | null
          sales_start_at: string | null
          search_vector: unknown
          season_id: string | null
          season_name_cached: string | null
          seat_map_snapshot_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["ticketed_event_status"]
          team_id: string | null
          ticket_banner_url: string | null
          timezone: string
          title: string
          updated_at: string | null
          venue_address_line1: string | null
          venue_address_line2: string | null
          venue_city: string | null
          venue_country: string | null
          venue_id: string | null
          venue_is_virtual: boolean | null
          venue_name: string | null
          venue_postal_code: string | null
          venue_state: string | null
          venue_virtual_link: string | null
          visibility: Database["public"]["Enums"]["event_visibility"] | null
        }
        Insert: {
          cover_image_path?: string | null
          created_at?: string | null
          description?: string | null
          ends_at: string
          event_description?: string | null
          event_id?: string | null
          event_type?: Database["public"]["Enums"]["ticketed_event_type"]
          id?: string
          is_home?: boolean | null
          opponent?: string | null
          org_id: string
          program_id?: string | null
          program_name_cached?: string | null
          sale_status?: Database["public"]["Enums"]["ticket_sale_status"] | null
          sales_end_at?: string | null
          sales_start_at?: string | null
          search_vector?: unknown
          season_id?: string | null
          season_name_cached?: string | null
          seat_map_snapshot_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["ticketed_event_status"]
          team_id?: string | null
          ticket_banner_url?: string | null
          timezone?: string
          title: string
          updated_at?: string | null
          venue_address_line1?: string | null
          venue_address_line2?: string | null
          venue_city?: string | null
          venue_country?: string | null
          venue_id?: string | null
          venue_is_virtual?: boolean | null
          venue_name?: string | null
          venue_postal_code?: string | null
          venue_state?: string | null
          venue_virtual_link?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"] | null
        }
        Update: {
          cover_image_path?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string
          event_description?: string | null
          event_id?: string | null
          event_type?: Database["public"]["Enums"]["ticketed_event_type"]
          id?: string
          is_home?: boolean | null
          opponent?: string | null
          org_id?: string
          program_id?: string | null
          program_name_cached?: string | null
          sale_status?: Database["public"]["Enums"]["ticket_sale_status"] | null
          sales_end_at?: string | null
          sales_start_at?: string | null
          search_vector?: unknown
          season_id?: string | null
          season_name_cached?: string | null
          seat_map_snapshot_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["ticketed_event_status"]
          team_id?: string | null
          ticket_banner_url?: string | null
          timezone?: string
          title?: string
          updated_at?: string | null
          venue_address_line1?: string | null
          venue_address_line2?: string | null
          venue_city?: string | null
          venue_country?: string | null
          venue_id?: string | null
          venue_is_virtual?: boolean | null
          venue_name?: string | null
          venue_postal_code?: string | null
          venue_state?: string | null
          venue_virtual_link?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ticketed_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticketed_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "ticketed_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "ticketed_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "ticketed_events_seat_map_snapshot_id_fkey"
            columns: ["seat_map_snapshot_id"]
            isOneToOne: false
            referencedRelation: "seat_map_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "ticketed_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketed_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          entry_code: string
          holder_email: string | null
          holder_name: string | null
          holder_user_id: string | null
          id: string
          order_id: string
          org_id: string
          purchase_id: string | null
          qr_hmac_key: string | null
          qr_key_rotated_at: string | null
          qr_token_hash: string
          seat_assignment_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id: string
          ticketed_event_id: string
          transferred_at: string | null
          updated_at: string | null
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_code: string
          holder_email?: string | null
          holder_name?: string | null
          holder_user_id?: string | null
          id?: string
          order_id: string
          org_id: string
          purchase_id?: string | null
          qr_hmac_key?: string | null
          qr_key_rotated_at?: string | null
          qr_token_hash: string
          seat_assignment_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id: string
          ticketed_event_id: string
          transferred_at?: string | null
          updated_at?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_code?: string
          holder_email?: string | null
          holder_name?: string | null
          holder_user_id?: string | null
          id?: string
          order_id?: string
          org_id?: string
          purchase_id?: string | null
          qr_hmac_key?: string | null
          qr_key_rotated_at?: string | null
          qr_token_hash?: string
          seat_assignment_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id?: string
          ticketed_event_id?: string
          transferred_at?: string | null
          updated_at?: string | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_holder_user_id_fkey"
            columns: ["holder_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_holder_user_id_fkey"
            columns: ["holder_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_seat_assignment_id_fkey"
            columns: ["seat_assignment_id"]
            isOneToOne: false
            referencedRelation: "seat_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticketed_event_id_fkey"
            columns: ["ticketed_event_id"]
            isOneToOne: false
            referencedRelation: "ticketed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_feature_assignments: {
        Row: {
          created_at: string | null
          feature_entitlement_id: string
          id: string
          included: boolean | null
          license_tier_id: string
          limit_value: number | null
          role_admin: boolean | null
          role_coach: boolean | null
          role_parent: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feature_entitlement_id: string
          id?: string
          included?: boolean | null
          license_tier_id: string
          limit_value?: number | null
          role_admin?: boolean | null
          role_coach?: boolean | null
          role_parent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feature_entitlement_id?: string
          id?: string
          included?: boolean | null
          license_tier_id?: string
          limit_value?: number | null
          role_admin?: boolean | null
          role_coach?: boolean | null
          role_parent?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_feature_assignments_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_feature_assignments_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_feature_assignments_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "admin_license_tiers_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_feature_assignments_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_plan_contacts: {
        Row: {
          category: string
          email: string | null
          first_name: string | null
          id: string
          is_custom: boolean
          last_name: string | null
          phone: string | null
          travel_plan_id: string
          updated_at: string
        }
        Insert: {
          category: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_custom?: boolean
          last_name?: string | null
          phone?: string | null
          travel_plan_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_custom?: boolean
          last_name?: string | null
          phone?: string | null
          travel_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_plan_contacts_travel_plan_id_fkey"
            columns: ["travel_plan_id"]
            isOneToOne: false
            referencedRelation: "travel_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_plans: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          destination_city: string | null
          destination_country: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_place_id: string | null
          destination_state: string | null
          destination_state_code: string | null
          end_date: string
          hotel_address: string | null
          hotel_confirmation: string | null
          hotel_lat: number | null
          hotel_lng: number | null
          hotel_name: string | null
          hotel_phone: string | null
          hotel_place_id: string | null
          id: string
          itinerary_file_path: string | null
          location: string
          maps_url: string | null
          meeting_locations: Json | null
          notes: string | null
          published_at: string | null
          season_id: string
          start_date: string
          status: string
          team_id: string
          title: string
          updated_at: string | null
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_place_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          destination_city?: string | null
          destination_country?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_place_id?: string | null
          destination_state?: string | null
          destination_state_code?: string | null
          end_date: string
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_lat?: number | null
          hotel_lng?: number | null
          hotel_name?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          id?: string
          itinerary_file_path?: string | null
          location: string
          maps_url?: string | null
          meeting_locations?: Json | null
          notes?: string | null
          published_at?: string | null
          season_id: string
          start_date: string
          status?: string
          team_id: string
          title: string
          updated_at?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          destination_city?: string | null
          destination_country?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_place_id?: string | null
          destination_state?: string | null
          destination_state_code?: string | null
          end_date?: string
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_lat?: number | null
          hotel_lng?: number | null
          hotel_name?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          id?: string
          itinerary_file_path?: string | null
          location?: string
          maps_url?: string | null
          meeting_locations?: Json | null
          notes?: string | null
          published_at?: string | null
          season_id?: string
          start_date?: string
          status?: string
          team_id?: string
          title?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
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
            foreignKeyName: "travel_plans_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
          athlete_id: string
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
          athlete_id: string
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
          athlete_id?: string
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
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "tryout_registrations_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
            foreignKeyName: "uniform_kits_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
          athlete_id: string
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
          athlete_id: string
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
          athlete_id?: string
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
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "uniform_orders_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
            foreignKeyName: "uniform_orders_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons_view"
            referencedColumns: ["season_id"]
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
          athlete_id: string
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
          athlete_id: string
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
          athlete_id?: string
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
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "uniform_submissions_child_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
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
      user_notification_preferences: {
        Row: {
          announcements_channel: string | null
          created_at: string | null
          email_enabled: boolean | null
          game_results_channel: string | null
          id: string
          muted_entities: Json | null
          photos_added_channel: string | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          schedule_changes_channel: string | null
          ticket_updates_channel: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcements_channel?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          game_results_channel?: string | null
          id?: string
          muted_entities?: Json | null
          photos_added_channel?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          schedule_changes_channel?: string | null
          ticket_updates_channel?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcements_channel?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          game_results_channel?: string | null
          id?: string
          muted_entities?: Json | null
          photos_added_channel?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          schedule_changes_channel?: string | null
          ticket_updates_channel?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action: Database["public"]["Enums"]["notification_action"]
          actor_id: string | null
          archived_at: string | null
          body: string
          created_at: string
          dedupe_key: string
          deleted_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          kit_id: string | null
          link_url: string | null
          metadata: Json | null
          org_id: string
          payload: Json | null
          presentation_type: Database["public"]["Enums"]["notification_presentation"]
          read_at: string | null
          role_context: string
          team_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["notification_action"]
          actor_id?: string | null
          archived_at?: string | null
          body: string
          created_at?: string
          dedupe_key: string
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kit_id?: string | null
          link_url?: string | null
          metadata?: Json | null
          org_id: string
          payload?: Json | null
          presentation_type?: Database["public"]["Enums"]["notification_presentation"]
          read_at?: string | null
          role_context?: string
          team_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["notification_action"]
          actor_id?: string | null
          archived_at?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kit_id?: string | null
          link_url?: string | null
          metadata?: Json | null
          org_id?: string
          payload?: Json | null
          presentation_type?: Database["public"]["Enums"]["notification_presentation"]
          read_at?: string | null
          role_context?: string
          team_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "uniform_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "user_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
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
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "user_notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          first_name: string
          home_location: Json | null
          home_zipcode: string | null
          id: string
          is_active: boolean | null
          last_name: string
          org_id: string | null
          permissions: Json | null
          phone: string
          preferences: Json | null
          preferred_timezone: string | null
          profile_completed_at: string | null
          profile_completion_prompted_at: string | null
          requires_org_setup: boolean
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          family_id?: string | null
          first_name?: string
          home_location?: Json | null
          home_zipcode?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string
          org_id?: string | null
          permissions?: Json | null
          phone?: string
          preferences?: Json | null
          preferred_timezone?: string | null
          profile_completed_at?: string | null
          profile_completion_prompted_at?: string | null
          requires_org_setup?: boolean
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          family_id?: string | null
          first_name?: string
          home_location?: Json | null
          home_zipcode?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          org_id?: string | null
          permissions?: Json | null
          phone?: string
          preferences?: Json | null
          preferred_timezone?: string | null
          profile_completed_at?: string | null
          profile_completion_prompted_at?: string | null
          requires_org_setup?: boolean
          role?: Database["public"]["Enums"]["user_role"] | null
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
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
      venue_insights: {
        Row: {
          ai_generated_at: string | null
          ai_summary: string | null
          ai_validation_status: string | null
          ai_what_to_expect: string | null
          created_at: string | null
          fetch_in_progress: boolean | null
          id: string
          last_gemini_call_at: string | null
          last_place_details_call_at: string | null
          photo_urls: Json | null
          photos_json: Json | null
          place_details_fetched_at: string | null
          place_details_json: Json | null
          place_id: string
          place_id_valid: boolean | null
          updated_at: string | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_summary?: string | null
          ai_validation_status?: string | null
          ai_what_to_expect?: string | null
          created_at?: string | null
          fetch_in_progress?: boolean | null
          id?: string
          last_gemini_call_at?: string | null
          last_place_details_call_at?: string | null
          photo_urls?: Json | null
          photos_json?: Json | null
          place_details_fetched_at?: string | null
          place_details_json?: Json | null
          place_id: string
          place_id_valid?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_summary?: string | null
          ai_validation_status?: string | null
          ai_what_to_expect?: string | null
          created_at?: string | null
          fetch_in_progress?: boolean | null
          id?: string
          last_gemini_call_at?: string | null
          last_place_details_call_at?: string | null
          photo_urls?: Json | null
          photos_json?: Json | null
          place_details_fetched_at?: string | null
          place_details_json?: Json | null
          place_id?: string
          place_id_valid?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      venue_nearby_amenities_summaries: {
        Row: {
          created_at: string | null
          event_type: string
          gemini_called_at: string | null
          id: string
          summaries_json: Json | null
          time_window: string
          updated_at: string | null
          venue_nearby_places_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          gemini_called_at?: string | null
          id?: string
          summaries_json?: Json | null
          time_window: string
          updated_at?: string | null
          venue_nearby_places_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          gemini_called_at?: string | null
          id?: string
          summaries_json?: Json | null
          time_window?: string
          updated_at?: string | null
          venue_nearby_places_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_nearby_amenities_summaries_venue_nearby_places_id_fkey"
            columns: ["venue_nearby_places_id"]
            isOneToOne: false
            referencedRelation: "venue_nearby_places"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_nearby_places: {
        Row: {
          created_at: string | null
          fetch_in_progress: boolean | null
          fetched_at: string | null
          id: string
          last_api_call_at: string | null
          latitude: number | null
          longitude: number | null
          raw_places_json: Json | null
          updated_at: string | null
          venue_key: string
        }
        Insert: {
          created_at?: string | null
          fetch_in_progress?: boolean | null
          fetched_at?: string | null
          id?: string
          last_api_call_at?: string | null
          latitude?: number | null
          longitude?: number | null
          raw_places_json?: Json | null
          updated_at?: string | null
          venue_key: string
        }
        Update: {
          created_at?: string | null
          fetch_in_progress?: boolean | null
          fetched_at?: string | null
          id?: string
          last_api_call_at?: string | null
          latitude?: number | null
          longitude?: number | null
          raw_places_json?: Json | null
          updated_at?: string | null
          venue_key?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string | null
          default_seat_map_id: string | null
          google_place_id: string | null
          id: string
          is_virtual: boolean
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
          org_id: string
          postal_code: string | null
          state: string | null
          updated_at: string | null
          virtual_link: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_seat_map_id?: string | null
          google_place_id?: string | null
          id?: string
          is_virtual?: boolean
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          org_id: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          virtual_link?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_seat_map_id?: string | null
          google_place_id?: string | null
          id?: string
          is_virtual?: boolean
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          org_id?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_default_seat_map_id_fkey"
            columns: ["default_seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_athlete_links: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          end_time_seconds: number | null
          id: string
          link_type: Database["public"]["Enums"]["video_link_type"]
          start_time_seconds: number | null
          video_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          end_time_seconds?: number | null
          id?: string
          link_type?: Database["public"]["Enums"]["video_link_type"]
          start_time_seconds?: number | null
          video_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          end_time_seconds?: number | null
          id?: string
          link_type?: Database["public"]["Enums"]["video_link_type"]
          start_time_seconds?: number | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_athlete_links_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "video_athlete_links_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_athlete_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_athlete_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_athlete_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_bookmarks: {
        Row: {
          created_at: string
          id: string
          label: string | null
          timestamp_seconds: number
          updated_at: string
          user_id: string
          video_id: string
          visibility: Database["public"]["Enums"]["video_bookmark_visibility"]
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          timestamp_seconds: number
          updated_at?: string
          user_id: string
          video_id: string
          visibility?: Database["public"]["Enums"]["video_bookmark_visibility"]
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          timestamp_seconds?: number
          updated_at?: string
          user_id?: string
          video_id?: string
          visibility?: Database["public"]["Enums"]["video_bookmark_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "video_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_bookmarks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          timestamp_seconds: number | null
          updated_at: string
          video_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          timestamp_seconds?: number | null
          updated_at?: string
          video_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          timestamp_seconds?: number | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_favorites: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_favorites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "video_favorites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_favorites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "video_favorites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_note_targets: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          note_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          note_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_note_targets_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "video_note_targets_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_note_targets_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "video_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          drawing_data: Json | null
          duration_seconds: number | null
          id: string
          scope: Database["public"]["Enums"]["video_note_scope"]
          timestamp_seconds: number | null
          updated_at: string
          video_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          drawing_data?: Json | null
          duration_seconds?: number | null
          id?: string
          scope?: Database["public"]["Enums"]["video_note_scope"]
          timestamp_seconds?: number | null
          updated_at?: string
          video_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          drawing_data?: Json | null
          duration_seconds?: number | null
          id?: string
          scope?: Database["public"]["Enums"]["video_note_scope"]
          timestamp_seconds?: number | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_notes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reviews: {
        Row: {
          athlete_id: string
          created_at: string
          guardian_id: string
          id: string
          notified_at: string
          rating: number | null
          responded_at: string | null
          response_text: string | null
          status: Database["public"]["Enums"]["video_review_status"]
          updated_at: string
          video_id: string
          viewed_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          guardian_id: string
          id?: string
          notified_at?: string
          rating?: number | null
          responded_at?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["video_review_status"]
          updated_at?: string
          video_id: string
          viewed_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          guardian_id?: string
          id?: string
          notified_at?: string
          rating?: number | null
          responded_at?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["video_review_status"]
          updated_at?: string
          video_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_reviews_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "admin_payments"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "video_reviews_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reviews_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reviews_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reviews_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_shares: {
        Row: {
          access_count: number | null
          allow_download: boolean | null
          created_at: string | null
          created_by: string
          email_recipients: string[] | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          org_id: string
          password_hash: string | null
          revoked_at: string | null
          token: string
          updated_at: string | null
          video_id: string
        }
        Insert: {
          access_count?: number | null
          allow_download?: boolean | null
          created_at?: string | null
          created_by: string
          email_recipients?: string[] | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          org_id: string
          password_hash?: string | null
          revoked_at?: string | null
          token: string
          updated_at?: string | null
          video_id: string
        }
        Update: {
          access_count?: number | null
          allow_download?: boolean | null
          created_at?: string | null
          created_by?: string
          email_recipients?: string[] | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          org_id?: string
          password_hash?: string | null
          revoked_at?: string | null
          token?: string
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_shares_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "video_shares_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "video_shares_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tag_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          tag_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          tag_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          tag_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tag_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tag_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "video_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tag_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          tag_type: Database["public"]["Enums"]["video_tag_type"]
          updated_at: string
          usage_count: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          tag_type?: Database["public"]["Enums"]["video_tag_type"]
          updated_at?: string
          usage_count?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          tag_type?: Database["public"]["Enums"]["video_tag_type"]
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "video_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "video_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          aspect_ratio: string | null
          bookmark_count: number | null
          category: Database["public"]["Enums"]["video_category"]
          comment_count: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_seconds: number | null
          error_message: string | null
          error_type: string | null
          event_id: string | null
          fan_visible: boolean | null
          id: string
          last_shared_at: string | null
          max_stored_frame_rate: number | null
          max_stored_resolution: string | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          org_id: string
          passthrough: Json | null
          processing_completed_at: string | null
          processing_started_at: string | null
          recorded_at: string | null
          resolution_tier: string | null
          search_vector: unknown
          share_count: number | null
          status: Database["public"]["Enums"]["video_status"]
          team_id: string | null
          thumbnail_time_offset: number | null
          thumbnail_timestamp: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          upload_completed_at: string | null
          upload_started_at: string | null
          uploaded_by: string
          visibility: Database["public"]["Enums"]["video_visibility"]
        }
        Insert: {
          aspect_ratio?: string | null
          bookmark_count?: number | null
          category?: Database["public"]["Enums"]["video_category"]
          comment_count?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_type?: string | null
          event_id?: string | null
          fan_visible?: boolean | null
          id?: string
          last_shared_at?: string | null
          max_stored_frame_rate?: number | null
          max_stored_resolution?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          org_id: string
          passthrough?: Json | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          recorded_at?: string | null
          resolution_tier?: string | null
          search_vector?: unknown
          share_count?: number | null
          status?: Database["public"]["Enums"]["video_status"]
          team_id?: string | null
          thumbnail_time_offset?: number | null
          thumbnail_timestamp?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          upload_completed_at?: string | null
          upload_started_at?: string | null
          uploaded_by: string
          visibility?: Database["public"]["Enums"]["video_visibility"]
        }
        Update: {
          aspect_ratio?: string | null
          bookmark_count?: number | null
          category?: Database["public"]["Enums"]["video_category"]
          comment_count?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_type?: string | null
          event_id?: string | null
          fan_visible?: boolean | null
          id?: string
          last_shared_at?: string | null
          max_stored_frame_rate?: number | null
          max_stored_resolution?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          org_id?: string
          passthrough?: Json | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          recorded_at?: string | null
          resolution_tier?: string | null
          search_vector?: unknown
          share_count?: number | null
          status?: Database["public"]["Enums"]["video_status"]
          team_id?: string | null
          thumbnail_time_offset?: number | null
          thumbnail_timestamp?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          upload_completed_at?: string | null
          upload_started_at?: string | null
          uploaded_by?: string
          visibility?: Database["public"]["Enums"]["video_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "videos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "videos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "videos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "videos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waivers: {
        Row: {
          amount_cents: number
          created_at: string | null
          created_by_admin_id: string
          fee_assignment_id: string
          id: string
          org_id: string
          reason: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          created_by_admin_id: string
          fee_assignment_id: string
          id?: string
          org_id: string
          reason: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          created_by_admin_id?: string
          fee_assignment_id?: string
          id?: string
          org_id?: string
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "waivers_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_entitlement_overrides_list: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          expires_at: string | null
          feature_entitlement_id: string | null
          feature_key: string | null
          feature_name: string | null
          id: string | null
          limit_value: number | null
          override_action: string | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_by_email: string | null
          revoked_reason: string | null
          role_admin: boolean | null
          role_coach: boolean | null
          role_parent: boolean | null
          status: string | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_overrides_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_overrides_feature_entitlement_id_fkey"
            columns: ["feature_entitlement_id"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
      admin_feature_entitlements_list: {
        Row: {
          active_overrides_count: number | null
          archived_at: string | null
          assigned_tier_keys: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
          discovery_source: string | null
          display_name: string | null
          feature_key: string | null
          feature_type: string | null
          id: string | null
          integrations: string[] | null
          is_quantifiable: boolean | null
          is_removable: boolean | null
          is_system_feature: boolean | null
          is_toggleable: boolean | null
          lock_reason: string | null
          parent_feature_key: string | null
          platform_admin_only: boolean | null
          rollout_status: string | null
          tier_assignments_count: number | null
          unavailable_gate_action: string | null
          updated_at: string | null
          visible_to_admin: boolean | null
          visible_to_coach: boolean | null
          visible_to_parent: boolean | null
        }
        Insert: {
          active_overrides_count?: never
          archived_at?: string | null
          assigned_tier_keys?: never
          category?: string | null
          created_at?: string | null
          description?: string | null
          discovery_source?: never
          display_name?: string | null
          feature_key?: string | null
          feature_type?: string | null
          id?: string | null
          integrations?: never
          is_quantifiable?: never
          is_removable?: boolean | null
          is_system_feature?: boolean | null
          is_toggleable?: boolean | null
          lock_reason?: string | null
          parent_feature_key?: string | null
          platform_admin_only?: boolean | null
          rollout_status?: string | null
          tier_assignments_count?: never
          unavailable_gate_action?: string | null
          updated_at?: string | null
          visible_to_admin?: never
          visible_to_coach?: never
          visible_to_parent?: never
        }
        Update: {
          active_overrides_count?: never
          archived_at?: string | null
          assigned_tier_keys?: never
          category?: string | null
          created_at?: string | null
          description?: string | null
          discovery_source?: never
          display_name?: string | null
          feature_key?: string | null
          feature_type?: string | null
          id?: string | null
          integrations?: never
          is_quantifiable?: never
          is_removable?: boolean | null
          is_system_feature?: boolean | null
          is_toggleable?: boolean | null
          lock_reason?: string | null
          parent_feature_key?: string | null
          platform_admin_only?: boolean | null
          rollout_status?: string | null
          tier_assignments_count?: never
          unavailable_gate_action?: string | null
          updated_at?: string | null
          visible_to_admin?: never
          visible_to_coach?: never
          visible_to_parent?: never
        }
        Relationships: [
          {
            foreignKeyName: "feature_entitlements_parent_feature_key_fkey"
            columns: ["parent_feature_key"]
            isOneToOne: false
            referencedRelation: "admin_entitlement_overrides_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_entitlements_parent_feature_key_fkey"
            columns: ["parent_feature_key"]
            isOneToOne: false
            referencedRelation: "admin_feature_entitlements_list"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "feature_entitlements_parent_feature_key_fkey"
            columns: ["parent_feature_key"]
            isOneToOne: false
            referencedRelation: "feature_entitlements"
            referencedColumns: ["feature_key"]
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
          id: string | null
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
          org_id: string | null
          organization_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["org_id"]
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
          org_id: string | null
          organization_name: string | null
          paid_count: number | null
          payment_rate_percent: number | null
          unpaid_count: number | null
        }
        Relationships: []
      }
      admin_license_metrics: {
        Row: {
          active_overrides: number | null
          active_tiers: number | null
          archived_features: number | null
          features_without_assignment: number | null
          orgs_with_tier: number | null
          tiers_missing_price_id: number | null
          tiers_with_archived_features: number | null
          total_features: number | null
        }
        Relationships: []
      }
      admin_license_tiers_list: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          included_features_count: number | null
          orgs_using_count: number | null
          status: string | null
          stripe_active: boolean | null
          stripe_amount_cents: number | null
          stripe_currency: string | null
          stripe_interval: string | null
          stripe_price_id: string | null
          stripe_product_name: string | null
          stripe_verified_at: string | null
          tier_key: string | null
          tier_name: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          included_features_count?: never
          orgs_using_count?: never
          status?: string | null
          stripe_active?: boolean | null
          stripe_amount_cents?: number | null
          stripe_currency?: string | null
          stripe_interval?: string | null
          stripe_price_id?: string | null
          stripe_product_name?: string | null
          stripe_verified_at?: string | null
          tier_key?: string | null
          tier_name?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          included_features_count?: never
          orgs_using_count?: never
          status?: string | null
          stripe_active?: boolean | null
          stripe_amount_cents?: number | null
          stripe_currency?: string | null
          stripe_interval?: string | null
          stripe_price_id?: string | null
          stripe_product_name?: string | null
          stripe_verified_at?: string | null
          tier_key?: string | null
          tier_name?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      admin_organizations: {
        Row: {
          created_at: string | null
          current_tier_id: string | null
          id: string | null
          license_current_period_end: string | null
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
          tier_name: string | null
          updated_at: string | null
          user_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "admin_license_tiers_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_payments: {
        Row: {
          amount_cents: number | null
          athlete_id: string | null
          athlete_name: string | null
          created_at: string | null
          currency: string | null
          fee_assignment_id: string | null
          fee_id: string | null
          fee_title: string | null
          id: string | null
          org_id: string | null
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
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["org_id"]
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
          total_athletes: number | null
          total_payment_volume_cents: number | null
          total_teams: number | null
          total_users: number | null
          trial_organizations: number | null
        }
        Relationships: []
      }
      admin_structure: {
        Row: {
          org_id: string | null
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
          is_disabled: boolean | null
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
          is_disabled?: never
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
          is_disabled?: never
          is_platform_admin?: never
          last_sign_in_at?: never
          organizations?: never
          phone?: string | null
          roles?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      derived_families_mv: {
        Row: {
          athlete_count: number | null
          athlete_ids: string[] | null
          family_group_id: string | null
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "athlete_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
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
            referencedColumns: ["org_id"]
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
      team_seasons_view: {
        Row: {
          end_date: string | null
          is_active: boolean | null
          name: string | null
          org_id: string | null
          season_id: string | null
          season_is_active: boolean | null
          start_date: string | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_fees_status"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "admin_structure"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      add_org_role_with_permissions: {
        Args: {
          p_org_id: string
          p_permissions?: Json
          p_role: Database["public"]["Enums"]["org_member_role"]
          p_user_id: string
        }
        Returns: string
      }
      admin_activate_organization: {
        Args: { reason: string; target_org_id: string }
        Returns: Json
      }
      admin_add_org_role: {
        Args: {
          reason: string
          target_org_id: string
          target_role: Database["public"]["Enums"]["org_member_role"]
          target_user_id: string
        }
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
      admin_change_org_role: {
        Args: {
          new_role: Database["public"]["Enums"]["org_member_role"]
          old_role: Database["public"]["Enums"]["org_member_role"]
          reason: string
          target_org_id: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_create_feature_flag:
        | {
            Args: {
              p_description?: string
              p_key: string
              p_value_type: Database["public"]["Enums"]["feature_flag_value_type"]
            }
            Returns: Json
          }
        | {
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
      admin_remove_org_role: {
        Args: {
          reason: string
          target_org_id: string
          target_role: Database["public"]["Enums"]["org_member_role"]
          target_user_id: string
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
      admin_reset_mock_organization: {
        Args: { reason: string; target_org_id: string }
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
      athlete_has_active_guardian: {
        Args: { p_athlete_id: string; p_org_id: string }
        Returns: boolean
      }
      athlete_is_visible_to_user: {
        Args: { check_athlete_id: string; check_user_id: string }
        Returns: boolean
      }
      auth_debug_uid: { Args: never; Returns: Json }
      bookmark_event: { Args: { p_event_id: string }; Returns: boolean }
      build_reporting_where_clause: {
        Args: {
          p_athlete_id?: string
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: string
      }
      bulk_apply_to_tiers: {
        Args: {
          p_action: string
          p_feature_ids: string[]
          p_role_admin?: boolean
          p_role_coach?: boolean
          p_role_parent?: boolean
          p_tier_ids: string[]
        }
        Returns: Json
      }
      bulk_update_feature_category: {
        Args: { p_feature_ids: string[]; p_new_category: string }
        Returns: Json
      }
      bulk_update_feature_status: {
        Args: { p_feature_ids: string[]; p_new_status: string }
        Returns: Json
      }
      bulk_update_role_visibility: {
        Args: {
          p_feature_ids: string[]
          p_role_type: string
          p_visible: boolean
        }
        Returns: Json
      }
      can_edit_athlete: {
        Args: { athlete_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      can_edit_video: {
        Args: { p_user_id: string; p_video_id: string }
        Returns: boolean
      }
      can_fetch_gemini: { Args: { p_place_id: string }; Returns: boolean }
      can_fetch_nearby_gemini: {
        Args: {
          p_event_type: string
          p_time_window: string
          p_venue_key: string
        }
        Returns: boolean
      }
      can_fetch_nearby_places: {
        Args: { p_venue_key: string }
        Returns: boolean
      }
      can_fetch_place_details: {
        Args: { p_place_id: string }
        Returns: boolean
      }
      can_manage_seat_map_storage: {
        Args: { check_user_id: string; object_name: string }
        Returns: boolean
      }
      can_moderate_gallery: {
        Args: { gallery_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      can_perform_admin_action: {
        Args: {
          required_roles: Database["public"]["Enums"]["platform_admin_role"][]
        }
        Returns: boolean
      }
      can_upload_to_gallery: {
        Args: { gallery_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      can_view_athlete: {
        Args: { athlete_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      can_view_gallery: {
        Args: { gallery_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      can_view_video: {
        Args: { p_user_id: string; p_video_id: string }
        Returns: boolean
      }
      can_view_video_note: {
        Args: { p_note_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_video_note_target: {
        Args: { p_target_note_id: string; p_user_id: string }
        Returns: boolean
      }
      check_max_sub_org_count: {
        Args: { p_parent_org_id: string }
        Returns: boolean
      }
      check_platform_admin: { Args: never; Returns: boolean }
      check_reservation_conflicts: {
        Args: {
          p_end_at: string
          p_exclude_reservation_id?: string
          p_org_id: string
          p_resource_id: string
          p_start_at: string
          p_tentative_blocks?: boolean
        }
        Returns: {
          conflicting_blackouts: Json
          conflicting_reservations: Json
          has_conflict: boolean
        }[]
      }
      check_video_notes_insert_policy: {
        Args: { p_author_id: string; p_video_id: string }
        Returns: Json
      }
      cleanup_expired_fan_feed: { Args: never; Returns: undefined }
      cleanup_expired_reservations: { Args: never; Returns: number }
      cleanup_expired_seat_holds: { Args: never; Returns: number }
      cleanup_expired_slug_redirects: { Args: never; Returns: number }
      clear_travel_override: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      clone_seat_map: {
        Args: {
          p_new_name?: string
          p_source_seat_map_id: string
          p_target_team_id?: string
          p_target_venue_id?: string
        }
        Returns: string
      }
      coach_has_medical_access: {
        Args: { athlete_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      coach_team_ids: { Args: { check_user_id: string }; Returns: string[] }
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
      create_athlete_with_guardians: {
        Args: {
          p_athlete_data: Json
          p_athlete_sports?: Json[]
          p_guardians?: Json[]
          p_org_id: string
        }
        Returns: Json
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
      create_fee_with_assignments: {
        Args: { p_assignments: Json; p_fee_data: Json }
        Returns: Json
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
      create_reservation: {
        Args: {
          p_allow_conflict?: boolean
          p_end_at: string
          p_event_id?: string
          p_facility_id: string
          p_notes?: string
          p_org_id: string
          p_program_id?: string
          p_reservation_type: string
          p_resource_id: string
          p_sport_id?: string
          p_start_at: string
          p_status?: string
          p_team_id?: string
          p_tentative_blocks?: boolean
          p_title: string
        }
        Returns: string
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
      decrement_ticket_capacity: {
        Args: { p_quantity: number; p_ticket_type_id: string }
        Returns: undefined
      }
      ensure_entity_gallery: {
        Args: {
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["gallery_type"]
          p_name?: string
          p_org_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      extract_gallery_id_from_path: {
        Args: { storage_path: string }
        Returns: string
      }
      find_guardian_by_email: {
        Args: { p_email: string; p_org_id: string }
        Returns: {
          display_name: string
          email: string
          linked_athletes: Json
          phone: string
          user_id: string
        }[]
      }
      follow_athlete: {
        Args: { p_athlete_id: string; p_source?: string }
        Returns: boolean
      }
      follow_org: {
        Args: { p_org_id: string; p_source?: string }
        Returns: boolean
      }
      follow_team: {
        Args: { p_source?: string; p_team_id: string }
        Returns: boolean
      }
      format_entry_code: { Args: { code: string }; Returns: string }
      format_event_location_address: {
        Args: { p_location_id: string }
        Returns: string
      }
      generate_entry_code: { Args: never; Returns: string }
      generate_recurring_event_instances: {
        Args: {
          p_pattern_id: string
          p_start_date: string
          p_template_event_id: string
        }
        Returns: number
      }
      generate_sport_slug: { Args: { sport_name: string }; Returns: string }
      get_admin_users: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          display_name: string
          email: string
          email_confirmed: boolean
          id: string
          is_disabled: boolean
          is_platform_admin: boolean
          last_sign_in_at: string
          organizations: Json
          phone: string
          roles: string[]
          updated_at: string
        }[]
      }
      get_athlete_family_details: {
        Args: { p_athlete_id: string; p_org_id: string }
        Returns: Json
      }
      get_athlete_guardians: {
        Args: { p_athlete_id: string; p_org_id: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          guardian_id: string
          phone: string
          relationship_type: string
          status: Database["public"]["Enums"]["athlete_guardian_status"]
          user_id: string
        }[]
      }
      get_athlete_profile: { Args: { p_athlete_id: string }; Returns: Json }
      get_athletes_with_guardian_status: {
        Args: { p_limit?: number; p_offset?: number; p_org_id: string }
        Returns: {
          allergies: string
          athlete_id: string
          birthdate: string
          created_at: string
          deleted_at: string
          emergency_contact_name: string
          emergency_contact_phone: string
          family_id: string
          first_name: string
          gender: string
          has_active_guardian: boolean
          jersey_number: string
          last_name: string
          medical_notes: string
          preferred_name: string
          updated_at: string
        }[]
      }
      get_channel_members: {
        Args: { channel_uuid: string }
        Returns: {
          role: string
          user_id: string
        }[]
      }
      get_communication_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_default_staff_permissions: { Args: never; Returns: Json }
      get_demo_user_id_by_role: { Args: { p_role: string }; Returns: string }
      get_demo_user_org_id: { Args: { check_user_id: string }; Returns: string }
      get_derived_family_for_athlete: {
        Args: { p_athlete_id: string; p_org_id: string }
        Returns: Json
      }
      get_effective_license_org_id: {
        Args: { p_org_id: string }
        Returns: string
      }
      get_environment_from_url: {
        Args: never
        Returns: Database["public"]["Enums"]["feature_flag_environment"]
      }
      get_errors_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
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
      get_events_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_family_athletes_via_guardians: {
        Args: { p_athlete_id: string; p_org_id: string }
        Returns: {
          athlete_id: string
        }[]
      }
      get_fan_calendar: {
        Args: {
          p_end_date?: string
          p_org_ids?: string[]
          p_sources?: string[]
          p_start_date?: string
        }
        Returns: Json
      }
      get_feature_ancestors: {
        Args: { p_feature_key: string; p_max_depth?: number }
        Returns: string[]
      }
      get_feature_children: {
        Args: { p_feature_key: string; p_include_archived?: boolean }
        Returns: {
          depth: number
          feature_key: string
          feature_name: string
        }[]
      }
      get_feature_gate: {
        Args: { p_feature_key: string; p_org_id: string; p_user_id: string }
        Returns: Json
      }
      get_feature_gates: {
        Args: { p_feature_keys: string[]; p_org_id: string; p_user_id: string }
        Returns: Json
      }
      get_gallery_photo_counts: {
        Args: { p_gallery_ids: string[] }
        Returns: {
          gallery_id: string
          pending_count: number
          total_count: number
        }[]
      }
      get_guardian_athletes: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: {
          athlete_id: string
          birthdate: string
          first_name: string
          gender: string
          last_name: string
          relationship_type: string
          status: Database["public"]["Enums"]["athlete_guardian_status"]
        }[]
      }
      get_guardian_attachment_requests_for_admin: {
        Args: {
          p_org_id: string
          p_status?: Database["public"]["Enums"]["guardian_attachment_request_status"]
        }
        Returns: {
          athlete_birthdate: string
          athlete_first_name: string
          athlete_id: string
          athlete_last_name: string
          created_at: string
          decision_reason: string
          expires_at: string
          id: string
          org_id: string
          requested_by_user_id: string
          requester_display_name: string
          requester_email: string
          reviewed_at: string
          reviewed_by_user_id: string
          reviewer_display_name: string
          reviewer_email: string
          status: Database["public"]["Enums"]["guardian_attachment_request_status"]
          updated_at: string
        }[]
      }
      get_guardian_video_athletes: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: string[]
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
      get_operations_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_org_id: string
          p_sub_org_id?: string
        }
        Returns: Json
      }
      get_or_create_static_gallery: {
        Args: {
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["gallery_type"]
          p_org_id: string
          p_user_id: string
        }
        Returns: string
      }
      get_org_health_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_org_id: string
          p_sub_org_id?: string
        }
        Returns: Json
      }
      get_org_photo_storage_limit_bytes: {
        Args: { p_org_id: string }
        Returns: number
      }
      get_org_profile: { Args: { p_org_id: string }; Returns: Json }
      get_org_slug_by_id: { Args: { p_org_id: string }; Returns: string }
      get_org_staff: {
        Args: { p_org_id: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          org_id: string
          permissions: Json
          role: Database["public"]["Enums"]["org_member_role"]
          updated_at: string
          user_display_name: string
          user_email: string
          user_first_name: string
          user_id: string
          user_last_name: string
        }[]
      }
      get_organization_users: {
        Args: { target_org_id: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          email_confirmed: boolean
          id: string
          is_disabled: boolean
          is_platform_admin: boolean
          last_sign_in_at: string
          phone: string
          roles: string[]
          updated_at: string
        }[]
      }
      get_orphaned_athletes: {
        Args: { p_org_id: string }
        Returns: {
          athlete_id: string
          birthdate: string
          created_at: string
          first_name: string
          last_name: string
        }[]
      }
      get_parent_invite_details: {
        Args: { p_token: string }
        Returns: {
          already_accepted: boolean
          athlete_id: string
          email: string
          expired: boolean
          message: string
          org_id: string
          valid: boolean
        }[]
      }
      get_participation_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_payment_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_pending_guardian_attachment_count: {
        Args: { p_org_id: string }
        Returns: number
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
      get_public_org_theme: { Args: { org_id_input: string }; Returns: string }
      get_registration_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_org_id: string
          p_sub_org_id?: string
        }
        Returns: Json
      }
      get_related_galleries: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: Database["public"]["CompositeTypes"]["related_gallery_item"][]
        SetofOptions: {
          from: "*"
          to: "related_gallery_item"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_revenue_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_scheduling_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_schema_columns: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
          table_name: string
        }[]
      }
      get_schema_hash: { Args: never; Returns: string }
      get_schema_tables: {
        Args: never
        Returns: {
          table_name: string
          table_type: string
        }[]
      }
      get_team_profile: { Args: { p_team_id: string }; Returns: Json }
      get_ticketing_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
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
      get_travel_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
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
      get_uniform_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_user_actor_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["event_actor_role"]
      }
      get_user_children: { Args: { check_user_id: string }; Returns: string[] }
      get_user_organizations: {
        Args: { check_user_id: string }
        Returns: {
          org_id: string
          org_name: string
          roles: Database["public"]["Enums"]["org_member_role"][]
        }[]
      }
      get_user_roles_for_org: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: Database["public"]["Enums"]["org_member_role"][]
      }
      get_video_metrics: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_level_id?: string
          p_org_id: string
          p_program_id?: string
          p_season_id?: string
          p_sport_id?: string
          p_sub_org_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      get_video_notes_policies: { Args: never; Returns: Json }
      import_athletes_from_spreadsheet: {
        Args: {
          p_assign_teams_from_spreadsheet?: boolean
          p_create_families?: boolean
          p_import_id: string
          p_import_mode: string
          p_link_existing_families?: boolean
          p_org_id: string
          p_rows: Json
          p_season_id?: string
          p_team_id?: string
        }
        Returns: Json
      }
      increment_share_access: { Args: { p_token: string }; Returns: undefined }
      increment_ticket_capacity: {
        Args: { p_quantity: number; p_ticket_type_id: string }
        Returns: undefined
      }
      is_coach_for_team: {
        Args: { team_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      is_demo_account: { Args: { check_user_id: string }; Returns: boolean }
      is_mock_organization: { Args: { org_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { org_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      is_org_license_active: { Args: { org_id: string }; Returns: boolean }
      is_org_license_readonly_allowed: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      is_parent_of_athlete: {
        Args: { athlete_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      is_parent_of_child: {
        Args: { check_child_id: string; check_user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_travel_event: { Args: { p_event_id: string }; Returns: boolean }
      link_guardian_to_athlete: {
        Args: {
          p_athlete_id: string
          p_created_by_user_id?: string
          p_email: string
          p_org_id: string
          p_relationship_type?: string
        }
        Returns: Json
      }
      lock_and_hold_reserved_seats: {
        Args: { p_expires_at: string; p_order_id: string; p_seat_ids: string[] }
        Returns: undefined
      }
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
      normalize_email: { Args: { email: string }; Returns: string }
      normalize_entry_code: { Args: { code: string }; Returns: string }
      org_is_empty: { Args: { check_org_id: string }; Returns: boolean }
      parent_can_access_team_via_membership: {
        Args: {
          check_season_id: string
          check_team_id: string
          check_user_id: string
        }
        Returns: boolean
      }
      pg_advisory_lock_wrapper: { Args: { key: number }; Returns: undefined }
      pg_advisory_unlock_wrapper: { Args: { key: number }; Returns: undefined }
      process_payment_allocation: {
        Args: { p_amount_cents: number; p_fee_assignment_id: string }
        Returns: undefined
      }
      publish_seat_map: { Args: { p_seat_map_id: string }; Returns: string }
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
      release_expired_ticket_holds: {
        Args: never
        Returns: {
          released_capacity: number
          released_holds: number
        }[]
      }
      remove_bookmark: { Args: { p_event_id: string }; Returns: boolean }
      remove_guardian_from_athlete: {
        Args: { p_athlete_id: string; p_org_id: string; p_user_id: string }
        Returns: Json
      }
      remove_org_role: {
        Args: {
          p_org_id: string
          p_role: Database["public"]["Enums"]["org_member_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      resend_guardian_invite: { Args: { p_invite_id: string }; Returns: Json }
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
      resolve_org_from_slug: {
        Args: { p_slug: string }
        Returns: {
          current_slug: string
          name: string
          org_id: string
          status: Database["public"]["Enums"]["org_status"]
        }[]
      }
      resolve_seat_map_for_event: {
        Args: {
          p_event_id: string
          p_org_id?: string
          p_team_id?: string
          p_venue_id?: string
        }
        Returns: string
      }
      resolve_travel_contacts_for_plan: {
        Args: { p_plan_id: string }
        Returns: Json
      }
      review_guardian_attachment_request: {
        Args: {
          p_approve: boolean
          p_decision_reason?: string
          p_request_id: string
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
      revoke_staff_access: {
        Args: { p_org_id: string; p_reason?: string; p_user_id: string }
        Returns: string
      }
      sanitize_metadata: { Args: { p_metadata: Json }; Returns: Json }
      search_athletes_for_guardian: {
        Args: { p_limit?: number; p_org_id: string; p_search: string }
        Returns: {
          birthdate: string
          first_name: string
          gender: string
          id: string
          last_name: string
        }[]
      }
      search_entities: {
        Args: { p_entity_types?: string[]; p_limit?: number; p_query: string }
        Returns: Json
      }
      set_travel_override: {
        Args: { p_event_id: string; p_is_travel: boolean; p_reason?: string }
        Returns: undefined
      }
      slugify: { Args: { input: string }; Returns: string }
      soft_delete_video: { Args: { p_video_id: string }; Returns: undefined }
      staff_can_access_team: {
        Args: { check_team_id: string; check_user_id: string }
        Returns: boolean
      }
      submit_guardian_attachment_request: {
        Args: { p_athlete_id: string; p_org_id: string }
        Returns: Json
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
      suggest_reservation_alternatives: {
        Args: {
          p_duration_minutes?: number
          p_end_at: string
          p_facility_id?: string
          p_org_id: string
          p_prefer_same_resource?: boolean
          p_resource_id?: string
          p_start_at: string
        }
        Returns: {
          facility_name: string
          resource_id: string
          resource_name: string
          score: number
          suggested_end_at: string
          suggested_start_at: string
        }[]
      }
      sync_discovered_features: {
        Args: { p_discovered_features: Json }
        Returns: Json
      }
      sync_org_license_summary: { Args: { org_id: string }; Returns: undefined }
      sync_organization_connect_status: {
        Args: { p_org_id: string }
        Returns: Json
      }
      sync_rsvp_to_attendance: { Args: { p_event_id: string }; Returns: number }
      team_is_visible_to_user: {
        Args: { check_team_id: string; check_user_id: string }
        Returns: boolean
      }
      team_membership_is_visible_to_user: {
        Args: {
          check_athlete_id: string
          check_team_id: string
          check_user_id: string
        }
        Returns: boolean
      }
      transfer_ticket: {
        Args: {
          p_holder_email: string
          p_holder_name?: string
          p_ticket_id: string
        }
        Returns: string
      }
      trigger_notification_worker: { Args: never; Returns: undefined }
      try_parse_uuid: { Args: { value: string }; Returns: string }
      unfollow_org: { Args: { p_org_id: string }; Returns: boolean }
      update_event_rsvp_config: {
        Args: {
          p_clear_existing: boolean
          p_event_id: string
          p_rsvp_enabled: boolean
          p_rsvp_type: string
        }
        Returns: {
          error: string
          has_data: boolean
          success: boolean
        }[]
      }
      update_org_slug: {
        Args: { p_new_slug: string; p_org_id: string }
        Returns: undefined
      }
      update_org_storage_usage: {
        Args: { p_bucket_id?: string; p_bytes_delta?: number; p_org_id: string }
        Returns: undefined
      }
      update_reservation: {
        Args: {
          p_allow_conflict?: boolean
          p_end_at?: string
          p_notes?: string
          p_reservation_id: string
          p_reservation_type?: string
          p_resource_id?: string
          p_start_at?: string
          p_status?: string
          p_tentative_blocks?: boolean
          p_title?: string
        }
        Returns: string
      }
      update_staff_permissions: {
        Args: { p_org_id: string; p_permissions: Json; p_user_id: string }
        Returns: string
      }
      user_can_access_athlete: {
        Args: { p_athlete_id: string; p_user_id: string }
        Returns: boolean
      }
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
      validate_feature_dependencies: {
        Args: { p_action: string; p_feature_key: string }
        Returns: Json
      }
      validate_video_share_token: {
        Args: { p_token: string }
        Returns: {
          allow_download: boolean
          is_valid: boolean
          requires_password: boolean
          video_id: string
        }[]
      }
      verify_video_share_password: {
        Args: { p_password: string; p_token: string }
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
        | "ADD_ORG_ROLE"
        | "REMOVE_ORG_ROLE"
        | "CHANGE_ORG_ROLE"
        | "RESET_MOCK_ORGANIZATION"
      announcement_type:
        | "general"
        | "reminder"
        | "schedule_change"
        | "urgent"
        | "payment"
        | "travel"
      athlete_guardian_status: "active" | "pending" | "removed"
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
      discount_code_status: "active" | "inactive"
      discount_type: "percent" | "fixed"
      entity_privacy_level: "public" | "unlisted" | "private"
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
        | "SPORT"
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
      event_visibility:
        | "public"
        | "unlisted"
        | "members"
        | "ticket_holders"
        | "private"
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
      gallery_type:
        | "org"
        | "team"
        | "athlete"
        | "event"
        | "travel"
        | "program"
        | "season"
      gallery_visibility: "public" | "team" | "private"
      general_rsvp_status: "going" | "not_going" | "maybe"
      guardian_attachment_request_status: "pending" | "approved" | "denied"
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
      license_status: "trial" | "active" | "past_due" | "canceled" | "expired"
      membership_status: "active" | "invited" | "removed"
      notification_action:
        | "event_created"
        | "event_updated"
        | "event_rescheduled"
        | "event_canceled"
        | "event_location_updated"
        | "event_time_changed"
        | "event_rsvp_required"
        | "event_rsvp_updated"
        | "event_attendance_updated"
        | "event_weather_alert"
        | "travel_created"
        | "travel_updated"
        | "travel_canceled"
        | "travel_dates_changed"
        | "travel_location_changed"
        | "travel_lodging_added"
        | "travel_transport_added"
        | "travel_overlap_detected"
        | "fee_created"
        | "fee_assigned"
        | "fee_updated"
        | "fee_removed"
        | "fee_payment_partial"
        | "fee_payment_completed"
        | "fee_payment_failed"
        | "fee_overdue"
        | "payout_account_connected"
        | "payout_account_issue"
        | "payout_processed"
        | "athlete_created"
        | "athlete_updated"
        | "athlete_removed"
        | "athlete_added_to_team"
        | "athlete_removed_from_team"
        | "guardian_attached"
        | "guardian_detached"
        | "team_created"
        | "team_updated"
        | "team_archived"
        | "program_created"
        | "program_updated"
        | "program_removed"
        | "level_created"
        | "level_updated"
        | "level_removed"
        | "uniform_size_requested"
        | "uniform_size_submitted"
        | "uniform_order_opened"
        | "uniform_order_updated"
        | "uniform_order_closed"
        | "uniform_missing_info"
        | "announcement_created"
        | "announcement_updated"
        | "announcement_deleted"
        | "announcement_urgent"
        | "huddle_created"
        | "message_sent"
        | "message_edited"
        | "message_deleted"
        | "message_pinned"
        | "message_reported"
        | "user_mentioned"
        | "role_assigned"
        | "role_removed"
        | "access_revoked"
        | "invite_sent"
        | "invite_accepted"
        | "invite_expired"
        | "license_activated"
        | "license_expiring"
        | "license_expired"
        | "license_upgraded"
        | "feature_enabled"
        | "feature_disabled"
        | "system_generated_notice"
      notification_job_status: "queued" | "sent" | "failed"
      notification_job_type:
        | "new_event"
        | "new_message"
        | "payment_receipt"
        | "event_reminder"
        | "registration_confirmation"
        | "team_invite"
        | "password_reset"
        | "welcome_email"
        | "guardian_invite"
        | "guardian_attachment_request_submitted"
        | "guardian_attachment_request_reviewed"
        | "ticket_receipt"
        | "uniform_notification"
        | "travel_notification"
        | "photo_moderation"
        | "rsvp_notification"
      notification_presentation: "info" | "warning" | "urgent"
      offline_payment_method: "cash" | "check" | "external_processor" | "other"
      offline_payment_status: "recorded" | "voided"
      org_member_role: "parent" | "coach" | "org_admin" | "staff"
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
        | "ROLE_ADDED"
        | "ROLE_REMOVED"
        | "ORG_JOINED"
        | "ORG_LEFT"
        | "PARENT_INVITED"
        | "PARENT_ATTACHED"
        | "JOIN_LINK_CREATED"
        | "JOIN_REQUEST_SUBMITTED"
        | "JOIN_REQUEST_APPROVED"
        | "JOIN_REQUEST_DENIED"
        | "CHILD_CLAIM_TOKEN_CREATED"
        | "CHILD_CLAIMED"
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
      payment_type: "partial" | "full"
      payout_onboarding_status: "pending" | "completed" | "restricted"
      photo_status: "pending" | "approved" | "rejected"
      platform_admin_role:
        | "super_admin"
        | "support_admin"
        | "finance_admin"
        | "ops_admin"
      recurrence_frequency: "weekly" | "custom"
      rsvp_status: "going" | "late" | "not_going" | "unknown"
      scan_method: "qr" | "manual"
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
      sport_event_type:
        | "SPORT_LINKED"
        | "SPORT_UNLINKED"
        | "SPORT_CUSTOMIZED"
        | "SPORT_CUSTOMIZATION_UPDATED"
        | "SPORT_CUSTOMIZATION_REMOVED"
        | "SPORT_ICON_UPLOADED"
        | "SPORT_ICON_DELETED"
      start_date_rule: "on_publish" | "custom_date"
      sub_org_request_status: "pending" | "approved" | "rejected"
      sub_org_status: "active" | "suspended"
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
      ticket_order_status: "pending_payment" | "paid" | "refunded" | "cancelled"
      ticket_sale_status: "off" | "scheduled" | "on_sale" | "ended" | "sold_out"
      ticket_scan_result:
        | "valid"
        | "already_used"
        | "invalid"
        | "wrong_event"
        | "refunded"
        | "voided"
        | "not_found"
      ticket_status: "active" | "used" | "refunded" | "voided" | "transferred"
      ticketed_event_status: "draft" | "published" | "cancelled" | "completed"
      ticketed_event_type:
        | "game"
        | "tournament"
        | "concert"
        | "fundraiser"
        | "other"
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
      user_role: "parent" | "coach" | "admin" | "org_admin" | "platform_admin"
      video_bookmark_visibility: "private" | "shared"
      video_category:
        | "practice"
        | "game"
        | "highlight"
        | "training"
        | "event"
        | "other"
      video_link_type: "featured" | "appears" | "highlight"
      video_note_scope: "private" | "coaches" | "guardians" | "all"
      video_review_status: "pending" | "viewed" | "acknowledged" | "dismissed"
      video_status:
        | "pending_upload"
        | "uploading"
        | "processing"
        | "ready"
        | "errored"
        | "deleted"
      video_tag_type: "skill" | "drill" | "play" | "custom"
      video_visibility:
        | "private"
        | "team"
        | "organization"
        | "guardians"
        | "public"
    }
    CompositeTypes: {
      related_gallery_item: {
        relationship_type: string | null
        gallery_id: string | null
        gallery_name: string | null
        photo_count: number | null
        cover_url: string | null
      }
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
        "ADD_ORG_ROLE",
        "REMOVE_ORG_ROLE",
        "CHANGE_ORG_ROLE",
        "RESET_MOCK_ORGANIZATION",
      ],
      announcement_type: [
        "general",
        "reminder",
        "schedule_change",
        "urgent",
        "payment",
        "travel",
      ],
      athlete_guardian_status: ["active", "pending", "removed"],
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
      discount_code_status: ["active", "inactive"],
      discount_type: ["percent", "fixed"],
      entity_privacy_level: ["public", "unlisted", "private"],
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
        "SPORT",
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
      event_visibility: [
        "public",
        "unlisted",
        "members",
        "ticket_holders",
        "private",
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
      gallery_type: [
        "org",
        "team",
        "athlete",
        "event",
        "travel",
        "program",
        "season",
      ],
      gallery_visibility: ["public", "team", "private"],
      general_rsvp_status: ["going", "not_going", "maybe"],
      guardian_attachment_request_status: ["pending", "approved", "denied"],
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
      license_status: ["trial", "active", "past_due", "canceled", "expired"],
      membership_status: ["active", "invited", "removed"],
      notification_action: [
        "event_created",
        "event_updated",
        "event_rescheduled",
        "event_canceled",
        "event_location_updated",
        "event_time_changed",
        "event_rsvp_required",
        "event_rsvp_updated",
        "event_attendance_updated",
        "event_weather_alert",
        "travel_created",
        "travel_updated",
        "travel_canceled",
        "travel_dates_changed",
        "travel_location_changed",
        "travel_lodging_added",
        "travel_transport_added",
        "travel_overlap_detected",
        "fee_created",
        "fee_assigned",
        "fee_updated",
        "fee_removed",
        "fee_payment_partial",
        "fee_payment_completed",
        "fee_payment_failed",
        "fee_overdue",
        "payout_account_connected",
        "payout_account_issue",
        "payout_processed",
        "athlete_created",
        "athlete_updated",
        "athlete_removed",
        "athlete_added_to_team",
        "athlete_removed_from_team",
        "guardian_attached",
        "guardian_detached",
        "team_created",
        "team_updated",
        "team_archived",
        "program_created",
        "program_updated",
        "program_removed",
        "level_created",
        "level_updated",
        "level_removed",
        "uniform_size_requested",
        "uniform_size_submitted",
        "uniform_order_opened",
        "uniform_order_updated",
        "uniform_order_closed",
        "uniform_missing_info",
        "announcement_created",
        "announcement_updated",
        "announcement_deleted",
        "announcement_urgent",
        "huddle_created",
        "message_sent",
        "message_edited",
        "message_deleted",
        "message_pinned",
        "message_reported",
        "user_mentioned",
        "role_assigned",
        "role_removed",
        "access_revoked",
        "invite_sent",
        "invite_accepted",
        "invite_expired",
        "license_activated",
        "license_expiring",
        "license_expired",
        "license_upgraded",
        "feature_enabled",
        "feature_disabled",
        "system_generated_notice",
      ],
      notification_job_status: ["queued", "sent", "failed"],
      notification_job_type: [
        "new_event",
        "new_message",
        "payment_receipt",
        "event_reminder",
        "registration_confirmation",
        "team_invite",
        "password_reset",
        "welcome_email",
        "guardian_invite",
        "guardian_attachment_request_submitted",
        "guardian_attachment_request_reviewed",
        "ticket_receipt",
        "uniform_notification",
        "travel_notification",
        "photo_moderation",
        "rsvp_notification",
      ],
      notification_presentation: ["info", "warning", "urgent"],
      offline_payment_method: ["cash", "check", "external_processor", "other"],
      offline_payment_status: ["recorded", "voided"],
      org_member_role: ["parent", "coach", "org_admin", "staff"],
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
        "ROLE_ADDED",
        "ROLE_REMOVED",
        "ORG_JOINED",
        "ORG_LEFT",
        "PARENT_INVITED",
        "PARENT_ATTACHED",
        "JOIN_LINK_CREATED",
        "JOIN_REQUEST_SUBMITTED",
        "JOIN_REQUEST_APPROVED",
        "JOIN_REQUEST_DENIED",
        "CHILD_CLAIM_TOKEN_CREATED",
        "CHILD_CLAIMED",
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
      payment_type: ["partial", "full"],
      payout_onboarding_status: ["pending", "completed", "restricted"],
      photo_status: ["pending", "approved", "rejected"],
      platform_admin_role: [
        "super_admin",
        "support_admin",
        "finance_admin",
        "ops_admin",
      ],
      recurrence_frequency: ["weekly", "custom"],
      rsvp_status: ["going", "late", "not_going", "unknown"],
      scan_method: ["qr", "manual"],
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
      sport_event_type: [
        "SPORT_LINKED",
        "SPORT_UNLINKED",
        "SPORT_CUSTOMIZED",
        "SPORT_CUSTOMIZATION_UPDATED",
        "SPORT_CUSTOMIZATION_REMOVED",
        "SPORT_ICON_UPLOADED",
        "SPORT_ICON_DELETED",
      ],
      start_date_rule: ["on_publish", "custom_date"],
      sub_org_request_status: ["pending", "approved", "rejected"],
      sub_org_status: ["active", "suspended"],
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
      ticket_order_status: ["pending_payment", "paid", "refunded", "cancelled"],
      ticket_sale_status: ["off", "scheduled", "on_sale", "ended", "sold_out"],
      ticket_scan_result: [
        "valid",
        "already_used",
        "invalid",
        "wrong_event",
        "refunded",
        "voided",
        "not_found",
      ],
      ticket_status: ["active", "used", "refunded", "voided", "transferred"],
      ticketed_event_status: ["draft", "published", "cancelled", "completed"],
      ticketed_event_type: [
        "game",
        "tournament",
        "concert",
        "fundraiser",
        "other",
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
      user_role: ["parent", "coach", "admin", "org_admin", "platform_admin"],
      video_bookmark_visibility: ["private", "shared"],
      video_category: [
        "practice",
        "game",
        "highlight",
        "training",
        "event",
        "other",
      ],
      video_link_type: ["featured", "appears", "highlight"],
      video_note_scope: ["private", "coaches", "guardians", "all"],
      video_review_status: ["pending", "viewed", "acknowledged", "dismissed"],
      video_status: [
        "pending_upload",
        "uploading",
        "processing",
        "ready",
        "errored",
        "deleted",
      ],
      video_tag_type: ["skill", "drill", "play", "custom"],
      video_visibility: [
        "private",
        "team",
        "organization",
        "guardians",
        "public",
      ],
    },
  },
} as const
