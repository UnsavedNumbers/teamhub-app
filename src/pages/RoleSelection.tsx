import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { hasRole } from '@/utils/roleHelpers'
import type { Organization, OrgMemberRole } from '@/contexts/OrganizationContext'

interface RoleCard {
  orgId: string
  orgName: string
  role: OrgMemberRole
  title: string
  description: string
  icon: string
}

export function RoleSelection() {
  const { profile } = useAuth()
  const { setCurrentOrganization } = useOrganization()
  const navigate = useNavigate()
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

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
      title: 'Parent Dashboard',
      description: `Manage your family and settings - ${org.name}`,
      icon: 'dashboard',
    })
  })

  coachOrgs.forEach(org => {
    roleCards.push({
      orgId: org.id,
      orgName: org.name,
      role: 'coach',
      title: 'Coach',
      description: org.name,
      icon: 'strategy',
    })
  })

  adminOrgs.forEach(org => {
    roleCards.push({
      orgId: org.id,
      orgName: org.name,
      role: 'org_admin',
      title: 'Organization Management',
      description: org.name,
      icon: 'admin_panel_settings',
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
        navigate('/admin/dashboard')
      } else {
        // Parents go to portal dashboard
        navigate('/portal/dashboard')
      }
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
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
              <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight uppercase">TeamHub</h2>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-lg">help</span>
          </button>
          <button 
            onClick={() => navigate('/portal/logout')}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white gap-2 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-10 lg:px-40 py-12 max-w-[1400px] mx-auto w-full relative z-10">
        <div className="w-full text-center mb-16">
          <h1 className="text-slate-900 dark:text-white tracking-tight text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 uppercase">
            CHOOSE HOW TO <br />
            <span className="text-primary">CONTINUE</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto font-medium">
            Select your active role to enter the team management dashboard.
          </p>
        </div>

        <div className="w-full flex flex-col gap-14">
          {/* Parent Section */}
          {groupedCards.parent.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  PARENT
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.parent.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleCardClick(card)}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-4 border-primary shadow-[0_10px_30px_rgba(37,140,244,0.15)] ring-4 ring-primary/5'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:-translate-y-1'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-primary scale-125">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="z-10 flex flex-col gap-5">
                        <div className={`w-14 h-14 flex items-center justify-center rounded-xl ${
                          isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <span className="material-symbols-outlined text-3xl">{card.icon}</span>
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-normal mt-1">{card.description}</p>
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
                  COACH
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.coach.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleCardClick(card)}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-4 border-primary shadow-[0_10px_30px_rgba(37,140,244,0.15)] ring-4 ring-primary/5'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:-translate-y-1'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-primary scale-125">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="z-10 flex flex-col gap-5">
                        <div className={`w-14 h-14 flex items-center justify-center rounded-xl ${
                          isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                        }`}>
                          <span className="material-symbols-outlined text-3xl">{card.icon}</span>
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-normal mt-1">{card.description}</p>
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
                  ADMIN
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.admin.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleCardClick(card)}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-4 border-primary shadow-[0_10px_30px_rgba(37,140,244,0.15)] ring-4 ring-primary/5'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:-translate-y-1'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-primary scale-125">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="z-10 flex flex-col gap-5">
                        <div className={`w-14 h-14 flex items-center justify-center rounded-xl ${
                          isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                        }`}>
                          <span className="material-symbols-outlined text-3xl">{card.icon}</span>
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-normal mt-1">{card.description}</p>
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
            ENTER LOCKER ROOM
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">TeamHub Athletic v1.0.4</p>
            <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </main>

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
