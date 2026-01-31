/**
 * Users API
 * 
 * API functions for user management operations.
 * These functions call Supabase Edge Functions or RPCs.
 */

import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../utils/errorUtils'

export interface CreateUserParams {
  org_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'parent' | 'coach' | 'admin'
}

export interface CreateUserResponse {
  success: boolean
  user_id?: string
  error?: string
  message?: string
}

/**
 * Create a new user and add them to an organization
 * 
 * @param params - User creation parameters
 * @returns Response with success status and user_id or error
 */
export async function createOrganizationUser(
  params: CreateUserParams
): Promise<CreateUserResponse> {
  try {
    // Validate required fields
    if (!params.org_id || !params.email || !params.first_name || !params.last_name || !params.phone || !params.role) {
      throw new Error('Missing required fields: org_id, email, first_name, last_name, phone, role')
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(params.email)) {
      throw new Error('Invalid email format')
    }

    // Validate role
    if (!['parent', 'coach', 'admin'].includes(params.role)) {
      throw new Error('Invalid role. Must be parent, coach, or admin')
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        org_id: params.org_id,
        email: params.email.trim().toLowerCase(),
        first_name: params.first_name.trim(),
        last_name: params.last_name.trim(),
        phone: params.phone.trim(),
        role: params.role,
      },
    })

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      }
    }

    return data as CreateUserResponse
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err),
    }
  }
}

export interface UpdateUserParams {
  user_id: string
  org_id: string
  first_name?: string
  last_name?: string
  phone?: string
  role?: 'parent' | 'coach' | 'admin'
}

export interface UpdateUserResponse {
  success: boolean
  error?: string
  message?: string
}

/**
 * Update a user's profile and/or role in an organization
 * 
 * @param params - User update parameters
 * @returns Response with success status or error
 */
export async function updateOrganizationUser(
  params: UpdateUserParams
): Promise<UpdateUserResponse> {
  try {
    // Validate required fields
    if (!params.user_id || !params.org_id) {
      throw new Error('Missing required fields: user_id, org_id')
    }

    // Validate role if provided
    if (params.role && !['parent', 'coach', 'admin'].includes(params.role)) {
      throw new Error('Invalid role. Must be parent, coach, or admin')
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (params.first_name !== undefined) {
      updates.first_name = params.first_name.trim()
    }
    if (params.last_name !== undefined) {
      updates.last_name = params.last_name.trim()
    }
    if (params.phone !== undefined) {
      updates.phone = params.phone.trim()
    }

    // Update user profile if name/phone changed
    if (Object.keys(updates).length > 0) {
      const displayName = params.first_name && params.last_name
        ? `${params.first_name.trim()} ${params.last_name.trim()}`
        : undefined

      if (displayName) {
        updates.display_name = displayName
      }

      const { error: profileError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', params.user_id)

      if (profileError) {
        return {
          success: false,
          error: `Failed to update user profile: ${profileError.message}`,
        }
      }
    }

    // Update role if provided
    if (params.role) {
      // Map frontend role to database role
      const dbRole = params.role === 'admin' ? 'org_admin' : params.role

      const { error: roleError } = await supabase
        .from('organization_members')
        .update({ role: dbRole })
        .eq('user_id', params.user_id)
        .eq('org_id', params.org_id)

      if (roleError) {
        return {
          success: false,
          error: `Failed to update user role: ${roleError.message}`,
        }
      }
    }

    return {
      success: true,
      message: 'User updated successfully',
    }
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err),
    }
  }
}
