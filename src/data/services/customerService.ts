/**
 * Customer Management Service
 *
 * Provides data access for customers.
 * Follows facilitiesService patterns for consistency.
 */

import { USE_FAKE_DATA } from '../config'
import { supabase } from '../../lib/supabase'
import type { Customer, CustomerFormData, CustomerFilters } from '../../types/customers'
import { normalizeSupabaseResponse, createServiceResponse, type ServiceResponse } from './responseHelpers'
import { getCustomersForOrg, getCustomerById as getFakeCustomerById } from '../fake/fakeCustomers'

// ============================================================================
// CUSTOMERS CRUD
// ============================================================================

export async function getCustomers(
    orgId: string,
    filters?: CustomerFilters
): Promise<ServiceResponse<Customer[] | null>> {
    if (USE_FAKE_DATA) {
        let customers = getCustomersForOrg(orgId)
        
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase()
            customers = customers.filter(c => 
                c.name.toLowerCase().includes(searchLower) ||
                (c.contact_email && c.contact_email.toLowerCase().includes(searchLower)) ||
                (c.contact_phone && c.contact_phone.includes(searchLower))
            )
        }
        
        return createServiceResponse(customers, null)
    }

    try {
        let query = (supabase as any)
            .from('customers')
            .select('*')
            .eq('org_id', orgId)

        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%,contact_phone.ilike.%${filters.search}%`)
        }

        query = query.order('name', { ascending: true })

        const { data, error } = await query

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch customers: ${error.message}`))
        }

        return createServiceResponse((normalizeSupabaseResponse(data, true) as Customer[]), null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching customers'))
    }
}

export async function getCustomerById(
    customerId: string
): Promise<ServiceResponse<Customer | null>> {
    if (USE_FAKE_DATA) {
        const customer = getFakeCustomerById(customerId)
        return createServiceResponse(customer, null)
    }

    try {
        const { data, error } = await (supabase as any)
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to fetch customer: ${error.message}`))
        }

        return createServiceResponse(data as Customer, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error fetching customer'))
    }
}

export async function createCustomer(
    orgId: string,
    formData: CustomerFormData
): Promise<ServiceResponse<Customer | null>> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(null, new Error('Cannot create customers in demo mode'))
    }

    try {
        const insertData: Record<string, unknown> = {
            org_id: orgId,
            name: formData.name.trim(),
            contact_email: formData.contact_email?.trim() || null,
            contact_phone: formData.contact_phone?.trim() || null,
            billing_address: formData.billing_address || null,
            notes: formData.notes?.trim() || null,
        }

        const { data, error } = await (supabase as any)
            .from('customers')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to create customer: ${error.message}`))
        }

        return createServiceResponse(data as Customer, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error creating customer'))
    }
}

export async function updateCustomer(
    customerId: string,
    formData: Partial<CustomerFormData>
): Promise<ServiceResponse<Customer | null>> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(null, new Error('Cannot update customers in demo mode'))
    }

    try {
        const updateData: Record<string, unknown> = {}

        if (formData.name !== undefined) updateData.name = formData.name.trim()
        if (formData.contact_email !== undefined) updateData.contact_email = formData.contact_email?.trim() || null
        if (formData.contact_phone !== undefined) updateData.contact_phone = formData.contact_phone?.trim() || null
        if (formData.billing_address !== undefined) updateData.billing_address = formData.billing_address
        if (formData.notes !== undefined) updateData.notes = formData.notes?.trim() || null

        const { data, error } = await (supabase as any)
            .from('customers')
            .update(updateData)
            .eq('id', customerId)
            .select()
            .single()

        if (error) {
            return createServiceResponse(null, new Error(`Failed to update customer: ${error.message}`))
        }

        return createServiceResponse(data as Customer, null)
    } catch (err) {
        return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error updating customer'))
    }
}

export async function deleteCustomer(
    customerId: string
): Promise<ServiceResponse<boolean>> {
    if (USE_FAKE_DATA) {
        return createServiceResponse(false, new Error('Cannot delete customers in demo mode'))
    }

    try {
        const { error } = await (supabase as any)
            .from('customers')
            .delete()
            .eq('id', customerId)

        if (error) {
            return createServiceResponse(false, new Error(`Failed to delete customer: ${error.message}`))
        }

        return createServiceResponse(true, null)
    } catch (err) {
        return createServiceResponse(false, err instanceof Error ? err : new Error('Unknown error deleting customer'))
    }
}
