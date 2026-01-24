import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useTheme } from '@/hooks/useTheme'
import { useT } from '@/i18n/useI18n'
import { hasRole } from '@/utils/roleHelpers'
import type { Organization, OrgMemberRole } from '@/contexts/OrganizationContext'

interface RoleCard {
  orgId: string
  orgName: string
  role: OrgMemberRole
  title: string
  description: string
}

export function RoleSelection() {
  const { profile, signOut } = useAuth()
  const { setCurrentOrganization } = useOrganization()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const t = useT()
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)

  // Logo based on theme (same as PortalNav)
  const logoSrc = resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png'

  const logoSrcWithCacheBust = `${logoSrc}?theme=${resolvedTheme}&v=${logoVersion}`

  // Reset logo error and increment version when theme changes
  useEffect(() => {
    setLogoError(false)
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  if (!profile) {
    return null
  }

  // Build role cards from user's organizations
  const roleCards: RoleCard[] = []

  // Group by role type
  const parentOrgs: Organization[] = []
  const coachOrgs: Organization[] = []
  const adminOrgs: Organization[] = []

  profile.organizations.forEach(org => {
    if (hasRole(org, 'parent')) parentOrgs.push(org)
    if (hasRole(org, 'coach')) coachOrgs.push(org)
    if (hasRole(org, 'org_admin')) adminOrgs.push(org)
  })

  // Create cards for each role in each org
  parentOrgs.forEach(org => {
    roleCards.push({
      orgId: org.id,
      orgName: org.name,
      role: 'parent',
      title: t('portal.roleSelection.parentTitle'),
      description: `${t('portal.roleSelection.parentDescription')} - ${org.name}`,
    })
  })

  coachOrgs.forEach(org => {
    roleCards.push({
      orgId: org.id,
      orgName: org.name,
      role: 'coach',
      title: t('portal.roleSelection.coachTitle'),
      description: org.name,
    })
  })

  adminOrgs.forEach(org => {
    roleCards.push({
      orgId: org.id,
      orgName: org.name,
      role: 'org_admin',
      title: t('portal.roleSelection.adminTitle'),
      description: org.name,
    })
  })

  const handleCardClick = (card: RoleCard) => {
    setSelectedCard(`${card.orgId}-${card.role}`)
  }

  const handleEnter = () => {
    if (!selectedCard) return

    const [orgId, role] = selectedCard.split('-')
    const org = profile.organizations.find(o => o.id === orgId)
    
    if (org) {
      setCurrentOrganization(org)
      
      // Navigate based on selected role
      // Admins and coaches always go to admin section
      if (role === 'org_admin' || role === 'coach') {
        navigate('/admin')
      } else {
        // Parents go to portal dashboard
        navigate('/portal/dashboard')
      }
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/portal/login')
  }

  const getRoleBackgroundImage = (role: OrgMemberRole): string => {
    switch (role) {
      case 'org_admin':
        return '/images/roles/admin.png'
      case 'coach':
        return '/images/roles/coach.png'
      case 'parent':
        return '/images/roles/guardian.png'
      default:
        return '/images/roles/guardian.png'
    }
  }

  const groupedCards = {
    parent: roleCards.filter(c => c.role === 'parent'),
    coach: roleCards.filter(c => c.role === 'coach'),
    admin: roleCards.filter(c => c.role === 'org_admin'),
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 md:px-10 py-4">
        <div className="flex items-center gap-4">
          {/* Logo - same format as PortalNav */}
          <Link to="/portal/dashboard" className="flex items-center gap-3">
            {!logoError ? (
              <img 
                key={logoSrc}
                src={logoSrcWithCacheBust} 
                alt="Youth Sports" 
                className="h-8 w-auto transition-opacity duration-200"
                onError={() => {
                  console.error('Failed to load logo:', logoSrc)
                  setLogoError(true)
                }}
              />
            ) : (
              <>
                <div className="h-8 w-8 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">sports</span>
                </div>
                <span className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight uppercase">YOUTH SPORTS</span>
              </>
            )}
          </Link>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setHelpModalOpen(true)}
            className="flex items-center justify-center rounded-lg h-10 w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            aria-label={t('portal.roleSelection.helpTitle')}
          >
            <span className="material-symbols-outlined text-lg">help</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white gap-2 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {t('portal.roleSelection.signOut')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-10 lg:px-40 py-12 max-w-[1400px] mx-auto w-full relative z-10">
        <div className="w-full text-center mb-16">
          <h1 className="text-slate-900 dark:text-white tracking-tight text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 uppercase">
            {t('portal.roleSelection.title')} <br />
            <span className="text-primary">{t('portal.roleSelection.titleHighlight')}</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto font-medium">
            {t('portal.roleSelection.description')}
          </p>
        </div>

        <div className="w-full flex flex-col gap-14">
          {/* Parent Section */}
          {groupedCards.parent.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  {t('portal.roleSelection.parentLabel')}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.parent.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  const bgImage = getRoleBackgroundImage(card.role)
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleCardClick(card)}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all overflow-hidden ${
                        isSelected
                          ? 'shadow-[0_10px_30px_rgba(37,140,244,0.15)]'
                          : 'shadow-sm hover:-translate-y-1'
                      }`}
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/80 group-hover:bg-black/60 transition-colors"></div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-white scale-125 z-20">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col gap-5">
                        <div>
                          <p className="text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-white/90 text-sm font-medium leading-normal mt-1">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Coach Section */}
          {groupedCards.coach.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  {t('portal.roleSelection.coachLabel')}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.coach.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  const bgImage = getRoleBackgroundImage(card.role)
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleCardClick(card)}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all overflow-hidden ${
                        isSelected
                          ? 'shadow-[0_10px_30px_rgba(37,140,244,0.15)]'
                          : 'shadow-sm hover:-translate-y-1'
                      }`}
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-white scale-125 z-20">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col gap-5">
                        <div>
                          <p className="text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-white/90 text-sm font-medium leading-normal mt-1">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Admin Section */}
          {groupedCards.admin.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  {t('portal.roleSelection.adminLabel')}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.admin.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  const bgImage = getRoleBackgroundImage(card.role)
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleCardClick(card)}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all overflow-hidden ${
                        isSelected
                          ? 'shadow-[0_10px_30px_rgba(37,140,244,0.15)]'
                          : 'shadow-sm hover:-translate-y-1'
                      }`}
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-white scale-125 z-20">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col gap-5">
                        <div>
                          <p className="text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-white/90 text-sm font-medium leading-normal mt-1">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Enter Button */}
        <div className="mt-20 w-full flex flex-col items-center gap-8">
          <button
            onClick={handleEnter}
            disabled={!selectedCard}
            className={`flex min-w-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 gap-3 text-lg font-black leading-normal tracking-widest uppercase transition-all ${
              selectedCard
                ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_8px_0_0_#1a6ec2] active:shadow-[0_2px_0_0_#1a6ec2] active:translate-y-[6px]'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {t('portal.roleSelection.enterButton')}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">{t('portal.roleSelection.version')}</p>
            <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {helpModalOpen && (
        <div
          onClick={() => setHelpModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('portal.roleSelection.helpTitle')}
              </h2>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={t('common.close')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('portal.roleSelection.helpDescription')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background decorations */}
      <div className="fixed top-0 right-0 -z-10 w-2/3 h-full opacity-30 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-primary/10 to-transparent"></div>
      </div>
      <div className="fixed bottom-0 left-0 -z-10 w-full h-1/2 opacity-20 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-primary/5 to-transparent"></div>
      </div>
    </div>
  )
}
