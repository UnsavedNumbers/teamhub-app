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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
      children: {
        Row: {
          birthdate: string | null
          created_at: string | null
          family_id: string
          first_name: string
          id: string
          last_name: string
          updated_at: string | null
        }
        Insert: {
          birthdate?: string | null
          created_at?: string | null
          family_id: string
          first_name: string
          id?: string
          last_name: string
          updated_at?: string | null
        }
        Update: {
          birthdate?: string | null
          created_at?: string | null
          family_id?: string
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
            referencedRelation: "fees"
            referencedColumns: ["id"]
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
            referencedRelation: "fee_assignments"
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
      events: {
        Row: {
          arrival_time: string | null
          created_at: string | null
          end_time: string
          id: string
          location: string | null
          notes: string | null
          season_id: string
          start_time: string
          team_id: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string | null
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          season_id: string
          start_time: string
          team_id: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
        }
        Update: {
          arrival_time?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          season_id?: string
          start_time?: string
          team_id?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "children"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "teams"
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
            referencedRelation: "children"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
          token?: string
        }
        Relationships: [
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
            referencedRelation: "organizations"
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
          refund_policy: string | null
          slug: string | null
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
          refund_policy?: string | null
          slug?: string | null
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
          refund_policy?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "fee_assignments"
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
            referencedRelation: "organizations"
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
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
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
            referencedRelation: "organizations"
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
          team_id: string
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
          team_id: string
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
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "children"
            referencedColumns: ["id"]
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
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          name: string
          org_id: string
          program: string | null
          sport: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code: string
          name: string
          org_id: string
          program?: string | null
          sport?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name?: string
          org_id?: string
          program?: string | null
          sport?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          cancelled_at: string | null
          created_at: string | null
          destination_city: string | null
          destination_state: string | null
          end_date: string
          hotel_address: string | null
          hotel_confirmation: string | null
          hotel_name: string | null
          hotel_phone: string | null
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
          venue_name: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          destination_city?: string | null
          destination_state?: string | null
          end_date: string
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
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
          venue_name?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          destination_city?: string | null
          destination_state?: string | null
          end_date?: string
          hotel_address?: string | null
          hotel_confirmation?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
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
          venue_name?: string | null
        }
        Relationships: [
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
            referencedRelation: "teams"
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
      tryout_scores: {
        Row: {
          category: string
          coach_id: string
          created_at: string | null
          id: string
          notes: string | null
          registration_id: string
          score: number
        }
        Insert: {
          category: string
          coach_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          registration_id: string
          score: number
        }
        Update: {
          category?: string
          coach_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          registration_id?: string
          score?: number
        }
        Relationships: [
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
            referencedRelation: "organizations"
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
            referencedRelation: "children"
            referencedColumns: ["id"]
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
            referencedRelation: "teams"
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
            referencedRelation: "organizations"
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
            referencedRelation: "fee_assignments"
            referencedColumns: ["id"]
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
      admin_organizations: {
        Row: {
          id: string
          name: string
          org_type: string | null
          status: string
          license_status: string | null
          license_plan: string | null
          license_trial_ends_at: string | null
          license_current_period_end: string | null
          payout_account_id: string | null
          payouts_enabled: boolean | null
          created_at: string | null
          updated_at: string | null
          team_count: number
          sport_count: number
          user_count: number
          stripe_connected: boolean
        }
      }
      admin_users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          display_name: string | null
          created_at: string | null
          updated_at: string | null
          organizations: Json
          roles: string[]
          is_platform_admin: boolean
          last_sign_in_at: string | null
          email_confirmed: boolean
        }
      }
      admin_structure: {
        Row: {
          organization_id: string
          organization_name: string
          team_id: string | null
          team_name: string | null
          season_id: string | null
          season_name: string | null
          season_active: boolean | null
          player_count: number
        }
      }
      admin_payments: {
        Row: {
          id: string
          amount_cents: number
          currency: string | null
          stripe_payment_intent_id: string | null
          status: string
          created_at: string | null
          organization_id: string
          organization_name: string
          fee_assignment_id: string | null
          fee_id: string | null
          fee_title: string | null
          child_id: string | null
          child_name: string | null
          parent_email: string | null
          parent_name: string | null
        }
      }
      admin_fees_status: {
        Row: {
          fee_id: string
          fee_name: string
          amount_cents: number
          currency: string | null
          due_date: string | null
          fee_status: string
          organization_id: string
          organization_name: string
          assigned_count: number
          paid_count: number
          unpaid_count: number
          payment_rate_percent: number
        }
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
          metadata: Json
          created_at: string
        }
      }
      admin_platform_health: {
        Row: {
          active_organizations: number
          trial_organizations: number
          suspended_organizations: number
          total_users: number
          platform_admin_count: number
          successful_payments: number
          failed_payments: number
          total_payment_volume_cents: number
          total_teams: number
          total_children: number
        }
      }
      admin_feature_flags: {
        Row: {
          id: string
          organization_id: string
          organization_name: string
          feature_key: string
          enabled: boolean
          created_at: string | null
          updated_at: string | null
        }
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
      complete_payment_processing: {
        Args: { p_checkout_session_id: string; p_payment_id: string }
        Returns: undefined
      }
      create_organization_invite: {
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
      get_user_organizations: {
        Args: { check_user_id: string }
        Returns: {
          org_name: string
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
        }[]
      }
      is_org_license_active: { Args: { org_id: string }; Returns: boolean }
      is_org_license_readonly_allowed: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { check_user_id: string }; Returns: boolean }
      process_payment_allocation: {
        Args: { p_amount_cents: number; p_fee_assignment_id: string }
        Returns: undefined
      }
      revoke_organization_invite: {
        Args: { p_invite_id: string }
        Returns: boolean
      }
      sync_org_license_summary: { Args: { org_id: string }; Returns: undefined }
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
      user_is_org_admin: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      register_child_for_tryout: {
        Args: { p_tryout_id: string; p_child_id: string }
        Returns: string
      }
      convert_accepted_tryout_registration_to_team_member: {
        Args: { p_registration_id: string; p_team_id: string; p_season_id: string }
        Returns: string
      }
    }
    Enums: {
      attendance_status: "going" | "late" | "not_going"
      billing_mode: "platform_facilitated" | "offline_only"
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
      discount_code_status: "active" | "inactive"
      discount_type: "percent" | "fixed"
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
      license_plan: "starter" | "standard" | "pro"
      license_status: "trial" | "active" | "past_due" | "canceled" | "expired"
      membership_status: "active" | "invited" | "removed"
      offline_payment_method: "cash" | "check" | "external_processor" | "other"
      offline_payment_status: "recorded" | "voided"
      org_member_role: "parent" | "coach" | "org_admin"
      org_type: "school" | "club" | "league" | "academy" | "aau"
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
      payment_status: "due" | "paid" | "refunded"
      payment_status_new:
      | "pending"
      | "succeeded"
      | "failed"
      | "refunded"
      | "partially_refunded"
      payout_onboarding_status: "pending" | "completed" | "restricted"
      scholarship_funding_source:
      | "org_funded"
      | "sponsor_funded"
      | "district_funded"
      scholarship_program_status: "active" | "inactive"
      start_date_rule: "on_publish" | "custom_date"
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
      tryout_document_status: "missing" | "uploaded" | "approved" | "rejected"
      tryout_type: "open" | "invitation_only" | "make_up" | "evaluation_clinic"
      uniform_order_status: "pending" | "ordered" | "delivered"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ["going", "late", "not_going"],
      billing_mode: ["platform_facilitated", "offline_only"],
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
      discount_code_status: ["active", "inactive"],
      discount_type: ["percent", "fixed"],
      event_type: ["practice", "game", "tournament", "meeting"],
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
      license_plan: ["starter", "standard", "pro"],
      license_status: ["trial", "active", "past_due", "canceled", "expired"],
      membership_status: ["active", "invited", "removed"],
      offline_payment_method: ["cash", "check", "external_processor", "other"],
      offline_payment_status: ["recorded", "voided"],
      org_member_role: ["parent", "coach", "org_admin"],
      org_type: ["school", "club", "league", "academy", "aau"],
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
      payment_status: ["due", "paid", "refunded"],
      payment_status_new: [
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      payout_onboarding_status: ["pending", "completed", "restricted"],
      scholarship_funding_source: [
        "org_funded",
        "sponsor_funded",
        "district_funded",
      ],
      scholarship_program_status: ["active", "inactive"],
      start_date_rule: ["on_publish", "custom_date"],
      tryout_registration_status: [
        "registered",
        "checked_in",
        "evaluated",
        "offered",
        "accepted",
        "declined",
        "rejected",
      ],
      uniform_order_status: ["pending", "ordered", "delivered"],
      user_role: ["parent", "coach", "admin"],
    },
  },
} as const
