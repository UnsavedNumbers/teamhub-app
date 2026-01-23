/**
 * Platform Admins Service
 * 
 * Centralized service for platform admins data access with proper error handling
 * and type safety (Bug Prevention #3, Technical Bug #4, #5, #9)
 */

import { supabase } from '@/lib/supabase'
import type { PlatformAdmin } from '@/types/platformAdmin.types'
import { normalizeSupabaseError } from '@/utils/errorUtils'

// Technical Bug #5: Mapper function validates and transforms query results
function mapPlatformAdminFromQuery(row: any): PlatformAdmin {
  return {
    user_id: row.user_id,
    role: row.role ?? 'support_admin', // Default if null (Technical Bug #4)
    created_at: row.created_at ?? null,
    email: row.users?.email ?? null, // Optional chaining (Technical Bug #4)
    display_name: row.users?.display_name ?? null,
  }
}

/**
 * Get platform admins with user information
 * @param page - Page number (0-indexed)
 * @param rowsPerPage - Number of rows per page
 * @returns Object with admins array and total count
 */
export async function getPlatformAdmins(
  page: number = 0,
  rowsPerPage: number = 50
): Promise<{ admins: PlatformAdmin[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('platform_admins')
    .select(`
      user_id,
      role,
      created_at,
      users (email, display_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1)
  
  if (error) {
    // Technical Bug #9: Normalize Supabase errors
    if (error.code === 'PGRST116') {
      return { admins: [], totalCount: 0 } // No results, not an error
    }
    if (error.code === '42501') {
      throw new Error('Permission denied: You do not have access to view platform admins')
    }
    throw new Error(normalizeSupabaseError(error))
  }
  
  // Technical Bug #5: Map and validate each result
  const admins = (data || []).map(mapPlatformAdminFromQuery)
  return { admins, totalCount: count || 0 }
}
