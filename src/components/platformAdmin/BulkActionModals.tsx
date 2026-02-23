/**
 * Bulk Action Modals
 * 
 * Modals for bulk operations on features:
 * - ApplyToTiersModal
 * - ChangeStatusModal
 * - ChangeVisibilityModal
 * - UpdateCategoryModal
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Button, Select, Checkbox } from './index'
import type { FeatureEntitlementWithCounts } from '../../types/licenseTiers.types'
import type { FeatureCategory } from '../../types/licenseTiers.types'
import { FEATURE_CATEGORIES } from '../../utils/licenseTierConstants'

/**
 * Base Modal Component
 */
function BaseModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  loading = false,
  children,
  disabled = false,
}: {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'info' | 'warning' | 'danger'
  loading?: boolean
  children?: React.ReactNode
  disabled?: boolean
}) {
  if (!open) return null

  const getVariantColor = () => {
    switch (variant) {
      case 'danger': return 'var(--pa-danger)'
      case 'warning': return 'var(--pa-warning)'
      default: return 'var(--pa-primary)'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 20, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pa-card"
          style={{
            width: '100%',
            maxWidth: '600px',
            margin: 'var(--pa-space-4)',
            padding: 0,
          }}
        >
          {/* Header */}
          <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
            <h2 className="pa-h2" style={{ margin: 0, color: getVariantColor() }}>
              {title}
            </h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              {description}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            {children}
          </div>

          {/* Actions */}
          <div
            style={{
              padding: 'var(--pa-space-4) var(--pa-space-5)',
              borderTop: '1px solid var(--pa-n100)',
              display: 'flex',
              gap: 'var(--pa-space-3)',
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
              disabled={loading || disabled}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// ApplyToTiersModal
// ============================================================================

interface ApplyToTiersModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  availableTiers: Array<{ id: string; tier_key: string; tier_name: string }>
  onConfirm: (tierIds: string[], action: 'add' | 'remove', roleVisibility: { admin: boolean; coach: boolean; parent: boolean }) => void
  onCancel: () => void
  loading?: boolean
}

export function ApplyToTiersModal({
  open,
  selectedFeatures,
  availableTiers,
  onConfirm,
  onCancel,
  loading = false,
}: ApplyToTiersModalProps) {
  const [tierActions, setTierActions] = useState<Record<string, 'add' | 'remove' | 'none'>>({})
  const [roleAdmin, setRoleAdmin] = useState(true)
  const [roleCoach, setRoleCoach] = useState(true)
  const [roleParent, setRoleParent] = useState(false)

  // Determine which tiers are already assigned to each feature
  const tierAssignmentStatus = useMemo(() => {
    const status: Record<string, { assignedToAll: boolean; assignedToSome: boolean; unassignedAll: boolean }> = {}
    
    availableTiers.forEach(tier => {
      const assignedFeatures = selectedFeatures.filter(f => 
        f.assigned_tier_keys && f.assigned_tier_keys.includes(tier.tier_key)
      ).length
      
      const totalFeatures = selectedFeatures.length
      const assignedToAll = assignedFeatures === totalFeatures
      const assignedToSome = assignedFeatures > 0
      const unassignedAll = assignedFeatures === 0
      
      status[tier.id] = { assignedToAll, assignedToSome, unassignedAll }
    })
    
    return status
  }, [selectedFeatures, availableTiers])

  useEffect(() => {
    if (open) {
      // Initialize: all tiers start as 'none'
      const initial: Record<string, 'add' | 'remove' | 'none'> = {}
      availableTiers.forEach(tier => {
        initial[tier.id] = 'none'
      })
      setTierActions(initial)
      setRoleAdmin(true)
      setRoleCoach(true)
      setRoleParent(false)
    }
  }, [open, availableTiers])

  const handleTierActionChange = (tierId: string, action: 'add' | 'remove' | 'none') => {
    setTierActions(prev => ({ ...prev, [tierId]: action }))
  }

  const handleConfirm = async () => {
    const addTiers = availableTiers.filter(t => tierActions[t.id] === 'add').map(t => t.id)
    const removeTiers = availableTiers.filter(t => tierActions[t.id] === 'remove').map(t => t.id)

    try {
      // Process adds first, then removes sequentially
      if (addTiers.length > 0) {
        await onConfirm(addTiers, 'add', { admin: roleAdmin, coach: roleCoach, parent: roleParent })
      }
      if (removeTiers.length > 0) {
        await onConfirm(removeTiers, 'remove', { admin: roleAdmin, coach: roleCoach, parent: roleParent })
      }
    } catch (err) {
      // Error handling is done in the parent handler
      // Don't call onComplete on error
      throw err
    }
  }

  const selectedTierCount = Object.values(tierActions).filter(a => a !== 'none').length
  const hasChanges = selectedTierCount > 0

  return (
    <BaseModal
      open={open}
      title="Apply to License Tiers"
      description={`You are about to apply ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'} to license tiers.`}
      confirmLabel={hasChanges ? `Apply to ${selectedTierCount} tier${selectedTierCount === 1 ? '' : 's'}` : 'Close'}
      cancelLabel="Cancel"
      variant="info"
      loading={loading}
      disabled={!hasChanges}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        {/* Tier Actions */}
        <div style={{ marginBottom: 'var(--pa-space-4)' }}>
          <label className="pa-label" style={{ marginBottom: 'var(--pa-space-3)' }}>
            Select Tiers
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
            {availableTiers.map(tier => {
              const status = tierAssignmentStatus[tier.id]
              const canAdd = !status.assignedToAll // Can add only if not already assigned to all
              const canRemove = !status.unassignedAll // Can remove only if assigned to at least one
              
              return (
                <div
                  key={tier.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--pa-space-2)',
                    border: '1px solid var(--pa-n200)',
                    borderRadius: 'var(--pa-radius-sm)',
                    backgroundColor: status.assignedToSome ? 'rgba(59, 130, 246, 0.05)' : undefined,
                  }}
                >
                  <div>
                    <span className="pa-body-m">{tier.tier_name}</span>
                    {status.assignedToSome && (
                      <div className="pa-body-sm" style={{ color: 'var(--pa-n600)', marginTop: 'var(--pa-space-1)' }}>
                        {status.assignedToAll ? 'Assigned to all selected' : `Assigned to ${selectedFeatures.filter(f => f.assigned_tier_keys?.includes(tier.tier_key)).length} of ${selectedFeatures.length}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
                    <Button
                      variant={tierActions[tier.id] === 'add' ? 'primary' : 'ghost'}
                      size="dense"
                      disabled={!canAdd}
                      title={!canAdd ? 'Already assigned to all selected features' : undefined}
                      onClick={() => handleTierActionChange(tier.id, tierActions[tier.id] === 'add' ? 'none' : 'add')}
                    >
                      Add
                    </Button>
                    <Button
                      variant={tierActions[tier.id] === 'remove' ? 'secondary' : 'ghost'}
                      size="dense"
                      disabled={!canRemove}
                      title={!canRemove ? 'Not assigned to any selected features' : undefined}
                      onClick={() => handleTierActionChange(tier.id, tierActions[tier.id] === 'remove' ? 'none' : 'remove')}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role Visibility */}
        <div style={{ marginBottom: 'var(--pa-space-4)' }}>
          <label className="pa-label" style={{ marginBottom: 'var(--pa-space-3)' }}>
            Role Visibility (for new assignments)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
            <Checkbox
              checked={roleAdmin}
              onChange={(e) => setRoleAdmin(e.target.checked)}
              label="Org Admin"
            />
            <Checkbox
              checked={roleCoach}
              onChange={(e) => setRoleCoach(e.target.checked)}
              label="Coach"
            />
            <Checkbox
              checked={roleParent}
              onChange={(e) => setRoleParent(e.target.checked)}
              label="Guardian"
            />
          </div>
        </div>

        {/* Summary */}
        {hasChanges && (
          <div
            className="pa-card"
            style={{
              padding: 'var(--pa-space-3)',
              background: 'var(--pa-info-bg)',
              border: '1px solid var(--pa-info)',
            }}
          >
            <p className="pa-body-s" style={{ margin: 0 }}>
              {selectedFeatures.length} feature{selectedFeatures.length === 1 ? '' : 's'} will be{' '}
              {Object.values(tierActions).filter(a => a === 'add').length > 0 && 'added to '}
              {Object.values(tierActions).filter(a => a === 'add').length > 0 &&
                Object.values(tierActions).filter(a => a === 'remove').length > 0 &&
                'and '}
              {Object.values(tierActions).filter(a => a === 'remove').length > 0 && 'removed from '}
              {selectedTierCount} tier{selectedTierCount === 1 ? '' : 's'}.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  )
}

// ============================================================================
// ChangeStatusModal
// ============================================================================

interface ChangeStatusModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  onConfirm: (status: 'Live' | 'Disabled' | 'Draft' | 'Deprecated' | 'Review') => void
  onCancel: () => void
  loading?: boolean
}

const STATUS_OPTIONS = [
  { value: 'Live', label: 'Live' },
  { value: 'Disabled', label: 'Disabled' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Deprecated', label: 'Deprecated' },
  { value: 'Review', label: 'Review' },
]

export function ChangeStatusModal({
  open,
  selectedFeatures,
  onConfirm,
  onCancel,
  loading = false,
}: ChangeStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<'Live' | 'Disabled' | 'Draft' | 'Deprecated' | 'Review' | ''>('')

  useEffect(() => {
    if (open) {
      setSelectedStatus('')
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus as 'Live' | 'Disabled' | 'Draft' | 'Deprecated' | 'Review')
    }
  }

  const isDestructive = selectedStatus === 'Disabled' || selectedStatus === 'Deprecated'

  return (
    <BaseModal
      open={open}
      title="Change Status"
      description={`Set ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'} to a new status.`}
      confirmLabel="Change Status"
      cancelLabel="Cancel"
      variant={isDestructive ? 'warning' : 'info'}
      loading={loading}
      disabled={!selectedStatus}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          options={[
            { value: '', label: 'Select status...' },
            ...STATUS_OPTIONS,
          ]}
          label="New Status"
        />

        {selectedStatus && (
          <div
            className="pa-card pa-mt-3"
            style={{
              padding: 'var(--pa-space-3)',
              background: isDestructive ? 'var(--pa-warning-bg)' : 'var(--pa-info-bg)',
              border: `1px solid ${isDestructive ? 'var(--pa-warning)' : 'var(--pa-info)'}`,
            }}
          >
            <p className="pa-body-s" style={{ margin: 0 }}>
              {selectedFeatures.length} feature{selectedFeatures.length === 1 ? '' : 's'} will be set to{' '}
              <strong>{selectedStatus}</strong>.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  )
}

// ============================================================================
// ChangeVisibilityModal
// ============================================================================

interface ChangeVisibilityModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  onConfirm: (roleType: 'admin' | 'coach' | 'parent', visible: boolean) => void
  onCancel: () => void
  loading?: boolean
}

export function ChangeVisibilityModal({
  open,
  selectedFeatures,
  onConfirm,
  onCancel,
  loading = false,
}: ChangeVisibilityModalProps) {
  const [roleType, setRoleType] = useState<'admin' | 'coach' | 'parent' | ''>('')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (open) {
      setRoleType('')
      setVisible(true)
    }
  }, [open])

  const featuresWithAssignments = useMemo(() => {
    return selectedFeatures.filter(f => (f.tier_assignments_count || 0) > 0)
  }, [selectedFeatures])

  const handleConfirm = () => {
    if (roleType) {
      onConfirm(roleType as 'admin' | 'coach' | 'parent', visible)
    }
  }

  // Show warning if no features have tier assignments
  if (featuresWithAssignments.length === 0) {
    return (
      <BaseModal
        open={open}
        title="No Tier Assignments"
        description="None of the selected features are assigned to any license tiers. Visibility can only be updated for features that are assigned to tiers."
        confirmLabel="Close"
        cancelLabel=""
        variant="warning"
        onConfirm={onCancel}
        onCancel={onCancel}
      >
        <div />
      </BaseModal>
    )
  }

  // Show partial warning
  if (featuresWithAssignments.length < selectedFeatures.length) {
    return (
      <BaseModal
        open={open}
        title="Partial Tier Assignments"
        description={`${selectedFeatures.length - featuresWithAssignments.length} of ${selectedFeatures.length} selected features are not assigned to any tiers. Only ${featuresWithAssignments.length} features will be updated.`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        variant="warning"
        loading={loading}
        disabled={!roleType}
        onConfirm={() => {
          // Still allow operation, but only on features with assignments
          if (roleType) {
            onConfirm(roleType as 'admin' | 'coach' | 'parent', visible)
          }
        }}
        onCancel={onCancel}
      >
        <div style={{ marginTop: 'var(--pa-space-4)' }}>
          <Select
            value={roleType}
            onChange={(e) => setRoleType(e.target.value as any)}
            options={[
              { value: '', label: 'Select role...' },
              { value: 'admin', label: 'Org Admin' },
              { value: 'coach', label: 'Coach' },
              { value: 'parent', label: 'Guardian' },
            ]}
            label="Role"
          />
          <div style={{ marginTop: 'var(--pa-space-3)' }}>
            <label className="pa-label">Visibility</label>
            <div style={{ display: 'flex', gap: 'var(--pa-space-3)', marginTop: 'var(--pa-space-2)' }}>
              <Button
                variant={visible ? 'primary' : 'secondary'}
                onClick={() => setVisible(true)}
              >
                Visible
              </Button>
              <Button
                variant={!visible ? 'primary' : 'secondary'}
                onClick={() => setVisible(false)}
              >
                Hidden
              </Button>
            </div>
          </div>
        </div>
      </BaseModal>
    )
  }

  return (
    <BaseModal
      open={open}
      title="Change Visibility"
      description={`Update role visibility for ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'}.`}
      confirmLabel="Update Visibility"
      cancelLabel="Cancel"
      variant="info"
      loading={loading}
      disabled={!roleType}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        <Select
          value={roleType}
          onChange={(e) => setRoleType(e.target.value as any)}
          options={[
            { value: '', label: 'Select role...' },
            { value: 'admin', label: 'Org Admin' },
            { value: 'coach', label: 'Coach' },
            { value: 'parent', label: 'Guardian' },
          ]}
          label="Role"
        />
        <div style={{ marginTop: 'var(--pa-space-3)' }}>
          <label className="pa-label">Visibility</label>
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)', marginTop: 'var(--pa-space-2)' }}>
            <Button
              variant={visible ? 'primary' : 'secondary'}
              onClick={() => setVisible(true)}
            >
              Visible
            </Button>
            <Button
              variant={!visible ? 'primary' : 'secondary'}
              onClick={() => setVisible(false)}
            >
              Hidden
            </Button>
          </div>
        </div>

        {roleType && (
          <div
            className="pa-card pa-mt-3"
            style={{
              padding: 'var(--pa-space-3)',
              background: 'var(--pa-info-bg)',
              border: '1px solid var(--pa-info)',
            }}
          >
            <p className="pa-body-s" style={{ margin: 0 }}>
              {selectedFeatures.length} feature{selectedFeatures.length === 1 ? '' : 's'} will be{' '}
              {visible ? 'visible' : 'hidden'} for {roleType === 'admin' ? 'Org Admin' : roleType === 'coach' ? 'Coach' : 'Guardian'} role.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  )
}

// ============================================================================
// UpdateCategoryModal
// ============================================================================

interface UpdateCategoryModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  onConfirm: (category: FeatureCategory) => void
  onCancel: () => void
  loading?: boolean
}

// ============================================================================
// SetAsSystemFeatureModal
// ============================================================================

interface SetAsSystemFeatureModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function SetAsSystemFeatureModal({
  open,
  selectedFeatures,
  onConfirm,
  onCancel,
  loading = false,
}: SetAsSystemFeatureModalProps) {
  const featuresWithAssignments = selectedFeatures.filter(
    f => (f.tier_assignments_count || 0) > 0
  ).length

  return (
    <BaseModal
      open={open}
      title="Set as System Feature"
      description={`Mark ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'} as system features.`}
      confirmLabel="Set as System Feature"
      cancelLabel="Cancel"
      variant="warning"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        <div
          className="pa-card"
          style={{
            padding: 'var(--pa-space-3)',
            background: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            marginBottom: 'var(--pa-space-3)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--pa-space-2)', alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)', flexShrink: 0, marginTop: '2px' }}>warning</span>
            <div>
              <p className="pa-body-s" style={{ margin: 0, fontWeight: 600 }}>This will:</p>
              <ul className="pa-body-s" style={{ margin: 'var(--pa-space-2) 0 0 var(--pa-space-3)', padding: 0 }}>
                <li>Set status to <strong>Live</strong></li>
                <li>Mark as <strong>System Feature</strong> (always available for all tiers)</li>
                {featuresWithAssignments > 0 && (
                  <li>Remove <strong>all tier assignments</strong> and role visibility settings ({featuresWithAssignments} feature{featuresWithAssignments === 1 ? ' has' : 's have'} assignments)</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <p className="pa-body-s" style={{ color: 'var(--pa-n700)', margin: 0 }}>
          System features are automatically available to every organization regardless of their license tier.
          Tier assignments and role visibility are not needed.
        </p>
      </div>
    </BaseModal>
  )
}

// ============================================================================
// SetPlatformOnlyModal
// ============================================================================

interface SetPlatformOnlyModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function SetPlatformOnlyModal({
  open,
  selectedFeatures,
  onConfirm,
  onCancel,
  loading = false,
}: SetPlatformOnlyModalProps) {
  const featuresWithAssignments = selectedFeatures.filter(
    f => (f.tier_assignments_count || 0) > 0
  ).length

  return (
    <BaseModal
      open={open}
      title="Set to Platform Admin Only"
      description={`Restrict ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'} to platform administrators.`}
      confirmLabel="Set to Platform Only"
      cancelLabel="Cancel"
      variant="warning"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        <div
          className="pa-card"
          style={{
            padding: 'var(--pa-space-3)',
            background: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            marginBottom: 'var(--pa-space-3)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--pa-space-2)', alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)', flexShrink: 0, marginTop: '2px' }}>warning</span>
            <div>
              <p className="pa-body-s" style={{ margin: 0, fontWeight: 600 }}>This will:</p>
              <ul className="pa-body-s" style={{ margin: 'var(--pa-space-2) 0 0 var(--pa-space-3)', padding: 0 }}>
                <li>Set status to <strong>Live</strong></li>
                <li>Mark as <strong>Platform Admin Only</strong> (not available to org users)</li>
                {featuresWithAssignments > 0 && (
                  <li>Remove <strong>all tier assignments</strong> and role visibility settings ({featuresWithAssignments} feature{featuresWithAssignments === 1 ? ' has' : 's have'} assignments)</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <p className="pa-body-s" style={{ color: 'var(--pa-n700)', margin: 0 }}>
          Platform-only features are only accessible by platform administrators.
          They will not appear for org admins, coaches, or parents.
        </p>
      </div>
    </BaseModal>
  )
}

// ============================================================================
// ExcludeFromDiscoveryModal
// ============================================================================

interface ExcludeFromDiscoveryModalProps {
  open: boolean
  selectedFeatures: FeatureEntitlementWithCounts[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ExcludeFromDiscoveryModal({
  open,
  selectedFeatures,
  onConfirm,
  onCancel,
  loading = false,
}: ExcludeFromDiscoveryModalProps) {
  return (
    <BaseModal
      open={open}
      title="Mark as Not a Feature"
      description={`This will mark ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'} as "not a feature" and exclude ${selectedFeatures.length === 1 ? 'it' : 'them'} from discovery sync. These features will not reappear after running the Sync DB tool.`}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmLabel="Mark as Not a Feature"
      loading={loading}
      variant="warning"
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        <div
          style={{
            padding: 'var(--pa-space-3)',
            backgroundColor: 'var(--pa-warning-bg)',
            border: '1px solid var(--pa-warning)',
            borderRadius: '8px',
            marginBottom: 'var(--pa-space-3)',
          }}
        >
          <div className="pa-body-s" style={{ fontWeight: 600, color: 'var(--pa-warning)', marginBottom: 'var(--pa-space-2)' }}>
            Important:
          </div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
            These features will be excluded from future discovery scans and sync operations. They will remain in the database but won't be re-discovered or re-synced.
          </div>
        </div>
        <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          <strong>Selected features:</strong>
          <ul style={{ marginTop: 'var(--pa-space-2)', paddingLeft: 'var(--pa-space-5)' }}>
            {selectedFeatures.slice(0, 10).map(f => (
              <li key={f.id}>{f.display_name} ({f.feature_key})</li>
            ))}
            {selectedFeatures.length > 10 && <li>...and {selectedFeatures.length - 10} more</li>}
          </ul>
        </div>
      </div>
    </BaseModal>
  )
}

const CATEGORY_OPTIONS = FEATURE_CATEGORIES.map(cat => ({ value: cat, label: cat }))

export function UpdateCategoryModal({
  open,
  selectedFeatures,
  onConfirm,
  onCancel,
  loading = false,
}: UpdateCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | ''>('')

  useEffect(() => {
    if (open) {
      setSelectedCategory('')
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedCategory) {
      onConfirm(selectedCategory as FeatureCategory)
    }
  }

  return (
    <BaseModal
      open={open}
      title="Update Category"
      description={`Change category for ${selectedFeatures.length} feature${selectedFeatures.length === 1 ? '' : 's'}.`}
      confirmLabel="Update Category"
      cancelLabel="Cancel"
      variant="info"
      loading={loading}
      disabled={!selectedCategory}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <div style={{ marginTop: 'var(--pa-space-4)' }}>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory)}
          options={[
            { value: '', label: 'Select category...' },
            ...CATEGORY_OPTIONS,
          ]}
          label="New Category"
        />

        {selectedCategory && (
          <div
            className="pa-card pa-mt-3"
            style={{
              padding: 'var(--pa-space-3)',
              background: 'var(--pa-info-bg)',
              border: '1px solid var(--pa-info)',
            }}
          >
            <p className="pa-body-s" style={{ margin: 0 }}>
              {selectedFeatures.length} feature{selectedFeatures.length === 1 ? '' : 's'} will be moved to{' '}
              <strong>{selectedCategory}</strong> category.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  )
}
