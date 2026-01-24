import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { PageHeader, Card, Button, Input, Select, Checkbox } from '../../components/platformAdmin'
import Badge from '../../components/platformAdmin/Badge'
import { EntitySelect } from '../../components/common/EntitySelect'
import { mapFeatureEntitlement } from '../../utils/domainMappers'
import type { FeatureEntitlement, CreateEntitlementOverrideRequest } from '../../types/licenseTiers.types'
import { validateFeatureDependencies, logAuditEvent } from '../../utils/licenseEntitlementsHelpers'
import { showSuccess, showError } from '../../utils/toast'
import { useOffline } from '../../hooks/useOffline'
import { isDemoMode, assertNotDemoMode } from '../../utils/demoMode'
import { useAuth } from '../../hooks/useAuth'
import { canPerformAction } from '../../utils/platformAdminPermissions'
import type { PlatformAdminRole } from '../../types/platformAdmin.types'

const SESSION_STORAGE_KEY = 'override_create_state'

export default function OverrideCreate() {
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const demoMode = isDemoMode()
  const { profile } = useAuth()
  
  // Get admin role for permission checks (Issue 7)
  const adminRole = useMemo<PlatformAdminRole | null>(() => {
    return profile?.platformAdminRole ?? null
  }, [profile?.platformAdminRole])
  
  const canCreate = useMemo(() => {
    return adminRole ? canPerformAction(adminRole, 'manage_overrides') : false
  }, [adminRole])
  
  const [step, setStep] = useState(1)
  const [targetType, setTargetType] = useState<'organization' | 'user'>('organization')
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [selectedTargetOption, setSelectedTargetOption] = useState<{ id: string; name: string } | null>(null)
  const [features, setFeatures] = useState<FeatureEntitlement[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(true)
  const [featuresError, setFeaturesError] = useState<string | null>(null)
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

  // Restore form state from session storage (Issue 10)
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        if (state.step) setStep(state.step)
        if (state.targetType) setTargetType(state.targetType)
        if (state.selectedTargetId) setSelectedTargetId(state.selectedTargetId)
        if (state.selectedTargetName) {
          setSelectedTargetOption({ id: state.selectedTargetId, name: state.selectedTargetName })
        }
        if (state.selectedFeatureId) setSelectedFeatureId(state.selectedFeatureId)
        if (state.overrideAction) setOverrideAction(state.overrideAction)
        if (state.limitValue !== undefined) setLimitValue(state.limitValue)
        if (state.roleAdmin !== undefined) setRoleAdmin(state.roleAdmin)
        if (state.roleCoach !== undefined) setRoleCoach(state.roleCoach)
        if (state.roleParent !== undefined) setRoleParent(state.roleParent)
        if (state.reason) setReason(state.reason)
        if (state.expiresAt) setExpiresAt(state.expiresAt)
      } catch (err) {
        console.error('Failed to restore form state:', err)
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
  }, [])

  // Save form state to session storage on changes (Issue 10)
  useEffect(() => {
    const state = {
      step,
      targetType,
      selectedTargetId,
      selectedTargetName: selectedTargetOption?.name,
      selectedFeatureId,
      overrideAction,
      limitValue,
      roleAdmin,
      roleCoach,
      roleParent,
      reason,
      expiresAt,
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state))
  }, [step, targetType, selectedTargetId, selectedTargetOption, selectedFeatureId, overrideAction, limitValue, roleAdmin, roleCoach, roleParent, reason, expiresAt])

  useEffect(() => {
    fetchFeatures()
  }, [])

  const fetchFeatures = async () => {
    if (isOffline) {
      setFeaturesError('You appear to be offline. Please reconnect and try again.')
      setFeaturesLoading(false)
      return
    }

    setFeaturesLoading(true)
    setFeaturesError(null)

    try {
      const { data, error: featuresError } = await supabase
        .from('feature_entitlements')
        .select('*')
        .is('archived_at', null)
        .order('display_name', { ascending: true })

      if (featuresError) {
        throw featuresError
      }
      setFeatures((data || []).map(row => mapFeatureEntitlement(row)) as any)
      setFeaturesError(null)
    } catch (err: any) {
      console.error('Error fetching features:', err)
      setFeaturesError(err.message || 'Failed to load features. Please try again.')
    } finally {
      setFeaturesLoading(false)
    }
  }


  const handleSave = async () => {
    // Block in demo mode
    try {
      assertNotDemoMode('create override')
    } catch (err: any) {
      setError(err.message)
      showError(err.message)
      return
    }

    // Block if offline
    if (isOffline) {
      const errorMsg = 'You appear to be offline. Please reconnect and try again.'
      setError(errorMsg)
      showError(errorMsg)
      return
    }

    // Validation
    if (!selectedTargetId || !selectedFeatureId || !reason.trim()) {
      setError('Target, feature, and reason are required')
      return
    }

    // Validate limit value
    if (overrideAction === 'set_limit' && (limitValue === null || limitValue <= 0)) {
      setError('Limit value must be a positive integer')
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(selectedTargetId!)) {
      setError('Invalid target ID format')
      return
    }
    if (!uuidRegex.test(selectedFeatureId)) {
      setError('Invalid feature ID format')
      return
    }

    // Validate dependencies if enabling
    if (overrideAction === 'enable') {
      try {
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
      } catch (err: any) {
        console.error('Error validating dependencies:', err)
        // Continue - dependency validation is best effort
      }
    }

    setSaving(true)
    setError(null)

    try {
      const override: CreateEntitlementOverrideRequest = {
        target_type: targetType,
        target_id: selectedTargetId!,
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

      // Clear session storage on success (Issue 10)
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      
      showSuccess('Override created successfully!')
      navigate('/platform-admin/licenses/overrides')
    } catch (err: any) {
      let errorMessage = 'Failed to create override'
      let existingOverrideId: string | null = null
      
      if (err.code === '23505') {
        // Duplicate override (Issue 4) - try to find existing override
        errorMessage = 'An override for this target and feature already exists.'
        
        // Try to find the existing override
        try {
          const { data: existing } = await supabase
            .from('admin_entitlement_overrides_list')
            .select('id')
            .eq('target_type', targetType)
            .eq('target_id', selectedTargetId)
            .eq('feature_entitlement_id', selectedFeatureId)
            .eq('override_action', overrideAction)
            .eq('status', 'active')
            .single()
          
          if (existing) {
            existingOverrideId = existing.id
            errorMessage = 'An override for this target and feature already exists. Would you like to view it?'
          }
        } catch (lookupErr) {
          // Ignore lookup errors
        }
      } else if (err.code === '23503') {
        errorMessage = 'Invalid target or feature. Please verify your selections.'
      } else if (err.code === '23502') {
        errorMessage = 'Missing required fields. Please check your input.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      showError(errorMessage)
      
      // If we found an existing override, show link to view it
      if (existingOverrideId) {
        setTimeout(() => {
          if (window.confirm('Would you like to view the existing override?')) {
            navigate(`/platform-admin/licenses/overrides/${existingOverrideId}`)
          }
        }, 100)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleClearSavedProgress = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setStep(1)
    setTargetType('organization')
    setSelectedTargetId(null)
    setSelectedTargetOption(null)
    setSelectedFeatureId('')
    setOverrideAction('enable')
    setLimitValue(null)
    setRoleAdmin(null)
    setRoleCoach(null)
    setRoleParent(null)
    setReason('')
    setExpiresAt('')
    showSuccess('Saved progress cleared')
  }

  const selectedFeature = features.find(f => f.id === selectedFeatureId)

  return (
    <div>
      {/* Demo mode indicator */}
      {demoMode && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-info-bg)',
            border: '1px solid var(--pa-info)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-info)' }}>
              info
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              Demo mode: Changes will not be saved to the database.
            </span>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div
          className="pa-card pa-mb-4"
          style={{
            background: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            padding: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>
              wifi_off
            </span>
            <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
              You appear to be offline. Please reconnect and try again.
            </span>
          </div>
        </div>
      )}

      <PageHeader
        title="Create Override"
        subtitle="Override entitlements for an organization or user"
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
            <Button variant="blue" onClick={() => navigate('/platform-admin/licenses/overrides')}>
              Cancel
            </Button>
            {sessionStorage.getItem(SESSION_STORAGE_KEY) && (
              <Button variant="ghost" onClick={handleClearSavedProgress}>
                Clear Saved Progress
              </Button>
            )}
            {step === 4 && (
              <Button 
                variant="primary" 
                onClick={handleSave} 
                disabled={saving || demoMode || isOffline || !canCreate}
                title={!canCreate ? 'You do not have permission to create overrides' : undefined}
              >
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
                  setSelectedTargetId(null)
                  setSelectedTargetOption(null)
                }}
                options={[
                  { value: 'organization', label: 'Organization' },
                  { value: 'user', label: 'User' },
                ]}
              />
            </div>
            <EntitySelect
              label={`Search ${targetType === 'organization' ? 'Organization' : 'User'}`}
              value={selectedTargetId}
              onChange={(id, option) => {
                setSelectedTargetId(id)
                setSelectedTargetOption(option ? { id: option.id, name: option.label } : null)
              }}
              fetchOptions={async (query) => {
                if (isOffline) return []
                
                if (targetType === 'organization') {
                  const { data, error } = await supabase
                    .from('organizations')
                    .select('id, name')
                    .ilike('name', `%${query}%`)
                    .limit(20)
                  
                  if (error) throw error
                  return (data || []).map((org: any) => ({
                    id: org.id,
                    label: org.name,
                  }))
                } else {
                  const { data, error } = await supabase
                    .from('users')
                    .select('id, email, display_name')
                    .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
                    .limit(20)
                  
                  if (error) throw error
                  return (data || []).map((user: any) => ({
                    id: user.id,
                    label: user.display_name || user.email || '',
                  }))
                }
              }}
              getOptionById={async (id) => {
                if (isOffline) return null
                
                if (targetType === 'organization') {
                  const { data, error } = await supabase
                    .from('organizations')
                    .select('id, name')
                    .eq('id', id)
                    .single()
                  
                  if (error || !data) return null
                  return { id: data.id, label: data.name }
                } else {
                  const { data, error } = await supabase
                    .from('users')
                    .select('id, email, display_name')
                    .eq('id', id)
                    .single()
                  
                  if (error || !data) return null
                  return {
                    id: data.id,
                    label: data.display_name || data.email || '',
                  }
                }
              }}
              placeholder={`Search ${targetType === 'organization' ? 'organizations' : 'users'}...`}
              disabled={isOffline}
              required
            />
            {selectedTargetOption && (
              <div className="pa-card" style={{ background: 'var(--pa-success-bg)', marginTop: 'var(--pa-space-3)' }}>
                <div className="pa-body-m">Selected: {selectedTargetOption.name}</div>
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
            {featuresLoading && (
              <div className="pa-card pa-mb-4" style={{ padding: 'var(--pa-space-4)', textAlign: 'center' }}>
                <div className="pa-body-m" style={{ color: 'var(--pa-n700)' }}>Loading features...</div>
              </div>
            )}
            {featuresError && (
              <div className="pa-card pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)', background: 'var(--pa-danger-bg)', padding: 'var(--pa-space-3)' }}>
                <div className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>{featuresError}</div>
                <Button variant="secondary" size="dense" onClick={fetchFeatures} style={{ marginTop: 'var(--pa-space-2)' }}>
                  Retry
                </Button>
              </div>
            )}
            <div className="pa-form-group">
              <label className="pa-label">Feature</label>
              <Select
                value={selectedFeatureId}
                onChange={(e) => setSelectedFeatureId(e.target.value)}
                disabled={featuresLoading || !!featuresError || isOffline}
                options={[
                  { value: '', label: featuresLoading ? 'Loading...' : 'Select a feature...' },
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
              <Button variant="blue" onClick={() => setStep(1)}>
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
              <Button variant="blue" onClick={() => setStep(2)}>
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
              <div className="pa-body-m" style={{ fontWeight: 600 }}>{selectedTargetOption?.name || 'Unknown'}</div>
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
              <Button variant="blue" onClick={() => setStep(3)}>
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
