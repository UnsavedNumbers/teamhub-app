import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, FilterBar, ConfirmDialog } from '../../components/platformAdmin'
import { canPerformAction, getDeniedMessage } from '../../utils/platformAdminPermissions'
import type { AdminFeatureFlag, PlatformAdminRole, KnownFeatureFlag } from '../../types/platformAdmin.types'

// Known feature flags with descriptions
const FEATURE_FLAG_INFO: Record<KnownFeatureFlag, { label: string; description: string }> = {
  payments_enabled: {
    label: 'Payments',
    description: 'Enable payment collection for this organization',
  },
  tryouts_enabled: {
    label: 'Tryouts',
    description: 'Enable tryout management features',
  },
  travel_enabled: {
    label: 'Travel',
    description: 'Enable travel plan management',
  },
  uniforms_enabled: {
    label: 'Uniforms',
    description: 'Enable uniform ordering features',
  },
  messaging_enabled: {
    label: 'Messaging',
    description: 'Enable in-app messaging',
  },
}

interface OrganizationFlags {
  organizationId: string
  organizationName: string
  flags: AdminFeatureFlag[]
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([])
  const [organizedFlags, setOrganizedFlags] = useState<OrganizationFlags[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    flag: AdminFeatureFlag | null
    newValue: boolean
  }>({ open: false, flag: null, newValue: false })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  
  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success' | 'danger' }>({
    show: false,
    message: '',
    variant: 'success',
  })
  
  // TODO: Fetch actual role
  const [adminRole] = useState<PlatformAdminRole>('super_admin')

  const fetchFlags = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_feature_flags')
        .select('*')
        .order('organization_name', { ascending: true })
        .order('feature_key', { ascending: true })

      if (search) {
        query = query.ilike('organization_name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching feature flags:', error)
        setFlags([])
      } else {
        setFlags(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setFlags([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  // Organize flags by organization
  useEffect(() => {
    const orgMap = new Map<string, OrganizationFlags>()

    for (const flag of flags) {
      if (!orgMap.has(flag.organization_id)) {
        orgMap.set(flag.organization_id, {
          organizationId: flag.organization_id,
          organizationName: flag.organization_name,
          flags: [],
        })
      }
      orgMap.get(flag.organization_id)!.flags.push(flag)
    }

    setOrganizedFlags(Array.from(orgMap.values()))
  }, [flags])

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleToggleClick = (flag: AdminFeatureFlag) => {
    if (!canPerformAction(adminRole, 'toggle_feature_flag')) {
      setToast({
        show: true,
        message: getDeniedMessage('toggle_feature_flag'),
        variant: 'danger',
      })
      return
    }
    setDialogError(null)
    setConfirmDialog({ open: true, flag, newValue: !flag.enabled })
  }

  const handleConfirmToggle = async (reason: string) => {
    if (!confirmDialog.flag) return

    setDialogLoading(true)
    setDialogError(null)

    try {
      const { data, error } = await supabase.rpc('admin_set_feature_flag', {
        target_org_id: confirmDialog.flag.organization_id,
        target_feature_key: confirmDialog.flag.feature_key,
        target_enabled: confirmDialog.newValue,
        reason,
      })

      if (error) {
        setDialogError(error.message)
        return
      }

      if (data && !data.success) {
        setDialogError(data.error || 'Unknown error')
        return
      }

      setConfirmDialog({ open: false, flag: null, newValue: false })
      setToast({
        show: true,
        message: `Feature flag ${confirmDialog.newValue ? 'enabled' : 'disabled'} successfully`,
        variant: 'success',
      })
      fetchFlags()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDialogLoading(false)
    }
  }

  const getFlagInfo = (key: string) => {
    return FEATURE_FLAG_INFO[key as KnownFeatureFlag] || {
      label: key.replace(/_/g, ' '),
      description: 'Custom feature flag',
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Feature Flags"
          subtitle="Manage feature availability per organization."
        />
        <div className="pa-grid pa-grid-3 pa-gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pa-card">
              <div className="pa-skeleton" style={{ width: '60%', height: '20px', marginBottom: '16px' }} />
              <div className="pa-skeleton" style={{ width: '100%', height: '40px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        subtitle="Manage feature availability per organization."
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by organization name..."
        onClearAll={() => setSearch('')}
      />

      {organizedFlags.length === 0 ? (
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>toggle_off</span>
            </div>
            <h3 className="pa-empty-title">NO FEATURE FLAGS</h3>
            <p className="pa-empty-text">
              Feature flags will appear here once configured for organizations.
            </p>
          </div>
        </Card>
      ) : (
        <div className="pa-flex pa-flex-col pa-gap-4">
          {organizedFlags.map((org) => (
            <Card key={org.organizationId} title={org.organizationName}>
              <div className="pa-flex pa-gap-3" style={{ flexWrap: 'wrap' }}>
                {org.flags.map((flag) => {
                  const info = getFlagInfo(flag.feature_key)
                  const canToggle = canPerformAction(adminRole, 'toggle_feature_flag')
                  
                  return (
                    <div
                      key={flag.id}
                      className="pa-card"
                      style={{
                        minWidth: '200px',
                        padding: 'var(--pa-space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--pa-space-4)',
                        opacity: canToggle ? 1 : 0.7,
                        cursor: canToggle ? 'pointer' : 'not-allowed',
                      }}
                      onClick={() => canToggle && handleToggleClick(flag)}
                      title={canToggle ? info.description : getDeniedMessage('toggle_feature_flag')}
                    >
                      <div>
                        <div className="pa-body-m" style={{ fontWeight: 500 }}>
                          {info.label}
                        </div>
                        <Badge variant={flag.enabled ? 'success' : 'neutral'}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <label className="pa-toggle">
                        <input
                          type="checkbox"
                          className="pa-toggle-input"
                          checked={flag.enabled}
                          disabled={!canToggle}
                          onChange={() => {}}
                        />
                        <div className="pa-toggle-track" />
                        <div className="pa-toggle-thumb" />
                      </label>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.newValue ? 'Enable Feature' : 'Disable Feature'}
        description={
          confirmDialog.flag
            ? `Are you sure you want to ${confirmDialog.newValue ? 'enable' : 'disable'} "${getFlagInfo(confirmDialog.flag.feature_key).label}" for "${confirmDialog.flag.organization_name}"?`
            : ''
        }
        confirmLabel={confirmDialog.newValue ? 'Enable' : 'Disable'}
        variant={confirmDialog.newValue ? 'info' : 'warning'}
        requireReason
        loading={dialogLoading}
        error={dialogError}
        onConfirm={handleConfirmToggle}
        onCancel={() => setConfirmDialog({ open: false, flag: null, newValue: false })}
      />

      {/* Toast */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--pa-space-5)',
            right: 'var(--pa-space-5)',
            zIndex: 1000,
          }}
        >
          <div
            className="pa-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--pa-space-3)',
              padding: 'var(--pa-space-3) var(--pa-space-4)',
              borderLeft: `3px solid var(--pa-${toast.variant})`,
              boxShadow: 'var(--pa-shadow-2)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: `var(--pa-${toast.variant})`, fontSize: '20px' }}
            >
              {toast.variant === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="pa-body-m">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
