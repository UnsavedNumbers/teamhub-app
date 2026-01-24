import React, { useState, useEffect } from 'react'
import { Select } from './Select'
import { Button } from './Button'

interface ChangeRoleModalProps {
  open: boolean
  userId: string
  orgId: string
  orgName: string
  currentRole: 'parent' | 'coach' | 'org_admin'
  onConfirm: (orgId: string, oldRole: 'parent' | 'coach' | 'org_admin', newRole: 'parent' | 'coach' | 'org_admin', reason: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string | null
}

const ORG_ROLES: Array<{ value: 'parent' | 'coach' | 'org_admin'; label: string }> = [
  { value: 'parent', label: 'Parent' },
  { value: 'coach', label: 'Coach' },
  { value: 'org_admin', label: 'Organization Admin' },
]

export function ChangeRoleModal({
  open,
  userId,
  orgId,
  orgName,
  currentRole,
  onConfirm,
  onCancel,
  loading = false,
  error = null,
}: ChangeRoleModalProps) {
  const [newRole, setNewRole] = useState<'parent' | 'coach' | 'org_admin'>(currentRole)
  const [reason, setReason] = useState('')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setNewRole(currentRole)
      setReason('')
    }
  }, [open, currentRole])

  const handleConfirm = async () => {
    if (!reason.trim() || newRole === currentRole) return
    await onConfirm(orgId, currentRole, newRole, reason)
  }

  const isValid = reason.trim().length > 0 && newRole !== currentRole

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
            <h2 className="pa-h2" style={{ margin: 0 }}>Change Role</h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              Change user role in <strong>{orgName}</strong>
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            {/* Current Role */}
            <div className="pa-form-group" style={{ marginBottom: 'var(--pa-space-4)' }}>
              <label className="pa-label">Current Role</label>
              <div className="pa-body-m" style={{ padding: 'var(--pa-space-2)', background: 'var(--pa-n50)', borderRadius: 'var(--pa-radius-sm)' }}>
                {ORG_ROLES.find(r => r.value === currentRole)?.label || currentRole}
              </div>
            </div>

            {/* New Role Select */}
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'parent' | 'coach' | 'org_admin')}
              disabled={loading}
              label="New Role"
              options={ORG_ROLES.filter(r => r.value !== currentRole)}
            />

            {/* Reason */}
            <div className="pa-form-group">
              <label className="pa-label">Reason (required)</label>
              <textarea
                className="pa-input pa-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter a reason for changing this role..."
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
              variant="primary"
              onClick={handleConfirm}
              disabled={loading || !isValid}
              loading={loading}
            >
              Change Role
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
