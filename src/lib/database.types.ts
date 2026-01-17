export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            families: {
                Row: {
                    id: string
                    org_id: string
                    name: string
                    created_by_user_id: string
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    org_id: string
                    name: string
                    created_by_user_id: string
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    org_id?: string
                    name?: string
                    created_by_user_id?: string
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
            }
            children: {
                Row: {
                    id: string
                    family_id: string
                    first_name: string
                    last_name: string
                    date_of_birth: string
                    gender: 'male' | 'female' | 'other' | null
                    jersey_number: string | null
                    medical_notes: string | null
                    allergies: string | null
                    emergency_contact_name: string | null
                    emergency_contact_phone: string | null
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    family_id: string
                    first_name: string
                    last_name: string
                    date_of_birth: string
                    gender?: 'male' | 'female' | 'other' | null
                    jersey_number?: string | null
                    medical_notes?: string | null
                    allergies?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    family_id?: string
                    first_name?: string
                    last_name?: string
                    date_of_birth?: string
                    gender?: 'male' | 'female' | 'other' | null
                    jersey_number?: string | null
                    medical_notes?: string | null
                    allergies?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
            }
            family_members: {
                Row: {
                    id: string
                    family_id: string
                    user_id: string
                    role: 'owner' | 'guardian' | 'view_only'
                    permissions: string[]
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    family_id: string
                    user_id: string
                    role: 'owner' | 'guardian' | 'view_only'
                    permissions?: string[]
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    family_id?: string
                    user_id?: string
                    role?: 'owner' | 'guardian' | 'view_only'
                    permissions?: string[]
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
            }
            users: {
                Row: {
                    id: string
                    email: string
                    display_name: string | null
                    phone: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email: string
                    display_name?: string | null
                    phone?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    display_name?: string | null
                    phone?: string | null
                    created_at?: string
                }
            }
            event_attendance: {
                Row: {
                    id: string
                    event_id: string
                    child_id: string
                    status: 'present' | 'absent' | 'late' | 'excused'
                    notes: string | null
                    recorded_by_user_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    event_id: string
                    child_id: string
                    status?: 'present' | 'absent' | 'late' | 'excused'
                    notes?: string | null
                    recorded_by_user_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    event_id?: string
                    child_id?: string
                    status?: 'present' | 'absent' | 'late' | 'excused'
                    notes?: string | null
                    recorded_by_user_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
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
                Insert: {
                    org_id: string
                    reminder_enabled?: boolean
                    lock_after_hours?: number
                    required_for_practice?: boolean
                    required_for_game?: boolean
                    required_for_meeting?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    org_id?: string
                    reminder_enabled?: boolean
                    lock_after_hours?: number
                    required_for_practice?: boolean
                    required_for_game?: boolean
                    required_for_meeting?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
    Views: {
        [_ in never]: never
    }
    Functions: {
        [_ in never]: never
    }
    Enums: {
        [_ in never]: never
    }
}
}
