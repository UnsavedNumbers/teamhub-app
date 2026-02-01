/**
 * Org Landing Page
 * 
 * Public landing page for an organization showing available public features
 * Must be wrapped in OrgScopedRoute
 */

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketedEvents } from '@/data/services'
import type { OrgContext } from '@/utils/orgResolution'
import { OrgScopedRoute } from '@/components/OrgScopedRoute'

function OrgLandingContent({ org }: { org: OrgContext }) {
  const orgSlug = ''

  // Check if ticketing is enabled and has events
  const { data: eventsResponse } = useQuery({
    queryKey: ['ticketed-events', 'published', org.id, 'preview'],
    queryFn: () => getTicketedEvents({ org_id: org.id, status: 'published', upcoming_only: true }),
    select: (data: any) => {
      const events = Array.isArray(data) ? data : data?.data || []
      return events.slice(0, 3) // Preview first 3 events
    },
  })

  const eventsResponseAny = eventsResponse as any
  const previewEvents = (Array.isArray(eventsResponseAny) ? eventsResponseAny : eventsResponseAny?.data || [])

  const hasTicketing = previewEvents.length > 0

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white">
      {/* Header with org branding */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-[#2a3038] px-10 py-3 bg-white dark:bg-[#111418]">
        <div className="flex items-center gap-4 text-[#137fec]">
          <div className="size-6">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-black leading-tight tracking-tight">{org.name}</h2>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">{org.name}</h1>
          <p className="text-xl text-[#617589] dark:text-gray-400 max-w-2xl mx-auto">
            Welcome to our public portal. Browse events, purchase tickets, and stay connected.
          </p>
        </div>

        {/* Feature Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {hasTicketing && (
            <Link
              to={`/o/${orgSlug}/tickets`}
              className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1c2630] rounded-xl shadow-sm hover:shadow-md transition-shadow border border-[#f0f2f4] dark:border-gray-800 group"
            >
              <div className="size-16 bg-[#137fec]/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#137fec]/20 transition-colors">
                <span className="material-symbols-outlined text-[#137fec] text-4xl">confirmation_number</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Buy Tickets</h3>
              <p className="text-[#617589] dark:text-gray-400 text-sm text-center">
                Purchase tickets for upcoming events
              </p>
            </Link>
          )}

          {/* Placeholder for future features */}
          <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1c2630] rounded-xl shadow-sm border border-[#f0f2f4] dark:border-gray-800 opacity-50">
            <div className="size-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-gray-400 text-4xl">photo_library</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-400">Photo Galleries</h3>
            <p className="text-gray-500 dark:text-gray-600 text-sm text-center">
              Coming soon
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1c2630] rounded-xl shadow-sm border border-[#f0f2f4] dark:border-gray-800 opacity-50">
            <div className="size-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-gray-400 text-4xl">event</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-400">Schedule</h3>
            <p className="text-gray-500 dark:text-gray-600 text-sm text-center">
              Coming soon
            </p>
          </div>
        </div>

        {/* Upcoming Events Preview */}
        {hasTicketing && previewEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black tracking-tight">Upcoming Events</h2>
              <Link
                to={`/o/${orgSlug}/tickets`}
                className="text-[#137fec] font-bold hover:underline"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {previewEvents.map((event: any) => (
                <Link
                  key={event.id}
                  to={`/o/${orgSlug}/tickets/events/${event.id}`}
                  className="flex flex-col bg-white dark:bg-[#1c2630] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  {event.cover_image_path && (
                    <div className="w-full aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${event.cover_image_path})` }} />
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-[#137fec] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-[#617589] dark:text-gray-400">
                      {new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function OrgLanding() {
  return (
    <OrgScopedRoute>
      {(org) => <OrgLandingContent org={org} />}
    </OrgScopedRoute>
  )
}
