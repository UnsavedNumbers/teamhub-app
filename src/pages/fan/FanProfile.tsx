/**
 * Fan Profile Page
 * 
 * Profile overview with settings menu.
 * Links to sub-pages: Edit, Notifications, Linked Athletes, Privacy, Support
 * 
 * URL/ROUTE: /fan/profile
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getNotificationPreferences, 
  updateNotificationPreferences, 
  type NotificationPreferences 
} from '../../data/services/fanService'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AthleteAvatar from '../../components/portal/AthleteAvatar'
import { useUserContext } from '../../hooks/useUserContext'
import { showError, showSuccess } from '../../utils/toast'
import { supabase } from '../../lib/supabase'
import type { Athlete } from '../../types/family'
import '../../styles/fan.css'

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanProfile() {
  useDebugLifecycle('FanProfile')
  
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    setLoading(true)
    
    const { data: userData } = await supabase.auth.getUser()
    
    if (userData?.user) {
      setUser(userData.user)
      // Load additional profile data if needed
    }
    
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth/login')
  }

  if (loading) {
    return (
      <div className="fan-loading">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-page">
      <main className="fan-main">
        <div className="fan-container">
          {/* Profile Header */}
          <div className="fan-profile-header">
            <div className="fan-avatar fan-avatar-lg">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <span className="material-symbols-outlined">person</span>
              )}
            </div>
            <div className="fan-profile-info">
              <h1 className="fan-profile-name">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fan'}
              </h1>
              <p className="fan-profile-email">{user?.email}</p>
              <p className="fan-profile-joined">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
              </p>
            </div>
          </div>

          {/* Settings Menu */}
          <div className="fan-settings-menu">
        {/* Account Section */}
        <div className="fan-settings-section">
          <h2 className="fan-settings-section-title">Account</h2>
          
          <SettingsMenuItem
            icon="person"
            title="Edit Profile"
            subtitle="Update your name and profile photo"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE_EDIT))}
          />
          
          <SettingsMenuItem
            icon="mail"
            title="Email Address"
            subtitle={user?.email || 'Not set'}
            disabled
          />
          
          <SettingsMenuItem
            icon="lock"
            title="Change Password"
            subtitle="Update your password"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE_PASSWORD))}
          />
        </div>

        {/* Notifications Section */}
        <div className="fan-settings-section">
          <h2 className="fan-settings-section-title">Notifications</h2>
          
          <SettingsMenuItem
            icon="notifications"
            title="Notification Preferences"
            subtitle="Manage how you receive updates"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE_NOTIFICATIONS))}
          />
        </div>

        {/* Privacy Section */}
        <div className="fan-settings-section">
          <h2 className="fan-settings-section-title">Privacy & Security</h2>
          
          <SettingsMenuItem
            icon="visibility"
            title="Privacy Settings"
            subtitle="Control who can see your activity"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE_PRIVACY))}
          />
          
          <SettingsMenuItem
            icon="security"
            title="Security"
            subtitle="Two-factor authentication and security settings"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE_SECURITY))}
          />
        </div>

        {/* Support Section */}
        <div className="fan-settings-section">
          <h2 className="fan-settings-section-title">Support</h2>
          
          <SettingsMenuItem
            icon="help"
            title="Help Center"
            subtitle="Browse FAQs and guides"
            onClick={() => window.open('/help', '_blank')}
            external
          />
          
          <SettingsMenuItem
            icon="chat"
            title="Contact Support"
            subtitle="Get help from our team"
            onClick={() => window.open('/contact', '_blank')}
            external
          />
          
          <SettingsMenuItem
            icon="description"
            title="Terms of Service"
            subtitle="Read our terms and conditions"
            onClick={() => window.open('/terms', '_blank')}
            external
          />
          
          <SettingsMenuItem
            icon="shield"
            title="Privacy Policy"
            subtitle="How we protect your data"
            onClick={() => window.open('/privacy', '_blank')}
            external
          />
        </div>

        {/* Sign Out */}
        <div className="fan-settings-section">
          <button className="fan-settings-signout" onClick={handleSignOut}>
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>

          {/* App Version */}
          <div className="fan-settings-version">
            <p>YouthSports.team Fan App</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Settings Menu Item Component
 */
interface SettingsMenuItemProps {
  icon: string
  title: string
  subtitle?: string
  onClick?: () => void
  disabled?: boolean
  external?: boolean
}

function SettingsMenuItem({ icon, title, subtitle, onClick, disabled, external }: SettingsMenuItemProps) {
  return (
    <button 
      className={`fan-settings-item ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="fan-settings-item-icon material-symbols-outlined">{icon}</span>
      <div className="fan-settings-item-content">
        <span className="fan-settings-item-title">{title}</span>
        {subtitle && <span className="fan-settings-item-subtitle">{subtitle}</span>}
      </div>
      {!disabled && (
        <span className="fan-settings-item-arrow material-symbols-outlined">
          {external ? 'open_in_new' : 'chevron_right'}
        </span>
      )}
    </button>
  )
}

/**
 * Edit Profile Page
 * URL/ROUTE: /fan/profile/edit
 */
export function FanProfileEdit() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    setLoading(true)
    
    const { data: userData } = await supabase.auth.getUser()
    
    if (userData?.user) {
      setUser(userData.user)
      setFormData({
        full_name: userData.user.user_metadata?.full_name || '',
        phone: userData.user.user_metadata?.phone || '',
      })
    }
    
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: formData.full_name,
        phone: formData.phone,
      }
    })
    
    if (error) {
      showError(error.message)
    } else {
      showSuccess('Profile updated successfully')
      navigate(getLink(RouteKeys.FAN_PROFILE))
    }
    
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="fan-loading">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-page">
      <main className="fan-main">
        <div className="fan-container">
          {/* Back Button */}
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
            style={{ marginBottom: 'var(--spacing-6)' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Profile
          </button>

          {/* Page Header */}
          <div style={{ marginBottom: 'var(--spacing-8)' }}>
            <h1 style={{ 
              fontSize: 'var(--font-size-3xl)', 
              fontWeight: 'var(--font-weight-light)', 
              letterSpacing: 'var(--tracking-tight)', 
              color: 'var(--color-zinc-900)',
              marginBottom: 'var(--spacing-2)'
            }}>Edit Profile</h1>
          </div>

          <div className="fan-form-section">
        {/* Avatar Upload */}
        <div className="fan-form-avatar">
          <div className="fan-profile-avatar fan-profile-avatar-large">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" />
            ) : (
              <span className="material-symbols-outlined">person</span>
            )}
          </div>
          <button className="fan-btn fan-btn-secondary">
            <span className="material-symbols-outlined">photo_camera</span>
            Change Photo
          </button>
        </div>

        {/* Form Fields */}
        <div className="fan-form-group">
          <label className="fan-form-label">Full Name</label>
          <input
            type="text"
            className="fan-form-input"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Enter your full name"
          />
        </div>

        <div className="fan-form-group">
          <label className="fan-form-label">Email</label>
          <input
            type="email"
            className="fan-form-input"
            value={user?.email || ''}
            disabled
          />
          <p className="fan-form-helper">Email cannot be changed</p>
        </div>

        <div className="fan-form-group">
          <label className="fan-form-label">Phone Number</label>
          <input
            type="tel"
            className="fan-form-input"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter your phone number"
          />
        </div>

        {/* Save Button */}
        <div className="fan-form-actions" style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-8)' }}>
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
          >
            Cancel
          </button>
          <button 
            className="fan-btn fan-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="small" /> : 'Save Changes'}
          </button>
        </div>
        </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Notification Preferences Page
 * URL/ROUTE: /fan/profile/notifications
 */
export function FanProfileNotifications() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    
    const { data, error } = await getNotificationPreferences()
    
    if (error) {
      showError(error.message)
    } else if (data) {
      setPreferences(data)
    } else {
      // Set defaults
      setPreferences({
        user_id: '',
        email_enabled: true,
        push_enabled: true,
        schedule_changes_channel: 'real_time',
        ticket_updates_channel: 'real_time',
        announcements_channel: 'digest',
        photos_added_channel: 'digest',
        game_results_channel: 'digest',
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        muted_entities: [],
      })
    }
    
    setLoading(false)
  }

  const handleSave = async () => {
    if (!preferences) return

    setSaving(true)
    
    const { error } = await updateNotificationPreferences(preferences)
    
    if (error) {
      showError(error.message)
    } else {
      showSuccess('Notification preferences saved')
      navigate(getLink(RouteKeys.FAN_PROFILE))
    }
    
    setSaving(false)
  }

  const updatePref = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (loading) {
    return (
      <div className="fan-loading">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="fan-page">
        <main className="fan-main">
          <div className="fan-container">
            <div className="fan-empty-state">
              <span className="material-symbols-outlined fan-empty-icon">error</span>
              <h3 className="fan-empty-title">Failed to load preferences</h3>
              <button className="fan-btn fan-btn-primary" onClick={loadPreferences}>
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="fan-page">
      <main className="fan-main">
        <div className="fan-container">
          {/* Back Button */}
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
            style={{ marginBottom: 'var(--spacing-6)' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Profile
          </button>

          {/* Page Header */}
          <div style={{ marginBottom: 'var(--spacing-8)' }}>
            <h1 style={{ 
              fontSize: 'var(--font-size-3xl)', 
              fontWeight: 'var(--font-weight-light)', 
              letterSpacing: 'var(--tracking-tight)', 
              color: 'var(--color-zinc-900)',
              marginBottom: 'var(--spacing-2)'
            }}>Notification Preferences</h1>
            <p style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-zinc-500)',
              fontWeight: 'var(--font-weight-light)'
            }}>Control how and when you receive notifications</p>
          </div>

          <div className="fan-settings-form">
        {/* Master Toggles */}
        <div className="fan-settings-card">
          <h3 className="fan-settings-card-title">Notification Channels</h3>
          
          <div className="fan-toggle-row">
            <div className="fan-toggle-info">
              <span className="fan-toggle-title">Email Notifications</span>
              <span className="fan-toggle-description">Receive notifications via email</span>
            </div>
            <button
              className={`fan-toggle ${preferences.email_enabled ? 'active' : ''}`}
              onClick={() => updatePref('email_enabled', !preferences.email_enabled)}
            >
              <span className="fan-toggle-track" />
            </button>
          </div>

        </div>

        {/* Notification Types */}
        <div className="fan-settings-card">
          <h3 className="fan-settings-card-title">Notification Types</h3>
          
          <NotificationTypeRow
            title="Schedule Changes"
            description="When event times or locations change"
            value={preferences.schedule_changes_channel}
            onChange={(v) => updatePref('schedule_changes_channel', v)}
            disabled={!preferences.email_enabled}
          />
          
          <NotificationTypeRow
            title="Ticket Updates"
            description="Updates about your tickets and orders"
            value={preferences.ticket_updates_channel}
            onChange={(v) => updatePref('ticket_updates_channel', v)}
            disabled={!preferences.email_enabled}
          />
          
          <NotificationTypeRow
            title="Announcements"
            description="Important announcements from teams you follow"
            value={preferences.announcements_channel}
            onChange={(v) => updatePref('announcements_channel', v)}
            disabled={!preferences.email_enabled}
          />
          
          <NotificationTypeRow
            title="New Photos & Videos"
            description="When new media is added to galleries"
            value={preferences.photos_added_channel}
            onChange={(v) => updatePref('photos_added_channel', v)}
            disabled={!preferences.email_enabled}
          />
          
          <NotificationTypeRow
            title="Game Results"
            description="Scores and results from games"
            value={preferences.game_results_channel}
            onChange={(v) => updatePref('game_results_channel', v)}
            disabled={!preferences.email_enabled}
          />
        </div>

        {/* Quiet Hours */}
        <div className="fan-settings-card">
          <h3 className="fan-settings-card-title">Quiet Hours</h3>
          
          <div className="fan-toggle-row">
            <div className="fan-toggle-info">
              <span className="fan-toggle-title">Enable Quiet Hours</span>
              <span className="fan-toggle-description">Pause non-urgent notifications during set hours</span>
            </div>
            <button
              className={`fan-toggle ${preferences.quiet_hours_enabled ? 'active' : ''}`}
              onClick={() => updatePref('quiet_hours_enabled', !preferences.quiet_hours_enabled)}
            >
              <span className="fan-toggle-track" />
            </button>
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="fan-quiet-hours-times">
              <div className="fan-form-group">
                <label className="fan-form-label">Start Time</label>
                <input
                  type="time"
                  className="fan-form-input"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => updatePref('quiet_hours_start', e.target.value)}
                />
              </div>
              <div className="fan-form-group">
                <label className="fan-form-label">End Time</label>
                <input
                  type="time"
                  className="fan-form-input"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => updatePref('quiet_hours_end', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="fan-form-actions" style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-8)' }}>
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
          >
            Cancel
          </button>
          <button 
            className="fan-btn fan-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="small" /> : 'Save Preferences'}
          </button>
        </div>
        </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Notification Type Row Component
 */
interface NotificationTypeRowProps {
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function NotificationTypeRow({ title, description, value, onChange, disabled }: NotificationTypeRowProps) {
  return (
    <div className={`fan-notification-type-row ${disabled ? 'disabled' : ''}`}>
      <div className="fan-notification-type-info">
        <span className="fan-notification-type-title">{title}</span>
        <span className="fan-notification-type-description">{description}</span>
      </div>
      <select
        className="fan-notification-type-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="real_time">Real-time</option>
        <option value="digest">Daily Digest</option>
        <option value="off">Off</option>
      </select>
    </div>
  )
}

/**
 * Linked Athletes Page
 * URL/ROUTE: /fan/profile/linked-athletes
 */
export function FanProfileLinkedAthletes() {
  const navigate = useNavigate()
  const { context } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [linkedAthletes, setLinkedAthletes] = useState<any[]>([])
  const [showLinkModal, setShowLinkModal] = useState(false)

  useEffect(() => {
    loadLinkedAthletes()
  }, [])

  const loadLinkedAthletes = async () => {
    setLoading(true)
    // In production: fetch linked athletes from API
    setLinkedAthletes([])
    setLoading(false)
  }

  const handleUnlink = async (athleteId: string) => {
    // Optimistic update
    setLinkedAthletes(prev => prev.filter(a => a.id !== athleteId))
    // In production: call API to unlink
    showSuccess('Athlete unlinked')
  }

  if (loading) {
    return (
      <div className="fan-loading">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-page">
      <main className="fan-main">
        <div className="fan-container">
          {/* Back Button */}
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
            style={{ marginBottom: 'var(--spacing-6)' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Profile
          </button>

          {/* Page Header */}
          <div style={{ marginBottom: 'var(--spacing-8)' }}>
            <h1 style={{ 
              fontSize: 'var(--font-size-3xl)', 
              fontWeight: 'var(--font-weight-light)', 
              letterSpacing: 'var(--tracking-tight)', 
              color: 'var(--color-zinc-900)',
              marginBottom: 'var(--spacing-2)'
            }}>Linked Athletes</h1>
            <p style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-zinc-500)',
              fontWeight: 'var(--font-weight-light)'
            }}>Athletes connected to your account for enhanced access</p>
          </div>

          {/* Description */}
          <div className="fan-info-banner">
        <span className="material-symbols-outlined">info</span>
        <p>
          Linking athletes to your account gives you access to private galleries, 
          detailed schedules, and exclusive content that organizations share with family members.
        </p>
      </div>

          {linkedAthletes.length === 0 ? (
            <div className="fan-empty-state">
              <span className="material-symbols-outlined fan-empty-icon">family_restroom</span>
              <h3 className="fan-empty-title">No linked athletes</h3>
              <p className="fan-empty-text">Link athletes to access their private content and schedules</p>
              <button 
                className="fan-btn fan-btn-primary"
                onClick={() => setShowLinkModal(true)}
              >
                <span className="material-symbols-outlined">add</span>
                Link an Athlete
              </button>
            </div>
          ) : (
            <>
              <div className="fan-linked-athletes-list">
                {linkedAthletes.map((athlete) => (
                  <div key={athlete.id} className="fan-linked-athlete-card">
                    <div className="fan-linked-athlete-avatar">
                      <AthleteAvatar
                        athlete={{ id: athlete.id, first_name: athlete.first_name, last_name: athlete.last_name, org_id: athlete.org_id ?? context?.orgId, has_profile_photo: !!athlete.photo_url, profile_photo_updated_at: null } as unknown as Athlete}
                        photoSize="256"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="fan-linked-athlete-info">
                      <h3>{athlete.first_name} {athlete.last_name}</h3>
                      <p>{athlete.team_name}</p>
                      <span className="fan-linked-athlete-status">
                        {athlete.verified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                    <button 
                      className="fan-linked-athlete-remove"
                      onClick={() => handleUnlink(athlete.id)}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                className="fan-btn fan-btn-outline"
                onClick={() => setShowLinkModal(true)}
                style={{ width: '100%', marginTop: 'var(--spacing-6)' }}
              >
                <span className="material-symbols-outlined">add</span>
                Link Another Athlete
              </button>
            </>
          )}

          {/* Link Athlete Modal would go here */}
          {showLinkModal && (
            <LinkAthleteModal onClose={() => setShowLinkModal(false)} />
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Link Athlete Modal
 */
interface LinkAthleteModalProps {
  onClose: () => void
}

function LinkAthleteModal({ onClose }: LinkAthleteModalProps) {
  const [linkCode, setLinkCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!linkCode.trim()) {
      showError('Please enter a link code')
      return
    }

    setLoading(true)
    // In production: validate and link athlete using code
    setTimeout(() => {
      showError('Invalid link code. Please check and try again.')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="fan-modal-backdrop" onClick={onClose}>
      <div className="fan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fan-modal-header">
          <h2>Link an Athlete</h2>
          <button className="fan-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="fan-modal-body">
          <p className="fan-modal-description">
            Enter the link code provided by the athlete's organization or coach. 
            This code verifies your relationship to the athlete.
          </p>
          
          <div className="fan-form-group">
            <label className="fan-form-label">Link Code</label>
            <input
              type="text"
              className="fan-form-input"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., ABC123)"
              maxLength={10}
            />
          </div>
        </div>
        <div className="fan-modal-footer">
          <button className="fan-btn fan-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="fan-btn fan-btn-primary" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="small" /> : 'Link Athlete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Privacy Settings Page
 * URL/ROUTE: /fan/profile/privacy
 */
export function FanProfilePrivacy() {
  const navigate = useNavigate()
  
  const [settings, setSettings] = useState({
    profile_visible: true,
    show_following: true,
    allow_tags: true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // In production: save privacy settings
    setTimeout(() => {
      showSuccess('Privacy settings saved')
      setSaving(false)
    }, 500)
  }

  return (
    <div className="fan-page">
      <main className="fan-main">
        <div className="fan-container">
          {/* Back Button */}
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
            style={{ marginBottom: 'var(--spacing-6)' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Profile
          </button>

          {/* Page Header */}
          <div style={{ marginBottom: 'var(--spacing-8)' }}>
            <h1 style={{ 
              fontSize: 'var(--font-size-3xl)', 
              fontWeight: 'var(--font-weight-light)', 
              letterSpacing: 'var(--tracking-tight)', 
              color: 'var(--color-zinc-900)',
              marginBottom: 'var(--spacing-2)'
            }}>Privacy Settings</h1>
            <p style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-zinc-500)',
              fontWeight: 'var(--font-weight-light)'
            }}>Control who can see your information and activity</p>
          </div>

          <div className="fan-settings-form">
        <div className="fan-settings-card">
          <h3 className="fan-settings-card-title">Profile Visibility</h3>
          
          <div className="fan-toggle-row">
            <div className="fan-toggle-info">
              <span className="fan-toggle-title">Public Profile</span>
              <span className="fan-toggle-description">Allow others to see your profile</span>
            </div>
            <button
              className={`fan-toggle ${settings.profile_visible ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, profile_visible: !settings.profile_visible })}
            >
              <span className="fan-toggle-track" />
            </button>
          </div>

          <div className="fan-toggle-row">
            <div className="fan-toggle-info">
              <span className="fan-toggle-title">Show Following List</span>
              <span className="fan-toggle-description">Let others see who you follow</span>
            </div>
            <button
              className={`fan-toggle ${settings.show_following ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, show_following: !settings.show_following })}
            >
              <span className="fan-toggle-track" />
            </button>
          </div>
        </div>

        <div className="fan-settings-card">
          <h3 className="fan-settings-card-title">Photo Tags</h3>
          
          <div className="fan-toggle-row">
            <div className="fan-toggle-info">
              <span className="fan-toggle-title">Allow Tags in Photos</span>
              <span className="fan-toggle-description">Others can tag you in photos</span>
            </div>
            <button
              className={`fan-toggle ${settings.allow_tags ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, allow_tags: !settings.allow_tags })}
            >
              <span className="fan-toggle-track" />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="fan-form-actions" style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-8)' }}>
          <button 
            className="fan-btn fan-btn-outline"
            onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
          >
            Cancel
          </button>
          <button 
            className="fan-btn fan-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="small" /> : 'Save Settings'}
          </button>
        </div>
        </div>
        </div>
      </main>
    </div>
  )
}
