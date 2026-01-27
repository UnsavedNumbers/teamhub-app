/**
 * Domain Model: User
 * 
 * Clean domain model for users, separate from Supabase row types.
 * All nullability is handled at the boundary (service layer).
 */

export interface User {
  id: string
  email: string
  phone: string
  firstName: string
  lastName: string
  displayName: string | null
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
  emailConfirmed: boolean
  isPlatformAdmin: boolean
  
  // Organizations
  organizations: UserOrganization[]
  roles: string[]
}

export interface UserOrganization {
  organizationId: string
  orgName: string
  role: string
}
