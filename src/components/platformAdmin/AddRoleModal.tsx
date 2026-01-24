import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Select } from './Select'
import { Button } from './Button'
import type { AdminOrganization } from '../../types/platformAdmin.types'

interface AddRoleModalProps {
  open: boolean
  userId: string
  existingOrgs: Array<{ org_id: string; org_name: string }>
  onConfirm: (orgId: string, role: 'parent' | 'coach' | 'org_admin', reason: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string | null
}

const ORG_ROLES: Array<{ value: 'parent' | 'coach' | 'org_admin'; label: string }> = [
  { value: 'parent', label: 'Parent' },
  { value: 'coach', label: 'Coach' },
  { value: 'org_admin', label: 'Organization Admin' },
]

export function AddRoleModal({
  open,
  userId,
  existingOrgs,
  onConfirm,
  onCancel,
  loading = false,
  error = null,
}: AddRoleModalProps) {
  const [orgId, setOrgId] = useState('')
  const [role, setRole] = useState<'parent' | 'coach' | 'org_admin'>('parent')
  const [reason, setReason] = useState('')
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([])
  const [orgSearch, setOrgSearch] = useState('')
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setOrgId('')
      setRole('parent')
      setReason('')
      setOrgSearch('')
    }
  }, [open])

  // Fetch organizations when search changes
  useEffect(() => {
    if (!open || orgSearch.length < 2) {
      setOrgs([])
      return
    }

    const fetchOrgs = async () => {
      setLoadingOrgs(true)
      try {
        const { data, error } = await supabase
          .from('admin_organizations')
          .select('id, name')
          .ilike('name', `%${orgSearch}%`)
          .limit(20)

        if (!error && data) {
          // Filter out orgs user is already in
          const existingOrgIds = new Set(existingOrgs.map(o => o.org_id))
          setOrgs(data.filter(org => !existingOrgIds.has(org.id)))
        }
      } catch (err) {
        console.error('Error fetching organizations:', err)
      } finally {
        setLoadingOrgs(false)
      }
    }

    const timeout = setTimeout(fetchOrgs, 300)
    return () => clearTimeout(timeout)
  }, [orgSearch, open, existingOrgs])

  const selectedOrg = orgs.find(o => o.id === orgId)

  const handleConfirm = async () => {
    if (!orgId || !reason.trim()) return
    await onConfirm(orgId, role, reason)
  }

  const isValid = orgId && role && reason.trim().length > 0

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
            <h2 className="pa-h2" style={{ margin: 0 }}>Add Role to Organization</h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              Add a new organization role for this user.
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            {/* Organization Search */}
            <div className="pa-form-group" style={{ marginBottom: 'var(--pa-space-4)' }}>
              <label className="pa-label">Organization</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="pa-input"
                  value={selectedOrg ? selectedOrg.name : orgSearch}
                  onChange={(e) => {
                    setOrgSearch(e.target.value)
                    if (!e.target.value) {
                      setOrgId('')
                    }
                  }}
                  placeholder="Search organizations..."
                  disabled={loading || loadingOrgs}
                  onFocus={() => {
                    if (!orgSearch && orgId) {
                      const org = orgs.find(o => o.id === orgId)
                      if (org) {
                        setOrgSearch(org.name)
                      }
                    }
                  }}
                />
                {orgSearch.length >= 2 && orgs.length > 0 && !selectedOrg && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--pa-bg-primary)',
                      border: '1px solid var(--pa-n100)',
                      borderRadius: 'var(--pa-radius-md)',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: 'var(--pa-shadow-2)',
                    }}
                  >
                    {orgs.map((org) => (
                      <div
                        key={org.id}
                        onClick={() => {
                          setOrgId(org.id)
                          setOrgSearch(org.name)
                        }}
                        style={{
                          padding: '12px 16px',
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
                        <div className="pa-body-m">{org.name}</div>
                      </div>
                    ))}
                  </div>
                )}
                {loadingOrgs && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', textAlign: 'center' }}>
                    <div className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>Loading...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Role Select */}
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as 'parent' | 'coach' | 'org_admin')}
              disabled={loading}
              label="Role"
              options={ORG_ROLES}
            />

            {/* Reason */}
            <div className="pa-form-group">
              <label className="pa-label">Reason (required)</label>
              <textarea
                className="pa-input pa-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter a reason for adding this role..."
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
              Add Role
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
