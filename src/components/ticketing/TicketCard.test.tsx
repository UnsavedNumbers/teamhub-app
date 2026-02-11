import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TicketCard from './TicketCard'
import type { Ticket, TicketType, TicketedEvent } from '@/types/ticketing'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code" />,
}))

const mockTicket: Ticket & { ticket_types?: Pick<TicketType, 'name' | 'description'> } = {
  id: 't1',
  org_id: 'o1',
  order_id: 'o1',
  ticketed_event_id: 'e1',
  ticket_type_id: 'tt1',
  entry_code: 'ABC123XY',
  qr_token_hash: 'hash',
  status: 'active',
  used_at: null,
  used_by_user_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockEvent: Pick<TicketedEvent, 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'> = {
  title: 'Championship Game',
  starts_at: '2026-03-15T19:00:00Z',
  ends_at: '2026-03-15T21:00:00Z',
  venue_name: 'Main Arena',
  venue_city: 'Riverside',
  venue_state: 'CA',
}

describe('TicketCard', () => {
  test('renders event title', () => {
    render(<TicketCard ticket={mockTicket} event={mockEvent} />)
    expect(screen.getByText('Championship Game')).toBeInTheDocument()
  })

  test('renders entry code', () => {
    render(<TicketCard ticket={mockTicket} event={mockEvent} />)
    expect(screen.getByText(/ABC1-23XY|ABC123XY/)).toBeInTheDocument()
  })

  test('renders venue info', () => {
    render(<TicketCard ticket={mockTicket} event={mockEvent} />)
    expect(screen.getByText(/Main Arena|Riverside/)).toBeInTheDocument()
  })
})
