import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/platformAdmin'

interface UserFormData {
  email: string
  display_name: string
  phone: string
  role: 'admin' | 'coach' | 'parent'
}

export default function CreateUser() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)


  // Context available if needed for future use
  // const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const { control, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    defaultValues: { 
      email: '', 
      display_name: '', 
      phone: '', 
      role: 'parent' 
    },
  })

  const onSubmit = async (data: UserFormData) => {
    setSaving(true)
    setError(null)
    
    try {
      // In fake data mode, just navigate back with success
      // TODO: Replace with real user creation when migrating
      /*
      // 1. Create auth user via Supabase Auth Admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: {
          display_name: data.display_name,
        }
      })
      
      if (authError) throw authError

      // 2. Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: data.email,
          display_name: data.display_name,
          phone: data.phone || null,
          org_id: currentOrganization?.id,
        })
      
      if (profileError) throw profileError

      // 3. Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: data.role,
          org_id: currentOrganization?.id,
        })
      
      if (roleError) throw roleError
      */
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/admin/users')
    } catch (err: unknown) { 
      setError(getErrorMessage(err) || 'Failed to create user') 
    } finally { 
      setSaving(false) 
    }
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Create User" 
        breadcrumbs={[
          { label: 'Users', path: '/admin/users' },
          { label: 'Create User' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            
            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
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
                name="display_name" 
                control={control} 
                rules={{ required: 'Display name is required' }} 
                render={({ field }) => (
                  <Input 
                    {...field} 
                    label="Display Name" 
                    required 
                    error={errors.display_name?.message || undefined} 
                  />
                )} 
              />
            </div>

            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-6">
              <Controller 
                name="phone" 
                control={control} 
                render={({ field }) => (
                  <Input 
                    {...field} 
                    label="Phone Number" 
                    type="tel" 
                    placeholder="(555) 123-4567" 
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

            <div className="pa-card pa-mb-6" style={{ background: 'var(--pa-info-bg)', border: 'none' }}>
              <p className="pa-body-s">
                <strong>Note:</strong> The user will receive an email invitation to set their password and activate their account.
              </p>
            </div>

            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button variant="secondary" onClick={() => navigate('/admin/users')}>Cancel</Button>
              <Button type="submit" loading={saving}>Create User</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

