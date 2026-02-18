/**
 * Help Center Mapping Service
 * 
 * Manages role-to-category mappings and category-to-page mappings.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'

// ============================================================================
// Types
// ============================================================================

export interface RoleCategoryMapping {
  id: string
  role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'
  wordpressCategoryId: number
  wordpressCategorySlug: string
  wordpressCategoryName: string
  createdAt: string
  updatedAt: string
}

export interface CategoryPageMapping {
  id: string
  categorySlug: string
  wordpressPageId: number
  featuredImageUrl: string | null
  pageContentHtml: string | null
  createdAt: string
  updatedAt: string
}

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Role-Category Mappings
// ============================================================================

/**
 * Get all role-category mappings
 */
export async function getRoleCategoryMappings(): Promise<ServiceResponse<RoleCategoryMapping[]>> {
  try {
    const { data, error } = await supabase
      .from('help_role_category_mappings')
      .select('*')
      .order('role', { ascending: true })

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to get role mappings', { error })
      return { data: null, error }
    }

    const mappings: RoleCategoryMapping[] = (data || []).map(item => ({
      id: item.id,
      role: item.role,
      wordpressCategoryId: item.wordpress_category_id,
      wordpressCategorySlug: item.wordpress_category_slug,
      wordpressCategoryName: item.wordpress_category_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return { data: mappings, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception getting role mappings', { error })
    return { data: null, error }
  }
}

/**
 * Get mappings for a specific role
 */
export async function getMappingsForRole(
  role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'
): Promise<ServiceResponse<RoleCategoryMapping[]>> {
  try {
    const { data, error } = await supabase
      .from('help_role_category_mappings')
      .select('*')
      .eq('role', role)

    if (error) {
      return { data: null, error }
    }

    const mappings: RoleCategoryMapping[] = (data || []).map(item => ({
      id: item.id,
      role: item.role,
      wordpressCategoryId: item.wordpress_category_id,
      wordpressCategorySlug: item.wordpress_category_slug,
      wordpressCategoryName: item.wordpress_category_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return { data: mappings, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: null, error }
  }
}

/**
 * Create role-category mapping
 */
export async function createRoleCategoryMapping(
  mapping: {
    role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'
    wordpressCategoryId: number
    wordpressCategorySlug: string
    wordpressCategoryName: string
  }
): Promise<ServiceResponse<RoleCategoryMapping>> {
  try {
    const { data, error } = await supabase
      .from('help_role_category_mappings')
      .insert({
        role: mapping.role,
        wordpress_category_id: mapping.wordpressCategoryId,
        wordpress_category_slug: mapping.wordpressCategorySlug,
        wordpress_category_name: mapping.wordpressCategoryName,
      })
      .select()
      .single()

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to create role mapping', { error })
      return { data: null, error }
    }

    const result: RoleCategoryMapping = {
      id: data.id,
      role: data.role,
      wordpressCategoryId: data.wordpress_category_id,
      wordpressCategorySlug: data.wordpress_category_slug,
      wordpressCategoryName: data.wordpress_category_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return { data: result, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception creating role mapping', { error })
    return { data: null, error }
  }
}

/**
 * Delete role-category mapping
 */
export async function deleteRoleCategoryMapping(id: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('help_role_category_mappings')
      .delete()
      .eq('id', id)

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to delete role mapping', { error })
      return { data: null, error }
    }

    return { data: null, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception deleting role mapping', { error })
    return { data: null, error }
  }
}

/**
 * Replace all mappings for a role
 */
export async function replaceRoleMappings(
  role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin',
  mappings: {
    wordpressCategoryId: number
    wordpressCategorySlug: string
    wordpressCategoryName: string
  }[]
): Promise<ServiceResponse<RoleCategoryMapping[]>> {
  try {
    // Delete existing mappings for this role
    const { error: deleteError } = await supabase
      .from('help_role_category_mappings')
      .delete()
      .eq('role', role)

    if (deleteError) {
      return { data: null, error: deleteError }
    }

    // Create new mappings
    if (mappings.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('help_role_category_mappings')
      .insert(
        mappings.map(m => ({
          role,
          wordpress_category_id: m.wordpressCategoryId,
          wordpress_category_slug: m.wordpressCategorySlug,
          wordpress_category_name: m.wordpressCategoryName,
        }))
      )
      .select()

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to create role mappings', { error })
      return { data: null, error }
    }

    const results: RoleCategoryMapping[] = (data || []).map(item => ({
      id: item.id,
      role: item.role,
      wordpressCategoryId: item.wordpress_category_id,
      wordpressCategorySlug: item.wordpress_category_slug,
      wordpressCategoryName: item.wordpress_category_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return { data: results, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception replacing role mappings', { error })
    return { data: null, error }
  }
}

// ============================================================================
// Category-Page Mappings
// ============================================================================

/**
 * Get all category-page mappings
 */
export async function getCategoryPageMappings(): Promise<ServiceResponse<CategoryPageMapping[]>> {
  try {
    const { data, error } = await supabase
      .from('help_category_page_mappings')
      .select('*')
      .order('category_slug', { ascending: true })

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to get category page mappings', { error })
      return { data: null, error }
    }

    const mappings: CategoryPageMapping[] = (data || []).map(item => ({
      id: item.id,
      categorySlug: item.category_slug,
      wordpressPageId: item.wordpress_page_id,
      featuredImageUrl: item.featured_image_url,
      pageContentHtml: item.page_content_html,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return { data: mappings, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception getting category page mappings', { error })
    return { data: null, error }
  }
}

/**
 * Get mapping for a specific category
 */
export async function getCategoryPageMapping(
  categorySlug: string
): Promise<ServiceResponse<CategoryPageMapping>> {
  try {
    const { data, error } = await supabase
      .from('help_category_page_mappings')
      .select('*')
      .eq('category_slug', categorySlug)
      .maybeSingle()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: null }
    }

    const mapping: CategoryPageMapping = {
      id: data.id,
      categorySlug: data.category_slug,
      wordpressPageId: data.wordpress_page_id,
      featuredImageUrl: data.featured_image_url,
      pageContentHtml: data.page_content_html,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return { data: mapping, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: null, error }
  }
}

/**
 * Create or update category-page mapping
 */
export async function upsertCategoryPageMapping(
  mapping: {
    categorySlug: string
    wordpressPageId: number
    featuredImageUrl?: string | null
    pageContentHtml?: string | null
  }
): Promise<ServiceResponse<CategoryPageMapping>> {
  try {
    const { data, error } = await supabase
      .from('help_category_page_mappings')
      .upsert(
        {
          category_slug: mapping.categorySlug,
          wordpress_page_id: mapping.wordpressPageId,
          featured_image_url: mapping.featuredImageUrl || null,
          page_content_html: mapping.pageContentHtml || null,
        },
        {
          onConflict: 'category_slug',
        }
      )
      .select()
      .single()

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to upsert category page mapping', { error })
      return { data: null, error }
    }

    const result: CategoryPageMapping = {
      id: data.id,
      categorySlug: data.category_slug,
      wordpressPageId: data.wordpress_page_id,
      featuredImageUrl: data.featured_image_url,
      pageContentHtml: data.page_content_html,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return { data: result, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception upserting category page mapping', { error })
    return { data: null, error }
  }
}

/**
 * Delete category-page mapping
 */
export async function deleteCategoryPageMapping(categorySlug: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('help_category_page_mappings')
      .delete()
      .eq('category_slug', categorySlug)

    if (error) {
      debug.error('HelpCenterMappingService', 'Failed to delete category page mapping', { error })
      return { data: null, error }
    }

    return { data: null, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterMappingService', 'Exception deleting category page mapping', { error })
    return { data: null, error }
  }
}
