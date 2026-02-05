import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { startTransition } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { useI18n } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { refreshOrganizationTheme } from '../../hooks/useOrganizationTheme'
import { validateSlugFormat, normalizeSlug, invalidateSlugCache, type SlugValidationErrorCode } from '../../utils/orgResolution'
import PublicUrlBanner, { QUERY_KEY_ORG_SLUG } from '@/components/admin/PublicUrlBanner'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { FanVisibilityToggle } from '../../components/admin/FanVisibilityToggle'
import {
  Button,
  Input,
  Select,
  Checkbox,
  ThemePicker,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from '../../components/platformAdmin'
import { FileUpload } from '../../components/common/FileUpload'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'

import { 
  getOrganizationDetails, 
  updateOrganizationDetails,
  uploadOrganizationLogo,
  getOrganizationSlug,
  checkOrganizationSlugAvailability,
  updateOrganizationSlug,
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
  getOrganizationPaymentPolicy,
  updateOrganizationPaymentPolicy,
} from '../../data/services/paymentSettingsService'

import type { StripeConnectStatus } from '../../types/stripeConnect.types'

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

      console.log('loadData: received org details', {
        'profile_visible_to_fans': detailsResult.data?.profile_visible_to_fans,
        'name': detailsResult.data?.name,
        'updated_at': detailsResult.data?.updated_at,
      })
      setOrgDetails(detailsResult.data)
      setSettings(settingsResult.data)
      setThemeSettings(themeResult.data)
    } catch (err) {
      setError(getErrorMessage(err) || t('admin.organizationSettings.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [isReady, currentOrganization?.id, context, t])

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
        throw new Error(t('common.error.offline'))
      }

      let logoPath: string | undefined

      // Handle Logo Upload
      if (logoFile) {
        const { path, error: uploadError } = await uploadOrganizationLogo(currentOrganization.id, logoFile)
        if (uploadError) throw uploadError
        if (!path) throw new Error(t('admin.organizationSettings.messages.logoUploadFailed'))
        logoPath = path
      }

      const updates: OrganizationUpdateDTO = {
        ...data,
        ...(logoPath ? { logo_url: logoPath } : {}),
      }

      const { data: updatedOrg, error: updateError } = await updateOrganizationDetails(
        currentOrganization.id,
        updates
      )

      if (updateError) throw updateError

      setOrgDetails(updatedOrg)

      // Immediately reload data to ensure we have the freshest state from server
      // This helps prevent stale data issues where the response doesn't reflect all changes
      loadData().catch(err => {
        console.error('Failed to reload organization details after save:', err)
      })

      showSuccess(t('admin.organizationSettings.messages.profileUpdated'))
    } catch (err) {
      const errorMessage = getErrorMessage(err) || t('admin.organizationSettings.messages.profileUpdateFailed')
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
        throw new Error(t('common.error.offline'))
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

      showSuccess(t('admin.organizationSettings.messages.settingsUpdated'))
      loadData() // Reload to get fresh timestamps
    } catch (err) {
      const errorMessage = getErrorMessage(err) || t('admin.organizationSettings.messages.settingsUpdateFailed')
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

      setSuccess(t('admin.organizationSettings.messages.themeUpdated'))
      const refreshedTheme = await getOrganizationThemeSettings(context)
      if (refreshedTheme.error) throw refreshedTheme.error
      setThemeSettings(refreshedTheme.data)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(getErrorMessage(err) || t('admin.organizationSettings.messages.themeUpdateFailed'))
      // Revert theme on error by re-fetching
      refreshOrganizationTheme(themeSettings.theme_id)
    } finally {
      setSaving(false)
    }
  }


  if (!isReady || loading) {
    return (
      <div className="pa-page">
        <div className="pa-page-loading">{t('admin.organizationSettings.loading')}</div>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader title={t('admin.organizationSettings.title')} />
      
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
          <TabsTrigger value="overview">{t('admin.organizationSettings.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="contact">{t('admin.organizationSettings.tabs.contact')}</TabsTrigger>
          {/* Travel contacts merged into Contact tab */}
          <TabsTrigger value="general">{t('admin.organizationSettings.tabs.general')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('admin.organizationSettings.tabs.appearance')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('admin.organizationSettings.tabs.attendance')}</TabsTrigger>
          <TabsTrigger value="registration">{t('admin.organizationSettings.tabs.registration')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('admin.organizationSettings.tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('admin.organizationSettings.tabs.permissions')}</TabsTrigger>
          <TabsTrigger value="staff">{t('admin.organizationSettings.tabs.staff')}</TabsTrigger>
          {hasPaymentAccess && <TabsTrigger value="payments">{t('admin.organizationSettings.tabs.payments')}</TabsTrigger>}
          <TabsTrigger value="advanced">{t('admin.organizationSettings.tabs.advanced')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {orgDetails && <OverviewForm key={orgDetails.id + '-' + (orgDetails.updated_at || 'initial')} org={orgDetails} onSave={handleSaveOverview} loading={saving} />}

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
                title={t('admin.organizationSettings.publicLinks.title')}
                description={t('admin.organizationSettings.publicLinks.description')}
                links={[
                  { label: t('admin.organizationSettings.publicLinks.links.landing'), path: '' },
                  { label: t('admin.organizationSettings.publicLinks.links.tickets'), path: 'tickets' },
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
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data: currentSlug, isFetched, error: slugLoadError } = useQuery({
    queryKey: [QUERY_KEY_ORG_SLUG, orgId],
    queryFn: async () => {
      const { data, error } = await getOrganizationSlug(orgId)
      if (error) throw error
      return data
    },
    enabled: !!orgId,
    initialData: initialSlug !== undefined ? initialSlug : undefined,
  })

  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugTaken, setSlugTaken] = useState<boolean>(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugCheckError, setSlugCheckError] = useState<string | null>(null)
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

  const getValidationMessage = (code?: SlugValidationErrorCode) => {
    if (!code) return null
    switch (code) {
      case 'too_short':
        return t('admin.organizationSettings.publicSlug.validation.tooShort')
      case 'too_long':
        return t('admin.organizationSettings.publicSlug.validation.tooLong')
      case 'invalid_format':
        return t('admin.organizationSettings.publicSlug.validation.invalidFormat')
      case 'reserved':
        return t('admin.organizationSettings.publicSlug.validation.reserved')
      default:
        return t('admin.organizationSettings.publicSlug.validation.invalid')
    }
  }

  // Debounced uniqueness check
  useEffect(() => {
    const normalized = normalizeSlug(input)
    if (!normalized || normalized.length < 3) {
      setSlugTaken(false)
      setSlugChecking(false)
      setSlugCheckError(null)
      return
    }
    if (resolvedSlug && normalized === resolvedSlug) {
      setSlugTaken(false)
      setSlugChecking(false)
      setSlugCheckError(null)
      return
    }
    if (!navigator.onLine) {
      setSlugTaken(false)
      setSlugChecking(false)
      setSlugCheckError(t('common.error.offline'))
      return
    }
    setSlugChecking(true)
    const timer = setTimeout(async () => {
      const { available, error } = await checkOrganizationSlugAvailability(normalized, orgId)
      if (error) {
        setSlugTaken(false)
        setSlugCheckError(getErrorMessage(error) || t('admin.organizationSettings.publicSlug.checkFailed'))
      } else {
        setSlugTaken(!available)
        setSlugCheckError(null)
      }
      setSlugChecking(false)
    }, SLUG_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, orgId, resolvedSlug, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSlugError(null)
    const normalizedSlug = normalizeSlug(input)
    const formatCheck = validateSlugFormat(normalizedSlug)
    if (!formatCheck.valid) {
      setSlugError(getValidationMessage(formatCheck.code) ?? t('admin.organizationSettings.publicSlug.validation.invalid'))
      return
    }
    if (slugTaken) {
      setSlugError(t('admin.organizationSettings.publicSlug.taken'))
      return
    }
    if (slugCheckError) {
      setSlugError(slugCheckError)
      return
    }
    if (!navigator.onLine) {
      setSlugError(t('common.error.offline'))
      return
    }
    setSaving(true)
    try {
      const { error } = await updateOrganizationSlug(orgId, normalizedSlug)
      if (error) throw error
      const previousSlug = resolvedSlug ?? null
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ORG_SLUG, orgId] })
      await queryClient.refetchQueries({ queryKey: [QUERY_KEY_ORG_SLUG, orgId] })
      if (previousSlug) invalidateSlugCache(previousSlug)
      setInput(normalizedSlug)
      showSuccess(t('admin.organizationSettings.publicSlug.updateSuccess'))
    } catch (err) {
      const message = getErrorMessage(err) ?? t('admin.organizationSettings.publicSlug.updateFailed')
      setSlugError(message)
      showError(message)
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

  const isUnchanged = normalizeSlug(input) === (resolvedSlug ?? '')
  const canSubmit = !saving && !slugChecking && normalizeSlug(input).length >= 3 && !slugTaken && !isInvalidFormat && !slugCheckError && !isUnchanged

  return (
    <Card>
      <h3 className="pa-h3 pa-mb-2">{t('admin.organizationSettings.publicSlug.title')}</h3>
      <p className="pa-text-muted pa-mb-4">
        {t('admin.organizationSettings.publicSlug.description', { slug: resolvedSlug || '{slug}' })}
      </p>
      {slugLoadError && (
        <p className="pa-text-sm pa-text-danger pa-mb-4" role="alert">
          {getErrorMessage(slugLoadError) || t('admin.organizationSettings.publicSlug.loadFailed')}
        </p>
      )}
      {resolvedSlug ? (
        <p className="pa-text-sm pa-mb-4">
          {t('admin.organizationSettings.publicSlug.currentSlug', { slug: resolvedSlug })}
        </p>
      ) : (
        <p className="pa-text-sm pa-mb-4">{t('admin.organizationSettings.publicSlug.noneSet')}</p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="pa-form-group pa-mb-4">
          <Input
            label={t('admin.organizationSettings.publicSlug.label')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={handleBlur}
            placeholder={t('admin.organizationSettings.publicSlug.placeholder')}
            disabled={saving}
            aria-describedby={slugError ? 'slug-error' : undefined}
          />
          {slugError && (
            <p id="slug-error" className="pa-text-sm pa-text-danger pa-mt-1" role="alert">
              {slugError}
            </p>
          )}
          {slugTaken && (
            <p className="pa-text-sm pa-text-danger pa-mt-1">{t('admin.organizationSettings.publicSlug.taken')}</p>
          )}
          {slugCheckError && !slugError && (
            <p className="pa-text-sm pa-text-danger pa-mt-1" role="alert">
              {slugCheckError}
            </p>
          )}
          {slugChecking && (
            <p className="pa-text-sm pa-text-muted pa-mt-1">{t('admin.organizationSettings.publicSlug.checking')}</p>
          )}
          {isInvalidFormat && input.trim().length > 0 && !slugError && (
            <p className="pa-text-sm pa-text-danger pa-mt-1">
              {getValidationMessage(validateSlugFormat(normalizeSlug(input)).code) ?? t('admin.organizationSettings.publicSlug.validation.invalid')}
            </p>
          )}
        </div>
        <div className="pa-form-actions">
          <Button type="submit" variant="primary" loading={saving} disabled={!canSubmit}>
            {t('admin.organizationSettings.publicSlug.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function OverviewForm({ org, onSave, loading }: { org: Organization, onSave: (data: OrganizationUpdateDTO, file?: File) => void, loading: boolean }) {
  const { t } = useI18n()
  const { control, handleSubmit, setValue, trigger, reset } = useForm<OrganizationUpdateDTO>({
    defaultValues: {
      name: org.name,
      website: org.website || '',
      phone: org.phone || '',
      email: org.email || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip: org.zip || '',
      place_id: org.place_id || '',
      latitude: org.latitude || null,
      longitude: org.longitude || null,
    }
  })
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [profileVisibleToFans, setProfileVisibleToFans] = useState(org.profile_visible_to_fans || false)

  // Sync form state when org prop changes (e.g., after save/reload)
  useEffect(() => {
    console.log('OverviewForm: org prop changed', {
      'org.profile_visible_to_fans': org.profile_visible_to_fans,
      'org.name': org.name,
      'org.id': org.id,
    })
    reset({
      name: org.name,
      website: org.website || '',
      phone: org.phone || '',
      email: org.email || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip: org.zip || '',
      place_id: org.place_id || '',
      latitude: org.latitude || null,
      longitude: org.longitude || null,
    })
    setProfileVisibleToFans(org.profile_visible_to_fans || false)
    console.log('OverviewForm: set profileVisibleToFans to', org.profile_visible_to_fans || false)
  }, [org, reset])

  return (
    <Card>
      <form onSubmit={handleSubmit((data) => {
        if (logoError) return
        const dataWithVisibility = { ...data, profile_visible_to_fans: profileVisibleToFans } as any
        onSave(dataWithVisibility, logoFile)
      })}>
        <div className="pa-form-grid pa-form-grid-2">
          {/* Left Column: Basic Info */}
          <div className="pa-flex pa-flex-col pa-gap-4">
            <h3 className="pa-h3 pa-mb-2">{t('admin.organizationSettings.overview.basicInfo')}</h3>
            <div className="pa-form-group">
              <Controller name="name" control={control} rules={{required: t('formFields.required')}} render={({field}) => (
                 <Input {...field} label={t('admin.organizationSettings.overview.orgName')} required />
              )} />
            </div>
            
            <div className="pa-form-grid pa-form-grid-2">
              <Controller name="email" control={control} render={({field}) => (
                <Input {...field} value={field.value || ''} label={t('admin.organizationSettings.overview.contactEmail')} type="email" />
              )} />
              <Controller name="phone" control={control} render={({field}) => (
                <Input {...field} value={field.value || ''} label={t('admin.organizationSettings.overview.phone')} type="tel" />
              )} />
            </div>
            
            <div className="pa-form-group">
               <Controller name="website" control={control} render={({field}) => (
                <Input {...field} value={field.value || ''} label={t('admin.organizationSettings.overview.website')} type="url" />
              )} />
            </div>
          </div>
          
          {/* Right Column: Logo */}
          <div>
            <h3 className="pa-h3 pa-mb-2">{t('admin.organizationSettings.overview.logo')}</h3>
            {/* Show existing logo if available */}
            {org.logo_url && !logoFile && (
              <div className="pa-mb-3">
                <img 
                  src={org.logo_url} 
                  alt={org.name} 
                  style={{ 
                    maxWidth: '120px', 
                    maxHeight: '120px', 
                    borderRadius: '8px',
                    border: '1px solid var(--pa-n200)',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            )}
            <FileUpload
              accept="image/png,image/jpeg"
              maxSize={2 * 1024 * 1024}
              helperText={t('admin.organizationSettings.overview.logoHelp')}
              value={logoFile || null}
              onFileSelect={(file) => {
                setLogoFile(file || undefined)
                setLogoError(null)
              }}
              disabled={loading}
              buttonText={org.logo_url ? t('admin.organizationSettings.overview.logoReplace') : t('admin.organizationSettings.overview.logoChoose')}
              replaceText={t('admin.organizationSettings.overview.logoReplace')}
              error={logoError}
            />
          </div>
        </div>
        
        <div className="pa-mt-6">
          <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.overview.location')}</h3>
          <div className="pa-form-group pa-mb-4">
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <LocationAutocomplete
                  value={field.value || ''}
                  onInputChange={field.onChange}
                  onChange={(address, placeResult) => {
                    startTransition(() => {
                      setValue('address', address.address_line1, { shouldValidate: false, shouldDirty: true })
                      setValue('city', address.city, { shouldValidate: false, shouldDirty: true })
                      setValue('state', address.state, { shouldValidate: false, shouldDirty: true })
                      setValue('zip', address.postal_code, { shouldValidate: false, shouldDirty: true })
                      setValue('place_id', address.place_id, { shouldValidate: false, shouldDirty: true })
                      if (placeResult?.geometry?.location) {
                        setValue('latitude', placeResult.geometry.location.lat(), { shouldValidate: false, shouldDirty: true })
                        setValue('longitude', placeResult.geometry.location.lng(), { shouldValidate: false, shouldDirty: true })
                      }
                      trigger(['address', 'city', 'state', 'zip'])
                    })
                  }}
                  label={t('admin.organizationSettings.overview.address')}
                  placeholder={t('admin.organizationSettings.overview.addressPlaceholder')}
                />
              )}
            />
          </div>
          <div className="pa-form-grid pa-form-grid-3">
             <Controller name="city" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label={t('admin.organizationSettings.overview.city')} />
            )} />
             <Controller name="state" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label={t('admin.organizationSettings.overview.state')} />
            )} />
             <Controller name="zip" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label={t('admin.organizationSettings.overview.zip')} />
            )} />
          </div>
        </div>

        {/* Public Visibility Section */}
        <div className="pa-mt-6 pa-pt-6 pa-border-t">
          <h3 className="pa-h3 pa-mb-4">Public Visibility</h3>
          <FanVisibilityToggle
            checked={profileVisibleToFans}
            onChange={setProfileVisibleToFans}
            entityType="organization"
            disabled={loading}
          />
        </div>

        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.overview.save')}</Button>
        </div>
      </form>
    </Card>
  )
}

function GeneralConfigForm({ settings, onSave, loading }: { settings: OrgSettingsType['general'], onSave: (d: any) => void, loading: boolean }) {
  const { t } = useI18n()
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
    { value: 'America/New_York', label: t('admin.organizationSettings.general.timezones.eastern') },
    { value: 'America/Chicago', label: t('admin.organizationSettings.general.timezones.central') },
    { value: 'America/Denver', label: t('admin.organizationSettings.general.timezones.mountain') },
    { value: 'America/Los_Angeles', label: t('admin.organizationSettings.general.timezones.pacific') },
  ]

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.general.title')}</h3>
        <div className="pa-form-grid pa-form-grid-2">
          <div className="pa-form-group">
            <Controller name="timezone" control={control} render={({field}) => (
               <Select {...field} label={t('admin.organizationSettings.general.timezoneLabel')} options={timezones} />
            )} />
          </div>
           <div className="pa-form-group">
            <Controller name="default_language" control={control} render={({field}) => (
               <Select
                 {...field}
                 label={t('admin.organizationSettings.general.languageLabel')}
                 options={[
                   { value: 'en', label: t('admin.organizationSettings.general.languages.english') },
                   { value: 'es', label: t('admin.organizationSettings.general.languages.spanish') }
                 ]}
               />
            )} />
          </div>
        </div>
        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.general.save')}</Button>
        </div>
      </form>
    </Card>
  )
}

function AppearanceForm({ settings, onSave, loading }: { settings: OrganizationThemeSettings, onSave: (d: { theme_id: string | null }) => void, loading: boolean }) {
  const { t } = useI18n()
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
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.appearance.title')}</h3>
        <p className="pa-text-muted pa-mb-6">
          {t('admin.organizationSettings.appearance.description')}
        </p>

        <div className="pa-form-group pa-mb-6">
          <label className="pa-label pa-mb-3 block">{t('admin.organizationSettings.appearance.themeLabel')}</label>
          <p className="pa-text-muted pa-mb-4">
            {t('admin.organizationSettings.appearance.themeHelp')}
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
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.appearance.save')}</Button>
        </div>
      </form>
    </Card>
  )
}

function AttendanceForm({ settings, onSave, loading }: { settings: OrgSettingsType['attendance'], onSave: (d: any) => void, loading: boolean }) {
  const { t } = useI18n()
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.attendance.title')}</h3>
        <div className="pa-form-grid pa-form-grid-3 pa-mb-6">
          <Controller name="required_for_game" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.attendance.requiredForGames')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="required_for_practice" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.attendance.requiredForPractices')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="required_for_meeting" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.attendance.requiredForMeetings')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

        <div className="pa-form-group pa-max-w-md pa-mb-6">
          <Controller name="submission_deadline_hours" control={control} render={({field}) => (
             <Input
               {...field}
               type="number"
               label={t('admin.organizationSettings.attendance.submissionDeadline')}
               onChange={e => {
                 const value = e.target.value
                 field.onChange(value === '' ? 0 : parseInt(value, 10))
               }}
             />
          )} />
        </div>

        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.attendance.parentControls')}</h3>
         <div className="pa-mb-6">
           <Controller name="parent_visibility.can_submit_attendance" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.attendance.parentsCanSubmit')} checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.attendance.save')}</Button>
        </div>
      </form>
    </Card>
  )
}


function RegistrationForm({ settings, onSave, loading }: { settings: OrgSettingsType['registration'], onSave: (d: any) => void, loading: boolean }) {
  const { t } = useI18n()
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.registration.title')}</h3>
        <div className="pa-flex pa-flex-col pa-gap-4 pa-mb-6">
           <Controller name="allow_guardian_self_invite" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.registration.allowGuardianInvite')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="allow_players_without_guardians" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.registration.allowPlayersWithoutGuardians')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="medical_form_required" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.registration.requireMedicalForm')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>
         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.registration.save')}</Button>
        </div>
      </form>
    </Card>
  )
}

function NotificationsForm({ settings, onSave, loading }: { settings: OrgSettingsType['notifications'], onSave: (d: any) => void, loading: boolean }) {
  const { t } = useI18n()
   const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.notifications.title')}</h3>
         <div className="pa-flex pa-flex-col pa-gap-4 pa-mb-6">
           <Controller name="attendance_reminders_enabled" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.notifications.attendanceReminders')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="schedule_change_alerts_enabled" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.notifications.scheduleChangeAlerts')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>
        <div className="pa-form-group pa-max-w-md pa-mb-6">
          <Controller name="payment_reminder_behavior" control={control} render={({field}) => (
             <Select
               {...field}
               label={t('admin.organizationSettings.notifications.paymentReminders')}
               options={[
                 { value: 'immediate', label: t('admin.organizationSettings.notifications.paymentReminderOptions.immediate') },
                 { value: 'daily_digest', label: t('admin.organizationSettings.notifications.paymentReminderOptions.dailyDigest') }
               ]}
             />
          )} />
        </div>
        <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.notifications.save')}</Button>
        </div>
      </form>
    </Card>
  )
}

function PermissionsForm({ settings, onSave, loading }: { settings: OrgSettingsType['visibility'], onSave: (d: any) => void, loading: boolean }) {
    const { t } = useI18n()
    const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { 
      ...settings,
      fan_visibility_defaults: settings.fan_visibility_defaults || {}
    }
  })

  useEffect(() => {
    reset({ 
      ...settings,
      fan_visibility_defaults: settings.fan_visibility_defaults || {}
    })
  }, [reset, settings])

  const eventTypes = [
    { key: 'practice', label: 'Practice' },
    { key: 'game', label: 'Game' },
    { key: 'tournament', label: 'Tournament' },
    { key: 'meeting', label: 'Meeting' },
    { key: 'tryout', label: 'Tryout' },
    { key: 'travel', label: 'Travel' },
    { key: 'pickup_dropoff', label: 'Pickup/Dropoff' },
    { key: 'social', label: 'Social' },
  ]

  return (
    <Card>
       <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.permissions.title')}</h3>
        <p className="pa-text-sm pa-text-muted pa-mb-4">{t('admin.organizationSettings.permissions.description')}</p>
        
        {/* Parent Permissions */}
        <h4 className="pa-h4 pa-mb-2">{t('admin.organizationSettings.permissions.parentRole')}</h4>
        <div className="pa-form-grid pa-form-grid-3 pa-mb-6">
           <Controller name="role_permissions.parent.can_view_roster" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.permissions.parentViewRoster')} checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
            <Controller name="role_permissions.parent.can_view_schedule" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.permissions.parentViewSchedule')} checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
             <Controller name="role_permissions.parent.can_view_payments" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.permissions.parentViewBilling')} checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

        {/* Coach Permissions */}
        <h4 className="pa-h4 pa-mb-2">{t('admin.organizationSettings.permissions.coachRole')}</h4>
        <div className="pa-form-grid pa-form-grid-2 pa-mb-6">
           <Controller name="role_permissions.coach.can_view_payments" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.permissions.coachViewFinancials')} checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
           <Controller name="role_permissions.coach.can_edit" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.permissions.coachEditEvents')} checked={field.value!} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

        {/* Fan Visibility Defaults */}
        <div className="pa-mt-8 pa-mb-6">
          <h4 className="pa-h4 pa-mb-2">{t('admin.organizationSettings.permissions.fanVisibilityDefaults.title')}</h4>
          <p className="pa-text-sm pa-text-muted pa-mb-4">{t('admin.organizationSettings.permissions.fanVisibilityDefaults.description')}</p>
          
          <div 
            style={{
              background: '#f8f9fa',
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            <div className="pa-flex pa-flex-col pa-gap-3">
              {eventTypes.map((eventType) => (
                <Controller
                  key={eventType.key}
                  name={`fan_visibility_defaults.${eventType.key}` as any}
                  control={control}
                  render={({ field }) => (
                    <div className="pa-flex pa-items-center pa-justify-between">
                      <label 
                        htmlFor={`fan-visibility-${eventType.key}`}
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        {eventType.label}
                      </label>
                      <label className="pa-inline-flex pa-items-center pa-gap-2">
                        <span className="pa-toggle" style={{ width: '52px', height: '28px' }}>
                          <input
                            id={`fan-visibility-${eventType.key}`}
                            type="checkbox"
                            className="pa-toggle-input"
                            checked={field.value || false}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                          <span className="pa-toggle-track" style={{ borderRadius: '14px' }} />
                          <span className="pa-toggle-thumb" style={{ borderRadius: '50%' }} />
                        </span>
                        <span style={{ fontSize: '13px', color: field.value ? '#059669' : '#6b7280', fontWeight: 500 }}>
                          {field.value ? t('admin.organizationSettings.permissions.fanVisibilityDefaults.visibleByDefault') : t('admin.organizationSettings.permissions.fanVisibilityDefaults.privateByDefault')}
                        </span>
                      </label>
                    </div>
                  )}
                />
              ))}
            </div>
            
            <div 
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: '#e0f2fe',
                border: '1px solid #0ea5e9',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#0c4a6e',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>
                info
              </span>
              {t('admin.organizationSettings.permissions.fanVisibilityDefaults.note')}
            </div>
          </div>
        </div>

         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="primary">{t('admin.organizationSettings.permissions.save')}</Button>
        </div>
      </form>
    </Card>
  )
}

function PaymentSettingsForm({ organizationId }: { organizationId: string }) {
  const { t } = useI18n()
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
        return t('admin.organizationSettings.payments.disabledReasons.pastDue')
      case 'requirements.pending_verification':
        return t('admin.organizationSettings.payments.disabledReasons.pendingVerification')
      case 'under_review':
        return t('admin.organizationSettings.payments.disabledReasons.underReview')
      default:
        if (reason.startsWith('rejected.')) return t('admin.organizationSettings.payments.disabledReasons.rejected')
        return t('admin.organizationSettings.payments.disabledReasons.generic', { reason: reason.replace(/_/g, ' ') })
    }
  }, [connectStatus?.disabledReason, t])

  const requirementPrefixes = useMemo(() => ({
    person: t('admin.organizationSettings.payments.requirements.prefix.person'),
    company: t('admin.organizationSettings.payments.requirements.prefix.company'),
    business: t('admin.organizationSettings.payments.requirements.prefix.business'),
    individual: t('admin.organizationSettings.payments.requirements.prefix.individual'),
  }), [t])

  const loadPolicy = useCallback(async () => {
    if (!organizationId) return
    setPolicyLoading(true)
    const { data, error: policyError } = await getOrganizationPaymentPolicy(organizationId)
    if (policyError) {
      setError(policyError.message || t('admin.organizationSettings.payments.policyLoadFailed'))
    } else if (data) {
      setAllowPartialPayments(data.allowPartialPayments)
    }
    setPolicyLoading(false)
  }, [organizationId, t])

  useEffect(() => {
    loadPolicy()
  }, [loadPolicy])

  const handleSavePartialPayments = async (checked: boolean) => {
    if (!organizationId) return
    setPolicySaving(true)
    setError(null)
    if (!navigator.onLine) {
      const message = t('common.error.offline')
      setError(message)
      showError(message)
      setPolicySaving(false)
      return
    }

    const { data, error: upsertError } = await updateOrganizationPaymentPolicy(organizationId, checked)
    if (upsertError) {
      const message = upsertError.message || t('admin.organizationSettings.payments.policySaveFailed')
      setError(message)
      showError(message)
    } else if (data) {
      setAllowPartialPayments(data.allowPartialPayments)
      showSuccess(t('admin.organizationSettings.payments.policySaved'))
    }
    setPolicySaving(false)
  }

  const loadStatus = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    const { data, error: statusError } = await getStripeConnectStatus(organizationId)
    if (statusError) {
      setError(statusError.message || t('admin.organizationSettings.payments.statusLoadFailed'))
    } else {
      setConnectStatus(data)
    }
    setLoading(false)
  }, [organizationId, t])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleConnect = async () => {
    if (!organizationId) return
    if (!navigator.onLine) {
      setError(t('common.error.offline'))
      showError(t('common.error.offline'))
      return
    }
    setOnboarding(true)
    setError(null)
    const { data, error: onboardError } = await initiateStripeConnectOnboarding(organizationId)
    if (onboardError) {
      setError(onboardError.message || t('admin.organizationSettings.payments.onboardingFailed'))
      setOnboarding(false)
    } else if (data?.account_link_url) {
      window.location.href = data.account_link_url
    }
  }

  const handleRefresh = async () => {
    if (!organizationId) return
    if (!navigator.onLine) {
      setError(t('common.error.offline'))
      showError(t('common.error.offline'))
      return
    }
    setRefreshing(true)
    setError(null)
    const { error: refreshError, data: refreshed } = await refreshStripeConnectStatus(organizationId)
    if (refreshError) {
      setError(refreshError.message || t('admin.organizationSettings.payments.refreshFailed'))
    } else {
      if (refreshed) {
        setConnectStatus(refreshed)
      } else {
        await loadStatus()
      }
      showSuccess(t('admin.organizationSettings.payments.statusRefreshed'))
    }
    setRefreshing(false)
  }

  const handleRemediationLink = async () => {
    if (!organizationId) return
    if (!navigator.onLine) {
      setError(t('common.error.offline'))
      showError(t('common.error.offline'))
      return
    }
    setRemediating(true)
    setError(null)
    const { url, error: linkError } = await createStripeRemediationLink(organizationId)
    if (linkError || !url) {
      setError(linkError?.message || t('admin.organizationSettings.payments.remediationFailed'))
      setRemediating(false)
      return
    }
    window.location.href = url
  }

  if (loading || policyLoading) {
    return (
      <Card>
        <div className="pa-text-center pa-p-8">{t('admin.organizationSettings.payments.loading')}</div>
      </Card>
    )
  }

  // Status determination
  const statusType = connectStatus?.connected 
    ? (payoutsPaused ? 'error' : connectStatus.payoutsEnabled ? 'success' : 'warning')
    : 'neutral'
  const statusText = connectStatus?.connected
    ? (payoutsPaused
        ? t('admin.organizationSettings.payments.status.payoutsPaused')
        : connectStatus.payoutsEnabled
        ? t('admin.organizationSettings.payments.status.active')
        : t('admin.organizationSettings.payments.status.connected'))
    : t('admin.organizationSettings.payments.status.notConnected')
  const statusIcon = connectStatus?.connected
    ? (payoutsPaused
        ? t('admin.organizationSettings.payments.statusIcons.error')
        : connectStatus.payoutsEnabled
        ? t('admin.organizationSettings.payments.statusIcons.success')
        : t('admin.organizationSettings.payments.statusIcons.neutral'))
    : t('admin.organizationSettings.payments.statusIcons.neutral')

  return (
    <>
    {/* Payment Options Card */}
    <Card className="pa-mb-6">
      <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.payments.optionsTitle')}</h3>
      
      <div className="pa-form-group">
        <Checkbox
          label={t('admin.organizationSettings.payments.allowPartialPayments')}
          checked={allowPartialPayments}
          onChange={(e) => handleSavePartialPayments(e.target.checked)}
          disabled={policySaving}
        />
        <p className="pa-text-sm pa-text-muted pa-mt-2">
          {t('admin.organizationSettings.payments.allowPartialPaymentsHelp')}
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
          {error}
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
              {t('admin.organizationSettings.payments.processingTitle')}
            </h3>
            <Badge variant={statusType === 'success' ? 'success' : statusType === 'error' ? 'danger' : statusType === 'warning' ? 'warning' : 'neutral'}>
              {statusText}
            </Badge>
          </div>
          
          <p className="pa-text-muted pa-mb-3">
            {connectStatus?.connected 
              ? payoutsPaused
                ? t('admin.organizationSettings.payments.statusDescription.payoutsPaused')
                : connectStatus.payoutsEnabled
                ? t('admin.organizationSettings.payments.statusDescription.active')
                : t('admin.organizationSettings.payments.statusDescription.connected')
              : t('admin.organizationSettings.payments.statusDescription.notConnected')
            }
          </p>

          {connectStatus?.lastStatusUpdated && (
            <div className="pa-text-xs pa-text-muted">
              {t('admin.organizationSettings.payments.lastSynced', { date: formatDateTime(connectStatus.lastStatusUpdated) })}
            </div>
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
              {t('admin.organizationSettings.payments.actions.connect')}
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
                  {isActionablePause
                    ? t('admin.organizationSettings.payments.actions.fixIssues')
                    : t('admin.organizationSettings.payments.actions.completeRequirements')}
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
                  {t('admin.organizationSettings.payments.actions.completeSetup')}
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
                {t('admin.organizationSettings.payments.actions.refreshStatus')}
              </Button>

              {connectStatus.dashboardUrl && (
                <Button
                  variant="ghost"
                  size="dense"
                  icon="open_in_new"
                  onClick={() => window.open(connectStatus.dashboardUrl!, '_blank')}
                  style={{ width: '100%' }}
                >
                  {t('admin.organizationSettings.payments.actions.dashboard')}
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
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{t('admin.organizationSettings.payments.statusIcons.error')}</span>
            <div className="pa-flex-1">
              <h4 className="pa-h4 pa-mb-2" style={{ color: 'var(--pa-danger, #ef4444)' }}>
                {t('admin.organizationSettings.payments.payoutsPaused.title')}
              </h4>
              <p className="pa-text-sm pa-mb-3">
                {disabledCopy || t('admin.organizationSettings.payments.payoutsPaused.description')}
              </p>
              {connectStatus.requirementsDeadline && (
                <div className="pa-text-xs pa-text-muted pa-mb-3" style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  {t('admin.organizationSettings.payments.requirementsDeadline', { date: formatDateTime(connectStatus.requirementsDeadline) })}
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
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{t('admin.organizationSettings.payments.statusIcons.warning')}</span>
            <div className="pa-flex-1">
              <h4 className="pa-h4 pa-mb-2" style={{ color: 'var(--pa-warning, #fbbf24)' }}>
                {t('admin.organizationSettings.payments.requirementsDue.title')}
              </h4>
              <p className="pa-text-sm pa-mb-3">
                {t('admin.organizationSettings.payments.requirementsDue.description')}
              </p>
              {connectStatus.requirementsDeadline && (
                <div className="pa-text-xs pa-text-muted" style={{ 
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  {t('admin.organizationSettings.payments.requirementsDeadline', { date: formatDateTime(connectStatus.requirementsDeadline) })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {connectStatus?.connected && (
        <div className="pa-form-grid pa-form-grid-3 pa-mb-6" style={{ gap: '16px' }}>
          {/* Payout Status */}
          <div style={{
            background: 'var(--pa-bg, white)',
            border: '1px solid var(--pa-border, #e5e7eb)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div className="pa-caption pa-text-muted pa-mb-2">{t('admin.organizationSettings.payments.info.payoutStatus')}</div>
            <div className="pa-flex pa-items-center pa-gap-2">
              <Badge variant={connectStatus.payoutsEnabled ? 'success' : 'danger'} style={{ fontSize: '14px' }}>
                {connectStatus.payoutsEnabled
                  ? t('admin.organizationSettings.payments.info.payoutStatusActive')
                  : t('admin.organizationSettings.payments.info.payoutStatusPaused')}
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
            <div className="pa-caption pa-text-muted pa-mb-2">{t('admin.organizationSettings.payments.info.onboarding')}</div>
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
              {t(`admin.organizationSettings.payments.onboardingStatus.${connectStatus.onboardingStatus}`)}
            </Badge>
          </div>

          {/* Account Status */}
          <div style={{
            background: 'var(--pa-bg, white)',
            border: '1px solid var(--pa-border, #e5e7eb)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div className="pa-caption pa-text-muted pa-mb-2">{t('admin.organizationSettings.payments.info.accountHealth')}</div>
            <div className="pa-text-sm" style={{ fontWeight: 600 }}>
              {disabledCopy || (hasPendingReview
                ? t('admin.organizationSettings.payments.info.underReview')
                : t('admin.organizationSettings.payments.info.allClear'))}
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
          <h4 className="pa-h4 pa-mb-4">{t('admin.organizationSettings.payments.requirements.title')}</h4>
          
          {connectStatus.requirementsDue?.length > 0 && (
            <div className="pa-mb-4">
              <div className="pa-text-sm pa-font-semibold pa-mb-2">{t('admin.organizationSettings.payments.requirements.due')}</div>
              <div className="pa-flex pa-flex-col pa-gap-2">
                {connectStatus.requirementsDue.map((req) => {
                  // Convert technical requirement names to human-readable format
                  const humanReadable = req
                    .replace(/^person_/, `${requirementPrefixes.person}: `)
                    .replace(/^company_/, `${requirementPrefixes.company}: `)
                    .replace(/^business_/, `${requirementPrefixes.business}: `)
                    .replace(/^individual_/, `${requirementPrefixes.individual}: `)
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
                      <span>{t('admin.organizationSettings.payments.statusIcons.warning')}</span>
                      <span>{humanReadable}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {connectStatus.requirementsErrors?.length > 0 && (
            <div>
              <div className="pa-text-sm pa-font-semibold pa-mb-2">{t('admin.organizationSettings.payments.requirements.issues')}</div>
              <div className="pa-flex pa-flex-col pa-gap-2">
                {connectStatus.requirementsErrors.map((err, idx) => {
                  // Convert technical field names to human-readable format
                  const humanReadableField = err.requirement
                    ?.replace(/^person_/, `${requirementPrefixes.person}: `)
                    ?.replace(/^company_/, `${requirementPrefixes.company}: `)
                    ?.replace(/^business_/, `${requirementPrefixes.business}: `)
                    ?.replace(/^individual_/, `${requirementPrefixes.individual}: `)
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
                      <span style={{ marginTop: '2px' }}>{t('admin.organizationSettings.payments.statusIcons.error')}</span>
                      <div>
                        <div>{err.reason || err.code || t('admin.organizationSettings.payments.requirements.issueDetected')}</div>
                        {humanReadableField && (
                          <div className="pa-text-xs pa-text-muted pa-mt-1">{t('admin.organizationSettings.payments.requirements.field', { field: humanReadableField })}</div>
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
            <span style={{ fontSize: '18px' }}>{t('admin.organizationSettings.payments.statusIcons.info')}</span>
            <div>
              <strong>{t('admin.organizationSettings.payments.pendingReview.title')}</strong> {t('admin.organizationSettings.payments.pendingReview.description')}
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
            <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>{'>'}</span>
            {t('admin.organizationSettings.payments.advancedDetails')}
          </button>

          {showAdvanced && (
            <div className="pa-mt-4 pa-flex pa-flex-col pa-gap-3">
              {connectStatus.payoutDescriptor && (
                <div>
                  <div className="pa-caption pa-text-muted">{t('admin.organizationSettings.payments.payoutDescriptor')}</div>
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
                  <div className="pa-caption pa-text-muted">{t('admin.organizationSettings.payments.pendingVerification')}</div>
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
   const { t } = useI18n()
   const { control, handleSubmit, reset } = useForm({
    defaultValues: { ...settings }
  })

  useEffect(() => {
    reset({ ...settings })
  }, [reset, settings])

  return (
    <Card>
      <form onSubmit={handleSubmit(onSave)}>
        <h3 className="pa-h3 pa-mb-4">{t('admin.organizationSettings.advanced.title')}</h3>
        <div className="pa-alert pa-alert-warning pa-mb-4">
           {t('admin.organizationSettings.advanced.warning')}
        </div>
        
        <div className="pa-form-group pa-mb-4">
           <Controller name="allow_data_export" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.advanced.allowDataExport')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-group pa-mb-6">
           <Controller name="enable_api_access" control={control} render={({field}) => (
            <Checkbox label={t('admin.organizationSettings.advanced.enableApiAccess')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
        </div>

         <div className="pa-form-actions">
          <Button type="submit" loading={loading} variant="danger" style={{background: 'var(--pa-secondary-bg)', color: 'var(--pa-text)'}}>{t('admin.organizationSettings.advanced.save')}</Button>
        </div>
      </form>
    </Card>
  )
}


