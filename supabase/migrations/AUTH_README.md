# TeamHub Authentication System

## Overview

TeamHub uses a multi-organization authentication system built on Supabase Auth. This system supports:

- **Multiple organizations per user**: A user can belong to multiple organizations
- **Role-based access control**: Each user has a role within each organization
- **Platform administrators**: Global admins with access to all organizations
- **Email/password authentication**: Standard signup and signin
- **Google OAuth**: One-click signup/signin with Google
- **Organization invites**: Token-based invite system for adding members

## Database Structure

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles linked to `auth.users` |
| `organizations` | Organizations/clubs |
| `organization_members` | User-org relationships with roles |
| `platform_admins` | Global platform administrators |
| `organization_invites` | Invitation tokens |

### Roles

**Organization Roles** (`org_member_role` enum):
- `parent` - Parent/guardian with basic access
- `coach` - Coach with expanded team access
- `org_admin` - Organization administrator

**Platform Admin**:
- Global access to all organizations
- Stored in `platform_admins` table, not `organization_members`

## Auth Flow

### 1. Signup
```
User → Signup Page → Supabase Auth → handle_new_user() trigger → users table
```
- User signs up with email/password or Google
- Database trigger creates `users` record
- User has no organization access until invited

### 2. Login
```
User → Login Page → Supabase Auth → Session → Redirect to Dashboard
```

### 3. Organization Invite
```
Admin → Create Invite → Token Generated
Invitee → Accept Invite Page → organization_members created
```

### 4. Data Access
```
Query → RLS Check → Helper Functions → Data (or denied)
```

## RLS (Row Level Security)

**CRITICAL**: All authorization is handled by RLS policies. Frontend role checks are UX-only.

### Helper Functions (STABLE)

| Function | Purpose |
|----------|---------|
| `is_platform_admin(user_id)` | Check if user is platform admin |
| `user_has_org_access(user_id, org_id)` | Check if user has any access to org |
| `user_has_org_role(user_id, org_id, role)` | Check if user has specific role |
| `user_is_org_admin(user_id, org_id)` | Shorthand for org_admin check |
| `get_user_organizations(user_id)` | Get all orgs for a user |

### Policy Pattern

```sql
-- Platform admin bypass + org-specific access
CREATE POLICY "example_policy" ON some_table
  FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    user_has_org_access(auth.uid(), organization_id)
  );
```

## Invite System

### Creating Invites

```typescript
const { data, error } = await supabase.rpc('create_organization_invite', {
  p_org_id: 'org-uuid',
  p_email: 'user@example.com',
  p_role: 'parent', // or 'coach', 'org_admin'
  p_expires_in_days: 7
});
// Returns: { invite_token: 'uuid-token', expires_at: 'timestamp' }
```

### Accepting Invites

```typescript
const { data, error } = await supabase.rpc('accept_organization_invite', {
  p_token: 'invite-token'
});
// Returns: { success: true, organization_id: 'uuid', message: '...' }
```

### Race Condition Protection

The `accept_organization_invite` function uses `SELECT FOR UPDATE NOWAIT` to prevent:
- Multiple simultaneous acceptances
- Accepting after expiration
- Token reuse

## Frontend Architecture

### Contexts & Hooks

| Hook/Context | Purpose |
|--------------|---------|
| `useAuth()` | Authentication state and methods |
| `useOrganization()` | Current organization context |
| `OrganizationProvider` | Manages org selection |
| `AuthProvider` | Manages auth state |

### Role Checks (UX Only)

```typescript
const { hasRole, hasAnyRole, isOrgAdmin, profile } = useAuth();

// Check role in specific org
if (hasRole('org-id', 'coach')) { ... }

// Check role in any org
if (hasAnyRole('org_admin')) { ... }

// Check if org admin (uses current org from context)
if (isOrgAdmin()) { ... }

// Platform admin check
if (profile?.isPlatformAdmin) { ... }
```

**WARNING**: These checks are for UI/UX only! RLS enforces actual access.

### Protected Routes

```tsx
// Basic protection (just requires auth)
<ProtectedRoute><Dashboard /></ProtectedRoute>

// Role-based protection (UX only, RLS still enforces)
<ProtectedRoute allowedRoles={['admin', 'org_admin']}>
  <AdminPage />
</ProtectedRoute>

// Require organization membership
<ProtectedRoute requireOrganization>
  <OrgSpecificPage />
</ProtectedRoute>
```

## Common Pitfalls & Solutions

### 1. Bypassing RLS with Frontend Checks

❌ **Wrong**:
```typescript
if (isAdmin) {
  // Fetch admin data without RLS
  const data = await adminClient.from('users').select('*');
}
```

✅ **Correct**:
```typescript
// Always use the authenticated client
// RLS will handle authorization
const { data } = await supabase.from('users').select('*');
// RLS automatically filters to what user can access
```

### 2. Role Checks in API Calls

❌ **Wrong**:
```typescript
async function deleteUser(userId: string) {
  if (!hasRole('org_admin')) return; // Client-side check only!
  await supabase.from('users').delete().eq('id', userId);
}
```

✅ **Correct**:
```typescript
async function deleteUser(userId: string) {
  // Just make the call - RLS will reject if unauthorized
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    handleError(error); // Will get permission denied from RLS
  }
}
```

### 3. Assuming Single Organization

❌ **Wrong**:
```typescript
const userOrgId = profile?.org_id; // Legacy single org field
```

✅ **Correct**:
```typescript
const { currentOrganization } = useOrganization();
const currentOrgId = currentOrganization?.id;
```

### 4. OAuth Callback Errors

If OAuth fails with redirect errors:
1. Check redirect URLs in Supabase Dashboard
2. Verify allowed origins
3. Check for browser popup blockers
4. Test in incognito mode

### 5. Invite Expiration Edge Cases

Invites are checked both on fetch and accept:
- `get_invite_details()` returns expired status
- `accept_organization_invite()` verifies again before accepting
- Prevents race conditions between viewing and accepting

## Migration from Legacy System

### Backward Compatibility

Legacy fields are preserved during transition:
- `users.org_id` - First org membership (nullable)
- `users.role` - Legacy role enum

### users_legacy View

```sql
SELECT * FROM users_legacy;
-- Returns users with computed org_id and role from organization_members
```

### Deprecation Timeline

1. **Phase 1** (Current): Both systems active, writes go to both
2. **Phase 2**: Frontend migrated to new structure
3. **Phase 3**: Legacy fields removed, view remains for compatibility

## Testing Checklist

- [ ] Email signup works
- [ ] Email signin works
- [ ] Google OAuth signup works
- [ ] Google OAuth signin works
- [ ] Password reset flow works
- [ ] Invite creation works (admin)
- [ ] Invite acceptance works (new user)
- [ ] Invite acceptance works (existing user)
- [ ] Multi-org user can switch orgs
- [ ] Platform admin can access all orgs
- [ ] RLS blocks unauthorized data access
- [ ] Protected routes redirect properly
- [ ] Organization context persists in session

## Security Considerations

1. **All auth in RLS**: Never trust frontend checks alone
2. **STABLE functions**: Marked for query optimization
3. **SECURITY DEFINER**: Functions run with elevated privileges
4. **Token security**: Invites use cryptographic UUIDs
5. **One-time use**: Invites marked accepted immediately
6. **Session storage**: Current org stored in sessionStorage (not localStorage)
