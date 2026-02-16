import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  Card,
  Input,
  Select,
  Checkbox,
  Button,
  ConfirmDialog,
} from '../../components/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/platformAdmin'
import { getLink, RouteKeys } from '../../utils/routes'
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '../../data/services/preferencesService'
import { supabase } from '../../lib/supabase'
import { showSuccess, showError } from '../../utils/toast'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import '../../styles/orgAdmin.css'

function getTimezoneOptions() {
  try {
    const timezones = (Intl as any).supportedValuesOf('timeZone') as string[]
    const common = [
      { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
      { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
      { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
    ]
    const rest = timezones
      .filter((tz: string) => !common.some((ct) => ct.value === tz))
      .map((tz: string) => ({ value: tz, label: tz }))
    return [{ value: '', label: 'Use default' }, ...common, ...rest]
  } catch {
    return [
      { value: '', label: 'Use default' },
      { value: 'America/New_York', label: 'Eastern' },
      { value: 'America/Chicago', label: 'Central' },
      { value: 'America/Los_Angeles', label: 'Pacific' },
    ]
  }
}

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' }
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const score = [hasUpper, hasLower, hasNumber].filter(Boolean).length
  if (score < 2) return { valid: false, message: 'Use a mix of letters and numbers' }
  return { valid: true, message: '' }
}

export default function PlatformAdminSettings() {
  const { user, profile, updatePassword, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  const handleTabChange = (value: string) => setSearchParams({ tab: value }, { replace: true })

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAdvanced, setSavingAdvanced] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('')
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordValidation, setPasswordValidation] = useState<ReturnType<typeof validatePassword> | null>(null)
  const [showSignOutAllDialog, setShowSignOutAllDialog] = useState(false)
  const timezoneOptions = useRef(getTimezoneOptions())

  const breadcrumbs = [
    { label: 'Platform Admin', path: getLink(RouteKeys.PLATFORM_DASHBOARD) },
    { label: 'Personal Settings' },
  ]

  useEffect(() => {
    if (newPassword) setPasswordValidation(validatePassword(newPassword))
    else setPasswordValidation(null)
  }, [newPassword])

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    const load = async () => {
      try {
        if (profile) {
          setFirstName(profile.first_name || '')
          setLastName(profile.last_name || '')
          setPhone(profile.phone || '')
        }
        const { data: prefs, error: prefsError } = await getUserPreferences(user.id)
        if (prefsError) {
          setError('Failed to load preferences')
          return
        }
        if (prefs) {
          setPreferences({
            ...prefs,
            profile: { ...prefs.profile, timezone: prefs.profile?.timezone ?? '' },
            advanced: { ...prefs.advanced, beta_features: prefs.advanced?.beta_features ?? false, ui_density: prefs.advanced?.ui_density ?? 'comfortable' },
          })
          setTimezone(prefs.profile?.timezone || '')
        }
      } catch {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, profile])

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedFirst || !trimmedLast) {
      setError('First and last name are required')
      return
    }
    const phoneVal = validatePhoneFormat(trimmedPhone)
    if (!phoneVal.valid) {
      setError(phoneVal.error || 'Invalid phone')
      return
    }
    setSavingProfile(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: trimmedFirst,
          last_name: trimmedLast,
          phone: trimmedPhone,
          display_name: `${trimmedFirst} ${trimmedLast}`.trim(),
        } as any)
        .eq('id', user.id)
      if (updateError) throw updateError
      await updateUserPreferences(user.id, { ...preferences, profile: { ...preferences.profile, timezone } })
      await refreshProfile()
      showSuccess('Profile updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      showError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingProfile(false)
    }
  }, [user?.id, firstName, lastName, phone, timezone, preferences, refreshProfile])

  const handleSaveAdvanced = useCallback(async () => {
    if (!user?.id) return
    setSavingAdvanced(true)
    setError(null)
    try {
      const { error: prefsError } = await updateUserPreferences(user.id, preferences)
      if (prefsError) throw prefsError
      showSuccess('Advanced preferences updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      showError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingAdvanced(false)
    }
  }, [user?.id, preferences])

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    const val = validatePassword(newPassword)
    if (!val.valid) {
      setError(val.message)
      return
    }
    setChangingPassword(true)
    setError(null)
    try {
      const { error: pwError } = await updatePassword(newPassword)
      if (pwError) throw pwError
      showSuccess('Password changed')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordValidation(null)
      setPasswordSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
      showError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
      window.location.href = '/login'
    } catch {
      setError('Failed to sign out')
      setShowSignOutAllDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="oa-root">
        <div className="oa-page-loading">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader title="Personal Settings" subtitle="Manage your account and preferences" breadcrumbs={breadcrumbs} />
      {error && (
        <div className="oa-alert oa-alert-error oa-mb-4" style={{ background: 'var(--oa-danger-bg)', color: 'var(--oa-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="oa-tabs">
        <TabsList className="oa-mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <h3 className="oa-h3 oa-mb-4">Profile</h3>
            <div className="oa-form-grid oa-form-grid-2">
              <div className="oa-form-group">
                <Input label="First Name" value={firstName} onChange={(e: any) => setFirstName(e.target.value)} placeholder="John" required maxLength={100} helper="Your first name" />
              </div>
              <div className="oa-form-group">
                <Input label="Last Name" value={lastName} onChange={(e: any) => setLastName(e.target.value)} placeholder="Smith" required maxLength={100} helper="Your last name" />
              </div>
              <div className="oa-form-group">
                <Input label="Email" value={profile?.email || ''} disabled helper="Email is used for login" />
              </div>
              <div className="oa-form-group">
                <Input label="Phone" type="tel" value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="(555) 123-4567" maxLength={20} helper="For account recovery" />
              </div>
              <div className="oa-form-group">
                <Select label="Timezone" value={timezone} onChange={(e: any) => setTimezone(e.target.value)} options={timezoneOptions.current} helper="Your timezone" />
              </div>
            </div>
            <div className="oa-form-actions">
              <Button onClick={handleSaveProfile} disabled={savingProfile} variant="primary">{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card>
            <h3 className="oa-h3 oa-mb-4">Security</h3>
            <div className="oa-form-group">
              <label className="oa-label">Password</label>
              <Button onClick={() => setShowPasswordModal(true)} variant="secondary">Change Password</Button>
              {passwordSuccess && (
                <div className="oa-alert oa-alert-success" style={{ marginTop: '1rem', background: 'var(--oa-success-bg)', color: 'var(--oa-success)', padding: '1rem', borderRadius: '8px' }}>
                  Password changed successfully
                </div>
              )}
            </div>
            {user?.last_sign_in_at && (
              <div className="oa-info-row">
                <span className="oa-info-label">Last login</span>
                <span className="oa-info-value">{new Date(user.last_sign_in_at).toLocaleString()}</span>
              </div>
            )}
            <div className="oa-form-group">
              <label className="oa-label">Sessions</label>
              <Button onClick={() => setShowSignOutAllDialog(true)} variant="danger">Sign Out All Sessions</Button>
              <p className="oa-helper-text">Sign out from all devices</p>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="advanced">
          <Card>
            <h3 className="oa-h3 oa-mb-4">Advanced</h3>
            <div className="oa-form-group">
              <Checkbox
                label="Enable beta features"
                checked={preferences.advanced?.beta_features ?? false}
                onChange={(e: any) => setPreferences({ ...preferences, advanced: { ...preferences.advanced, beta_features: e.target.checked } })}
                helper="Access experimental features"
              />
            </div>
            <div className="oa-form-group">
              <Select
                label="UI Density"
                value={preferences.advanced?.ui_density || 'comfortable'}
                onChange={(e: any) => setPreferences({ ...preferences, advanced: { ...preferences.advanced, ui_density: e.target.value as 'comfortable' | 'compact' } })}
                options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
                helper="Interface spacing"
              />
            </div>
            <div className="oa-form-actions">
              <Button onClick={handleSaveAdvanced} disabled={savingAdvanced} variant="primary">{savingAdvanced ? 'Saving...' : 'Save Advanced'}</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      {showPasswordModal && (
        <div className="oa-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="oa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oa-modal-header">
              <h2>Change Password</h2>
              <button className="oa-modal-close" onClick={() => setShowPasswordModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="oa-modal-content">
              <div className="oa-form-grid oa-form-grid-2">
                <div className="oa-form-group">
                  <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" helper={passwordValidation?.message} error={passwordValidation && !passwordValidation.valid ? passwordValidation.message : undefined} />
                </div>
                <div className="oa-form-group">
                  <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm" error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined} />
                </div>
              </div>
            </div>
            <div className="oa-modal-footer">
              <Button onClick={() => setShowPasswordModal(false)} variant="secondary">Cancel</Button>
              <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || newPassword !== confirmPassword || (passwordValidation != null && !passwordValidation.valid)} variant="primary">{changingPassword ? 'Changing...' : 'Change Password'}</Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={showSignOutAllDialog} title="Sign Out All Sessions" description="Sign out from all devices? You will need to sign in again." confirmLabel="Sign Out All" cancelLabel="Cancel" variant="danger" onConfirm={handleSignOutAll} onCancel={() => setShowSignOutAllDialog(false)} />
    </div>
  )
}
