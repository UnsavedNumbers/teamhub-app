/**
 * Platform Admin – Ticketing: Organization context
 * This org's ticketing dashboard (events, orders) for support.
 */

import { useParams, Link } from 'react-router-dom'
import { getLink } from '@/utils/routes'

export default function TicketingOrgDashboard() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="pa-page-container">
      <h1 className="pa-page-title">Ticketing – Organization</h1>
      <p className="pa-body-m text-[var(--pa-n600)]">
        Ticketing overview for organization {id}. Use this context for support when viewing an org's events and orders.
      </p>
      <p className="pa-caption text-[var(--pa-n500)] mt-4">
        You can link to org admin ticketing (with org context) or embed a filtered view of events/orders here.
      </p>
      {id && (
        <p className="pa-body-s mt-4">
          <Link to={getLink('admin.ticketingEvents')} className="pa-link">
            Open org ticketing (requires org context)
          </Link>
        </p>
      )}
    </div>
  )
}
