import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { 
  PageHeader, 
  Card, 
  Input, 
  Select, 
  Checkbox, 
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '../../components/platformAdmin'
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '../../data/services/preferencesService'
import { supabase } from '../../lib/supabase'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get list of IANA timezones supported by browser
 */
function getTimezoneOptions() {
  try {
    // TypeScript doesn't recognize supportedValuesOf in older lib versions, so we cast
    const timezones = (Intl as any).supportedValuesOf('timeZone') as string[]
    
    // Group common US timezones at the top
    const commonTimezones = [
      { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
      { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
      { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
      { value: 'America/Phoenix', label: 'Mountain Time (MT) - Phoenix (no DST)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT) - Anchorage' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT) - Honolulu' },
    ]
    
    // Add all other timezones
    const allTimezones = timezones
      .filter((tz: string) => !commonTimezones.some(ct => ct.value === tz))
      .map((tz: string) => ({ value: tz, label: tz }))
    
    return [
      { value: '', label: 'Use organization default' },
      ...commonTimezones,
      { value: '---', label: '─────────────────', disabled: true },
      ...allTimezones,
    ]
  } catch (error) {
    // Fallback for older browsers
    return [
      { value: '', label: 'Use organization default' },
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'America/Chicago', label: 'Central Time (CT)' },
      { value: 'America/Denver', label: 'Mountain Time (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    ]
  }
}

/**
 * Validate password strength
 */
function validatePassword(password: string): { valid: boolean; message: string; strength: 'weak' | 'medium' | 'strong' } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters', strength: 'weak' }
  }
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
  
  if (strengthScore < 2) {
    return { valid: false, message: 'Password is too weak. Use a mix of letters, numbers, and symbols', strength: 'weak' }
  }
  
  if (strengthScore === 2) {
    return { valid: true, message: 'Password strength: Medium', strength: 'medium' }
  }
  
  return { valid: true, message: 'Password strength: Strong', strength: 'strong' }
}

/**
 * Debounce utility
 */
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

export default function AdminSettings() {
  const { user, profile, updatePassword } = useAuth()
  const { currentOrganization } = useOrganization()
  
  // URL Persistence
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true })
  }

  // Loading states
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [savingWorkflow, setSavingWorkflow] = useState(false)
  const [savingAdvanced, setSavingAdvanced] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Success/error states
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [notificationSuccess, setNotificationSuccess] = useState(false)
  const [workflowSuccess, setWorkflowSuccess] = useState(false)
  const [advancedSuccess, setAdvancedSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('')
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({})
  
  // Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordValidation, setPasswordValidation] = useState<ReturnType<typeof validatePassword> | null>(null)
  
  // Timezone options
  const timezoneOptions = useRef(getTimezoneOptions())
  
  // Load initial data
  useEffect(() => {
    async function loadSettings() {
      if (!user?.id) return
      
      setLoading(true)
      try {
        // Load user profile data
        if (profile) {
          setDisplayName(profile.display_name || '')
        }
        
        // Load user preferences with type safety
        const { data: prefs, error: prefsError } = await getUserPreferences(user.id)
        if (prefsError) {
          console.error('Error loading preferences:', prefsError)
          setError('Failed to load preferences')
          return
        }
        
        if (prefs) {
          // Validate and set preferences with type guards
          const validatedPrefs: UserPreferences = {
            ...prefs,
            notifications: {
              email: prefs.notifications?.email ?? true,
              push: prefs.notifications?.push ?? false,
              attendance_issues: prefs.notifications?.attendance_issues ?? true,
              schedule_changes: prefs.notifications?.schedule_changes ?? true,
              payment_issues: prefs.notifications?.payment_issues ?? true,
              registration_activity: prefs.notifications?.registration_activity ?? true,
              system_announcements: prefs.notifications?.system_announcements ?? true,
              frequency: prefs.notifications?.frequency ?? 'immediate',
            },
            workflow: {
              default_landing_page: prefs.workflow?.default_landing_page ?? '/admin',
              remember_filters: prefs.workflow?.remember_filters ?? true,
              auto_select_org: prefs.workflow?.auto_select_org ?? true,
            },
            profile: {
              phone: prefs.profile?.phone ?? '',
              timezone: prefs.profile?.timezone ?? '',
            },
            advanced: {
              beta_features: prefs.advanced?.beta_features ?? false,
              ui_density: prefs.advanced?.ui_density ?? 'comfortable',
            },
          }
          
          setPreferences(validatedPrefs)
          setPhone(validatedPrefs.profile?.phone || '')
          setTimezone(validatedPrefs.profile?.timezone || '')
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    
    loadSettings()
  }, [user, profile, currentOrganization?.id]) // Watch currentOrganization changes
  
  // Debounced save handlers to prevent race conditions
  const debouncedSaveProfile = useDebounce(async () => {
    if (!user?.id) return
    
    setSavingProfile(true)
    setError(null)
    setProfileSuccess(false)
    
    try {
      // Update display_name in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ display_name: displayName } as any) // Type cast to handle auto-generated types
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      // Update phone and timezone in preferences
      const updatedPrefs: UserPreferences = {
        ...preferences,
        profile: {
          ...preferences.profile,
          phone,
          timezone,
        },
      }
      
      const { error: prefsError } = await updateUserPreferences(user.id, updatedPrefs)
      if (prefsError) throw prefsError
      
      // Refetch to ensure sync with server
      const { data: refreshedPrefs } = await getUserPreferences(user.id)
      if (refreshedPrefs) {
        setPreferences(refreshedPrefs)
      }
      
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }, 300)
  
  const handleSaveProfile = () => {
    debouncedSaveProfile()
  }
  
  // Handle notifications save with debouncing
  const debouncedSaveNotifications = useDebounce(async () => {
    if (!user?.id) return
    
    setSavingNotifications(true)
    setError(null)
    setNotificationSuccess(false)
    
    try {
      const { error: prefsError } = await updateUserPreferences(user.id, preferences)
      if (prefsError) throw prefsError
      
      // Refetch to sync
      const { data: refreshedPrefs } = await getUserPreferences(user.id)
      if (refreshedPrefs) {
        setPreferences(refreshedPrefs)
      }
      
      setNotificationSuccess(true)
      setTimeout(() => setNotificationSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to save notification preferences')
    } finally {
      setSavingNotifications(false)
    }
  }, 300)
  
  const handleSaveNotifications = () => {
    debouncedSaveNotifications()
  }
  
  // Handle workflow save with debouncing
  const debouncedSaveWorkflow = useDebounce(async () => {
    if (!user?.id) return
    
    setSavingWorkflow(true)
    setError(null)
    setWorkflowSuccess(false)
    
    try {
      const { error: prefsError } = await updateUserPreferences(user.id, preferences)
      if (prefsError) throw prefsError
      
      // Refetch to sync
      const { data: refreshedPrefs } = await getUserPreferences(user.id)
      if (refreshedPrefs) {
        setPreferences(refreshedPrefs)
      }
      
      setWorkflowSuccess(true)
      setTimeout(() => setWorkflowSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving workflow preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save workflow preferences')
    } finally {
      setSavingWorkflow(false)
    }
  }, 300)
  
  const handleSaveWorkflow = () => {
    debouncedSaveWorkflow()
  }
  
  // Handle advanced save with debouncing
  const debouncedSaveAdvanced = useDebounce(async () => {
    if (!user?.id) return
    
    setSavingAdvanced(true)
    setError(null)
    setAdvancedSuccess(false)
    
    try {
      const { error: prefsError } = await updateUserPreferences(user.id, preferences)
      if (prefsError) throw prefsError
      
      // Refetch to sync
      const { data: refreshedPrefs } = await getUserPreferences(user.id)
      if (refreshedPrefs) {
        setPreferences(refreshedPrefs)
      }
      
      setAdvancedSuccess(true)
      setTimeout(() => setAdvancedSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving advanced preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save advanced preferences')
    } finally {
      setSavingAdvanced(false)
    }
  }, 300)
  
  const handleSaveAdvanced = () => {
    debouncedSaveAdvanced()
  }
  
  // Validate password on change
  useEffect(() => {
    if (newPassword) {
      setPasswordValidation(validatePassword(newPassword))
    } else {
      setPasswordValidation(null)
    }
  }, [newPassword])
  
  // Handle password change with validation
  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      setError(validation.message)
      return
    }
    
    setChangingPassword(true)
    setError(null)
    setPasswordSuccess(false)
    
    try {
      const { error: pwError } = await updatePassword(newPassword)
      if (pwError) throw pwError
      
      setPasswordSuccess(true)
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordValidation(null)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      console.error('Error changing password:', err)
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }
  
  // Handle sign out all sessions
  const handleSignOutAll = async () => {
    if (!confirm('Are you sure you want to sign out of all sessions? You will need to log in again.')) {
      return
    }
    
    try {
      await supabase.auth.signOut({ scope: 'global' })
      window.location.href = '/login'
    } catch (err) {
      console.error('Error signing out:', err)
      setError('Failed to sign out')
    }
  }
  
  if (loading) {
    return (
      <div className="pa-page">
        <div className="pa-page-loading">Loading settings...</div>
      </div>
    )
  }
  
  return (
    <div className="pa-page">
      <PageHeader
        title="Personal Settings"
        description="Manage your account settings and preferences"
      />
      
      {error && (
        <div className="pa-alert pa-alert-error" style={{ marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}
      
      {/* Mobile Select for Tabs */}
      <div className="pa-tabs-mobile-select-container">
        <select 
          className="pa-tabs-mobile-select"
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
        >
          <option value="profile">Profile</option>
          <option value="roles">Role & Access</option>
          <option value="notifications">Notifications</option>
          <option value="workflow">Workflow</option>
          <option value="security">Security</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="pa-tabs">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="roles">Role & Access</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileSettings 
            displayName={displayName}
            setDisplayName={setDisplayName}
            phone={phone}
            setPhone={setPhone}
            timezone={timezone}
            setTimezone={setTimezone}
            timezoneOptions={timezoneOptions.current}
            profile={profile}
            onSave={handleSaveProfile}
            saving={savingProfile}
            success={profileSuccess}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RoleSettings 
            currentOrganization={currentOrganization} 
            profile={profile} 
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings 
            preferences={preferences} 
            setPreferences={setPreferences}
            onSave={handleSaveNotifications}
            saving={savingNotifications}
            success={notificationSuccess}
          />
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowSettings 
            preferences={preferences} 
            setPreferences={setPreferences}
            onSave={handleSaveWorkflow}
            saving={savingWorkflow}
            success={workflowSuccess}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings 
            user={user}
            onShowPasswordModal={() => setShowPasswordModal(true)}
            onSignOutAll={handleSignOutAll}
            passwordSuccess={passwordSuccess}
          />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSettings 
            preferences={preferences}
            setPreferences={setPreferences}
            onSave={handleSaveAdvanced}
            saving={savingAdvanced}
            success={advancedSuccess}
          />
        </TabsContent>
      </Tabs>
      
      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="pa-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="pa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pa-modal-header">
              <h2>Change Password</h2>
              <button
                className="pa-modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="pa-modal-content">
              <div className="pa-form-grid pa-form-grid-2">
                <div className="pa-form-group">
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
                      marginTop: '4px', 
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
                        <div style={{
                          width: passwordValidation.strength === 'weak' ? '33%' : passwordValidation.strength === 'medium' ? '66%' : '100%',
                          height: '100%',
                          background: passwordValidation.strength === 'weak' 
                            ? 'var(--pa-danger)' 
                            : passwordValidation.strength === 'medium' 
                            ? 'var(--pa-warning)' 
                            : 'var(--pa-success)',
                          transition: 'all 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>
                        {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pa-form-group">
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
                  />
                </div>
              </div>
            </div>
            <div className="pa-modal-footer">
              <Button
                onClick={() => setShowPasswordModal(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                variant="primary"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function ProfileSettings({ 
  displayName, 
  setDisplayName, 
  phone, 
  setPhone, 
  timezone, 
  setTimezone, 
  timezoneOptions,
  profile,
  onSave,
  saving,
  success 
}: any) {
  return (
    <Card>
      <div className="pa-card-header">
        <h3 className="pa-card-title">
          <span className="material-symbols-outlined">person</span>
          Profile
        </h3>
      </div>
      <div className="pa-card-content">
        <div className="pa-form-grid pa-form-grid-2">
          <div className="pa-form-group">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e: any) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              helper="How your name appears throughout the platform"
            />
          </div>
          
          <div className="pa-form-group">
            <Input
              label="Email"
              value={profile?.email || ''}
              disabled
              helper="Email is used for login and cannot be changed here"
            />
          </div>
          
          <div className="pa-form-group">
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              helper="Optional - used for account recovery and notifications"
            />
          </div>
          
          <div className="pa-form-group">
            <Select
              label="Timezone"
              value={timezone}
              onChange={(e: any) => setTimezone(e.target.value)}
              options={timezoneOptions}
              helper="Override organization timezone for your account"
            />
          </div>
        </div>
        
        <div className="pa-form-actions">
          <Button
            onClick={onSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
          {success && (
            <span className="pa-success-message">
              <span className="material-symbols-outlined">check_circle</span>
              Saved successfully
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function RoleSettings({ currentOrganization, profile }: any) {
  return (
    <Card>
      <div className="pa-card-header">
        <h3 className="pa-card-title">
          <span className="material-symbols-outlined">badge</span>
          Role & Access
        </h3>
      </div>
      <div className="pa-card-content">
        <div className="pa-info-section">
          <div className="pa-info-row">
            <span className="pa-info-label">Current Organization</span>
            <span className="pa-info-value">
              {currentOrganization?.name || 'No organization selected'}
            </span>
          </div>
          
          {currentOrganization && (
            <div className="pa-info-row">
              <span className="pa-info-label">Your Roles</span>
              <div className="pa-badges">
                {currentOrganization.roles?.map((role: string) => (
                  <span key={role} className="pa-badge pa-badge-primary">
                    {role === 'org_admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="pa-info-row">
            <span className="pa-info-label">All Organizations</span>
            <div className="pa-org-list">
              {profile?.organizations && profile.organizations.length > 0 ? (
                profile.organizations.map((org: any) => (
                  <div key={org.id} className="pa-org-item">
                    <span className="pa-org-name">{org.name}</span>
                    <div className="pa-badges">
                      {org.roles?.map((role: string) => (
                        <span key={role} className="pa-badge pa-badge-secondary">
                          {role === 'org_admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <span className="pa-text-muted">No organizations</span>
              )}
            </div>
          </div>
          
          {profile?.isPlatformAdmin && (
            <div className="pa-info-row">
              <span className="pa-badge pa-badge-success">
                <span className="material-symbols-outlined">admin_panel_settings</span>
                Platform Administrator
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function NotificationSettings({ preferences, setPreferences, onSave, saving, success }: any) {
  return (
    <Card>
      <div className="pa-card-header">
        <h3 className="pa-card-title">
          <span className="material-symbols-outlined">notifications</span>
          Notifications
        </h3>
      </div>
      <div className="pa-card-content">
        <div className="pa-form-section">
          <h4 className="pa-form-section-title">Channels</h4>
          <div className="pa-form-grid pa-form-grid-2">
            <div className="pa-form-group">
              <Checkbox
                label="Email notifications"
                checked={preferences.notifications?.email ?? true}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, email: e.target.checked }
                })}
              />
            </div>
            <div className="pa-form-group">
              <Checkbox
                label="Push notifications"
                checked={preferences.notifications?.push ?? false}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, push: e.target.checked }
                })}
                helperText="Browser notifications (if supported)"
              />
            </div>
          </div>
        </div>
        
        <div className="pa-form-section">
          <h4 className="pa-form-section-title">Events</h4>
          <div className="pa-form-grid pa-form-grid-2">
            <div className="pa-form-group">
              <Checkbox
                label="Attendance issues"
                checked={preferences.notifications?.attendance_issues ?? true}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, attendance_issues: e.target.checked }
                })}
              />
            </div>
            <div className="pa-form-group">
              <Checkbox
                label="Schedule changes"
                checked={preferences.notifications?.schedule_changes ?? true}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, schedule_changes: e.target.checked }
                })}
              />
            </div>
            <div className="pa-form-group">
              <Checkbox
                label="Payment issues"
                checked={preferences.notifications?.payment_issues ?? true}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, payment_issues: e.target.checked }
                })}
              />
            </div>
            <div className="pa-form-group">
              <Checkbox
                label="Registration activity"
                checked={preferences.notifications?.registration_activity ?? true}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, registration_activity: e.target.checked }
                })}
              />
            </div>
            <div className="pa-form-group">
              <Checkbox
                label="System announcements"
                checked={preferences.notifications?.system_announcements ?? true}
                onChange={(e: any) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, system_announcements: e.target.checked }
                })}
              />
            </div>
          </div>
        </div>
        
        <div className="pa-form-section">
          <h4 className="pa-form-section-title">Frequency</h4>
          <div className="pa-form-group pa-max-w-md">
            <Select
              label="Notification Frequency"
              value={preferences.notifications?.frequency || 'immediate'}
              onChange={(e: any) => setPreferences({
                ...preferences,
                notifications: { ...preferences.notifications, frequency: e.target.value as 'immediate' | 'daily' | 'weekly' }
              })}
              options={[
                { value: 'immediate', label: 'Immediate (as they happen)' },
                { value: 'daily', label: 'Daily digest' },
                { value: 'weekly', label: 'Weekly summary' },
              ]}
            />
          </div>
        </div>
        
        <div className="pa-form-actions">
          <Button
            onClick={onSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Notifications'}
          </Button>
          {success && (
            <span className="pa-success-message">
              <span className="material-symbols-outlined">check_circle</span>
              Saved successfully
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function WorkflowSettings({ preferences, setPreferences, onSave, saving, success }: any) {
  return (
    <Card>
      <div className="pa-card-header">
        <h3 className="pa-card-title">
          <span className="material-symbols-outlined">tune</span>
          Workflow Preferences
        </h3>
      </div>
      <div className="pa-card-content">
        <div className="pa-form-group">
          <Select
            label="Default Landing Page"
            value={preferences.workflow?.default_landing_page || '/admin'}
            onChange={(e: any) => setPreferences({
              ...preferences,
              workflow: { ...preferences.workflow, default_landing_page: e.target.value }
            })}
            options={[
              { value: '/admin', label: 'Dashboard' },
              { value: '/admin/organization/structure/teams', label: 'Teams' },
              { value: '/admin/athletes', label: 'Athletes' },
              { value: '/admin/families', label: 'Families' },
              { value: '/admin/attendance', label: 'Attendance' },
              { value: '/admin/events', label: 'Events' },
              { value: '/admin/payments', label: 'Payments' },
            ]}
            helper="Page to show after login"
          />
        </div>
        
        <div className="pa-form-group">
          <Checkbox
            label="Remember last selected filters"
            checked={preferences.workflow?.remember_filters ?? true}
            onChange={(e: any) => setPreferences({
              ...preferences,
              workflow: { ...preferences.workflow, remember_filters: e.target.checked }
            })}
            helperText="Restore your previous filter selections when returning to pages"
          />
        </div>
        
        <div className="pa-form-group">
          <Checkbox
            label="Auto-select last active organization"
            checked={preferences.workflow?.auto_select_org ?? true}
            onChange={(e: any) => setPreferences({
              ...preferences,
              workflow: { ...preferences.workflow, auto_select_org: e.target.checked }
            })}
            helperText="Automatically select the last organization you worked in"
          />
        </div>
        
        <div className="pa-form-actions">
          <Button
            onClick={onSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Workflow'}
          </Button>
          {success && (
            <span className="pa-success-message">
              <span className="material-symbols-outlined">check_circle</span>
              Saved successfully
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function SecuritySettings({ user, onShowPasswordModal, onSignOutAll, passwordSuccess }: any) {
  return (
    <Card>
      <div className="pa-card-header">
        <h3 className="pa-card-title">
          <span className="material-symbols-outlined">security</span>
          Security
        </h3>
      </div>
      <div className="pa-card-content">
        <div className="pa-form-group">
          <label className="pa-label">Password</label>
          <Button
            onClick={onShowPasswordModal}
            variant="secondary"
          >
            Change Password
          </Button>
          {passwordSuccess && (
            <div className="pa-alert pa-alert-success" style={{ marginTop: '1rem' }}>
              <span className="material-symbols-outlined">check_circle</span>
              Password changed successfully
            </div>
          )}
        </div>
        
        {user?.last_sign_in_at && (
          <div className="pa-info-row">
            <span className="pa-info-label">Last login</span>
            <span className="pa-info-value">
              {new Date(user.last_sign_in_at).toLocaleString()}
            </span>
          </div>
        )}
        
        <div className="pa-form-group">
          <label className="pa-label">Sessions</label>
          <Button
            onClick={onSignOutAll}
            variant="danger"
          >
            Sign Out All Sessions
          </Button>
          <p className="pa-helper-text">
            This will sign you out from all devices
          </p>
        </div>
      </div>
    </Card>
  )
}

function AdvancedSettings({ preferences, setPreferences, onSave, saving, success }: any) {
  return (
    <Card>
      <div className="pa-card-header">
        <h3 className="pa-card-title">
          <span className="material-symbols-outlined">science</span>
          Advanced
        </h3>
      </div>
      <div className="pa-card-content">
        <div className="pa-form-group">
          <Checkbox
            label="Enable beta features"
            checked={preferences.advanced?.beta_features ?? false}
            onChange={(e: any) => setPreferences({
              ...preferences,
              advanced: { ...preferences.advanced, beta_features: e.target.checked }
            })}
            helperText="Access experimental features (may be unstable)"
          />
        </div>
        
        <div className="pa-form-group">
          <Select
            label="UI Density"
            value={preferences.advanced?.ui_density || 'comfortable'}
            onChange={(e: any) => setPreferences({
              ...preferences,
              advanced: { ...preferences.advanced, ui_density: e.target.value as 'comfortable' | 'compact' }
            })}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            helper="Adjust spacing and sizing of interface elements"
          />
        </div>
        
        <div className="pa-form-actions">
          <Button
            onClick={onSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Advanced'}
          </Button>
          {success && (
            <span className="pa-success-message">
              <span className="material-symbols-outlined">check_circle</span>
              Saved successfully
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
