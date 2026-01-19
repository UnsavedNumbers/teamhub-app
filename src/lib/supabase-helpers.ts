/**
 * Supabase Type Helpers
 * 
 * Provides type-safe helpers for Supabase queries when types aren't properly inferred.
 * These helpers use `unknown` first, then narrow types safely (better than `as any`).
 */

import { supabase } from './supabase'

// Type for organization member with user_id and role
export interface OrgMember {
  user_id: string
  role: string
  organization_id?: string
}

// Type for team with org_id
export interface TeamWithOrg {
  id: string
  org_id: string
  name?: string
}

// Type for user with email
export interface UserWithEmail {
  id: string
  email: string | null
}

/**
 * Safely get team data with org_id
 */
export async function getTeamWithOrg(teamId: string): Promise<TeamWithOrg | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, org_id, name')
    .eq('id', teamId)
    .single()

  if (error || !data) return null
  
  // Type guard to ensure we have the required fields
  if (typeof data === 'object' && data !== null && 'org_id' in data) {
    return data as TeamWithOrg
  }
  
  return null
}

/**
 * Safely get organization members for an org
 */
export async function getOrgMembers(orgId: string, userIds: string[]): Promise<OrgMember[]> {
  if (userIds.length === 0) return []
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id, role, organization_id')
    .eq('organization_id', orgId)
    .in('user_id', userIds)

  if (error || !data) return []
  
  // Type guard to ensure we have valid members
  return (data as unknown[]).filter((item): item is OrgMember => 
    typeof item === 'object' &&
    item !== null &&
    'user_id' in item &&
    'role' in item
  ) as OrgMember[]
}

/**
 * Safely get a single organization member
 */
export async function getOrgMember(orgId: string, userId: string): Promise<OrgMember | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id, role, organization_id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  
  // Type guard
  if (typeof data === 'object' && data !== null && 'user_id' in data && 'role' in data) {
    return data as OrgMember
  }
  
  return null
}

/**
 * Safely get user email
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  
  // Type guard
  if (typeof data === 'object' && data !== null && 'email' in data) {
    const email = (data as { email: unknown }).email
    return typeof email === 'string' ? email : null
  }
  
  return null
}

/**
 * Type guard for Supabase query results with relations
 */
export function hasProperty<T extends Record<string, unknown>>(
  obj: unknown,
  prop: keyof T
): obj is T {
  return typeof obj === 'object' && obj !== null && prop in obj
}
