import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  arrival_time: string | null
  location: string | null
  notes: string | null
  team: { name: string }
}

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Attendance {
  id: string
  child_id: string
  status: 'going' | 'late' | 'not_going'
  note: string | null
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const { profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId, profile])

  useEffect(() => {
    // Subscribe to realtime attendance updates
    if (!eventId) return
    
    const channel = supabase
      .channel(`attendance-${eventId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance', filter: `event_id=eq.${eventId || ''}` },
        () => fetchAttendance()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    
    // Fetch event
    const { data: eventData } = await supabase
      .from('events')
      .select('id, title, type, start_time, end_time, arrival_time, location, notes, team:teams(name)')
      .eq('id', eventId || '')
      .single()

    if (!eventData) {
      navigate('/calendar')
      return
    }
    setEvent(eventData as unknown as Event)

    // Fetch user's children
    if (profile?.family_id) {
      const { data: childData } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('family_id', profile.family_id)
      setChildren(childData || [])
    }

    await fetchAttendance()
    setLoading(false)
  }

  async function fetchAttendance() {
    const { data } = await supabase
      .from('attendance')
      .select('id, child_id, status, note')
      .eq('event_id', eventId || '')

    const map: Record<string, Attendance> = {}
    const list = data as unknown as Attendance[]
    list?.forEach((a) => { map[a.child_id] = a })
    setAttendance(map)
  }

  async function handleRsvp(childId: string, status: 'going' | 'late' | 'not_going') {
    setSaving(childId)
    
    const existing = attendance[childId]
    
    if (existing) {
      await supabase.from('attendance').update({ status } as never).eq('id', existing.id)
    } else {
      await supabase.from('attendance').insert({
        event_id: eventId || '',
        child_id: childId,
        status,
      } as never)
    }
    
    await fetchAttendance()
    setSaving(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const statusStyles = {
    going: 'bg-green-600 text-white',
    late: 'bg-amber-600 text-white',
    not_going: 'bg-red-600 text-white',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/calendar" className="text-slate-400 hover:text-white transition-colors mr-4">← Calendar</Link>
            <h1 className="text-xl font-bold text-white">{event.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Details */}
        <div className="card mb-6">
          <p className="text-sm text-slate-400 mb-1">{event.team.name}</p>
          <h2 className="text-2xl font-bold text-white mb-4">{event.title}</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-white">{formatDate(event.start_time)}</p>
                <p className="text-sm text-slate-400">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
              </div>
            </div>

            {event.arrival_time && (
              <div className="flex items-center gap-3 text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Arrive by {formatTime(event.arrival_time)}</p>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <p className="text-white">{event.location}</p>
              </div>
            )}

            {event.notes && (
              <div className="pt-3 border-t border-slate-700 mt-3">
                <p className="text-slate-400">{event.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* RSVP Section */}
        <h3 className="text-lg font-semibold text-white mb-4">RSVP</h3>
        
        {children.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-slate-400 mb-4">You haven't added any children yet.</p>
            <Link to="/portal/children" className="btn-primary">Add Child</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => {
              const att = attendance[child.id]
              return (
                <div key={child.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-white">{child.first_name} {child.last_name}</p>
                    {saving === child.id && <span className="text-sm text-slate-400">Saving...</span>}
                  </div>
                  <div className="flex gap-2">
                    {(['going', 'late', 'not_going'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleRsvp(child.id, status)}
                        disabled={saving === child.id}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                          att?.status === status
                            ? statusStyles[status]
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {status === 'going' ? '✓ Going' : status === 'late' ? '⏰ Late' : '✗ Not Going'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
