import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { startTransition } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { getLink } from '../../utils/routes'
import { showSuccess, showError } from '../../utils/toast'
import { useFeatureGate } from '../../lib/featureGate'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select,
  DatePicker,
  TimePicker,
  Checkbox
} from '../../components/platformAdmin'
import { ConfirmDialog } from '../../components/platformAdmin/ConfirmDialog'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'
import { FileUpload } from '../../components/common/FileUpload'
import { 
    EventFormData, 
    EVENT_TYPE_LABELS, 
    EventType,
    isValidEventTimeOrder,
    RecurringEditMode,
} from '../../types/calendar'
import { uploadTicketBanner } from '../../data/services/organizationService'

interface Team { id: string; name: string }
interface Season { id: string; name: string; team_id: string }

const supabaseAny = supabase as any

/** Format Date for datetime-local input (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditEvent() {
  const { id: eventId } = useParams<{ id: string }>()
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRsvpChangeDialog, setShowRsvpChangeDialog] = useState(false)
  const [pendingRsvpChange, setPendingRsvpChange] = useState<EventFormData | null>(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [hasExistingRSVPs, setHasExistingRSVPs] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringEditMode, setRecurringEditMode] = useState<RecurringEditMode>('this_only')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [hasPaidOrders, setHasPaidOrders] = useState(false)
  const [ticketedEventId, setTicketedEventId] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  const { context, isReady } = useUserContext()
  const { allowed: ticketingAllowed, loading: ticketingGateLoading } = useFeatureGate('ticketing')
  const navigate = useNavigate()
  const t = useT()
  const { isOffline } = useOffline()

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<EventFormData>({
    defaultValues: { 
      title: '', 
      type: 'practice', 
      team_id: '', 
      season_id: '', 
      start_time: '', 
      end_time: '', 
      arrival_time: '', 
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: '',
      uniform_notes: '',
      equipment_notes: '',
      weather_dependent: false,
      external_link: '',
      location: {
         venue_name: '',
         address_line1: '',
         address_line2: '',
         city: '',
         state: '',
         postal_code: '',
         latitude: '',
         longitude: '',
         is_tbd: false,
         is_virtual: false,
         virtual_link: ''
      },
      recurring: {
        enabled: false,
        frequency: 'weekly',
        days_of_week: [],
        end_date: '',
        max_occurrences: ''
      },
      rsvp_enabled: false,
      rsvp_type: null,
      ticketing: {
        is_ticketed: false,
        event_type: 'other',
        sales_immediate: true,
        sales_start_at: '',
        sales_end_at: '',
        status: 'draft',
        event_description: '',
        ticket_banner_url: '',
        ticket_types: []
      }
    },
  })

  const watchTeamId = watch('team_id')
  const watchRSVPEnabled = watch('rsvp_enabled')
  const watchTicketingEnabled = watch('ticketing.is_ticketed')
  const watchTicketSalesImmediate = watch('ticketing.sales_immediate')

  const { fields: ticketTypeFields, append: appendTicketType, remove: removeTicketType } = useFieldArray({
    control,
    name: 'ticketing.ticket_types',
  })


  const fetchEvent = useCallback(async () => {
    if (!isReady || !eventId) return
    
    // Validate eventId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(eventId)) {
      setError('Invalid event ID format')
      setNotFound(true)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    setNotFound(false)
    
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          event_location:event_locations(*),
          recurring_pattern:recurring_event_patterns(*)
        `)
        .eq('id', eventId)
        .single() as { data: {
          id: string
          title: string
          type: string
          team_id: string
          season_id: string
          start_time: string
          end_time: string | null
          arrival_time: string | null
          timezone: string
          notes: string | null
          uniform_notes: string | null
          equipment_notes: string | null
          weather_dependent: boolean | null
          external_link: string | null
          rsvp_enabled: boolean | null
          rsvp_type: string | null
          event_location?: {
            venue_name: string | null
            address_line1: string | null
            address_line2: string | null
            city: string | null
            state: string | null
            postal_code: string | null
            place_id: string | null
            latitude: number | null
            longitude: number | null
            is_tbd: boolean | null
            is_virtual: boolean | null
            virtual_link: string | null
          }
          recurring_pattern?: {
            id: string
            frequency: string
            days_of_week: number[]
            end_date: string | null
            max_occurrences: number | null
          } | null
        } | null; error: { message?: string; code?: string } | null }

      if (eventError) {
        // Check if it's a permission error or not found
        if (eventError.code === 'PGRST116' || eventError.message?.includes('No rows')) {
          setNotFound(true)
          setError('Event not found')
        } else if (eventError.message?.includes('permission') || eventError.message?.includes('RLS')) {
          setError('You do not have permission to view this event')
        } else {
          throw eventError
        }
        setLoading(false)
        return
      }
      
      if (!event) {
        setNotFound(true)
        setError('Event not found')
        setLoading(false)
        return
      }

      // Check for existing RSVPs with safe error handling
      let generalCount = 0
      let athleteCount = 0
      
      try {
        const { count: genCount } = await supabase
          .from('event_general_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
        generalCount = genCount ?? 0
      } catch (err) {
        console.warn('Error checking general RSVPs:', err)
      }

      try {
        const { count: athCount } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
        athleteCount = athCount ?? 0
      } catch (err) {
        console.warn('Error checking athlete RSVPs:', err)
      }

      setHasExistingRSVPs(generalCount > 0 || athleteCount > 0)

      // Populate form with safe defaults
      const startDate = event.start_time ? new Date(event.start_time) : new Date()
      const endDate = event.end_time ? new Date(event.end_time) : new Date()
      
      setValue('title', event.title || '')
      setValue('type', (event.type as any) || 'practice')
      setValue('team_id', event.team_id || '')
      setValue('season_id', event.season_id || '')
      setValue('start_time', new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
      setValue('end_time', new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
      setValue('arrival_time', event.arrival_time ? new Date(new Date(event.arrival_time).getTime() - new Date(event.arrival_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
      setValue('timezone', event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
      setValue('notes', event.notes || '')
      setValue('uniform_notes', event.uniform_notes || '')
      setValue('equipment_notes', event.equipment_notes || '')
      setValue('weather_dependent', event.weather_dependent ?? false)
      setValue('external_link', event.external_link || '')
      setValue('rsvp_enabled', event.rsvp_enabled ?? false)
      setValue('rsvp_type', (event.rsvp_enabled && event.rsvp_type) ? (event.rsvp_type as any) : null)

      if (event.event_location) {
        setValue('location.venue_name', event.event_location.venue_name || '')
        setValue('location.address_line1', event.event_location.address_line1 || '')
        setValue('location.address_line2', event.event_location.address_line2 || '')
        setValue('location.city', event.event_location.city || '')
        setValue('location.state', event.event_location.state || '')
        setValue('location.postal_code', event.event_location.postal_code || '')
        setValue('location.is_tbd', event.event_location.is_tbd || false)
        setValue('location.is_virtual', event.event_location.is_virtual || false)
        setValue('location.virtual_link', event.event_location.virtual_link || '')
        setShowLocationDetails(true)
      }

      // Load recurring pattern if it exists
      if (event.recurring_pattern) {
        setIsRecurring(true)
        setValue('recurring.enabled', true)
        setValue('recurring.frequency', (event.recurring_pattern.frequency as any) || 'weekly')
        setValue('recurring.days_of_week', event.recurring_pattern.days_of_week || [])
        setValue('recurring.end_date', event.recurring_pattern.end_date || '')
        setValue('recurring.max_occurrences', event.recurring_pattern.max_occurrences?.toString() || '')
        setShowRecurring(true)
      }

      // Load ticketing if linked
      const { data: ticketedEvent } = await supabase
        .from('ticketed_events')
        .select('id, event_type, sales_start_at, sales_end_at, status, event_description, ticket_banner_url')
        .eq('event_id', eventId)
        .maybeSingle() as { data: { id: string; event_type: string; sales_start_at: string | null; sales_end_at: string | null; status: string } | null }

      if (ticketedEvent) {
        setTicketedEventId(ticketedEvent.id)
        setValue('ticketing.is_ticketed', true)
        setValue('ticketing.event_type', ticketedEvent.event_type || 'other')
        setValue('ticketing.sales_immediate', !ticketedEvent.sales_start_at)
        setValue('ticketing.sales_start_at', ticketedEvent.sales_start_at
          ? new Date(new Date(ticketedEvent.sales_start_at).getTime() - new Date(ticketedEvent.sales_start_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '')
        setValue('ticketing.sales_end_at', ticketedEvent.sales_end_at
          ? new Date(new Date(ticketedEvent.sales_end_at).getTime() - new Date(ticketedEvent.sales_end_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '')
        setValue('ticketing.status', ticketedEvent.status || 'draft')
        setValue('ticketing.event_description', (ticketedEvent as any).event_description || '')
        setValue('ticketing.ticket_banner_url', (ticketedEvent as any).ticket_banner_url || '')

        const { data: ticketTypes } = await supabase
          .from('ticket_types')
          .select('id, name, description, price_cents, capacity_total, capacity_remaining, sort_order')
          .eq('ticketed_event_id', ticketedEvent.id)
          .order('sort_order') as { data: { id: string; name: string; price_cents: number; capacity_total: number | null; capacity_remaining: number | null; sort_order: number }[] | null }

        if (ticketTypes?.length) {
          const formTicketTypes = ticketTypes.map(tt => {
            const sold = (tt.capacity_total != null && tt.capacity_remaining != null)
              ? tt.capacity_total - tt.capacity_remaining
              : 0
            return {
              id: tt.id,
              soldCount: sold,
              name: tt.name,
              description: (tt as any).description || '',
              price_dollars: (tt.price_cents / 100).toFixed(2),
              capacity: tt.capacity_total != null ? String(tt.capacity_total) : ''
            }
          })
          setValue('ticketing.ticket_types', formTicketTypes)
        }

        const { count: paidCount } = await supabase
          .from('ticket_orders')
          .select('*', { count: 'exact', head: true })
          .eq('ticketed_event_id', ticketedEvent.id)
          .eq('status', 'paid')
        setHasPaidOrders((paidCount ?? 0) > 0)
      }

      // Fetch teams and seasons
      await fetchTeams()
      if (event.team_id) {
        await fetchSeasons(event.team_id)
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Failed to load event'
      setError(errorMessage)
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('RLS'))) {
        setError('You do not have permission to view this event')
      }
    } finally {
      setLoading(false)
    }
  }, [isReady, eventId, setValue])

  const fetchTeams = useCallback(async () => {
    if (!isReady) return
    
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', context.orgId!)
        .eq('is_active', true)
        .order('name')
    
    if (!error && data) {
      setTeams(data)
    }
  }, [context, isReady])

  const fetchSeasons = useCallback(async (teamId: string) => {
    if (!isReady) return
    
    // Use view to get seasons associated with the team
    const { data, error } = await supabase
        .from('team_seasons_view')
        .select('season_id, name')
        .eq('team_id', teamId)
        .eq('is_active', true)
    
    if (!error && data) {
       // Map season_id to id
       const dataAny = data as any[]
       const mappedSeasons = dataAny.map((s: any) => ({
          id: s.season_id,
          name: s.name,
          team_id: teamId
      }))
      setSeasons(mappedSeasons)
    }
  }, [isReady])

  useEffect(() => { 
    if (isReady) fetchEvent() 
  }, [isReady, fetchEvent])

  useEffect(() => { 
    if (watchTeamId && isReady) fetchSeasons(watchTeamId) 
  }, [watchTeamId, isReady, fetchSeasons])

  const handleConfirmRsvpChange = async () => {
    if (!pendingRsvpChange) return
    setShowRsvpChangeDialog(false)
    // Continue with the submission
    await onSubmit(pendingRsvpChange)
    setPendingRsvpChange(null)
  }

  const onSubmit = async (data: EventFormData) => {
    if (!eventId) {
      setError('Event ID is required')
      return
    }

    // Validate event ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(eventId)) {
      setError('Invalid event ID format')
      return
    }

    // Check offline mode
    if (isOffline) {
      setError('Cannot save changes while offline. Please check your connection and try again.')
      showError('You are currently offline. Changes cannot be saved.')
      return
    }

    // Check demo mode
    if (USE_FAKE_DATA) {
      showError('Demo mode: Changes are not saved to the database.')
      // Still allow navigation to show the flow works
      setTimeout(() => {
        navigate(getLink('admin.events.list'))
      }, 1500)
      return
    }

    // Validate time order
    if (data.start_time && data.end_time) {
      if (!isValidEventTimeOrder(data.start_time, data.end_time, data.arrival_time || null)) {
        setError('Invalid time order: End time must be after start time, and arrival time must be before start time.')
        return
      }
    }
    
    setSaving(true)
    setError(null)
    
    try {
      // Check if RSVP type is changing and warn
      if (hasExistingRSVPs && data.rsvp_enabled) {
        const { data: currentEvent, error: currentEventError } = await supabase
          .from('events')
          .select('rsvp_type')
          .eq('id', eventId)
          .single() as { data: { rsvp_type: string | null } | null; error: { message?: string } | null }

        if (!currentEventError && currentEvent?.rsvp_type && currentEvent.rsvp_type !== data.rsvp_type) {
          // Store the data to save after confirmation
          setPendingRsvpChange(data)
          setShowRsvpChangeDialog(true)
          setSaving(false)
          return
        }
      }

      // Use stored procedure for safe RSVP config update
      if (data.rsvp_enabled !== undefined) {
        const { data: configResult, error: configError } = await supabase
          .rpc('update_event_rsvp_config', {
            p_event_id: eventId,
            p_rsvp_enabled: data.rsvp_enabled ?? false,
            p_rsvp_type: data.rsvp_type || null,
            p_clear_existing: true // User confirmed if needed
          } as any)

        if (configError) {
          const configData = (configResult as unknown as { error?: string; has_data?: boolean }) || {}
          if (configData?.error && configData?.has_data) {
            setError('Cannot change RSVP type: existing RSVPs found. Please clear them first.')
            setSaving(false)
            return
          }
          throw configError
        }
      }

      // Update event
      type EventUpdate = Database['public']['Tables']['events']['Update']
      const eventUpdateData = {
        title: data.title,
        type: data.type,
        team_id: data.team_id,
        season_id: data.season_id,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : undefined,
        arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : null,
        timezone: data.timezone,
        notes: data.notes || null,
        uniform_notes: data.uniform_notes || null,
        equipment_notes: data.equipment_notes || null,
        weather_dependent: data.weather_dependent,
        external_link: data.external_link || null,
      } satisfies EventUpdate
      const { error: updateError } = await supabase
        .from('events')
        .update(eventUpdateData)
        .eq('id', eventId)

      if (updateError) throw updateError

      // Update location
      const { data: locationData } = await supabase
        .from('event_locations')
        .select('id')
        .eq('event_id', eventId)
        .single()

      if (locationData) {
        type LocationUpdate = Database['public']['Tables']['event_locations']['Update']
        const locUpdateData = {
          venue_name: data.location.venue_name || null,
          address_line1: data.location.address_line1 || null,
          city: data.location.city || null,
          state: data.location.state || null,
          postal_code: data.location.postal_code || null,
          place_id: data.location.place_id || null,
          latitude: data.location.latitude ? parseFloat(data.location.latitude) : null,
          longitude: data.location.longitude ? parseFloat(data.location.longitude) : null,
          is_tbd: data.location.is_tbd,
          is_virtual: data.location.is_virtual,
          virtual_link: data.location.virtual_link || null
        } as LocationUpdate & { place_id: string | null }
        await supabase
          .from('event_locations')
          .update(locUpdateData)
          .eq('id', (locationData as any).id)
      } else {
        type LocationInsert = Database['public']['Tables']['event_locations']['Insert']
        const locInsertData = {
          event_id: eventId,
          venue_name: data.location.venue_name || null,
          address_line1: data.location.address_line1 || null,
          city: data.location.city || null,
          state: data.location.state || null,
          postal_code: data.location.postal_code || null,
          place_id: data.location.place_id || null,
          latitude: data.location.latitude ? parseFloat(data.location.latitude) : null,
          longitude: data.location.longitude ? parseFloat(data.location.longitude) : null,
          is_tbd: data.location.is_tbd,
          is_virtual: data.location.is_virtual,
          virtual_link: data.location.virtual_link || null
        } as LocationInsert & { place_id: string | null }
        const { error: locInsertError } = await supabase.from('event_locations').insert(locInsertData)
        if (locInsertError) {
          console.error('Location insert error:', locInsertError)
          // Don't fail the whole update if location insert fails
        }
      }

      // Update recurring pattern if needed
      if (data.recurring?.enabled) {
        const recurringEndDate = data.recurring.end_date || null
        let recurringMax = data.recurring.max_occurrences ? parseInt(data.recurring.max_occurrences) : null
        // Constraint requires at least one end condition
        if (!recurringEndDate && !recurringMax) {
          recurringMax = 1
        }

        const { data: existingPattern } = await supabase
          .from('recurring_event_patterns')
          .select('id')
          .eq('parent_event_id', eventId)
          .single()

        if (existingPattern) {
          type RecurringPatternUpdate = Database['public']['Tables']['recurring_event_patterns']['Update']
          const patternUpdate: RecurringPatternUpdate = {
            frequency: data.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
            days_of_week: data.recurring.days_of_week.length > 0 ? data.recurring.days_of_week : [new Date(data.start_time).getDay()],
            end_date: recurringEndDate,
            max_occurrences: recurringMax
          }
          const { error: patternError } = await supabase
            .from('recurring_event_patterns')
            .update(patternUpdate)
            .eq('id', (existingPattern as any).id)
          if (patternError) {
            console.error('Recurring pattern update error:', patternError)
            // Don't fail the whole update
          }
        } else if (data.recurring.enabled) {
          type RecurringPatternInsert = Database['public']['Tables']['recurring_event_patterns']['Insert']
          const patternInsert: RecurringPatternInsert = {
            parent_event_id: eventId,
            frequency: data.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
            days_of_week: data.recurring.days_of_week.length > 0 ? data.recurring.days_of_week : [new Date(data.start_time).getDay()],
            end_date: recurringEndDate,
            max_occurrences: recurringMax
          }
          const { error: patternError } = await supabase
            .from('recurring_event_patterns')
            .insert(patternInsert)
          if (patternError) {
            console.error('Recurring pattern insert error:', patternError)
            // Don't fail the whole update
          }
        }
      }

      // Handle ticketing: create or update ticketed_events and ticket_types
      if (data.ticketing?.is_ticketed) {
        const { data: teamDataForTicketing } = await supabase.from('teams').select('org_id').eq('id', data.team_id).single()
        if (!teamDataForTicketing?.org_id) {
          throw new Error('Failed to get organization ID from team')
        }
        const orgId = teamDataForTicketing.org_id

        const salesImmediate = data.ticketing.sales_immediate ?? true
        const salesStartAt = salesImmediate ? null : (data.ticketing.sales_start_at ? new Date(data.ticketing.sales_start_at) : null)
        const salesEndAt = salesImmediate ? null : (data.ticketing.sales_end_at ? new Date(data.ticketing.sales_end_at) : null)
        const resolvedSalesEnd = !salesImmediate && !salesEndAt ? new Date(data.end_time) : salesEndAt

        // Handle Banner Upload
        let finalBannerUrl = data.ticketing.ticket_banner_url
        if (bannerFile) {
           const { path, error: uploadError } = await uploadTicketBanner(orgId, eventId, bannerFile)
           if (uploadError) throw new Error(`Banner upload failed: ${uploadError.message}`)
           if (path) finalBannerUrl = path
        }

        if (!ticketedEventId) {
          // Create ticketed_events and ticket_types
          type TicketedEventInsert = Database['public']['Tables']['ticketed_events']['Insert']
          const ticketedEventData: TicketedEventInsert = {
            event_id: eventId,
            org_id: orgId,
            team_id: data.team_id,
            event_type: data.ticketing.event_type as Database['public']['Enums']['ticketed_event_type'],
            title: data.title,
            description: data.notes || null,
            starts_at: new Date(data.start_time).toISOString(),
            ends_at: new Date(data.end_time).toISOString(),
            timezone: data.timezone,
            venue_name: data.location.venue_name?.trim() || null,
            venue_address_line1: data.location.address_line1?.trim() || null,
            venue_city: data.location.city?.trim() || null,
            venue_state: data.location.state?.trim() || null,
            venue_postal_code: data.location.postal_code?.trim() || null,
            venue_country: 'US',
            venue_is_virtual: data.location.is_virtual,
            venue_virtual_link: data.location.virtual_link?.trim() || null,
            sales_start_at: salesStartAt ? salesStartAt.toISOString() : null,
            sales_end_at: resolvedSalesEnd ? resolvedSalesEnd.toISOString() : null,
            status: data.ticketing.status as Database['public']['Enums']['ticketed_event_status'],
          }
          const { data: createdTe, error: teError } = await supabase
            .from('ticketed_events')
            .insert(ticketedEventData)
            .select('id')
            .single()
          if (teError) throw new Error(`Ticketing setup failed: ${teError.message}`)
          if (!createdTe) throw new Error('Failed to create ticketed event')
          const newTeId = createdTe.id

          if (data.ticketing.ticket_types?.length) {
            type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']
            const inserts: TicketTypeInsert[] = data.ticketing.ticket_types
              .filter(tt => tt.name.trim() !== '')
              .map((tt, index) => {
                const priceCents = Math.round((parseFloat(tt.price_dollars) || 0) * 100)
                const capStr = tt.capacity.trim()
                const capacityTotal = capStr === '' ? null : (parseInt(capStr, 10) || null)
                const capacityRemaining = capacityTotal
                return {
                  org_id: orgId,
                  ticketed_event_id: newTeId,
                  name: tt.name.trim(),
                  price_cents: priceCents,
                  currency: 'USD',
                  capacity_total: capacityTotal && capacityTotal > 0 ? capacityTotal : null,
                  capacity_remaining: capacityRemaining && capacityRemaining > 0 ? capacityRemaining : null,
                  sort_order: index,
                  is_active: true,
                  description: tt.description?.trim() || null,
                } satisfies TicketTypeInsert
              })
            if (inserts.length > 0) {
              const { error: ttError } = await supabase.from('ticket_types').insert(inserts)
              if (ttError) throw new Error(`Failed to create ticket types: ${ttError.message}`)
            }
          }
        } else {
          // Update ticketed_events
          type TicketedEventUpdate = Database['public']['Tables']['ticketed_events']['Update']
          const teUpdate: TicketedEventUpdate = {
            title: data.title,
            description: data.notes || null,
            starts_at: new Date(data.start_time).toISOString(),
            ends_at: new Date(data.end_time).toISOString(),
            timezone: data.timezone,
            venue_name: data.location.venue_name?.trim() || null,
            venue_address_line1: data.location.address_line1?.trim() || null,
            venue_city: data.location.city?.trim() || null,
            venue_state: data.location.state?.trim() || null,
            venue_postal_code: data.location.postal_code?.trim() || null,
            venue_country: 'US',
            venue_is_virtual: data.location.is_virtual,
            venue_virtual_link: data.location.virtual_link?.trim() || null,
            sales_start_at: salesStartAt ? salesStartAt.toISOString() : null,
            sales_end_at: resolvedSalesEnd ? resolvedSalesEnd.toISOString() : null,
            status: data.ticketing.status as Database['public']['Enums']['ticketed_event_status'],
            event_description: data.ticketing.event_description || null,
            ticket_banner_url: finalBannerUrl || null,
          }
          if (!hasPaidOrders) {
            (teUpdate as Record<string, unknown>).event_type = data.ticketing.event_type
          }
          const { error: teUpdateError } = await supabase
            .from('ticketed_events')
            .update(teUpdate)
            .eq('id', ticketedEventId)
          if (teUpdateError) throw teUpdateError

          // Reconcile ticket_types
          const formTypes = data.ticketing.ticket_types ?? []
          const existingIds = formTypes.filter(tt => tt.id).map(tt => tt.id as string)

          if (!hasPaidOrders) {
            const { data: existingTypes } = await supabase
              .from('ticket_types')
              .select('id')
              .eq('ticketed_event_id', ticketedEventId)
            const toRemove = (existingTypes ?? []).filter(et => !existingIds.includes(et.id)).map(et => et.id)
            for (const id of toRemove) {
              await supabase.from('ticket_types').delete().eq('id', id)
            }
          }

          type TicketTypeUpdate = Database['public']['Tables']['ticket_types']['Update']
          for (let index = 0; index < formTypes.length; index++) {
            const tt = formTypes[index]
            if (!tt.name.trim()) continue
            const priceCents = Math.round((parseFloat(tt.price_dollars) || 0) * 100)
            const capStr = tt.capacity.trim()
            const capacityTotal = capStr === '' ? null : (parseInt(capStr, 10) || null)
            const soldCount = tt.soldCount ?? 0
            const capacityRemaining = capacityTotal != null && capacityTotal > 0
              ? Math.max(0, capacityTotal - soldCount)
              : null

            if (tt.id) {
              const updatePayload: TicketTypeUpdate = {
                name: tt.name.trim(),
                sort_order: index,
                description: tt.description?.trim() || null,
              }
              if (!hasPaidOrders) {
                updatePayload.price_cents = priceCents
                updatePayload.capacity_total = capacityTotal && capacityTotal > 0 ? capacityTotal : null
                updatePayload.capacity_remaining = capacityRemaining
              } else {
                if (capacityTotal != null && capacityTotal > 0) {
                  updatePayload.capacity_total = capacityTotal
                  updatePayload.capacity_remaining = capacityRemaining
                }
              }
              const { error: uErr } = await supabase
                .from('ticket_types')
                .update(updatePayload)
                .eq('id', tt.id)
              if (uErr) throw uErr
            } else {
              type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']
              const insertPayload: TicketTypeInsert = {
                org_id: orgId,
                ticketed_event_id: ticketedEventId,
                name: tt.name.trim(),
                price_cents: priceCents,
                currency: 'USD',
                capacity_total: capacityTotal && capacityTotal > 0 ? capacityTotal : null,
                capacity_remaining: capacityRemaining,
                sort_order: index,
                is_active: true,
                description: tt.description?.trim() || null,
              }
              const { error: iErr } = await supabase.from('ticket_types').insert(insertPayload)
              if (iErr) throw iErr
            }
          }
        }
      }

      // Distribute notifications
      const { distributeEventUpdateNotifications } = await import('../../data/services/notificationDistribution')
      const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', data.team_id).single()
      if (teamData?.org_id) {
          distributeEventUpdateNotifications({
              id: eventId,
              team_id: data.team_id,
              org_id: teamData.org_id,
              title: data.title,
              start_time: new Date(data.start_time).toISOString(),
              created_by_user_id: context.userId
          }).catch(err => console.error('Failed to distribute event update notifications:', err))
      }

      showSuccess('Event updated successfully!')
      navigate(getLink('admin.events.list'))
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err) || 'Failed to update event'
      setError(errorMessage)
      showError(errorMessage)
      
      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes('permission') || err.message.includes('RLS')) {
          setError('You do not have permission to update this event')
        } else if (err.message.includes('violates foreign key')) {
          setError('Invalid team or season selected. Please verify your selections.')
        } else if (err.message.includes('violates check constraint')) {
          setError('Invalid data provided. Please check all fields and try again.')
        }
      }
    } finally { 
      setSaving(false) 
    }
  }

  const eventTypeOptions = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(key => ({
      value: key,
      label: EVENT_TYPE_LABELS[key]
  }))

  if (loading) return <div className="pa-skeleton oa-skeleton--tall" />

  if (notFound) {
    return (
      <div className="pa-root">
        <AdminPageHeader 
          title="Event Not Found" 
          breadcrumbs={[
            { label: 'Events', path: getLink('admin.events.list') },
            { label: 'Edit Event' },
          ]}
        />
        <Card>
          <div className="pa-text-center pa-py-8">
            <span className="material-symbols-outlined oa-status-icon-lg">
              event_busy
            </span>
            <h2 className="pa-heading-2 pa-mb-2">Event Not Found</h2>
            <p className="pa-body pa-mb-6">{error || 'The event you are looking for does not exist or has been deleted.'}</p>
            <Button onClick={() => navigate(getLink('admin.events.list'))}>Back to Events</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Edit Event" 
        subtitle={t('admin.events.editSubtitle')}
        breadcrumbs={[
          { label: 'Events', path: getLink('admin.events.list') },
          { label: 'Edit Event' },
        ]}
      />
      <div className="pa-form-container">
        {/* Offline indicator */}
        {isOffline && (
          <div className="oa-alert oa-alert--warning pa-mb-4">
            <div className="pa-flex pa-items-center pa-gap-2">
              <span className="material-symbols-outlined" aria-hidden="true">wifi_off</span>
              <span className="pa-body-s">You are offline. Changes cannot be saved until you reconnect.</span>
            </div>
          </div>
        )}

        {/* Demo mode indicator */}
        {USE_FAKE_DATA && (
          <div className="oa-alert oa-alert--info pa-mb-4">
            <div className="pa-flex pa-items-center pa-gap-2">
              <span className="material-symbols-outlined" aria-hidden="true">info</span>
              <span className="pa-body-s">Demo mode: Changes will not be saved to the database.</span>
            </div>
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="oa-alert oa-alert--error pa-mb-4">
                <div>{error}</div>
              </div>
            )}
            {hasExistingRSVPs && watchRSVPEnabled && (
              <div className="oa-alert oa-alert--warning pa-mb-4">
                Warning: This event has existing RSVP responses. Changing RSVP type will delete them.
              </div>
            )}
            
            <section className="oa-form-section" aria-labelledby="event-basics-heading">
              <div className="oa-form-section-header">
                <div>
                  <h3 id="event-basics-heading" className="oa-form-section-title">Event Basics</h3>
                  <p className="oa-form-section-subtitle">Update the title, type, team, and season that own this event.</p>
                </div>
              </div>
              <div className="oa-form-section-body">
                <div className="pa-mb-4">
                  <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Event Title" required error={errors.title?.message || undefined} />} />
                </div>
                <div className="pa-form-grid pa-form-grid-3 pa-mb-4 pa-gap-4">
                  <Controller name="type" control={control} render={({ field }) => <Select {...field} value={field.value || ''} label={t('admin.events.fields.eventType')} options={eventTypeOptions} />} />
                  <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} value={field.value || ''} label={t('admin.events.fields.team')} options={teams.map(t => ({ value: t.id, label: t.name }))} required error={errors.team_id?.message || undefined} />} />
                  <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} value={field.value || ''} label={t('admin.events.fields.season')} options={seasons.map(s => ({ value: s.id, label: s.name }))} required disabled={!watchTeamId} />} />
                </div>
              </div>
            </section>

            <section className="oa-form-section" aria-labelledby="event-dates-heading">
              <div className="oa-form-section-header">
                <div>
                  <h3 id="event-dates-heading" className="oa-form-section-title">Date &amp; Time</h3>
                  <p className="oa-form-section-subtitle">Adjust the event date, start, end, and arrival windows.</p>
                </div>
              </div>
              <div className="oa-form-section-body">
                <div className="pa-form-grid pa-form-grid-4 pa-form-grid-tablet-2col">
                  <Controller 
                    name="start_time" 
                    control={control} 
                    rules={{ required: 'Start date and time are required' }} 
                    render={({ field }) => (
                      <DatePicker 
                        label="Event Date" 
                        value={field.value ? field.value.split('T')[0] : ''}
                        onChange={(date) => {
                          const time = field.value?.split('T')[1] || '09:00'
                          field.onChange(`${date}T${time}`)
                        }}
                        required
                        error={errors.start_time?.message}
                      />
                    )} 
                  />
                  <div className="pa-max-w-xs">
                    <Controller 
                      name="start_time" 
                      control={control} 
                      render={({ field }) => (
                        <TimePicker 
                          label="Start Time" 
                          value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                          onChange={(time) => {
                            const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0]
                            field.onChange(`${date}T${time}`)
                          }}
                          required
                        />
                      )} 
                    />
                  </div>
                  <div className="pa-max-w-xs">
                    <Controller 
                      name="end_time" 
                      control={control} 
                      render={({ field }) => (
                        <TimePicker 
                          label="End Time" 
                          value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                          onChange={(time) => {
                            const startDate = watch('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0]
                            field.onChange(time ? `${startDate}T${time}` : '')
                          }}
                        />
                      )} 
                    />
                  </div>
                  <div className="pa-max-w-xs">
                    <Controller 
                      name="arrival_time" 
                      control={control} 
                      render={({ field }) => (
                        <TimePicker 
                          label="Arrival Time" 
                          value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                          onChange={(time) => {
                            const startDate = watch('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0]
                            field.onChange(time ? `${startDate}T${time}` : '')
                          }}
                        />
                      )} 
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="oa-form-section" aria-labelledby="event-location-heading">
              <div className="oa-form-section-header">
                <div>
                  <h3 id="event-location-heading" className="oa-form-section-title">Location</h3>
                  <p className="oa-form-section-subtitle">Update the venue, address, and any virtual details.</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => setShowLocationDetails(!showLocationDetails)}>
                  {showLocationDetails ? 'Simple Location' : 'Detailed Location'}
                </Button>
              </div>
              <div className="oa-form-section-body pa-space-y-4">
                <div className="pa-form-grid pa-form-grid-2 pa-form-grid-tablet-2col">
                  <Controller name="location.venue_name" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.venueName')} placeholder="e.g. Field 1" />} />
                  <Controller
                    name="location.address_line1"
                    control={control}
                    render={({ field }) => (
                      <LocationAutocomplete
                        value={field.value || ''}
                        onInputChange={field.onChange}
                        onChange={(address) => {
                          startTransition(() => {
                            setValue('location.address_line1', address.address_line1, { shouldValidate: false, shouldDirty: true })
                            setValue('location.city', address.city, { shouldValidate: false, shouldDirty: true })
                            setValue('location.state', address.state, { shouldValidate: false, shouldDirty: true })
                            setValue('location.postal_code', address.postal_code, { shouldValidate: false, shouldDirty: true })
                            setValue('location.place_id', address.place_id, { shouldValidate: false, shouldDirty: true })
                            setValue('location.latitude', address.latitude.toString(), { shouldValidate: false, shouldDirty: true })
                            setValue('location.longitude', address.longitude.toString(), { shouldValidate: false, shouldDirty: true })
                            trigger(['location.address_line1', 'location.city', 'location.state', 'location.postal_code'])
                          })
                        }}
                        label={t('admin.events.location.address')}
                        placeholder="Enter an address"
                      />
                    )}
                  />
                </div>

                {showLocationDetails && (
                  <>
                    <div className="pa-form-grid pa-form-grid-3 pa-form-grid-tablet-2col pa-gap-4">
                      <Controller name="location.city" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.city')} />} />
                      <Controller name="location.state" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.state')} />} />
                      <Controller name="location.postal_code" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.postalCode')} />} />
                    </div>
                    <div className="oa-checkbox-stack">
                      <Controller name="location.is_tbd" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label={t('admin.events.location.isTBD')} />} />
                      <Controller name="location.is_virtual" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label={t('admin.events.location.isVirtual')} />} />
                    </div>
                    <Controller name="location.virtual_link" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.virtualLink')} placeholder="https://zoom.us/..." />} />
                  </>
                )}
              </div>
            </section>
          
            <section className="oa-form-section" aria-labelledby="event-attendance-heading">
              <div className="oa-form-section-header">
                <div>
                  <h3 id="event-attendance-heading" className="oa-form-section-title">RSVP &amp; Recurrence</h3>
                  <p className="oa-form-section-subtitle">Control RSVPs and set recurring details.</p>
                </div>
              </div>
              <div className="oa-form-section-body">
                <div className="oa-checkbox-stack pa-mb-4">
                  <Controller name="rsvp_enabled" control={control} render={({ field: { value, onChange } }) => (
                    <Checkbox checked={!!value} onChange={(e) => { 
                      onChange(e.target.checked)
                      if (!e.target.checked) {
                        setValue('rsvp_type', null)
                      }
                    }} label="RSVP Required?" />
                  )} />
                  <Controller name="recurring.enabled" control={control} render={({ field: { value, onChange } }) => (
                    <Checkbox checked={!!value} onChange={(e) => { onChange(e.target.checked); setShowRecurring(e.target.checked); }} label="Recurring Event?" />
                  )} />
                </div>

                {watchRSVPEnabled && (
                  <div className="pa-mb-4">
                    <Controller 
                      name="rsvp_type" 
                      control={control} 
                      rules={{ required: watchRSVPEnabled ? 'RSVP type is required' : false }}
                      render={({ field }) => (
                        <Select 
                          {...field} 
                          value={field.value || ''}
                          label="RSVP Type" 
                          options={[
                            {value: 'general', label: t('admin.events.rsvpType.general')},
                            {value: 'athlete', label: t('admin.events.rsvpType.athlete')}
                          ]}
                          required
                          error={errors.rsvp_type?.message || undefined}
                        />
                      )} 
                    />
                  </div>
                )}

                {showRecurring && (
                  <div className="pa-form-grid pa-form-grid-2 pa-form-grid-tablet-2col pa-gap-4">
                    <div className="pa-select-wrapper">
                      <Controller name="recurring.frequency" control={control} render={({ field }) => <Select {...field} label="Frequency" options={[{value:'weekly', label:'Weekly'}]} />} />
                    </div>
                    <div className="pa-max-w-sm">
                      <Controller name="recurring.end_date" control={control} render={({ field }) => <DatePicker {...field} label="Recurs Until" />} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!ticketingGateLoading && ticketingAllowed && (ticketedEventId || watchTicketingEnabled) && (
              <section className="oa-form-section" aria-labelledby="event-ticketing-heading">
                <div className="oa-form-section-header">
                  <div>
                    <h3 id="event-ticketing-heading" className="oa-form-section-title">{t('admin.events.ticketing.title')}</h3>
                    <p className="oa-form-section-subtitle">Manage ticket sales, choices, and capacity.</p>
                  </div>
                </div>
                <div className="oa-form-section-body">
                  <div className="oa-checkbox-stack">
                    <Controller
                      name="ticketing.is_ticketed"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Checkbox
                          checked={!!value}
                          onChange={(e) => onChange(e.target.checked)}
                          label={t('admin.events.ticketing.isTicketed')}
                          disabled={!!ticketedEventId}
                        />
                      )}
                    />
                  </div>

                  {watchTicketingEnabled && (
                    <div className="pa-card oa-ticket-card pa-mt-4">
                      {hasPaidOrders && (
                        <div className="oa-alert oa-alert--warning pa-mb-4">
                          <span className="pa-body-s">{t('admin.events.ticketing.editBanner')}</span>
                        </div>
                      )}

                      <div className="pa-mb-4">
                        <Controller
                          name="ticketing.event_type"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              value={field.value || 'other'}
                              label={t('admin.events.ticketing.eventType.label')}
                              options={[
                                { value: 'game', label: t('admin.events.ticketing.eventType.game') },
                                { value: 'tournament', label: t('admin.events.ticketing.eventType.tournament') },
                                { value: 'concert', label: t('admin.events.ticketing.eventType.concert') },
                                { value: 'fundraiser', label: t('admin.events.ticketing.eventType.fundraiser') },
                                { value: 'other', label: t('admin.events.ticketing.eventType.other') },
                              ]}
                              disabled={hasPaidOrders}
                            />
                          )}
                        />
                        <p className="pa-text-xs pa-text-muted pa-mt-1">{t('admin.events.ticketing.eventType.helper')}</p>
                      </div>

                      <div className="pa-mb-4">
                        <Controller
                          name="ticketing.sales_immediate"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={!!field.value}
                              onChange={(e) => {
                                field.onChange(e.target.checked)
                                if (e.target.checked) {
                                  setValue('ticketing.sales_start_at', '', { shouldValidate: false })
                                  setValue('ticketing.sales_end_at', '', { shouldValidate: false })
                                }
                              }}
                              label="Immediately"
                              helper="Allow tickets to go on sale right away. Turn off to schedule a sales window."
                              disabled={hasPaidOrders}
                            />
                          )}
                        />
                      </div>

                      {!watchTicketSalesImmediate && (
                        <div className="pa-form-grid pa-form-grid-2 pa-mb-4">
                          <Controller
                            name="ticketing.sales_start_at"
                            control={control}
                            rules={{
                              validate: (value) => {
                                if (watchTicketSalesImmediate) return true
                                if (value && new Date(value) < new Date()) {
                                  return t('admin.events.ticketing.salesWindow.startNotBeforeNow')
                                }
                                return true
                              }
                            }}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="datetime-local"
                                label={t('admin.events.ticketing.salesWindow.start')}
                                placeholder={t('admin.events.ticketing.salesWindow.optional')}
                                min={toDatetimeLocal(new Date())}
                                error={errors.ticketing?.sales_start_at?.message}
                                disabled={hasPaidOrders}
                              />
                            )}
                          />
                          <Controller
                            name="ticketing.sales_end_at"
                            control={control}
                            rules={{
                              validate: (value) => {
                                if (watchTicketSalesImmediate) return true
                                const startAt = watch('ticketing.sales_start_at')
                                if (startAt && value && new Date(value) <= new Date(startAt)) {
                                  return t('admin.events.ticketing.salesWindow.endAfterStart')
                                }
                                const eventStart = watch('start_time')
                                if (eventStart && value && new Date(value) > new Date(eventStart)) {
                                  return t('admin.events.ticketing.salesWindow.endNotAfterEventStart')
                                }
                                return true
                              }
                            }}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="datetime-local"
                                label={t('admin.events.ticketing.salesWindow.end')}
                                placeholder={t('admin.events.ticketing.salesWindow.optional')}
                                max={watch('start_time') || undefined}
                                error={errors.ticketing?.sales_end_at?.message}
                                disabled={hasPaidOrders}
                              />
                            )}
                          />
                        </div>
                      )}

                      <div className="pa-mb-4">
                         <label className="pa-label">Event Description (public)</label>
                        <Controller
                          name="ticketing.event_description"
                          control={control}
                          rules={{ maxLength: { value: 500, message: 'Max 500 characters' } }}
                          render={({ field }) => (
                            <textarea
                              className="pa-input pa-textarea oa-textarea-expand"
                              {...field}
                              placeholder="Describe this event for public ticket buyers..."
                              rows={3}
                            />
                          )}
                        />
                         {errors.ticketing?.event_description && <span className="pa-error-message">{errors.ticketing.event_description.message}</span>}
                      </div>

                      <div className="pa-mb-4">
                         <label className="pa-label">Ticket Banner Image</label>
                        <div className="pa-flex pa-flex-col pa-gap-4">
                            <FileUpload
                                onFileSelect={setBannerFile}
                                value={bannerFile}
                                accept="image/*"
                                maxSize={5 * 1024 * 1024} // 5MB
                                label=""
                                buttonText="Upload Banner"
                                replaceText="Replace Banner"
                                helperText="Suggested size: 1200 × 400 px (3:1). Max 5MB."
                                showDropZone={true}
                                fullWidth={true}
                            />
                            
                            {watch('ticketing.ticket_banner_url') && !bannerFile && (
                                <div className="pa-bg-surface-section pa-p-3 pa-rounded-lg pa-border pa-border-border-subtle">
                                    <p className="pa-text-xs pa-font-bold pa-uppercase pa-text-muted pa-mb-2">Current Banner</p>
                                    <div className="pa-relative pa-w-full pa-h-32 pa-rounded-md pa-overflow-hidden pa-bg-gray-100 dark:pa-bg-gray-800">
                                        <img 
                                            src={watch('ticketing.ticket_banner_url')} 
                                            alt="Current Banner" 
                                            className="pa-w-full pa-h-full pa-object-cover" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>

                      <div className="pa-mb-4">
                        <Controller
                          name="ticketing.status"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              value={field.value || 'draft'}
                              label={t('admin.events.ticketing.status.label')}
                              options={[
                                { value: 'draft', label: t('admin.events.ticketing.status.draft') },
                                { value: 'published', label: t('admin.events.ticketing.status.published') },
                              ]}
                            />
                          )}
                        />
                      </div>

                      <div className="pa-mb-4">
                        <div className="pa-flex pa-items-center pa-justify-between pa-mb-2">
                          <label className="pa-label">{t('admin.events.ticketing.ticketTypes.label')}</label>
                          {!hasPaidOrders && (
                            <Button
                              type="button"
                              variant="ghost"
                            onClick={() => appendTicketType({ name: '', price_dollars: '', capacity: '', description: '' })}
                            >
                              {t('admin.events.ticketing.ticketTypes.add')}
                            </Button>
                          )}
                        </div>
                        {ticketTypeFields.length === 0 ? (
                          <p className="pa-text-sm pa-text-muted">{t('admin.events.ticketing.ticketTypes.none')}</p>
                        ) : (
                          <div className="pa-space-y-3">
                            {ticketTypeFields.map((field, index) => {
                              const soldCount = watch(`ticketing.ticket_types.${index}.soldCount`) ?? 0
                              const canRemove = !hasPaidOrders || soldCount === 0
                              return (
                                <div key={field.id} className="oa-ticket-type-card">
                                  <div className="pa-form-grid pa-form-grid-3 pa-mb-2">
                                    <Controller
                                      name={`ticketing.ticket_types.${index}.name`}
                                      control={control}
                                      rules={{
                                        validate: (value) => {
                                          const price = watch(`ticketing.ticket_types.${index}.price_dollars`)
                                          const capacity = watch(`ticketing.ticket_types.${index}.capacity`)
                                          if (price || capacity) {
                                            return value?.trim() ? true : t('admin.events.ticketing.ticketTypes.name.required')
                                          }
                                          return true
                                        }
                                      }}
                                      render={({ field: f }) => (
                                        <Input
                                          {...f}
                                          label={t('admin.events.ticketing.ticketTypes.name.label')}
                                          placeholder={t('admin.events.ticketing.ticketTypes.name.placeholder')}
                                          error={errors.ticketing?.ticket_types?.[index]?.name?.message}
                                          disabled={hasPaidOrders}
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`ticketing.ticket_types.${index}.price_dollars`}
                                      control={control}
                                      rules={{
                                        validate: (value) => {
                                          const name = watch(`ticketing.ticket_types.${index}.name`)
                                          if (name?.trim()) {
                                            const parsed = parseFloat(value || '0')
                                            if (isNaN(parsed) || parsed < 0) {
                                              return t('admin.events.ticketing.ticketTypes.price.invalid')
                                            }
                                          }
                                          return true
                                        }
                                      }}
                                      render={({ field: f }) => (
                                        <Input
                                          {...f}
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          label={t('admin.events.ticketing.ticketTypes.price.label')}
                                          placeholder={t('admin.events.ticketing.ticketTypes.price.placeholder')}
                                          error={errors.ticketing?.ticket_types?.[index]?.price_dollars?.message}
                                          disabled={hasPaidOrders}
                                        />
                                      )}
                                    />
                                    <div className="oa-ticket-type-actions">
                                      <Controller
                                        name={`ticketing.ticket_types.${index}.capacity`}
                                        control={control}
                                        rules={{
                                          validate: (value) => {
                                            if (value?.trim()) {
                                              const parsed = parseInt(value, 10)
                                              if (isNaN(parsed) || parsed <= 0) {
                                                return t('admin.events.ticketing.ticketTypes.capacity.invalid')
                                              }
                                              if (soldCount > 0 && parsed < soldCount) {
                                                return t('admin.events.ticketing.ticketTypes.capacity.minSold')
                                              }
                                            }
                                            return true
                                          }
                                        }}
                                        render={({ field: f }) => (
                                          <Input
                                            {...f}
                                            type="number"
                                            min={soldCount > 0 ? soldCount : 1}
                                            label={t('admin.events.ticketing.ticketTypes.capacity.label')}
                                            placeholder={t('admin.events.ticketing.ticketTypes.capacity.placeholder')}
                                            error={errors.ticketing?.ticket_types?.[index]?.capacity?.message}
                                          />
                                        )}
                                      />
                                      {soldCount > 0 && (
                                        <span className="pa-body-s pa-text-muted">
                                          Sold: {soldCount}
                                        </span>
                                      )}
                                      {canRemove && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          onClick={() => removeTicketType(index)}
                                        >
                                          {t('admin.events.ticketing.ticketTypes.remove')}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="pa-mb-2">
                                    <Controller
                                      name={`ticketing.ticket_types.${index}.description`}
                                      control={control}
                                      rules={{ maxLength: { value: 250, message: 'Max 250 characters' } }}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          label="Description (optional)"
                                          placeholder="e.g. Early Bird special..."
                                          error={errors.ticketing?.ticket_types?.[index]?.description?.message}
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="oa-form-section" aria-labelledby="event-notes-heading">
              <div className="oa-form-section-header">
                <div>
                  <h3 id="event-notes-heading" className="oa-form-section-title">Notes &amp; Prep</h3>
                  <p className="oa-form-section-subtitle">Touchpoints for families, coaches, and staff.</p>
                </div>
              </div>
              <div className="oa-form-section-body">
                <div className="pa-form-grid pa-form-grid-2 pa-gap-4">
                  <div className="oa-notes-group">
                    <label className="pa-label">{t('admin.events.fields.generalNotes')}</label>
                    <Controller name="notes" control={control} render={({ field }) => (
                      <textarea className="pa-input pa-textarea oa-textarea-expand" {...field} placeholder="General Notes..." />
                    )} />
                  </div>
                  <div className="pa-space-y-2">
                    <Controller name="uniform_notes" control={control} render={({ field }) => <Input {...field} label="Uniform Notes" placeholder="e.g. Home Kit" />} />
                    <Controller name="equipment_notes" control={control} render={({ field }) => <Input {...field} label="Equipment Notes" placeholder="e.g. Bring water" />} />
                    <Controller name="external_link" control={control} render={({ field }) => <Input {...field} label="External Link" placeholder="https://..." type="url" />} />
                    <Controller name="weather_dependent" control={control} render={({ field: { value, onChange } }) => (
                      <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label="Weather Dependent" />
                    )} />
                  </div>
                </div>
              </div>
            </section>

          {/* Recurring Event Edit Mode Selection */}
          {isRecurring && (
            <div className="oa-alert oa-alert--info pa-mb-4">
              <div className="pa-label pa-mb-2">This is a recurring event. What would you like to edit?</div>
              <div className="pa-flex pa-gap-3">
                <label className="pa-flex pa-items-center pa-gap-2">
                  <input
                    type="radio"
                    name="recurringEditMode"
                    value="this_only"
                    checked={recurringEditMode === 'this_only'}
                    onChange={(e) => setRecurringEditMode(e.target.value as RecurringEditMode)}
                  />
                  <span className="pa-body-s">This occurrence only</span>
                </label>
                <label className="pa-flex pa-items-center pa-gap-2">
                  <input
                    type="radio"
                    name="recurringEditMode"
                    value="this_and_future"
                    checked={recurringEditMode === 'this_and_future'}
                    onChange={(e) => setRecurringEditMode(e.target.value as RecurringEditMode)}
                  />
                  <span className="pa-body-s">This and future occurrences</span>
                </label>
                <label className="pa-flex pa-items-center pa-gap-2">
                  <input
                    type="radio"
                    name="recurringEditMode"
                    value="all"
                    checked={recurringEditMode === 'all'}
                    onChange={(e) => setRecurringEditMode(e.target.value as RecurringEditMode)}
                  />
                  <span className="pa-body-s">All occurrences</span>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 6: ACTIONS */}
          <div className="pa-mb-4">
            <div className="pa-flex pa-flex-col sm:pa-flex-row pa-justify-between pa-items-stretch sm:pa-items-center pa-gap-3 pa-mb-4">
              <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setCancelDialog(true)}
                  disabled={saving || actionLoading}
                  className="w-full sm:w-auto min-h-[44px] pa-text-warning"
                >
                  <span className="material-symbols-outlined oa-action-icon">cancel</span>
                  Cancel Event
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteDialog(true)}
                  disabled={saving || actionLoading}
                  className="w-full sm:w-auto min-h-[44px] pa-text-danger"
                >
                  <span className="material-symbols-outlined oa-action-icon">delete</span>
                  Delete Event
                </Button>
              </div>
            </div>
            <div className="pa-form-actions">
              <OrgAdminButton variant="primary" onClick={() => navigate(getLink('admin.events.list'))} disabled={saving || actionLoading} className="w-full sm:w-auto">Cancel</OrgAdminButton>
              <Button 
                type="submit" 
                loading={saving}
                disabled={isOffline || USE_FAKE_DATA || saving || actionLoading}
                title={isOffline ? 'Cannot save while offline' : USE_FAKE_DATA ? 'Demo mode: changes not saved' : undefined}
                className="pa-form-submit-btn w-full sm:w-auto"
              >
                Update Event
              </Button>
            </div>
          </div>
        </form>
      </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Event"
        description={`Are you sure you want to delete this event? This action cannot be undone and will delete all associated data (RSVPs, attendance, etc.).`}
        confirmLabel="Delete"
        variant="danger"
        requireReason
        loading={actionLoading}
        error={actionError}
        onConfirm={async (_reason: string) => {
          if (!eventId) return
          setActionLoading(true)
          setActionError(null)
          
          try {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', eventId)
            
            if (error) throw error
            
            showSuccess('Event deleted successfully')
            navigate(getLink('admin.events.list'))
          } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to delete event'
            setActionError(errorMessage)
            showError(errorMessage)
          } finally {
            setActionLoading(false)
          }
        }}
        onCancel={() => {
          setDeleteDialog(false)
          setActionError(null)
        }}
      />

      {/* Cancel Event Dialog */}
      <ConfirmDialog
        open={cancelDialog}
        title="Cancel Event"
        description={`Are you sure you want to cancel this event? This will mark the event as cancelled and notify participants.`}
        confirmLabel="Cancel Event"
        variant="warning"
        requireReason
        loading={actionLoading}
        error={actionError}
        onConfirm={async (reason: string) => {
          if (!eventId) return
          setActionLoading(true)
          setActionError(null)
          
          try {
            const { error } = await supabase
              .from('events')
              .update({
                is_cancelled: true,
                cancellation_reason: reason || null,
                cancelled_at: new Date().toISOString(),
                cancelled_by_user_id: context.userId
              })
              .eq('id', eventId)
            
            if (error) throw error
            
             // Distribute notifications for cancellation
             const { distributeEventCancelNotifications } = await import('../../data/services/notificationDistribution')
             const { data: eventData } = await supabaseAny.from('events').select('title, team_id, org_id, start_time').eq('id', eventId).single()
             
             if (eventData) {
               distributeEventCancelNotifications({
                 id: eventId,
                 team_id: eventData.team_id,
                 org_id: eventData.org_id,
                 title: eventData.title,
                 start_time: eventData.start_time,
                 created_by_user_id: context.userId
               }).catch(err => console.error('Failed to distribute event cancel notifications:', err))
             }

            showSuccess('Event cancelled successfully')
            navigate(getLink('admin.events.list'))
          } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to cancel event'
            setActionError(errorMessage)
            showError(errorMessage)
          } finally {
            setActionLoading(false)
          }
        }}
        onCancel={() => {
          setCancelDialog(false)
          setActionError(null)
        }}
      />

      {/* RSVP Change Confirmation Dialog */}
      <ConfirmDialog
        open={showRsvpChangeDialog}
        title="Change RSVP Type"
        description="Changing RSVP type will delete existing RSVP responses. Are you sure?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleConfirmRsvpChange}
        onCancel={() => {
          setShowRsvpChangeDialog(false)
          setPendingRsvpChange(null)
        }}
      />
    </div>
  )
}
