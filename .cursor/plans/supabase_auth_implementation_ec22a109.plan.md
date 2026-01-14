---
name: Supabase Auth Implementation
overview: Implement a secure, multi-organization authentication system with role-based access control using Supabase Auth, supporting email/password and Google OAuth, with organization invites and RLS-enforced permissions.
todos:
  - id: "1"
    content: Create database migration for auth restructure (organization_members, platform_admins, organization_invites tables) with performance indexes
    status: complete
  - id: "2"
    content: Create data migration script with validation to move existing users.org_id/role to organization_members (dual-write approach)
    status: complete
  - id: "3"
    content: Create STABLE helper functions for auth checks (is_platform_admin, user_has_org_role, etc.) for RLS performance
    status: complete
  - id: "4"
    content: Update all RLS policies to use helper functions (never direct queries) for consistency
    status: complete
  - id: "5"
    content: Create organization invite system with race condition protection (SELECT FOR UPDATE NOWAIT) and secure token generation
    status: complete
  - id: "6"
    content: Refactor useAuth hook to support multiple orgs/roles (frontend checks are UX-only, security via RLS)
    status: complete
  - id: "7"
    content: Create OrganizationContext and useOrganization hook for managing current org selection
    status: complete
  - id: "8"
    content: Add Google OAuth support with proper error handling and onAuthStateChange listener, styled to match design system
    status: complete
  - id: "9"
    content: Update Signup flow to not require family/org, update handle_new_user() trigger, redesign to match login design
    status: complete
  - id: "10"
    content: Create AcceptInvite page with race condition handling, pending invite support, and matching design
    status: complete
  - id: "15"
    content: Update tailwind.config.js and index.css to match design tokens (fonts, colors, Material Symbols)
    status: complete
  - id: "16"
    content: Implement password reset flow (ForgotPassword and ResetPassword pages) matching design system
    status: complete
  - id: "11"
    content: Update ProtectedRoute to check session only (RLS handles authorization)
    status: complete
  - id: "12"
    content: Create backward compatibility view (users_legacy) for gradual migration
    status: complete
  - id: "13"
    content: Regenerate database types after migrations
    status: complete
  - id: "14"
    content: Create AUTH_README.md with common pitfalls and mitigation strategies
    status: complete
---

# Supabase Auth Implementation Plan

## Overview

This plan implements a secure authentication system that supports:

- Multiple organizations per user
- Multiple roles per user (scoped per organization)
- Email/password and Google OAuth authentication
- Organization invite system
- Server-side RLS enforcement
- Platform admin role (global)

## Current State Analysis

**Existing Structure:**

- `users` table has single `org_id` and `role` (parent/coach/admin)
- RLS policies check `users.org_id` and `users.role` directly
- Frontend `useAuth` hook assumes single org/role
- No organization invite system exists
- No Google OAuth configured

**Required Changes:**

1. Create new tables: `organization_members` and `platform_admins`
2. Migrate existing data from `users.org_id`/`users.role` to new structure
3. Update all RLS policies to use new structure
4. Create organization invite system
5. Add Google OAuth support
6. Refactor frontend auth to handle multiple orgs/roles

## Implementation Steps

### Phase 1: Database Schema Migration

**File: `supabase/migrations/020_auth_restructure.sql`**

1. **Create `organization_members` table:**

   - `id` (uuid, pk)
   - `organization_id` (uuid, fk → organizations)
   - `user_id` (uuid, fk → users)
   - `role` (enum: parent, coach, org_admin)
   - `created_at` (timestamptz)
   - Unique constraint on (organization_id, user_id)

2. **Create `platform_admins` table:**

   - `user_id` (uuid, pk, fk → users)
   - `created_at` (timestamptz)

3. **Create `organization_invites` table:**

   - `id` (uuid, pk)
   - `organization_id` (uuid, fk → organizations)
   - `email` (text)
   - `role` (enum: parent, coach, org_admin)
   - `token` (text, unique)
   - `expires_at` (timestamptz)
   - `accepted_at` (timestamptz, nullable)
   - `created_by_user_id` (uuid, fk → users)
   - `created_at` (timestamptz)

4. **Update `users` table:**

   - Make `org_id` and `role` nullable (keep for backward compatibility)
   - Add `display_name` (text, nullable)
   - Keep `email` for lookup
   - Update `handle_new_user()` trigger to only create basic user record (no org/family assignment)

5. **Data Migration:**

   - Migrate existing `users.org_id` + `users.role` → `organization_members`
   - Handle users with no org (new signups)

6. **Create helper functions (STABLE for performance):**

   - `is_platform_admin(user_id)` → boolean (STABLE)
   - `get_user_org_roles(user_id, org_id)` → role[] (STABLE)
   - `user_has_org_access(user_id, org_id)` → boolean (STABLE)
   - `user_has_org_role(user_id, org_id, role)` → boolean (STABLE)

7. **Add performance indexes:**

   - `CREATE INDEX idx_org_members_user_org ON organization_members(user_id, organization_id, role)`
   - `CREATE INDEX idx_platform_admins_user ON platform_admins(user_id)`
   - `CREATE INDEX idx_org_invites_token ON organization_invites(token) WHERE accepted_at IS NULL`

### Phase 2: RLS Policy Updates

**File: `supabase/migrations/021_auth_rls_policies.sql`**

Update all RLS policies to use new structure:

1. **Users table policies:**

   - Users can read their own record
   - Platform admins can read all
   - Org admins can read users in their orgs
   - Coaches can read users in their orgs

2. **Organizations table policies:**

   - Users can read orgs they're members of
   - Platform admins can read/write all
   - Org admins can update their org

3. **Organization_members policies:**

   - Users can read their own memberships
   - Org admins can manage members in their org
   - Platform admins can manage all

4. **Update all existing table policies:**

   - Replace `users.org_id = X` with `user_has_org_access(auth.uid(), X)`
   - Replace `users.role = 'admin'` with role checks via `organization_members`
   - Add platform admin bypass for all policies

### Phase 3: Organization Invite System

**File: `supabase/migrations/022_organization_invites.sql`**

1. **Create invite functions (with race condition protection):**

   - `create_organization_invite(org_id, email, role, expires_in_days)` → invite token
     - Generates cryptographically secure token using `gen_random_uuid()::text`
     - Validates org admin permissions
     - Returns token for email sending

   - `accept_organization_invite(token, user_id)` → creates organization_members row
     - Uses `SELECT FOR UPDATE NOWAIT` to prevent race conditions
     - Validates expiration atomically
     - Checks if already accepted
     - Creates organization_members row in transaction
     - Sets `accepted_at` immediately to prevent reuse

2. **RLS policies for invites:**

   - Org admins can create invites
   - Anyone can read invites by token (for acceptance)
   - Users can accept invites for their email

3. **Edge Function (optional):**

   - `send_invite_email` function to send invite emails

### Phase 4: Google OAuth Setup

**Configuration (not in migrations):**

1. Enable Google provider in Supabase Dashboard
2. Configure OAuth credentials (Client ID and Secret)
3. Set redirect URLs:

   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

4. Configure authorized JavaScript origins

**Design Integration:**

- Google OAuth button should match design system
- Use Material Symbols icon or Google logo
- Place consistently on both Login and Signup pages
- Style as secondary action (or primary alternative)

**Frontend Implementation:**

- Add Google sign-in button to Login and Signup pages
- Use `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } })`
- Handle OAuth callback with error handling:
  - Check for `error` query param and display message
  - Handle `code` param for successful auth
  - Use `onAuthStateChange` listener to detect new users
  - Create user profile via database trigger (not in callback)
  - Redirect to appropriate page based on user state

### Phase 5: Design System Implementation

**Design Reference: `designs/login/code.html`**

1. **Design Tokens:**

   - Primary color: `#1e40af` (trustworthy navy blue)
   - Background light: `#f8fafc`
   - Background dark: `#0f172a`
   - Display font: Bebas Neue (for "TEAMHUB" branding)
   - Body font: Inter
   - Border radius: `0.5rem` (default)

2. **Layout Pattern:**

   - Split-screen on desktop (lg breakpoint and up)
   - Left side: Full-height image with overlay and gradient
   - Right side: Centered form with max-width constraints
   - Mobile: Stacked layout, image hidden

3. **Components:**

   - TEAMHUB logo with sports_score Material Symbol icon
   - Role selector cards (Parent/Coach/Admin) - UX only
   - Form inputs with proper focus states
   - Material Symbols icons throughout
   - Dark mode support via Tailwind `dark:` classes

4. **Required Assets:**

   - Sports stadium image (or similar) for left side
   - Material Symbols font loaded
   - Ensure Tailwind config matches design tokens

### Phase 6: Frontend Auth Refactor

**File: `src/hooks/useAuth.tsx`**

1. **Update UserProfile interface:**

   - Remove single `role` and `org_id`
   - Add `organizations: Array<{id: string, name: string, role: string}>`
   - Add `isPlatformAdmin: boolean`

2. **Update fetchProfile:**

   - Query `organization_members` to get all org memberships
   - Query `platform_admins` to check platform admin status
   - Build organizations array with roles

3. **Add helper methods (UX-only, not security):**

   - `hasRole(orgId, role)` → boolean (optimistic UI helper)
   - `getOrganizations()` → org[] (from organization_members query)
   - `isPlatformAdmin()` → boolean (from platform_admins query)
   - `getCurrentOrganization()` → org | null (from OrganizationContext)
   - `setCurrentOrganization(orgId)` → void (updates context)

4. **Create OrganizationContext:**

   - Manages current organization selection
   - Stores in sessionStorage (not localStorage)
   - Provides `useOrganization` hook
   - Defaults to first org user has access to

4. **Update signup flow:**

   - Remove family name requirement
   - Create user without org assignment
   - Redirect to "join organization" or invite acceptance

**File: `src/components/ProtectedRoute.tsx`**

Update to check roles per organization:

- Accept `allowedRoles` and optional `organizationId`
- Check if user has required role in specified org
- Handle platform admin bypass

**File: `src/pages/Login.tsx`**

Implement design from `designs/login/code.html`:

1. **Layout:**

   - Split-screen: image on left (hidden on mobile), form on right
   - Use Bebas Neue for display font, Inter for body
   - Dark mode support with `dark:` classes
   - TEAMHUB branding with sports_score icon

2. **Role Selector (UX only, not security):**

   - Card-based role selection (Parent/Coach/Admin)
   - Visual feedback on selection
   - Note: This is UX-only; actual role comes from organization_members

3. **Form Elements:**

   - Email and password inputs with proper styling
   - "Forgot password?" link → redirects to password reset flow
   - "Remember me" checkbox (30 days) - handled by Supabase session persistence
   - Material Symbols icons for visual elements

4. **Password Reset Flow:**

   - Create `src/pages/ForgotPassword.tsx` page (matching design)
   - Use `supabase.auth.resetPasswordForEmail(email)`
   - Create `src/pages/ResetPassword.tsx` for reset link handling
   - Match design system on both pages

5. **Google OAuth:**

   - Add Google sign-in button matching design system
   - Use `supabase.auth.signInWithOAuth({ provider: 'google' })`
   - Handle redirect with proper error states
   - Place OAuth button after email/password form or as alternative option

5. **Styling:**

   - Primary color: `#1e40af` (trustworthy navy blue)
   - Use Tailwind classes matching design
   - Responsive design (mobile-first)

**File: `src/pages/Signup.tsx`**

Implement matching design from login page:

1. **Layout:**

   - Same split-screen layout as login
   - Consistent branding and styling
   - Dark mode support

2. **Form Changes:**

   - Remove family name field (no longer required)
   - Email and password inputs
   - Password confirmation field
   - Password strength indicator (optional)
   - Terms of Service and Privacy Policy links

3. **Google OAuth:**

   - Add Google sign-in button matching design
   - Same OAuth flow as login
   - Handle new user creation via trigger

4. **User Flow:**

   - After signup, redirect to invite acceptance or "join organization" page
   - Show message: "Account created! Join an organization to get started."
   - Link to accept invite if token in URL/sessionStorage

5. **Styling:**

   - Match login page design exactly
   - Use same color scheme and typography

**New File: `src/pages/AcceptInvite.tsx`**

Implement design matching login/signup pages:

1. **Layout:**

   - Use same split-screen layout
   - Consistent branding and styling
   - Dark mode support

2. **Invite Display:**

   - Show organization name prominently
   - Display role being assigned
   - Show expiration date (if not expired)
   - Display inviting user/admin name (optional)

3. **Acceptance Flow:**

   - If user logged in: Show "Accept Invite" button, call `accept_organization_invite()` function
   - If user not logged in: Show "Sign in to accept" or "Create account to accept" buttons
   - Store token in sessionStorage if redirecting to auth
   - After signup/login: Check for pending invite and auto-accept
   - Show loading state during acceptance

4. **Error Handling:**

   - Clear error messages for expired invites
   - Handle already accepted invites gracefully
   - Show "Invalid invite" for bad tokens

5. **Success State:**

   - Show success message
   - Redirect to dashboard after successful acceptance
   - Auto-select accepted organization in context

**New File: `src/contexts/OrganizationContext.tsx`**

- Context provider for current organization selection
- Stores selected org in sessionStorage
- Provides `useOrganization` hook
- Handles org switching
- Defaults to first accessible org on load

### Phase 7: Helper Functions & Utilities

**File: `supabase/migrations/023_auth_helper_functions.sql`**

Create database functions for common auth checks (all marked STABLE for performance):

- `is_platform_admin(user_id)` → boolean (STABLE)
  - Checks `platform_admins` table
  - Used by all RLS policies for platform admin bypass

- `user_has_org_role(user_id, org_id, role)` → boolean (STABLE)
  - Checks `organization_members` for specific role
  - Used for role-based RLS policies

- `user_has_org_access(user_id, org_id)` → boolean (STABLE)
  - Checks if user is member of org (any role) or platform admin
  - Used for org-scoped RLS policies

- `get_user_organizations(user_id)` → TABLE(organization_id uuid, role text) (STABLE)
  - Returns all org memberships for user
  - Used by frontend to build org list

**Create backward compatibility view:**

- `CREATE VIEW users_legacy AS ...` (for gradual migration)

### Phase 8: Documentation

**File: `supabase/migrations/AUTH_README.md`**

Document:

- Auth flow (signup → invite → org access)
- Role resolution logic
- RLS policy structure
- Common pitfalls
- How to add new roles
- How to test auth

## Critical Technical Issues & Mitigations

### Issue 1: Race Conditions in Invite Acceptance

**Problem:** Multiple users accepting same invite, or accepting after expiration.

**Approach A:** Database-level locking with SELECT FOR UPDATE

**Approach B:** Unique constraint + transaction with explicit checks

**Selected:** Approach A - Use `SELECT FOR UPDATE NOWAIT` in `accept_organization_invite()` function to prevent concurrent acceptance. Add explicit expiration check in same transaction.

**Implementation:**

- Wrap invite acceptance in transaction
- Use `SELECT FOR UPDATE NOWAIT` to lock invite row
- Check expiration and acceptance status atomically
- Return clear error if already accepted/expired

### Issue 2: RLS Policy Conflicts and Performance

**Problem:** Multiple overlapping policies causing conflicts or slow queries.

**Approach A:** Explicit policy ordering with isolated testing

**Approach B:** Consolidated helper functions for role checks

**Selected:** Approach B - Create helper functions (`is_platform_admin`, `user_has_org_role`) that all policies use. This ensures consistency and allows query optimization via function caching.

**Implementation:**

- All RLS policies use helper functions, never direct queries
- Helper functions marked as `STABLE` for query optimization
- Single source of truth for role logic
- Add indexes on `organization_members(user_id, organization_id)`

### Issue 3: Data Migration Failures

**Problem:** Existing users lose access or data corruption during migration.

**Approach A:** Rollback script + staging testing

**Approach B:** Dual-write approach with gradual migration

**Selected:** Approach B - Write to both old and new structure during transition period. Migrate data in batches with validation. Keep old columns nullable for 2-3 deployment cycles.

**Implementation:**

- Migration script validates data before and after
- Create `organization_members` rows from existing `users.org_id/role`
- Update RLS to check both structures (old OR new)
- Add validation queries to verify migration completeness
- Only remove old columns after full frontend deployment

### Issue 4: Role Checking Inconsistencies

**Problem:** Frontend and backend checking roles differently, causing security gaps.

**Approach A:** Frontend mirrors backend logic exactly

**Approach B:** Frontend only for UX, all security in RLS

**Selected:** Approach B - Frontend role checks are purely for UX (showing/hiding UI). All actual authorization happens via RLS. Frontend queries will fail if user lacks permission.

**Implementation:**

- Frontend `hasRole()` is optimistic UI helper only
- All data queries go through Supabase client (enforces RLS)
- ProtectedRoute checks session, not roles (RLS blocks unauthorized data)
- Document that frontend checks are UX-only

### Issue 5: OAuth Callback Handling Failures

**Problem:** Redirect loops, state validation failures, or user creation race conditions.

**Approach A:** Complex state management with localStorage

**Approach B:** Supabase built-in state handling + explicit error states

**Selected:** Approach B - Use Supabase's built-in OAuth state management. Add explicit error handling for callback failures. Use `onAuthStateChange` to handle user creation consistently.

**Implementation:**

- Use `supabase.auth.signInWithOAuth()` with proper redirect URL
- Handle `code` and `error` query params in callback
- Use `onAuthStateChange` listener to detect new OAuth users
- Create user profile in trigger, not frontend callback
- Show clear error messages for OAuth failures

### Issue 6: Multiple Org Context Confusion

**Problem:** Frontend doesn't know which org context to use, causing wrong data display.

**Approach A:** URL-based org context (`/org/:orgId/...`)

**Approach B:** Context provider with explicit org selection

**Selected:** Approach B - Create `OrganizationContext` provider that manages current org selection. Store in sessionStorage (not localStorage for security). All org-scoped queries use this context.

**Implementation:**

- Create `useOrganization` hook with current org state
- Store selected org in sessionStorage (clears on browser close)
- Default to first org if user has access
- All org-scoped queries include `organization_id` filter
- Add org switcher UI component

### Issue 7: RLS Performance Degradation

**Problem:** Complex RLS policies with multiple EXISTS subqueries causing slow queries.

**Approach A:** Optimize each policy individually

**Approach B:** Materialized views or function-based policies with caching

**Selected:** Approach B - Use helper functions marked as `STABLE` (PostgreSQL caches results within transaction). Add strategic indexes. Consider materialized view for user-org-role mappings if needed.

**Implementation:**

- Mark all helper functions as `STABLE`
- Add composite index: `CREATE INDEX idx_org_members_user_org ON organization_members(user_id, organization_id, role)`
- Add index on `platform_admins(user_id)`
- Use function-based policies where possible
- Monitor query performance, add EXPLAIN ANALYZE tests

### Issue 8: Invite Token Security Vulnerabilities

**Problem:** Predictable tokens, token reuse, or insufficient entropy.

**Approach A:** UUID-based tokens

**Approach B:** Cryptographically secure random tokens with proper length

**Selected:** Approach B - Use `gen_random_uuid()` for tokens, store as text with unique constraint. Add expiration check in function, not just RLS. One-time use enforced at database level.

**Implementation:**

- Generate tokens with `gen_random_uuid()::text`
- Store in `organization_invites.token` with UNIQUE constraint
- Expiration checked in `accept_organization_invite()` function
- Set `accepted_at` immediately on acceptance (prevents reuse)
- Add RLS policy preventing reading accepted invites

### Issue 9: User Creation Trigger Conflicts

**Problem:** `handle_new_user()` trigger conflicts with new multi-org structure or creates orphaned records.

**Approach A:** Keep trigger simple, handle org assignment separately

**Approach B:** Remove trigger, use Edge Function or explicit frontend calls

**Selected:** Approach A - Keep trigger minimal (only creates `users` row). Remove any org/family assignment from trigger. Org assignment happens via invites or admin assignment.

**Implementation:**

- Update `handle_new_user()` to only create basic user record
- Remove any `org_id` or `family_id` assignment from trigger
- Set `display_name` from auth metadata if available
- Document that org assignment is separate step
- Add validation to prevent trigger from failing silently

### Issue 10: Backward Compatibility Breaks

**Problem:** Existing code expecting `users.org_id` or `users.role` breaks after migration.

**Approach A:** Keep old columns indefinitely with computed values

**Approach B:** Migration period with deprecation warnings, then removal

**Selected:** Approach B - Keep old columns nullable during migration. Add database views for backward compatibility. Create migration guide. Remove after 2-3 release cycles with clear deprecation notices.

**Implementation:**

- Keep `users.org_id` and `users.role` nullable
- Create view: `CREATE VIEW users_legacy AS SELECT u.*, om.organization_id as org_id, om.role FROM users u LEFT JOIN LATERAL (SELECT organization_id, role FROM organization_members WHERE user_id = u.id LIMIT 1) om ON true`
- Update frontend gradually to use new structure
- Add deprecation warnings in code comments
- Create migration checklist for developers

## Migration Strategy

1. **Backward Compatibility:**

   - Keep `users.org_id` and `users.role` nullable during migration
   - Create `organization_members` rows from existing data
   - Update RLS to check both old and new structure initially
   - Create `users_legacy` view for backward compatibility

2. **Data Migration Script:**
   ```sql
   -- Migrate existing users to organization_members
   -- Run with validation and error handling
   DO $$
   DECLARE
     migrated_count INTEGER;
     total_count INTEGER;
   BEGIN
     -- Validate source data
     SELECT COUNT(*) INTO total_count FROM users WHERE org_id IS NOT NULL;
     
     -- Migrate with conflict handling
     INSERT INTO organization_members (organization_id, user_id, role)
     SELECT org_id, id, role
     FROM users
     WHERE org_id IS NOT NULL
     ON CONFLICT (organization_id, user_id) DO NOTHING;
     
     -- Verify migration
     SELECT COUNT(*) INTO migrated_count FROM organization_members;
     
     IF migrated_count < total_count THEN
       RAISE WARNING 'Migration incomplete: % of % users migrated', migrated_count, total_count;
     END IF;
   END $$;
   ```

3. **Gradual Rollout:**

   - Deploy migrations with backward compatibility
   - Update frontend to use new structure incrementally
   - Monitor for errors and performance issues
   - Remove old columns after 2-3 release cycles with validation

## Testing Checklist

- [ ] User can sign up with email/password
- [ ] User can sign up with Google OAuth
- [ ] User can sign in with email/password
- [ ] User can sign in with Google OAuth
- [ ] New user has no org access initially
- [ ] Org admin can create invite
- [ ] User can accept invite (existing account)
- [ ] User can accept invite (new account)
- [ ] User can have multiple org memberships
- [ ] User can have different roles in different orgs
- [ ] Platform admin can access all orgs
- [ ] RLS blocks unauthorized access
- [ ] RLS allows authorized access
- [ ] Role checks work in frontend (UX only)
- [ ] Protected routes enforce roles correctly (RLS enforced)
- [ ] Organization context switching works
- [ ] Invite acceptance prevents race conditions
- [ ] OAuth callback handles all error cases
- [ ] RLS policies perform well (no slow queries)
- [ ] Migration preserves all existing user access
- [ ] Backward compatibility view works correctly
- [ ] Login page matches design from `designs/login/code.html`
- [ ] Signup page matches login design
- [ ] Google OAuth button styled consistently
- [ ] Dark mode works on all auth pages
- [ ] Role selector works (UX only)
- [ ] Material Symbols icons display correctly
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Password reset flow works (ForgotPassword → email → ResetPassword)
- [ ] All auth pages have consistent design and branding

## Files to Create/Modify

**New Files:**

- `supabase/migrations/020_auth_restructure.sql`
- `supabase/migrations/021_auth_rls_policies.sql`
- `supabase/migrations/022_organization_invites.sql`
- `supabase/migrations/023_auth_helper_functions.sql`
- `supabase/migrations/AUTH_README.md`
- `src/pages/AcceptInvite.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`
- `src/contexts/OrganizationContext.tsx`
- `src/hooks/useOrganization.tsx`

**Modified Files:**

- `src/hooks/useAuth.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Login.tsx` (redesign to match `designs/login/code.html`)
- `src/pages/Signup.tsx` (redesign to match login design)
- `src/lib/database.types.ts` (regenerate after migrations)
- `tailwind.config.js` (ensure design tokens match: primary color, fonts)
- `src/index.css` (add Material Symbols font if not already present)

## Security Considerations

1. **RLS Enforcement:**

   - All policies must use database functions, not frontend checks
   - Platform admin checks must be in database
   - No role data in JWT (use RLS queries)

2. **Invite Security:**

   - Tokens must be cryptographically secure
   - Expiration enforced at database level
   - One-time use (mark as accepted)

3. **OAuth Security:**

   - Validate redirect URLs
   - Handle state parameter for CSRF protection
   - Verify email domain if needed

## Edge Cases Handled

- User invited before account exists → store invite, accept after signup
- User belongs to multiple orgs → frontend shows org switcher
- User has multiple roles → role checks per org
- Revoked access → RLS immediately blocks
- Deleted user → historical data preserved (soft delete consideration)

## Success Criteria

- Users can sign up and log in reliably
- Roles are enforced server-side via RLS
- No unauthorized data access possible
- No auth logic duplicated in frontend
- System is easy to extend with new roles/orgs
- All existing functionality continues to work