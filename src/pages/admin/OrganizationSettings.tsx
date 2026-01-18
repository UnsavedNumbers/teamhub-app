import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input 
} from '../../components/platformAdmin'

interface OrgSettingsFormData {
  name: string
  website: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
}

export default function OrganizationSettings() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { currentOrganization } = useOrganization()
  // Context available if needed for future use
  // const { context, isReady } = useUserContext()

  const { control, handleSubmit, reset, formState: { errors } } = useForm<OrgSettingsFormData>({
    defaultValues: {
      name: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
    }
  })

  useEffect(() => {
    if (currentOrganization) {
      reset({
        name: currentOrganization.name || '',
        website: currentOrganization.website || '',
        phone: currentOrganization.phone || '',
        email: currentOrganization.email || '',
        address: currentOrganization.address || '',
        city: currentOrganization.city || '',
        state: currentOrganization.state || '',
        zip: currentOrganization.zip || '',
      })
    }
  }, [currentOrganization, reset])

  const onSubmit = async (data: OrgSettingsFormData) => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      // In fake data mode, just show success
      // TODO: Replace with real Supabase update when migrating
      /*
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: data.name,
          website: data.website || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
        })
        .eq('id', currentOrganization?.id)
      
      if (updateError) throw updateError
      */
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) { 
      setError(getErrorMessage(err) || 'Failed to update organization settings') 
    } finally { 
      setSaving(false) 
    }
  }

  return (
    <div className="pa-root">
      <PageHeader title="Organization Settings" />
      
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
              {error}
            </div>
          )}
          
          {success && (
            <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-success-bg)', border: 'none', color: 'var(--pa-success)' }}>
              Settings updated successfully!
            </div>
          )}

          <h3 className="pa-h3 pa-mb-4">BASIC INFORMATION</h3>
          
          <div className="pa-mb-4">
            <Controller 
              name="name" 
              control={control} 
              rules={{ required: 'Organization name is required' }} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="Organization Name" 
                  required 
                  error={errors.name?.message || undefined} 
                />
              )} 
            />
          </div>

          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
            <Controller 
              name="email" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="Contact Email" 
                  type="email" 
                />
              )} 
            />
            <Controller 
              name="phone" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="Contact Phone" 
                  type="tel" 
                />
              )} 
            />
          </div>

          <div className="pa-mb-6">
            <Controller 
              name="website" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="Website" 
                  type="url" 
                  placeholder="https://example.com" 
                />
              )} 
            />
          </div>

          <h3 className="pa-h3 pa-mb-4 pa-mt-6">ADDRESS</h3>

          <div className="pa-mb-4">
            <Controller 
              name="address" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="Street Address" 
                />
              )} 
            />
          </div>

          <div className="pa-grid pa-grid-3 pa-gap-4 pa-mb-6">
            <Controller 
              name="city" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="City" 
                />
              )} 
            />
            <Controller 
              name="state" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="State" 
                  placeholder="CA" 
                />
              )} 
            />
            <Controller 
              name="zip" 
              control={control} 
              render={({ field }) => (
                <Input 
                  {...field} 
                  label="ZIP Code" 
                />
              )} 
            />
          </div>

          <div className="pa-flex pa-justify-end pa-gap-3">
            <Button variant="secondary" onClick={() => reset()}>Reset</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

