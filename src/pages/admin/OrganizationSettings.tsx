
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { startTransition } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { refreshOrganizationTheme } from '../../hooks/useOrganizationTheme'
import { validateSlugFormat, normalizeSlug, invalidateSlugCache } from '../../utils/orgResolution'
import PublicUrlBanner, { QUERY_KEY_ORG_SLUG } from '@/components/admin/PublicUrlBanner'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input,
  Select,
  Checkbox,
  ThemePicker,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge
} from '../../components/platformAdmin'
import { FileUpload } from '../../components/common/FileUpload'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'

import { 
  getOrganizationDetails, 
  updateOrganizationDetails,
  uploadOrganizationLogo,
  type OrganizationUpdateDTO 
} from '../../data/services/organizationService'

import {
  getOrganizationSettings,
  updateGeneralSettings,
  updateAttendanceSettings,
  updateRegistrationSettings,
  updateNotificationSettings,
  updateVisibilitySettings,
  updateAdvancedSettings,
  getOrganizationThemeSettings,
  updateOrganizationThemeSettings,
  type OrganizationThemeSettings,
} from '../../data/services/organizationSettingsService'

import {
  initiateStripeConnectOnboarding,
  getStripeConnectStatus,
  refreshStripeConnectStatus,
  createStripeRemediationLink,
} from '../../data/services/paymentSettingsService'

import type { StripeConnectStatus } from '../../types/stripeConnect.types'
import { supabase } from '../../lib/supabase'

import { type OrganizationSettings as OrgSettingsType } from '@/types/organizationSettings'
import ContactSection from './organizationSettings/ContactSection'
import StaffSection from './organizationSettings/StaffSection'

import type { Organization } from '../../types/domain/Organization'

export default function OrganizationSettings() {
  const { t } = useI18n()
  const { currentOrganization } = useOrganization()
  const { context, isReady } = useUserContext()
  const { summary: licenseSummary } = useLicense(currentOrganization?.id)
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Check if organization has access to payment features (pro or standard license, and license must be active)
  const hasPaymentAccess = useMemo(() => {
    if (!licenseSummary?.plan) return false
    // Pro and standard plans have access to Stripe Connect
    const hasCorrectPlan = licenseSummary.plan === 'pro' || licenseSummary.plan === 'standard'
    // License must also be active/valid
    const isActive = licenseSummary.isValid ?? false
    return hasCorrectPlan && isActive
  }, [licenseSummary?.plan, licenseSummary?.isValid])

  // Valid tab values for URL parameter
  const validTabs = useMemo(() => {
    const baseTabs = ['overview', 'contact', 'general', 'appearance', 'attendance', 'registration', 'notifications', 'permissions', 'staff', 'advanced']
    if (hasPaymentAccess) {
      baseTabs.push('payments')
    }
    return baseTabs
  }, [hasPaymentAccess])

  // Handle tab change - update URL
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab)
    // Update URL with new tab parameter
    if (newTab === 'overview') {
      // Remove tab param for default tab
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: newTab }, { replace: true })
    }
  }, [setSearchParams])

  // Initialize tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams, validTabs])
  
  // Check for onboarding redirect
  useEffect(() => {
    const onboarded = searchParams.get('onboarded')
    if (onboarded === 'true') {
      setActiveTab('payments')
      setSearchParams({ tab: 'payments' }, { replace: true })
      // Poll status with exponential backoff
      let attempts = 0
      const pollStatus = async () => {
        if (attempts < 3 && currentOrganization?.id) {
          await refreshStripeConnectStatus(currentOrganization.id)
          attempts++
          setTimeout(pollStatus, Math.pow(2, attempts) * 1000)
        }
      }
      pollStatus()
    }
  }, [searchParams, currentOrganization?.id, setSearchParams])

  // Data State
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null)
  const [settings, setSettings] = useState<OrgSettingsType | null>(null)
  const [themeSettings, setThemeSettings] = useState<OrganizationThemeSettings | null>(null)

  // Load Data
  const loadData = useCallback(async () => {
    if (!isReady || !currentOrganization?.id || !context) return

    setLoading(true)
    setError(null)

    try {
      const [detailsResult, settingsResult, themeResult] = await Promise.all([
        getOrganizationDetails(currentOrganization.id),
        getOrganizationSettings(context),
        getOrganizationThemeSettings(context)
      ])

      if (detailsResult.error) throw detailsResult.error
      if (settingsResult.error) throw settingsResult.error
      if (themeResult.error) throw themeResult.error

      setOrgDetails(detailsResult.data)
      setSettings(settingsResult.data)
      setThemeSettings(themeResult.data)
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to load organization settings')
    } finally {
      setLoading(false)
    }
  }, [isReady, currentOrganization?.id, context])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save Handlers
  const handleSaveOverview = async (data: OrganizationUpdateDTO, logoFile?: File) => {
    if (!currentOrganization?.id) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please reconnect and try again.')
      }

      let logoPath: string | undefined

      // Handle Logo Upload
      if (logoFile) {
        const { path, error: uploadError } = await uploadOrganizationLogo(currentOrganization.id, logoFile)
        if (uploadError) throw uploadError
        if (!path) throw new Error('Failed to upload logo')
        logoPath = path
      }

      const updates: OrganizationUpdateDTO = {
        ...data,
        ...(logoPath ? { logo_path: logoPath } : {}),
      }

      const { data: updatedOrg, error: updateError } = await updateOrganizationDetails(
        currentOrganization.id,
        updates
      )

      if (updateError) throw updateError
      
      setOrgDetails(updatedOrg)
      showSuccess('Organization profile updated successfully')
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Failed to update profile'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async (section: keyof OrgSettingsType, payload: any) => {
    if (!context || !settings) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please reconnect and try again.')
      }

      let result: { error: Error | null } = { error: null }

      switch (section) {
        case 'general':
          result = await updateGeneralSettings(context, payload, settings.general.updated_at)
          break
        case 'attendance':
          result = await updateAttendanceSettings(context, payload, settings.attendance.updated_at)
          break
        case 'registration':
          result = await updateRegistrationSettings(context, payload, settings.registration.updated_at)
          break
        case 'notifications':
          result = await updateNotificationSettings(context, payload, settings.notifications.updated_at)
          break
        case 'visibility':
          result = await updateVisibilitySettings(context, payload, settings.visibility.updated_at)
          break
        case 'advanced':
          result = await updateAdvancedSettings(context, payload, settings.advanced.updated_at)
          break
      }

      if (result.error) throw result.error

      showSuccess('Settings updated successfully')
      loadData() // Reload to get fresh timestamps
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Failed to update settings'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTheme = async (themeId: string | null) => {
    if (!context || !themeSettings) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Apply theme immediately for instant feedback
    refreshOrganizationTheme(themeId)

    try {
      const result = await updateOrganizationThemeSettings(
        context,
        themeId,
        themeSettings.updated_at
      )

      if (result.error) throw result.error

      setSuccess('Theme updated successfully')
      const refreshedTheme = await getOrganizationThemeSettings(context)
      if (refreshedTheme.error) throw refreshedTheme.error
      setThemeSettings(refreshedTheme.data)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to update theme')
      // Revert theme on error by re-fetching
      refreshOrganizationTheme(themeSettings.theme_id)
    } finally {
      setSaving(false)
    }
  }


  if (!isReady || loading) {
    return (
      <div className="pa-page">
        <div className="pa-page-loading">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader title="Organization Settings" />
      
      {error && (
        <div className="pa-alert pa-alert-error Pa-mb-4" style={{ background: 'var(--pa-danger-bg)', color: 'var(--pa-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
            
      {success && (
        <div className="pa-alert pa-alert-success Pa-mb-4" style={{ background: 'var(--pa-success-bg)', color: 'var(--pa-success)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="pa-tabs">
        <TabsList className="pa-mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          {/* Travel contacts merged into Contact tab */}
          <TabsTrigger value="general">Configuration</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="staff">{t('admin.organizationSettings.organizationStaff')}</TabsTrigger>
          {hasPaymentAccess && <TabsTrigger value="payments">Payments</TabsTrigger>}
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {orgDetails && <OverviewForm org={orgDetails} onSave={handleSaveOverview} loading={saving} />}

          {/* Public URL slug — set/update slug for established orgs */}
          {currentOrganization?.id && (
            <div className="mt-6">
              <PublicUrlSlugForm
                orgId={currentOrganization.id}
                initialSlug={orgDetails?.slug}
              />
            </div>
          )}

          {/* Public Links Card */}
          {currentOrganization?.id && (
            <div className="mt-6">
              <PublicUrlBanner
                orgId={currentOrganization.id}
                title="Where to direct users (public links)"
                description="Share these links with families and guests. Use the event detail page to share links to specific events."
                links={[
                  { label: 'Landing', path: '' },
                  { label: 'Tickets', path: 'tickets' },
                ]}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="contact">
            {currentOrganization?.id && <ContactSection orgId={currentOrganization.id} />}
        </TabsContent>

        {/* Travel contacts merged into Contact tab; section removed */}

        <TabsContent value="general">
          {settings && <GeneralConfigForm settings={settings.general} onSave={(d) => handleSaveSettings('general', d)} loading={saving} />}
        </TabsContent>

        <TabsContent value="appearance">
          {themeSettings && (
            <AppearanceForm
              settings={themeSettings}
              onSave={(d) => handleSaveTheme(d.theme_id ?? null)}
              loading={saving}
            />
          )}
        </TabsContent>

        <TabsContent value="attendance">
           {settings && <AttendanceForm settings={settings.attendance} onSave={(d) => handleSaveSettings('attendance', d)} loading={saving} />}
        </TabsContent>

        <TabsContent value="registration">
           {settings && <RegistrationForm settings={settings.registration} onSave={(d) => handleSaveSettings('registration', d)} loading={saving} />}
        </TabsContent>

        <TabsContent value="notifications">
           {settings && <NotificationsForm settings={settings.notifications} onSave={(d) => handleSaveSettings('notifications', d)} loading={saving} />}
        </TabsContent>

        <TabsContent value="permissions">
           {settings && <PermissionsForm settings={settings.visibility} onSave={(d) => handleSaveSettings('visibility', d)} loading={saving} />}
        </TabsContent>

        <TabsContent value="staff">
          {currentOrganization && <StaffSection organizationId={currentOrganization.id} />}
        </TabsContent>

        {hasPaymentAccess && (
          <TabsContent value="payments">
            {currentOrganization && <PaymentSettingsForm organizationId={currentOrganization.id} />}
          </TabsContent>
        )}

        <TabsContent value="advanced">
           {settings && <AdvancedForm settings={settings.advanced} onSave={(d) => handleSaveSettings('advanced', d)} loading={saving} />}
        </TabsContent>

      </Tabs>
    </div>
  )
}

// --- Sub-Forms ---

const SLUG_DEBOUNCE_MS = 500

function PublicUrlSlugForm({ orgId, initialSlug }: { orgId: string; initialSlug?: string | null }) {
  const queryClient = useQueryClient()
  const { data: currentSlug, isFetched } = useQuery({
    queryKey: [QUERY_KEY_ORG_SLUG, orgId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('organizations')
          .select('slug')
          .eq('id', orgId)
          .maybeSingle()
        if (error || !data?.slug) return null
        return data.slug
      },
    enabled: !!orgId,
    initialData: initialSlug !== undefined ? initialSlug : undefined,
  })

  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugTaken, setSlugTaken] = useState<boolean>(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const lastSyncedSlug = useRef<string | null | undefined>(undefined)
  const resolvedSlug = currentSlug ?? (initialSlug ?? null)
  const canSyncSlug = isFetched || initialSlug !== undefined

  // Sync input from server slug when it loads or changes; avoid overwriting user edits
  useEffect(() => {
    if (!canSyncSlug) return
    const serverSlug = resolvedSlug ?? ''
    if (lastSyncedSlug.current === serverSlug) return
    if (lastSyncedSlug.current !== undefined && input !== (lastSyncedSlug.current ?? '')) return
    lastSyncedSlug.current = serverSlug
    setInput(serverSlug)
  }, [canSyncSlug, resolvedSlug, input])

  // Debounced uniqueness check
  useEffect(() => {
    const normalized = normalizeSlug(input)
    if (!normalized || normalized.length < 3) {
      setSlugTaken(false)
      setSlugChecking(false)
      return
    }
    setSlugChecking(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', normalized)
        .maybeSingle()
      setSlugTaken(!!(data && data.id !== orgId))
      setSlugChecking(false)
    }, SLUG_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [input, orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSlugError(null)
    const normalizedSlug = normalizeSlug(input)
    const formatCheck = validateSlugFormat(normalizedSlug)
    if (!formatCheck.valid) {
      setSlugError(formatCheck.error ?? 'Invalid slug')
      return
    }
    if (slugTaken) {
      setSlugError('This URL slug is already taken.')
      return
    }
    setSaving(true)
    try {
      const { error } = await (supabase as any).rpc('update_org_slug', {
        p_org_id: orgId,
        p_new_slug: normalizedSlug,
      })
      if (error) {
        setSlugError(error.message)
        setSaving(false)
        return
      }
      const previousSlug = resolvedSlug ?? null
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ORG_SLUG, orgId] })
      await queryClient.refetchQueries({ queryKey: [QUERY_KEY_ORG_SLUG, orgId] })
      if (previousSlug) invalidateSlugCache(previousSlug)
      setInput(normalizedSlug)
      showSuccess('Public URL slug updated.')
    } catch (err) {
      setSlugError(getErrorMessage(err) ?? 'Failed to update slug')
      showError(getErrorMessage(err) ?? 'Failed to update slug')
    } finally {
      setSaving(false)
    }
  }

  const handleBlur = () => {
    const n = normalizeSlug(input)
    if (n !== input) setInput(n)
  }

  const isInvalidFormat = (() => {
    const n = normalizeSlug(input)
    if (!n) return false
    return !validateSlugFormat(n).valid
  })()

  const canSubmit = !saving && normalizeSlug(input).length >= 3 && !slugTaken && !isInvalidFormat

  return (
    <Card>
      <h3 className="pa-h3 pa-mb-2">Public URL slug</h3>
      <p className="pa-text-muted pa-mb-4">
        This slug is used in your public URLs (e.g. youthsports.team/o/{resolvedSlug || '{slug}'}/tickets). It must be unique and URL-friendly.
      </p>
      {resolvedSlug ? (
        <p className="pa-text-sm pa-mb-4">
          Current slug: <strong>{resolvedSlug}</strong>. Changing it will create a redirect from the old URL for 12 months.
        </p>
      ) : (
        <p className="pa-text-sm pa-mb-4">Not set. Set your public URL slug below.</p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="pa-form-group pa-mb-4">
          <Input
            label="Slug"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g. my-league"
            disabled={saving}
            aria-describedby={slugError ? 'slug-error' : undefined}
          />
          {slugError && (
            <p id="slug-error" className="pa-text-sm pa-text-danger pa-mt-1" role="alert">
              {slugError}
            </p>
          )}
          {slugTaken && (
            <p className="pa-text-sm pa-text-danger pa-mt-1">This URL slug is already taken.</p>
          )}
          {slugChecking && (
            <p className="pa-text-sm pa-text-muted pa-mt-1">Checking availability…</p>
          )}
          {isInvalidFormat && input.trim().length > 0 && !slugError && (
            <p className="pa-text-sm pa-text-danger pa-mt-1">
              {validateSlugFormat(normalizeSlug(input)).error}
            </p>
          )}
        </div>
        <div className="pa-form-actions">
          <Button type="submit" variant="primary" loading={saving} disabled={!canSubmit}>
            Save slug
          </Button>
        </div>
      </form>
    </Card>
  )
}

function OverviewForm({ org, onSave, loading }: { org: Organization, onSave: (data: OrganizationUpdateDTO, file?: File) => void, loading: boolean }) {
  const { control, handleSubmit, setValue, trigger } = useForm<OrganizationUpdateDTO>({
    defaultValues: {
      name: org.name,
      website: org.website || '',
      phone: org.phone || '',
      email: org.email || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip: org.zip || '',
      place_id: (org as any).place_id || '',
    }
  })
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined)
  const [logoError, setLogoError] = useState<string | null>(null)

  return (
    <Card>
      <form onSubmit={handleSubmit((data) => {
        if (logoError) return
        onSave(data, logoFile)
      })}>
        <div className="pa-form-grid pa-form-grid-2">
          {/* Left Column: Basic Info */}
          <div className="pa-flex pa-flex-col pa-gap-4">
            <h3 className="pa-h3 pa-mb-2">Basic Info</h3>
            <div className="pa-form-group">
              <Controller name="name" control={control} rules={{required: 'Name is required'}} render={({field}) => (
                 <Input {...field} label="Organization Name" required />
              )} />
            </div>
            
            <div className="pa-form-grid pa-form-grid-2">
              <Controller name="email" control={control} render={({field}) => (
                <Input {...field} value={field.value || ''} label="Contact Email" type="email" />
              )} />
              <Controller name="phone" control={control} render={({field}) => (
                <Input {...field} value={field.value || ''} label="Phone" type="tel" />
              )} />
            </div>
            
            <div className="pa-form-group">
               <Controller name="website" control={control} render={({field}) => (
                <Input {...field} value={field.value || ''} label="Website" type="url" />
              )} />
            </div>
          </div>
          
          {/* Right Column: Logo */}
          <div>
            <h3 className="pa-h3 pa-mb-2">Logo</h3>
            <FileUpload
              accept="image/png,image/jpeg"
              maxSize={2 * 1024 * 1024}
              helperText="Upload a PNG or JPG logo"
              value={logoFile || null}
              onFileSelect={(file) => {
                setLogoFile(file || undefined)
                setLogoError(null)
              }}
              disabled={loading}
              buttonText="Choose file"
              replaceText="Replace file"
              error={logoError}
            />
          </div>
        </div>
        
        <div className="pa-mt-6">
          <h3 className="pa-h3 pa-mb-4">Location</h3>
          <div className="pa-form-group pa-mb-4">
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <LocationAutocomplete
                  value={field.value || ''}
                  onInputChange={field.onChange}
                  onChange={(address) => {
                    startTransition(() => {
                      setValue('address', address.address_line1, { shouldValidate: false, shouldDirty: true })
                      setValue('city', address.city, { shouldValidate: false, shouldDirty: true })
                      setValue('state', address.state, { shouldValidate: false, shouldDirty: true })
                      setValue('zip', address.postal_code, { shouldValidate: false, shouldDirty: true })
                      setValue('place_id', address.place_id, { shouldValidate: false, shouldDirty: true })
                      trigger(['address', 'city', 'state', 'zip'])
                    })
                  }}
                  label="Address"
                  placeholder="Enter organization address"
                />
              )}
            />
          </div>
          <div className="pa-form-grid pa-form-grid-3">
             <Controller name="city" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label="City" />
            )} />
             <Controller name="state" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label="State" />
            )} />
             <Controller name="zip" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label="Zip Code" />
            )} />
          </div>
        </div>

        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Save Profile</Button>
        </div>
      </form>
    </Card>
  )
}

function GeneralConfigForm({ settings, onSave, loading }: { settings: OrgSettingsType['general'], onSave: (d: any) => void, loading: boolean }) {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      organization_name: settings.organization_name,
      timezone: settings.timezone,
      default_language: settings.default_language || 'en',
    }
  })

  useEffect(() => {
    reset({
      organization_name: settings.organization_name,
      timezone: settings.timezone,
      default_language: settings.default_language || 'en',
    })
  }, [reset, settings.organization_name, settings.timezone, settings.default_language])

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
  ]

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">System Defaults</h3>
        <div className="pa-form-grid pa-form-grid-2">
          <div className="pa-form-group">
            <Controller name="timezone" control={control} render={({field}) => (
               <Select {...field} label="Organization Timezone" options={timezones} />
            )} />
          </div>
           <div className="pa-form-group">
            <Controller name="default_language" control={control} render={({field}) => (
               <Select {...field} label="Default Language" options={[{value: 'en', label: 'English'}, {value: 'es', label: 'Spanish'}]} />
            )} />
          </div>
        </div>
        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Save Configuration</Button>
        </div>
      </form>
    </Card>
  )
}

function AppearanceForm({ settings, onSave, loading }: { settings: OrganizationThemeSettings, onSave: (d: { theme_id: string | null }) => void, loading: boolean }) {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(settings.theme_id || null)
  const [savedThemeId, setSavedThemeId] = useState<string | null>(settings.theme_id || null)

  // Sync selectedThemeId and savedThemeId when settings change (e.g., after reload or save)
  useEffect(() => {
    setSelectedThemeId(settings.theme_id || null)
    setSavedThemeId(settings.theme_id || null)
  }, [settings.theme_id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ theme_id: selectedThemeId })
  }

  const handleQuickSave = (themeId: string | null) => {
    setSelectedThemeId(themeId)
    onSave({ theme_id: themeId })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <h3 className="pa-h3 pa-mb-4">Appearance Settings</h3>
        <p className="pa-text-muted pa-mb-6">
          Customize your organization's visual theme and branding colors
        </p>

        <div className="pa-form-group pa-mb-6">
          <label className="pa-label pa-mb-3 block">Organization Theme</label>
          <p className="pa-text-muted pa-mb-4">
            Choose a theme that will be applied across your organization's interface.
            Themes include primary, secondary, and accent colors that work in both light and dark modes.
          </p>
          <ThemePicker
            selectedThemeId={selectedThemeId}
            savedThemeId={savedThemeId}
            onChange={setSelectedThemeId}
            onSave={handleQuickSave}
            disabled={loading}
            saving={loading}
          />
        </div>

        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Save Appearance Settings</Button>
        </div>
      </form>
    </Card>
  )
}

function AttendanceForm({ settings, onSave, loading }: { settings: OrgSettingsType['attendance'], onSave: (d: any) => void, loading: boolean }) {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">Attendance Rules</h3>
        <div className="pa-form-grid pa-form-grid-3 pa-mb-6">
          <Controller name="required_for_game" control={control} render={({field}) => (
            <Checkbox label="Required for Games" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="required_for_practice" control={control} render={({field}) => (
            <Checkbox label="Required for Practices" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="required_for_meeting" control={control} render={({field}) => (
            <Checkbox label="Required for Meetings" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

        <div className="pa-form-group pa-max-w-md pa-mb-6">
          <Controller name="submission_deadline_hours" control={control} render={({field}) => (
             <Input
               {...field}
               type="number"
               label="Submission Deadline (Hours before event)"
               onChange={e => {
                 const value = e.target.value
                 field.onChange(value === '' ? 0 : parseInt(value, 10))
               }}
             />
          )} />
        </div>

        <h3 className="pa-h3 pa-mb-4">Parent Controls</h3>
         <div className="pa-mb-6">
           <Controller name="parent_visibility.can_submit_attendance" control={control} render={({field}) => (
            <Checkbox label="Parents can set attendance status" checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Save Attendance Rules</Button>
        </div>
      </form>
    </Card>
  )
}


function RegistrationForm({ settings, onSave, loading }: { settings: OrgSettingsType['registration'], onSave: (d: any) => void, loading: boolean }) {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">Registration Policies</h3>
        <div className="pa-flex pa-flex-col pa-gap-4 pa-mb-6">
           <Controller name="allow_guardian_self_invite" control={control} render={({field}) => (
            <Checkbox label="Allow guardians to invite other guardians" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="allow_players_without_guardians" control={control} render={({field}) => (
            <Checkbox label="Allow players without guardians (e.g. Adult leagues)" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="medical_form_required" control={control} render={({field}) => (
            <Checkbox label="Require Medical Clearance form" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>
         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Save Policies</Button>
        </div>
      </form>
    </Card>
  )
}

function NotificationsForm({ settings, onSave, loading }: { settings: OrgSettingsType['notifications'], onSave: (d: any) => void, loading: boolean }) {
   const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">Automated Notifications</h3>
         <div className="pa-flex pa-flex-col pa-gap-4 pa-mb-6">
           <Controller name="attendance_reminders_enabled" control={control} render={({field}) => (
            <Checkbox label="Send Attendance Reminders to Coaches" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="schedule_change_alerts_enabled" control={control} render={({field}) => (
            <Checkbox label="Alert Parents on Schedule Changes" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>
        <div className="pa-form-group pa-max-w-md pa-mb-6">
          <Controller name="payment_reminder_behavior" control={control} render={({field}) => (
             <Select {...field} label="Payment Reminders" options={[{value: 'immediate', label: 'Send Immediately'}, {value: 'daily_digest', label: 'Daily Digest'}]} />
          )} />
        </div>
        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Save Notification Settings</Button>
        </div>
      </form>
    </Card>
  )
}

function PermissionsForm({ settings, onSave, loading }: { settings: OrgSettingsType['visibility'], onSave: (d: any) => void, loading: boolean }) {
    const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
       <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">Role Visibility</h3>
        <p className="pa-text-sm pa-text-muted pa-mb-4">Configure what different roles can see.</p>
        
        {/* Parent Permissions */}
        <h4 className="pa-h4 pa-mb-2">Parent Role</h4>
        <div className="pa-form-grid pa-form-grid-3 pa-mb-6">
           <Controller name="role_permissions.parent.can_view_roster" control={control} render={({field}) => (
            <Checkbox label="View Team Roster" checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
            <Controller name="role_permissions.parent.can_view_schedule" control={control} render={({field}) => (
            <Checkbox label="View Schedule" checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
             <Controller name="role_permissions.parent.can_view_payments" control={control} render={({field}) => (
            <Checkbox label="View Billing" checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

        {/* Coach Permissions */}
        <h4 className="pa-h4 pa-mb-2">Coach Role</h4>
        <div className="pa-form-grid pa-form-grid-2 pa-mb-6">
           <Controller name="role_permissions.coach.can_view_payments" control={control} render={({field}) => (
            <Checkbox label="View Financials" checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="role_permissions.coach.can_edit" control={control} render={({field}) => (
            <Checkbox label="Edit Events" checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">Update Permissions</Button>
        </div>
      </form>
    </Card>
  )
}

function PaymentSettingsForm({ organizationId }: { organizationId: string }) {
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [remediating, setRemediating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [allowPartialPayments, setAllowPartialPayments] = useState<boolean>(true)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [policySaving, setPolicySaving] = useState(false)

  const formatDateTime = useCallback((iso?: string | null) => {
    if (!iso) return ''
    try {
      const dt = new Date(iso)
      return dt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    } catch {
      return iso
    }
  }, [])

  const payoutsPaused = !!(connectStatus?.connected && connectStatus?.payoutsEnabled === false)
  const hasDueRequirements = (connectStatus?.requirementsDue?.length ?? 0) > 0
  const hasPendingReview = (connectStatus?.requirementsPending?.length ?? 0) > 0 || connectStatus?.disabledReason === 'requirements.pending_verification'
  const isActionablePause = payoutsPaused && (connectStatus?.disabledReason === 'requirements.past_due' || hasDueRequirements)

  const disabledCopy = useMemo(() => {
    const reason = connectStatus?.disabledReason
    if (!reason) return null
    switch (reason) {
      case 'requirements.past_due':
        return 'Action required: verification information is overdue.'
      case 'requirements.pending_verification':
        return 'Your payment processor is reviewing your submitted information. No action needed yet.'
      case 'under_review':
        return 'Your account is under review. This usually resolves within 1-2 business days.'
      default:
        if (reason.startsWith('rejected.')) return 'Payment processor restricted the account. Please contact support.'
        return `Payment processor reported: ${reason.replace(/_/g, ' ')}`
    }
  }, [connectStatus?.disabledReason])

  const loadPolicy = useCallback(async () => {
    if (!organizationId) return
    setPolicyLoading(true)
    const { data, error: policyError } = await supabase
      .from('org_payment_policies')
      .select('allow_partial_payments')
      .eq('org_id', organizationId)
      .maybeSingle()
    if (!policyError && data) {
      setAllowPartialPayments(data.allow_partial_payments ?? true)
    }
    setPolicyLoading(false)
  }, [organizationId])

  useEffect(() => {
    loadPolicy()
  }, [loadPolicy])

  const handleSavePartialPayments = async (checked: boolean) => {
    if (!organizationId) return
    setPolicySaving(true)
    setError(null)
    const { error: upsertError } = await supabase
      .from('org_payment_policies')
      .upsert(
        { org_id: organizationId, allow_partial_payments: checked },
        { onConflict: 'org_id' }
      )
    if (upsertError) {
      setError(upsertError.message)
    } else {
      setAllowPartialPayments(checked)
      showSuccess('Payment policy saved')
    }
    setPolicySaving(false)
  }

  const loadStatus = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    const { data, error: statusError } = await getStripeConnectStatus(organizationId)
    if (statusError) {
      setError(statusError.message)
    } else {
      setConnectStatus(data)
    }
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleConnect = async () => {
    if (!organizationId) return
    setOnboarding(true)
    setError(null)
    const { data, error: onboardError } = await initiateStripeConnectOnboarding(organizationId)
    if (onboardError) {
      setError(onboardError.message)
      setOnboarding(false)
    } else if (data?.account_link_url) {
      window.location.href = data.account_link_url
    }
  }

  const handleRefresh = async () => {
    if (!organizationId) return
    setRefreshing(true)
    setError(null)
    const { error: refreshError, data: refreshed } = await refreshStripeConnectStatus(organizationId)
    if (refreshError) {
      setError(refreshError.message)
    } else {
      if (refreshed) {
        setConnectStatus(refreshed)
      } else {
        await loadStatus()
      }
      showSuccess('Connect status refreshed')
    }
    setRefreshing(false)
  }

  const handleRemediationLink = async () => {
    if (!organizationId) return
    setRemediating(true)
    setError(null)
    const { url, error: linkError } = await createStripeRemediationLink(organizationId)
    if (linkError || !url) {
      setError(linkError?.message || 'Unable to generate remediation link')
      setRemediating(false)
      return
    }
    window.location.href = url
  }

  if (loading || policyLoading) {
    return (
      <Card>
        <div className="pa-text-center pa-p-8">Loading payment settings...</div>
      </Card>
    )
  }

  // Status determination
  const statusType = connectStatus?.connected 
    ? (payoutsPaused ? 'error' : connectStatus.payoutsEnabled ? 'success' : 'warning')
    : 'neutral'
  const statusText = connectStatus?.connected
    ? (payoutsPaused ? 'Payouts Paused' : connectStatus.payoutsEnabled ? 'Active & Receiving Payments' : 'Connected')
    : 'Not Connected'
  const statusIcon = connectStatus?.connected
    ? (payoutsPaused ? '⚠️' : connectStatus.payoutsEnabled ? '✓' : '○')
    : '○'

  return (
    <>
    {/* Payment Options Card */}
    <Card className="pa-mb-6">
      <h3 className="pa-h3 pa-mb-4">Payment Options</h3>
      
      <div className="pa-form-group">
        <Checkbox
          label="Allow Partial Payments"
          checked={allowPartialPayments}
          onChange={(e) => handleSavePartialPayments(e.target.checked)}
          disabled={policySaving}
        />
        <p className="pa-text-sm pa-text-muted pa-mt-2">
          When enabled, parents can make partial payments on fees that allow it. Each fee can individually control whether partial payments are allowed.
        </p>
      </div>
    </Card>

    {/* Payment Processing Status Card */}
    <Card className="pa-mb-6">
      {error && (
        <div className="pa-alert pa-alert-error pa-mb-6" style={{ 
          background: 'var(--pa-danger-bg)', 
          color: 'var(--pa-danger)', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Status Hero Section */}
      <div className="pa-flex pa-items-start pa-gap-6 pa-mb-6">
        {/* Large Status Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          background: statusType === 'success'
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
            : statusType === 'error'
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
            : statusType === 'warning'
            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)'
            : 'rgba(0, 0, 0, 0.03)',
          border: statusType === 'success'
            ? '2px solid rgba(34, 197, 94, 0.2)'
            : statusType === 'error'
            ? '2px solid rgba(239, 68, 68, 0.2)'
            : statusType === 'warning'
            ? '2px solid rgba(251, 191, 36, 0.2)'
            : '2px solid rgba(0, 0, 0, 0.1)',
          flexShrink: 0
        }}>
          {statusIcon}
        </div>

        {/* Status Info */}
        <div className="pa-flex-1">
          <div className="pa-flex pa-items-center pa-gap-3 pa-mb-2">
            <h3 className="pa-h3" style={{ margin: 0 }}>
              Payment Processing
            </h3>
            <Badge variant={statusType === 'success' ? 'success' : statusType === 'error' ? 'danger' : statusType === 'warning' ? 'warning' : 'neutral'}>
              {statusText}
            </Badge>
          </div>
          
          <p className="pa-text-muted pa-mb-3">
            {connectStatus?.connected 
              ? payoutsPaused
                ? 'Your payment account needs attention to resume receiving payouts.'
                : connectStatus.payoutsEnabled
                ? 'Your organization is connected and ready to receive payments from families.'
                : 'Your payment account is connected but payouts are not fully enabled.'
              : 'Connect your payment account to start accepting payments from families for fees, tickets, and registrations.'
            }
          </p>

          {connectStatus?.lastStatusUpdated && (
            <div className="pa-text-xs pa-text-muted">Last synced: {formatDateTime(connectStatus.lastStatusUpdated)}</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pa-flex pa-flex-col pa-gap-2" style={{ minWidth: '160px' }}>
          {!connectStatus?.connected ? (
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={onboarding}
              loading={onboarding}
              style={{ width: '100%' }}
            >
              Connect Account
            </Button>
          ) : (
            <>
              {(isActionablePause || hasDueRequirements) && (
                <Button
                  variant="primary"
                  onClick={handleRemediationLink}
                  disabled={remediating}
                  loading={remediating}
                  style={{ width: '100%' }}
                >
                  {isActionablePause ? 'Fix Issues' : 'Complete Requirements'}
                </Button>
              )}

              {connectStatus.onboardingStatus !== 'completed' && !isActionablePause && !hasDueRequirements && (
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={onboarding}
                  loading={onboarding}
                  style={{ width: '100%' }}
                >
                  Complete Setup
                </Button>
              )}

              <Button
                variant="ghost"
                size="dense"
                icon="refresh"
                onClick={handleRefresh}
                disabled={refreshing}
                style={{ width: '100%' }}
              >
                Refresh Status
              </Button>

              {connectStatus.dashboardUrl && (
                <Button
                  variant="ghost"
                  size="dense"
                  icon="open_in_new"
                  onClick={() => window.open(connectStatus.dashboardUrl!, '_blank')}
                  style={{ width: '100%' }}
                >
                  Payment Dashboard
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {connectStatus && payoutsPaused && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div className="pa-flex pa-items-start pa-gap-3">
            <span style={{ fontSize: '24px', lineHeight: 1 }}>🚨</span>
            <div className="pa-flex-1">
              <h4 className="pa-h4 pa-mb-2" style={{ color: 'var(--pa-danger, #ef4444)' }}>
                Action Required: Payouts Paused
              </h4>
              <p className="pa-text-sm pa-mb-3">
                {disabledCopy || 'Your payment processor has paused payouts for this account. Please resolve the issues below to resume receiving payments.'}
              </p>
              {connectStatus.requirementsDeadline && (
                <div className="pa-text-xs pa-text-muted pa-mb-3" style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  ⏰ Deadline: <strong>{formatDateTime(connectStatus.requirementsDeadline)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {connectStatus && !payoutsPaused && hasDueRequirements && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div className="pa-flex pa-items-start pa-gap-3">
            <span style={{ fontSize: '24px', lineHeight: 1 }}>⚡</span>
            <div className="pa-flex-1">
              <h4 className="pa-h4 pa-mb-2" style={{ color: 'var(--pa-warning, #fbbf24)' }}>
                Verification Needed
              </h4>
              <p className="pa-text-sm pa-mb-3">
                Complete the outstanding requirements below to avoid payout interruptions.
              </p>
              {connectStatus.requirementsDeadline && (
                <div className="pa-text-xs pa-text-muted" style={{ 
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  ⏰ Deadline: <strong>{formatDateTime(connectStatus.requirementsDeadline)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected: Key Info Grid */}
      {connectStatus?.connected && (
        <div className="pa-form-grid pa-form-grid-3 pa-mb-6" style={{ gap: '16px' }}>
          {/* Payout Status */}
          <div style={{
            background: 'var(--pa-bg, white)',
            border: '1px solid var(--pa-border, #e5e7eb)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div className="pa-caption pa-text-muted pa-mb-2">Payout Status</div>
            <div className="pa-flex pa-items-center pa-gap-2">
              <Badge variant={connectStatus.payoutsEnabled ? 'success' : 'danger'} style={{ fontSize: '14px' }}>
                {connectStatus.payoutsEnabled ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>

          {/* Onboarding Status */}
          <div style={{
            background: 'var(--pa-bg, white)',
            border: '1px solid var(--pa-border, #e5e7eb)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div className="pa-caption pa-text-muted pa-mb-2">Onboarding</div>
            <Badge
              variant={
                connectStatus.onboardingStatus === 'completed'
                  ? 'success'
                  : connectStatus.onboardingStatus === 'restricted'
                    ? 'danger'
                    : 'warning'
              }
              style={{ fontSize: '14px', textTransform: 'capitalize' }}
            >
              {connectStatus.onboardingStatus}
            </Badge>
          </div>

          {/* Account Status */}
          <div style={{
            background: 'var(--pa-bg, white)',
            border: '1px solid var(--pa-border, #e5e7eb)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div className="pa-caption pa-text-muted pa-mb-2">Account Health</div>
            <div className="pa-text-sm" style={{ fontWeight: 600 }}>
              {disabledCopy || (hasPendingReview ? 'Under Review' : 'All Clear')}
            </div>
          </div>
        </div>
      )}

      {/* Requirements Checklist */}
      {connectStatus?.connected && (connectStatus.requirementsDue?.length > 0 || connectStatus.requirementsErrors?.length > 0) && (
        <div style={{
          background: 'var(--pa-bg, white)',
          border: '1px solid var(--pa-border, #e5e7eb)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 className="pa-h4 pa-mb-4">📋 Outstanding Items</h4>
          
          {connectStatus.requirementsDue?.length > 0 && (
            <div className="pa-mb-4">
              <div className="pa-text-sm pa-font-semibold pa-mb-2">Requirements Due:</div>
              <div className="pa-flex pa-flex-col pa-gap-2">
                {connectStatus.requirementsDue.map((req) => {
                  // Convert technical requirement names to human-readable format
                  const humanReadable = req
                    .replace(/^person_/, 'Person: ')
                    .replace(/^company_/, 'Company: ')
                    .replace(/^business_/, 'Business: ')
                    .replace(/^individual_/, 'Individual: ')
                    .replace(/_/g, ' ')
                    .replace(/\./g, ' - ')
                    .replace(/\bid\b/gi, 'ID')
                    .replace(/\bssn\b/gi, 'SSN')
                    .replace(/\bein\b/gi, 'EIN')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ')
                  
                  return (
                    <div key={req} className="pa-flex pa-items-center pa-gap-2 pa-text-sm" style={{
                      padding: '8px 12px',
                      background: 'rgba(251, 191, 36, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}>
                      <span>⚠️</span>
                      <span>{humanReadable}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {connectStatus.requirementsErrors?.length > 0 && (
            <div>
              <div className="pa-text-sm pa-font-semibold pa-mb-2">Issues Reported:</div>
              <div className="pa-flex pa-flex-col pa-gap-2">
                {connectStatus.requirementsErrors.map((err, idx) => {
                  // Convert technical field names to human-readable format
                  const humanReadableField = err.requirement
                    ?.replace(/^person_/, 'Person: ')
                    ?.replace(/^company_/, 'Company: ')
                    ?.replace(/^business_/, 'Business: ')
                    ?.replace(/^individual_/, 'Individual: ')
                    ?.replace(/_/g, ' ')
                    ?.replace(/\./g, ' - ')
                    ?.replace(/\bid\b/gi, 'ID')
                    ?.replace(/\bssn\b/gi, 'SSN')
                    ?.replace(/\bein\b/gi, 'EIN')
                    ?.split(' ')
                    ?.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    ?.join(' ')
                  
                  return (
                    <div key={`${err.code}-${idx}`} className="pa-flex pa-items-start pa-gap-2 pa-text-sm" style={{
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                      <span style={{ marginTop: '2px' }}>❌</span>
                      <div>
                        <div>{err.reason || err.code || 'Issue detected'}</div>
                        {humanReadableField && (
                          <div className="pa-text-xs pa-text-muted pa-mt-1">Field: {humanReadableField}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Review Notice */}
      {connectStatus?.connected && hasPendingReview && !payoutsPaused && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div className="pa-flex pa-items-start pa-gap-2 pa-text-sm">
            <span style={{ fontSize: '18px' }}>ℹ️</span>
            <div>
              <strong>Under Review:</strong> Stripe is reviewing your recently submitted documents. 
              You'll receive an email when the review is complete. No action needed at this time.
            </div>
          </div>
        </div>
      )}

      {/* Advanced Details (Collapsible) */}
      {connectStatus?.connected && (
        <div style={{
          borderTop: '1px solid var(--pa-border, #e5e7eb)',
          paddingTop: '20px',
          marginTop: '24px'
        }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="pa-flex pa-items-center pa-gap-2 pa-text-sm pa-text-muted"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
            Advanced Details
          </button>

          {showAdvanced && (
            <div className="pa-mt-4 pa-flex pa-flex-col pa-gap-3">
              {connectStatus.payoutDescriptor && (
                <div>
                  <div className="pa-caption pa-text-muted">Payout Descriptor</div>
                  <div className="pa-text-sm" style={{ 
                    fontFamily: 'monospace',
                    background: 'rgba(0, 0, 0, 0.03)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '4px'
                  }}>
                    {connectStatus.payoutDescriptor}
                  </div>
                </div>
              )}
              
              {connectStatus.requirementsPending && connectStatus.requirementsPending.length > 0 && (
                <div>
                  <div className="pa-caption pa-text-muted">Pending Verification</div>
                  <div className="pa-text-sm pa-text-muted pa-mt-1">
                    {connectStatus.requirementsPending.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
    </>
  )
}

function AdvancedForm({ settings, onSave, loading }: { settings: OrgSettingsType['advanced'], onSave: (d: any) => void, loading: boolean }) {
   const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">Advanced Configuration</h3>
        <div className="pa-alert pa-alert-warning pa-mb-4">
           Caution: These settings affect data integrity.
        </div>
        
        <div className="pa-form-group pa-mb-4">
           <Controller name="allow_data_export" control={control} render={({field}) => (
            <Checkbox label="Allow Data Export (CSV/Excel) for Admins" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-group pa-mb-6">
           <Controller name="enable_api_access" control={control} render={({field}) => (
            <Checkbox label="Enable API Access (Requires Enterprise License)" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="danger" style={{background: 'var(--pa-secondary-bg)', color: 'var(--pa-text)'}}>Save Advanced Settings</Button>
        </div>
      </form>
    </Card>
  )
}
