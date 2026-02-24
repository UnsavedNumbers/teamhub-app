import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useFeatureFlags } from '../../utils/featureFlags'
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
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '../../data/services/preferencesService'
import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../../data/config'
import { showSuccess, showError } from '../../utils/toast'
import { getLink, RouteKeys } from '../../utils/routes'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import NotificationPreferences from '../../components/common/NotificationPreferences'
import { mergeNotificationPreferences, loadNotificationGroupsFromRelational, convertNotificationGroupsToRelational } from '../../utils/notificationPreferencesConfig'
import { updatePreferencesBatch } from '../../data/services/userNotificationPreferencesService'
import type { NotificationGroup } from '../../types/notificationPreferences'
import type { NotificationRole } from '../../types/notifications'
import { useT } from '../../i18n/useI18n'
import '../../styles/orgAdmin.css'

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
  const { user, profile, updatePassword, updateEmail, refreshProfile } = useAuth()
  const { currentOrganization } = useOrganization()
  const t = useT()
  const translator = t as unknown as (key: string) => string
  
  // URL Persistence
  const [searchParams, setSearchParams] = useSearchParams()
  const { isEnabled, loading: flagsLoading } = useFeatureFlags(['orgadmin_advanced_personal_settings'])
  const showAdvancedTab = flagsLoading || isEnabled('orgadmin_advanced_personal_settings')
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
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Profile state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('')
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [notificationGroups, setNotificationGroups] = useState<NotificationGroup[]>([])
  const preferencesRef = useRef<UserPreferences | null>(null)
  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])
  
  // Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordValidation, setPasswordValidation] = useState<ReturnType<typeof validatePassword> | null>(null)
  
  // Email change state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [showEmailRetryBanner, setShowEmailRetryBanner] = useState(false)
  
  // Timezone options
  const timezoneOptions = useRef(getTimezoneOptions())

  const activeRole: NotificationRole = useMemo(() => {
    const roles = currentOrganization?.roles ?? []
    if (roles.includes('org_admin')) return 'org_admin'
    if (roles.includes('coach')) return 'coach'
    return 'guardian'
  }, [currentOrganization?.roles])

  const breadcrumbs = useMemo(() => {
    if (currentOrganization) {
      return [
        { label: currentOrganization.name, path: getLink(RouteKeys.ADMIN_DASHBOARD) },
        { label: 'Personal Settings' }
      ]
    }
    return [{ label: 'Personal Settings' }]
  }, [currentOrganization])
  
  // Load initial data
  useEffect(() => {
    async function loadSettings() {
      if (!user?.id) return
      
      setLoading(true)
      try {
        // Load user profile data
        if (profile) {
          setFirstName(profile.first_name || '')
          setLastName(profile.last_name || '')
          setPhone(profile.phone || '')
        }
        
        // Load user preferences with type safety
        const { data: prefs, error: prefsError } = await getUserPreferences(user.id)
        if (prefsError) {
          console.error('Error loading preferences:', prefsError)
          setError('Failed to load preferences')
          return
        }
        
        preferencesRef.current = prefs || {}

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

          // Load from relational service
          if (currentOrganization?.id && user.id) {
            try {
              const groups = await loadNotificationGroupsFromRelational(user.id, currentOrganization.id, activeRole, translator)
              setNotificationGroups(groups)
            } catch (err) {
              console.error('Error loading notification preferences:', err)
              const mergedGroups = mergeNotificationPreferences(undefined, activeRole, translator)
              setNotificationGroups(mergedGroups)
            }
          } else {
            const mergedGroups = mergeNotificationPreferences(undefined, activeRole, translator)
            setNotificationGroups(mergedGroups)
          }
        } else {
          const mergedGroups = mergeNotificationPreferences(undefined, activeRole, translator)
          setNotificationGroups(mergedGroups)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use user?.id (stable) not user (new object each auth check); profile excluded to avoid loops when refreshProfile fires
  }, [user?.id, currentOrganization?.id, activeRole, translator])
  
  // Refresh profile once when settings page mounts (so email is current after an email change). Omit refreshProfile from deps to avoid loop when profile updates.
  useEffect(() => {
    if (user?.id) {
      refreshProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run only when user id is set, not when refreshProfile reference changes
  }, [user?.id])

  // Show friendly message when redirected with email link error (expired or already used)
  useEffect(() => {
    const errorCode = searchParams.get('error_code')
    const errorParam = searchParams.get('error')
    if (errorCode === 'otp_expired' || errorParam === 'access_denied') {
      showError(
        'The confirmation link is invalid or was already used. Some email tools open links automatically, which uses the link before you click. Please try changing your email again and click the new link as soon as you receive it.'
      )
      setShowEmailRetryBanner(true)
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount to clear auth error from URL

  // Debounced save handlers to prevent race conditions
  const debouncedSaveProfile = useDebounce(async () => {
    if (!user?.id) return
    
    // Validation - Bug 3 prevention: trim and check length
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedPhone = phone.trim()

    if (trimmedFirstName.length === 0) {
      setError('First name is required')
      showError('First name is required')
      return
    }

    if (trimmedLastName.length === 0) {
      setError('Last name is required')
      showError('Last name is required')
      return
    }

    if (trimmedPhone.length === 0) {
      setError('Phone number is required')
      showError('Phone number is required')
      return
    }

    // Phone validation - Bug 6 prevention
    const phoneValidation = validatePhoneFormat(trimmedPhone)
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Invalid phone number')
      showError(phoneValidation.error || 'Invalid phone number')
      return
    }
    
    setSavingProfile(true)
    setError(null)
    
    try {
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
      } else {
        // Update first_name, last_name, phone, and display_name in users table
        // Bug 4 prevention: Use updated_at for optimistic conflict detection
        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            phone: trimmedPhone,
            display_name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
          } as any) // Type cast to handle auto-generated types
          .eq('id', user.id)

        if (updateError) throw updateError
      }
      
      // Update timezone in preferences (phone is now in users table)
      const updatedPrefs: UserPreferences = {
        ...preferences,
        profile: {
          ...preferences.profile,
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
      
      // Refresh profile to get updated data
      await refreshProfile()
      
      showSuccess('Profile updated successfully!')
    } catch (err) {
      console.error('Error saving profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSavingProfile(false)
    }
  }, 300)
  
  const handleSaveProfile = () => {
    debouncedSaveProfile()
  }

  const persistNotificationGroups = useCallback(
    async (nextGroups: NotificationGroup[], previousGroups?: NotificationGroup[]) => {
      if (!user?.id || !currentOrganization?.id) return
      setSavingNotifications(true)
      try {
        // Convert NotificationGroups to relational preferences format
        const preferences = await convertNotificationGroupsToRelational(nextGroups, activeRole)
        
        // Save to relational table
        const { error } = await updatePreferencesBatch(user.id, currentOrganization.id, activeRole, preferences)
        
        if (error) {
          if (error.message?.includes('no active template')) {
            showError('Email notifications are not available for some notification types')
          } else {
            throw error
          }
          if (previousGroups) setNotificationGroups(previousGroups)
          return
        }
        
        showSuccess(t('toast.success.notificationPreferencesUpdated'))
      } catch (err) {
        console.error('Error saving notifications:', err)
        if (previousGroups) setNotificationGroups(previousGroups)
        const errorMessage = err instanceof Error ? err.message : 'Failed to save notification preferences'
        setError(errorMessage)
        showError(errorMessage)
      } finally {
        setSavingNotifications(false)
      }
    },
    [activeRole, currentOrganization?.id, t, user?.id]
  )

  const handleToggleGroupAll = useCallback(
    (groupId: NotificationGroup['id'], next: boolean) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId
            ? { ...group, allEnabled: next, actions: group.actions.map((a) => ({ ...a, enabled: next })) }
            : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleToggleGroupDigest = useCallback(
    (groupId: NotificationGroup['id'], next: boolean) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) => (group.id === groupId ? { ...group, digestEnabled: next } : group))
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleToggleAction = useCallback(
    (groupId: NotificationGroup['id'], actionId: string, next: boolean) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                actions: group.actions.map((a) => (a.id === actionId ? { ...a, enabled: next } : a)),
              }
            : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleToggleChannel = useCallback(
    (groupId: NotificationGroup['id'], channel: 'in_app' | 'email' | 'push', next: boolean) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                channels: next
                  ? Array.from(new Set([...group.channels, channel]))
                  : group.channels.filter((ch) => ch !== channel),
              }
            : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleUpdateDigestWindow = useCallback(
    (groupId: NotificationGroup['id'], window: 'daily' | 'weekly') => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId ? { ...group, digestWindow: window } : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleToggleQuietHours = useCallback(
    (groupId: NotificationGroup['id'], enabled: boolean) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                quietHoursEnabled: enabled,
                quietHoursStart: enabled ? group.quietHoursStart || '22:00' : undefined,
                quietHoursEnd: enabled ? group.quietHoursEnd || '08:00' : undefined,
              }
            : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleUpdateQuietHours = useCallback(
    (groupId: NotificationGroup['id'], start: string, end: string) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId ? { ...group, quietHoursStart: start, quietHoursEnd: end } : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )

  const handleUpdateTimezone = useCallback(
    (groupId: NotificationGroup['id'], timezone: string) => {
      setNotificationGroups((prev) => {
        const updated = prev.map((group) =>
          group.id === groupId ? { ...group, timezone } : group
        )
        void persistNotificationGroups(updated, prev)
        return updated
      })
    },
    [persistNotificationGroups]
  )
  
  // Handle workflow save with debouncing
  const debouncedSaveWorkflow = useDebounce(async () => {
    if (!user?.id) return
    
    setSavingWorkflow(true)
    setError(null)
    
    try {
      const { error: prefsError } = await updateUserPreferences(user.id, preferences)
      if (prefsError) throw prefsError
      
      // Refetch to sync
      const { data: refreshedPrefs } = await getUserPreferences(user.id)
      if (refreshedPrefs) {
        setPreferences(refreshedPrefs)
      }
      
      showSuccess('Workflow preferences updated successfully!')
    } catch (err) {
      console.error('Error saving workflow preferences:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workflow preferences'
      setError(errorMessage)
      showError(errorMessage)
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
    
    try {
      const { error: prefsError } = await updateUserPreferences(user.id, preferences)
      if (prefsError) throw prefsError
      
      // Refetch to sync
      const { data: refreshedPrefs } = await getUserPreferences(user.id)
      if (refreshedPrefs) {
        setPreferences(refreshedPrefs)
      }
      
      showSuccess('Advanced preferences updated successfully!')
    } catch (err) {
      console.error('Error saving advanced preferences:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save advanced preferences'
      setError(errorMessage)
      showError(errorMessage)
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
  
  // Handle email change with validation
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
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
      } else {
        const { error } = await updateEmail(newEmail, '/admin/settings')
        if (error) throw error
      }
      
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
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
      } else {
        const { error: pwError } = await updatePassword(newPassword)
        if (pwError) throw pwError
      }
      
      showSuccess('Password changed successfully!')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordValidation(null)
      setPasswordSuccess(true)
    } catch (err) {
      console.error('Error changing password:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setChangingPassword(false)
    }
  }
  
  const [showSignOutAllDialog, setShowSignOutAllDialog] = useState(false)

  // Handle sign out all sessions
  const handleSignOutAll = async () => {
    try {
      if (!USE_FAKE_DATA) {
        await supabase.auth.signOut({ scope: 'global' })
      }
      window.location.href = '/login'
    } catch (err) {
      console.error('Error signing out:', err)
      setError('Failed to sign out')
      setShowSignOutAllDialog(false)
    }
  }
  
  if (loading) {
    return (
      <div className="oa-page">
        <div className="oa-page-loading">Loading settings...</div>
      </div>
    )
  }
  
  return (
    <div className="oa-root">
      <AdminPageHeader
        title="Personal Settings"
        subtitle="Manage your account settings and preferences"
        breadcrumbs={breadcrumbs}
      />
      
      
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
          <TabsTrigger value="roles">Role & Access</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {showAdvancedTab && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileSettings 
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            phone={phone}
            setPhone={setPhone}
            timezone={timezone}
            setTimezone={setTimezone}
            timezoneOptions={timezoneOptions.current}
            profile={profile}
            displayEmail={user?.email ?? profile?.email ?? null}
            onSave={handleSaveProfile}
            saving={savingProfile}
            onShowEmailModal={() => setShowEmailModal(true)}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RoleSettings 
            currentOrganization={currentOrganization} 
            profile={profile} 
          />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <h3 className="oa-h3 oa-mb-4">{t('portal.settings.notifications.title')}</h3>
            <p className="oa-text-muted oa-mb-4">
              {t('portal.settings.notifications.toggles.individual')}
            </p>
            <NotificationPreferences
              role={activeRole}
              groups={notificationGroups}
              onToggleGroupAll={handleToggleGroupAll}
              onToggleGroupDigest={handleToggleGroupDigest}
              onToggleAction={handleToggleAction}
              onToggleChannel={handleToggleChannel}
              onUpdateDigestWindow={handleUpdateDigestWindow}
              onToggleQuietHours={handleToggleQuietHours}
              onUpdateQuietHours={handleUpdateQuietHours}
              onUpdateTimezone={handleUpdateTimezone}
              saving={savingNotifications}
            />
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowSettings 
            preferences={preferences} 
            setPreferences={setPreferences}
            onSave={handleSaveWorkflow}
            saving={savingWorkflow}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings 
            user={user}
            profile={profile}
            displayEmail={user?.email ?? profile?.email ?? null}
            onShowPasswordModal={() => setShowPasswordModal(true)}
            onShowEmailModal={() => setShowEmailModal(true)}
            onSignOutAll={() => setShowSignOutAllDialog(true)}
            passwordSuccess={passwordSuccess}
          />
        </TabsContent>

        {showAdvancedTab && (
          <TabsContent value="advanced">
            <AdvancedSettings 
              preferences={preferences}
              setPreferences={setPreferences}
              onSave={handleSaveAdvanced}
              saving={savingAdvanced}
            />
          </TabsContent>
        )}
      </Tabs>
      
      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="oa-modal-overlay" onClick={() => setShowEmailModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div className="oa-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--oa-bg, #fff)', borderRadius: '8px', maxWidth: '28rem', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
            <div className="oa-modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--oa-border, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Change Email</h2>
              <button
                type="button"
                className="oa-modal-close"
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailError(null)
                  setNewEmail('')
                  setConfirmEmail('')
                }}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="oa-modal-content" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto' }}>
              <div className="oa-form-group oa-mb-4">
                <p className="oa-text-muted">
                  Current email: <strong>{user?.email ?? profile?.email}</strong>
                </p>
              </div>
              <div className="oa-form-grid oa-form-grid-2">
                <div className="oa-form-group">
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
                <div className="oa-form-group">
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
                <div className="oa-alert oa-alert-error" style={{ marginTop: '1rem', background: 'var(--oa-danger-bg)', color: 'var(--oa-danger)', padding: '1rem', borderRadius: '8px' }}>
                  {emailError}
                </div>
              )}
              <div className="oa-form-group oa-mt-4">
                <p className="oa-text-muted oa-text-sm">
                  A confirmation link will be sent to your new email address. Click that link to complete the change.
                </p>
              </div>
            </div>
            <div className="oa-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--oa-border, #e5e7eb)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0 }}>
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
        </div>
      )}
      
      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="oa-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="oa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oa-modal-header">
              <h2>Change Password</h2>
              <button
                className="oa-modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="oa-modal-content">
              <div className="oa-form-grid oa-form-grid-2">
                <div className="oa-form-group">
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
                        ? 'var(--oa-success)' 
                        : passwordValidation.strength === 'medium' 
                        ? 'var(--oa-warning)' 
                        : 'var(--oa-danger)'
                    }}>
                      <div style={{ 
                        flex: 1, 
                        height: '4px', 
                        background: 'var(--oa-n200)', 
                        borderRadius: '2px', 
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: passwordValidation.strength === 'weak' ? '33%' : passwordValidation.strength === 'medium' ? '66%' : '100%',
                          height: '100%',
                          background: passwordValidation.strength === 'weak' 
                            ? 'var(--oa-danger)' 
                            : passwordValidation.strength === 'medium' 
                            ? 'var(--oa-warning)' 
                            : 'var(--oa-success)',
                          transition: 'all 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>
                        {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="oa-form-group">
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
            <div className="oa-modal-footer">
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

      {/* Sign Out All Sessions Confirmation Dialog */}
      <ConfirmDialog
        open={showSignOutAllDialog}
        title="Sign Out All Sessions"
        description="Are you sure you want to sign out from all devices? You will need to sign in again on all devices."
        confirmLabel="Sign Out All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleSignOutAll}
        onCancel={() => setShowSignOutAllDialog(false)}
      />
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function ProfileSettings({ 
  firstName, 
  setFirstName,
  lastName,
  setLastName,
  phone, 
  setPhone, 
  timezone, 
  setTimezone, 
  timezoneOptions,
  profile,
  displayEmail,
  onSave,
  saving,
  onShowEmailModal
}: any) {
  return (
    <Card>
      <h3 className="oa-h3 oa-mb-4">Profile</h3>
      <div className="oa-form-grid oa-form-grid-2">
        <div className="oa-form-group">
          <Input
            label="First Name"
            value={firstName}
            onChange={(e: any) => setFirstName(e.target.value)}
            placeholder="John"
            required
            maxLength={100}
            helper="Your first name"
          />
        </div>
        
        <div className="oa-form-group">
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e: any) => setLastName(e.target.value)}
            placeholder="Smith"
            required
            maxLength={100}
            helper="Your last name"
          />
        </div>
        
        <div className="oa-form-group">
          <label className="oa-label">Email</label>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--oa-text, #111)' }}>
              {displayEmail ?? profile?.email ?? 'No email set'}
            </span>
            <button
              type="button"
              className="oa-link-button"
              onClick={() => typeof onShowEmailModal === 'function' && onShowEmailModal()}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--org-link-color, #137fec)', textDecoration: 'underline' }}
            >
              Change email
            </button>
          </div>
        </div>
        
        <div className="oa-form-group">
          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e: any) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            required
            maxLength={20}
            helper="Required - used for account recovery and notifications"
          />
        </div>
        
        <div className="oa-form-group">
          <Select
            label="Timezone"
            value={timezone}
            onChange={(e: any) => setTimezone(e.target.value)}
            options={timezoneOptions}
            helper="Override organization timezone for your account"
          />
        </div>
      </div>
      
      <div className="oa-form-actions">
        <Button
          onClick={onSave}
          disabled={saving}
          variant="primary"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </Card>
  )
}

function RoleSettings({ currentOrganization, profile }: any) {
  return (
    <Card>
      <h3 className="oa-h3 oa-mb-4">Role & Access</h3>
      
      <div className="oa-info-section">
        <div className="oa-info-row">
          <span className="oa-info-label">Current Organization</span>
          <span className="oa-info-value">
            {currentOrganization?.name || 'No organization selected'}
          </span>
        </div>
        
        {currentOrganization && (
          <div className="oa-info-row">
            <span className="oa-info-label">Your Roles</span>
            <div className="oa-badges">
              {currentOrganization.roles?.map((role: string) => (
                <span key={role} className="oa-badge oa-badge-primary">
                  {role === 'org_admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="oa-info-row">
          <span className="oa-info-label">All Organizations</span>
          <div className="oa-org-list">
            {profile?.organizations && profile.organizations.length > 0 ? (
              profile.organizations.map((org: any) => (
                <div key={org.id} className="oa-org-item">
                  <span className="oa-org-name">{org.name}</span>
                  <div className="oa-badges">
                    {org.roles?.map((role: string) => (
                      <span key={role} className="oa-badge oa-badge-secondary">
                        {role === 'org_admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <span className="oa-text-muted">No organizations</span>
            )}
          </div>
        </div>
        
        {profile?.isPlatformAdmin && (
          <div className="oa-info-row">
            <span className="oa-badge oa-badge-success">
              <span className="material-symbols-outlined">admin_panel_settings</span>
              Platform Administrator
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

function WorkflowSettings({ preferences, setPreferences, onSave, saving }: any) {
  return (
    <Card>
      <h3 className="oa-h3 oa-mb-4">Workflow Preferences</h3>
      <div className="oa-form-group">
        <Select
          label="Default Landing Page"
          value={preferences.workflow?.default_landing_page || '/admin'}
          onChange={(e: any) => setPreferences({
            ...preferences,
            workflow: { ...preferences.workflow, default_landing_page: e.target.value }
          })}
          options={[
            { value: '/admin', label: 'Dashboard' },
            { value: getLink('admin.teams.list'), label: 'Teams' },
            { value: getLink('admin.athletes.list'), label: 'Athletes' },
            { value: getLink('admin.guardians.list'), label: 'Guardians' },
            { value: '/admin/attendance', label: 'Attendance' },
            { value: '/admin/events', label: 'Events' },
            { value: '/admin/payments', label: 'Payments' },
          ]}
          helper="Page to show after login"
        />
      </div>
      
      <div className="oa-form-group">
        <Checkbox
          label="Remember last selected filters"
          checked={preferences.workflow?.remember_filters ?? true}
          onChange={(e: any) => setPreferences({
            ...preferences,
            workflow: { ...preferences.workflow, remember_filters: e.target.checked }
          })}
          helper="Restore your previous filter selections when returning to pages"
        />
      </div>
      
      <div className="oa-form-group">
        <Checkbox
          label="Auto-select last active organization"
          checked={preferences.workflow?.auto_select_org ?? true}
          onChange={(e: any) => setPreferences({
            ...preferences,
            workflow: { ...preferences.workflow, auto_select_org: e.target.checked }
          })}
          helper="Automatically select the last organization you worked in"
        />
      </div>
      
      <div className="oa-form-actions">
        <Button
          onClick={onSave}
          disabled={saving}
          variant="primary"
        >
          {saving ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>
    </Card>
  )
}

function SecuritySettings({ user, profile, displayEmail, onShowPasswordModal, onShowEmailModal, onSignOutAll, passwordSuccess }: any) {
  return (
    <Card>
      <h3 className="oa-h3 oa-mb-4">Security</h3>
        
      <div className="oa-form-group">
        <label className="oa-label">Email</label>
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--oa-text, #111)' }}>
            {displayEmail ?? profile?.email ?? 'No email set'}
          </span>
          <button
            type="button"
            className="oa-link-button"
            onClick={onShowEmailModal}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--org-link-color, #137fec)', textDecoration: 'underline' }}
          >
            Change email
          </button>
        </div>
      </div>
      
      <div className="oa-form-group">
        <label className="oa-label">Password</label>
        <Button
          onClick={onShowPasswordModal}
          variant="secondary"
        >
          Change Password
        </Button>
        {passwordSuccess && (
          <div className="oa-alert oa-alert-success" style={{ marginTop: '1rem', background: 'var(--oa-success-bg)', color: 'var(--oa-success)', padding: '1rem', borderRadius: '8px' }}>
            <span className="material-symbols-outlined">check_circle</span>
            Password changed successfully
          </div>
        )}
      </div>
      
      {user?.last_sign_in_at && (
        <div className="oa-info-row">
          <span className="oa-info-label">Last login</span>
          <span className="oa-info-value">
            {new Date(user.last_sign_in_at).toLocaleString()}
          </span>
        </div>
      )}
      
      <div className="oa-form-group">
        <label className="oa-label">Sessions</label>
        <Button
          onClick={onSignOutAll}
          variant="danger"
        >
          Sign Out All Sessions
        </Button>
        <p className="oa-helper-text">
          This will sign you out from all devices
        </p>
      </div>
    </Card>
  )
}

function AdvancedSettings({ preferences, setPreferences, onSave, saving }: any) {
  return (
    <Card>
      <h3 className="oa-h3 oa-mb-4">Advanced</h3>
      
      <div className="oa-form-group">
        <Checkbox
          label="Enable beta features"
          checked={preferences.advanced?.beta_features ?? false}
          onChange={(e: any) => setPreferences({
            ...preferences,
            advanced: { ...preferences.advanced, beta_features: e.target.checked }
          })}
          helper="Access experimental features (may be unstable)"
        />
      </div>
      
      <div className="oa-form-group">
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
      
      <div className="oa-form-actions">
        <Button
          onClick={onSave}
          disabled={saving}
          variant="primary"
        >
          {saving ? 'Saving...' : 'Save Advanced'}
        </Button>
      </div>
    </Card>
  )
}

