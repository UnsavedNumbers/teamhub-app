import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/platformAdmin'

interface UserFormData {
  email: string
  role: 'coach' | 'org_admin'
}

export default function CreateUser() {
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
    watch
  } = useForm<UserFormData>({
    defaultValues: { email: '', role: 'coach' },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: UserFormData) => {
    if (!currentOrganization?.id) { setError('root', { message: 'Organization not found' }); return; }
    try {
      const { error: insertError } = await supabase.from('users').insert({
        id: crypto.randomUUID(), email: data.email, 
        role: data.role === 'org_admin' ? 'admin' : data.role, 
        org_id: currentOrganization.id,
      } as never)
      if (insertError) throw insertError
      reset(); navigate('/admin/users')
    } catch (err: unknown) { setError('root', { message: getErrorMessage(err) || 'Failed to create user' }) }
  }

  return (
    <div className="pa-root">
      <PageHeader title="Add New User" />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          {errors.root && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{errors.root.message}</div>}
          
          <div className="pa-mb-5">
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' } }}
              render={({ field }) => <Input {...field} label="Email Address" required error={!!errors.email} helperText={errors.email?.message} placeholder="coach@example.com" />}
            />
          </div>

          <div className="pa-mb-6">
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select 
                  {...field} 
                  label="Role" 
                  options={[{value: 'coach', label: 'Coach'}, {value: 'org_admin', label: 'Admin'}]} 
                />
              )}
            />
            <div className="pa-body-s pa-text-muted pa-mt-2">
              {selectedRole === 'coach' 
                ? 'Coaches can view rosters, attendance, and post announcements.' 
                : 'Admins have full access to manage teams, fees, and all organization data.'}
            </div>
          </div>

          <div className="pa-flex pa-justify-end pa-gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Create User</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
