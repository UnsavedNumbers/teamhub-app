import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { getAthletes } from '../data/services/familyService'
import { getTeamsForParent } from '../data/services/teamsService'
import { getUserPreferences, updateUserPreferences } from '../data/services/preferencesService'
import { useT, useLocale } from '../i18n/useI18n'
import type { Locale } from '../i18n'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { ThemeSelector } from '../components/portal/ThemeToggle'

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

export default function Settings() {
  const { profile, signOut, updatePassword, user } = useAuth()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const { locale, setLocale } = useLocale()
  
  const [children, setChildren] = useState<Child[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const [notifications, setNotifications] = useState({
    schedule_changes: true,
    announcements: true,
    rsvp_reminders: true,
    payment_reminders: true,
    tryout_updates: false,
    emergency_alerts: true,
    quiet_hours: false,
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isReady || !user?.id) return
    
    setLoading(true)
    
    // Fetch children
    const { data: childrenData } = await getAthletes(context)
    setChildren(childrenData.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      date_of_birth: c.date_of_birth,
    })))

    // Fetch teams
    const { data: teamsData } = await getTeamsForParent(context)
    setTeams(teamsData.map(t => ({
      id: t.id,
      name: t.name,
    })))

    // Load notification preferences
    const { data: prefs } = await getUserPreferences(user.id)
    if (prefs?.notifications) {
      setNotifications(prev => ({
        ...prev,
        ...prefs.notifications,
      }))
    }

    setLoading(false)
  }, [context, isReady, user?.id])

  useEffect(() => {
    if (isReady) fetchData()
  }, [isReady, fetchData])

  async function handleLogout() {
    await signOut()
    navigate('/portal/login')
  }

  async function toggleNotification(key: keyof typeof notifications) {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    
    if (user?.id) {
      await updateUserPreferences(user.id, {
        notifications: updated as any,
      })
    }
  }

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
      <>
        <PortalHeader />
        <PortalLayout>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        </PortalLayout>
      </>
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
        <div className="mb-12 flex items-end justify-between">
          <div>
            <PageTitle>{t('portal.settings.title')}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
              Manage your account and preferences.
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout} className="text-red-600 hover:text-red-700 border-red-200 dark:border-red-800">
            {t('portal.settings.logOut')}
          </Button>
        </div>

        <div className="space-y-8">
          {/* Account */}
          <section>
            <SectionHeader className="mb-4">{t('portal.settings.account.title')}</SectionHeader>
            <Card className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.settings.account.email')}</p>
                  <p className="font-black text-slate-900 dark:text-white">{profile?.email}</p>
                </div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{t('portal.settings.account.emailLogin')}</span>
              </div>
              <div 
                className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => setShowPasswordModal(true)}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.settings.account.password')}</p>
                  <p className="font-black text-slate-900 dark:text-white">{t('portal.settings.account.passwordPlaceholder')}</p>
                </div>
                <span className="text-[var(--org-link-color)] text-sm font-bold">{t('common.change')}</span>
              </div>
              {profile?.phone && (
                <div className="p-6 flex items-center justify-between">
                  <div>
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
                  <div className="p-6 bg-white dark:bg-slate-900/50">
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
                </Card>
              ))}

              <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <CardTitle className="text-lg">{t('portal.settings.family.guardians')}</CardTitle>
                  <button className="text-xs font-bold text-[var(--org-link-color)] uppercase tracking-widest hover:underline flex items-center gap-1">
                    <Icon name="add" size="text-sm" />
                    {t('common.invite')}
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6 flex items-start justify-between">
                     <div>
                       <p className="font-black text-slate-900 dark:text-white">{t('portal.settings.family.you')} ({profile?.email})</p>
                       <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{t('portal.settings.family.familyAdmin')}</p>
                     </div>
                     <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest rounded">{t('portal.settings.family.owner')}</span>
                  </div>
                  <div className="p-6 text-center text-sm text-slate-400">
                    {t('portal.settings.family.noGuardians')}
                  </div>
                </div>
              </Card>
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
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                      locale === option.value
                        ? 'border-[var(--org-btn-primary-bg, #137fec)] bg-[var(--org-btn-primary-bg)]/10 dark:bg-[var(--org-btn-primary-bg)]/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    <span className={`font-black ${
                      locale === option.value ? 'text-[var(--org-link-color)]' : 'text-slate-900 dark:text-white'
                    }`}>
                      {option.label}
                    </span>
                    {locale === option.value && (
                      <Icon name="check_circle" className="text-[var(--org-link-color)]" />
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </section>

          {/* Notifications */}
          <section>
            <SectionHeader className="mb-4">{t('portal.settings.notifications.title')}</SectionHeader>
            <Card className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(notifications).map(([key, value]) => {
                const notificationLabels: Record<string, string> = {
                  schedule_changes: t('portal.settings.notifications.scheduleChanges'),
                  announcements: t('portal.settings.notifications.announcements'),
                  rsvp_reminders: t('portal.settings.notifications.rsvpReminders'),
                  payment_reminders: t('portal.settings.notifications.paymentReminders'),
                  tryout_updates: t('portal.settings.notifications.tryoutUpdates'),
                  emergency_alerts: t('portal.settings.notifications.emergencyAlerts'),
                  quiet_hours: t('portal.settings.notifications.quietHours'),
                }
                
                return (
                  <div key={key} className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{notificationLabels[key] || key}</p>
                    </div>
                    <button 
                      onClick={() => toggleNotification(key as keyof typeof notifications)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-[var(--org-btn-primary-bg)]' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${value ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                )
              })}
            </Card>
          </section>

          {/* Support & Legal */}
          <section className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
               <SectionHeader className="mb-4">{t('portal.settings.support.title')}</SectionHeader>
               <ul className="space-y-3 text-sm">
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[var(--org-link-color)]"><span>{t('portal.settings.support.helpCenter')}</span> <Icon name="chevron_right" /></a></li>
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[var(--org-link-color)]"><span>{t('portal.settings.support.contactSupport')}</span> <Icon name="chevron_right" /></a></li>
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[var(--org-link-color)]"><span>{t('portal.settings.support.reportProblem')}</span> <Icon name="chevron_right" /></a></li>
               </ul>
            </Card>
            <Card className="p-6">
               <SectionHeader className="mb-4">{t('portal.settings.legal.title')}</SectionHeader>
               <ul className="space-y-3 text-sm">
                 <li><a href="#" className="font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t('portal.settings.legal.termsOfService')}</a></li>
                 <li><a href="#" className="font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t('portal.settings.legal.privacyPolicy')}</a></li>
                 <li><a href="#" className="font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t('portal.settings.legal.refundPolicy')}</a></li>
               </ul>
               <p className="mt-4 text-xs text-slate-400">{t('portal.settings.legal.version', { version: '2.4.0', build: '592' })}</p>
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
      </PortalLayout>
  )
}
