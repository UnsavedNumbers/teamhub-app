/**
 * Staff Management Section
 * 
 * Manages staff members for the organization with per-org permissions.
 */

import { useState, useEffect, useCallback } from 'react'
import { useUserContext } from '../../../hooks/useUserContext'
import { 
  Card, 
  Button, 
  PlatformDataTable,
  InlineNotice,
  type ColumnConfig 
} from '../../../components/platformAdmin'
import { OrgAdminButton } from '../../../components/admin/OrgAdminButton'
import { 
  getOrgStaff, 
  addStaffMember, 
  updateStaffPermissions, 
  revokeStaffAccess 
} from '../../../data/services/usersService'
import type { StaffMember, StaffPermissions } from '../../../types/staffAndFan'
import { showSuccess, showError } from '../../../utils/toast'
import { formatDate } from '../../../utils/dateFormatters'
import { DEFAULT_STAFF_PERMISSIONS } from '../../../constants/permissions'
import AddStaffModal from '../../../components/admin/staff/AddStaffModal'
import StaffPermissionEditor from '../../../components/admin/staff/StaffPermissionEditor'
import StaffAuditLog from '../../../components/admin/staff/StaffAuditLog'
import { useI18n } from '../../../i18n/useI18n'

interface StaffSectionProps {
  organizationId: string
}

export default function StaffSection({ organizationId }: StaffSectionProps) {
  const { t } = useI18n()
  const { context, isReady } = useUserContext()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [viewingAuditLog, setViewingAuditLog] = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    if (!isReady || !context) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getOrgStaff(context, organizationId)

      if (fetchError) {
        setError(fetchError.message || t('admin.staff.errors.getOrgStaffFailed'))
        setStaff([])
      } else {
        setStaff(data)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.staff.errors.getOrgStaffFailed'))
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [context, isReady, organizationId, t])

  useEffect(() => {
    if (isReady) fetchStaff()
  }, [isReady, fetchStaff])

  const handleAddStaff = async (userId: string, permissions: StaffPermissions) => {
    if (!context) return

    try {
      const { data, error: addError } = await addStaffMember(context, {
        user_id: userId,
        org_id: organizationId,
        permissions,
      })

      if (addError) {
        showError(addError.message || t('admin.staff.errors.addStaffMemberFailed'))
        return
      }

      showSuccess(t('admin.staff.addSuccess'))
      setShowAddModal(false)
      fetchStaff()
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.staff.errors.addStaffMemberFailed'))
    }
  }

  const handleUpdatePermissions = async (userId: string, permissions: StaffPermissions) => {
    if (!context) return

    try {
      const { data, error: updateError } = await updateStaffPermissions(
        context,
        organizationId,
        userId,
        permissions
      )

      if (updateError) {
        showError(updateError.message || t('admin.staff.errors.updateStaffPermissionsFailed'))
        return
      }

      showSuccess(t('admin.staff.updateSuccess'))
      setEditingStaff(null)
      fetchStaff()
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.staff.errors.updateStaffPermissionsFailed'))
    }
  }

  const handleRevokeAccess = async (userId: string) => {
    if (!context) return
    if (!confirm(t('admin.staff.revokeConfirm'))) return

    try {
      const { data, error: revokeError } = await revokeStaffAccess(
        context,
        organizationId,
        userId,
        t('admin.staff.revokeSuccess')
      )

      if (revokeError) {
        showError(revokeError.message || t('admin.staff.errors.revokeStaffAccessFailed'))
        return
      }

      showSuccess(t('admin.staff.revokeSuccess'))
      fetchStaff()
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.staff.errors.revokeStaffAccessFailed'))
    }
  }

  const columns: ColumnConfig<StaffMember>[] = [
    {
      id: 'user',
      label: t('admin.staff.user'),
      render: (row) => (
        <div>
          <div className="pa-body-m" style={{ fontWeight: 600 }}>
            {row.user?.display_name || `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || t('common.unknown')}
          </div>
          {row.user?.email && (
            <div className="pa-body-s pa-text-muted">{row.user.email}</div>
          )}
        </div>
      ),
    },
    {
      id: 'permissions',
      label: t('admin.staff.permissions'),
      render: (row) => {
        const perms = row.permissions || {}
        const activePerms = Object.entries(perms)
          .filter(([_, value]) => value === true)
          .map(([key]) => key.replace('can_', '').replace(/_/g, ' '))
        
        return (
          <div className="pa-flex pa-gap-1 pa-flex-wrap">
            {activePerms.length > 0 ? (
              activePerms.map((perm) => (
                <span
                  key={perm}
                  className="pa-badge pa-badge--neutral"
                  style={{ fontSize: '11px', textTransform: 'capitalize' }}
                >
                  {perm}
                </span>
              ))
            ) : (
              <span className="pa-text-muted">{t('admin.staff.noPermissions')}</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      label: t('admin.staff.status'),
      render: (row) => (
        <span className={`pa-badge ${row.is_active ? 'pa-badge--success' : 'pa-badge--neutral'}`}>
          {row.is_active ? t('admin.staff.active') : t('admin.staff.inactive')}
        </span>
      ),
    },
    {
      id: 'created_at',
      label: t('admin.staff.added'),
      render: (row) => formatDate(row.created_at, 'short'),
    },
    {
      id: 'actions',
      label: t('admin.staff.actions'),
      align: 'right',
      render: (row) => (
        <div className="pa-flex pa-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="compact"
            onClick={() => setEditingStaff(row)}
            disabled={!row.is_active}
          >
            {t('admin.staff.editPermissions')}
          </Button>
          <Button
            variant="ghost"
            size="compact"
            onClick={() => setViewingAuditLog(row.id)}
          >
            {t('admin.staff.auditLog')}
          </Button>
          {row.is_active && (
            <Button
              variant="ghost"
              size="compact"
              onClick={() => handleRevokeAccess(row.user_id)}
            >
              {t('admin.staff.revokeAccess')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
        <div>
          <h2 className="pa-heading-m">{t('admin.staff.title')}</h2>
          <p className="pa-body-s pa-text-muted">
            {t('admin.staff.description')}
          </p>
        </div>
        <OrgAdminButton
          variant="primary"
          icon="add"
          onClick={() => setShowAddModal(true)}
        >
          {t('admin.staff.addStaffMember')}
        </OrgAdminButton>
      </div>

      {error && (
        <InlineNotice
          tone="error"
          title={t('admin.staff.unableToLoad')}
          message={error}
          actions={
            <Button
              variant="ghost"
              size="dense"
              icon="refresh"
              onClick={fetchStaff}
              disabled={loading}
            >
              {t('admin.staff.retry')}
            </Button>
          }
          onClose={() => setError(null)}
          className="pa-mb-4"
        />
      )}

      <Card>
        <PlatformDataTable
          columns={columns}
          rows={staff}
          loading={loading}
          totalCount={staff.length}
          page={0}
          rowsPerPage={staff.length || 25}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          emptyMessage={t('admin.staff.noStaff')}
        />
      </Card>

      {showAddModal && (
        <AddStaffModal
          organizationId={organizationId}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddStaff}
        />
      )}

      {editingStaff && (
        <StaffPermissionEditor
          staffMember={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={(permissions) => handleUpdatePermissions(editingStaff.user_id, permissions)}
        />
      )}

      {viewingAuditLog && (
        <StaffAuditLog
          orgUserId={viewingAuditLog}
          onClose={() => setViewingAuditLog(null)}
        />
      )}
    </div>
  )
}
