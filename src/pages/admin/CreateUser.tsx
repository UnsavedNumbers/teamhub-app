import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { useT } from '../../i18n/useI18n'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { createOrganizationUser } from '../../api/users'
import { showSuccess, showError } from '../../utils/toast'
import '../../styles/orgAdmin.css'

interface UserFormData {
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'admin' | 'coach' | 'parent'
}

export default function CreateUser() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const [searchParams] = useSearchParams()

  const t = useT()
  const navigate = useNavigate()
  const { isReady } = useUserContext()
  const { currentOrganization } = useOrganization()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const { control, handleSubmit, formState: { errors }, watch } = useForm<UserFormData>({
    defaultValues: { 
      email: '', 
      first_name: '', 
      last_name: '', 
      phone: '', 
      role: 'parent' 
    },
  })

  const onSubmit = async (data: UserFormData) => {
    if (!isReady || !currentOrganization) {
      setError('Organization context not available')
      return
    }

    const currentRequestId = ++requestIdRef.current
    setSaving(true)
    setError(null)
    
    try {
      // Validation - trim and check length
      const trimmedFirstName = data.first_name.trim()
      const trimmedLastName = data.last_name.trim()
      const trimmedPhone = data.phone.trim()
      const trimmedEmail = data.email.trim().toLowerCase()

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

      if (trimmedEmail.length === 0) {
        setError('Email is required')
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

      // Email validation
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
      if (!emailRegex.test(trimmedEmail)) {
        setError('Invalid email format')
        setSaving(false)
        return
      }

      // Call API to create user
      const result = await createOrganizationUser({
        org_id: currentOrganization.id,
        email: trimmedEmail,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        phone: trimmedPhone,
        role: data.role,
      })

      // Check if component is still mounted and request is still current
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return
      }

      if (!result.success) {
        setError(result.error || 'Failed to create user')
        setSaving(false)
        return
      }

      // Success
      showSuccess(result.message || 'User created successfully')
      
      // Check if this is a return flow from sub-org setup
      const source = searchParams.get('source')
      if (source === 'suborg_setup') {
        if (!result.user_id) {
          // Error: user_id missing in return flow
          showError('User was created but user ID is missing. Please manually select the admin from the Sub Organizations page.')
          navigate('/admin/organization/sub-orgs')
          return
        }
        // Navigate to Sub Orgs page with state to open modal
        navigate('/admin/organization/sub-orgs', {
          state: {
            openSubOrgInviteModal: true,
            suborgAdminUserId: result.user_id,
          },
        })
      } else {
        navigate('/admin/organization/users')
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return
      }
      setError(getErrorMessage(err) || 'Failed to create user')
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setSaving(false)
      }
    }
  }

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title="Create User" 
        subtitle={t('admin.users.createSubtitle')} 
        breadcrumbs={[
          { label: 'Users', path: '/admin/organization/users' },
          { label: 'Create User' },
        ]}
      />
      <div className="oa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="oa-card oa-mb-4 oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>{error}</div>}
            
            <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
              <Controller 
                name="email" 
                control={control} 
                rules={{ 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }} 
                render={({ field }) => (
                  <Input 
                    {...field} 
                    label="Email" 
                    type="email" 
                    required 
                    error={errors.email?.message || undefined} 
                  />
                )} 
              />
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
            </div>

            <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
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
            </div>

            <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-6">
              <Controller 
                name="role" 
                control={control} 
                render={({ field }) => (
                  <Select 
                    {...field} 
                    label="Role" 
                    options={[
                      { value: 'parent', label: 'Guardian' },
                      { value: 'coach', label: 'Coach' },
                      { value: 'admin', label: 'Admin' },
                    ]} 
                  />
                )} 
              />
            </div>

            <div className="oa-mb-6">
              <p className="oa-body-s">
                <strong>Note:</strong> {watch('role') === 'admin' 
                  ? 'Only platform admins can create organization admin users. If you are not a platform admin, this will fail.'
                  : 'The user will be created and added to your organization. If the email already exists, they will be added to your organization.'}
              </p>
            </div>

            <div className="oa-flex oa-justify-end oa-gap-3">
              <OrgAdminButton variant="primary" onClick={() => navigate('/admin/organization/users')}>Cancel</OrgAdminButton>
              <Button type="submit" loading={saving}>Create User</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
