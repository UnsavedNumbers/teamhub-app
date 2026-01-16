import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { LicenseStatusBadge } from '../../components/admin/LicenseStatusBadge'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Toast 
} from '../../components/platformAdmin'

interface OrganizationFormData {
  name: string
  slug: string
  contact_email: string
  refund_policy: string
}

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { currentOrganization } = useOrganization()
  const { summary: licenseSummary, loading: licenseLoading } = useLicense(currentOrganization?.id, { requireOrganization: !!currentOrganization })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: '',
      slug: '',
      contact_email: '',
      refund_policy: '',
    },
  })

  const organizationId = currentOrganization?.id ?? null

  const fetchOrganization = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, slug, contact_email, refund_policy')
        .eq('id', organizationId)
        .single()

      if (error) throw error

      if (data) {
        reset({
          name: data.name || '',
          slug: data.slug || '',
          contact_email: data.contact_email || '',
          refund_policy: data.refund_policy || '',
        })
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to load organization')
    } finally {
      setLoading(false)
    }
  }, [organizationId, reset])

  useEffect(() => {
    void fetchOrganization()
  }, [fetchOrganization])

  const onSubmit = async (data: OrganizationFormData) => {
    if (!organizationId) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name,
          slug: data.slug,
          contact_email: data.contact_email,
          refund_policy: data.refund_policy,
        })
        .eq('id', organizationId)

      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pa-flex pa-flex-col pa-gap-4">
        <div className="pa-skeleton" style={{ height: '40px', width: '300px' }} />
        <div className="pa-skeleton" style={{ height: '100px' }} />
        <div className="pa-skeleton" style={{ height: '400px' }} />
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader title="Organization Settings" />

      {/* Subscription Summary Card */}
      <Card className="pa-mb-5">
        <div className="pa-flex pa-items-center pa-justify-between pa-flex-wrap pa-gap-4">
          <div>
            <div className="pa-text-overline pa-mb-1">{t('billing.pageTitle')}</div>
            <h3 className="pa-h3 pa-mb-1">
              {licenseSummary?.plan === 'starter'
                ? t('license.planStarter')
                : licenseSummary?.plan === 'standard'
                  ? t('license.planStandard')
                  : licenseSummary?.plan === 'pro'
                    ? t('license.planPro')
                    : t('license.planLabel').toUpperCase()}
            </h3>
            <div className="pa-body-s pa-text-muted">
              {t('billing.renewalDate')}: {formatDate(licenseSummary?.currentPeriodEnd)}
            </div>
          </div>
          <div className="pa-flex pa-items-center pa-gap-3">
            <LicenseStatusBadge status={licenseSummary?.status || 'unknown'} />
            <Button
              variant="secondary"
              onClick={() => window.location.assign('/admin/organization/billing')}
              disabled={licenseLoading}
            >
              {t('billing.manageBilling')}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-danger-bg)', border: 'none', color: 'var(--pa-n900)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-success-bg)', border: 'none', color: 'var(--pa-n900)' }}>
              Organization settings updated successfully!
            </div>
          )}

          <div className="pa-grid pa-grid-2 pa-mb-4">
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Organization name is required' }}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Organization Name"
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            <Controller
              name="slug"
              control={control}
              rules={{
                required: 'Slug is required',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Slug must contain only lowercase letters, numbers, and hyphens',
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Slug"
                  required
                  error={!!errors.slug}
                  helperText={errors.slug?.message || 'Used in URLs (e.g., your-org-name)'}
                />
              )}
            />
          </div>

          <div className="pa-mb-4">
            <Controller
              name="contact_email"
              control={control}
              rules={{
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Contact Email"
                  type="email"
                  error={!!errors.contact_email}
                  helperText={errors.contact_email?.message}
                />
              )}
            />
          </div>

          <div className="pa-mb-6">
            <Controller
              name="refund_policy"
              control={control}
              render={({ field }) => (
                <textarea
                  className="pa-input pa-textarea"
                  {...field}
                  placeholder="Enter your organization's refund policy..."
                  style={{ minHeight: '120px' }}
                />
              )}
            />
            <div className="pa-label pa-mt-1">Refund Policy</div>
          </div>

          <div className="pa-flex pa-justify-end">
            <Button type="submit" disabled={saving} loading={saving}>
              Save Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
