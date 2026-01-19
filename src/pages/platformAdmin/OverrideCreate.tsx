import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Input, Select, Checkbox } from '../../components/platformAdmin'
import Badge from '../../components/platformAdmin/Badge'
import { mapFeatureEntitlement } from '../../utils/domainMappers'
import type { FeatureEntitlement, CreateEntitlementOverrideRequest } from '../../types/licenseTiers.types'
import { validateFeatureDependencies, logAuditEvent } from '../../utils/licenseEntitlementsHelpers'

export default function OverrideCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [targetType, setTargetType] = useState<'organization' | 'user'>('organization')
  const [targetSearch, setTargetSearch] = useState('')
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [selectedTargetName, setSelectedTargetName] = useState('')
  const [features, setFeatures] = useState<FeatureEntitlement[]>([])
  const [selectedFeatureId, setSelectedFeatureId] = useState('')
  const [overrideAction, setOverrideAction] = useState<'enable' | 'disable' | 'set_limit'>('enable')
  const [limitValue, setLimitValue] = useState<number | null>(null)
  const [roleAdmin, setRoleAdmin] = useState<boolean | null>(null)
  const [roleCoach, setRoleCoach] = useState<boolean | null>(null)
  const [roleParent, setRoleParent] = useState<boolean | null>(null)
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchFeatures()
  }, [])

  const fetchFeatures = async () => {
    try {
      const { data, error: featuresError } = await supabase
        .from('feature_entitlements')
        .select('*')
        .is('archived_at', null)
        .order('display_name', { ascending: true })

      if (featuresError) throw featuresError
      setFeatures((data || []).map(row => mapFeatureEntitlement(row)) as any)
    } catch (err: any) {
      console.error('Error fetching features:', err)
    }
  }

  const searchTargets = useCallback(async () => {
    if (targetSearch.length < 2) {
      setSearchResults([])
      return
    }

    try {
      if (targetType === 'organization') {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .ilike('name', `%${targetSearch}%`)
          .limit(20)

        if (error) throw error
        setSearchResults((data || []).map((org: any) => ({ id: org.id, name: org.name })))
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, display_name')
          .or(`email.ilike.%${targetSearch}%,display_name.ilike.%${targetSearch}%`)
          .limit(20)

        if (error) throw error
        setSearchResults((data || []).map((user: any) => ({ id: user.id, name: user.display_name || user.email || '' })))
      }
    } catch (err: any) {
      console.error('Error searching targets:', err)
    }
  }, [targetType, targetSearch])

  useEffect(() => {
    const timeout = setTimeout(searchTargets, 300)
    return () => clearTimeout(timeout)
  }, [searchTargets])

  const handleSave = async () => {
    if (!selectedTargetId || !selectedFeatureId || !reason.trim()) {
      setError('Target, feature, and reason are required')
      return
    }

    // Validate limit value
    if (overrideAction === 'set_limit' && (limitValue === null || limitValue <= 0)) {
      setError('Limit value must be a positive integer')
      return
    }

    // Validate dependencies if enabling
    if (overrideAction === 'enable') {
      const validation = await validateFeatureDependencies(
        selectedTargetId,
        targetType,
        selectedFeatureId,
        overrideAction
      )

      if (!validation.valid && validation.missingDependencies) {
        setError(`Cannot enable feature: Missing required dependencies: ${validation.missingDependencies.join(', ')}`)
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const override: CreateEntitlementOverrideRequest = {
        target_type: targetType,
        target_id: selectedTargetId,
        feature_entitlement_id: selectedFeatureId,
        override_action: overrideAction,
        limit_value: overrideAction === 'set_limit' ? (limitValue && limitValue > 0 ? limitValue : null) : null,
        role_admin: overrideAction === 'enable' ? roleAdmin : null,
        role_coach: overrideAction === 'enable' ? roleCoach : null,
        role_parent: overrideAction === 'enable' ? roleParent : null,
        reason: reason.trim(),
        expires_at: expiresAt || undefined,
      }

      type OverrideInsert = Database['public']['Tables']['entitlement_overrides']['Insert']
      const overrideData = override as OverrideInsert
      const { data: createdOverride, error: createError } = await supabase
        .from('entitlement_overrides')
        .insert(overrideData)
        .select()
        .single()

      if (createError) throw createError

      // Log audit event
      if (createdOverride) {
        await logAuditEvent({
          action: 'create_entitlement_override',
          targetType: 'override',
          targetId: (createdOverride as any).id,
          afterState: createdOverride,
          reason: reason.trim(),
        })
      }

      navigate('/platform-admin/licenses/overrides')
    } catch (err: any) {
      setError(err.message || 'Failed to create override')
    } finally {
      setSaving(false)
    }
  }

  const selectedFeature = features.find(f => f.id === selectedFeatureId)

  return (
    <div>
      <PageHeader
        title="Create Override"
        subtitle="Override entitlements for an organization or user"
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
            <Button variant="secondary" onClick={() => navigate('/platform-admin/licenses/overrides')}>
              Cancel
            </Button>
            {step === 4 && (
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Creating...' : 'Create Override'}
              </Button>
            )}
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

      {/* Step indicator */}
      <div className="pa-card pa-mb-5">
        <div className="pa-flex pa-items-center pa-gap-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="pa-flex pa-items-center" style={{ flex: 1 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step >= s ? 'var(--pa-n900)' : 'var(--pa-n200)',
                  color: step >= s ? 'var(--pa-white)' : 'var(--pa-n500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                }}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background: step > s ? 'var(--pa-n900)' : 'var(--pa-n200)',
                    margin: '0 var(--pa-space-2)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        {/* Step 1: Choose target */}
        {step === 1 && (
          <div>
            <h3 className="pa-h3" style={{ marginBottom: 'var(--pa-space-4)' }}>Choose Target</h3>
            <div className="pa-form-group">
              <label className="pa-label">Target Type</label>
              <Select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as 'organization' | 'user')
                  setTargetSearch('')
                  setSelectedTargetId('')
                  setSelectedTargetName('')
                }}
                options={[
                  { value: 'organization', label: 'Organization' },
                  { value: 'user', label: 'User' },
                ]}
              />
            </div>
            <div className="pa-form-group">
              <label className="pa-label">Search {targetType === 'organization' ? 'Organization' : 'User'}</label>
              <div style={{ position: 'relative' }}>
                <Input
                  value={selectedTargetName || targetSearch}
                  onChange={(e) => {
                    setTargetSearch(e.target.value)
                    if (!e.target.value) {
                      setSelectedTargetId('')
                      setSelectedTargetName('')
                    }
                  }}
                  placeholder={`Search ${targetType === 'organization' ? 'organizations' : 'users'}...`}
                />
                {targetSearch.length >= 2 && searchResults.length > 0 && !selectedTargetId && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--pa-white)',
                      border: '1px solid var(--pa-n100)',
                      borderRadius: 'var(--pa-radius-s)',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: 'var(--pa-shadow-2)',
                    }}
                  >
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => {
                          setSelectedTargetId(result.id)
                          setSelectedTargetName(result.name)
                          setTargetSearch('')
                          setSearchResults([])
                        }}
                        style={{
                          padding: 'var(--pa-space-3)',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--pa-n100)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--pa-n50)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <div className="pa-body-m">{result.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedTargetId && (
              <div className="pa-card" style={{ background: 'var(--pa-success-bg)', marginTop: 'var(--pa-space-3)' }}>
                <div className="pa-body-m">Selected: {selectedTargetName}</div>
              </div>
            )}
            <div style={{ marginTop: 'var(--pa-space-5)' }}>
              <Button
                variant="primary"
                onClick={() => selectedTargetId && setStep(2)}
                disabled={!selectedTargetId}
              >
                Next: Select Feature
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select feature */}
        {step === 2 && (
          <div>
            <h3 className="pa-h3" style={{ marginBottom: 'var(--pa-space-4)' }}>Select Feature</h3>
            <div className="pa-form-group">
              <label className="pa-label">Feature</label>
              <Select
                value={selectedFeatureId}
                onChange={(e) => setSelectedFeatureId(e.target.value)}
                options={[
                  { value: '', label: 'Select a feature...' },
                  ...features.map(f => ({ value: f.id, label: `${f.display_name} (${f.category})` })),
                ]}
              />
            </div>
            {selectedFeature && (
              <div className="pa-card pa-mt-3" style={{ background: 'var(--pa-n50)' }}>
                <div className="pa-body-m" style={{ fontWeight: 600 }}>{selectedFeature.display_name}</div>
                <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
                  {selectedFeature.description || 'No description'}
                </div>
                <div className="pa-flex pa-gap-2 pa-mt-2">
                  <Badge variant="neutral">{selectedFeature.feature_type}</Badge>
                  <Badge variant="info">{selectedFeature.category}</Badge>
                </div>
              </div>
            )}
            <div style={{ marginTop: 'var(--pa-space-5)', display: 'flex', gap: 'var(--pa-space-3)' }}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => selectedFeatureId && setStep(3)}
                disabled={!selectedFeatureId}
              >
                Next: Configure Override
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Configure override */}
        {step === 3 && (
          <div>
            <h3 className="pa-h3" style={{ marginBottom: 'var(--pa-space-4)' }}>Configure Override</h3>
            <div className="pa-form-group">
              <label className="pa-label">Override Action</label>
              <Select
                value={overrideAction}
                onChange={(e) => setOverrideAction(e.target.value as any)}
                options={[
                  { value: 'enable', label: 'Enable' },
                  { value: 'disable', label: 'Disable' },
                  { value: 'set_limit', label: 'Set Limit' },
                ]}
              />
            </div>

            {overrideAction === 'set_limit' && (
              <div className="pa-form-group">
                <label className="pa-label">Limit Value</label>
                <Input
                  type="number"
                  value={limitValue || ''}
                  onChange={(e) => setLimitValue(e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="Enter limit"
                />
              </div>
            )}

            {overrideAction === 'enable' && selectedFeature?.feature_type === 'permission' && (
              <div className="pa-form-group">
                <label className="pa-label">Role Access</label>
                <div className="pa-flex pa-flex-col pa-gap-2">
                  <Checkbox
                    checked={roleAdmin ?? false}
                    onChange={(e) => setRoleAdmin(e.target.checked)}
                    label="Admin"
                  />
                  <Checkbox
                    checked={roleCoach ?? false}
                    onChange={(e) => setRoleCoach(e.target.checked)}
                    label="Coach"
                  />
                  <Checkbox
                    checked={roleParent ?? false}
                    onChange={(e) => setRoleParent(e.target.checked)}
                    label="Parent"
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: 'var(--pa-space-5)', display: 'flex', gap: 'var(--pa-space-3)' }}>
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Next: Review & Save
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review and reason */}
        {step === 4 && (
          <div>
            <h3 className="pa-h3" style={{ marginBottom: 'var(--pa-space-4)' }}>Review & Save</h3>
            <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-n50)' }}>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)' }}>Target</div>
              <div className="pa-body-m" style={{ fontWeight: 600 }}>{selectedTargetName}</div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-4)' }}>Feature</div>
              <div className="pa-body-m" style={{ fontWeight: 600 }}>{selectedFeature?.display_name}</div>
              <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-4)' }}>Action</div>
              <div className="pa-body-m">{overrideAction}</div>
            </div>

            <div className="pa-form-group">
              <label className="pa-label pa-label--required">Reason</label>
              <textarea
                className="pa-input pa-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this override is needed..."
                rows={4}
              />
            </div>

            <div className="pa-form-group">
              <label className="pa-label">Expiration Date (Optional)</label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 'var(--pa-space-5)', display: 'flex', gap: 'var(--pa-space-3)' }}>
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || !reason.trim()}>
                {saving ? 'Creating...' : 'Create Override'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
