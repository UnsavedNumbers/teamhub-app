import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { getTravelPlanById, formatDateRange, resolveAllTravelContactsForPlan, getTravelPlanContacts } from '../data/services/travelService'
import { getOrganizationTravelContacts } from '../data/services/organizationTravelContactsService'
import { getOrganizationDetails } from '../data/services/organizationService'
import { getEvents } from '../data/services/eventsService'
import { USE_FAKE_DATA } from '../data/config'
import { TRAVEL_CONTACT_CATEGORIES, TRAVEL_CONTACT_CATEGORY_LABELS, type ResolvedTravelContacts, type TravelContactCategory } from '../types/travelContacts'
import type { TravelPlanContactRow } from '../types/travelContacts'
import type { OrganizationTravelContactRow } from '../types/travelContacts'
import type { FakeTravelPlan } from '../data/fake/fakeTravel'
import type { CalendarEvent } from '../types/calendar'
import { supabase } from '../lib/supabase'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import AddToCalendarActions from '../components/calendar/AddToCalendarActions'
import VenueInsights from '../components/portal/VenueInsights'
import NearbyAmenities from '../components/portal/NearbyAmenities'
import { VenueMapActionButtons, VenueRideShareButtons } from '../components/portal/VenueActionButtons'
import { PhotoSection } from '../components/galleries/PhotoSection'
import { useNeighborhoodSummaryDirect } from '../hooks/useVenueInsights'
import { useT } from '../i18n/useI18n'
import type { CalendarExportEvent } from '../features/calendar/addToCalendar'
import { getLink, RouteKeys } from '../utils/routes'
import { appleMapsLink, copyToClipboard, googleMapsLink, lyftLink, uberLink, wazeLink } from '../utils/venueActionLinks'

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

function toTravelCalendarExportEvent(event: {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string | null
  description?: string | null
}): CalendarExportEvent {
  return {
    id: event.id,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    description: event.description,
  }
}

export default function TravelDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()

  // Add lifecycle logging
  useDebugLifecycle('TravelDetail', { travelPlanId: id })
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
    const componentId = componentIdRef.current
    effectRunCountRef.current++
    console.log(`[TravelDetail:${componentId}] Effect #${effectRunCountRef.current} - Route validation`, {
      timestamp: new Date().toISOString(),
      id,
      isReady,
    })
    if (isReady && (!id || typeof id !== 'string' || id.trim() === '')) {
      console.error(`[TravelDetail:${componentId}] Invalid travel plan ID in route params`)
      navigate(getLink(RouteKeys.PORTAL_TRAVEL), { replace: true })
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
  const [resolvedContacts, setResolvedContacts] = useState<ResolvedTravelContacts | null>(null)
  const [planContactsRaw, setPlanContactsRaw] = useState<Record<TravelContactCategory, TravelPlanContactRow | null> | null>(null)
  const [defaultContact, setDefaultContact] = useState<OrganizationTravelContactRow | null>(null)
  const [orgFallbackContact, setOrgFallbackContact] = useState<{ email: string | null; phone: string | null } | null>(null)
  const [commuteStartLocation, setCommuteStartLocation] = useState<string>(() => {
    const saved = localStorage.getItem('commuteStartLocation')
    return saved || ''
  })
  const [isEditingCommute, setIsEditingCommute] = useState(false)
  const [commuteInputValue, setCommuteInputValue] = useState(commuteStartLocation)
  const isMountedRef = useRef(true)

  // Direct Google Places API call for Area Summary (bypasses edge function)
  const venuePlaceIdForSummary = plan?.venue_place_id ?? null
  const { data: neighborhoodSummaryResult, isLoading: neighborhoodSummaryLoading } = useNeighborhoodSummaryDirect(venuePlaceIdForSummary)

  useEffect(() => {
    const componentId = componentIdRef.current
    const renderCountAtMount = renderCountRef.current
    const effectRunsAtMount = effectRunCountRef.current
    const fetchPlanCallsAtMount = fetchPlanCountRef.current
    const fetchEventsCallsAtMount = fetchEventsCountRef.current
    const mountTime = new Date().toISOString()
    console.log(`[TravelDetail:${componentId}] MOUNT`, { timestamp: mountTime })
    isMountedRef.current = true
    return () => {
      const unmountTime = new Date().toISOString()
      console.log(`[TravelDetail:${componentId}] UNMOUNT`, {
        timestamp: unmountTime,
        mountTime,
        renderCount: renderCountAtMount,
        effectRuns: effectRunsAtMount,
        fetchPlanCalls: fetchPlanCallsAtMount,
        fetchEventsCalls: fetchEventsCallsAtMount,
      })
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const componentId = componentIdRef.current
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[TravelDetail:${componentId}] Effect #${effectId} - Fetch plan`, {
      timestamp: new Date().toISOString(),
      isReady,
      id,
      contextOrgId: context?.orgId,
      isMounted: isMountedRef.current,
    })

    if (!isReady || !id) {
      console.log(`[TravelDetail:${componentId}] Effect #${effectId} - Early return`, {
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
      console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} START`, {
        timestamp: new Date().toISOString(),
        id,
        effectId,
      })

      try {
        if (!isMountedRef.current) {
          console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Aborted (unmounted)`)
          return
        }
        setLoading(true)
        setError(null)
        
        console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Calling getTravelPlanById`)
        const apiStartTime = Date.now()
        const { data, error: fetchError } = await getTravelPlanById(context, id!)
        const apiDuration = Date.now() - apiStartTime
        console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - getTravelPlanById completed`, {
          duration: `${apiDuration}ms`,
          hasData: !!data,
          hasError: !!fetchError,
          errorMessage: fetchError?.message,
        })
        
        if (!isMountedRef.current) {
          console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Aborted after API (unmounted)`)
          return
        }

        if (fetchError || !data) {
          console.error(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Error:`, fetchError)
          setError(fetchError || new Error('Travel plan not found'))
          setLoading(false)
          return
        }

        console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Setting plan state`)
        setPlan(data)

        // Fetch team name
        try {
          if (!isMountedRef.current) return

          if (USE_FAKE_DATA) {
            setTeamName(data.team?.name || 'Travel Team')
          } else {
            console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Fetching team name`)
            const teamStartTime = Date.now()
            const { data: teamData, error: teamError } = await supabase
              .from('teams')
              .select('name')
              .eq('id', data.team_id)
              .eq('org_id', context.orgId)
              .single()
            const teamDuration = Date.now() - teamStartTime
            console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Team fetch completed`, {
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
          }
        } catch (err) {
          if (!isMountedRef.current) return
          console.error(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Team fetch error:`, err)
          setTeamName(USE_FAKE_DATA ? (data.team?.name || 'Travel Team') : 'Unknown Team')
        }

        // Fetch emergency contact (first coach) in real mode only.
        // In demo mode, use resolved travel contacts so card data matches org settings.
        try {
          if (USE_FAKE_DATA) {
            setEmergencyContact(null)
          } else {
            console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Fetching emergency contact`)
            const coachStartTime = Date.now()
            const { data: coachData, error: coachError } = await supabase
              .from('organization_members')
              .select('user:users(display_name, phone), role')
              .eq('org_id', context.orgId)
              .eq('role', 'coach')
              .limit(1)
              .maybeSingle()
            const coachDuration = Date.now() - coachStartTime
            console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Coach fetch completed`, {
              duration: `${coachDuration}ms`,
              hasData: !!coachData,
              hasError: !!coachError,
            })

            if (!isMountedRef.current) return

            if (!coachError && coachData?.user) {
              const user = coachData.user as unknown as { display_name: string | null; phone: string | null }
              if (user.phone) {
                setEmergencyContact({
                  name: user.display_name || 'Coach',
                  phone: user.phone,
                  role: 'Head Coach',
                })
              }
            }
          }
        } catch (err) {
          if (!isMountedRef.current) return
          console.error(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Coach fetch error:`, err)
        }
        

        
        // Fetch resolved travel contacts
        try {
            console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchId} - Resolving contacts`)
            const { data: contactsData, error: contactsError } = await resolveAllTravelContactsForPlan(context, id!)
            if (contactsError) throw contactsError

            if (isMountedRef.current && contactsData) {
                setResolvedContacts(contactsData)
            }
        } catch (err) {
            console.error('Error fetching resolved travel contacts', err)
        }

        // Raw plan contacts (to know which are custom)
        try {
            const { data: rawData } = await getTravelPlanContacts(context, id!)
            if (isMountedRef.current && rawData) {
                setPlanContactsRaw(rawData)
            }
        } catch (err) {
            console.error('Error fetching plan contacts', err)
        }

        // Org default contact for "Everything Else" row; fallback to org details if no travel default
        try {
            const { data: orgContacts } = await getOrganizationTravelContacts(context)
            if (isMountedRef.current && orgContacts?.default && (orgContacts.default.email || orgContacts.default.phone)) {
                setDefaultContact(orgContacts.default)
            }
        } catch (err) {
            console.error('Error fetching org default contact', err)
        }
        try {
            const { data: orgDetails } = await getOrganizationDetails(context.orgId)
            if (isMountedRef.current && orgDetails) {
                setOrgFallbackContact({
                    email: orgDetails.email ?? null,
                    phone: orgDetails.phone ?? null,
                })
            }
        } catch (err) {
            console.error('Error fetching org details for fallback contact', err)
        }
      } catch (err) {
        if (!isMountedRef.current) return
        console.error(`[TravelDetail:${componentId}] fetchPlan #${fetchPlanCountRef.current} - Unexpected error:`, err)
        setError(err instanceof Error ? err : new Error('Failed to load travel plan'))
      } finally {
        const totalDuration = Date.now() - fetchStartTime
        console.log(`[TravelDetail:${componentId}] fetchPlan #${fetchPlanCountRef.current} - COMPLETE`, {
          duration: `${totalDuration}ms`,
          isMounted: isMountedRef.current,
        })
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchPlan()
  }, [context, id, isReady, location.key]) // location.key changes when navigating back

  useEffect(() => {
    const componentId = componentIdRef.current
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[TravelDetail:${componentId}] Effect #${effectId} - Fetch events`, {
      timestamp: new Date().toISOString(),
      hasPlan: !!plan,
      planId: plan?.id,
      isReady,
      isMounted: isMountedRef.current,
    })

    if (!plan || !isReady) {
      console.log(`[TravelDetail:${componentId}] Effect #${effectId} - Early return`, {
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
      console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} START`, {
        timestamp: new Date().toISOString(),
        planId: currentPlan.id,
        effectId,
      })

      if (cancelled || !isMountedRef.current) {
        console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - Aborted`, {
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

        console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - Calling getEvents`)
        const apiStartTime = Date.now()
        const { data, error: fetchError } = await getEvents(context, {
          startDate,
          endDate,
          teamId: currentPlan.team_id,
        })
        const apiDuration = Date.now() - apiStartTime
        console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - getEvents completed`, {
          duration: `${apiDuration}ms`,
          hasData: !!data,
          dataLength: data?.length,
          hasError: !!fetchError,
          errorMessage: fetchError?.message,
        })

        if (cancelled || !isMountedRef.current) {
          console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - Aborted after API`, {
            cancelled,
            isMounted: isMountedRef.current,
          })
          return
        }

        if (fetchError) {
          console.error(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - Error:`, fetchError)
          setEventsError(fetchError)
          setTripEvents([])
        } else {
          console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - Setting events state`, {
            count: data?.length || 0,
          })
          setTripEvents(data || [])
        }
      } catch (err) {
        if (cancelled || !isMountedRef.current) return
        console.error(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - Unexpected error:`, err)
        setEventsError(err instanceof Error ? err : new Error('Failed to load events'))
        setTripEvents([])
      } finally {
        const totalDuration = Date.now() - fetchStartTime
        console.log(`[TravelDetail:${componentId}] fetchEvents #${fetchId} - COMPLETE`, {
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
      console.log(`[TravelDetail:${componentId}] Effect #${effectId} - Cleanup (cancelling fetchEvents)`)
      cancelled = true
    }
  }, [context, isReady, plan])

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

  function handleSaveCommuteLocation() {
    const trimmed = commuteInputValue.trim()
    setCommuteStartLocation(trimmed)
    localStorage.setItem('commuteStartLocation', trimmed)
    setIsEditingCommute(false)
  }

  function getCommuteDirectionsUrl(destination: string | null | undefined): string | null {
    if (!commuteStartLocation || !destination) return null
    const origin = encodeURIComponent(commuteStartLocation.trim())
    const dest = encodeURIComponent(destination.trim())
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&traffic=1`
  }

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: getLink(RouteKeys.PORTAL_DASHBOARD) },
          { label: 'Travel', path: getLink(RouteKeys.PORTAL_TRAVEL) },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (error || !plan) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: getLink(RouteKeys.PORTAL_DASHBOARD) },
          { label: 'Travel', path: getLink(RouteKeys.PORTAL_TRAVEL) },
          { label: 'Error' },
        ]}
      >
        <Card className="text-center py-12">
          <Icon name="error" size="text-6xl" className="text-red-400 mb-4" />
          <CardTitle className="mb-2">Error loading travel plan</CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {error?.message || 'Travel plan not found'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={() => navigate(getLink(RouteKeys.PORTAL_TRAVEL))}>
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
        { label: 'Home', path: getLink(RouteKeys.PORTAL_DASHBOARD) },
        { label: 'Travel', path: getLink(RouteKeys.PORTAL_TRAVEL) },
        { label: plan.title },
      ]}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <PageTitle>{plan.title}</PageTitle>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-light tracking-wide mt-2">
              {plan.location} - {formatDateRange(plan.start_date, plan.end_date)}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-2">
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
        <Card className="bg-gradient-to-r from-[var(--org-btn-primary-bg, #137fec)]/5 to-gray-50 dark:to-gray-800/50 border-l-4 border-[var(--org-btn-primary-bg, #137fec)] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Duration</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">
                {Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
              </p>
            </div>
            {plan.hotel_name && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Lodging</p>
                <p className="text-lg font-black text-gray-900 dark:text-white truncate">{plan.hotel_name}</p>
              </div>
            )}
            {tripEvents.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Events</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{tripEvents.length} scheduled</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="min-w-0 lg:col-span-2 space-y-6">
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
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{plan.venue_address}</p>
                        )}
                      </>
                    )
                  })()}
                
                {/* Smart Map Links */}
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Open in Maps</p>
                  <VenueMapActionButtons
                    googleUrl={googleMapsLink(plan.venue_address)}
                    appleUrl={appleMapsLink(plan.venue_address)}
                    wazeUrl={wazeLink(plan.venue_address)}
                    onCopyAddress={() => plan.venue_address && handleCopy(plan.venue_address, 'Address')}
                    copied={copiedText === 'Address'}
                    copyError={copyError && copiedText === 'Address' ? copyError : null}
                    fullWidth
                  />
                </div>

                {/* Ride-Share Shortcuts */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Need a Ride?</p>
                  <VenueRideShareButtons
                    uberUrl={uberLink(plan.venue_address)}
                    lyftUrl={lyftLink(plan.venue_address)}
                    fullWidth
                  />
                </div>
                </div>
              </Card>
            </div>
          )}

          {/* Commute Info */}
          {plan.venue_address && (
            <div>
              <Card className="p-6 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="directions_car" size="text-2xl" />
                  Commute Info
                </div>
                <div className="pt-12">
                  {!isEditingCommute ? (
                    <div className="space-y-4">
                      {commuteStartLocation ? (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Your Starting Point</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{commuteStartLocation}</p>
                            </div>
                            <Button
                              variant="secondary"
                              className="text-xs px-3 py-1"
                              onClick={() => {
                                setIsEditingCommute(true)
                                setCommuteInputValue(commuteStartLocation)
                              }}
                            >
                              <Icon name="edit" size="text-sm" className="mr-1" />
                              Edit
                            </Button>
                          </div>
                          {getCommuteDirectionsUrl(plan.venue_address) && (
                            <a
                              href={getCommuteDirectionsUrl(plan.venue_address)!}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <Button variant="primary" className="w-full">
                                <Icon name="navigation" size="text-sm" className="mr-2" />
                                Get Directions with Traffic
                              </Button>
                            </a>
                          )}
                        </>
                      ) : (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Set Your Starting Location</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Save your home, work, or any starting point to quickly get directions with current traffic conditions.
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => setIsEditingCommute(true)}
                            className="w-full"
                          >
                            <Icon name="add_location" size="text-sm" className="mr-2" />
                            Set Starting Location
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Enter Your Starting Location</p>
                      <input
                        type="text"
                        value={commuteInputValue}
                        onChange={(e) => setCommuteInputValue(e.target.value)}
                        placeholder="e.g., 123 Main St, City, State"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg,#137fec)]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={handleSaveCommuteLocation}
                          disabled={!commuteInputValue.trim()}
                          className="flex-1"
                        >
                          <Icon name="check" size="text-sm" className="mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setIsEditingCommute(false)
                            setCommuteInputValue(commuteStartLocation)
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
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
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">{meeting.address}</p>
                    {meeting.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded">
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
                  <p className="text-gray-500 dark:text-gray-400 mb-2">Error loading events</p>
                  <p className="text-xs text-red-500">{eventsError.message}</p>
                </div>
              ) : tripEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="event_busy" size="text-5xl" className="text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No events scheduled during these dates.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tripEvents.map((event) => (
                    <div key={event.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                      <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            - {formatEventTime(event.start_time)}-{formatEventTime(event.end_time)}
                          </p>
                          {/* venue row removed (duplicate shown in VenueInsights header) */}
                        </div>
                        <div className="w-full sm:w-[220px]">
                          <AddToCalendarActions
                            event={toTravelCalendarExportEvent({
                              id: event.id,
                              title: event.title,
                              startTime: event.start_time,
                              endTime: event.end_time,
                              location: event.event_location?.venue_name || '',
                              description: event.notes || '',
                            })}
                            layout="stack"
                            googleVariant="secondary"
                            icsVariant="secondary"
                            buttonClassName="w-full justify-center text-xs px-3 py-1"
                          />
                        </div>
                      </div>
                      {/* Venue Information (Area Summary, etc.): use place_id from event_locations for this event */}
                      {(() => {
                        const eventVenuePlaceId = event.event_location?.place_id ?? null
                        return eventVenuePlaceId ? (
                          <div className="mt-4">
                            <VenueInsights placeId={eventVenuePlaceId} />
                          </div>
                        ) : null
                      })()}
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
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {plan.notes}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions & Contacts */}
        <div className="space-y-6">
          {/* Single Contacts Card - iPhone contact list style */}
          {(emergencyContact?.phone || resolvedContacts || defaultContact || (orgFallbackContact && (orgFallbackContact.email || orgFallbackContact.phone))) && (
            <Card className="p-0 overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="flex items-center gap-2 mb-0">
                  <Icon name="contacts" size="text-xl" className="text-gray-500 dark:text-gray-400" />
                  Contacts
                </CardTitle>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Emergency (Coach) - first row if present */}
                {emergencyContact?.phone && (
                  <div className="flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/50">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 font-semibold text-base">
                      {(emergencyContact.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{emergencyContact.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Emergency - Coach</p>
                    </div>
                    <a href={`tel:${emergencyContact.phone}`} className="flex-shrink-0 p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Call">
                      <Icon name="phone" size="text-lg" />
                    </a>
                  </div>
                )}

                {/* Custom contacts first (plan-specific overrides) */}
                {resolvedContacts && (() => {
                  const customCategories = planContactsRaw
                    ? TRAVEL_CONTACT_CATEGORIES.filter(cat => planContactsRaw[cat]?.is_custom)
                    : []
                  return customCategories.map(category => {
                    const contact = resolvedContacts[category]
                    if (!contact || (!contact.email && !contact.phone)) return null
                    const label = TRAVEL_CONTACT_CATEGORY_LABELS[category]
                    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact'
                    const initial = fullName.charAt(0).toUpperCase() || '?'
                    return (
                      <div key={`custom-${category}`} className="flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/50">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-base">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Call">
                              <Icon name="phone" size="text-lg" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`sms:${contact.phone}`} className="p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Message">
                              <Icon name="sms" size="text-lg" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}

                {/* Non-custom resolved contacts (existing category contacts) */}
                {resolvedContacts && (() => {
                  const nonCustomCategories = planContactsRaw
                    ? TRAVEL_CONTACT_CATEGORIES.filter(cat => !planContactsRaw[cat]?.is_custom)
                    : TRAVEL_CONTACT_CATEGORIES
                  return nonCustomCategories.map(category => {
                    const contact = resolvedContacts[category]
                    if (!contact || (!contact.email && !contact.phone)) return null
                    const label = TRAVEL_CONTACT_CATEGORY_LABELS[category]
                    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact'
                    const initial = fullName.charAt(0).toUpperCase() || '?'
                    return (
                      <div key={category} className="flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/50">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-base">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Call">
                              <Icon name="phone" size="text-lg" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`sms:${contact.phone}`} className="p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Message">
                              <Icon name="sms" size="text-lg" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}

                {/* Last row: Everything Else - org default contact or org details fallback (always shown when either has email/phone) */}
                {(() => {
                  const hasDefault = defaultContact && (defaultContact.email || defaultContact.phone)
                  const hasFallback = orgFallbackContact && (orgFallbackContact.email || orgFallbackContact.phone)
                  if (!hasDefault && !hasFallback) return null
                  const displayName = hasDefault
                    ? ([defaultContact!.first_name, defaultContact!.last_name].filter(Boolean).join(' ') || 'General Info')
                    : 'General Info'
                  const initial = (displayName.charAt(0) || 'G').toUpperCase()
                  const email = hasDefault ? defaultContact!.email : orgFallbackContact!.email
                  const phone = hasDefault ? defaultContact!.phone : orgFallbackContact!.phone
                  return (
                    <div className="flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/50">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-base">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Everything Else</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {phone && (
                          <a href={`tel:${phone}`} className="p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Call">
                            <Icon name="phone" size="text-lg" />
                          </a>
                        )}
                        {phone && (
                          <a href={`sms:${phone}`} className="p-2 rounded-full text-[var(--org-btn-primary-bg)] hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Message">
                            <Icon name="sms" size="text-lg" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </Card>
          )}

          {/* Area Summary (venue's place_id) - fetched directly from Google Places API */}
          {plan?.venue_place_id && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CardTitle className="flex items-center gap-2 mb-0">
                  <Icon name="place" size="text-xl" />
                  Area Overview
                </CardTitle>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  Google
                </span>
              </div>
              {neighborhoodSummaryLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
                </div>
              ) : (() => {
                const summaryData = neighborhoodSummaryResult?.data
                const blocks = summaryData?.area_summary?.content_blocks
                if (!blocks || blocks.length === 0) {
                  const venueName = plan?.venue_name || summaryData?.name || 'this venue'
                  return (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('portal.travel.areaSummaryNotAvailable', { venueName })}
                    </p>
                  )
                }
                return (
                  <div className="space-y-4">
                    {blocks.map((block, idx) => (
                      <div key={idx}>
                        {block.topic !== 'overview' && (
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            {block.topic}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {block.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Card>
          )}

          {/* Quick Calendar Actions */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="calendar_add_on" size="text-xl" />
              Add to Calendar
            </CardTitle>
            <AddToCalendarActions
              event={toTravelCalendarExportEvent({
                id: plan.id,
                title: plan.title,
                startTime: plan.start_date,
                endTime: plan.end_date,
                location: plan.location,
                description: plan.notes || '',
              })}
              buttonClassName="w-full text-sm justify-start"
              googleVariant="secondary"
              icsVariant="primary"
            />
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
                    <p className="font-black text-gray-900 dark:text-white mb-1">{hotelHeader}</p>
                    {showAddress && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.hotel_address}</p>
                    )}
                  </>
                )
              })()}
              
              <div className="space-y-3 mb-4">
                {plan.hotel_phone && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Phone</p>
                    <a href={`tel:${plan.hotel_phone}`} className="text-[var(--org-link-color)] font-bold hover:underline">
                      {plan.hotel_phone}
                    </a>
                  </div>
                )}
                {plan.hotel_confirmation && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Confirmation</p>
                    <p className="font-mono text-gray-900 dark:text-white font-bold">{plan.hotel_confirmation}</p>
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
          {/* Travel Gallery */}
          {id && plan && (
            <PhotoSection
              entityType="travel_plan"
              entityId={id}
              title="Travel Photos"
            />
          )}

          {/* Nearby Amenities */}
          {/* placeId (Google Place ID) is preferred over lat/lng for more accurate results */}
          <NearbyAmenities
            key={`${plan.venue_place_id || ''}-${plan.venue_lat || ''}-${plan.venue_lng || ''}`}
            placeId={plan.venue_place_id}
            latitude={plan.venue_lat}
            longitude={plan.venue_lng}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
          <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Icon name="info" size="text-sm" />
              <span>Last updated: {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}</span>
            </div>
          </Card>
        </div>
      </div>
    </PortalLayout>
  )
}

