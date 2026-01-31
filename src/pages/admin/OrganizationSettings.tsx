
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { startTransition } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { refreshOrganizationTheme } from '../../hooks/useOrganizationTheme'
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
} from '../../data/services/paymentSettingsService'

import type { StripeConnectStatus } from '../../types/stripeConnect.types'
import { supabase } from '../../lib/supabase'

import { type OrganizationSettings as OrgSettingsType } from '@/types/organizationSettings'
import ContactSection from './organizationSettings/ContactSection'
import TravelContactSection from './organizationSettings/TravelContactSection'

import type { Organization } from '../../types/domain/Organization'

export default function OrganizationSettings() {
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
    const baseTabs = ['overview', 'contact', 'travel-contacts', 'general', 'appearance', 'attendance', 'registration', 'notifications', 'permissions', 'advanced']
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
          <TabsTrigger value="travel-contacts">Travel Contacts</TabsTrigger>
          <TabsTrigger value="general">Configuration</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          {hasPaymentAccess && <TabsTrigger value="payments">Payments</TabsTrigger>}
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {orgDetails && <OverviewForm org={orgDetails} onSave={handleSaveOverview} loading={saving} />}
        </TabsContent>

        <TabsContent value="contact">
            {currentOrganization?.id && <ContactSection orgId={currentOrganization.id} />}
        </TabsContent>

        <TabsContent value="travel-contacts">
            <TravelContactSection />
        </TabsContent>

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
  const [error, setError] = useState<string | null>(null)

  const [allowPartialPayments, setAllowPartialPayments] = useState<boolean>(true)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [policySaving, setPolicySaving] = useState(false)

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
    const { error: refreshError } = await refreshStripeConnectStatus(organizationId)
    if (refreshError) {
      setError(refreshError.message)
    } else {
      await loadStatus()
      showSuccess('Connect status refreshed')
    }
    setRefreshing(false)
  }

  if (loading || policyLoading) {
    return (
      <Card>
        <div className="pa-text-center pa-p-8">Loading payment settings...</div>
      </Card>
    )
  }

  return (
    <>
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

    <Card>
      <h3 className="pa-h3 pa-mb-4">Stripe Connect Settings</h3>
      
      {error && (
        <div className="pa-alert pa-alert-error pa-mb-4" style={{ background: 'var(--pa-danger-bg)', color: 'var(--pa-danger)', padding: '1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <div className="pa-form-group pa-mb-6">
        <div className="pa-mb-4">
          <div className="pa-caption pa-text-muted pa-mb-2">Connection Status</div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <Badge variant={connectStatus?.connected ? 'success' : 'neutral'}>
              {connectStatus?.connected ? 'Connected' : 'Not Connected'}
            </Badge>
            {connectStatus?.connected && (
              <Button
                variant="ghost"
                size="dense"
                icon="refresh"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                Refresh Status
              </Button>
            )}
          </div>
        </div>

        {connectStatus?.connected && (
          <>
            <div className="pa-mb-4">
              <div className="pa-caption pa-text-muted pa-mb-2">Payout Status</div>
              <Badge variant={connectStatus.payoutsEnabled ? 'success' : 'neutral'}>
                {connectStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="pa-mb-4">
              <div className="pa-caption pa-text-muted pa-mb-2">Onboarding Status</div>
              <Badge
                variant={
                  connectStatus.onboardingStatus === 'completed'
                    ? 'success'
                    : connectStatus.onboardingStatus === 'restricted'
                      ? 'danger'
                      : 'warning'
                }
              >
                {connectStatus.onboardingStatus}
              </Badge>
            </div>

            {connectStatus.payoutDescriptor && (
              <div className="pa-mb-4">
                <div className="pa-caption pa-text-muted pa-mb-2">Payout Descriptor</div>
                <div className="pa-text-sm">{connectStatus.payoutDescriptor}</div>
              </div>
            )}

            {connectStatus.dashboardUrl && (
              <div className="pa-mb-4">
                <Button
                  variant="ghost"
                  icon="open_in_new"
                  onClick={() => window.open(connectStatus.dashboardUrl!, '_blank')}
                >
                  View in Stripe Dashboard
                </Button>
              </div>
            )}

            {connectStatus.onboardingStatus !== 'completed' && (
              <div className="pa-mb-4">
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={onboarding}
                  loading={onboarding}
                >
                  Complete Onboarding
                </Button>
              </div>
            )}
          </>
        )}

        {!connectStatus?.connected && (
          <div className="pa-mb-4">
            <p className="pa-text-sm pa-text-muted pa-mb-4">
              Connect your Stripe account to receive payments directly from parents.
            </p>
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={onboarding}
              loading={onboarding}
            >
              Connect Stripe Account
            </Button>
          </div>
        )}
      </div>
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
