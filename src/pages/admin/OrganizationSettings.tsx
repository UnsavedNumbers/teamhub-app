
import { useState, useEffect, useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
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
  TabsContent
} from '../../components/platformAdmin'

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

import { type OrganizationSettings as OrgSettingsType } from '@/types/organizationSettings'

import type { Organization } from '../../types/domain/Organization'

export default function OrganizationSettings() {
  const { currentOrganization } = useOrganization()
  const { context, isReady } = useUserContext()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

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
      setSuccess('Organization profile updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to update profile')
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

      setSuccess('Settings updated successfully')
      loadData() // Reload to get fresh timestamps
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTheme = async (themeId: string | null) => {
    if (!context || !themeSettings) return
    setSaving(true)
    setError(null)
    setSuccess(null)

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="pa-tabs">
        <TabsList className="pa-mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="general">Configuration</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {orgDetails && <OverviewForm org={orgDetails} onSave={handleSaveOverview} loading={saving} />}
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

        <TabsContent value="advanced">
           {settings && <AdvancedForm settings={settings.advanced} onSave={(d) => handleSaveSettings('advanced', d)} loading={saving} />}
        </TabsContent>

      </Tabs>
    </div>
  )
}

// --- Sub-Forms ---

function OverviewForm({ org, onSave, loading }: { org: Organization, onSave: (data: OrganizationUpdateDTO, file?: File) => void, loading: boolean }) {
  const { control, handleSubmit } = useForm<OrganizationUpdateDTO>({
    defaultValues: {
      name: org.name,
      website: org.website || '',
      phone: org.phone || '',
      email: org.email || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip: org.zip || '',
    }
  })
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined)
  const [logoError, setLogoError] = useState<string | null>(null)

  const validateLogoFile = (file?: File) => {
    if (!file) {
      setLogoError(null)
      return true
    }

    const allowedTypes = ['image/png', 'image/jpeg']
    const maxSizeMb = 2

    if (!allowedTypes.includes(file.type)) {
      setLogoError('Logo must be a PNG or JPG image.')
      return false
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setLogoError('Logo must be 2MB or smaller.')
      return false
    }

    setLogoError(null)
    return true
  }

  return (
    <Card>
      <form onSubmit={handleSubmit((data) => {
        if (!validateLogoFile(logoFile)) return
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
            <div className="pa-upload-box pa-p-4 pa-border pa-rounded pa-text-center">
               <input
                 type="file"
                 accept="image/png,image/jpeg"
                 onChange={(e) => {
                   const file = e.target.files?.[0]
                   setLogoFile(file)
                   validateLogoFile(file)
                 }}
                 disabled={loading}
               />
               <p className="pa-text-sm pa-text-muted pa-mt-2">Upload a PNG or JPG logo</p>
               {logoError && (
                 <p className="pa-text-sm" style={{ color: 'var(--pa-danger)', marginTop: '4px' }}>
                   {logoError}
                 </p>
               )}
            </div>
          </div>
        </div>
        
        <div className="pa-mt-6">
          <h3 className="pa-h3 pa-mb-4">Location</h3>
          <div className="pa-form-group pa-mb-4">
            <Controller name="address" control={control} render={({field}) => (
               <Input {...field} value={field.value || ''} label="Address" />
            )} />
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

  // Sync selectedThemeId when settings change (e.g., after reload)
  useEffect(() => {
    setSelectedThemeId(settings.theme_id || null)
  }, [settings.theme_id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ theme_id: selectedThemeId })
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
            onChange={setSelectedThemeId}
            disabled={loading}
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
