/**
 * Org Resolution Utility
 * 
 * Resolves organization from slug with caching and redirect support.
 * Implements the org-scoped public URL architecture.
 */

import { supabase } from '../lib/supabase'
import { CACHE_TTL } from '../constants/api'

export interface OrgContext {
  id: string
  slug: string
  name: string
  status: 'active' | 'suspended' | 'deactivated' | 'deleted'
}

export interface OrgResolutionResult {
  org: OrgContext | null
  redirectToSlug: string | null
  error: 'not_found' | 'suspended' | 'deactivated' | 'deleted' | null
}

// Reserved path segments that cannot be org slugs
const RESERVED_PATHS = new Set([
  'login',
  'signup',
  'admin',
  'api',
  'webhooks',
  'health',
  'about',
  'terms',
  'privacy',
  'portal',
  'o', // The org prefix itself
])

// In-memory cache for slug resolution
// Key: slug (lowercase), Value: { org, expiresAt }
interface CacheEntry {
  org: OrgContext
  expiresAt: number
}

const slugCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = CACHE_TTL.ORG_RESOLUTION_MS

/**
 * Validates that a slug is not a reserved path
 */
export function isReservedPath(slug: string): boolean {
  return RESERVED_PATHS.has(slug.toLowerCase())
}

/**
 * Validates slug format: lowercase alphanumeric with hyphens
 * - 3-48 characters
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 */
export function validateSlugFormat(slug: string): { valid: boolean; error?: string } {
  const normalized = slug.toLowerCase().trim()

  if (normalized.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' }
  }

  if (normalized.length > 48) {
    return { valid: false, error: 'Slug must be at most 48 characters' }
  }

  // Regex: lowercase letters, numbers, single hyphens as separators
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
  if (!slugRegex.test(normalized)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen, and cannot contain consecutive hyphens.',
    }
  }

  if (isReservedPath(normalized)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' }
  }

  return { valid: true }
}

/**
 * Normalizes a slug to lowercase (for URL handling)
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim()
}

/**
 * Resolves an organization from a slug
 * Checks cache first, then database (with redirect support)
 */
export async function resolveOrgFromSlug(slug: string): Promise<OrgResolutionResult> {
  const normalizedSlug = normalizeSlug(slug)

  // Check cache
  const cached = slugCache.get(normalizedSlug)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      org: cached.org,
      redirectToSlug: cached.org.slug === normalizedSlug ? null : cached.org.slug,
      error: null,
    }
  }

  try {
    // Call database function to resolve org (handles redirects)
    const { data, error: rpcError } = await (supabase as any).rpc('resolve_org_from_slug', {
      p_slug: normalizedSlug,
    })

    let rows = (data as any[]) || []

    // Fallback for environments without the RPC (e.g., migrations not applied yet)
    if (rpcError) {
      console.error('Error resolving org from slug (RPC):', rpcError)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, slug, status, name')
        .eq('slug', normalizedSlug)
        .maybeSingle()

      if (orgError || !orgData) {
        if (orgError) {
          console.error('Error resolving org from slug (fallback):', orgError)
        }
        return { org: null, redirectToSlug: null, error: 'not_found' }
      }

      rows = [
        {
          org_id: orgData.id,
          current_slug: orgData.slug,
          status: orgData.status,
          name: orgData.name,
        },
      ]
    }

    if (rows.length === 0) {
      return { org: null, redirectToSlug: null, error: 'not_found' }
    }

    const result = rows[0] as any
    const org: OrgContext = {
      id: result.org_id,
      slug: result.current_slug,
      name: result.name,
      status: result.status,
    }

    // Determine if redirect is needed
    const redirectToSlug = org.slug !== normalizedSlug ? org.slug : null

    // Determine error state based on status
    let resolvedError: OrgResolutionResult['error'] = null
    if (org.status === 'suspended') {
      resolvedError = 'suspended'
    } else if (org.status === 'deactivated') {
      resolvedError = 'deactivated'
    } else if (org.status === 'deleted') {
      resolvedError = 'deleted'
    }

    // Cache the result
    slugCache.set(normalizedSlug, {
      org,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    // Also cache by current slug if different
    if (redirectToSlug) {
      slugCache.set(org.slug, {
        org,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
    }

    return {
      org: resolvedError ? null : org, // Return null org if error state
      redirectToSlug,
      error: resolvedError,
    }
  } catch (err) {
    console.error('Unexpected error resolving org:', err)
    return { org: null, redirectToSlug: null, error: 'not_found' }
  }
}

/**
 * Invalidates cache for a specific slug (call when org slug changes)
 */
export function invalidateSlugCache(slug: string): void {
  const normalizedSlug = normalizeSlug(slug)
  slugCache.delete(normalizedSlug)
  
  // Also remove any entries that reference this org
  for (const [key, entry] of slugCache.entries()) {
    if (entry.org.slug === normalizedSlug || entry.org.id === slug) {
      slugCache.delete(key)
    }
  }
}

/**
 * Clears all cached slug resolutions (use sparingly)
 */
export function clearSlugCache(): void {
  slugCache.clear()
}
