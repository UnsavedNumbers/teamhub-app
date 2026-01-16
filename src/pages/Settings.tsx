import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useT, useLocale } from '../i18n/useI18n'
import type { Locale } from '../i18n'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

interface Child {
  id: string
  first_name: string
  last_name: string
  birthdate: string | null
}

interface TeamMembership {
  child_id: string
  team: {
    name: string
    sport: string
    program: string
  }
  season: {
    name: string
  }
}

interface Guardian {
  id: string
  email: string
  first_name?: string
  permissions: {
    view_only?: boolean
    rsvp?: boolean
    pay?: boolean
    admin?: boolean
  }
}

export default function Settings() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const { locale, setLocale } = useLocale()
  
  const [children, setChildren] = useState<Child[]>([])
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    
    const { data: kids } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', profile?.family_id || '')
      .order('first_name')
    
    setChildren(kids || [])

    if (kids && kids.length > 0) {
      const childrenData = kids as unknown as Child[]
      const { data: mems } = await supabase
        .from('team_memberships')
        .select('child_id, team:teams(name, sport, program), season:seasons(name)')
        .in('child_id', childrenData.map(k => k.id))
        .eq('status', 'active')
      
      setMemberships((mems as unknown as TeamMembership[]) || [])
    }

    if (profile?.family_id) {
       const { data: famUsers } = await supabase
        .from('users')
        .select('id, email, permissions')
        .eq('family_id', profile.family_id!)
        .neq('id', profile.id)
      
      setGuardians((famUsers as unknown as Guardian[]) || [])
    }

    setLoading(false)
  }, [profile?.family_id, profile?.id])

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, fetchData])

  async function handleLogout() {
    await signOut()
    navigate('/portal/login')
  }

  function getChildTeams(childId: string) {
    return memberships
      .filter(m => m.child_id === childId)
      .map(m => `${m.team.sport} > ${m.team.program} > ${m.team.name} (${m.season.name})`)
  }

  function toggleNotification(key: keyof typeof notifications) {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
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
    <>
      <PortalHeader />
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
              <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.settings.account.password')}</p>
                  <p className="font-black text-slate-900 dark:text-white">{t('portal.settings.account.passwordPlaceholder')}</p>
                </div>
                <span className="text-[#137fec] text-sm font-bold">{t('common.change')}</span>
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
              <Link to="/portal/children" className="text-xs font-bold text-[#137fec] uppercase tracking-widest hover:underline">
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
                          {t('portal.settings.family.born')} {child.birthdate ? new Date(child.birthdate).getFullYear() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <button className="text-sm font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white">{t('common.edit')}</button>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-900/50">
                    {getChildTeams(child.id).length > 0 ? (
                      <ul className="space-y-2">
                         {getChildTeams(child.id).map((teamStr, i) => (
                           <li key={i} className="flex items-start gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                             <span className="text-slate-400 mt-0.5">•</span>
                             {teamStr}
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
                  <button className="text-xs font-bold text-[#137fec] uppercase tracking-widest hover:underline flex items-center gap-1">
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
                  {guardians.map(g => (
                    <div key={g.id} className="p-6 flex items-start justify-between">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{g.email}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded border border-slate-200 dark:border-slate-700">{t('portal.settings.family.viewOnly')}</span>
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-100 dark:border-blue-800">{t('portal.settings.family.rsvp')}</span>
                        </div>
                      </div>
                      <button className="text-sm font-bold text-red-600 hover:text-red-700 mt-1">{t('common.remove')}</button>
                    </div>
                  ))}
                  {guardians.length === 0 && (
                    <div className="p-6 text-center text-sm text-slate-400">
                      {t('portal.settings.family.noGuardians')}
                    </div>
                  )}
                </div>
              </Card>
            </div>
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
                        ? 'border-[#137fec] bg-[#137fec]/10 dark:bg-[#137fec]/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    <span className={`font-black ${
                      locale === option.value ? 'text-[#137fec]' : 'text-slate-900 dark:text-white'
                    }`}>
                      {option.label}
                    </span>
                    {locale === option.value && (
                      <Icon name="check_circle" className="text-[#137fec]" />
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
                      className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-[#137fec]' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${value ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                )
              })}
            </Card>
          </section>

          {/* Payments */}
          <section>
            <SectionHeader className="mb-4">{t('portal.settings.payments.title')}</SectionHeader>
            <Card className="overflow-hidden">
               <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="credit_card" size="text-3xl" className="text-slate-600 dark:text-slate-400" />
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{t('portal.settings.payments.cardEnding', { last4: '4242' })}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('portal.settings.payments.expires', { date: '12/28' })}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{t('portal.settings.payments.default')}</span>
               </div>
               <div className="p-6 text-center">
                 <button className="text-sm font-bold text-[#137fec] hover:underline">{t('portal.settings.payments.addPaymentMethod')}</button>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t('portal.settings.payments.billingHistory')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Oct 1, 2025 • U12 Fall Registration</span>
                      <span className="text-slate-900 dark:text-white">$150.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Sep 15, 2025 • Uniform Kit</span>
                      <span className="text-slate-900 dark:text-white">$85.00</span>
                    </div>
                  </div>
                  <button className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest">{t('portal.settings.payments.downloadReceipts')}</button>
               </div>
            </Card>
          </section>

          {/* Support & Legal */}
          <section className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
               <SectionHeader className="mb-4">{t('portal.settings.support.title')}</SectionHeader>
               <ul className="space-y-3 text-sm">
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[#137fec]"><span>{t('portal.settings.support.helpCenter')}</span> <Icon name="chevron_right" /></a></li>
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[#137fec]"><span>{t('portal.settings.support.contactSupport')}</span> <Icon name="chevron_right" /></a></li>
                 <li><a href="#" className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 hover:text-[#137fec]"><span>{t('portal.settings.support.reportProblem')}</span> <Icon name="chevron_right" /></a></li>
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
      </PortalLayout>
    </>
  )
}
