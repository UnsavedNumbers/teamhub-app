import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { createCustomerPortalSession, getBillingHistory, BillingEvent } from '../../api/billing'
import { BillingHistoryTimeline } from '../../components/admin/BillingHistoryTimeline'
import { getErrorMessage } from '../../utils/errorUtils'
import {
  getStatusMessage,
} from '../../utils/billingHelpers'
import { useIsMounted } from '../../hooks/useIsMounted'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../types/ticketing'
import { useTicketRevenueByEvent, useMonthlyTicketRevenue } from '../../hooks/useTicketRevenue'
import {
  AdminPageHeader,
  Card,
  Button,
  Badge,
} from '../../components/admin'
import '../../styles/orgAdmin.css'

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function OrganizationBilling() {
  useDebugLifecycle('OrganizationBilling')
  
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const isMounted = useIsMounted()

  const { summary, loading, error } = useLicense(orgId)

  const [history, setHistory] = useState<BillingEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // Load ticket sales revenue for current month
  const { data: ticketRevenue, isLoading: ticketRevenueLoading } = useQuery({
    queryKey: ['ticket-revenue', orgId],
    queryFn: async () => {
      if (!orgId) return null

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Query ticket_orders for current org and month (using processed_at for Connect orders)
      // Prefer stripe_connect_transactions as source of truth, but fallback to ticket_orders if needed
      const { data: transactions, error: txError } = await supabase
        .from('stripe_connect_transactions')
        .select(`
          gross_amount_cents,
          application_fee_cents,
          net_amount_cents,
          ticket_order_id,
          ticket_orders!inner(
            org_id,
            ticket_order_items(quantity)
          )
        `)
        .eq('ticket_orders.org_id', orgId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())

      if (txError) {
        // Fallback: query ticket_orders directly if transactions query fails
        const { data: orders, error: ordersError } = await supabase
          .from('ticket_orders')
          .select(`
            total_cents,
            platform_fee_cents,
            org_revenue_cents,
            ticket_order_items(quantity)
          `)
          .eq('org_id', orgId)
          .gte('processed_at', startOfMonth.toISOString())
          .lte('processed_at', endOfMonth.toISOString())
          .eq('status', 'paid')
          .not('platform_fee_cents', 'is', null)

        if (ordersError) throw ordersError

        if (!orders || orders.length === 0) {
          return {
            grossCents: 0,
            platformFeeCents: 0,
            orgRevenueCents: 0,
            totalTickets: 0,
          }
        }

        const grossCents = orders.reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0)
        const platformFeeCents = orders.reduce((sum: number, o: any) => sum + (o.platform_fee_cents || 0), 0)
        const orgRevenueCents = orders.reduce((sum: number, o: any) => {
          if (o.org_revenue_cents !== null) return sum + o.org_revenue_cents
          return sum + ((o.total_cents || 0) - (o.platform_fee_cents || 0))
        }, 0)
        const totalTickets = orders.reduce((sum: number, o: any) => {
          const items = o.ticket_order_items || []
          return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0)
        }, 0)

        return { grossCents, platformFeeCents, orgRevenueCents, totalTickets }
      }

      if (!transactions || transactions.length === 0) {
        return {
          grossCents: 0,
          platformFeeCents: 0,
          orgRevenueCents: 0,
          totalTickets: 0,
        }
      }

      const grossCents = transactions.reduce((sum: number, t: any) => sum + (t.gross_amount_cents || 0), 0)
      const platformFeeCents = transactions.reduce((sum: number, t: any) => sum + (t.application_fee_cents || 0), 0)
      const orgRevenueCents = transactions.reduce((sum: number, t: any) => sum + (t.net_amount_cents || 0), 0)

      // Count total tickets from order items
      const totalTickets = transactions.reduce((sum: number, t: any) => {
        const order = t.ticket_orders as any
        const items = order?.ticket_order_items || []
        return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0)
      }, 0)

      return {
        grossCents,
        platformFeeCents,
        orgRevenueCents,
        totalTickets,
      }
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: 1000,
  })

  const loadHistory = useCallback(async (organizationId: string) => {
    if (!organizationId) return

    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const events = await getBillingHistory(organizationId)
      // Check if component is still mounted before updating state
      if (isMounted.current) {
        setHistory(events)
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setHistoryError(getErrorMessage(err))
      }
    } finally {
      if (isMounted.current) {
        setHistoryLoading(false)
      }
    }
  }, [isMounted])

  useEffect(() => {
    if (orgId) {
      loadHistory(orgId)
    }
  }, [orgId, loadHistory])

  const currentPlanLabel = useMemo(() => {
    return summary?.tierName ?? t('license.planLabel')
  }, [summary?.tierName])

  const statusMessage = useMemo(() => {
    return getStatusMessage(summary)
  }, [summary])

  const statusBadgeText = useMemo(() => {
    if (!summary?.status) return 'Unknown'
    switch (summary.status) {
      case 'active':
        return 'Active'
      case 'trial':
        return 'Trial'
      case 'past_due':
        return 'Past Due'
      case 'canceled':
        return 'Canceled'
      case 'expired':
        return 'Expired'
      default:
        return String(summary.status).replace('_', ' ').toUpperCase()
    }
  }, [summary?.status])

  const statusBadgeVariant = useMemo(() => {
    switch (summary?.status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'info'
      case 'past_due':
        return 'warning'
      case 'expired':
        return 'danger'
      case 'canceled':
        return 'neutral'
      default:
        return 'neutral'
    }
  }, [summary?.status])

  const isAutoRenewing = summary ? !summary.cancelAtPeriodEnd : false

  async function handleOpenPortal() {
    if (!orgId) return
    setPortalLoading(true)
    try {
      const { portal_url } = await createCustomerPortalSession({
        organizationId: orgId,
        returnUrl: `${window.location.origin}/admin/organization/billing`,
      })
      if (portal_url) {
        // Don't set state after navigation - window.location.href will navigate away
        window.location.href = portal_url
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setHistoryError(getErrorMessage(err) || t('billing.errorCreatingPortal'))
      }
    } finally {
      if (isMounted.current) {
        setPortalLoading(false)
      }
    }
  }

  function handleSelectPlan() {
    navigate('/admin/organization/billing/plan-selection')
  }

  function handleDownloadStatement() {
    // Open customer portal for invoice downloads
    handleOpenPortal()
  }

  if (!orgId) {
    return (
      <div className="oa-root">
        <Card className="oa-card oa-text-danger">
          {t('errors.missingOrganization')}
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader title={t('billing.pageTitle')} />

      {error && (
        <div
          className="oa-card oa-mb-4 oa-text-danger"
          style={{ background: 'var(--oa-danger-bg)', border: 'none' }}
        >
          {error}
        </div>
      )}

      <div className="oa-form-container" style={{ maxWidth: '896px', margin: '0 auto' }}>
        {/* Organization Subscription */}
        <Card className="oa-card oa-mb-6">
          <div className="oa-flex oa-flex-col md:oa-flex-row md:oa-items-center oa-justify-between oa-gap-6">
            <div>
              <div className="oa-flex oa-items-center oa-gap-3 oa-mb-2">
                <span className="oa-body-s oa-text-slate-500 oa-font-medium">
                  Organization Subscription
                </span>
                <Badge variant={statusBadgeVariant}>{statusBadgeText}</Badge>
              </div>
              <h1 className="oa-h1 oa-mb-4 oa-uppercase">
                Annual Organization License
              </h1>
              <p className="oa-body-s oa-text-slate-600 oa-mb-1">
                <span className="oa-font-semibold">Tier:</span> {currentPlanLabel}
              </p>
            </div>
            <div className="oa-shrink-0">
              <Button
                variant="primary"
                onClick={handleOpenPortal}
                loading={portalLoading}
                disabled={loading || portalLoading}
                className="oa-uppercase oa-font-semibold"
              >
                Manage Billing
              </Button>
            </div>
          </div>
        </Card>

        {/* Billing Summary */}
        <Card className="oa-card oa-mb-6">
          <div className="oa-flex oa-items-center oa-justify-between oa-mb-4">
            <h2 className="oa-h3 oa-font-semibold">
              Billing Summary
            </h2>
            <Button
              variant="ghost"
              size="compact"
              icon="download"
              onClick={handleDownloadStatement}
            >
              Download Statement
            </Button>
          </div>
          <div className="oa-flex oa-flex-wrap oa-gap-6">
            <div>
              <p className="oa-body-xs oa-text-slate-500 oa-mb-1">
                Base Plan
              </p>
              <p className="oa-body-s oa-font-medium">
                {summary?.plan ? `${currentPlanLabel} / yr` : '—'}
              </p>
            </div>
            <div>
              <p className="oa-body-xs oa-text-slate-500 oa-mb-1">
                Next Payment Due
              </p>
              <p className="oa-body-s oa-font-medium">
                {summary?.currentPeriodEnd ? formatDate(summary.currentPeriodEnd) : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Ticket Sales Revenue */}
        <Card className="oa-card oa-mb-6">
          <h2 className="oa-h3 oa-font-semibold oa-mb-4">
            Ticket Sales Revenue – {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          {ticketRevenueLoading ? (
            <div className="oa-text-center oa-py-4">
              <p className="oa-body-s oa-text-slate-500">Loading revenue data...</p>
            </div>
          ) : ticketRevenue ? (
            ticketRevenue.totalTickets === 0 ? (
              <div className="oa-text-center oa-py-4">
                <p className="oa-body-s oa-text-slate-500 oa-mb-2">No ticket sales this period</p>
                <p className="oa-body-xs oa-text-slate-400">
                  Gross Ticket Sales: $0.00<br />
                  Platform Fees: $0.00<br />
                  Your Revenue: $0.00
                </p>
              </div>
            ) : (
              <div className="oa-flex oa-flex-col oa-gap-4">
                <div className="oa-flex oa-items-center oa-justify-between oa-pb-3 oa-border-b oa-border-slate-200">
                  <span className="oa-body-s oa-text-slate-600">Gross Ticket Sales:</span>
                  <span className="oa-body-s oa-font-semibold">{formatCurrency(ticketRevenue.grossCents)}</span>
                </div>
                <div className="oa-flex oa-items-center oa-justify-between oa-pb-3 oa-border-b oa-border-slate-200">
                  <span className="oa-body-s oa-text-slate-600">Platform Fees:</span>
                  <span className="oa-body-s oa-font-semibold oa-text-slate-500">-{formatCurrency(ticketRevenue.platformFeeCents)}</span>
                </div>
                <div className="oa-flex oa-items-center oa-justify-between oa-pb-3 oa-border-b oa-border-slate-200">
                  <span className="oa-body-s oa-text-slate-600">Your Revenue:</span>
                  <span className="oa-body-s oa-font-semibold oa-text-green-600">{formatCurrency(ticketRevenue.orgRevenueCents)}</span>
                </div>
                <div className="oa-flex oa-items-center oa-justify-between oa-pt-2">
                  <span className="oa-body-xs oa-text-slate-500">Total Tickets Sold:</span>
                  <span className="oa-body-xs oa-font-medium">{ticketRevenue.totalTickets}</span>
                </div>
                <div className="oa-mt-2 oa-pt-3 oa-border-t oa-border-slate-200">
                  <p className="oa-body-xs oa-text-slate-400">
                    Payouts typically arrive in 2–7 business days
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="oa-text-center oa-py-4">
              <p className="oa-body-s oa-text-slate-500">Unable to load revenue data</p>
            </div>
          )}
        </Card>

        {/* Renewal & Payment */}
        <Card className="oa-card oa-mb-6">
          <h2 className="oa-h3 oa-font-semibold oa-mb-4">
            Renewal & Payment
          </h2>
          <div className="oa-flex oa-flex-col oa-gap-4">
            <div className="oa-flex oa-items-center oa-justify-between">
              <div>
                <p className="oa-body-s oa-font-semibold oa-mb-0">
                  Payment method managed in Stripe
                </p>
                <p className="oa-body-xs oa-text-slate-500">
                  Update payment method in customer portal
                </p>
              </div>
              <Button variant="secondary" onClick={handleOpenPortal} disabled={portalLoading || loading}>
                Update
              </Button>
            </div>
            <div className="oa-flex oa-items-center oa-justify-between">
              <div>
                <p className="oa-body-s oa-font-semibold oa-mb-0">
                  {isAutoRenewing ? 'Auto-Renewal is On' : 'Auto-Renewal is Off'}
                </p>
                <p className="oa-body-xs oa-text-slate-500">
                  {isAutoRenewing
                    ? summary?.currentPeriodEnd
                      ? `Renews on ${formatDate(summary.currentPeriodEnd)}.`
                      : 'Your license will automatically renew.'
                    : `Cancels on ${summary?.currentPeriodEnd ? formatDate(summary.currentPeriodEnd) : 'renewal date'}.`}
                </p>
              </div>
              <Badge variant={isAutoRenewing ? 'info' : 'neutral'}>
                {isAutoRenewing ? 'Auto' : 'Manual'}
              </Badge>
            </div>
            {!summary?.cancelAtPeriodEnd && summary?.stripeSubscriptionId && (
              <Button
                variant="ghost"
                size="compact"
                onClick={handleOpenPortal}
                className="oa-text-danger oa-self-start"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </Card>

        {/* Status Message */}
        {statusMessage && (
          <Card
            className="oa-card oa-mb-8"
            style={{
              background:
                summary?.status === 'past_due' || summary?.status === 'expired'
                  ? 'var(--oa-warning-bg)'
                  : 'var(--oa-info-bg)',
            }}
          >
            <div className="oa-flex oa-items-start oa-gap-3">
              <span
                className="material-symbols-outlined"
                style={{
                  color:
                    summary?.status === 'past_due' || summary?.status === 'expired'
                      ? 'var(--oa-warning)'
                      : 'var(--oa-info)',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                {summary?.status === 'past_due' || summary?.status === 'expired'
                  ? 'warning'
                  : 'info'}
              </span>
              <div className="oa-body-m oa-font-medium">
                {statusMessage}
              </div>
            </div>
          </Card>
        )}

        {/* Ticket Revenue by Event (Optional Reporting) */}
        {ticketRevenue && ticketRevenue.totalTickets > 0 && (
          <TicketRevenueReporting orgId={orgId} />
        )}

        {/* Billing History */}
        <Card className="oa-card">
          <h3 className="oa-h3 oa-mb-6">{t('billing.viewBillingHistory')}</h3>
          <BillingHistoryTimeline
            events={history}
            loading={historyLoading}
            error={historyError}
            hasSubscription={!!summary?.stripeSubscriptionId}
            onSelectPlan={handleSelectPlan}
          />
        </Card>
      </div>
    </div>
  )
}

/**
 * Ticket Revenue Reporting Component
 * Shows revenue by event and monthly summaries
 */
function TicketRevenueReporting({ orgId }: { orgId: string | undefined }) {
  const { data: revenueByEvent, isLoading: eventsLoading } = useTicketRevenueByEvent(orgId)
  const { data: monthlyRevenue, isLoading: monthlyLoading } = useMonthlyTicketRevenue(orgId, 6)

  const currentMonth = monthlyRevenue?.[0]
  const lastMonth = monthlyRevenue?.[1]

  return (
    <>
      {/* Revenue by Event */}
      {revenueByEvent && revenueByEvent.length > 0 && (
        <Card className="oa-card oa-mb-6">
          <h3 className="oa-h3 oa-font-semibold oa-mb-4">Revenue by Event</h3>
          {eventsLoading ? (
            <div className="oa-text-center oa-py-4">
              <p className="oa-body-s oa-text-slate-500">Loading event revenue...</p>
            </div>
          ) : (
            <div className="oa-space-y-3">
              {revenueByEvent.slice(0, 5).map((event) => (
                <div key={event.ticketed_event_id} className="oa-flex oa-items-center oa-justify-between oa-pb-3 oa-border-b oa-border-slate-200 last:oa-border-0">
                  <div>
                    <p className="oa-body-s oa-font-semibold">{event.event_title}</p>
                    <p className="oa-body-xs oa-text-slate-500">
                      {event.order_count} order{event.order_count !== 1 ? 's' : ''} • {event.ticket_count} ticket{event.ticket_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="oa-text-right">
                    <p className="oa-body-s oa-font-semibold oa-text-green-600">{formatCurrency(event.org_revenue_cents)}</p>
                    <p className="oa-body-xs oa-text-slate-400">-{formatCurrency(event.platform_fee_cents)} fees</p>
                  </div>
                </div>
              ))}
              {revenueByEvent.length > 5 && (
                <p className="oa-body-xs oa-text-slate-400 oa-text-center oa-pt-2">
                  Showing top 5 events. {revenueByEvent.length - 5} more events.
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Monthly Summary */}
      {monthlyRevenue && monthlyRevenue.length > 0 && (
        <Card className="oa-card oa-mb-6">
          <h3 className="oa-h3 oa-font-semibold oa-mb-4">Monthly Summary</h3>
          {monthlyLoading ? (
            <div className="oa-text-center oa-py-4">
              <p className="oa-body-s oa-text-slate-500">Loading monthly data...</p>
            </div>
          ) : (
            <div className="oa-space-y-4">
              {currentMonth && (
                <div className="oa-p-4 oa-bg-slate-50 dark:oa-bg-slate-800 oa-rounded-lg">
                  <p className="oa-body-xs oa-text-slate-500 oa-mb-2">
                    {new Date(`${currentMonth.month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="oa-flex oa-items-center oa-justify-between oa-mb-2">
                    <span className="oa-body-s oa-text-slate-600">Your Revenue</span>
                    <span className="oa-body-s oa-font-semibold oa-text-green-600">{formatCurrency(currentMonth.org_revenue_cents)}</span>
                  </div>
                  <div className="oa-flex oa-items-center oa-justify-between oa-text-xs oa-text-slate-500">
                    <span>{currentMonth.order_count} orders</span>
                    <span>Platform fees: {formatCurrency(currentMonth.platform_fee_cents)}</span>
                  </div>
                </div>
              )}
              {lastMonth && (
                <div className="oa-p-4 oa-bg-white dark:oa-bg-slate-900 oa-rounded-lg oa-border oa-border-slate-200 dark:oa-border-slate-700">
                  <p className="oa-body-xs oa-text-slate-500 oa-mb-2">
                    {new Date(`${lastMonth.month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="oa-flex oa-items-center oa-justify-between">
                    <span className="oa-body-s oa-text-slate-600">Your Revenue</span>
                    <span className="oa-body-s oa-font-semibold">{formatCurrency(lastMonth.org_revenue_cents)}</span>
                  </div>
                </div>
              )}
              {currentMonth && (
                <p className="oa-body-xs oa-text-slate-400 oa-text-center oa-pt-2">
                  Platform fees collected: {formatCurrency(currentMonth.platform_fee_cents)} this month from {currentMonth.ticket_count} tickets sold
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  )
}
