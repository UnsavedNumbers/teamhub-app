/**
 * OverviewTab Component
 * 
 * Main overview tab showing organization details, contact info, license/billing,
 * quick stats, and recent activity.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge, Button } from '../../../../components/platformAdmin'
import { MaskedStripeId } from '../../../../components/platformAdmin/MaskedStripeId'
import { ContactLocationCard } from '../components/ContactLocationCard'
import { QuickStatsCard } from '../components/QuickStatsCard'
import { RecentActivityCard } from '../components/RecentActivityCard'
import { safeString, safeBoolean } from '../../../../utils/safeAccessors'
import { getStatusVariant, formatDate, isInTrial, isInGracePeriod, getDaysUntilTrialExpires } from '../../../../utils/organizationUtils'
import { useRolePermissions } from '../../../../hooks/useRolePermissions'
import type { AdminOrganization } from '../../../../types/platformAdmin.types'
import type { PlatformAdminRole } from '../../../../types/platformAdmin.types'
import { useDebugLifecycle } from '../../../../lib/debug/integrations/useDebugLifecycle'

interface OverviewTabProps {
  organization: AdminOrganization
  adminRole: PlatformAdminRole | null
  onViewActivity?: () => void
}

export function OverviewTab({ organization, adminRole, onViewActivity }: OverviewTabProps) {
  useDebugLifecycle('OverviewTab')
  
  const [showStripeDetails, setShowStripeDetails] = useState(false)
  const permissions = useRolePermissions()

  // State indicators
  const daysUntilTrialExpires = getDaysUntilTrialExpires(organization.license_trial_ends_at)
  const inTrial = isInTrial(organization.license_trial_ends_at)
  const inGracePeriod = isInGracePeriod(organization.license_trial_ends_at)

  // Stripe dashboard link
  const stripeDashboardUrl = organization.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${organization.stripe_customer_id}`
    : null

  return (
    <div>
      {/* State Indicators */}
      {daysUntilTrialExpires !== null && daysUntilTrialExpires <= 7 && daysUntilTrialExpires > 0 && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: daysUntilTrialExpires <= 3 ? 'var(--pa-danger-bg)' : 'var(--pa-warning-bg)',
            border: `1px solid ${daysUntilTrialExpires <= 3 ? 'var(--pa-danger)' : 'var(--pa-warning)'}`,
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {daysUntilTrialExpires <= 3 ? 'error' : 'warning'}
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              {inTrial
                ? `Trial expires in ${daysUntilTrialExpires} day${daysUntilTrialExpires !== 1 ? 's' : ''}`
                : inGracePeriod
                ? `Grace period ends in ${daysUntilTrialExpires} day${daysUntilTrialExpires !== 1 ? 's' : ''}`
                : 'Trial has expired'}
            </span>
          </div>
        </div>
      )}

      {organization.status === 'suspended' && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-danger-bg)',
            border: '1px solid var(--pa-danger)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>block</span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              This organization is suspended. All users are unable to access it.
            </span>
          </div>
        </div>
      )}

      <div className="pa-grid pa-grid-2 pa-gap-4">
        {/* Organization Details */}
        <Card title="Organization Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Created</div>
              <div className="pa-body-m">{formatDate(organization.created_at)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Updated</div>
              <div className="pa-body-m">{formatDate(organization.updated_at)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Type</div>
              <div className="pa-body-m">{safeString(organization.org_type)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Status</div>
              <Badge variant={getStatusVariant(organization.status)}>{organization.status}</Badge>
            </div>
            {organization.slug && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="pa-caption pa-text-muted pa-mb-1">Slug</div>
                <div className="pa-body-m">
                  <code style={{ fontSize: '12px', background: 'var(--pa-n100)', padding: '2px 6px', borderRadius: '4px' }}>
                    {organization.slug}
                  </code>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <QuickStatsCard organization={organization} />

        {/* Quick links */}
        {permissions.canViewPhotoOverview && (
          <Card title="Quick links">
            <div className="pa-flex pa-gap-2">
              <Button
                variant="ghost"
                size="dense"
                icon="photo_library"
                as={Link}
                to={`/platform-admin/organizations/${organization.id}/photos`}
              >
                Photos
              </Button>
            </div>
          </Card>
        )}

        {/* Contact & Location */}
        <ContactLocationCard organization={organization} />

        {/* License & Billing */}
        <Card title="License & Billing">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">License Status</div>
              <div className="pa-body-m">
                {organization.license_status ? (
                  <Badge variant={organization.license_status === 'active' ? 'success' : 'neutral'}>
                    {organization.license_status}
                  </Badge>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Plan</div>
              <div className="pa-body-m">{safeString(organization.license_plan)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Trial Ends</div>
              <div className="pa-body-m">{formatDate(organization.license_trial_ends_at)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Period Start</div>
              <div className="pa-body-m">{formatDate(organization.license_current_period_start)}</div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Period End</div>
              <div className="pa-body-m">{formatDate(organization.license_current_period_end)}</div>
            </div>
            {organization.license_grace_ends_at && (
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Grace Ends</div>
                <div className="pa-body-m">{formatDate(organization.license_grace_ends_at)}</div>
              </div>
            )}
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Stripe</div>
              <div className="pa-flex pa-items-center pa-gap-2">
                <Badge variant={organization.stripe_connected ? 'success' : 'neutral'}>
                  {organization.stripe_connected ? 'Connected' : 'Not Connected'}
                </Badge>
                {stripeDashboardUrl && permissions.canViewStripeDetails && (
                  <Button
                    variant="ghost"
                    size="dense"
                    icon="open_in_new"
                    onClick={() => window.open(stripeDashboardUrl, '_blank')}
                    title="View in Stripe Dashboard"
                  >
                    Stripe
                  </Button>
                )}
              </div>
            </div>
            <div>
              <div className="pa-caption pa-text-muted pa-mb-1">Payouts</div>
              <Badge variant={safeBoolean(organization.payouts_enabled) ? 'success' : 'neutral'}>
                {safeBoolean(organization.payouts_enabled) ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            {organization.payout_onboarding_status && (
              <div>
                <div className="pa-caption pa-text-muted pa-mb-1">Payout Status</div>
                <Badge
                  variant={
                    organization.payout_onboarding_status === 'completed'
                      ? 'success'
                      : organization.payout_onboarding_status === 'restricted'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {organization.payout_onboarding_status}
                </Badge>
              </div>
            )}
            {safeBoolean(organization.license_cancel_at_period_end) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="pa-caption pa-text-muted pa-mb-1">Cancellation</div>
                <div className="pa-body-m">
                  <Badge variant="warning">Cancels at period end</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Stripe Details Accordion */}
          {organization.stripe_connected && (
            <div style={{ marginTop: 'var(--pa-space-4)', paddingTop: 'var(--pa-space-4)', borderTop: '1px solid var(--pa-n100)' }}>
              <Button
                variant="ghost"
                size="dense"
                icon={showStripeDetails ? 'expand_less' : 'expand_more'}
                onClick={() => setShowStripeDetails(!showStripeDetails)}
                style={{ marginBottom: showStripeDetails ? 'var(--pa-space-3)' : 0 }}
              >
                {showStripeDetails ? 'Hide' : 'Show'} Stripe Details
              </Button>

              {showStripeDetails && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
                  {organization.stripe_customer_id && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Customer ID</div>
                      <MaskedStripeId
                        stripeId={organization.stripe_customer_id}
                        role={adminRole}
                        showCopy
                      />
                    </div>
                  )}
                  {organization.stripe_subscription_id && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Subscription ID</div>
                      <MaskedStripeId
                        stripeId={organization.stripe_subscription_id}
                        role={adminRole}
                        showCopy
                      />
                    </div>
                  )}
                  {organization.stripe_price_id && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Price ID</div>
                      <MaskedStripeId
                        stripeId={organization.stripe_price_id}
                        role={adminRole}
                        showCopy
                      />
                    </div>
                  )}
                  {organization.payout_account_id && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Payout Account ID</div>
                      <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                        {organization.payout_account_id}
                      </code>
                    </div>
                  )}
                  {organization.payout_descriptor && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Payout Descriptor</div>
                      <div className="pa-body-m">{organization.payout_descriptor}</div>
                    </div>
                  )}
                  {organization.billing_mode && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Billing Mode</div>
                      <div className="pa-body-m">{organization.billing_mode}</div>
                    </div>
                  )}
                  {organization.currency && (
                    <div>
                      <div className="pa-caption pa-text-muted pa-mb-1">Currency</div>
                      <div className="pa-body-m">{organization.currency.toUpperCase()}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <RecentActivityCard organizationId={organization.id} onViewAll={onViewActivity} />
      </div>
    </div>
  )
}
