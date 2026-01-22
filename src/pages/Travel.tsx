import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { 
  getUpcomingTravelPlansForUser, 
  formatDateRange
} from '../data/services/travelService'
import type { FakeTravelPlan } from '../data/fake/fakeTravel'
import { getSportFromTeam, type SportInfo } from '../utils/sportContext'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import { SportCardImage } from '../components/portal/SportCardImage'
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'

type TravelPlan = FakeTravelPlan & { team?: { name: string } }

// Helper to get team name from team_id
const getTeamName = (teamId: string): string => {
  const teamNames: Record<string, string> = {
    'team-u10-soccer-001': 'U10 Lightning',
    'team-u12-soccer-002': 'U12 Thunder',
    'team-u10-basketball-003': 'U10 Hawks',
    'team-u12-basketball-004': 'U12 Eagles',
    'team-u14-soccer-elite-005': 'U14 Elite Storm',
    'team-u16-soccer-elite-006': 'U16 Elite Hurricanes',
  }
  return teamNames[teamId] ?? 'Unknown Team'
}

export default function Travel() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [planSports, setPlanSports] = useState<Record<string, SportInfo | null>>({})

  const { context, isReady } = useUserContext()

  useEffect(() => {
    if (!isReady) return

    async function fetchPlans() {
      const { data, error } = await getUpcomingTravelPlansForUser(context)
      
      if (error) {
        console.error('Error fetching travel plans:', error)
        setPlans([])
      } else {
        // Transform data to include team name
        const plansWithTeam = data.map(plan => ({
          ...plan,
          team: { name: getTeamName(plan.team_id) }
        }))
        setPlans(plansWithTeam)
        
        // Load sports for travel plans
        const sportsMap: Record<string, SportInfo | null> = {}
        Promise.all(
          data.map(async (plan) => {
            const sport = await getSportFromTeam(context, plan.team_id)
            if (sport) sportsMap[plan.id] = sport
          })
        ).then(() => setPlanSports(sportsMap))
      }
      setLoading(false)
    }

    fetchPlans()
  }, [context, isReady])

  function handlePlanClick(planId: string) {
    navigate(`/portal/travel/${planId}`)
  }

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Travel' },
        ]}
      >
        <div className="mb-12">
          <PageTitle>Travel</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            View upcoming travel plans and tournament details.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : plans.length === 0 ? (
          <Card className="text-center py-12">
            <Icon name="flight" size="text-6xl" className="text-slate-400 mb-4" />
            <CardTitle className="mb-2">No upcoming travel</CardTitle>
            <p className="text-slate-500 dark:text-slate-400">Travel plans will appear here when your team has tournaments.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanClick(plan.id)}
                className="overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300"
              >
                <Card className="p-0">
                  <SportCardImage sport={planSports[plan.id] || null} height="h-48" type="travel">
                    <div className="relative z-10 w-full">
                      <div className="flex gap-2 mb-3">
                        {plan.status === 'cancelled' ? (
                          <span className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded">Cancelled</span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-[#137fec] text-white text-xs font-bold uppercase tracking-widest rounded">Upcoming Trip</span>
                        )}
                        {planSports[plan.id] && (
                          <span 
                            className="inline-block px-3 py-1 text-white text-xs font-bold uppercase tracking-widest rounded"
                            style={{ backgroundColor: planSports[plan.id]!.color || '#137fec' }}
                          >
                            {planSports[plan.id]!.name}
                          </span>
                        )}
                      </div>
                      <CardTitle className="mb-2 text-white">{plan.title}</CardTitle>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                        {plan.location} • {formatDateRange(plan.start_date, plan.end_date)}
                      </p>
                    </div>
                  </SportCardImage>

                  <div className="p-6 grid md:grid-cols-2 gap-4">
                    {plan.venue_name && (
                      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <Icon name="location_on" className="text-slate-400" />
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{plan.venue_name}</p>
                          {plan.venue_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{plan.venue_address}</p>}
                        </div>
                      </div>
                    )}
                    {plan.hotel_name && (
                      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <Icon name="hotel" className="text-slate-400" />
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{plan.hotel_name}</p>
                          {plan.hotel_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{plan.hotel_address}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 pb-6 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{plan.team?.name}</span>
                    <span className="text-[#137fec] text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      View Details
                      <Icon name="arrow_forward" size="text-sm" />
                    </span>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </PortalLayout>
  )
}
