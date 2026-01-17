export interface Family {
    id: string
    name: string
    created_by_user_id: string
    org_id: string
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export type Gender = 'male' | 'female' | 'other'

export interface Child {
    id: string
    family_id: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: Gender | null
    jersey_number: string | null
    medical_notes: string | null
    allergies: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export type FamilyRole = 'owner' | 'guardian' | 'view_only'

export interface FamilyMember {
    id: string
    family_id: string
    user_id: string
    role: FamilyRole
    permissions: string[]
    created_at: string
    updated_at: string
    deleted_at: string | null
}

// For UI display, often joined with other tables
export interface FamilyWithDetails extends Family {
    children: Child[]
    members: FamilyMember[]
    // Count of enrolled programs or other stats could go here
}

export interface ChildWithDetails extends Child {
    family?: Family
    // active_registrations usually joined from another table
}

export interface CreateFamilyDTO {
    name: string
    org_id: string
    // Initial members or children might be handled separately or transactionally
}

export interface UpdateFamilyDTO {
    name?: string
}

export interface CreateChildDTO {
    family_id: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender?: Gender | null
    jersey_number?: string | null
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
}

export interface UpdateChildDTO {
    first_name?: string
    last_name?: string
    date_of_birth?: string
    gender?: Gender | null
    jersey_number?: string | null
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
}
