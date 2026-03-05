/**
 * Comp Tickets Page
 * 
 * Admin page to issue complimentary tickets for events.
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useT } from '@/i18n/useI18n'
import { useOrganization } from '@/contexts/OrganizationContext'
import { generateCompTickets } from '@/data/services/ticketingService'
import { getTicketedEvents } from '@/data/services'
import { supabase } from '@/lib/supabase'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/platformAdmin'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { TicketedEvent, TicketType } from '@/types/ticketing'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'
import '../../styles/orgAdmin.css'

export default function CompTicketsPage() {
  useDebugLifecycle('CompTicketsPage')
  
  const t = useT()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [ticketTypeId, setTicketTypeId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Load events
  const { data: eventsResponse } = useQuery({
    queryKey: ['ticketed-events', 'admin', orgId],
    queryFn: () => getTicketedEvents({ org_id: orgId, status: 'published' }),
    enabled: !!orgId,
  })

  const eventsAny = eventsResponse as any
  const events = Array.isArray(eventsAny) ? eventsAny : eventsAny?.data || []

  // Load ticket types for selected event
  const { data: ticketTypesResponse } = useQuery({
    queryKey: ['ticket-types', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId || !orgId) return []
      
      const { data, error } = await supabase
        .from('ticket_types')
        .select('id, name, price_cents')
        .eq('ticketed_event_id', selectedEventId)
        .eq('is_active', true)
        .order('sort_order')
      
      if (error) throw error
      return data || []
    },
    enabled: !!selectedEventId && !!orgId,
  })

  const ticketTypes = (ticketTypesResponse || []) as TicketType[]

  // Reset ticket type when event changes
  useEffect(() => {
    if (selectedEventId) {
      setTicketTypeId('')
    }
  }, [selectedEventId])

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEventId || !ticketTypeId || !recipientEmail) {
        throw new Error('Missing required fields')
      }

      return generateCompTickets({
        event_id: selectedEventId,
        ticket_type_id: ticketTypeId,
        quantity,
        recipient_email: recipientEmail,
        recipient_name: recipientName || undefined,
        notes: notes || undefined,
      })
    },
    onSuccess: ({ data, error }) => {
      if (error || !data) {
        setStatus('error')
        setMessage(error?.message || t('ticketing.compTickets.error'))
      } else {
        setStatus('success')
        setMessage(data.message)
        // Reset form
        setRecipientEmail('')
        setRecipientName('')
        setNotes('')
        setQuantity(1)
      }
    },
    onError: (error: Error) => {
      setStatus('error')
      setMessage(error.message || t('ticketing.compTickets.error'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    generateMutation.mutate()
  }

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title={t('ticketing.compTickets.title')}
        breadcrumbs={[
          { label: 'Home', path: '/admin' },
          { label: 'Ticketing', path: '/admin/ticketing/events' },
          { label: t('ticketing.compTickets.title') },
        ]}
      />

      <div className="max-w-2xl mx-auto mt-8">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
          {/* Event selector */}
          <div>
            <label htmlFor="event" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.compTickets.event')}
            </label>
            <select
              id="event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
              required
            >
              <option value="">{t('ticketing.compTickets.selectEvent')}</option>
              {events.map((event: TicketedEvent) => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.starts_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket type selector */}
          <div>
            <label htmlFor="ticket-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.compTickets.ticketType')}
            </label>
            <select
              id="ticket-type"
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
              required
              disabled={!selectedEventId}
            >
              <option value="">{t('ticketing.compTickets.selectTicketType')}</option>
              {ticketTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} {type.price_cents > 0 && `(normally $${(type.price_cents / 100).toFixed(2)})`}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.compTickets.quantity')}
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
              required
            />
          </div>

          {/* Recipient email */}
          <div>
            <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.compTickets.recipientEmail')}
            </label>
            <input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder={t('ticketing.compTickets.recipientEmailPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
              required
            />
          </div>

          {/* Recipient name */}
          <div>
            <label htmlFor="recipient-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.compTickets.recipientName')}
            </label>
            <input
              id="recipient-name"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t('ticketing.compTickets.recipientNamePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ticketing.compTickets.notes')}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('ticketing.compTickets.notesPlaceholder')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
            />
          </div>

          <Button
            type="submit"
            disabled={status === 'loading' || !selectedEventId || !ticketTypeId || !recipientEmail}
            className="w-full"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('ticketing.compTickets.sending')}
              </span>
            ) : (
              t('ticketing.compTickets.generateAndSend')
            )}
          </Button>
        </form>

        {status === 'success' && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 dark:text-green-200 font-semibold">
                {t('ticketing.compTickets.success')}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {message}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 dark:text-red-200 font-semibold">
                {t('ticketing.compTickets.error')}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
