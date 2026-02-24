import { useState, useEffect, useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { getEmailBrandingSettings, updateEmailBrandingSettings, type EmailBrandingSettings } from '../../data/services/emailBrandingService'

interface OrganizationOption {
  id: string
  name: string
}

export default function EmailSettings() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<EmailBrandingSettings | null>(null)

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<EmailBrandingSettings>({
    defaultValues: {
      organization_name: '',
      logo_url: null,
      branding_primary_color: '#2563eb',
      branding_secondary_color: '#1e293b',
      branding_email_footer_text: null,
      branding_email_from_name: null,
    }
  })

  // Fetch organizations list
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('admin_organizations')
          .select('id, name')
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching organizations:', error)
          showError('Failed to load organizations')
          return
        }

        setOrganizations((data || []).map((org: any) => ({
          id: org.id,
          name: org.name,
        })))
      } catch (err) {
        console.error('Error:', err)
        showError('Failed to load organizations')
      }
    }

    fetchOrganizations()
  }, [])

  // Fetch settings when organization is selected
  const fetchSettings = useCallback(async (orgId: string) => {
    if (!orgId) {
      setSettings(null)
      reset({
        organization_name: '',
        logo_url: null,
        branding_primary_color: '#2563eb',
        branding_secondary_color: '#1e293b',
        branding_email_footer_text: null,
        branding_email_from_name: null,
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await getEmailBrandingSettings(orgId)
      
      if (error) {
        showError(error.message || 'Failed to load email settings')
        setSettings(null)
        return
      }

      if (data) {
        setSettings(data)
        reset({
          organization_name: data.organization_name,
          logo_url: data.logo_url,
          branding_primary_color: data.branding_primary_color || '#2563eb',
          branding_secondary_color: data.branding_secondary_color || '#1e293b',
          branding_email_footer_text: data.branding_email_footer_text || null,
          branding_email_from_name: data.branding_email_from_name || null,
        })
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      showError('Failed to load email settings')
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [reset])

  useEffect(() => {
    fetchSettings(selectedOrgId)
  }, [selectedOrgId, fetchSettings])

  const onSubmit = async (data: EmailBrandingSettings) => {
    if (!selectedOrgId) {
      showError('Please select an organization')
      return
    }

    setSaving(true)
    try {
      const { data: updated, error } = await updateEmailBrandingSettings(selectedOrgId, {
        organization_name: data.organization_name,
        logo_url: data.logo_url,
        branding_primary_color: data.branding_primary_color,
        branding_secondary_color: data.branding_secondary_color,
        branding_email_footer_text: data.branding_email_footer_text,
        branding_email_from_name: data.branding_email_from_name,
      })

      if (error) {
        showError(error.message || 'Failed to save email settings')
        return
      }

      if (updated) {
        setSettings(updated)
        reset(data, { keepValues: true })
        showSuccess('Email settings saved successfully')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      showError('Failed to save email settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pa-page">
      <PageHeader
        title="Email Settings"
        description="Configure email branding and settings for organizations. These values are used in email templates as Handlebars variables."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-4)' }}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="pa-form-group">
              <Select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                label="Select Organization"
                options={[
                  { value: '', label: '-- Select an organization --' },
                  ...organizations.map(org => ({ value: org.id, label: org.name }))
                ]}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {selectedOrgId && (
          <Card>
            <CardHeader>
              <CardTitle>Email Branding Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="pa-text-center pa-py-8">
                  <div className="pa-spinner" style={{ margin: '0 auto' }} />
                  <p className="pa-text-muted pa-mt-4">Loading settings...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="pa-form-grid pa-form-grid-2">
                    {/* Organization Name */}
                    <div className="pa-form-group">
                      <Controller
                        name="organization_name"
                        control={control}
                        rules={{ required: 'Organization name is required' }}
                        render={({ field, fieldState }) => (
                          <Input
                            {...field}
                            label="Organization Name"
                            required
                            error={fieldState.error?.message}
                            helper="Used as {{organization_name}} in email templates"
                          />
                        )}
                      />
                    </div>

                    {/* Logo URL */}
                    <div className="pa-form-group">
                      <Controller
                        name="logo_url"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Input
                            {...field}
                            value={field.value || ''}
                            label="Logo URL"
                            type="url"
                            error={fieldState.error?.message}
                            helper="Used as {{organization_logo_url}} in email templates. Leave empty to use organization name as text."
                          />
                        )}
                      />
                    </div>

                    {/* Primary Color */}
                    <div className="pa-form-group">
                      <Controller
                        name="branding_primary_color"
                        control={control}
                        render={({ field, fieldState }) => (
                          <div>
                            <label className="pa-label">
                              Primary Color <span className="pa-text-muted">(optional)</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="color"
                                value={field.value || '#2563eb'}
                                onChange={(e) => field.onChange(e.target.value)}
                                style={{
                                  width: '60px',
                                  height: '40px',
                                  border: '1px solid var(--pa-border)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              />
                              <Input
                                {...field}
                                value={field.value || ''}
                                placeholder="#2563eb"
                                error={fieldState.error?.message}
                                style={{ flex: 1 }}
                              />
                            </div>
                            <p className="pa-text-xs pa-text-muted pa-mt-1">
                              Used as {'{{organization_primary_color}}'} in email templates. Default: #2563eb
                            </p>
                          </div>
                        )}
                      />
                    </div>

                    {/* Secondary Color */}
                    <div className="pa-form-group">
                      <Controller
                        name="branding_secondary_color"
                        control={control}
                        render={({ field, fieldState }) => (
                          <div>
                            <label className="pa-label">
                              Secondary Color <span className="pa-text-muted">(optional)</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="color"
                                value={field.value || '#1e293b'}
                                onChange={(e) => field.onChange(e.target.value)}
                                style={{
                                  width: '60px',
                                  height: '40px',
                                  border: '1px solid var(--pa-border)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              />
                              <Input
                                {...field}
                                value={field.value || ''}
                                placeholder="#1e293b"
                                error={fieldState.error?.message}
                                style={{ flex: 1 }}
                              />
                            </div>
                            <p className="pa-text-xs pa-text-muted pa-mt-1">
                              Used as {'{{organization_secondary_color}}'} in email templates. Default: #1e293b
                            </p>
                          </div>
                        )}
                      />
                    </div>

                    {/* Email From Name */}
                    <div className="pa-form-group">
                      <Controller
                        name="branding_email_from_name"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Input
                            {...field}
                            value={field.value || ''}
                            label="Email From Name"
                            placeholder="Organization Name"
                            error={fieldState.error?.message}
                            helper="Used as {{email_from_name}} in email templates. If empty, uses organization name."
                          />
                        )}
                      />
                    </div>

                    {/* Email Footer Text */}
                    <div className="pa-form-group" style={{ gridColumn: '1 / -1' }}>
                      <Controller
                        name="branding_email_footer_text"
                        control={control}
                        render={({ field, fieldState }) => (
                          <div>
                            <label className="pa-label">
                              Email Footer Text <span className="pa-text-muted">(optional)</span>
                            </label>
                            <textarea
                              {...field}
                              value={field.value || ''}
                              rows={4}
                              className="pa-input"
                              placeholder={`© ${new Date().getFullYear()} ${settings?.organization_name || 'Organization'}. All rights reserved.`}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: fieldState.error ? '1px solid var(--pa-error)' : '1px solid var(--pa-border)',
                                borderRadius: '4px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                resize: 'vertical',
                              }}
                            />
                            {fieldState.error && (
                              <p className="pa-text-xs pa-text-error pa-mt-1">{fieldState.error.message}</p>
                            )}
                            <p className="pa-text-xs pa-text-muted pa-mt-1">
                              Used as {'{{email_footer_text}}'} in email templates. If empty, uses default copyright text.
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Handlebars Variables Reference */}
                  <div className="pa-mt-6 pa-pt-6" style={{ borderTop: '1px solid var(--pa-border)' }}>
                    <h3 className="pa-h4 pa-mb-3">Available Handlebars Variables</h3>
                    <div className="pa-text-sm pa-text-muted">
                      <p className="pa-mb-2">These variables can be used in email templates:</p>
                      <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '8px' }}>
                        <li><code>{'{{organization_name}}'}</code> - Organization name</li>
                        <li><code>{'{{organization_logo_url}}'}</code> - Logo URL (if set)</li>
                        <li><code>{'{{organization_primary_color}}'}</code> - Primary brand color</li>
                        <li><code>{'{{organization_secondary_color}}'}</code> - Secondary brand color</li>
                        <li><code>{'{{email_from_name}}'}</code> - Email sender name</li>
                        <li><code>{'{{email_footer_text}}'}</code> - Footer text</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pa-form-actions pa-mt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={saving}
                      disabled={!isDirty || saving}
                    >
                      Save Settings
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
