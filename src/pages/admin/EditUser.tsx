import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { getErrorMessage } from '../../utils/errorUtils'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { updateOrganizationUser } from '../../api/users'
import { getOrganizationUsers } from '../../data/services/usersService'
import { showSuccess } from '../../utils/toast'
import { mapDbRoleToFrontendRole } from '../../utils/roleHelpers'
import { formatDate } from '../../utils/dateFormatters'
import '../../styles/orgAdmin.css'

interface UserFormData {
  first_name: string
  last_name: string
  phone: string
  role: 'admin' | 'coach' | 'parent'
}

export default function EditUser() {
  const { userId } = useParams<{ userId: string }>()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{
    id: string
    email: string
    display_name: string | null
    phone: string | null
    roles: string[]
    created_at: string
  } | null>(null)
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)
  
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load user data
  useEffect(() => {
    if (!isReady || !userId || !currentOrganization) {
      setLoading(false)
      return
    }

    const loadUser = async () => {
      const currentRequestId = ++requestIdRef.current
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await getOrganizationUsers(context)
        
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return
        }

        if (fetchError) {
          setError(getErrorMessage(fetchError))
          setLoading(false)
          return
        }

        const foundUser = data.find(u => u.id === userId)
        if (!foundUser) {
          setError('User not found')
          setLoading(false)
          return
        }

        setUser(foundUser)
      } catch (err) {
        if (isMountedRef.current && currentRequestId === requestIdRef.current) {
          setError(getErrorMessage(err))
        }
      } finally {
        if (isMountedRef.current && currentRequestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }

    loadUser()
  }, [isReady, userId, context, currentOrganization])

  // Parse display name into first/last
  const parseDisplayName = (displayName: string | null): { first: string; last: string } => {
    if (!displayName) return { first: '', last: '' }
    const parts = displayName.trim().split(/\s+/)
    if (parts.length === 0) return { first: '', last: '' }
    if (parts.length === 1) return { first: parts[0], last: '' }
    return {
      first: parts[0],
      last: parts.slice(1).join(' '),
    }
  }

  // Get primary role (first role, mapped to frontend format)
  const getPrimaryRole = (roles: string[]): 'admin' | 'coach' | 'parent' => {
    if (roles.length === 0) return 'parent'
    // Map database role to frontend role
    const dbRole = roles[0] as 'org_admin' | 'coach' | 'parent'
    return mapDbRoleToFrontendRole(dbRole)
  }

  const nameParts = user ? parseDisplayName(user.display_name) : { first: '', last: '' }
  const primaryRole = user ? getPrimaryRole(user.roles) : 'parent'

  const { control, handleSubmit, formState: { errors }, reset } = useForm<UserFormData>({
    defaultValues: { 
      first_name: nameParts.first,
      last_name: nameParts.last,
      phone: user?.phone || '', 
      role: primaryRole,
    },
  })

  // Reset form when user data loads
  useEffect(() => {
    if (user) {
      const nameParts = parseDisplayName(user.display_name)
      const primaryRole = getPrimaryRole(user.roles)
      reset({
        first_name: nameParts.first,
        last_name: nameParts.last,
        phone: user.phone || '',
        role: primaryRole,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: UserFormData) => {
    if (!isReady || !currentOrganization || !userId || !user) {
      setError('Required context not available')
      return
    }

    const currentRequestId = ++requestIdRef.current
    setSaving(true)
    setError(null)
    
    try {
      // Validation
      const trimmedFirstName = data.first_name.trim()
      const trimmedLastName = data.last_name.trim()
      const trimmedPhone = data.phone.trim()

      if (trimmedFirstName.length === 0) {
        setError('First name is required')
        setSaving(false)
        return
      }

      if (trimmedLastName.length === 0) {
        setError('Last name is required')
        setSaving(false)
        return
      }

      if (trimmedPhone.length === 0) {
        setError('Phone number is required')
        setSaving(false)
        return
      }

      // Phone validation
      const phoneValidation = validatePhoneFormat(trimmedPhone)
      if (!phoneValidation.valid) {
        setError(phoneValidation.error || 'Invalid phone number')
        setSaving(false)
        return
      }

      // Check if role changed
      const currentRole = getPrimaryRole(user.roles)
      const roleChanged = currentRole !== data.role

      // Call API to update user
      const result = await updateOrganizationUser({
        user_id: userId,
        org_id: currentOrganization.id,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        phone: trimmedPhone,
        role: roleChanged ? data.role : undefined, // Only update role if changed
      })

      // Check if component is still mounted and request is still current
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return
      }

      if (!result.success) {
        setError(result.error || 'Failed to update user')
        setSaving(false)
        return
      }

      // Success
      showSuccess(result.message || 'User updated successfully')
      navigate('/admin/organization/users')
    } catch (err: unknown) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return
      }
      setError(getErrorMessage(err) || 'Failed to update user')
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setSaving(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="oa-root">
        <AdminPageHeader 
          title="Edit User" 
          subtitle="Loading user data..." 
        />
        <Card>
          <div className="oa-p-6 oa-text-center">Loading...</div>
        </Card>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="oa-root">
        <AdminPageHeader 
          title="Edit User" 
          subtitle="Error loading user" 
          breadcrumbs={[
            { label: 'Users', path: '/admin/organization/users' },
            { label: 'Edit User' },
          ]}
        />
        <Card>
          <div className="oa-p-6">
            <div className="oa-text-danger oa-mb-4">{error}</div>
            <Button onClick={() => navigate('/admin/organization/users')}>Back to Users</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title="Edit User" 
        subtitle={`Edit ${user.display_name || user.email}`}
        breadcrumbs={[
          { label: 'Users', path: '/admin/organization/users' },
          { label: 'Edit User' },
        ]}
      />
      <div className="oa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="oa-card oa-mb-4 oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>
                {error}
              </div>
            )}

            {/* Read-only email */}
            <div className="oa-mb-4">
              <label className="oa-label">Email</label>
              <div className="oa-input oa-input--disabled" style={{ background: 'var(--oa-neutral-light)', cursor: 'not-allowed' }}>
                {user.email}
              </div>
              <p className="oa-body-s oa-text-muted oa-mt-1">Email cannot be changed. Use a separate flow to change email.</p>
            </div>

            {/* Read-only joined date */}
            <div className="oa-mb-4">
              <label className="oa-label">Joined</label>
              <div className="oa-body-m">{formatDate(user.created_at, 'long')}</div>
            </div>
            
            <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
              <Controller 
                name="first_name" 
                control={control} 
                rules={{ 
                  required: 'First name is required',
                  validate: (v) => v.trim().length > 0 || 'First name cannot be only spaces'
                }} 
                render={({ field }) => (
                  <Input 
                    {...field} 
                    label="First Name" 
                    required 
                    maxLength={100}
                    error={errors.first_name?.message || undefined} 
                  />
                )} 
              />
              <Controller 
                name="last_name" 
                control={control} 
                rules={{ 
                  required: 'Last name is required',
                  validate: (v) => v.trim().length > 0 || 'Last name cannot be only spaces'
                }} 
                render={({ field }) => (
                  <Input 
                    {...field} 
                    label="Last Name" 
                    required 
                    maxLength={100}
                    error={errors.last_name?.message || undefined} 
                  />
                )} 
              />
            </div>

            <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
              <Controller 
                name="phone" 
                control={control} 
                rules={{ 
                  required: 'Phone number is required',
                  validate: (v) => {
                    const trimmed = v.trim()
                    if (trimmed.length === 0) {
                      return 'Phone number is required'
                    }
                    const phoneValidation = validatePhoneFormat(trimmed)
                    return phoneValidation.valid || phoneValidation.error || 'Invalid phone number'
                  }
                }} 
                render={({ field }) => (
                  <Input 
                    {...field} 
                    label="Phone Number" 
                    type="tel" 
                    required
                    maxLength={20}
                    placeholder="(555) 123-4567"
                    error={errors.phone?.message || undefined}
                  />
                )} 
              />
              <Controller 
                name="role" 
                control={control} 
                render={({ field }) => (
                  <Select 
                    {...field} 
                    label="Role" 
                    options={[
                      { value: 'parent', label: 'Parent' },
                      { value: 'coach', label: 'Coach' },
                      { value: 'admin', label: 'Admin' },
                    ]} 
                  />
                )} 
              />
            </div>

            <div className="oa-card oa-mb-6" style={{ background: 'var(--oa-info-bg)', border: 'none' }}>
              <p className="oa-body-s">
                <strong>Note:</strong> Changing the role will update the user's permissions in this organization. 
                {user.roles.includes('org_admin') && ' Note: This user is currently an organization admin.'}
              </p>
            </div>

            <div className="oa-flex oa-justify-end oa-gap-3">
              <OrgAdminButton variant="primary" onClick={() => navigate('/admin/organization/users')}>Cancel</OrgAdminButton>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
