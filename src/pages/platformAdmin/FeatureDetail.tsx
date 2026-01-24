import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Input, Select, Badge, Checkbox } from '../../components/platformAdmin'
import { mapFeatureEntitlement, mapLicenseTier, mapTierFeatureAssignment } from '../../utils/domainMappers'
import type { FeatureEntitlement, LicenseTier, TierFeatureAssignment } from '../../types/domain/License'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'
import { showSuccess, showError } from '../../utils/toast'

const FEATURE_CATEGORIES_OPTIONS = FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat }))
const FEATURE_TYPES_OPTIONS = FEATURE_TYPES.map(type => ({ value: type, label: type }))

export default function FeatureDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [feature, setFeature] = useState<Partial<FeatureEntitlement>>({
    featureKey: '',
    displayName: '',
    category: 'Scheduling & Calendar',
    featureType: 'module',
    description: '',
    rolloutStatus: 'live',
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

  const fetchFeature = useCallback(async () => {
    if (isNew) return

    setLoading(true)
    try {
      const { data, error: featureError } = await supabase
        .from('feature_entitlements')
        .select('*')
        .eq('id', id!)
        .single()

      if (featureError) throw featureError
      if (data) {
        const mapped = mapFeatureEntitlement(data)
        setFeature(mapped)
        setOriginalFeature(mapped)
      }
    } catch (err: any) {
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
      ;(data || []).forEach((assignment) => {
        const mapped = mapTierFeatureAssignment(assignment)
        assignmentsMap[mapped.licenseTierId] = mapped
      })
      setAssignments(assignmentsMap)
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
    }
  }, [id, isNew])

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

  useEffect(() => {
    fetchFeature()
    fetchTiers()
    fetchAssignments()
  }, [fetchFeature, fetchTiers, fetchAssignments])

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
        feature.rolloutStatus === originalFeature.rolloutStatus

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
        type FeatureInsert = Database['public']['Tables']['feature_entitlements']['Insert']
        const insertData = {
          feature_key: feature.featureKey,
          display_name: feature.displayName,
          category: feature.category!,
          feature_type: feature.featureType!,
          description: feature.description || null,
          rollout_status: feature.rolloutStatus || 'live',
        } satisfies FeatureInsert
        const { data, error: createError } = await supabase
          .from('feature_entitlements')
          .insert(insertData)
          .select()
          .single()

        if (createError) throw createError

        if (data) {
          showSuccess('Feature created successfully!')
          navigate(`/platform-admin/licenses/features/${(data as any).id}`)
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

        type FeatureUpdate = Database['public']['Tables']['feature_entitlements']['Update']
        const updateData = {
          display_name: feature.displayName,
          category: feature.category,
          feature_type: feature.featureType,
          description: feature.description || null,
          // Only update rollout_status if feature is toggleable
          ...(feature.isToggleable !== false ? { rollout_status: feature.rolloutStatus } : {}),
        } satisfies FeatureUpdate
        const { error: updateError } = await supabase
          .from('feature_entitlements')
          .update(updateData)
          .eq('id', id!)

        if (updateError) throw updateError
        
        // Update original feature after successful save
        setOriginalFeature(feature)
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
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Create Feature' : feature.displayName || 'Feature'}
        subtitle={isNew ? 'Add a new feature to the catalog' : `Manage ${feature.displayName}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
            {!isNew && (
              <Button 
                variant="ghost" 
                onClick={() => navigate('/platform-admin/licenses/features')}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Back to Features
              </Button>
            )}
            {isNew && (
              <Button variant="secondary" onClick={() => navigate('/platform-admin/licenses/features')}>
                Cancel
              </Button>
            )}
            {!isNew && (
              <Button 
                variant="secondary" 
                onClick={async () => {
                  const success = await handleSave()
                  if (success) {
                    // Small delay to show the success toast before navigating
                    setTimeout(() => navigate('/platform-admin/licenses/features'), 500)
                  }
                }} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save and Go Back'}
              </Button>
            )}
            <Button variant="primary" onClick={handleSave} disabled={saving}>
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
          <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
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
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="dense"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      <div className="pa-grid pa-grid-2" style={{ gap: 'var(--pa-space-5)' }}>
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
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-4)' }}>
            Configure how this feature is assigned to each license tier.
          </div>

          {tiers.map((tier) => {
            const assignment = assignments[tier.id]
            const included = assignment?.included ?? false
            const isSaving = savingAssignment[tier.id] || false

            return (
              <div 
                key={tier.id} 
                className="pa-card pa-mb-3" 
                style={{ 
                  padding: 'var(--pa-space-4)',
                  border: included ? '1px solid var(--pa-success)' : '1px solid var(--pa-n100)',
                  backgroundColor: included ? 'var(--pa-success-bg)' : 'var(--pa-n50)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="pa-flex pa-items-center pa-justify-between">
                  <div style={{ flex: 1 }}>
                    <div className="pa-flex pa-items-center pa-gap-3">
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
                      <div style={{ flex: 1 }}>
                        <div className="pa-flex pa-items-center pa-gap-2">
                          <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
                            {tier.tierName}
                          </div>
                          {feature.isToggleable === false && included && (
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: '16px',
                                color: 'var(--pa-warning)',
                                cursor: 'help',
                              }}
                              title="This feature is locked and cannot be removed from this tier"
                            >
                              lock
                            </span>
                          )}
                        </div>
                        <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '2px' }}>
                          {tier.tierKey}
                        </div>
                      </div>
                    </div>

                    {included && assignment && (
                      <div style={{ 
                        marginTop: 'var(--pa-space-3)', 
                        paddingTop: 'var(--pa-space-3)', 
                        borderTop: '1px solid var(--pa-n200)',
                        marginLeft: '30px'
                      }}>
                        {feature.featureType === 'limit' && (
                          <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                            <strong>Limit:</strong> {assignment.limitValue ?? 'Not set'}
                          </div>
                        )}
                        {feature.featureType === 'permission' && (
                          <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                            <strong>Roles:</strong> {[
                              assignment.roleAdmin && 'Admin',
                              assignment.roleCoach && 'Coach',
                              assignment.roleParent && 'Parent',
                            ].filter(Boolean).join(', ') || 'None'}
                          </div>
                        )}
                        {feature.featureType !== 'limit' && feature.featureType !== 'permission' && (
                          <div className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>
                            Configured for this tier
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isSaving && (
                    <div style={{ marginLeft: 'var(--pa-space-3)' }}>
                      <span className="material-symbols-outlined pa-spin" style={{ 
                        fontSize: '18px',
                        color: 'var(--pa-n500)'
                      }}>
                        sync
                      </span>
                    </div>
                  )}
                </div>

                {included && !isNew && (
                  <div style={{ marginTop: 'var(--pa-space-3)', marginLeft: '30px' }}>
                    <Button
                      variant="ghost"
                      size="dense"
                      onClick={() => navigate(`/platform-admin/licenses/tiers/${tier.id}`)}
                      disabled={isSaving}
                    >
                      Configure Details
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {tiers.length === 0 && (
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)', textAlign: 'center', padding: 'var(--pa-space-5)' }}>
              No active license tiers. Create a tier first.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
