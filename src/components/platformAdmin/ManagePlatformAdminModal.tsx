import { useState, useEffect } from 'react'
import { Select } from './Select'
import { Button } from './Button'
import type { PlatformAdminRole } from '../../types/platformAdmin.types'

interface ManagePlatformAdminModalProps {
  open: boolean
  userId: string
  userEmail: string
  isCurrentlyAdmin: boolean
  currentRole: PlatformAdminRole | null
  onConfirm: (role: PlatformAdminRole, reason: string) => Promise<void>
  onRemove: (reason: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string | null
}

const PLATFORM_ADMIN_ROLES: Array<{ value: PlatformAdminRole; label: string }> = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'finance_admin', label: 'Finance Admin' },
  { value: 'ops_admin', label: 'Operations Admin' },
]

export function ManagePlatformAdminModal({
  open,
  userEmail,
  isCurrentlyAdmin,
  currentRole,
  onConfirm,
  onRemove,
  onCancel,
  loading = false,
  error = null,
}: ManagePlatformAdminModalProps) {
  const [role, setRole] = useState<PlatformAdminRole>(currentRole || 'support_admin')
  const [reason, setReason] = useState('')
  const [showRemove, setShowRemove] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setRole(currentRole || 'support_admin')
      setReason('')
      setShowRemove(false)
    }
  }, [open, currentRole])

  const handleConfirm = async () => {
    if (!reason.trim()) return
    if (showRemove) {
      await onRemove(reason)
    } else {
      await onConfirm(role, reason)
    }
  }

  const isValid = reason.trim().length > 0 && (!showRemove || isCurrentlyAdmin)

  if (!open) return null

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
            maxWidth: '500px',
            margin: 'var(--pa-space-4)',
            padding: 0,
          }}
        >
          {/* Header */}
          <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
            <h2 className="pa-h2" style={{ margin: 0 }}>
              {showRemove ? 'Remove Platform Admin' : isCurrentlyAdmin ? 'Update Platform Admin Role' : 'Make Platform Admin'}
            </h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              {showRemove 
                ? `Remove platform admin access from ${userEmail}`
                : isCurrentlyAdmin
                ? `Update platform admin role for ${userEmail}`
                : `Grant platform admin access to ${userEmail}`
              }
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            {isCurrentlyAdmin && !showRemove && (
              <div className="pa-form-group" style={{ marginBottom: 'var(--pa-space-4)' }}>
                <label className="pa-label">Current Role</label>
                <div className="pa-body-m" style={{ padding: 'var(--pa-space-2)', background: 'var(--pa-n50)', borderRadius: 'var(--pa-radius-sm)' }}>
                  {PLATFORM_ADMIN_ROLES.find(r => r.value === currentRole)?.label || currentRole || 'None'}
                </div>
              </div>
            )}

            {!showRemove && (
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as PlatformAdminRole)}
                disabled={loading}
                label="Platform Admin Role"
                options={PLATFORM_ADMIN_ROLES}
              />
            )}

            {isCurrentlyAdmin && (
              <div style={{ marginBottom: 'var(--pa-space-4)' }}>
                <Button
                  variant={showRemove ? 'danger' : 'secondary'}
                  onClick={() => setShowRemove(!showRemove)}
                  disabled={loading}
                >
                  {showRemove ? 'Cancel Remove' : 'Remove Platform Admin'}
                </Button>
              </div>
            )}

            {/* Reason */}
            <div className="pa-form-group">
              <label className="pa-label">Reason (required)</label>
              <textarea
                className="pa-input pa-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={showRemove ? "Enter a reason for removing platform admin access..." : "Enter a reason for this action..."}
                disabled={loading}
                style={{ minHeight: '80px' }}
              />
            </div>

            {error && (
              <div
                className="pa-card"
                style={{
                  padding: 'var(--pa-space-3)',
                  background: 'var(--pa-danger-bg)',
                  border: '1px solid var(--pa-n800)',
                  marginTop: 'var(--pa-space-3)',
                }}
              >
                <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
                  {error}
                </span>
              </div>
            )}
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
              Cancel
            </Button>
            <Button
              variant={showRemove ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={loading || !isValid}
              loading={loading}
            >
              {showRemove ? 'Remove Admin' : isCurrentlyAdmin ? 'Update Role' : 'Add Admin'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
