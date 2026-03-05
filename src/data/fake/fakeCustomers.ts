/**
 * Fake Customers Data Module
 *
 * Provides fake data for customers.
 * Used in demo mode when USE_FAKE_DATA is true.
 */

import { DEMO_ORG_A_ID } from '../config'
import type { Customer } from '../../types/customers'

// ============================================================================
// Customer IDs
// ============================================================================

export const CUSTOMER_COMMUNITY_CENTER_ID = 'customer-community-center-001'
export const CUSTOMER_YOUTH_LEAGUE_ID = 'customer-youth-league-001'
export const CUSTOMER_SCHOOL_DISTRICT_ID = 'customer-school-district-001'

// ============================================================================
// Fake Customers Data
// ============================================================================

export const fakeCustomers: Customer[] = [
    {
        id: CUSTOMER_COMMUNITY_CENTER_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Springfield Community Center',
        contact_email: 'info@springfieldcc.org',
        contact_phone: '(413) 555-0200',
        billing_address: {
            street: '789 Community Way',
            city: 'Springfield',
            state: 'MA',
            postal_code: '01104',
            country: 'US',
        },
        notes: 'Regular renter for community events',
        created_by: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
    },
    {
        id: CUSTOMER_YOUTH_LEAGUE_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Springfield Youth Soccer League',
        contact_email: 'admin@syouthsoccer.org',
        contact_phone: '(413) 555-0300',
        billing_address: {
            street: '456 Youth Sports Drive',
            city: 'Springfield',
            state: 'MA',
            postal_code: '01105',
            country: 'US',
        },
        notes: 'Seasonal rental for weekend games',
        created_by: null,
        created_at: '2024-01-22T00:00:00Z',
        updated_at: '2024-01-22T00:00:00Z',
    },
    {
        id: CUSTOMER_SCHOOL_DISTRICT_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Springfield School District',
        contact_email: 'facilities@springfield.k12.ma.us',
        contact_phone: '(413) 555-0400',
        billing_address: {
            street: '123 Education Avenue',
            city: 'Springfield',
            state: 'MA',
            postal_code: '01106',
            country: 'US',
        },
        notes: 'School district facility rentals',
        created_by: null,
        created_at: '2024-01-25T00:00:00Z',
        updated_at: '2024-01-25T00:00:00Z',
    },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getCustomersForOrg(orgId: string): Customer[] {
    return fakeCustomers.filter((c) => c.org_id === orgId)
}

export function getCustomerById(customerId: string): Customer | null {
    return fakeCustomers.find((c) => c.id === customerId) || null
}
