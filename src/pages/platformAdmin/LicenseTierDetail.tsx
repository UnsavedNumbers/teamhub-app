import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Input, Select, Badge, Checkbox, ConfirmDialog, ErrorState, Accordion } from '../../components/platformAdmin'
import { mapTierFeatureAssignment } from '../../utils/domainMappers'
import type { LicenseTier, FeatureEntitlement, TierFeatureAssignment, StripePriceVerification } from '../../types/licenseTiers.types'
// Unused - keep for future use
// import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { logAuditEvent, isStripeVerificationValid, getArchivedFeaturesCount } from '../../utils/licenseEntitlementsHelpers'
import { isValidRouteId, getInvalidRouteIdError } from '../../utils/routeValidation'
import { useOffline } from '../../hooks/useOffline'
import { shouldBlockInDemoMode, getDemoModeError } from '../../utils/demoMode'
import { showSuccess, showError } from '../../utils/toast'
import { getLink } from '../../utils/routes'
import { RouteKeys } from '../../utils/routes'
import { useI18n } from '../../i18n/useI18n'

// Unused - keep for future use
// const FEATURE_CATEGORIES_OPTIONS = FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat }))
// const FEATURE_TYPES_OPTIONS = FEATURE_TYPES.map(type => ({ value: type, label: type }))

export default function LicenseTierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const { t } = useI18n()
  const isNew = id === 'new'

  const [tier, setTier] = useState<Partial<LicenseTier>>({
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
  const [notFound, setNotFound] = useState(false)
  const [invalidRoute, setInvalidRoute] = useState(false)
  const [organizationsUsingTier, setOrganizationsUsingTier] = useState<Array<{ id: string; name: string; license_plan: string }>>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Validate route parameter
  useEffect(() => {
    if (!isNew && id && !isValidRouteId(id)) {
      setInvalidRoute(true)
    }
  }, [id, isNew])

  const fetchTier = useCallback(async () => {
    if (isNew) return

    setLoading(true)
    try {
      const { data, error: tierError } = await supabase
        .from('license_tiers')
        .select('*')
        .eq('id', id!)
        .single()

      if (tierError) {
        if (tierError.code === 'PGRST116' || tierError.message?.includes('not found')) {
          setNotFound(true)
          return
        }
        throw tierError
      }
      setTier(data as Partial<LicenseTier>)

      // Check for archived features
      if ((data as LicenseTier)?.id) {
        const count = await getArchivedFeaturesCount((data as LicenseTier).id)
        setArchivedFeaturesCount(count)
      }

      // Use cached Stripe verification if valid, otherwise verify
      if ((data as LicenseTier)?.stripe_price_id) {
        if ((data as LicenseTier)?.stripe_verified_at && isStripeVerificationValid((data as LicenseTier)?.stripe_verified_at)) {
          // Use cached data
          setStripeVerification({
            valid: true,
            product_name: (data as LicenseTier)?.stripe_product_name || undefined,
            amount_cents: (data as LicenseTier)?.stripe_amount_cents || undefined,
            interval: (data as LicenseTier)?.stripe_interval || undefined,
            currency: (data as LicenseTier)?.stripe_currency || undefined,
            active: (data as LicenseTier)?.stripe_active || undefined,
          })
        } else {
          // Verify fresh
          verifyStripePrice((data as LicenseTier)?.stripe_price_id, true)
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
      setFeatures(data as FeatureEntitlement[])
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
        const mapped = mapTierFeatureAssignment(assignment)
        assignmentsMap[mapped.featureEntitlementId] = mapped as any
      })
      setAssignments(assignmentsMap)
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
    }
  }, [id, isNew])

  const fetchOrganizationsUsingTier = useCallback(async () => {
    if (isNew || !tier.tier_key) return

    setLoadingOrgs(true)
    try {
      // Map tier_key to license_plan values
      type LicensePlan = 'basic' | 'starter' | 'power' | 'standard' | 'pro'
      const licensePlans: LicensePlan[] = []
      if (tier.tier_key === 'basic') {
        licensePlans.push('basic', 'starter')
      } else if (tier.tier_key === 'power') {
        licensePlans.push('power', 'standard', 'pro')
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, license_plan')
        .in('license_plan', licensePlans as any)
        .order('name', { ascending: true })

      if (error) throw error
      setOrganizationsUsingTier((data || []) as Array<{ id: string; name: string; license_plan: string }>)
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
      setOrganizationsUsingTier([])
    } finally {
      setLoadingOrgs(false)
    }
  }, [isNew, tier.tier_key])

  useEffect(() => {
    fetchTier()
    fetchFeatures()
    fetchAssignments()
  }, [fetchTier, fetchFeatures, fetchAssignments])

  useEffect(() => {
    if (!isNew && tier.tier_key) {
      fetchOrganizationsUsingTier()
    }
  }, [fetchOrganizationsUsingTier])

  // Update last refreshed time when tier data is loaded
  useEffect(() => {
    if (!loading && tier.id) {
      setLastRefreshed(new Date())
    }
  }, [loading, tier.id])

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
      const { data, error } = await supabase.functions.invoke('stripe-verify-price', {
        body: { price_id: priceId },
      })

      if (error) throw error
      
      const result: StripePriceVerification = data
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
    // Check demo mode
    if (shouldBlockInDemoMode('write')) {
      setError(getDemoModeError('save license tier'))
      return
    }

    // Check offline
    if (isOffline) {
      setError('Cannot save while offline. Please check your internet connection.')
      return
    }

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
        type LicenseTierInsert = Database['public']['Tables']['license_tiers']['Insert']
        const insertData: LicenseTierInsert = {
          tier_key: tier.tier_key!,
          tier_name: tier.tier_name!,
          description: tier.description || null,
          stripe_price_id: tier.stripe_price_id!,
          stripe_product_name: tier.stripe_product_name || null,
          stripe_amount_cents: tier.stripe_amount_cents || null,
          stripe_interval: tier.stripe_interval || null,
          stripe_currency: tier.stripe_currency || null,
          stripe_active: tier.stripe_active || null,
          stripe_verified_at: tier.stripe_verified_at || null,
          status: tier.status || 'active',
        }
        const { data, error: createError } = await supabase
          .from('license_tiers')
          .insert(insertData)
          .select()
          .single()

        if (createError) throw createError

        // Save feature assignments
        if (data) {
          // Save feature assignments with error handling
        try {
          await saveAssignments(data.id)
        } catch (assignmentError: any) {
          console.error('Error saving assignments:', assignmentError)
          // Tier was created but assignments failed - show warning but continue
          showError(t('toast.error.tierCreatedButAssignmentsFailed'))
          // Still navigate to the tier so user can fix assignments
        }
          
        // Log audit event (best effort - don't block on audit failure)
        try {
          await logAuditEvent({
            action: 'tier_created',
            targetType: 'tier',
            targetId: (data as any).id,
            afterState: data,
            reason: reason || 'Tier created',
          })
        } catch (auditError) {
          console.error('Error logging audit event:', auditError)
          // Continue - audit failure shouldn't block the operation
        }
          
        showSuccess(t('toast.success.licenseTierCreated'))
        navigate(`/platform-admin/licenses/tiers/${(data as any).id}`)
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

        if ((currentTier as any).version !== expectedVersion) {
          setConflictDialog(true)
          setSaving(false)
          return
        }

        type LicenseTierUpdate = Database['public']['Tables']['license_tiers']['Update']
        const updateData = {
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
        } satisfies LicenseTierUpdate
        const { data: updatedTier, error: updateError } = await supabase
          .from('license_tiers')
          .update(updateData)
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

        // Save feature assignments with error handling
        try {
          await saveAssignments(id!)
        } catch (assignmentError: any) {
          console.error('Error saving assignments:', assignmentError)
          // Tier was updated but assignments failed - show warning
          showError(t('toast.error.tierUpdatedButAssignmentsFailed'))
          // Reload assignments to show current state
          await fetchAssignments()
        }

        // Log audit event (best effort - don't block on audit failure)
        try {
          await logAuditEvent({
            action: 'tier_updated',
            targetType: 'tier',
            targetId: id!,
            beforeState,
            afterState: updatedTier,
            reason: reason || 'Tier updated',
          })
        } catch (auditError) {
          console.error('Error logging audit event:', auditError)
          // Continue - audit failure shouldn't block the operation
        }
        
        // Refresh tier data to get latest version
        await fetchTier()
        setLastRefreshed(new Date())
        showSuccess(t('toast.success.licenseTierUpdated'))
      }
    } catch (err: any) {
      // Provide user-friendly error messages
      let errorMessage = t('toast.error.saveFailed')
      if (err.code === '23505') {
        errorMessage = t('toast.error.tierStripePriceIdExists')
      } else if (err.code === '23503') {
        errorMessage = t('toast.error.tierInvalidReference')
      } else if (err.code === '42501') {
        errorMessage = t('toast.error.tierPermissionDenied')
      } else if (err.message) {
        errorMessage = err.message
      }
      showError(errorMessage)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleReloadAfterConflict = async () => {
    setConflictDialog(false)
    await fetchTier()
    await fetchAssignments()
    setLastRefreshed(new Date())
  }

  const handleArchive = async () => {
    if (shouldBlockInDemoMode('write')) {
      showError(getDemoModeError('archive license tier'))
      return
    }

    if (isOffline) {
      showError('Cannot archive while offline. Please check your internet connection.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const beforeState = { ...tier }
      const expectedVersion = tier.version || 1

      const { data: currentTier, error: fetchError } = await supabase
        .from('license_tiers')
        .select('version')
        .eq('id', id!)
        .single()

      if (fetchError) throw fetchError

      if ((currentTier as any).version !== expectedVersion) {
        setArchiveDialog(false)
        setConflictDialog(true)
        setSaving(false)
        return
      }

      type LicenseTierUpdate = Database['public']['Tables']['license_tiers']['Update']
      const updateData = {
        status: tier.status === 'active' ? 'archived' : 'active',
      } satisfies LicenseTierUpdate

      const { data: updatedTier, error: updateError } = await supabase
        .from('license_tiers')
        .update(updateData)
        .eq('id', id!)
        .eq('version', expectedVersion)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === 'PGRST116' || updateError.message?.includes('0 rows')) {
          setArchiveDialog(false)
          setConflictDialog(true)
          setSaving(false)
          return
        }
        throw updateError
      }

      await logAuditEvent({
        action: tier.status === 'active' ? 'tier_archived' : 'tier_activated',
        targetType: 'tier',
        targetId: id!,
        beforeState,
        afterState: updatedTier,
        reason: tier.status === 'active' ? 'Tier archived' : 'Tier activated',
      })

      showSuccess(tier.status === 'active' 
        ? t('toast.success.licenseTierArchived')
        : t('toast.success.licenseTierActivated'))
      setArchiveDialog(false)
      await fetchTier()
      await fetchOrganizationsUsingTier()
    } catch (err: any) {
      let errorMessage = 'Failed to update tier status'
      if (err.code === '42501') {
        errorMessage = 'Permission denied. You do not have access to modify license tiers.'
      } else if (err.message) {
        errorMessage = err.message
      }
      showError(errorMessage)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (shouldBlockInDemoMode('write')) {
      showError(getDemoModeError('duplicate license tier'))
      return
    }

    if (isOffline) {
      showError('Cannot duplicate while offline. Please check your internet connection.')
      return
    }

    setDuplicating(true)
    setError(null)

    try {
      // Create new tier with same data but new ID and modified name
      type LicenseTierInsert = Database['public']['Tables']['license_tiers']['Insert']
      const insertData: LicenseTierInsert = {
        tier_key: tier.tier_key!,
        tier_name: `${tier.tier_name} (Copy)`,
        description: tier.description || null,
        stripe_price_id: '', // Must be set separately - cannot duplicate Stripe Price ID
        stripe_product_name: tier.stripe_product_name || null,
        stripe_amount_cents: tier.stripe_amount_cents || null,
        stripe_interval: tier.stripe_interval || null,
        stripe_currency: tier.stripe_currency || null,
        stripe_active: tier.stripe_active || null,
        status: 'active',
      }

      const { data: newTier, error: createError } = await supabase
        .from('license_tiers')
        .insert(insertData)
        .select()
        .single()

      if (createError) throw createError

      // Copy feature assignments
      if (newTier) {
        const assignmentEntries = Object.entries(assignments).filter(([_, assignment]) => assignment.included)

        for (const [featureId, assignment] of assignmentEntries) {
          type AssignmentUpsert = Database['public']['Tables']['tier_feature_assignments']['Insert']
          const upsertData = {
            license_tier_id: (newTier as any).id,
            feature_entitlement_id: featureId,
            included: assignment.included,
            limit_value: assignment.limit_value || null,
            role_admin: assignment.role_admin ?? true,
            role_coach: assignment.role_coach ?? true,
            role_parent: assignment.role_parent ?? false,
          } satisfies AssignmentUpsert

          await supabase
            .from('tier_feature_assignments')
            .upsert(upsertData, {
              onConflict: 'license_tier_id,feature_entitlement_id',
            })
        }

        await logAuditEvent({
          action: 'tier_duplicated',
          targetType: 'tier',
          targetId: (newTier as any).id,
          beforeState: null,
          afterState: newTier,
          reason: `Duplicated from tier ${tier.id}`,
        })

        showSuccess(t('toast.success.licenseTierDuplicated'))
        navigate(`/platform-admin/licenses/tiers/${(newTier as any).id}`)
      }
    } catch (err: any) {
      let errorMessage = 'Failed to duplicate tier'
      if (err.code === '23505') {
        errorMessage = 'A tier with this Stripe Price ID already exists'
      } else if (err.code === '42501') {
        errorMessage = 'Permission denied. You do not have access to create license tiers.'
      } else if (err.message) {
        errorMessage = err.message
      }
      showError(errorMessage)
      setError(errorMessage)
    } finally {
      setDuplicating(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchTier()
    await fetchAssignments()
    await fetchOrganizationsUsingTier()
    setLastRefreshed(new Date())
    setLoading(false)
  }

  const saveAssignments = async (tierId: string) => {
    const assignmentEntries = Object.entries(assignments).filter(([_, assignment]) => assignment.included)

    for (const [featureId, assignment] of assignmentEntries) {
      type AssignmentUpsert = Database['public']['Tables']['tier_feature_assignments']['Insert']
      const upsertData = {
        license_tier_id: tierId,
        feature_entitlement_id: featureId,
        included: assignment.included,
        limit_value: assignment.limit_value || null,
        role_admin: assignment.role_admin ?? true,
        role_coach: assignment.role_coach ?? true,
        role_parent: assignment.role_parent ?? false,
      } satisfies AssignmentUpsert
      const { error } = await supabase
        .from('tier_feature_assignments')
        .upsert(upsertData, {
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

  if (invalidRoute) {
    return (
      <div>
        <PageHeader title="Invalid Route" />
        <ErrorState
          title="Invalid License Tier ID"
          message={getInvalidRouteIdError(id, 'license tier')}
          onRetry={() => navigate('/platform-admin/licenses/tiers')}
          retryLabel="Back to Tiers"
        />
      </div>
    )
  }

  if (notFound) {
    return (
      <div>
        <PageHeader title="License Tier Not Found" />
        <ErrorState
          title="Tier Not Found"
          message="The license tier you're looking for doesn't exist or has been deleted."
          onRetry={() => navigate('/platform-admin/licenses/tiers')}
          retryLabel="Back to Tiers"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <Card>
          <div className="pa-skeleton" style={{ height: '300px', width: '100%' }} />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Create License Tier' : tier.tier_name || 'License Tier'}
        subtitle={isNew ? 'Define a new license tier' : `Manage ${tier.tier_name}`}
        breadcrumbs={[
          { label: 'Licenses', path: getLink(RouteKeys.PLATFORM_LICENSES) },
          { label: 'License Tiers', path: getLink('platformAdmin.licenses.tiers') },
          { label: isNew ? 'Create' : tier.tier_name || 'Tier' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)', flexWrap: 'wrap' }}>
            <Button 
              variant="ghost" 
              onClick={() => navigate(getLink('platformAdmin.licenses.tiers'))}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              Back to Tiers
            </Button>
            {!isNew && (
              <>
                <Button
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                  Refresh
                </Button>
                <Button
                  variant="blue"
                  onClick={handleDuplicate}
                  disabled={duplicating || isOffline || shouldBlockInDemoMode('write')}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
                  {duplicating ? 'Duplicating...' : 'Duplicate'}
                </Button>
                <Button
                  variant={tier.status === 'active' ? 'blue' : 'primary'}
                  onClick={() => setArchiveDialog(true)}
                  disabled={saving || isOffline || shouldBlockInDemoMode('write')}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {tier.status === 'active' ? 'archive' : 'unarchive'}
                  </span>
                  {tier.status === 'active' ? 'Archive' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/platform-admin/licenses/audit?target_type=tier&target_id=${id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
                  Audit History
                </Button>
              </>
            )}
            {isNew && (
              <Button variant="blue" onClick={() => navigate(getLink('platformAdmin.licenses.tiers'))}>
                Cancel
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={() => handleSave()} 
              disabled={saving || duplicating || isOffline || shouldBlockInDemoMode('write')}
            >
              {saving ? 'Saving...' : shouldBlockInDemoMode('write') ? 'Demo Mode' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {isOffline && (
        <div className="pa-card pa-mb-4" style={{ borderLeft: '3px solid var(--pa-warning)', background: 'var(--pa-warning-bg)' }}>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)' }}>wifi_off</span>
            <span className="pa-body-m">You are currently offline. Some features may not be available.</span>
          </div>
        </div>
      )}

      {error && (
        <ErrorState
          title="Error"
          message={error}
          onRetry={() => {
            setError(null)
            if (isNew) {
              // Reset form
              setTier({
                tier_key: 'basic',
                tier_name: '',
                description: '',
                stripe_price_id: '',
                status: 'active',
                version: 1,
              })
            } else if (id) {
              // Reload data
              handleRefresh()
            }
          }}
          retryLabel={isNew ? 'Reset Form' : 'Reload'}
        />
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
                variant="blue"
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
                  <div 
                    className="pa-card" 
                    style={{ 
                      background: 'linear-gradient(135deg, var(--pa-success-bg) 0%, rgba(34, 197, 94, 0.05) 100%)',
                      border: '1px solid var(--pa-success)',
                      borderRadius: 'var(--pa-radius-lg)',
                      padding: 'var(--pa-space-5)',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)',
                    }}
                  >
                    {/* Header */}
                    <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
                      <div className="pa-flex pa-items-center pa-gap-3">
                        <div 
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--pa-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '24px' }}>
                            check_circle
                          </span>
                        </div>
                        <div>
                          <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                            Stripe Price Verified
                          </div>
                          {tier.stripe_verified_at && isStripeVerificationValid(tier.stripe_verified_at) && (
                            <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginTop: '2px' }}>
                              Using cached data
                            </div>
                          )}
                        </div>
                      </div>
                      {tier.stripe_price_id && (
                        <a
                          href={`https://dashboard.stripe.com/prices/${tier.stripe_price_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pa-flex pa-items-center pa-gap-2"
                          style={{
                            color: 'var(--pa-success)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '13px',
                            padding: 'var(--pa-space-2) var(--pa-space-3)',
                            borderRadius: 'var(--pa-radius-md)',
                            border: '1px solid var(--pa-success)',
                            background: 'white',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--pa-success)'
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white'
                            e.currentTarget.style.color = 'var(--pa-success)'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                          View in Stripe
                        </a>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: 'var(--pa-space-4)',
                      paddingTop: 'var(--pa-space-4)',
                      borderTop: '1px solid rgba(34, 197, 94, 0.2)',
                    }}>
                      {stripeVerification.product_name && (
                        <div>
                          <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-1)' }}>
                            Product Name
                          </div>
                          <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                            {stripeVerification.product_name}
                          </div>
                        </div>
                      )}
                      {stripeVerification.amount_cents && stripeVerification.currency && (
                        <div>
                          <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-1)' }}>
                            Price
                          </div>
                          <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: stripeVerification.currency.toUpperCase(),
                            }).format(stripeVerification.amount_cents / 100)}
                            {stripeVerification.interval && (
                              <span style={{ color: 'var(--pa-n600)', fontWeight: 400, marginLeft: '4px' }}>
                                / {stripeVerification.interval}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-1)' }}>
                          Status
                        </div>
                        <div>
                          <Badge variant={stripeVerification.active ? 'success' : 'neutral'}>
                            {stripeVerification.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      {tier.stripe_verified_at && (
                        <div>
                          <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-1)' }}>
                            Last Verified
                          </div>
                          <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                            {new Date(tier.stripe_verified_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div 
                    className="pa-card" 
                    style={{ 
                      background: 'var(--pa-danger-bg)', 
                      border: '1px solid var(--pa-danger)',
                      borderRadius: 'var(--pa-radius-lg)',
                      padding: 'var(--pa-space-4)',
                    }}
                  >
                    <div className="pa-flex pa-items-center pa-gap-3">
                      <span 
                        className="material-symbols-outlined" 
                        style={{ 
                          color: 'var(--pa-danger)',
                          fontSize: '24px',
                        }}
                      >
                        error
                      </span>
                      <div style={{ flex: 1 }}>
                        <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                          Verification Failed
                        </div>
                        <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: '2px' }}>
                          {stripeVerification.error || 'Unable to verify Stripe Price ID'}
                        </div>
                      </div>
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

          <Accordion
            items={Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
              const includedCount = categoryFeatures.filter(f => assignments[f.id]?.included).length
              const totalCount = categoryFeatures.length
              return {
                title: category,
                count: `${includedCount} / ${totalCount}`,
                defaultExpanded: false,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
                    {categoryFeatures.map((feature) => {
                      const assignment = assignments[feature.id]
                      const included = assignment?.included ?? false

                      return (
                        <div
                          key={feature.id}
                          style={{
                            padding: 'var(--pa-space-4)',
                            border: '1px solid var(--pa-n100)',
                            borderRadius: 'var(--pa-radius-md)',
                            background: 'var(--pa-n50)',
                          }}
                        >
                          {/* Feature Header - Always visible, consistent height */}
                          <div className="pa-flex pa-items-start pa-gap-3">
                            <div style={{ marginTop: '2px' }}>
                              <Checkbox
                                checked={included}
                                onChange={(e) => toggleFeature(feature.id, e.target.checked)}
                                label=""
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="pa-flex pa-items-center pa-gap-2 pa-mb-2">
                                <span className="pa-body-m" style={{ fontWeight: 600 }}>
                                  {feature.display_name}
                                </span>
                                <Badge variant="neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                  {feature.feature_type.toUpperCase()}
                                </Badge>
                                <Badge variant="info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                  {feature.rollout_status.toUpperCase()}
                                </Badge>
                              </div>
                              {feature.description && (
                                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                                  {feature.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Feature Configuration - Only shown when included */}
                          {included && (
                            <div
                              style={{
                                marginTop: 'var(--pa-space-4)',
                                paddingTop: 'var(--pa-space-4)',
                                borderTop: '1px solid var(--pa-n100)',
                              }}
                            >
                              {feature.feature_type === 'limit' && (
                                <div className="pa-form-group" style={{ marginBottom: 0 }}>
                                  <label className="pa-label" style={{ fontSize: '12px', marginBottom: 'var(--pa-space-2)' }}>
                                    Limit Value
                                  </label>
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
                                    style={{ maxWidth: '200px' }}
                                  />
                                </div>
                              )}

                              {feature.feature_type === 'permission' && (
                                <div className="pa-form-group" style={{ marginBottom: 0 }}>
                                  <label className="pa-label" style={{ fontSize: '12px', marginBottom: 'var(--pa-space-2)' }}>
                                    Role Access
                                  </label>
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
                      )
                    })}
                  </div>
                ),
              }
            })}
          />
        </Card>
      </div>

      {/* Tier Usage Details */}
      {!isNew && tier.id && (
        <Card 
          title="Organizations Using This Tier" 
          style={{ marginTop: 'var(--pa-space-5)' }}
          actions={
            <Button
              variant="ghost"
              size="dense"
              onClick={fetchOrganizationsUsingTier}
              disabled={loadingOrgs}
            >
              {loadingOrgs ? 'Loading...' : 'Refresh'}
            </Button>
          }
        >
          {loadingOrgs ? (
            <div className="pa-skeleton" style={{ height: '100px', width: '100%' }} />
          ) : organizationsUsingTier.length > 0 ? (
            <div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-3)' }}>
                {organizationsUsingTier.length} organization{organizationsUsingTier.length === 1 ? '' : 's'} currently using this tier
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)', maxHeight: '300px', overflowY: 'auto' }}>
                {organizationsUsingTier.map((org) => (
                  <div
                    key={org.id}
                    className="pa-card"
                    style={{
                      padding: 'var(--pa-space-3)',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/platform-admin/organizations/${org.id}`)}
                  >
                    <div className="pa-flex pa-items-center pa-justify-between">
                      <div>
                        <div className="pa-body-m" style={{ fontWeight: 600 }}>{org.name}</div>
                        <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
                          License Plan: {org.license_plan}
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: 'var(--pa-n500)' }}>chevron_right</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
              No organizations are currently using this tier.
            </div>
          )}
        </Card>
      )}

      {/* Last Updated Indicator */}
      {!isNew && lastRefreshed && (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-3)', textAlign: 'right' }}>
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
        </div>
      )}

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

      <ConfirmDialog
        open={archiveDialog}
        title={tier.status === 'active' ? 'Archive License Tier' : 'Activate License Tier'}
        description={
          tier.status === 'active'
            ? `Are you sure you want to archive "${tier.tier_name}"? This will mark the tier as archived but will not affect organizations currently using it.`
            : `Are you sure you want to activate "${tier.tier_name}"? This will make the tier available for new organizations.`
        }
        confirmLabel={tier.status === 'active' ? 'Archive' : 'Activate'}
        variant={tier.status === 'active' ? 'warning' : 'info'}
        onConfirm={handleArchive}
        onCancel={() => setArchiveDialog(false)}
      />
    </div>
  )
}
