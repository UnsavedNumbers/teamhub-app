import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useT, useLocale } from '../i18n/useI18n'
import type { Locale } from '../i18n'

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
  first_name?: string // inferred from metadata or profile if we had it
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

  // Mock Notification Settings
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
    
    // 1. Fetch Children
    const { data: kids } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', profile?.family_id || '')
      .order('first_name')
    
    setChildren(kids || [])

    if (kids && kids.length > 0) {
      const childrenData = kids as unknown as Child[]
      // 2. Fetch Memberships for hierarchy display
      const { data: mems } = await supabase
        .from('team_memberships')
        .select('child_id, team:teams(name, sport, program), season:seasons(name)')
        .in('child_id', childrenData.map(k => k.id))
        .eq('status', 'active')
      
      setMemberships((mems as unknown as TeamMembership[]) || [])
    }

    // 3. Fetch Guardians (other users in same family)
    if (profile?.family_id) {
       const { data: famUsers } = await supabase
        .from('users')
        .select('id, email, permissions')
        .eq('family_id', profile.family_id!)
        .neq('id', profile.id) // Exclude self
      
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
    // Here we would ideally save to users.preferences
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  // Language options for the switcher
  const languageOptions: { value: Locale; label: string }[] = [
    { value: 'en', label: t('portal.settings.language.english') },
    { value: 'es', label: t('portal.settings.language.spanish') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/portal/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors font-medium flex items-center gap-1">
              <span className="material-symbols-rounded text-[20px]">arrow_back</span>
              {t('portal.settings.dashboard')}
            </Link>
            <h1 className="text-lg font-bold">{t('portal.settings.title')}</h1>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-700">
            {t('portal.settings.logOut')}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 1. Account */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">{t('portal.settings.account.title')}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-0.5">{t('portal.settings.account.email')}</p>
                <p className="font-medium">{profile?.email}</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">{t('portal.settings.account.emailLogin')}</span>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <p className="text-sm text-slate-500 mb-0.5">{t('portal.settings.account.password')}</p>
                <p className="font-medium">{t('portal.settings.account.passwordPlaceholder')}</p>
              </div>
              <span className="text-blue-600 text-sm font-medium">{t('common.change')}</span>
            </div>
            {profile?.phone && (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-0.5">{t('portal.settings.account.phone')}</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. Family */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('portal.settings.family.title')}</h2>
            <Link to="/portal/children" className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700">{t('portal.settings.family.manageChildren')}</Link>
          </div>
          
          <div className="space-y-4">
            {/* Children */}
            {children.map(child => (
              <div key={child.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-lg font-bold text-slate-500">
                      {child.first_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{child.first_name} {child.last_name}</h3>
                      <p className="text-xs text-slate-500">{t('portal.settings.family.born')} {child.birthdate ? new Date(child.birthdate).getFullYear() : 'Unknown'}</p>
                    </div>
                  </div>
                  <button className="text-sm font-medium text-slate-400 hover:text-slate-600">{t('common.edit')}</button>
                </div>
                {/* Sports/Teams Read Only */}
                <div className="p-4 bg-white">
                  {getChildTeams(child.id).length > 0 ? (
                    <ul className="space-y-2">
                       {getChildTeams(child.id).map((teamStr, i) => (
                         <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                           <span className="text-slate-400 mt-0.5">•</span>
                           {teamStr}
                         </li>
                       ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400 italic">{t('portal.settings.family.noTeams')}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Guardians */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{t('portal.settings.family.guardians')}</h3>
                <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1">
                  <span className="material-symbols-rounded text-[16px]">add</span>
                  {t('common.invite')}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Self */}
                <div className="p-4 flex items-start justify-between">
                   <div>
                     <p className="font-medium text-slate-900">{t('portal.settings.family.you')} ({profile?.email})</p>
                     <p className="text-xs text-slate-500 mt-1">{t('portal.settings.family.familyAdmin')}</p>
                   </div>
                   <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">{t('portal.settings.family.owner')}</span>
                </div>
                {/* Other Guardians */}
                {guardians.map(g => (
                  <div key={g.id} className="p-4 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{g.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">{t('portal.settings.family.viewOnly')}</span>
                        {/* Mock permissions for display */}
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded border border-blue-100">{t('portal.settings.family.rsvp')}</span>
                      </div>
                    </div>
                    <button className="text-sm font-medium text-red-600 hover:text-red-700 mt-1">{t('common.remove')}</button>
                  </div>
                ))}
                {guardians.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500 italic">
                    {t('portal.settings.family.noGuardians')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Language */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">{t('portal.settings.language.title')}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4">
              <p className="text-sm text-slate-500 mb-4">{t('portal.settings.language.description')}</p>
              <div className="space-y-2">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLocale(option.value)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                      locale === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className={`font-medium ${
                      locale === option.value ? 'text-blue-900' : 'text-slate-900'
                    }`}>
                      {option.label}
                    </span>
                    {locale === option.value && (
                      <span className="material-symbols-rounded text-blue-600 text-[20px]">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Notifications */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">{t('portal.settings.notifications.title')}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {Object.entries(notifications).map(([key, value]) => {
              // Map notification keys to translation keys
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
                <div key={key} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{notificationLabels[key] || key}</p>
                  </div>
                  <button 
                    onClick={() => toggleNotification(key as keyof typeof notifications)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${value ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* 5. Payments */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">{t('portal.settings.payments.title')}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-slate-700 text-[32px]">credit_card</span>
                  <div>
                    <p className="font-medium text-slate-900">{t('portal.settings.payments.cardEnding', { last4: '4242' })}</p>
                    <p className="text-xs text-slate-500">{t('portal.settings.payments.expires', { date: '12/28' })}</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{t('portal.settings.payments.default')}</span>
             </div>
             <div className="p-4 text-center">
               <button className="text-sm font-bold text-blue-600 hover:text-blue-700">{t('portal.settings.payments.addPaymentMethod')}</button>
             </div>
             <div className="bg-slate-50 p-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t('portal.settings.payments.billingHistory')}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Oct 1, 2025 • U12 Fall Registration</span>
                    <span className="font-medium">$150.00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Sep 15, 2025 • Uniform Kit</span>
                    <span className="font-medium">$85.00</span>
                  </div>
                </div>
                <button className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide">{t('portal.settings.payments.downloadReceipts')}</button>
             </div>
          </div>
        </section>

        {/* 6. Support & Legal */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('portal.settings.support.title')}</h2>
             <ul className="space-y-3 text-sm">
               <li><a href="#" className="flex items-center justify-between text-slate-700 hover:text-blue-600">{t('portal.settings.support.helpCenter')} <span className="material-symbols-rounded text-[20px]">chevron_right</span></a></li>
               <li><a href="#" className="flex items-center justify-between text-slate-700 hover:text-blue-600">{t('portal.settings.support.contactSupport')} <span className="material-symbols-rounded text-[20px]">chevron_right</span></a></li>
               <li><a href="#" className="flex items-center justify-between text-slate-700 hover:text-blue-600">{t('portal.settings.support.reportProblem')} <span className="material-symbols-rounded text-[20px]">chevron_right</span></a></li>
             </ul>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('portal.settings.legal.title')}</h2>
             <ul className="space-y-3 text-sm">
               <li><a href="#" className="text-slate-500 hover:text-slate-900">{t('portal.settings.legal.termsOfService')}</a></li>
               <li><a href="#" className="text-slate-500 hover:text-slate-900">{t('portal.settings.legal.privacyPolicy')}</a></li>
               <li><a href="#" className="text-slate-500 hover:text-slate-900">{t('portal.settings.legal.refundPolicy')}</a></li>
             </ul>
             <p className="mt-4 text-xs text-slate-400">{t('portal.settings.legal.version', { version: '2.4.0', build: '592' })}</p>
          </div>
        </section>

      </main>
    </div>
  )
}
