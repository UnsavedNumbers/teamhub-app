import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { getAthletes } from '../data/services/familyService'
import { getTeamsForParent } from '../data/services/teamsService'
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '../data/services/preferencesService'
import { 
  linkGuardianToAthlete, 
  validateGuardianEmail, 
  getAthleteGuardians, 
  getAthleteInvites, 
  cancelInvite, 
  resendInvite 
} from '../data/services/guardianService'
import { checkGuardianMatch, debounce } from '../utils/guardianMatching'
import type { GuardianMatch, Guardian, PendingGuardianInvite } from '../types/family'
import { useT, useLocale } from '../i18n/useI18n'
import type { Locale } from '../i18n'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { ThemeSelector } from '../components/portal/ThemeToggle'
import NotificationPreferences from '../components/common/NotificationPreferences'
import type { NotificationGroup } from '../types/notificationPreferences'
import type { NotificationRole } from '../types/notifications'
import { mergeNotificationPreferences, setPreferencesForContext, canonicalRole } from '../utils/notificationPreferencesConfig'
import { showSuccess, showError } from '../utils/toast'
import { CheckCircle, Mail, Loader2, AlertCircle } from 'lucide-react'

interface Child {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
}

interface Team {
  id: string
  name: string
}

interface ChildWithGuardians extends Child {
  guardians: Guardian[]
  pendingInvites: PendingGuardianInvite[]
}

export default function Settings() {
  const { profile, signOut, updatePassword, user } = useAuth()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const translator = t as unknown as (key: string) => string
  const { locale, setLocale } = useLocale()
  const isMountedRef = useRef(true)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const preferencesRef = useRef<UserPreferences | null>(null)
  
  const [children, setChildren] = useState<ChildWithGuardians[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const [notificationGroups, setNotificationGroups] = useState<NotificationGroup[]>([])
  const [savingNotifications, setSavingNotifications] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  // Invite Guardian Modal State
  const [showInviteGuardianModal, setShowInviteGuardianModal] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianMatch, setGuardianMatch] = useState<GuardianMatch | null>(null)
  const [isCheckingGuardian, setIsCheckingGuardian] = useState(false)
  const [isInvitingGuardian, setIsInvitingGuardian] = useState(false)
  const [inviteGuardianError, setInviteGuardianError] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null)

  const activeRole: NotificationRole = useMemo(
    () => canonicalRole((context.roles?.[0] as NotificationRole) || 'guardian'),
    [context.roles]
  )

  // Cleanup ref on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    if (!isReady || !user?.id) return
    
    setLoading(true)
    
    // Fetch children
    const { data: childrenData } = await getAthletes(context)
    
    // For each child, fetch their guardians and pending invites
    const childrenWithGuardians: ChildWithGuardians[] = await Promise.all(
      childrenData.map(async (c) => {
        const [guardiansResult, invitesResult] = await Promise.all([
          getAthleteGuardians(c.id, context.orgId),
          getAthleteInvites(c.id, context.orgId)
        ])
        
        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          date_of_birth: c.date_of_birth,
          guardians: guardiansResult.data || [],
          pendingInvites: (invitesResult.data || []).map(invite => ({
            id: invite.id,
            email: invite.email,
            status: invite.status,
            expires_at: invite.expires_at,
            created_at: invite.created_at,
            token: invite.token
          }))
        }
      })
    )
    
    setChildren(childrenWithGuardians)

    // Fetch teams
    const { data: teamsData } = await getTeamsForParent(context)
    setTeams(teamsData.map(t => ({
      id: t.id,
      name: t.name,
    })))

    // Load notification preferences
    const { data: prefs } = await getUserPreferences(user.id)
    preferencesRef.current = prefs || {}
    const savedGroups = prefs?.notifications_v2?.[context.orgId]?.[activeRole]
    const mergedGroups = mergeNotificationPreferences(savedGroups as NotificationGroup[] | undefined, activeRole, translator)
    setNotificationGroups(mergedGroups)

    setLoading(false)
  }, [context, isReady, user?.id, activeRole, translator])

  useEffect(() => {
    if (isReady) fetchData()
  }, [isReady, fetchData])

  // Debounced guardian email check
  const debouncedCheckGuardian = useMemo(
    () => debounce(async (email: string, orgId: string) => {
      if (!email || !validateGuardianEmail(email)) {
        setGuardianMatch(null)
        setIsCheckingGuardian(false)
        return
      }

      setIsCheckingGuardian(true)
      setInviteGuardianError(null)

      try {
        const match = await checkGuardianMatch(email, orgId)
        if (isMountedRef.current) {
          setGuardianMatch(match)
          // Check if already linked to selected child
          if (match && match.exists && selectedChildId) {
            const isAlreadyLinked = match.linkedAthletes.some(a => a.id === selectedChildId)
            if (isAlreadyLinked) {
              setInviteGuardianError(t('admin.athletes.guardians.alreadyLinked'))
            }
          }
        }
      } catch (err) {
        console.error('Error checking guardian:', err)
        if (isMountedRef.current) {
          setInviteGuardianError(t('admin.athletes.guardians.checkError'))
        }
      } finally {
        if (isMountedRef.current) {
          setIsCheckingGuardian(false)
        }
      }
    }, 300),
    [selectedChildId, t]
  )

  // Check guardian when email changes
  useEffect(() => {
    if (emailTouched && guardianEmail && showInviteGuardianModal) {
      debouncedCheckGuardian(guardianEmail, context.orgId)
    }
  }, [guardianEmail, context.orgId, emailTouched, showInviteGuardianModal, debouncedCheckGuardian])

  // Autofocus email input when modal opens
  useEffect(() => {
    if (showInviteGuardianModal && emailInputRef.current) {
      setTimeout(() => {
        emailInputRef.current?.focus()
      }, 100)
    }
  }, [showInviteGuardianModal])

  // Reset modal state when closed
  useEffect(() => {
    if (!showInviteGuardianModal) {
      setGuardianEmail('')
      setGuardianMatch(null)
      setInviteGuardianError(null)
      setEmailTouched(false)
      setIsCheckingGuardian(false)
      setIsInvitingGuardian(false)
      setSelectedChildId(null)
    }
  }, [showInviteGuardianModal])

  const handleOpenInviteModal = useCallback((childId: string) => {
    setSelectedChildId(childId)
    setShowInviteGuardianModal(true)
  }, [])

  const handleCloseInviteModal = useCallback(() => {
    if (isInvitingGuardian) return // Prevent closing while inviting
    setShowInviteGuardianModal(false)
  }, [isInvitingGuardian])

  const handleInviteGuardian = useCallback(async () => {
    if (!selectedChildId || !guardianEmail || !validateGuardianEmail(guardianEmail)) {
      setInviteGuardianError(t('admin.athletes.guardians.invalidEmail'))
      return
    }

    // Check if already linked
    if (guardianMatch && guardianMatch.exists && selectedChildId) {
      const isAlreadyLinked = guardianMatch.linkedAthletes.some(a => a.id === selectedChildId)
      if (isAlreadyLinked) {
        setInviteGuardianError(t('admin.athletes.guardians.alreadyLinked'))
        return
      }
    }

    setIsInvitingGuardian(true)
    setInviteGuardianError(null)

    try {
      const { error } = await linkGuardianToAthlete(
        selectedChildId,
        guardianEmail,
        context.orgId,
        'parent'
      )

      if (error) {
        if (isMountedRef.current) {
          setInviteGuardianError(error.message || t('admin.athletes.guardians.linkError'))
        }
        return
      }

      // Refresh children data to get updated guardians/invites
      await fetchData()

      // Reset form state and close modal
      if (isMountedRef.current) {
        setShowInviteGuardianModal(false)
      }
    } catch (err) {
      console.error('Error inviting guardian:', err)
      if (isMountedRef.current) {
        setInviteGuardianError(err instanceof Error ? err.message : t('admin.athletes.guardians.linkError'))
      }
    } finally {
      if (isMountedRef.current) {
        setIsInvitingGuardian(false)
      }
    }
  }, [selectedChildId, guardianEmail, guardianMatch, context.orgId, t, fetchData])

  const handleCancelInvite = useCallback(async (inviteId: string) => {
    if (inviteActionLoading) return
    
    setInviteActionLoading(inviteId)
    
    try {
      const { success, error } = await cancelInvite(inviteId)
      
      if (error || !success) {
        console.error('Error canceling invite:', error)
        setInviteActionLoading(null)
        return
      }
      
      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error canceling invite:', err)
    } finally {
      if (isMountedRef.current) {
        setInviteActionLoading(null)
      }
    }
  }, [inviteActionLoading, fetchData])

  const handleResendInvite = useCallback(async (inviteId: string) => {
    if (inviteActionLoading) return
    
    setInviteActionLoading(inviteId)
    
    try {
      const { success, error } = await resendInvite(inviteId)
      
      if (error || !success) {
        console.error('Error resending invite:', error)
        setInviteActionLoading(null)
        return
      }
      
      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error resending invite:', err)
    } finally {
      if (isMountedRef.current) {
        setInviteActionLoading(null)
      }
    }
  }, [inviteActionLoading, fetchData])

  async function handleLogout() {
    await signOut()
    navigate('/portal/login')
  }

  const persistNotificationGroups = useCallback(
    async (nextGroups: NotificationGroup[], previousGroups?: NotificationGroup[]) => {
      if (!user?.id) return
      setSavingNotifications(true)
      try {
        const nextPrefs = setPreferencesForContext(
          preferencesRef.current?.notifications_v2,
          context.orgId,
          activeRole,
          nextGroups
        )
        const { error } = await updateUserPreferences(user.id, { notifications_v2: nextPrefs })
        if (error) throw error
        preferencesRef.current = { ...(preferencesRef.current || {}), notifications_v2: nextPrefs }
        showSuccess(t('toast.success.notificationPreferencesUpdated'))
      } catch (err) {
        console.error('Error saving notification preferences:', err)
        if (previousGroups) {
          setNotificationGroups(previousGroups)
        }
        showError(t('toast.error.saveFailed'))
      } finally {
        setSavingNotifications(false)
      }
    },
    [activeRole, context.orgId, t, updateUserPreferences, user?.id]
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

  async function handleChangePassword() {
    setPasswordError(null)
    
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    
    setChangingPassword(true)
    
    try {
      const { error } = await updatePassword(newPassword)
      if (error) throw error
      
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  const languageOptions: { value: Locale; label: string }[] = [
    { value: 'en', label: t('portal.settings.language.english') },
    { value: 'es', label: t('portal.settings.language.spanish') },
  ]

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: t('portal.settings.title') },
        ]}
      >
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1">
            <PageTitle>{t('portal.settings.title')}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide">
              Manage your account and preferences.
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout} className="w-full sm:w-auto text-red-600 hover:text-red-700 border-red-200 dark:border-red-800">
            {t('portal.settings.logOut')}
          </Button>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Account */}
          <section>
            <SectionHeader className="mb-4">{t('portal.settings.account.title')}</SectionHeader>
            <Card className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.settings.account.email')}</p>
                  <p className="font-black text-slate-900 dark:text-white break-words">{profile?.email}</p>
                </div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest self-start sm:self-auto">{t('portal.settings.account.emailLogin')}</span>
              </div>
              <div 
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => setShowPasswordModal(true)}
              >
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.settings.account.password')}</p>
                  <p className="font-black text-slate-900 dark:text-white">{t('portal.settings.account.passwordPlaceholder')}</p>
                </div>
                <span className="text-[var(--org-link-color)] text-sm font-bold self-start sm:self-auto">{t('common.change')}</span>
              </div>
              {profile?.phone && (
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.settings.account.phone')}</p>
                    <p className="font-black text-slate-900 dark:text-white">{profile.phone}</p>
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Family */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader>{t('portal.settings.family.title')}</SectionHeader>
              <Link to="/portal/athletes" className="text-xs font-bold text-[var(--org-link-color)] uppercase tracking-widest hover:underline">
                {t('portal.settings.family.manageChildren')}
              </Link>
            </div>
            
            <div className="space-y-4">
              {children.map(child => (
                <Card key={child.id} className="overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-lg font-black text-slate-600 dark:text-slate-300">
                        {child.first_name[0]}
                      </div>
                      <div>
                        <CardTitle className="text-lg mb-1">{child.first_name} {child.last_name}</CardTitle>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {t('portal.settings.family.born')} {child.date_of_birth ? new Date(child.date_of_birth).getFullYear() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <button className="text-sm font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white">{t('common.edit')}</button>
                  </div>
                  
                  {/* Teams Section */}
                  <div className="p-6 bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Teams</p>
                    {teams.length > 0 ? (
                      <ul className="space-y-2">
                         {teams.map((team) => (
                           <li key={team.id} className="flex items-start gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                             <span className="text-slate-400 mt-0.5">•</span>
                             {team.name}
                           </li>
                         ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">{t('portal.settings.family.noTeams')}</p>
                    )}
                  </div>

                  {/* Guardians Section */}
                  <div className="p-6 bg-white dark:bg-slate-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('portal.settings.family.guardians')}</p>
                      <button 
                        onClick={() => handleOpenInviteModal(child.id)}
                        className="text-xs font-bold text-[var(--org-link-color)] uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Icon name="add" size="text-sm" />
                        {t('common.invite')}
                      </button>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {/* Current User as Guardian */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{t('portal.settings.family.you')}</p>
                            <p className="text-xs text-slate-500 break-words">{profile?.email}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded self-start sm:self-auto">{t('portal.settings.family.owner')}</span>
                      </div>

                      {/* Other Guardians */}
                      {child.guardians
                        .filter(g => g.email !== profile?.email)
                        .map(guardian => (
                          <div key={guardian.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {guardian.display_name?.[0]?.toUpperCase() || guardian.email[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-900 dark:text-white break-words">
                                  {guardian.display_name || guardian.email}
                                </p>
                                {guardian.display_name && (
                                  <p className="text-xs text-slate-500 break-words">{guardian.email}</p>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded capitalize self-start sm:self-auto">
                              {guardian.relationship_type || 'Guardian'}
                            </span>
                          </div>
                        ))}

                      {/* Pending Invites */}
                      {child.pendingInvites.map(invite => (
                        <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white italic">{t('admin.athletes.guardians.invitePending')}</p>
                              <p className="text-xs text-slate-500 break-words">{invite.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => handleResendInvite(invite.id)}
                              disabled={inviteActionLoading === invite.id}
                              className="text-xs font-bold text-[var(--org-link-color)] hover:underline disabled:opacity-50 min-h-[44px] px-2"
                            >
                              {inviteActionLoading === invite.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                t('admin.athletes.guardians.resend')
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelInvite(invite.id)}
                              disabled={inviteActionLoading === invite.id}
                              className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50 min-h-[44px] px-2"
                            >
                              {t('admin.athletes.guardians.cancelInvite')}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Empty State */}
                      {child.guardians.filter(g => g.email !== profile?.email).length === 0 && 
                       child.pendingInvites.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-2">
                          {t('portal.settings.family.noGuardians')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section>
            <SectionHeader className="mb-4">Theme</SectionHeader>
            <Card className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Choose your preferred color theme. Changes apply immediately.
              </p>
              <ThemeSelector />
            </Card>
          </section>

          {/* Language */}
          <section>
            <SectionHeader className="mb-4">{t('portal.settings.language.title')}</SectionHeader>
            <Card className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('portal.settings.language.description')}</p>
              <div className="space-y-2">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLocale(option.value)}
                    className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between min-h-[44px] ${
                      locale === option.value
                        ? 'border-[var(--org-btn-primary-bg, #137fec)] bg-[var(--org-btn-primary-bg)]/10 dark:bg-[var(--org-btn-primary-bg)]/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    <span className={`font-black text-sm sm:text-base ${
                      locale === option.value ? 'text-[var(--org-link-color)]' : 'text-slate-900 dark:text-white'
                    }`}>
                      {option.label}
                    </span>
                    {locale === option.value && (
                      <Icon name="check_circle" className="text-[var(--org-link-color)] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </section>

          {/* Notifications */}
          <section>
            <SectionHeader className="mb-3 sm:mb-4">{t('portal.settings.notifications.title')}</SectionHeader>
            <Card className="p-4 sm:p-6">
              <NotificationPreferences
                role={activeRole}
                groups={notificationGroups}
                onToggleGroupAll={handleToggleGroupAll}
                onToggleGroupDigest={handleToggleGroupDigest}
                onToggleAction={handleToggleAction}
                onToggleChannel={handleToggleChannel}
                saving={savingNotifications}
              />
            </Card>
          </section>

          {/* Support & Legal */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6">
               <SectionHeader className="mb-3 sm:mb-4">{t('portal.settings.support.title')}</SectionHeader>
               <ul className="space-y-2 sm:space-y-3 text-sm">
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[var(--org-link-color)] min-h-[44px] py-1"><span>{t('portal.settings.support.helpCenter')}</span> <Icon name="chevron_right" className="flex-shrink-0" /></a></li>
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[var(--org-link-color)] min-h-[44px] py-1"><span>{t('portal.settings.support.contactSupport')}</span> <Icon name="chevron_right" className="flex-shrink-0" /></a></li>
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[var(--org-link-color)] min-h-[44px] py-1"><span>{t('portal.settings.support.reportProblem')}</span> <Icon name="chevron_right" className="flex-shrink-0" /></a></li>
               </ul>
            </Card>
            <Card className="p-4 sm:p-6">
               <SectionHeader className="mb-3 sm:mb-4">{t('portal.settings.legal.title')}</SectionHeader>
               <ul className="space-y-2 sm:space-y-3 text-sm">
                 <li><a href="#" className="font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white min-h-[44px] flex items-center py-1">{t('portal.settings.legal.termsOfService')}</a></li>
                 <li><a href="#" className="font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white min-h-[44px] flex items-center py-1">{t('portal.settings.legal.privacyPolicy')}</a></li>
                 <li><a href="#" className="font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white min-h-[44px] flex items-center py-1">{t('portal.settings.legal.refundPolicy')}</a></li>
               </ul>
               <p className="mt-3 sm:mt-4 text-xs text-slate-400">{t('portal.settings.legal.version', { version: '2.4.0', build: '592' })}</p>
            </Card>
          </section>
        </div>

        {showPasswordModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPasswordModal(false)}
          >
            <Card 
              className="w-full max-w-md m-4"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Change Password</h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    placeholder="Confirm new password"
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordError(null)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Invite Guardian Modal */}
        {showInviteGuardianModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={handleCloseInviteModal}
          >
            <Card 
              className="w-full max-w-md m-4 max-h-[90vh] overflow-y-auto"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {t('admin.athletes.guardians.linkTitle')}
                </h3>
                <button
                  onClick={handleCloseInviteModal}
                  disabled={isInvitingGuardian}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <Icon name="close" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {/* Selected Child Info */}
                  {selectedChildId && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        {t('portal.settings.family.invitingFor')}
                      </p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {children.find(c => c.id === selectedChildId)?.first_name}{' '}
                        {children.find(c => c.id === selectedChildId)?.last_name}
                      </p>
                    </div>
                  )}

                  {/* Email Input */}
                  <div>
                    <label className="form-label">
                      {t('admin.athletes.guardians.emailLabel')}
                    </label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => {
                        setGuardianEmail(e.target.value)
                        if (!emailTouched) setEmailTouched(true)
                        setInviteGuardianError(null)
                      }}
                      placeholder={t('admin.athletes.guardians.emailPlaceholder')}
                      disabled={isInvitingGuardian}
                      className={`form-input ${inviteGuardianError && emailTouched ? 'border-red-500 focus:ring-red-500' : ''}`}
                      autoFocus
                    />
                    {inviteGuardianError && emailTouched && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {inviteGuardianError}
                      </p>
                    )}

                    {/* Match Indicator */}
                    {emailTouched && guardianEmail && !inviteGuardianError && (
                      <div className="mt-3">
                        {isCheckingGuardian ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Checking...</span>
                          </div>
                        ) : guardianMatch ? (
                          guardianMatch.exists ? (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">{t('admin.athletes.guardians.existingGuardian')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-amber-600">
                              <Mail className="w-4 h-4" />
                              <span>{t('admin.athletes.guardians.willInvite')}</span>
                            </div>
                          )
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <Button
                  variant="secondary"
                  onClick={handleCloseInviteModal}
                  disabled={isInvitingGuardian}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  {t('admin.athletes.guardians.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleInviteGuardian}
                  disabled={isInvitingGuardian || !guardianEmail || !validateGuardianEmail(guardianEmail) || !!inviteGuardianError}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {isInvitingGuardian ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Inviting...
                    </span>
                  ) : (
                    t('admin.athletes.guardians.linkButton')
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </PortalLayout>
  )
}
