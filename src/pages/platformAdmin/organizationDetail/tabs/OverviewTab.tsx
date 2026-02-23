/**
 * OverviewTab Component (Profile-like Design)
 * 
 * Main overview tab showing organization details, contact info, license/billing,
 * quick stats, and recent activity in a clean, profile-like layout.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MaskedStripeId } from '../../../../components/platformAdmin/MaskedStripeId'
import { ContactLocationCard } from '../components/ContactLocationCard'
import { RecentActivityCard } from '../components/RecentActivityCard'
import { safeString, safeBoolean, safeNumber } from '../../../../utils/safeAccessors'
import { formatDate, isInTrial, isInGracePeriod, getDaysUntilTrialExpires } from '../../../../utils/organizationUtils'
import { useRolePermissions } from '../../../../hooks/useRolePermissions'
import { showSuccess, showError } from '../../../../utils/toast'
import { upgradeOrgLicense } from '../../../../api/billing'
import { getActiveTiers } from '../../../../data/services/licenseTiersService'
import { getLink } from '../../../../utils/routes'
import { useI18n } from '../../../../i18n/useI18n'
import type { AdminOrganization } from '../../../../types/platformAdmin.types'
import type { PlatformAdminRole } from '../../../../types/platformAdmin.types'
import { useDebugLifecycle } from '../../../../lib/debug/integrations/useDebugLifecycle'

interface OverviewTabProps {
  organization: AdminOrganization
  adminRole: PlatformAdminRole | null
  onViewActivity?: () => void
  onRefresh?: () => void
}

export function OverviewTab({ organization, adminRole, onViewActivity, onRefresh }: OverviewTabProps) {
  useDebugLifecycle('OverviewTab')
  const { t } = useI18n()
  
  const [showStripeDetails, setShowStripeDetails] = useState(false)
  const [selectedTierId, setSelectedTierId] = useState('')
  const [tierChanging, setTierChanging] = useState(false)
  const [tierChangeError, setTierChangeError] = useState<string | null>(null)
  const permissions = useRolePermissions()

  const { data: activeTiers } = useQuery({
    queryKey: ['active-tiers'],
    queryFn: () => getActiveTiers(),
  })

  async function handleTierChange() {
    if (!selectedTierId || selectedTierId === organization.current_tier_id) return
    setTierChanging(true)
    setTierChangeError(null)
    try {
      const result = await upgradeOrgLicense({
        organizationId: organization.id,
        targetTierId: selectedTierId,
        allowDowngrade: true,
      })
      if (result.success) {
        showSuccess(t('platformAdmin.organization.tierChangeSuccess'))
        setSelectedTierId('')
        onRefresh?.()
      } else {
        const msg = result.message || t('platformAdmin.organization.tierChangeFailed')
        setTierChangeError(msg)
        showError(msg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('platformAdmin.organization.tierChangeError')
      setTierChangeError(msg)
      showError(msg)
    } finally {
      setTierChanging(false)
    }
  }

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
          style={{
            background: daysUntilTrialExpires <= 3 ? 'var(--pa-danger-bg)' : 'var(--pa-warning-bg)',
            border: `1px solid ${daysUntilTrialExpires <= 3 ? 'var(--pa-danger)' : 'var(--pa-warning)'}`,
            borderRadius: 'var(--pa-radius-m)',
            padding: 'var(--pa-space-4)',
            boxShadow: 'var(--pa-shadow-1)',
            marginBottom: 'var(--pa-space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
            <span 
              className="material-symbols-outlined" 
              style={{ 
                fontSize: '24px',
                color: daysUntilTrialExpires <= 3 ? 'var(--pa-danger)' : 'var(--pa-warning)',
              }}
            >
              {daysUntilTrialExpires <= 3 ? 'error' : 'warning'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
              {inTrial
                ? t('platformAdmin.organization.trialExpiresIn', { days: daysUntilTrialExpires })
                : inGracePeriod
                ? t('platformAdmin.organization.gracePeriodEndsIn', { days: daysUntilTrialExpires })
                : t('platformAdmin.organization.trialExpired')}
            </span>
          </div>
        </div>
      )}

      {organization.status === 'suspended' && (
        <div
          style={{
            background: 'var(--pa-danger-bg)',
            border: '1px solid var(--pa-danger)',
            borderRadius: 'var(--pa-radius-m)',
            padding: 'var(--pa-space-4)',
            boxShadow: 'var(--pa-shadow-1)',
            marginBottom: 'var(--pa-space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-danger)' }}>
              block
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
              {t('platformAdmin.organization.suspendedMessage')}
            </span>
          </div>
        </div>
      )}

      {/* Quick Stats Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--pa-space-4)',
        marginBottom: 'var(--pa-space-6)',
      }}>
        <StatBox 
          label="Teams" 
          value={safeNumber(organization.team_count, 0)}
          icon="groups"
        />
        <StatBox 
          label="Sports" 
          value={safeNumber(organization.sport_count, 0)}
          icon="sports_soccer"
        />
        <StatBox 
          label="Users" 
          value={safeNumber(organization.user_count, 0)}
          icon="people"
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 'var(--pa-space-5)',
        alignItems: 'start',
      }}>
        {/* Organization Details */}
        <div style={{
          gridColumn: 'span 4',
          background: 'var(--pa-n0)',
          borderRadius: 'var(--pa-radius-m)',
          boxShadow: 'var(--pa-shadow-1)',
          padding: 'var(--pa-space-6)',
        }}>
          <SectionHeader>{t('platformAdmin.organization.organizationDetails')}</SectionHeader>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr',
            gap: 'var(--pa-space-5)',
            marginTop: 'var(--pa-space-5)',
          }}>
            <DetailField 
              label={t('platformAdmin.organization.created')}
              value={formatDate(organization.created_at)}
            />
            <DetailField 
              label={t('platformAdmin.organization.updated')}
              value={formatDate(organization.updated_at)}
            />
            <DetailField 
              label={t('platformAdmin.organization.type')}
              value={safeString(organization.org_type)}
            />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
                {t('platformAdmin.organization.status')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                {organization.status === 'active' && (
                  <>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-success)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>Active</span>
                  </>
                )}
                {organization.status !== 'active' && (
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>{organization.status}</span>
                )}
              </div>
            </div>
            {organization.slug && (
              <DetailField
                label={t('platformAdmin.organization.slug')}
                value={
                  <code style={{ 
                    fontSize: '12px', 
                    background: 'var(--pa-n50)', 
                    padding: 'var(--pa-space-1) var(--pa-space-2)', 
                    borderRadius: 'var(--pa-radius-xs)',
                    fontWeight: 500,
                    color: 'var(--pa-n700)',
                    fontFamily: 'var(--pa-font-mono)',
                  }}>
                    {organization.slug}
                  </code>
                }
              />
            )}
          </div>
        </div>

        {/* Quick Links */}
        {permissions.canViewPhotoOverview && (
          <div style={{
            gridColumn: 'span 4',
            background: 'var(--pa-n0)',
            borderRadius: 'var(--pa-radius-m)',
            boxShadow: 'var(--pa-shadow-1)',
            padding: 'var(--pa-space-6)',
          }}>
            <SectionHeader>{t('platformAdmin.organization.quickLinks')}</SectionHeader>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--pa-space-3)',
              marginTop: 'var(--pa-space-5)',
              flexWrap: 'wrap',
            }}>
              <QuickLinkButton
                icon="photo_library"
                label={t('platformAdmin.organization.photos')}
                to={getLink('platformAdmin.photos.orgGalleries', { id: organization.id })}
              />
            </div>
          </div>
        )}

        {/* Contact & Location */}
        <div style={{ gridColumn: 'span 4' }}>
          <ContactLocationCard organization={organization} />
        </div>

        {/* License & Billing - Featured Card */}
        <div style={{ 
          gridColumn: 'span 12',
          background: 'var(--pa-n0)',
          borderRadius: 'var(--pa-radius-m)',
          boxShadow: 'var(--pa-shadow-1)',
          padding: 'var(--pa-space-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--pa-space-6)' }}>
            <SectionHeader>{t('platformAdmin.organization.licenseAndBilling')}</SectionHeader>
            {organization.tier_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-theme-action-primary)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>{organization.tier_name}</span>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 'var(--pa-space-5)',
            marginBottom: 'var(--pa-space-6)',
          }}>
            <MetricCard
              label={t('platformAdmin.organization.licenseStatus')}
              value={
                organization.license_status ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                    {organization.license_status === 'active' && (
                      <>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-success)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>Active</span>
                      </>
                    )}
                    {organization.license_status !== 'active' && (
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>{organization.license_status}</span>
                    )}
                  </div>
                ) : '—'
              }
            />
            <MetricCard
              label={t('platformAdmin.organization.tier')}
              value={safeString(organization.tier_name || '—')}
              highlight
            />
          </div>

          {/* Details Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 'var(--pa-space-5)',
            marginBottom: 'var(--pa-space-6)',
            paddingBottom: 'var(--pa-space-6)',
            borderBottom: '1px solid var(--pa-n100)',
          }}>
            <DetailField 
              label={t('platformAdmin.organization.trialEnds')}
              value={formatDate(organization.license_trial_ends_at)}
            />
            <DetailField 
              label={t('platformAdmin.organization.periodStart')}
              value={formatDate(organization.license_current_period_start)}
            />
            <DetailField 
              label={t('platformAdmin.organization.periodEnd')}
              value={formatDate(organization.license_current_period_end)}
            />
            {organization.license_grace_ends_at && (
              <DetailField 
                label={t('platformAdmin.organization.graceEnds')}
                value={formatDate(organization.license_grace_ends_at)}
              />
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
                {t('platformAdmin.organization.stripe')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', flexWrap: 'wrap' }}>
                {organization.stripe_connected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-success)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>
                      {t('platformAdmin.organization.connected')}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>
                    {t('platformAdmin.organization.notConnected')}
                  </span>
                )}
                {stripeDashboardUrl && permissions.canViewStripeDetails && (
                  <a
                    href={stripeDashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--pa-theme-action-primary)',
                      textDecoration: 'none',
                      transition: 'text-decoration 150ms ease',
                      fontFamily: 'var(--pa-font-body)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    Stripe
                  </a>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
                {t('platformAdmin.organization.payouts')}
              </div>
              {safeBoolean(organization.payouts_enabled) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pa-success)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>
                    {t('platformAdmin.organization.enabled')}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-body)' }}>
                  {t('platformAdmin.organization.disabled')}
                </span>
              )}
            </div>
            {organization.payout_onboarding_status && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
                  {t('platformAdmin.organization.payoutStatus')}
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: organization.payout_onboarding_status === 'completed' 
                    ? 'var(--pa-success)' 
                    : organization.payout_onboarding_status === 'restricted'
                    ? 'var(--pa-danger)'
                    : 'var(--pa-warning)',
                  fontFamily: 'var(--pa-font-body)',
                }}>
                  {organization.payout_onboarding_status}
                </span>
              </div>
            )}
            {safeBoolean(organization.license_cancel_at_period_end) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
                  {t('platformAdmin.organization.cancellation')}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-warning)', fontFamily: 'var(--pa-font-body)' }}>
                  {t('platformAdmin.organization.cancelsAtPeriodEnd')}
                </span>
              </div>
            )}
          </div>

          {/* Change Tier Section */}
          <div style={{ 
            marginTop: 'var(--pa-space-6)', 
            padding: 'var(--pa-space-5)',
            background: 'var(--pa-n50)',
            borderRadius: 'var(--pa-radius-s)',
            border: '1px solid var(--pa-n100)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginBottom: 'var(--pa-space-4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-theme-action-primary)' }}>
                swap_horiz
              </span>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--pa-n600)', fontFamily: 'var(--pa-font-body)' }}>
                {t('platformAdmin.organization.changeTier')}
              </h3>
            </div>
            {organization.stripe_subscription_id ? (
              <>
                <div style={{ display: 'flex', gap: 'var(--pa-space-3)', alignItems: 'flex-start', flexWrap: 'wrap', maxWidth: '600px' }}>
                  <select
                    value={selectedTierId}
                    onChange={(e) => { setSelectedTierId(e.target.value); setTierChangeError(null) }}
                    style={{
                      height: '40px',
                      padding: '0 var(--pa-space-3)',
                      borderRadius: 'var(--pa-radius-s)',
                      border: '1px solid var(--pa-n200)',
                      background: 'var(--pa-n0)',
                      color: 'var(--pa-n900)',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: '240px',
                      cursor: 'pointer',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      fontFamily: 'var(--pa-font-body)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--pa-theme-action-primary)'
                      e.target.style.boxShadow = '0 0 0 2px var(--pa-theme-surface-accent)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--pa-n200)'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <option value="">{t('platformAdmin.organization.selectTier')}</option>
                    {(activeTiers ?? []).map(tier => (
                      <option
                        key={tier.id}
                        value={tier.id}
                        disabled={tier.id === organization.current_tier_id}
                      >
                        {tier.tier_name}{tier.id === organization.current_tier_id ? ` (${t('platformAdmin.organization.current')})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleTierChange}
                    disabled={!selectedTierId || tierChanging || selectedTierId === organization.current_tier_id}
                    style={{
                      padding: 'var(--pa-space-3) var(--pa-space-5)',
                      background: 'var(--pa-theme-action-primary)',
                      color: 'var(--pa-theme-text-on-action)',
                      border: 'none',
                      borderRadius: 'var(--pa-radius-s)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: (!selectedTierId || tierChanging || selectedTierId === organization.current_tier_id) ? 'not-allowed' : 'pointer',
                      opacity: (!selectedTierId || tierChanging || selectedTierId === organization.current_tier_id) ? 0.6 : 1,
                      transition: 'background-color 150ms ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--pa-space-2)',
                      fontFamily: 'var(--pa-font-body)',
                    }}
                    onMouseEnter={(e) => {
                      if (!(!selectedTierId || tierChanging || selectedTierId === organization.current_tier_id)) {
                        e.currentTarget.style.background = 'var(--pa-theme-action-hover)'
                      }
                    }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-theme-action-primary)'}
                  >
                    {!tierChanging && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>}
                    {tierChanging ? t('platformAdmin.organization.changing') : t('platformAdmin.organization.apply')}
                  </button>
                </div>
                {tierChangeError && (
                  <div style={{ 
                    marginTop: 'var(--pa-space-4)', 
                    padding: 'var(--pa-space-3)',
                    background: 'var(--pa-danger-bg)',
                    borderRadius: 'var(--pa-radius-xs)',
                    border: '1px solid var(--pa-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--pa-space-2)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--pa-danger)' }}>error</span>
                    <p style={{ color: 'var(--pa-danger)', fontSize: '13px', margin: 0, fontWeight: 500, fontFamily: 'var(--pa-font-body)' }}>
                      {tierChangeError}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ 
                padding: 'var(--pa-space-3)', 
                background: 'var(--pa-warning-bg)',
                borderRadius: 'var(--pa-radius-xs)',
                border: '1px solid var(--pa-warning)',
              }}>
                <p style={{ margin: 0, color: 'var(--pa-warning)', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--pa-font-body)' }}>
                  {t('platformAdmin.organization.noStripeSubscription')}
                </p>
              </div>
            )}
          </div>

          {/* Stripe Details Accordion */}
          {organization.stripe_connected && (
            <div style={{ 
              marginTop: 'var(--pa-space-6)', 
              paddingTop: 'var(--pa-space-6)', 
              borderTop: '1px solid var(--pa-n100)',
            }}>
              <button
                onClick={() => setShowStripeDetails(!showStripeDetails)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--pa-space-2)',
                  padding: 'var(--pa-space-2) 0',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--pa-theme-action-primary)',
                  cursor: 'pointer',
                  transition: 'color 150ms ease',
                  fontFamily: 'var(--pa-font-body)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--pa-theme-action-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--pa-theme-action-primary)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {showStripeDetails ? 'expand_less' : 'expand_more'}
                </span>
                {showStripeDetails ? t('platformAdmin.organization.hideStripeDetails') : t('platformAdmin.organization.showStripeDetails')}
              </button>

              {showStripeDetails && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: 'var(--pa-space-5)',
                  padding: 'var(--pa-space-4)',
                  background: 'var(--pa-n50)',
                  borderRadius: 'var(--pa-radius-s)',
                  border: '1px solid var(--pa-n100)',
                  marginTop: 'var(--pa-space-3)',
                }}>
                  {organization.stripe_customer_id && (
                    <DetailField
                      label={t('platformAdmin.organization.customerId')}
                      value={
                        <MaskedStripeId
                          stripeId={organization.stripe_customer_id}
                          role={adminRole}
                          showCopy
                        />
                      }
                    />
                  )}
                  {organization.stripe_subscription_id && (
                    <DetailField
                      label={t('platformAdmin.organization.subscriptionId')}
                      value={
                        <MaskedStripeId
                          stripeId={organization.stripe_subscription_id}
                          role={adminRole}
                          showCopy
                        />
                      }
                    />
                  )}
                  {organization.stripe_price_id && (
                    <DetailField
                      label={t('platformAdmin.organization.priceId')}
                      value={
                        <MaskedStripeId
                          stripeId={organization.stripe_price_id}
                          role={adminRole}
                          showCopy
                        />
                      }
                    />
                  )}
                  {organization.payout_account_id && (
                    <DetailField
                      label={t('platformAdmin.organization.payoutAccountId')}
                      value={
                        <code style={{ fontSize: '12px', wordBreak: 'break-all', color: 'var(--pa-n700)', fontFamily: 'var(--pa-font-mono)' }}>
                          {organization.payout_account_id}
                        </code>
                      }
                    />
                  )}
                  {organization.payout_descriptor && (
                    <DetailField
                      label={t('platformAdmin.organization.payoutDescriptor')}
                      value={organization.payout_descriptor}
                    />
                  )}
                  {organization.billing_mode && (
                    <DetailField
                      label={t('platformAdmin.organization.billingMode')}
                      value={organization.billing_mode}
                    />
                  )}
                  {organization.currency && (
                    <DetailField
                      label={t('platformAdmin.organization.currency')}
                      value={organization.currency.toUpperCase()}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={{ gridColumn: 'span 12' }}>
          <RecentActivityCard organizationId={organization.id} onViewAll={onViewActivity} />
        </div>
      </div>
    </div>
  )
}

// Modern Stat Box Component
function StatBox({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={{
      padding: 'var(--pa-space-6)',
      background: 'var(--pa-n0)',
      borderRadius: 'var(--pa-radius-m)',
      boxShadow: 'var(--pa-shadow-1)',
      transition: 'transform 150ms ease, box-shadow 150ms ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = 'var(--pa-shadow-2)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'var(--pa-shadow-1)'
    }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n500)' }}>
          {icon}
        </span>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--pa-n500)',
          fontFamily: 'var(--pa-font-body)',
        }}>
          {label}
        </span>
      </div>
      <span style={{
        fontFamily: 'var(--pa-font-display)',
        fontWeight: 700,
        fontSize: '32px',
        lineHeight: 1,
        color: 'var(--pa-n900)',
        display: 'block',
      }}>
        {value}
      </span>
    </div>
  )
}

// Section Header Component
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: '14px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--pa-n600)',
      fontFamily: 'var(--pa-font-body)',
    }}>
      <span style={{
        width: '32px',
        height: '2px',
        background: 'var(--pa-theme-action-primary)',
        marginRight: 'var(--pa-space-3)',
        display: 'block',
      }} />
      {children}
    </h3>
  )
}

// Detail Field Component
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
        {value}
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ 
      padding: 'var(--pa-space-4)', 
      background: highlight ? 'var(--pa-theme-surface-accent)' : 'transparent',
      borderRadius: 'var(--pa-radius-s)',
      border: highlight ? '1px solid var(--pa-theme-border-accent)' : 'none',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--pa-font-body)' }}>
        {label}
      </div>
      <div style={{ fontSize: highlight ? '18px' : '16px', fontWeight: highlight ? 700 : 600, color: highlight ? 'var(--pa-theme-action-primary)' : 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
        {value}
      </div>
    </div>
  )
}

// Quick Link Button Component
function QuickLinkButton({ icon, label, to }: { icon: string; label: string; to: string }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--pa-space-2)',
        padding: 'var(--pa-space-3)',
        background: 'var(--pa-n50)',
        borderRadius: 'var(--pa-radius-s)',
        textDecoration: 'none',
        transition: 'background-color 150ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n100)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-n500)' }}>
        {icon}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
        {label}
      </span>
    </Link>
  )
}
