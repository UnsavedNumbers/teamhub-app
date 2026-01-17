import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Button, Input, Select, Badge, Checkbox, ConfirmDialog } from '../../components/platformAdmin'
import type { LicenseTier, FeatureEntitlement, TierFeatureAssignment, StripePriceVerification } from '../../types/licenseTiers.types'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { logAuditEvent, isStripeVerificationValid, getArchivedFeaturesCount } from '../../utils/licenseEntitlementsHelpers'

const FEATURE_CATEGORIES_OPTIONS = FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat }))
const FEATURE_TYPES_OPTIONS = FEATURE_TYPES.map(type => ({ value: type, label: type }))

export default function LicenseTierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [tier, setTier] = useState<Partial<LicenseTier & { version?: number }>>({
    tier_key: 'basic',
    tier_name: '',
    description: '',
    stripe_price_id: '',
    status: 'active',
    version: 1,
  })
  const [features, setFeatures] = useState<FeatureEntitlement[]>([])
  const [assignments, setAssignments] = useState<Record<string, TierFeatureAssignment>>({})
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeVerification, setStripeVerification] = useState<StripePriceVerification | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [conflictDialog, setConflictDialog] = useState(false)
  const [archivedFeaturesCount, setArchivedFeaturesCount] = useState(0)

  const fetchTier = useCallback(async () => {
    if (isNew) return

    setLoading(true)
    try {
      const { data, error: tierError } = await supabase
        .from('license_tiers')
        .select('*')
        .eq('id', id!)
        .single()

      if (tierError) throw tierError
      setTier(data)

      // Check for archived features
      if (data.id) {
        const count = await getArchivedFeaturesCount(data.id)
        setArchivedFeaturesCount(count)
      }

      // Use cached Stripe verification if valid, otherwise verify
      if (data.stripe_price_id) {
        if (data.stripe_verified_at && isStripeVerificationValid(data.stripe_verified_at)) {
          // Use cached data
          setStripeVerification({
            valid: true,
            product_name: data.stripe_product_name || undefined,
            amount_cents: data.stripe_amount_cents || undefined,
            interval: data.stripe_interval || undefined,
            currency: data.stripe_currency || undefined,
            active: data.stripe_active || undefined,
          })
        } else {
          // Verify fresh
          verifyStripePrice(data.stripe_price_id, true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tier')
    } finally {
      setLoading(false)
    }
  }, [id, isNew])

  const fetchFeatures = useCallback(async () => {
    try {
      const { data, error: featuresError } = await supabase
        .from('feature_entitlements')
        .select('*')
        .is('archived_at', null)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true })

      if (featuresError) throw featuresError
      setFeatures(data || [])
    } catch (err: any) {
      console.error('Error fetching features:', err)
    }
  }, [])

  const fetchAssignments = useCallback(async () => {
    if (isNew) return

    try {
      const { data, error: assignmentsError } = await supabase
        .from('tier_feature_assignments')
        .select('*')
        .eq('license_tier_id', id!)

      if (assignmentsError) throw assignmentsError

      const assignmentsMap: Record<string, TierFeatureAssignment> = {}
      ;(data || []).forEach((assignment) => {
        assignmentsMap[assignment.feature_entitlement_id] = assignment
      })
      setAssignments(assignmentsMap)
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
    }
  }, [id, isNew])

  useEffect(() => {
    fetchTier()
    fetchFeatures()
    fetchAssignments()
  }, [fetchTier, fetchFeatures, fetchAssignments])

  const verifyStripePrice = async (priceId: string, forceRefresh = false) => {
    if (!priceId || !priceId.startsWith('price_')) {
      setStripeVerification({ valid: false, error: 'Invalid Price ID format' })
      return
    }

    // Check cache first unless forcing refresh
    if (!forceRefresh && tier.stripe_verified_at && isStripeVerificationValid(tier.stripe_verified_at)) {
      setStripeVerification({
        valid: true,
        product_name: tier.stripe_product_name || undefined,
        amount_cents: tier.stripe_amount_cents || undefined,
        interval: tier.stripe_interval || undefined,
        currency: tier.stripe_currency || undefined,
        active: tier.stripe_active || undefined,
      })
      return
    }

    setVerifying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-verify-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ price_id: priceId }),
      })

      const result: StripePriceVerification = await response.json()
      setStripeVerification(result)

      // Update tier with verification data if valid
      if (result.valid && result.product_name) {
        setTier((prev) => ({
          ...prev,
          stripe_product_name: result.product_name || null,
          stripe_amount_cents: result.amount_cents || null,
          stripe_interval: result.interval || null,
          stripe_currency: result.currency || null,
          stripe_active: result.active || null,
          stripe_verified_at: new Date().toISOString(),
        }))
      }
    } catch (err: any) {
      setStripeVerification({ valid: false, error: err.message || 'Verification failed' })
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async (reason?: string) => {
    if (!tier.tier_name || !tier.stripe_price_id) {
      setError('Tier name and Stripe Price ID are required')
      return
    }

    // Validate limit values
    for (const assignment of Object.values(assignments)) {
      if (assignment.limit_value !== null && assignment.limit_value <= 0) {
        setError('Limit values must be positive integers')
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const beforeState = isNew ? null : { ...tier }

      if (isNew) {
        const { data, error: createError } = await supabase
          .from('license_tiers')
          .insert({
            tier_key: tier.tier_key,
            tier_name: tier.tier_name,
            description: tier.description || null,
            stripe_price_id: tier.stripe_price_id,
            stripe_product_name: tier.stripe_product_name || null,
            stripe_amount_cents: tier.stripe_amount_cents || null,
            stripe_interval: tier.stripe_interval || null,
            stripe_currency: tier.stripe_currency || null,
            stripe_active: tier.stripe_active || null,
            stripe_verified_at: tier.stripe_verified_at || null,
            status: tier.status || 'active',
          })
          .select()
          .single()

        if (createError) throw createError

        // Save feature assignments
        if (data) {
          await saveAssignments(data.id)
          
          // Log audit event
          await logAuditEvent({
            action: 'tier_created',
            targetType: 'tier',
            targetId: data.id,
            afterState: data,
            reason: reason || 'Tier created',
          })
          
          navigate(`/platform-admin/licenses/tiers/${data.id}`)
        }
      } else {
        // Optimistic locking: check version
        const expectedVersion = tier.version || 1
        
        const { data: currentTier, error: fetchError } = await supabase
          .from('license_tiers')
          .select('version')
          .eq('id', id!)
          .single()

        if (fetchError) throw fetchError

        if (currentTier.version !== expectedVersion) {
          setConflictDialog(true)
          setSaving(false)
          return
        }

        const { data: updatedTier, error: updateError } = await supabase
          .from('license_tiers')
          .update({
            tier_name: tier.tier_name,
            description: tier.description || null,
            stripe_price_id: tier.stripe_price_id,
            stripe_product_name: tier.stripe_product_name || null,
            stripe_amount_cents: tier.stripe_amount_cents || null,
            stripe_interval: tier.stripe_interval || null,
            stripe_currency: tier.stripe_currency || null,
            stripe_active: tier.stripe_active || null,
            stripe_verified_at: tier.stripe_verified_at || null,
            status: tier.status,
          })
          .eq('id', id!)
          .eq('version', expectedVersion) // Ensure version hasn't changed
          .select()
          .single()

        if (updateError) {
          // Check if it's a version conflict
          if (updateError.code === 'PGRST116' || updateError.message?.includes('0 rows')) {
            setConflictDialog(true)
            setSaving(false)
            return
          }
          throw updateError
        }

        await saveAssignments(id!)

        // Log audit event
        await logAuditEvent({
          action: 'tier_updated',
          targetType: 'tier',
          targetId: id!,
          beforeState,
          afterState: updatedTier,
          reason: reason || 'Tier updated',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save tier')
    } finally {
      setSaving(false)
    }
  }

  const handleReloadAfterConflict = async () => {
    setConflictDialog(false)
    await fetchTier()
    await fetchAssignments()
  }

  const saveAssignments = async (tierId: string) => {
    const assignmentEntries = Object.entries(assignments).filter(([_, assignment]) => assignment.included)

    for (const [featureId, assignment] of assignmentEntries) {
      const { error } = await supabase
        .from('tier_feature_assignments')
        .upsert({
          license_tier_id: tierId,
          feature_entitlement_id: featureId,
          included: assignment.included,
          limit_value: assignment.limit_value || null,
          role_admin: assignment.role_admin ?? true,
          role_coach: assignment.role_coach ?? true,
          role_parent: assignment.role_parent ?? false,
        }, {
          onConflict: 'license_tier_id,feature_entitlement_id',
        })

      if (error) {
        console.error('Error saving assignment:', error)
      }
    }
  }

  const toggleFeature = (featureId: string, included: boolean) => {
    setAssignments((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        id: prev[featureId]?.id || '',
        license_tier_id: prev[featureId]?.license_tier_id || id || '',
        feature_entitlement_id: featureId,
        included,
        limit_value: prev[featureId]?.limit_value || null,
        role_admin: prev[featureId]?.role_admin ?? true,
        role_coach: prev[featureId]?.role_coach ?? true,
        role_parent: prev[featureId]?.role_parent ?? false,
        created_at: prev[featureId]?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }))
  }

  const updateAssignment = (featureId: string, updates: Partial<TierFeatureAssignment>) => {
    setAssignments((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        ...updates,
        feature_entitlement_id: featureId,
        license_tier_id: prev[featureId]?.license_tier_id || id || '',
        id: prev[featureId]?.id || '',
        created_at: prev[featureId]?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }))
  }

  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = []
    acc[feature.category].push(feature)
    return acc
  }, {} as Record<string, FeatureEntitlement[]>)

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Create License Tier' : tier.tier_name || 'License Tier'}
        subtitle={isNew ? 'Define a new license tier' : `Manage ${tier.tier_name}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
            <Button variant="secondary" onClick={() => navigate('/platform-admin/licenses/tiers')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="pa-card pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)', background: 'var(--pa-danger-bg)' }}>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-danger)' }}>error</span>
            <span className="pa-body-m">{error}</span>
          </div>
        </div>
      )}

      <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-5)' }}>
        {/* Tier Settings */}
        <Card title="Tier Settings">
          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Tier Key</label>
            <Select
              value={tier.tier_key || 'basic'}
              onChange={(e) => setTier({ ...tier, tier_key: e.target.value as 'basic' | 'power' })}
              disabled={!isNew}
              options={[
                { value: 'basic', label: 'Basic' },
                { value: 'power', label: 'Power' },
              ]}
            />
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
              Immutable after creation
            </div>
          </div>

          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Tier Name</label>
            <Input
              value={tier.tier_name || ''}
              onChange={(e) => setTier({ ...tier, tier_name: e.target.value })}
              placeholder="e.g., Basic License"
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-label">Description</label>
            <textarea
              className="pa-input pa-textarea"
              value={tier.description || ''}
              onChange={(e) => setTier({ ...tier, description: e.target.value })}
              placeholder="Short marketing-style description"
              rows={3}
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Stripe Price ID</label>
            <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
              <Input
                value={tier.stripe_price_id || ''}
                onChange={(e) => setTier({ ...tier, stripe_price_id: e.target.value })}
                placeholder="price_..."
                style={{ flex: 1 }}
              />
                <Button
                variant="secondary"
                onClick={() => tier.stripe_price_id && verifyStripePrice(tier.stripe_price_id, true)}
                disabled={verifying || !tier.stripe_price_id}
                size="dense"
              >
                {verifying ? 'Verifying...' : 'Re-verify'}
              </Button>
            </div>
            {stripeVerification && (
              <div className="pa-mt-3">
                {stripeVerification.valid ? (
                  <div className="pa-card" style={{ background: 'var(--pa-success-bg)', border: '1px solid var(--pa-success)' }}>
                    <div className="pa-flex pa-items-center pa-gap-2 pa-mb-2">
                      <span className="material-symbols-outlined" style={{ color: 'var(--pa-success)' }}>check_circle</span>
                      <span className="pa-body-m" style={{ fontWeight: 600 }}>Verified</span>
                      {tier.stripe_verified_at && isStripeVerificationValid(tier.stripe_verified_at) && (
                        <Badge variant="neutral" style={{ marginLeft: 'auto' }}>Cached</Badge>
                      )}
                    </div>
                    {stripeVerification.product_name && (
                      <div className="pa-body-s">Product: {stripeVerification.product_name}</div>
                    )}
                    {stripeVerification.amount_cents && stripeVerification.currency && (
                      <div className="pa-body-s">
                        Amount: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: stripeVerification.currency.toUpperCase(),
                        }).format(stripeVerification.amount_cents / 100)}
                        {stripeVerification.interval && ` / ${stripeVerification.interval}`}
                      </div>
                    )}
                    <div className="pa-body-s">Status: {stripeVerification.active ? 'Active' : 'Inactive'}</div>
                    {tier.stripe_verified_at && (
                      <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                        Verified: {new Date(tier.stripe_verified_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pa-card" style={{ background: 'var(--pa-danger-bg)', border: '1px solid var(--pa-danger)' }}>
                    <div className="pa-flex pa-items-center pa-gap-2">
                      <span className="material-symbols-outlined" style={{ color: 'var(--pa-danger)' }}>error</span>
                      <span className="pa-body-s">{stripeVerification.error || 'Verification failed'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pa-form-group">
            <label className="pa-label">Status</label>
            <Select
              value={tier.status || 'active'}
              onChange={(e) => setTier({ ...tier, status: e.target.value as 'active' | 'archived' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>
        </Card>

        {/* Feature Assignments */}
        <Card title="Included Features" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-4)' }}>
            Select features to include in this tier. Use limits and role toggles for granular control.
          </div>

          {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
            <div key={category} className="pa-mb-5">
              <div className="pa-overline" style={{ marginBottom: 'var(--pa-space-3)' }}>
                {category}
              </div>
              {categoryFeatures.map((feature) => {
                const assignment = assignments[feature.id]
                const included = assignment?.included ?? false

                return (
                  <div
                    key={feature.id}
                    className="pa-card pa-mb-3"
                    style={{ padding: 'var(--pa-space-3)' }}
                  >
                    <div className="pa-flex pa-items-start pa-gap-3">
                      <Checkbox
                        checked={included}
                        onChange={(e) => toggleFeature(feature.id, e.target.checked)}
                        label={feature.display_name}
                      />
                      <div style={{ flex: 1 }}>
                        {feature.description && (
                          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                            {feature.description}
                          </div>
                        )}
                        <div className="pa-flex pa-items-center pa-gap-2 pa-mt-2">
                          <Badge variant="neutral">{feature.feature_type}</Badge>
                          <Badge variant="info">{feature.rollout_status}</Badge>
                        </div>

                        {included && (
                          <div className="pa-mt-3" style={{ paddingTop: 'var(--pa-space-3)', borderTop: '1px solid var(--pa-n100)' }}>
                            {feature.feature_type === 'limit' && (
                              <div className="pa-form-group">
                                <label className="pa-label">Limit Value</label>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={assignment?.limit_value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    const numValue = value ? parseInt(value, 10) : null
                                    if (numValue === null || numValue > 0) {
                                      updateAssignment(feature.id, {
                                        limit_value: numValue,
                                      })
                                    }
                                  }}
                                  placeholder="Enter limit"
                                />
                              </div>
                            )}

                            {feature.feature_type === 'permission' && (
                              <div className="pa-form-group">
                                <label className="pa-label">Role Access</label>
                                <div className="pa-flex pa-flex-col pa-gap-2">
                                  <Checkbox
                                    checked={assignment?.role_admin ?? true}
                                    onChange={(e) => updateAssignment(feature.id, { role_admin: e.target.checked })}
                                    label="Admin"
                                  />
                                  <Checkbox
                                    checked={assignment?.role_coach ?? true}
                                    onChange={(e) => updateAssignment(feature.id, { role_coach: e.target.checked })}
                                    label="Coach"
                                  />
                                  <Checkbox
                                    checked={assignment?.role_parent ?? false}
                                    onChange={(e) => updateAssignment(feature.id, { role_parent: e.target.checked })}
                                    label="Parent"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </Card>
      </div>

      {archivedFeaturesCount > 0 && (
        <Card style={{ marginTop: 'var(--pa-space-5)', borderLeft: '3px solid var(--pa-warning)' }}>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)' }}>warning</span>
            <div>
              <div className="pa-body-m" style={{ fontWeight: 600 }}>
                This tier includes {archivedFeaturesCount} archived feature(s)
              </div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                Consider removing archived features from this tier to avoid confusion.
              </div>
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={conflictDialog}
        title="Edit Conflict Detected"
        description="Another admin has modified this tier since you loaded it. Please reload to see the latest changes, then make your edits again."
        confirmLabel="Reload"
        variant="warning"
        onConfirm={handleReloadAfterConflict}
        onCancel={() => setConflictDialog(false)}
      />
    </div>
  )
}
