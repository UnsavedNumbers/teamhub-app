/**
 * Add-On Detail Page
 * 
 * Shows detailed information about a specific add-on and allows purchase/management.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getAddOnByFeatureKey, getOrgAddOnEntitlements, addOrgAddOn, removeOrgAddOn, previewOrgAddOnInvoice } from '../../data/services/addOnsService'
import { getLink, RouteKeys } from '../../utils/routes'
import { Card, Button, Badge, AdminPageHeader, ConfirmDialog, ErrorState } from '../../components/admin'
import { showSuccess, showError } from '../../utils/toast'
import { useI18n } from '../../i18n/useI18n'
import { isDemoMode, getDemoModeError } from '../../utils/demoMode'
import { supabase } from '../../lib/supabase'

export default function AddOnDetail() {
  const navigate = useNavigate()
  const { featureKey } = useParams<{ featureKey: string }>()
  const { currentOrganization } = useOrganization()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const orgId = currentOrganization?.id
  const [purchasing, setPurchasing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState<{ amount: number; currency: string; nextInvoiceDate: string | null } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

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

  const { data: addOn, isLoading: loadingAddOn, error: addOnError } = useQuery({
    queryKey: ['add-on', featureKey],
    queryFn: async () => {
      if (!featureKey) {
        throw new Error('Feature key required')
      }
      const result = await getAddOnByFeatureKey(featureKey)
      if (result.error) {
        throw result.error
      }
      return result.data
    },
    enabled: !!featureKey,
  })

  const { data: entitlements } = useQuery({
    queryKey: ['org-add-on-entitlements', orgId],
    queryFn: async () => {
      if (!orgId) {
        return null
      }
      const result = await getOrgAddOnEntitlements(orgId)
      if (result.error) {
        return null
      }
      return result.data || []
    },
    enabled: !!orgId,
  })

  const entitlement = entitlements?.find((e) => e.feature_key === featureKey)

  // Check if feature is included in current tier
  const { data: isIncludedData } = useQuery({
    queryKey: ['add-on-included-check', orgId, featureKey],
    queryFn: async () => {
      if (!orgId || !featureKey) return false
      
      const { data: org } = await supabase
        .from('organizations')
        .select('current_tier_id')
        .eq('id', orgId)
        .maybeSingle()
      
      if (!org?.current_tier_id) return false
      
      const { data: feature } = await supabase
        .from('feature_entitlements')
        .select('id')
        .eq('feature_key', featureKey)
        .maybeSingle()
      
      if (!feature) return false
      
      const { data: assignment } = await supabase
        .from('tier_feature_assignments')
        .select('included')
        .eq('license_tier_id', org.current_tier_id)
        .eq('feature_entitlement_id', feature.id)
        .eq('included', true)
        .maybeSingle()
      
      return !!assignment
    },
    enabled: !!orgId && !!featureKey,
  })

  const isIncluded = isIncludedData ?? false
  const isActive = entitlement?.status === 'active'
  const isPending = entitlement?.status === 'pending_payment'

  const handlePreviewInvoice = async () => {
    if (!orgId || !featureKey || isDemoMode() || isOffline) {
      if (isDemoMode()) {
        showError(getDemoModeError('preview invoice'))
      } else if (isOffline) {
        showError(t('admin.addOns.offlineError'))
      } else {
        showError(t('admin.addOns.missingParams'))
      }
      return
    }

    setLoadingPreview(true)
    try {
      const result = await previewOrgAddOnInvoice({ org_id: orgId, feature_key: featureKey })
      if (result.success && result.estimated_proration_amount !== undefined) {
        setPreviewData({
          amount: result.estimated_proration_amount,
          currency: result.currency || 'USD',
          nextInvoiceDate: result.next_invoice_date ? new Date(result.next_invoice_date * 1000).toLocaleDateString() : null,
        })
        setShowPreviewModal(true)
      } else {
        showError(result.error || t('admin.addOns.previewFailed'))
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.addOns.previewError'))
    } finally {
      setLoadingPreview(false)
    }
  }

  const handlePurchase = async () => {
    if (!orgId || !featureKey) {
      showError(t('admin.addOns.missingParams'))
      return
    }

    if (isDemoMode()) {
      showError(getDemoModeError('purchase add-on'))
      return
    }

    if (isOffline) {
      showError(t('admin.addOns.offlineError'))
      return
    }

    setPurchasing(true)
    try {
      const result = await addOrgAddOn({ org_id: orgId, feature_key: featureKey })
      if (result.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['org-add-ons', orgId] })
        queryClient.invalidateQueries({ queryKey: ['org-add-on-entitlements', orgId] })
        queryClient.invalidateQueries({ queryKey: ['add-on-included-check', orgId, featureKey] })
        
        if (result.payment_action_required) {
          // Redirect to payment (payment_link or hosted invoice)
          if (result.payment_link) {
            window.location.href = result.payment_link
          } else if (result.client_secret) {
            // SCA required - redirect to Stripe hosted invoice or show message
            showError(t('admin.addOns.scaRequired'))
          } else {
            showError(t('admin.addOns.paymentActionRequired'))
          }
        } else {
          showSuccess(t('admin.addOns.purchaseSuccess'))
          navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDONS), { state: { refresh: true } })
        }
      } else {
        showError(result.error || t('admin.addOns.purchaseFailed'))
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.addOns.purchaseError'))
    } finally {
      setPurchasing(false)
    }
  }

  const handleRemoveClick = () => {
    if (isDemoMode()) {
      showError(getDemoModeError('remove add-on'))
      return
    }
    if (isOffline) {
      showError(t('admin.addOns.offlineError'))
      return
    }
    setShowRemoveConfirm(true)
  }

  const handleRemove = async () => {
    if (!orgId || !featureKey) {
      showError(t('admin.addOns.missingParams'))
      return
    }

    setShowRemoveConfirm(false)
    setRemoving(true)
    try {
      const result = await removeOrgAddOn({ org_id: orgId, feature_key: featureKey })
      if (result.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['org-add-ons', orgId] })
        queryClient.invalidateQueries({ queryKey: ['org-add-on-entitlements', orgId] })
        queryClient.invalidateQueries({ queryKey: ['add-on-included-check', orgId, featureKey] })
        
        showSuccess(t('admin.addOns.removeSuccess'))
        navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDONS), { state: { refresh: true } })
      } else {
        showError(result.error || t('admin.addOns.removeFailed'))
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.addOns.removeError'))
    } finally {
      setRemoving(false)
    }
  }

  if (!featureKey) {
    return (
      <div>
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--pa-error)' }}>
              {t('admin.addOns.invalid')}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (addOnError || (!loadingAddOn && !addOn)) {
    return (
      <div>
        <AdminPageHeader
          title={t('admin.addOns.notFound')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginTop: 'var(--pa-space-2)' }}>
            <Button variant="ghost" onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDONS))} size="compact">
              ← {t('common.back')} to Add-Ons
            </Button>
          </div>
        </AdminPageHeader>
        <ErrorState
          title={t('admin.addOns.notFound')}
          message={addOnError instanceof Error ? addOnError.message : 'The requested add-on could not be found'}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['add-on', featureKey] })
          }}
        />
      </div>
    )
  }

  if (loadingAddOn || !addOn) {
    return (
      <Card>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="pa-skeleton" style={{ height: '24px', width: '200px', margin: '0 auto' }} />
        </div>
      </Card>
    )
  }

  return (
    <div>
      <AdminPageHeader
        title={addOn.external_name}
        subtitle={addOn.external_short_label || undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginTop: 'var(--pa-space-2)' }}>
          <Button variant="ghost" onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_ADDONS))} size="compact">
            ← {t('common.back')} to Add-Ons
          </Button>
          {addOn.external_short_label && (
            <Badge>{addOn.external_short_label}</Badge>
          )}
        </div>
      </AdminPageHeader>

      <Card>
        {addOn.external_description && (
          <div style={{ marginBottom: 'var(--pa-space-4)' }}>
            <p style={{ fontSize: '16px', color: 'var(--pa-n700)', lineHeight: 1.6 }}>
              {addOn.external_description}
            </p>
          </div>
        )}

        {addOn.external_bullets && addOn.external_bullets.length > 0 && (
          <div style={{ marginBottom: 'var(--pa-space-4)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--pa-space-2)' }}>
              {t('admin.addOns.features')}
            </h3>
            <ul style={{ paddingLeft: 'var(--pa-space-5)', color: 'var(--pa-n600)' }}>
              {addOn.external_bullets.map((bullet, idx) => (
                <li key={idx} style={{ marginBottom: 'var(--pa-space-1)' }}>{bullet}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: 'var(--pa-space-5)', paddingTop: 'var(--pa-space-4)', borderTop: '1px solid var(--pa-n200)' }}>
          {isIncluded ? (
            <div>
              <Badge style={{ background: 'var(--pa-success)', color: 'white', marginBottom: 'var(--pa-space-3)' }}>
                {t('admin.addOns.includedInPlan')}
              </Badge>
              <p style={{ color: 'var(--pa-n600)' }}>
                {t('admin.addOns.includedMessage')}
              </p>
            </div>
          ) : isActive ? (
            <div>
              <Badge style={{ background: 'var(--pa-success)', color: 'white', marginBottom: 'var(--pa-space-3)' }}>
                {t('admin.addOns.active')}
              </Badge>
              {entitlement?.current_period_end && (
                <p style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-3)' }}>
                  {t('admin.addOns.renewsOn', {
                    date: new Date(entitlement.current_period_end).toLocaleDateString(),
                  })}
                </p>
              )}
              <Button variant="danger" onClick={handleRemoveClick} disabled={removing || isDemoMode() || isOffline}>
                {removing ? t('common.removing') : t('admin.addOns.remove')}
              </Button>
            </div>
          ) : isPending ? (
            <div>
              <Badge style={{ background: 'var(--pa-warning)', color: 'white', marginBottom: 'var(--pa-space-3)' }}>
                {t('admin.addOns.pendingPayment')}
              </Badge>
              <p style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-3)' }}>
                {t('admin.addOns.completePaymentMessage')}
              </p>
              <Button variant="primary" onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? t('common.processing') : t('admin.addOns.completePayment')}
              </Button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 'var(--pa-space-2)', marginBottom: 'var(--pa-space-3)', flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={handlePurchase} disabled={purchasing || isDemoMode() || isOffline}>
                  {purchasing ? t('common.processing') : addOn.external_cta_label}
                </Button>
                <Button variant="secondary" onClick={handlePreviewInvoice} disabled={loadingPreview || isDemoMode() || isOffline}>
                  {loadingPreview ? t('common.loading') : t('admin.addOns.previewInvoice')}
                </Button>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--pa-n600)' }}>
                {t('admin.addOns.purchaseNote')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={showRemoveConfirm}
        title={t('admin.addOns.confirmRemoveTitle')}
        description={t('admin.addOns.confirmRemove')}
        confirmLabel={t('admin.addOns.remove')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setShowRemoveConfirm(false)}
      />

      {/* Preview Invoice Modal */}
      {showPreviewModal && previewData && (
        <ConfirmDialog
          open={showPreviewModal}
          title={t('admin.addOns.previewInvoiceTitle')}
          description={t('admin.addOns.previewInvoiceDescription')}
          confirmLabel={t('common.close')}
          cancelLabel={t('common.cancel')}
          variant="primary"
          onConfirm={() => setShowPreviewModal(false)}
          onCancel={() => setShowPreviewModal(false)}
        >
          <div style={{ marginTop: 'var(--pa-space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--pa-space-2)' }}>
              <span style={{ fontWeight: 600 }}>{t('admin.addOns.proratedAmount')}:</span>
              <span style={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: previewData.currency }).format(previewData.amount / 100)}
              </span>
            </div>
            {previewData.nextInvoiceDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--pa-space-2)' }}>
                <span>{t('admin.addOns.nextInvoiceDate')}:</span>
                <span>{previewData.nextInvoiceDate}</span>
              </div>
            )}
            <p style={{ fontSize: '14px', color: 'var(--pa-n600)', marginTop: 'var(--pa-space-3)' }}>
              {t('admin.addOns.previewNote')}
            </p>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}

