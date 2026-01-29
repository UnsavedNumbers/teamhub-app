import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getTravelPlanById, formatDateRange } from '../data/services/travelService'
import { getEvents } from '../data/services/eventsService'
import type { FakeTravelPlan } from '../data/fake/fakeTravel'
import type { CalendarEvent } from '../types/calendar'
import { supabase } from '../lib/supabase'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import VenueInsights from '../components/portal/VenueInsights' // eslint-disable-line @typescript-eslint/no-unused-vars
import NearbyAmenities from '../components/portal/NearbyAmenities'
import { useT } from '../i18n/useI18n'

interface MeetingLocation {
  name: string
  address: string
  time?: string
  notes?: string | null
  maps_url?: string | null
}

function parseMeetingLocations(value: unknown): MeetingLocation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => {
      const o = v as Partial<MeetingLocation> | null
      if (!o) return null
      if (typeof o.name !== 'string' || typeof o.address !== 'string') return null
      return {
        name: o.name,
        address: o.address,
        time: typeof o.time === 'string' ? o.time : undefined,
        notes: typeof o.notes === 'string' ? o.notes : undefined,
        maps_url: typeof o.maps_url === 'string' ? o.maps_url : undefined,
      }
    })
    .filter(Boolean) as MeetingLocation[]
}

// Helper functions for links and integrations
function googleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  const q = encodeURIComponent(query.trim())
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

function appleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  const q = encodeURIComponent(query.trim())
  return `https://maps.apple.com/?q=${q}`
}

function wazeLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  const q = encodeURIComponent(query.trim())
  return `https://waze.com/ul?q=${q}`
}

function uberLink(address: string | null | undefined): string | null {
  if (!address || address.trim() === '') return null
  const dest = encodeURIComponent(address.trim())
  return `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
}

function lyftLink(address: string | null | undefined): string | null {
  if (!address || address.trim() === '') return null
  const dest = encodeURIComponent(address.trim())
  return `https://lyft.com/ride?destination[address]=${dest}`
}

function googleCalendarLink(event: { title: string; startTime: string; endTime: string; location?: string; notes?: string }): string | null {
  try {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date in calendar link:', event)
      return null
    }
    
    const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const details = event.notes ? encodeURIComponent(event.notes) : ''
    const location = event.location ? encodeURIComponent(event.location) : ''
    const text = encodeURIComponent(event.title || 'Event')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
  } catch (err) {
    console.error('Error generating Google Calendar link:', err)
    return null
  }
}

function appleCalendarLink(event: { title: string; startTime: string; endTime: string; location?: string }): string | null {
  try {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date in calendar link:', event)
      return null
    }
    
    // Download .ics file format
    const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const location = event.location || ''
    const title = event.title || 'Event'
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${title.replace(/[,;\\]/g, '')}
LOCATION:${location.replace(/[,;\\]/g, '')}
END:VEVENT
END:VCALENDAR`
    
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`
  } catch (err) {
    console.error('Error generating Apple Calendar link:', err)
    return null
  }
}

async function copyToClipboard(text: string): Promise<{ success: boolean; error?: Error }> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return { success: true }
      } catch (err) {
        document.body.removeChild(textArea)
        return { success: false, error: err instanceof Error ? err : new Error('Failed to copy') }
      }
    }
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Failed to copy to clipboard') }
  }
}

export default function TravelDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { context, isReady } = useUserContext()
  const componentIdRef = useRef(`TravelDetail-${Date.now()}-${Math.random()}`)
  const renderCountRef = useRef(0)
  const effectRunCountRef = useRef(0)
  const fetchPlanCountRef = useRef(0)
  const fetchEventsCountRef = useRef(0)

  renderCountRef.current++
  console.log(`[TravelDetail:${componentIdRef.current}] RENDER #${renderCountRef.current}`, {
    timestamp: new Date().toISOString(),
    id,
    isReady,
    contextOrgId: context?.orgId,
    contextUserId: context?.userId,
  })

  // Validate route param
  useEffect(() => {
    effectRunCountRef.current++
    console.log(`[TravelDetail:${componentIdRef.current}] Effect #${effectRunCountRef.current} - Route validation`, {
      timestamp: new Date().toISOString(),
      id,
      isReady,
    })
    if (isReady && (!id || typeof id !== 'string' || id.trim() === '')) {
      console.error(`[TravelDetail:${componentIdRef.current}] Invalid travel plan ID in route params`)
      navigate('/portal/travel', { replace: true })
    }
  }, [id, isReady, navigate])
  
  const [plan, setPlan] = useState<FakeTravelPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tripEvents, setTripEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState<Error | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string>('')
  const [emergencyContact, setEmergencyContact] = useState<{ name: string; phone: string; role: string } | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    const mountTime = new Date().toISOString()
    console.log(`[TravelDetail:${componentIdRef.current}] MOUNT`, { timestamp: mountTime })
    isMountedRef.current = true
    return () => {
      const unmountTime = new Date().toISOString()
      console.log(`[TravelDetail:${componentIdRef.current}] UNMOUNT`, { 
        timestamp: unmountTime,
        mountTime,
        renderCount: renderCountRef.current,
        effectRuns: effectRunCountRef.current,
        fetchPlanCalls: fetchPlanCountRef.current,
        fetchEventsCalls: fetchEventsCountRef.current,
      })
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[TravelDetail:${componentIdRef.current}] Effect #${effectId} - Fetch plan`, {
      timestamp: new Date().toISOString(),
      isReady,
      id,
      contextOrgId: context?.orgId,
      isMounted: isMountedRef.current,
    })

    if (!isReady || !id) {
      console.log(`[TravelDetail:${componentIdRef.current}] Effect #${effectId} - Early return`, {
        reason: !isReady ? 'not ready' : 'no id',
      })
      if (!id) {
        if (isMountedRef.current) {
          setError(new Error('Travel plan ID is required'))
          setLoading(false)
        }
      }
      return
    }

    async function fetchPlan() {
      fetchPlanCountRef.current++
      const fetchId = fetchPlanCountRef.current
      const fetchStartTime = Date.now()
      console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} START`, {
        timestamp: new Date().toISOString(),
        id,
        effectId,
      })

      try {
        if (!isMountedRef.current) {
          console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Aborted (unmounted)`)
          return
        }
        setLoading(true)
        setError(null)
        
        console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Calling getTravelPlanById`)
        const apiStartTime = Date.now()
        const { data, error: fetchError } = await getTravelPlanById(context, id!)
        const apiDuration = Date.now() - apiStartTime
        console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - getTravelPlanById completed`, {
          duration: `${apiDuration}ms`,
          hasData: !!data,
          hasError: !!fetchError,
          errorMessage: fetchError?.message,
        })
        
        if (!isMountedRef.current) {
          console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Aborted after API (unmounted)`)
          return
        }

        if (fetchError || !data) {
          console.error(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Error:`, fetchError)
          setError(fetchError || new Error('Travel plan not found'))
          setLoading(false)
          return
        }

        console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Setting plan state`)
        setPlan(data)

        // Fetch team name
        try {
          console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Fetching team name`)
          const teamStartTime = Date.now()
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', data.team_id)
            .eq('org_id', context.orgId)
            .single()
          const teamDuration = Date.now() - teamStartTime
          console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Team fetch completed`, {
            duration: `${teamDuration}ms`,
            hasData: !!teamData,
            hasError: !!teamError,
          })

          if (!isMountedRef.current) return

          if (!teamError && teamData) {
            setTeamName(teamData.name)
          } else {
            setTeamName('Unknown Team')
          }
        } catch (err) {
          if (!isMountedRef.current) return
          console.error(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Team fetch error:`, err)
          setTeamName('Unknown Team')
        }

        // Fetch emergency contact (first coach)
        try {
          console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Fetching emergency contact`)
          const coachStartTime = Date.now()
          const { data: coachData, error: coachError } = await supabase
            .from('organization_members')
            .select('user:users(display_name, phone), role')
            .eq('org_id', context.orgId)
            .eq('role', 'coach')
            .limit(1)
            .maybeSingle()
          const coachDuration = Date.now() - coachStartTime
          console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Coach fetch completed`, {
            duration: `${coachDuration}ms`,
            hasData: !!coachData,
            hasError: !!coachError,
          })

          if (!isMountedRef.current) return

          if (!coachError && coachData?.user) {
            const user = coachData.user as { display_name: string | null; phone: string | null }
            if (user.phone) {
              setEmergencyContact({
                name: user.display_name || 'Coach',
                phone: user.phone,
                role: 'Head Coach',
              })
            }
          }
        } catch (err) {
          if (!isMountedRef.current) return
          console.error(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchId} - Coach fetch error:`, err)
        }
      } catch (err) {
        if (!isMountedRef.current) return
        console.error(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchPlanCountRef.current} - Unexpected error:`, err)
        setError(err instanceof Error ? err : new Error('Failed to load travel plan'))
      } finally {
        const totalDuration = Date.now() - fetchStartTime
        console.log(`[TravelDetail:${componentIdRef.current}] fetchPlan #${fetchPlanCountRef.current} - COMPLETE`, {
          duration: `${totalDuration}ms`,
          isMounted: isMountedRef.current,
        })
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchPlan()
  }, [id, context.orgId, isReady, location.key]) // location.key changes when navigating back

  useEffect(() => {
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[TravelDetail:${componentIdRef.current}] Effect #${effectId} - Fetch events`, {
      timestamp: new Date().toISOString(),
      hasPlan: !!plan,
      planId: plan?.id,
      isReady,
      isMounted: isMountedRef.current,
    })

    if (!plan || !isReady) {
      console.log(`[TravelDetail:${componentIdRef.current}] Effect #${effectId} - Early return`, {
        reason: !plan ? 'no plan' : 'not ready',
      })
      return
    }

    let cancelled = false
    const currentPlan = plan

    async function fetchEvents() {
      fetchEventsCountRef.current++
      const fetchId = fetchEventsCountRef.current
      const fetchStartTime = Date.now()
      console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} START`, {
        timestamp: new Date().toISOString(),
        planId: currentPlan.id,
        effectId,
      })

      if (cancelled || !isMountedRef.current) {
        console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - Aborted`, {
          cancelled,
          isMounted: isMountedRef.current,
        })
        return
      }
      setEventsLoading(true)
      setEventsError(null)
      try {
        const startDate = new Date(currentPlan.start_date)
        const endDate = new Date(currentPlan.end_date)
        endDate.setHours(23, 59, 59, 999)

        console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - Calling getEvents`)
        const apiStartTime = Date.now()
        const { data, error: fetchError } = await getEvents(context, {
          startDate,
          endDate,
          teamId: currentPlan.team_id,
        })
        const apiDuration = Date.now() - apiStartTime
        console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - getEvents completed`, {
          duration: `${apiDuration}ms`,
          hasData: !!data,
          dataLength: data?.length,
          hasError: !!fetchError,
          errorMessage: fetchError?.message,
        })

        if (cancelled || !isMountedRef.current) {
          console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - Aborted after API`, {
            cancelled,
            isMounted: isMountedRef.current,
          })
          return
        }

        if (fetchError) {
          console.error(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - Error:`, fetchError)
          setEventsError(fetchError)
          setTripEvents([])
        } else {
          console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - Setting events state`, {
            count: data?.length || 0,
          })
          setTripEvents(data || [])
        }
      } catch (err) {
        if (cancelled || !isMountedRef.current) return
        console.error(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - Unexpected error:`, err)
        setEventsError(err instanceof Error ? err : new Error('Failed to load events'))
        setTripEvents([])
      } finally {
        const totalDuration = Date.now() - fetchStartTime
        console.log(`[TravelDetail:${componentIdRef.current}] fetchEvents #${fetchId} - COMPLETE`, {
          duration: `${totalDuration}ms`,
          cancelled,
          isMounted: isMountedRef.current,
        })
        if (!cancelled && isMountedRef.current) {
          setEventsLoading(false)
        }
      }
    }

    fetchEvents()

    return () => {
      console.log(`[TravelDetail:${componentIdRef.current}] Effect #${effectId} - Cleanup (cancelling fetchEvents)`)
      cancelled = true
    }
  }, [plan?.id, plan?.start_date, plan?.end_date, plan?.team_id, context.orgId, isReady])

  function formatEventTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  async function handleCopy(text: string, label: string) {
    if (!text) {
      setCopyError('Nothing to copy')
      setTimeout(() => setCopyError(null), 3000)
      return
    }

    const result = await copyToClipboard(text)
    if (result.success) {
      setCopiedText(label)
      setCopyError(null)
      setTimeout(() => setCopiedText(null), 2000)
    } else {
      setCopyError(result.error?.message || 'Failed to copy')
      setTimeout(() => setCopyError(null), 3000)
    }
  }

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Travel', path: '/portal/travel' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (error || !plan) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Travel', path: '/portal/travel' },
          { label: 'Error' },
        ]}
      >
        <Card className="text-center py-12">
          <Icon name="error" size="text-6xl" className="text-red-400 mb-4" />
          <CardTitle className="mb-2">Error loading travel plan</CardTitle>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {error?.message || 'Travel plan not found'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={() => navigate('/portal/travel')}>
              <Icon name="arrow_back" size="text-sm" className="mr-2" />
              Back to Travel
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <Icon name="refresh" size="text-sm" className="mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </PortalLayout>
    )
  }

  const meetingLocations = parseMeetingLocations(plan.meeting_locations)

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Travel', path: '/portal/travel' },
        { label: plan.title },
      ]}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <PageTitle>{plan.title}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              {plan.location} • {formatDateRange(plan.start_date, plan.end_date)}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">
              {teamName}
            </p>
          </div>
          {plan.status === 'cancelled' && (
            <span className="inline-block px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded">
              {t('portal.travel.badges.cancelled')}
            </span>
          )}
        </div>

        {/* Quick Summary Banner */}
        <Card className="bg-gradient-to-r from-[var(--org-btn-primary-bg, #137fec)]/5 to-slate-50 dark:to-slate-800/50 border-l-4 border-[var(--org-btn-primary-bg, #137fec)] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Duration</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
              </p>
            </div>
            {plan.hotel_name && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Lodging</p>
                <p className="text-lg font-black text-slate-900 dark:text-white truncate">{plan.hotel_name}</p>
              </div>
            )}
            {tripEvents.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Events</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{tripEvents.length} scheduled</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation & Timing */}
          {plan.venue_name && plan.venue_address && (
            <div>
              <Card className="p-6 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="location_on" size="text-2xl" />
                  Venue Location
                </div>
                <div className="pt-12">
                  {(() => {
                    const venueHeader = plan.venue_name && plan.venue_name !== plan.venue_address
                      ? plan.venue_name
                      : (plan.venue_address ? plan.venue_address.split(',')[0].trim() : 'Venue')
                    const showAddress = plan.venue_address && plan.venue_address !== venueHeader
                    
                    return (
                      <>
                        <CardTitle className="text-xl mb-2">{venueHeader}</CardTitle>
                        {showAddress && (
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">{plan.venue_address}</p>
                        )}
                      </>
                    )
                  })()}
                
                {/* Smart Map Links */}
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Open in Maps</p>
                  <div className="flex flex-wrap gap-2">
                    {googleMapsLink(plan.venue_address) ? (
                      <a href={googleMapsLink(plan.venue_address)!} target="_blank" rel="noreferrer">
                        <Button variant="primary" className="text-sm px-4 py-2">
                          <Icon name="map" size="text-sm" className="mr-2" />
                          Google Maps
                        </Button>
                      </a>
                    ) : (
                      <Button variant="primary" className="text-sm px-4 py-2" disabled>
                        <Icon name="map" size="text-sm" className="mr-2" />
                        Google Maps
                      </Button>
                    )}
                    {appleMapsLink(plan.venue_address) ? (
                      <a href={appleMapsLink(plan.venue_address)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="map" size="text-sm" className="mr-2" />
                          Apple Maps
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="map" size="text-sm" className="mr-2" />
                        Apple Maps
                      </Button>
                    )}
                    {wazeLink(plan.venue_address) ? (
                      <a href={wazeLink(plan.venue_address)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="navigation" size="text-sm" className="mr-2" />
                          Waze
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="navigation" size="text-sm" className="mr-2" />
                        Waze
                      </Button>
                    )}
                    <Button 
                      variant="secondary" 
                      className="text-sm px-4 py-2"
                      onClick={() => plan.venue_address && handleCopy(plan.venue_address, 'Address')}
                      disabled={!plan.venue_address}
                    >
                      <Icon name={copiedText === 'Address' ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                      {copiedText === 'Address' ? 'Copied!' : 'Copy Address'}
                    </Button>
                    {copyError && copiedText === 'Address' && (
                      <span className="text-xs text-red-500">{copyError}</span>
                    )}
                  </div>
                </div>

                {/* Ride-Share Shortcuts */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Need a Ride?</p>
                  <div className="flex flex-wrap gap-2">
                    {uberLink(plan.venue_address) ? (
                      <a href={uberLink(plan.venue_address)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="local_taxi" size="text-sm" className="mr-2" />
                          Uber
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="local_taxi" size="text-sm" className="mr-2" />
                        Uber
                      </Button>
                    )}
                    {lyftLink(plan.venue_address) ? (
                      <a href={lyftLink(plan.venue_address)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="local_taxi" size="text-sm" className="mr-2" />
                          Lyft
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="local_taxi" size="text-sm" className="mr-2" />
                        Lyft
                      </Button>
                    )}
                  </div>
                </div>
                </div>
              </Card>
            </div>
          )}

          {/* Meeting Locations */}
          {meetingLocations.length > 0 && (
            <div>
              <div className="mb-4">
                <div className="inline-block bg-black text-white px-4 py-2 flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="group" size="text-2xl" />
                  Meeting Locations
                </div>
              </div>
              <div className="space-y-4">
                {meetingLocations.map((meeting, idx) => (
                  <Card key={idx} className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">{meeting.name}</CardTitle>
                      {meeting.time && (
                        <span className="text-sm font-bold text-[var(--org-link-color)] bg-[var(--org-btn-primary-bg)]/10 px-3 py-1 rounded">
                          {meeting.time}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{meeting.address}</p>
                    {meeting.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
                        {meeting.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(meeting.maps_url || googleMapsLink(meeting.address)) ? (
                        <a href={meeting.maps_url || googleMapsLink(meeting.address)!} target="_blank" rel="noreferrer">
                          <Button variant="primary" className="text-sm px-4 py-2">
                            <Icon name="map" size="text-sm" className="mr-2" />
                            View on Maps
                          </Button>
                        </a>
                      ) : (
                        <Button variant="primary" className="text-sm px-4 py-2" disabled>
                          <Icon name="map" size="text-sm" className="mr-2" />
                          View on Maps
                        </Button>
                      )}
                      <Button 
                        variant="secondary" 
                        className="text-sm px-4 py-2"
                        onClick={() => handleCopy(meeting.address, `Meeting ${idx}`)}
                        disabled={!meeting.address}
                      >
                        <Icon name={copiedText === `Meeting ${idx}` ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                        {copiedText === `Meeting ${idx}` ? 'Copied!' : 'Copy Address'}
                      </Button>
                      {copyError && copiedText === `Meeting ${idx}` && (
                        <span className="text-xs text-red-500">{copyError}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Event Schedule */}
          <div>
            <Card className="p-6 relative">
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                <Icon name="event" size="text-2xl" />
                Event Schedule
              </div>
              <div className="pt-12">
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[var(--org-btn-primary-bg, #137fec)]"></div>
                </div>
              ) : eventsError ? (
                <div className="text-center py-8">
                  <Icon name="error" size="text-5xl" className="text-red-400 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 mb-2">Error loading events</p>
                  <p className="text-xs text-red-500">{eventsError.message}</p>
                </div>
              ) : tripEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="event_busy" size="text-5xl" className="text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No events scheduled during these dates.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tripEvents.map((event) => (
                    <div key={event.id} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            • {formatEventTime(event.start_time)}–{formatEventTime(event.end_time)}
                          </p>
                          {event.event_location?.venue_name && (
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                              <Icon name="location_on" size="text-sm" />
                              {event.event_location.venue_name}
                            </p>
                          )}
                        </div>
                        {googleCalendarLink({
                          title: event.title,
                          startTime: event.start_time,
                          endTime: event.end_time,
                          location: event.event_location?.venue_name || '',
                          notes: event.notes || '',
                        }) ? (
                          <a
                            href={googleCalendarLink({
                              title: event.title,
                              startTime: event.start_time,
                              endTime: event.end_time,
                              location: event.event_location?.venue_name || '',
                              notes: event.notes || '',
                            })!}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="secondary" className="text-xs px-3 py-1">
                              <Icon name="calendar_today" size="text-xs" className="mr-1" />
                              Add to Calendar
                            </Button>
                          </a>
                        ) : (
                          <Button variant="secondary" className="text-xs px-3 py-1" disabled>
                            <Icon name="calendar_today" size="text-xs" className="mr-1" />
                            Add to Calendar
                          </Button>
                        )}
                      </div>
                      {/* Venue Insights for this event */}
                      {event.event_location?.place_id && (
                        <div className="mt-4">
                          <VenueInsights placeId={event.event_location.place_id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </Card>
          </div>

          {/* Additional Notes */}
          {plan.notes && (
            <div>
              <Card className="p-6 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="notes" size="text-2xl" />
                  Additional Notes
                </div>
                <div className="pt-12">
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {plan.notes}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions & Emergency Info */}
        <div className="space-y-6">
          {/* Emergency Contact Card */}
          {emergencyContact && emergencyContact.phone && (
            <Card className="p-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="emergency" size="text-2xl" className="text-red-600 dark:text-red-400" />
                <CardTitle className="text-red-900 dark:text-red-100">Emergency Contact</CardTitle>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Coach (Urgent)</p>
                  <p className="font-black text-red-900 dark:text-red-100">{emergencyContact.name}</p>
                  <a href={`tel:${emergencyContact.phone}`} className="text-red-600 dark:text-red-400 font-bold hover:underline">
                    {emergencyContact.phone}
                  </a>
                </div>
                <div className="pt-3 border-t border-red-200 dark:border-red-900">
                  <a href={`tel:${emergencyContact.phone}`}>
                    <Button variant="primary" className="w-full bg-red-600 hover:bg-red-700 text-white">
                      <Icon name="phone" size="text-sm" className="mr-2" />
                      Call Coach Now
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Calendar Actions */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="calendar_add_on" size="text-xl" />
              Add to Calendar
            </CardTitle>
            <div>
              {googleCalendarLink({
                title: plan.title,
                startTime: plan.start_date,
                endTime: plan.end_date,
                location: plan.location,
                notes: plan.notes || '',
              }) ? (
                <a
                  href={googleCalendarLink({
                    title: plan.title,
                    startTime: plan.start_date,
                    endTime: plan.end_date,
                    location: plan.location,
                    notes: plan.notes || '',
                  })!}
                  target="_blank"
                  rel="noreferrer"
                  className="block mb-3"
                >
                  <Button variant="secondary" className="w-full text-sm justify-start">
                    <Icon name="event" size="text-sm" className="mr-2" />
                    Google Calendar
                  </Button>
                </a>
              ) : (
                <Button variant="secondary" className="w-full text-sm justify-start mb-3" disabled>
                  <Icon name="event" size="text-sm" className="mr-2" />
                  Google Calendar
                </Button>
              )}
              {appleCalendarLink({
                title: plan.title,
                startTime: plan.start_date,
                endTime: plan.end_date,
                location: plan.location,
              }) ? (
                <a
                  href={appleCalendarLink({
                    title: plan.title,
                    startTime: plan.start_date,
                    endTime: plan.end_date,
                    location: plan.location,
                  })!}
                  download={`${plan.title.replace(/[^a-z0-9]/gi, '_')}.ics`}
                  className="block"
                >
                  <Button variant="secondary" className="w-full text-sm justify-start">
                    <Icon name="event" size="text-sm" className="mr-2" />
                    Apple Calendar
                  </Button>
                </a>
              ) : (
                <Button variant="secondary" className="w-full text-sm justify-start" disabled>
                  <Icon name="event" size="text-sm" className="mr-2" />
                  Apple Calendar
                </Button>
              )}
            </div>
          </Card>

          {/* Lodging */}
          {plan.hotel_name && (
            <Card className="p-6">
              <CardTitle className="mb-4 flex items-center gap-2">
                <Icon name="hotel" size="text-xl" />
                Lodging
              </CardTitle>
              {(() => {
                const hotelHeader = plan.hotel_name && plan.hotel_name !== plan.hotel_address
                  ? plan.hotel_name
                  : (plan.hotel_address ? plan.hotel_address.split(',')[0].trim() : 'Hotel')
                const showAddress = plan.hotel_address && plan.hotel_address !== hotelHeader
                
                return (
                  <>
                    <p className="font-black text-slate-900 dark:text-white mb-1">{hotelHeader}</p>
                    {showAddress && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{plan.hotel_address}</p>
                    )}
                  </>
                )
              })()}
              
              <div className="space-y-3 mb-4">
                {plan.hotel_phone && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Phone</p>
                    <a href={`tel:${plan.hotel_phone}`} className="text-[var(--org-link-color)] font-bold hover:underline">
                      {plan.hotel_phone}
                    </a>
                  </div>
                )}
                {plan.hotel_confirmation && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Confirmation</p>
                    <p className="font-mono text-slate-900 dark:text-white font-bold">{plan.hotel_confirmation}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {plan.hotel_phone && (
                  <a href={`tel:${plan.hotel_phone}`} className="block">
                    <Button variant="primary" className="w-full text-sm">
                      <Icon name="phone" size="text-sm" className="mr-2" />
                      Call Front Desk
                    </Button>
                  </a>
                )}
                {plan.hotel_address && googleMapsLink(plan.hotel_address) && (
                  <a href={googleMapsLink(plan.hotel_address)!} target="_blank" rel="noreferrer" className="block">
                    <Button variant="secondary" className="w-full text-sm">
                      <Icon name="map" size="text-sm" className="mr-2" />
                      View on Maps
                    </Button>
                  </a>
                )}
                {plan.hotel_confirmation && (
                  <Button 
                    variant="secondary" 
                    className="w-full text-sm"
                    onClick={() => handleCopy(plan.hotel_confirmation!, 'Confirmation')}
                  >
                    <Icon name={copiedText === 'Confirmation' ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                    {copiedText === 'Confirmation' ? 'Copied!' : 'Copy Confirmation'}
                  </Button>
                )}
                {copyError && copiedText === 'Confirmation' && (
                  <p className="text-xs text-red-500 mt-1">{copyError}</p>
                )}
              </div>
            </Card>
          )}

          {/* Nearby Amenities */}
          <NearbyAmenities
            key={`${plan.venue_place_id || ''}-${plan.venue_lat || ''}-${plan.venue_lng || ''}`}
            latitude={plan.venue_lat}
            longitude={plan.venue_lng}
            placeId={plan.venue_place_id}
            eventType="tournament"
            eventStartTime={plan.start_date}
            variant="travel"
          />

          {/* Weather Info */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="wb_sunny" size="text-xl" />
              Weather
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Check the forecast for {plan.location}
            </p>
            <a
              href={`https://weather.com/weather/tenday/l/${encodeURIComponent(plan.location)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" className="w-full text-sm">
                <Icon name="cloud" size="text-sm" className="mr-2" />
                View Forecast
              </Button>
            </a>
          </Card>

          {/* Last Updated */}
          <Card className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Icon name="info" size="text-sm" />
              <span>Last updated: {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}</span>
            </div>
          </Card>
        </div>
      </div>
    </PortalLayout>
  )
}
