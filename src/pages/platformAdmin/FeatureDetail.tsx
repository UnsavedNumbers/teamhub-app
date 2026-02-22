import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Input, Select, Checkbox, ErrorState } from '../../components/platformAdmin'
import { FeatureHierarchySelector } from '../../components/admin/FeatureHierarchySelector'
import { mapFeatureEntitlement, mapLicenseTier, mapTierFeatureAssignment } from '../../utils/domainMappers'
import type { FeatureEntitlement, LicenseTier, TierFeatureAssignment } from '../../types/domain/License'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { showSuccess, showError } from '../../utils/toast'
import { useI18n } from '../../i18n/useI18n'
import { isUuid } from '../../utils/uuid'
import { getLink, RouteKeys } from '../../utils/routes'

const FEATURE_CATEGORIES_OPTIONS = FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat }))
const FEATURE_TYPES_OPTIONS = FEATURE_TYPES.map(type => ({ value: type, label: type }))

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FeatureDetail() {
  useDebugLifecycle('FeatureDetail')
  
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const { t } = useI18n()

  const [feature, setFeature] = useState<Partial<FeatureEntitlement>>({
    featureKey: '',
    displayName: '',
    category: 'Scheduling & Calendar',
    featureType: 'module',
    description: '',
    rolloutStatus: 'live',
    unavailableGateAction: 'overlay',
    isSystemFeature: false,
    platformAdminOnly: false,
  })
  const [originalFeature, setOriginalFeature] = useState<Partial<FeatureEntitlement> | null>(null)
  const [tiers, setTiers] = useState<LicenseTier[]>([])
  const [assignments, setAssignments] = useState<Record<string, TierFeatureAssignment>>({})
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [featureTypeOverride, setFeatureTypeOverride] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState<Record<string, boolean>>({})
  const [showUnsavedBanner, setShowUnsavedBanner] = useState(false)
  const [pendingLimits, setPendingLimits] = useState<Record<string, number | null>>({})
  const [suggestedChildren, setSuggestedChildren] = useState<FeatureEntitlement[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [addingChild, setAddingChild] = useState<Record<string, boolean>>({})

  const fetchFeature = useCallback(async () => {
    if (isNew) return
    if (!id || !isUuid(id)) {
      setError('Invalid feature ID')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: featureError } = await supabase
        .from('feature_entitlements')
        .select('*')
        .eq('id', id)
        .single()

      if (featureError) {
        if (featureError.code === 'PGRST116') {
          // Not found
          setError('Feature not found')
        } else {
          throw featureError
        }
        return
      }

      if (!data) {
        setError('Feature not found')
        return
      }

      // Check if archived
      if (data.archived_at) {
        setError('This feature has been archived')
        return
      }

      const mapped = mapFeatureEntitlement(data)
      setFeature(mapped)
      setOriginalFeature(mapped)
    } catch (err: any) {
      console.error('Error fetching feature:', err)
      setError(err.message || 'Failed to load feature')
    } finally {
      setLoading(false)
    }
  }, [id, isNew])

  const fetchTiers = useCallback(async () => {
    try {
      const { data, error: tiersError } = await supabase
        .from('license_tiers')
        .select('*')
        .eq('status', 'active')
        .order('tier_key', { ascending: true })

      if (tiersError) throw tiersError
      setTiers((data || []).map(row => mapLicenseTier(row)))
    } catch (err: any) {
      console.error('Error fetching tiers:', err)
    }
  }, [])

  const fetchAssignments = useCallback(async () => {
    if (isNew) return

    try {
      const { data, error: assignmentsError } = await supabase
        .from('tier_feature_assignments')
        .select('*')
        .eq('feature_entitlement_id', id!)

      if (assignmentsError) throw assignmentsError

      const assignmentsMap: Record<string, TierFeatureAssignment> = {}
      const limitsMap: Record<string, number | null> = {}
      ;(data || []).forEach((assignment) => {
        const mapped = mapTierFeatureAssignment(assignment)
        assignmentsMap[mapped.licenseTierId] = mapped
        limitsMap[mapped.licenseTierId] = mapped.limitValue ?? null
      })
      setAssignments(assignmentsMap)
      setPendingLimits(limitsMap)
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
    }
  }, [id, isNew])

  const fetchSuggestedChildren = useCallback(async () => {
    if (isNew || !feature.featureKey || feature.parentFeatureKey) return

    setLoadingSuggestions(true)
    try {
      // Fetch features that:
      // 1. Don't have a parent yet (parent_feature_key IS NULL)
      // 2. Are in the same category OR have similar naming pattern
      // 3. Are not the current feature itself
      const { data, error } = await supabase
        .from('feature_entitlements')
        .select('*')
        .is('parent_feature_key', null)
        .is('archived_at', null)
        .neq('feature_key', feature.featureKey!)
        .or(`category.eq.${feature.category},feature_key.ilike.%${feature.featureKey?.split('_')[0]}%`)
        .order('display_name', { ascending: true })
        .limit(10)

      if (error) throw error

      const suggestions = (data || [])
        .map(row => mapFeatureEntitlement(row))
        // Filter out features that are already children
        .filter(f => f.featureKey !== feature.featureKey)
      
      setSuggestedChildren(suggestions)
    } catch (err: any) {
      console.error('Error fetching suggested children:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [id, isNew, feature.featureKey, feature.category, feature.parentFeatureKey])

  const handleAddChild = async (childFeatureKey: string, childFeatureId: string) => {
    if (!feature.featureKey) return

    setAddingChild(prev => ({ ...prev, [childFeatureKey]: true }))

    try {
      const { error } = await supabase
        .from('feature_entitlements')
        .update({ parent_feature_key: feature.featureKey } as any)
        .eq('id', childFeatureId)

      if (error) throw error

      showSuccess('Child feature added successfully!')
      
      // Remove from suggestions
      setSuggestedChildren(prev => prev.filter(f => f.featureKey !== childFeatureKey))
    } catch (err: any) {
      console.error('Error adding child:', err)
      showError(err.message || 'Failed to add child feature')
    } finally {
      setAddingChild(prev => ({ ...prev, [childFeatureKey]: false }))
    }
  }

  const toggleTierAssignment = async (tierId: string, included: boolean) => {
    if (isNew || !id) return

    setSavingAssignment(prev => ({ ...prev, [tierId]: true }))

    try {
      const assignment = assignments[tierId]
      
      if (included) {
        // Create or update assignment
        const assignmentData: Database['public']['Tables']['tier_feature_assignments']['Insert'] = {
          license_tier_id: tierId,
          feature_entitlement_id: id,
          included: true,
          limit_value: assignment?.limitValue || null,
          role_admin: assignment?.roleAdmin ?? true,
          role_coach: assignment?.roleCoach ?? true,
          role_parent: assignment?.roleParent ?? false,
        }

        if (assignment?.id) {
          // Update existing
          const { error: updateError } = await supabase
            .from('tier_feature_assignments')
            .update({ included: true, updated_at: new Date().toISOString() })
            .eq('id', assignment.id)

          if (updateError) throw updateError
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('tier_feature_assignments')
            .insert(assignmentData)

          if (insertError) throw insertError
        }
      } else {
        // Remove assignment (set included to false or delete)
        if (assignment?.id) {
          const { error: updateError } = await supabase
            .from('tier_feature_assignments')
            .update({ included: false, updated_at: new Date().toISOString() })
            .eq('id', assignment.id)

          if (updateError) throw updateError
        }
      }

      // Refresh assignments
      await fetchAssignments()
      showSuccess(included ? 'Feature enabled for tier' : 'Feature disabled for tier')
    } catch (err: any) {
      console.error('Error toggling assignment:', err)
      const errorMessage = err.message || 'Failed to update tier assignment'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSavingAssignment(prev => ({ ...prev, [tierId]: false }))
    }
  }

  const updateAssignmentRoles = async (
    tierId: string,
    roles: { roleAdmin?: boolean; roleCoach?: boolean; roleParent?: boolean }
  ) => {
    if (isNew || !id) return
    const assignment = assignments[tierId]
    if (!assignment?.id) return

    setSavingAssignment(prev => ({ ...prev, [tierId]: true }))
    try {
      const role_admin = roles.roleAdmin ?? assignment.roleAdmin ?? true
      const role_coach = roles.roleCoach ?? assignment.roleCoach ?? true
      const role_parent = roles.roleParent ?? assignment.roleParent ?? false

      const { error: updateError } = await supabase
        .from('tier_feature_assignments')
        .update({
          role_admin,
          role_coach,
          role_parent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.id)

      if (updateError) throw updateError
      await fetchAssignments()
      showSuccess('Role access updated')
    } catch (err: any) {
      console.error('Error updating role access:', err)
      showError(err.message || 'Failed to update role access')
    } finally {
      setSavingAssignment(prev => ({ ...prev, [tierId]: false }))
    }
  }

  const updateAssignmentLimit = async (tierId: string, limitValue: number | null) => {
    if (isNew || !id) return
    const assignment = assignments[tierId]
    if (!assignment?.id) return

    setSavingAssignment(prev => ({ ...prev, [tierId]: true }))
    try {
      const { error: updateError } = await supabase
        .from('tier_feature_assignments')
        .update({
          limit_value: limitValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.id)

      if (updateError) throw updateError
      await fetchAssignments()
      showSuccess(t('platformAdmin.featureDetail.limitUpdated'))
    } catch (err: any) {
      showError(err.message || t('platformAdmin.featureDetail.limitUpdateError'))
    } finally {
      setSavingAssignment(prev => ({ ...prev, [tierId]: false }))
    }
  }

  useEffect(() => {
    fetchFeature()
    fetchTiers()
    fetchAssignments()
  }, [fetchFeature, fetchTiers, fetchAssignments])

  // Fetch suggested children when feature loads and it's root-level
  useEffect(() => {
    if (!isNew && feature.featureKey && !feature.parentFeatureKey) {
      fetchSuggestedChildren()
    }
  }, [feature.featureKey, feature.parentFeatureKey, isNew, fetchSuggestedChildren])

  // Track unsaved changes
  useEffect(() => {
    if (isNew || !originalFeature) {
      setShowUnsavedBanner(false)
      return
    }

    const hasChanges = 
      feature.displayName !== originalFeature.displayName ||
      feature.category !== originalFeature.category ||
      feature.featureType !== originalFeature.featureType ||
      feature.description !== originalFeature.description ||
      feature.rolloutStatus !== originalFeature.rolloutStatus

    setShowUnsavedBanner(hasChanges)
  }, [feature, originalFeature, isNew])

  // Reset original feature after successful save
  useEffect(() => {
    if (!saving && !error && originalFeature) {
      // Check if current feature matches what we just saved
      const matchesOriginal = 
        feature.displayName === originalFeature.displayName &&
        feature.category === originalFeature.category &&
        feature.featureType === originalFeature.featureType &&
        feature.description === originalFeature.description &&
        feature.rolloutStatus === originalFeature.rolloutStatus &&
        feature.unavailableGateAction === originalFeature.unavailableGateAction

      if (matchesOriginal) {
        setShowUnsavedBanner(false)
      }
    }
  }, [saving, error, feature, originalFeature])

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!showUnsavedBanner) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [showUnsavedBanner])

  const handleSave = async (): Promise<boolean> => {
    if (!feature.featureKey || !feature.displayName) {
      setError('Feature key and display name are required')
      return false
    }

    // Validate feature key format
    if (!/^[a-z0-9_]+$/.test(feature.featureKey)) {
      setError('Feature key must contain only lowercase letters, numbers, and underscores')
      return false
    }

    setSaving(true)
    setError(null)

    try {
      if (isNew) {
        // Validate parent exists if set
        if (feature.parentFeatureKey) {
          const { data: parentExists, error: parentError } = await supabase
            .from('feature_entitlements')
            .select('id, archived_at')
            .eq('feature_key', feature.parentFeatureKey)
            .single()

          if (parentError || !parentExists) {
            setError(`Parent feature "${feature.parentFeatureKey}" not found`)
            setSaving(false)
            return false
          }

          if (parentExists.archived_at) {
            setError(`Parent feature "${feature.parentFeatureKey}" is archived`)
            setSaving(false)
            return false
          }
        }

        // Check if feature_key already exists
        const { data: existing } = await supabase
          .from('feature_entitlements')
          .select('id')
          .eq('feature_key', feature.featureKey)
          .single()

        if (existing) {
          setError(`Feature key "${feature.featureKey}" already exists`)
          setSaving(false)
          return false
        }

        const insertData: Database['public']['Tables']['feature_entitlements']['Insert'] = {
          feature_key: feature.featureKey,
          display_name: feature.displayName,
          category: feature.category!,
          feature_type: feature.featureType!,
          description: feature.description || null,
          rollout_status: feature.rolloutStatus || 'live',
          unavailable_gate_action: feature.unavailableGateAction || 'overlay',
          is_system_feature: feature.isSystemFeature ?? false,
          platform_admin_only: feature.platformAdminOnly ?? false,
          parent_feature_key: feature.parentFeatureKey || null,
        }
        const { data, error: createError } = await supabase
          .from('feature_entitlements')
          .insert(insertData)
          .select()
          .single()

        if (createError) {
          if (createError.code === '23505') {
            // Unique constraint violation
            throw new Error(`Feature key "${feature.featureKey}" already exists`)
          }
          throw createError
        }

        if (data) {
          const newId = (data as { id: string }).id
          
          // Clear feature gate cache on create
          const { clearFeatureGateCache } = await import('../../lib/featureGate/api')
          clearFeatureGateCache()

          if (feature.isSystemFeature) {
            // Auto-assign to all tiers for system features
            // Transaction safety: If any assignment fails, we still have the feature created
            // but we'll show a warning if assignments partially fail
            const assignmentPromises = tiers.map(async (tier) => {
              const { error: assignError } = await supabase.from('tier_feature_assignments').insert({
                license_tier_id: tier.id,
                feature_entitlement_id: newId,
                included: true,
                role_admin: true,
                role_coach: true,
                role_parent: false,
              })
              if (assignError) {
                console.error(`Failed to assign feature to tier ${tier.tierKey}:`, assignError)
                return { tier: tier.tierKey, error: assignError }
              }
              return null
            })
            const assignmentResults = await Promise.all(assignmentPromises)
            const failedAssignments = assignmentResults.filter((r): r is { tier: string; error: any } => r !== null)
            if (failedAssignments.length > 0) {
              showError(`Feature created but failed to assign to ${failedAssignments.length} tier(s). Please assign manually.`)
            }
          }
          showSuccess('Feature created successfully!')
          navigate(getLink(RouteKeys.PLATFORM_LICENSE_FEATURE_DETAIL, { id: newId }))
          return true
        }
        return false
      } else {
        // Check if trying to change status of locked feature
        if (feature.isToggleable === false && originalFeature && feature.rolloutStatus !== originalFeature.rolloutStatus) {
          setError('Cannot change status of locked feature')
          showError(
            `Cannot change status of "${feature.displayName}". ` +
            (feature.lockReason || 'This feature is required for platform functionality.')
          )
          return false
        }

        // Feature key is immutable - prevent updates
        if (feature.featureKey !== originalFeature?.featureKey) {
          setError('Feature key cannot be changed after creation')
          setSaving(false)
          return false
        }

        // Validate parent exists if changed
        if (feature.parentFeatureKey !== originalFeature?.parentFeatureKey && feature.parentFeatureKey) {
          const { data: parentExists, error: parentError } = await supabase
            .from('feature_entitlements')
            .select('id, archived_at')
            .eq('feature_key', feature.parentFeatureKey)
            .single()

          if (parentError || !parentExists) {
            setError(`Parent feature "${feature.parentFeatureKey}" not found`)
            setSaving(false)
            return false
          }

          if (parentExists.archived_at) {
            setError(`Parent feature "${feature.parentFeatureKey}" is archived`)
            setSaving(false)
            return false
          }
        }

        const updateData: Database['public']['Tables']['feature_entitlements']['Update'] = {
          display_name: feature.displayName,
          category: feature.category,
          feature_type: feature.featureType,
          description: feature.description || null,
          unavailable_gate_action: feature.unavailableGateAction || 'overlay',
          is_system_feature: feature.isSystemFeature ?? false,
          platform_admin_only: feature.platformAdminOnly ?? false,
          parent_feature_key: feature.parentFeatureKey || null,
          // Only update rollout_status if feature is toggleable
          ...(feature.isToggleable !== false ? { rollout_status: feature.rolloutStatus } : {}),
        }
        const { error: updateError } = await supabase
          .from('feature_entitlements')
          .update(updateData)
          .eq('id', id!)

        if (updateError) throw updateError

        // Clear feature gate cache on update
        const { clearFeatureGateCache } = await import('../../lib/featureGate/api')
        clearFeatureGateCache()

        // When marking as system feature, backfill assignments for all active tiers
        // Transaction safety: If assignments fail, feature update still succeeds
        // but we'll show a warning
        if (feature.isSystemFeature && !originalFeature?.isSystemFeature) {
          const assignmentPromises = tiers.map(async (tier) => {
            const { error: assignError } = await supabase.from('tier_feature_assignments').upsert(
              {
                license_tier_id: tier.id,
                feature_entitlement_id: id!,
                included: true,
                role_admin: true,
                role_coach: true,
                role_parent: false,
              },
              { onConflict: 'license_tier_id,feature_entitlement_id' }
            )
            if (assignError) {
              console.error(`Failed to assign feature to tier ${tier.tierKey}:`, assignError)
              return { tier: tier.tierKey, error: assignError }
            }
            return null
          })
          const assignmentResults = await Promise.all(assignmentPromises)
          const failedAssignments = assignmentResults.filter((r): r is { tier: string; error: any } => r !== null)
          if (failedAssignments.length > 0) {
            showError(`Feature updated but failed to assign to ${failedAssignments.length} tier(s). Please assign manually.`)
          } else {
            await fetchAssignments()
          }
        }

        // Update original feature after successful save
        setOriginalFeature(feature)
        
        // Save all pending limit changes
        const limitPromises = Object.entries(pendingLimits).map(async ([tierId, limitValue]) => {
          const assignment = assignments[tierId]
          if (assignment?.id && limitValue !== assignment.limitValue) {
            await updateAssignmentLimit(tierId, limitValue)
          }
        })
        await Promise.all(limitPromises)
        
        showSuccess('Feature updated successfully!')
        return true
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save feature'
      setError(errorMessage)
      showError(errorMessage)
      return false
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="pa-skeleton" style={{ height: '24px', width: '200px', margin: '0 auto 1rem' }} />
            <div className="pa-skeleton" style={{ height: '16px', width: '400px', margin: '0 auto' }} />
          </div>
        </Card>
      </div>
    )
  }

  if (error && !isNew && !feature.featureKey) {
    return (
      <div>
        <PageHeader title="Error" />
        <ErrorState
          title="Failed to Load Feature"
          message={error}
          onRetry={() => {
            setError(null)
            fetchFeature()
          }}
          retryLabel="Retry"
        />
        <div style={{ marginTop: 'var(--pa-space-4)' }}>
          <Button
            variant="secondary"
            onClick={() => navigate(getLink(RouteKeys.PLATFORM_LICENSE_FEATURES))}
          >
            Back to Features
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Create Feature' : feature.displayName || 'Feature'}
        subtitle={isNew ? 'Add a new feature to the catalog' : `Manage ${feature.displayName}`}
        actions={
          <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2">
            {!isNew && (
              <Button 
                variant="ghost" 
                onClick={() => navigate(getLink(RouteKeys.PLATFORM_LICENSE_FEATURES))}
                className="w-full sm:w-auto min-h-[44px]"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Back to Features
              </Button>
            )}
            {isNew && (
              <Button variant="blue" onClick={() => navigate('/platform-admin/licenses/features')} className="w-full sm:w-auto min-h-[44px]">
                Cancel
              </Button>
            )}
            {!isNew && (
              <Button 
                variant="blue" 
                onClick={async () => {
                  const success = await handleSave()
                  if (success) {
                    // Small delay to show the success toast before navigating
                    setTimeout(() => navigate('/platform-admin/licenses/features'), 500)
                  }
                }} 
                disabled={saving}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {saving ? 'Saving...' : 'Save and Go Back'}
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full sm:w-auto min-h-[44px]"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {saving && <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>sync</span>}
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

      {/* Lock Status Banner */}
      {!isNew && (feature.isToggleable === false || feature.isRemovable === false) && (
        <div 
          className="pa-card pa-mb-4" 
          style={{ 
            borderLeft: '3px solid var(--pa-warning)', 
            background: 'var(--pa-warning-bg)',
            padding: 'var(--pa-space-4)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-3">
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)', fontSize: '24px' }}>
              lock
            </span>
            <div style={{ flex: 1 }}>
              <div className="pa-body-m" style={{ fontWeight: 600, marginBottom: 'var(--pa-space-1)' }}>
                This feature is locked
              </div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                {feature.lockReason || 'This feature is required for platform functionality and cannot be modified.'}
              </div>
              {feature.isToggleable === false && (
                <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: 'var(--pa-space-1)' }}>
                  • Status cannot be changed
                </div>
              )}
              {feature.isRemovable === false && (
                <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: 'var(--pa-space-1)' }}>
                  • Cannot be removed from license tiers
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUnsavedBanner && (
        <div 
          className="pa-card pa-mb-4" 
          style={{ 
            borderLeft: '3px solid var(--pa-warning)', 
            background: 'var(--pa-warning-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--pa-space-3) var(--pa-space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--pa-warning)' }}>
              edit
            </span>
            <div>
              <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                You have unsaved changes
              </div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginTop: '2px' }}>
                Save your changes to avoid losing them.
              </div>
            </div>
          </div>
          <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2">
            <Button
              variant="ghost"
              size="dense"
              onClick={() => {
                if (originalFeature) {
                  setFeature(originalFeature)
                  setShowUnsavedBanner(false)
                }
              }}
              disabled={saving}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="dense"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-5)', alignItems: 'start' }}>
        {/* Feature Settings */}
        <Card title="Feature Settings">
          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Feature Key</label>
            <Input
              value={feature.featureKey || ''}
              onChange={(e) => setFeature({ ...feature, featureKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              placeholder="e.g., travel_details_page"
              disabled={!isNew}
            />
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
              Lowercase letters, numbers, and underscores only. Immutable after creation.
            </div>
          </div>

          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Display Name</label>
            <Input
              value={feature.displayName || ''}
              onChange={(e) => setFeature({ ...feature, displayName: e.target.value })}
              placeholder="e.g., Travel Details"
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Category</label>
            <Select
              value={feature.category || 'Scheduling & Calendar'}
              onChange={(e) => setFeature({ ...feature, category: e.target.value as any })}
              options={FEATURE_CATEGORIES_OPTIONS}
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-label pa-label--required">Feature Type</label>
            {!featureTypeOverride ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="pa-body-m" style={{ color: 'var(--pa-n700)' }}>
                  {feature.featureType || 'module'}
                </span>
                <button
                  type="button"
                  onClick={() => setFeatureTypeOverride(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--pa-primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    padding: 0,
                  }}
                  className="pa-body-s"
                >
                  Override
                </button>
              </div>
            ) : (
              <div>
                <Select
                  value={feature.featureType || 'module'}
                  onChange={(e) => {
                    setFeature({ ...feature, featureType: e.target.value as any })
                    setFeatureTypeOverride(false)
                  }}
                  options={FEATURE_TYPES_OPTIONS}
                />
                <button
                  type="button"
                  onClick={() => setFeatureTypeOverride(false)}
                  style={{
                    marginTop: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--pa-n500)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: 0,
                  }}
                  className="pa-body-xs"
                >
                  Cancel override
                </button>
              </div>
            )}
          </div>

          <div className="pa-form-group">
            <label className="pa-label">Description</label>
            <textarea
              className="pa-input pa-textarea"
              value={feature.description || ''}
              onChange={(e) => setFeature({ ...feature, description: e.target.value })}
              placeholder="Describe what this feature controls..."
              rows={3}
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-label">Parent Feature</label>
            <FeatureHierarchySelector
              currentFeatureKey={feature.featureKey || ''}
              currentParentKey={feature.parentFeatureKey}
              onChange={(parentKey) => setFeature({ ...feature, parentFeatureKey: parentKey })}
              disabled={!feature.featureKey}
            />
            <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginTop: '4px' }}>
              Child features automatically inherit unavailability from parent features. 
              If the parent is not available in a tier, children are also unavailable.
            </div>
          </div>

          <div className="pa-form-group">
            <label className="pa-label">
              Rollout Status
              {feature.isToggleable === false && (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--pa-warning)', marginLeft: 'var(--pa-space-2)', verticalAlign: 'middle' }}>
                  lock
                </span>
              )}
            </label>
            <Select
              value={feature.rolloutStatus || 'live'}
              onChange={(e) => setFeature({ ...feature, rolloutStatus: e.target.value as any })}
              disabled={feature.isToggleable === false}
              options={[
                { value: 'live', label: 'Live' },
                { value: 'beta', label: 'Beta' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
            {feature.isToggleable === false && (
              <div className="pa-helper-text" style={{ color: 'var(--pa-warning)' }}>
                This feature is locked and its status cannot be changed.
              </div>
            )}
          </div>

          <div className="pa-form-group">
            <label className="pa-label">Gate Action</label>
            <Select
              value={feature.unavailableGateAction || 'overlay'}
              onChange={(e) => setFeature({ ...feature, unavailableGateAction: e.target.value as any })}
              options={[
                { value: 'hide', label: 'Hide (Remove from navigation)' },
                { value: 'disable', label: 'Disable (Show but grayed out)' },
                { value: 'overlay', label: 'Overlay (Show upgrade prompt)' },
                { value: 'modal', label: 'Modal (Show in popup)' },
                { value: 'paywall', label: 'Paywall (Redirect to billing)' },
                { value: 'custom', label: 'Custom (Developer-defined)' },
              ]}
            />
            <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginTop: '4px' }}>
              How the UI responds when a user doesn't have access to this feature.
            </div>
          </div>

            <div className="pa-form-group">
            <div className="pa-flex pa-items-start pa-gap-3">
              <Checkbox
                checked={feature.isSystemFeature ?? false}
                onChange={(e) => setFeature({ ...feature, isSystemFeature: e.target.checked })}
              />
              <div>
                <label htmlFor="is-system-feature" className="pa-label" style={{ marginBottom: 'var(--pa-space-1)' }}>
                  System feature (always available for all license tiers)
                </label>
                <div className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>
                  When enabled, this feature is available for every license tier, including any new tiers created later.
                  You do not need to assign it to tiers manually.
                </div>
              </div>
            </div>
          </div>

          <div className="pa-form-group">
            <div className="pa-flex pa-items-start pa-gap-3">
              <Checkbox
                checked={feature.platformAdminOnly ?? false}
                onChange={(e) => setFeature({ ...feature, platformAdminOnly: e.target.checked })}
              />
              <div>
                <label htmlFor="platform-admin-only" className="pa-label" style={{ marginBottom: 'var(--pa-space-1)' }}>
                  Not available for users (Platform Admin only)
                </label>
                <div className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>
                  When enabled, this feature is only for platform admins. It is not exposed to org admins, coaches, or parents.
                </div>
              </div>
            </div>
          </div>

          {/* Developer snippet */}
          {!isNew && feature.featureKey && (
            <div className="pa-form-group">
              <label className="pa-label">Developer Snippet</label>
              <div className="pa-card" style={{ background: 'var(--pa-n50)', padding: 'var(--pa-space-3)' }}>
                <code className="pa-mono" style={{ fontSize: '12px' }}>
                  {`"feature_key": "${feature.featureKey}"`}
                </code>
                <Button
                  variant="ghost"
                  size="dense"
                  onClick={() => navigator.clipboard.writeText(`"feature_key": "${feature.featureKey}"`)}
                  style={{ marginTop: 'var(--pa-space-2)' }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Tier Assignments */}
        <Card title="Tier Assignments">
          <p className="pa-body-s pa-text-muted" style={{ marginBottom: 'var(--pa-space-4)' }}>
            Configure how this feature is assigned to each license tier.
          </p>

          {tiers.map((tier) => {
            const assignment = assignments[tier.id]
            const included = assignment?.included ?? false
            const isSaving = savingAssignment[tier.id] || false

            return (
              <div
                key={tier.id}
                className={`pa-tier-assignment-card pa-mb-3 ${included ? 'pa-tier-assignment-card--included' : ''}`}
              >
                <div className="pa-flex pa-items-start pa-justify-between pa-gap-3">
                  <div className="pa-tier-assignment-card__header">
                    <Checkbox
                      checked={included}
                      onChange={(e) => {
                        const newValue = e.target.checked
                        if (feature.isToggleable === false && !newValue) {
                          showError(
                            `Cannot remove "${feature.displayName}" from license tiers. ` +
                            (feature.lockReason || 'This feature is required for platform functionality.')
                          )
                          return
                        }
                        toggleTierAssignment(tier.id, newValue)
                      }}
                      disabled={isSaving || isNew || (feature.isToggleable === false && !included)}
                    />
                    <div className="pa-tier-assignment-card__main">
                      <div className="pa-flex pa-items-center pa-gap-2">
                        <h4 className="pa-tier-assignment-card__title">{tier.tierName}</h4>
                        {feature.isToggleable === false && included && (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '16px', color: 'var(--pa-warning)', cursor: 'help' }}
                            title="This feature is locked and cannot be removed from this tier"
                          >
                            lock
                          </span>
                        )}
                      </div>
                      <p className="pa-tier-assignment-card__key">{tier.tierKey}</p>
                    </div>
                  </div>
                  {isSaving && (
                    <span className="material-symbols-outlined pa-spin" style={{ fontSize: '18px', color: 'var(--pa-n500)', flexShrink: 0 }} aria-hidden>
                      sync
                    </span>
                  )}
                </div>

                {included && assignment && (
                  <>
                    <hr className="pa-tier-assignment-card__divider" />
                    <div className="pa-tier-assignment-card__details">
                      {feature.featureType === 'limit' && (
                        <div className="pa-form-group" style={{ marginBottom: 'var(--pa-space-4)' }}>
                          <label className="pa-label" style={{ fontSize: '12px', marginBottom: 'var(--pa-space-2)' }}>
                            {t('platformAdmin.featureDetail.limitLabel')}
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="999999"
                            step="1"
                            value={pendingLimits[tier.id] ?? assignment.limitValue ?? ''}
                            onChange={(e) => {
                              const value = e.target.value
                              const numValue = value === '' ? null : parseInt(value, 10)
                              if (numValue !== null && (Number.isNaN(numValue) || numValue < 0 || numValue > 999999)) {
                                return
                              }
                              setPendingLimits(prev => ({ ...prev, [tier.id]: numValue }))
                            }}
                            placeholder="0"
                            helper={t('platformAdmin.featureDetail.limitHelper')}
                            disabled={isSaving || isNew}
                            style={{ maxWidth: '180px' }}
                          />
                        </div>
                      )}
                      <div className="pa-form-group" style={{ marginBottom: 0 }}>
                        <label className="pa-label" style={{ fontSize: '12px', marginBottom: 'var(--pa-space-2)' }}>
                          Role Access
                        </label>
                        <div className="pa-flex pa-flex-wrap pa-gap-3">
                          <Checkbox
                            checked={assignment.roleAdmin ?? true}
                            onChange={(e) => updateAssignmentRoles(tier.id, { roleAdmin: e.target.checked })}
                            disabled={isSaving || isNew}
                            label="Admin"
                          />
                          <Checkbox
                            checked={assignment.roleCoach ?? true}
                            onChange={(e) => updateAssignmentRoles(tier.id, { roleCoach: e.target.checked })}
                            disabled={isSaving || isNew}
                            label="Coach"
                          />
                          <Checkbox
                            checked={assignment.roleParent ?? false}
                            onChange={(e) => updateAssignmentRoles(tier.id, { roleParent: e.target.checked })}
                            disabled={isSaving || isNew}
                            label="Parent"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {included && !isNew && (
                  <div className="pa-tier-assignment-card__footer">
                    <button
                      type="button"
                      className="pa-tier-assignment-card__configure"
                      onClick={() => navigate(`/platform-admin/licenses/tiers/${tier.id}#feature-${feature.id}`)}
                      disabled={isSaving}
                    >
                      Configure Details
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {tiers.length === 0 && (
            <div className="pa-body-s pa-text-muted" style={{ textAlign: 'center', padding: 'var(--pa-space-5)' }}>
              No active license tiers. Create a tier first.
            </div>
          )}
        </Card>
      </div>

      {/* Suggested Children (only for root-level features) */}
      {!isNew && feature.featureKey && !feature.parentFeatureKey && (
        <Card title="Suggested Child Features">
          <p className="pa-body-s pa-text-muted" style={{ marginBottom: 'var(--pa-space-4)' }}>
            These features could logically be children of "{feature.displayName}". 
            Child features automatically inherit unavailability from their parent.
          </p>

            {loadingSuggestions && (
              <div style={{ textAlign: 'center', padding: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined pa-spin" style={{ fontSize: '24px', color: 'var(--pa-n500)' }}>
                  sync
                </span>
                <p className="pa-body-s pa-text-muted" style={{ marginTop: 'var(--pa-space-2)' }}>
                  Loading suggestions...
                </p>
              </div>
            )}

            {!loadingSuggestions && suggestedChildren.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--pa-space-5)', background: 'var(--pa-n50)', borderRadius: 'var(--pa-radius-md)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--pa-n400)' }}>
                  check_circle
                </span>
                <p className="pa-body-s pa-text-muted" style={{ marginTop: 'var(--pa-space-2)' }}>
                  No suggested children found. Features in the same category without parents will appear here.
                </p>
              </div>
            )}

            {!loadingSuggestions && suggestedChildren.length > 0 && (
              <div style={{ display: 'grid', gap: 'var(--pa-space-3)' }}>
                {suggestedChildren.map((child) => {
                  const isAdding = addingChild[child.featureKey] || false

                  return (
                    <div
                      key={child.featureKey}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 'var(--pa-space-3)',
                        padding: 'var(--pa-space-3)',
                        border: '1px solid var(--pa-n200)',
                        borderRadius: 'var(--pa-radius-md)',
                        background: 'var(--pa-n50)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginBottom: 'var(--pa-space-1)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--pa-n500)' }}>
                            subdirectory_arrow_right
                          </span>
                          <h4 className="pa-body-m" style={{ fontWeight: 600, margin: 0 }}>
                            {child.displayName}
                          </h4>
                        </div>
                        <p className="pa-mono" style={{ fontSize: '11px', color: 'var(--pa-n600)', marginBottom: 'var(--pa-space-1)' }}>
                          {child.featureKey}
                        </p>
                        {child.description && (
                          <p className="pa-body-s" style={{ color: 'var(--pa-n600)', margin: 0 }}>
                            {child.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--pa-space-2)', marginTop: 'var(--pa-space-2)' }}>
                          <span className="pa-badge" style={{ fontSize: '11px' }}>
                            {child.category}
                          </span>
                          <span className="pa-badge" style={{ fontSize: '11px', background: 'var(--pa-primary-50)', color: 'var(--pa-primary-700)' }}>
                            {child.featureType}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="dense"
                        onClick={() => handleAddChild(child.featureKey, child.id)}
                        disabled={isAdding}
                        style={{ flexShrink: 0 }}
                      >
                        {isAdding ? (
                          <>
                            <span className="material-symbols-outlined pa-spin" style={{ fontSize: '16px', marginRight: 'var(--pa-space-1)' }}>
                              sync
                            </span>
                            Adding...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: 'var(--pa-space-1)' }}>
                              add
                            </span>
                            Add as Child
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {!loadingSuggestions && suggestedChildren.length > 0 && (
              <div style={{ marginTop: 'var(--pa-space-4)', padding: 'var(--pa-space-3)', background: 'var(--pa-info-bg)', borderRadius: 'var(--pa-radius-md)', border: '1px solid var(--pa-info)' }}>
                <div style={{ display: 'flex', gap: 'var(--pa-space-2)', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--pa-info)', flexShrink: 0 }}>
                    info
                  </span>
                  <p className="pa-body-s" style={{ color: 'var(--pa-n700)', margin: 0 }}>
                    When you add a child feature, it will automatically inherit tier availability from "{feature.displayName}". 
                    If this parent is unavailable in a tier, the child will also be unavailable.
                  </p>
                </div>
              </div>
            )}
        </Card>
      )}
    </div>
  )
}
