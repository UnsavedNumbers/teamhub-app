import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Button, Input, Select, Badge } from '../../components/platformAdmin'
import { mapFeatureEntitlement, mapLicenseTier, mapTierFeatureAssignment } from '../../utils/domainMappers'
import type { FeatureEntitlement, LicenseTier, TierFeatureAssignment } from '../../types/domain/License'
import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../../utils/licenseTierConstants'

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
  const [tiers, setTiers] = useState<LicenseTier[]>([])
  const [assignments, setAssignments] = useState<Record<string, TierFeatureAssignment>>({})
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        setFeature(mapFeatureEntitlement(data))
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

  useEffect(() => {
    fetchFeature()
    fetchTiers()
    fetchAssignments()
  }, [fetchFeature, fetchTiers, fetchAssignments])

  const handleSave = async () => {
    if (!feature.featureKey || !feature.displayName) {
      setError('Feature key and display name are required')
      return
    }

    // Validate feature key format
    if (!/^[a-z0-9_]+$/.test(feature.featureKey)) {
      setError('Feature key must contain only lowercase letters, numbers, and underscores')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isNew) {
        const { data, error: createError } = await supabase
          .from('feature_entitlements')
          .insert({
            feature_key: feature.featureKey,
            display_name: feature.displayName,
            category: feature.category!,
            feature_type: feature.featureType!,
            description: feature.description || null,
            rollout_status: feature.rolloutStatus || 'live',
          })
          .select()
          .single()

        if (createError) throw createError

        if (data) {
          navigate(`/platform-admin/licenses/features/${data.id}`)
        }
      } else {
        const { error: updateError } = await supabase
          .from('feature_entitlements')
          .update({
            display_name: feature.displayName,
            category: feature.category,
            feature_type: feature.featureType,
            description: feature.description || null,
            rollout_status: feature.rolloutStatus,
          })
          .eq('id', id!)

        if (updateError) throw updateError
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save feature')
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
            <Button variant="secondary" onClick={() => navigate('/platform-admin/licenses/features')}>
              Cancel
            </Button>
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
            <Select
              value={feature.featureType || 'module'}
              onChange={(e) => setFeature({ ...feature, featureType: e.target.value as any })}
              options={FEATURE_TYPES_OPTIONS}
            />
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
            <label className="pa-label">Rollout Status</label>
            <Select
              value={feature.rolloutStatus || 'live'}
              onChange={(e) => setFeature({ ...feature, rolloutStatus: e.target.value as any })}
              options={[
                { value: 'live', label: 'Live' },
                { value: 'beta', label: 'Beta' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
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

            return (
              <div key={tier.id} className="pa-card pa-mb-3" style={{ padding: 'var(--pa-space-4)' }}>
                <div className="pa-flex pa-items-center pa-justify-between pa-mb-3">
                  <div>
                    <div className="pa-body-m" style={{ fontWeight: 600 }}>
                      {tier.tierName}
                    </div>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
                      {tier.tierKey}
                    </div>
                  </div>
                  <Badge variant={included ? 'success' : 'neutral'}>
                    {included ? 'Included' : 'Not Included'}
                  </Badge>
                </div>

                {included && assignment && (
                  <div style={{ paddingTop: 'var(--pa-space-3)', borderTop: '1px solid var(--pa-n100)' }}>
                    {feature.featureType === 'limit' && (
                      <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                        Limit: {assignment.limitValue ?? 'Not set'}
                      </div>
                    )}
                    {feature.featureType === 'permission' && (
                      <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                        Roles: {[
                          assignment.roleAdmin && 'Admin',
                          assignment.roleCoach && 'Coach',
                          assignment.roleParent && 'Parent',
                        ].filter(Boolean).join(', ') || 'None'}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="dense"
                  onClick={() => navigate(`/platform-admin/licenses/tiers/${tier.id}`)}
                  style={{ marginTop: 'var(--pa-space-2)' }}
                >
                  Edit in Tier
                </Button>
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
