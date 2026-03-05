/**
 * Add-Ons List Page
 * 
 * Displays all available add-ons for purchase by org admins.
 * Shows entitlement status (included, active, pending, not purchased).
 */

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getAddOnsWithStatus } from '../../data/services/addOnsService'
import { getLink, RouteKeys } from '../../utils/routes'
import { Card, Button, Badge, AdminPageHeader, OfflineBanner, ErrorState } from '../../components/admin'
import { useI18n } from '../../i18n/useI18n'
import '../../styles/orgAdmin.css'

export default function AddOns() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentOrganization } = useOrganization()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  const orgId = currentOrganization?.id

  // Detect offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Refresh data when navigating back from detail page
  useEffect(() => {
    if (location.state?.refresh) {
      queryClient.invalidateQueries({ queryKey: ['org-add-ons', orgId] })
      queryClient.invalidateQueries({ queryKey: ['org-add-on-entitlements', orgId] })
    }
  }, [location.state, orgId, queryClient])

  const { data: addOnsData, isLoading, error } = useQuery({
    queryKey: ['org-add-ons', orgId],
    queryFn: async () => {
      if (!orgId) {
        throw new Error('No organization selected')
      }
      const result = await getAddOnsWithStatus(orgId)
      if (result.error) {
        throw result.error
      }
      return result.data || []
    },
    enabled: !!orgId,
  })

  if (!orgId) {
    return (
      <div>
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--pa-n600)' }}>
              {t('admin.addOns.noOrg')}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <AdminPageHeader
          title={t('admin.addOns.title')}
          subtitle={t('admin.addOns.description')}
        />
        <ErrorState
          title={t('admin.addOns.loadError')}
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['org-add-ons', orgId] })}
        />
      </div>
    )
  }

  return (
    <div>
      {isOffline && <OfflineBanner />}
      <AdminPageHeader
        title={t('admin.addOns.title')}
        subtitle={t('admin.addOns.description')}
      />

      {isLoading ? (
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="pa-skeleton" style={{ height: '24px', width: '200px', margin: '0 auto' }} />
          </div>
        </Card>
      ) : addOnsData && addOnsData.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--pa-space-4)' }}>
          {addOnsData.map((addOn) => (
            <Card key={addOn.feature_key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--pa-space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginBottom: 'var(--pa-space-2)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                      {addOn.external_name}
                    </h3>
                    {addOn.external_short_label && (
                      <Badge>{addOn.external_short_label}</Badge>
                    )}
                    {addOn.entitlement_status === 'included' && (
                      <Badge style={{ background: 'var(--pa-success)', color: 'white' }}>
                        {t('admin.addOns.included')}
                      </Badge>
                    )}
                    {addOn.entitlement_status === 'active' && (
                      <Badge style={{ background: 'var(--pa-success)', color: 'white' }}>
                        {t('admin.addOns.active')}
                      </Badge>
                    )}
                    {addOn.entitlement_status === 'pending_payment' && (
                      <Badge style={{ background: 'var(--pa-warning)', color: 'white' }}>
                        {t('admin.addOns.pendingPayment')}
                      </Badge>
                    )}
                  </div>
                  {addOn.external_description && (
                    <p style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-2)' }}>
                      {addOn.external_description}
                    </p>
                  )}
                  {addOn.external_bullets && addOn.external_bullets.length > 0 && (
                    <ul style={{ margin: 'var(--pa-space-2) 0', paddingLeft: 'var(--pa-space-5)', color: 'var(--pa-n600)' }}>
                      {addOn.external_bullets.map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  {addOn.entitlement_status === 'not_purchased' && (
                    <Button
                      variant="primary"
                      onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDON_DETAIL, { featureKey: addOn.feature_key }))}
                    >
                      {addOn.external_cta_label}
                    </Button>
                  )}
                  {addOn.entitlement_status === 'pending_payment' && (
                    <Button
                      variant="primary"
                      onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDON_DETAIL, { featureKey: addOn.feature_key }))}
                    >
                      {t('admin.addOns.completePayment')}
                    </Button>
                  )}
                  {(addOn.entitlement_status === 'active' || addOn.entitlement_status === 'included') && (
                    <Button
                      variant="secondary"
                      onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDON_DETAIL, { featureKey: addOn.feature_key }))}
                    >
                      {t('admin.addOns.manage')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--pa-n600)' }}>
              {t('admin.addOns.noAddOns')}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

