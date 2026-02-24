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
import { Tabs, TabsList, TabsTrigger, TabsContent, Modal } from '../../components/platformAdmin'
import { getLink, RouteKeys } from '../../utils/routes'
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '../../data/services/preferencesService'
import { supabase } from '../../lib/supabase'
import { showSuccess, showError } from '../../utils/toast'
import { validatePhoneFormat } from '../../utils/phoneValidation'

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

function validatePassword(password: string): { valid: boolean; message: string; strength?: 'weak' | 'medium' | 'strong' } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' }
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length
  
  if (score < 2) return { valid: false, message: 'Use a mix of letters and numbers', strength: 'weak' }
  if (score === 2) return { valid: true, message: 'Password strength: Medium', strength: 'medium' }
  if (score >= 3) return { valid: true, message: 'Password strength: Strong', strength: 'strong' }
  return { valid: true, message: '', strength: 'medium' }
}

export default function PlatformAdminSettings() {
  const { user, profile, updatePassword, updateEmail, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  const handleTabChange = (value: string) => setSearchParams({ tab: value }, { replace: true })

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAdvanced, setSavingAdvanced] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [showEmailRetryBanner, setShowEmailRetryBanner] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('')
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
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

  // Show friendly message when redirected with email link error (expired or already used)
  useEffect(() => {
    const errorCode = searchParams.get('error_code')
    const errorParam = searchParams.get('error')
    if (errorCode === 'otp_expired' || errorParam === 'access_denied') {
      showError(
        'The confirmation link is invalid or was already used. Some email tools open links automatically, which uses the link before you click. Please try changing your email again and click the new link as soon as you receive it.'
      )
      setShowEmailRetryBanner(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('error')
        next.delete('error_code')
        next.delete('error_description')
        return next
      }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount to clear auth error from URL

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    if (!user?.id) {
      setLoading(false)
      return
    }
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
          setLoading(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reload when user.id changes, not when profile changes (to avoid loops)
  }, [user?.id])

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

  const handleChangeEmail = async () => {
    setEmailError(null)
    
    // Validation
    if (!newEmail || !confirmEmail) {
      setEmailError('Please enter both email addresses')
      return
    }
    
    if (newEmail !== confirmEmail) {
      setEmailError('Email addresses do not match')
      return
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    // Check if same as current email (use auth user email as source of truth)
    const currentEmail = user?.email ?? profile?.email
    if (currentEmail && newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError('New email must be different from your current email')
      return
    }
    
    setChangingEmail(true)
    
    try {
      const { error } = await updateEmail(newEmail, '/platform-admin/settings')
      if (error) throw error
      
      showSuccess('A confirmation link has been sent to your new email address. Click it to complete the change.')
      setShowEmailModal(false)
      setShowEmailRetryBanner(false)
      setNewEmail('')
      setConfirmEmail('')
    } catch (err) {
      console.error('Error changing email:', err)
      const rawMessage = err instanceof Error ? err.message : 'Failed to change email'
      const isRateLimit = /rate limit|too many requests/i.test(rawMessage)
      const isPendingChange = /pending|already.*change|email.*change.*pending/i.test(rawMessage)
      const errorMessage = isRateLimit
        ? 'Too many email requests. Please wait about an hour before trying again.'
        : isPendingChange
        ? 'An email change is already pending. Please check your email and confirm the existing change, or wait for it to expire before requesting a new one.'
        : rawMessage
      setEmailError(errorMessage)
      showError(errorMessage)
    } finally {
      setChangingEmail(false)
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
      
      {showEmailRetryBanner && (
        <Card className="oa-mb-4" style={{ background: '#fef3c7', borderColor: '#fbbf24', borderWidth: '1px', borderStyle: 'solid' }}>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>
                Email change confirmation link expired
              </p>
              <p style={{ fontSize: '0.875rem', color: '#78350f' }}>
                The confirmation link was invalid or already used. Some email tools open links automatically. Click below to request a new confirmation email.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setShowEmailRetryBanner(false)
                setShowEmailModal(true)
              }}
              style={{ width: '100%', maxWidth: '200px' }}
            >
              Try Again
            </Button>
          </div>
        </Card>
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
                <Input label="Email" value={(user?.email ?? profile?.email) || ''} disabled helper="Email is used for login" />
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
              <label className="oa-label">Email</label>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--oa-text, #111)' }}>
                  {user?.email ?? profile?.email ?? 'No email set'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--org-link-color, #137fec)', textDecoration: 'underline' }}
                >
                  Change email
                </button>
              </div>
            </div>
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
      <Modal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setNewPassword('')
          setConfirmPassword('')
          setPasswordValidation(null)
        }}
        title="Change Password"
        size="medium"
      >
        <div style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)', marginBottom: 'var(--pa-space-5)' }}>
            <div>
              <Input 
                label="New Password" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter new password" 
                helper={passwordValidation?.message}
                error={passwordValidation && !passwordValidation.valid ? passwordValidation.message : undefined} 
              />
              {passwordValidation && passwordValidation.valid && (
                <div style={{ 
                  marginTop: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: passwordValidation.strength === 'strong' 
                    ? 'var(--pa-success)' 
                    : passwordValidation.strength === 'medium' 
                    ? 'var(--pa-warning)' 
                    : 'var(--pa-danger)'
                }}>
                  <div style={{ 
                    flex: 1, 
                    height: '4px', 
                    background: 'var(--pa-n200)', 
                    borderRadius: '2px', 
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: passwordValidation.strength === 'strong' ? '100%' : passwordValidation.strength === 'medium' ? '66%' : '33%',
                        background: passwordValidation.strength === 'strong' 
                          ? 'var(--pa-success)' 
                          : passwordValidation.strength === 'medium' 
                          ? 'var(--pa-warning)' 
                          : 'var(--pa-danger)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                    {passwordValidation.strength === 'strong' ? 'Strong' : passwordValidation.strength === 'medium' ? 'Medium' : 'Weak'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <Input 
                label="Confirm Password" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm" 
                error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--pa-space-3)' }}>
            <Button onClick={() => {
              setShowPasswordModal(false)
              setNewPassword('')
              setConfirmPassword('')
              setPasswordValidation(null)
            }} variant="secondary">Cancel</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || newPassword !== confirmPassword || (passwordValidation != null && !passwordValidation.valid)} variant="primary">{changingPassword ? 'Changing...' : 'Change Password'}</Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={showEmailModal}
        onClose={() => {
          setShowEmailModal(false)
          setEmailError(null)
          setNewEmail('')
          setConfirmEmail('')
        }}
        title="Change Email"
        size="medium"
      >
        <div style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ marginBottom: 'var(--pa-space-4)' }}>
            <p style={{ margin: 0, color: 'var(--pa-n700)', fontSize: '0.875rem' }}>
              Current email: <strong>{user?.email ?? profile?.email}</strong>
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)', marginBottom: 'var(--pa-space-4)' }}>
            <div>
              <Input
                label="New Email"
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  setEmailError(null)
                }}
                placeholder="Enter new email address"
                error={emailError && (!newEmail || newEmail !== confirmEmail) ? emailError : undefined}
              />
            </div>
            <div>
              <Input
                label="Confirm New Email"
                type="email"
                value={confirmEmail}
                onChange={(e) => {
                  setConfirmEmail(e.target.value)
                  setEmailError(null)
                }}
                placeholder="Confirm new email address"
                error={confirmEmail && newEmail !== confirmEmail ? 'Email addresses do not match' : undefined}
              />
            </div>
          </div>
          {emailError && (
            <div style={{ 
              marginBottom: 'var(--pa-space-4)', 
              background: 'var(--pa-danger-bg)', 
              color: 'var(--pa-danger)', 
              padding: 'var(--pa-space-3)', 
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {emailError}
            </div>
          )}
          <div style={{ marginBottom: 'var(--pa-space-5)' }}>
            <p style={{ margin: 0, color: 'var(--pa-n700)', fontSize: '0.75rem' }}>
              A confirmation link will be sent to your new email address. Click that link to complete the change.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--pa-space-3)' }}>
            <Button
              onClick={() => {
                setShowEmailModal(false)
                setEmailError(null)
                setNewEmail('')
                setConfirmEmail('')
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={changingEmail || !newEmail || !confirmEmail || newEmail !== confirmEmail}
              variant="primary"
            >
              {changingEmail ? 'Sending...' : 'Change Email'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={showSignOutAllDialog} title="Sign Out All Sessions" description="Sign out from all devices? You will need to sign in again." confirmLabel="Sign Out All" cancelLabel="Cancel" variant="danger" onConfirm={handleSignOutAll} onCancel={() => setShowSignOutAllDialog(false)} />
    </div>
  )
}
