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
  onComplete?: () => void
  loading?: boolean
}

export function ApplyToTiersModal({
  open,
  selectedFeatures,
  availableTiers,
  onConfirm,
  onCancel,
  loading = false,
  onComplete,
}: ApplyToTiersModalProps) {
  const [tierActions, setTierActions] = useState<Record<string, 'add' | 'remove' | 'none'>>({})
  const [roleAdmin, setRoleAdmin] = useState(true)
  const [roleCoach, setRoleCoach] = useState(true)
  const [roleParent, setRoleParent] = useState(false)

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
      // Call onComplete after all operations succeed
      if (onComplete && (addTiers.length > 0 || removeTiers.length > 0)) {
        onComplete()
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
            {availableTiers.map(tier => (
              <div
                key={tier.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--pa-space-2)',
                  border: '1px solid var(--pa-n200)',
                  borderRadius: 'var(--pa-radius-sm)',
                }}
              >
                <span className="pa-body-m">{tier.tier_name}</span>
                <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
                  <Button
                    variant={tierActions[tier.id] === 'add' ? 'primary' : 'ghost'}
                    size="dense"
                    onClick={() => handleTierActionChange(tier.id, tierActions[tier.id] === 'add' ? 'none' : 'add')}
                  >
                    Add
                  </Button>
                  <Button
                    variant={tierActions[tier.id] === 'remove' ? 'secondary' : 'ghost'}
                    size="dense"
                    onClick={() => handleTierActionChange(tier.id, tierActions[tier.id] === 'remove' ? 'none' : 'remove')}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
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
