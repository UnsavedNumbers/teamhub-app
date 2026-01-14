import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface TravelPlan {
  id: string
  title: string
  location: string
  venue_name: string | null
  venue_address: string | null
  start_date: string
  end_date: string
  hotel_name: string | null
  hotel_address: string | null
  hotel_phone: string | null
  hotel_confirmation: string | null
  notes: string | null
  team: { name: string }
}

export default function Travel() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null)

  const { profile } = useAuth()

  useEffect(() => {
    if (profile) fetchPlans()
  }, [profile])

  async function fetchPlans() {
    const { data } = await supabase
      .from('travel_plans')
      .select('*, team:teams(name)')
      .order('start_date', { ascending: true })
      .gte('start_date', new Date().toISOString().split('T')[0])

    setPlans((data as unknown as TravelPlan[]) || [])
    setLoading(false)
  }

  function formatDateRange(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-neutral-200 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mr-4">← Dashboard</Link>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Travel</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-slate-800 rounded-xl text-center py-12 px-6">
            <span className="text-6xl mb-4 block">✈️</span>
            <h3 className="text-lg font-bold text-white mb-2">No Upcoming Travel</h3>
            <p className="text-slate-400">Travel plans will appear here when your team has tournaments.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                onClick={() => setSelectedPlan(plan)}
                className="bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
              >
                {/* Hero Section */}
                <div className="relative h-48 bg-gradient-to-br from-blue-600/30 to-slate-900 flex items-end p-6">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800')] bg-cover bg-center opacity-30"></div>
                  <div className="relative z-10">
                    <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-bold uppercase rounded mb-2">Active Trip</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">{plan.title}</h2>
                    <p className="text-blue-300 font-bold uppercase tracking-wide text-sm mt-1">
                      {plan.location} • {formatDateRange(plan.start_date, plan.end_date)}
                    </p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="p-6 grid md:grid-cols-2 gap-4">
                  {plan.venue_name && (
                    <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg">
                      <span className="text-2xl">📍</span>
                      <div>
                        <p className="font-bold text-white">{plan.venue_name}</p>
                        {plan.venue_address && <p className="text-sm text-slate-400">{plan.venue_address}</p>}
                      </div>
                    </div>
                  )}
                  {plan.hotel_name && (
                    <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg">
                      <span className="text-2xl">🏨</span>
                      <div>
                        <p className="font-bold text-white">{plan.hotel_name}</p>
                        {plan.hotel_address && <p className="text-sm text-slate-400">{plan.hotel_address}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 flex justify-between items-center">
                  <span className="text-sm text-slate-400">{plan.team.name}</span>
                  <span className="text-blue-400 text-sm font-bold">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedPlan(null)}>
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="relative h-40 bg-gradient-to-br from-blue-600/30 to-slate-900 flex items-end p-6 rounded-t-xl">
              <div className="absolute top-4 right-4">
                <button onClick={() => setSelectedPlan(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedPlan.title}</h2>
                <p className="text-blue-300 text-sm font-bold uppercase">{formatDateRange(selectedPlan.start_date, selectedPlan.end_date)}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Venue */}
              {selectedPlan.venue_name && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Venue</h3>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="font-bold text-white text-lg">{selectedPlan.venue_name}</p>
                    {selectedPlan.venue_address && <p className="text-slate-400">{selectedPlan.venue_address}</p>}
                    <button className="mt-3 px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors">
                      View Maps
                    </button>
                  </div>
                </div>
              )}

              {/* Hotel */}
              {selectedPlan.hotel_name && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Hotel</h3>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="font-bold text-white text-lg">{selectedPlan.hotel_name}</p>
                    {selectedPlan.hotel_address && <p className="text-slate-400 mb-2">{selectedPlan.hotel_address}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedPlan.hotel_phone && (
                        <a href={`tel:${selectedPlan.hotel_phone}`} className="px-4 py-2 bg-slate-700 text-white font-bold text-sm rounded-lg hover:bg-slate-600 transition-colors">
                          📞 {selectedPlan.hotel_phone}
                        </a>
                      )}
                      {selectedPlan.hotel_confirmation && (
                        <span className="px-4 py-2 bg-slate-700 text-slate-300 font-mono text-sm rounded-lg">
                          Conf: {selectedPlan.hotel_confirmation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPlan.notes && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Notes</h3>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedPlan.notes}</p>
                  </div>
                </div>
              )}

              {/* Team Travel Concierge */}
              <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <h3 className="font-bold text-white mb-1">Team Travel Concierge</h3>
                <p className="text-sm text-blue-200">Need help with transport or meal locations? Your team travel rep is available 24/7 during the tournament.</p>
                <button className="mt-3 px-4 py-2 bg-white text-slate-900 font-bold text-sm rounded-lg hover:bg-slate-100 transition-colors">
                  Text Support
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
