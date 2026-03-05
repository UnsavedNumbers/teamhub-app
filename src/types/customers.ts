/**
 * Customers Domain Types
 * 
 * Types for customer entity management
 */

// ============================================================================
// DOMAIN MODELS
// ============================================================================

export interface Customer {
    id: string
    org_id: string
    name: string
    contact_email: string | null
    contact_phone: string | null
    billing_address: {
        street?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
    } | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CustomerFormData {
    name: string
    contact_email: string
    contact_phone: string
    billing_address: {
        street?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
    } | null
    notes: string
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface CustomerFilters {
    search?: string
}
