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
  InlineNotice,
} from '../../../components/platformAdmin'
import OrgDataTable from '../../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../../components/admin/OrgDataTable'
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
import AddStaffModal from '../../../components/admin/staff/AddStaffModal'
import StaffPermissionEditor from '../../../components/admin/staff/StaffPermissionEditor'
import StaffAuditLog from '../../../components/admin/staff/StaffAuditLog'
import { useI18n } from '../../../i18n/useI18n'
import { STAFF_PERMISSION_LABEL_KEYS } from '../../../utils/staffPermissions'

interface StaffSectionProps {
  organizationId: string
}

export default function StaffSection({ organizationId }: StaffSectionProps) {
  const { t } = useI18n() as any
  const { context, isReady } = useUserContext()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [viewingAuditLog, setViewingAuditLog] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

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

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= staff.length) {
      setPage(0)
    }
  }, [page, rowsPerPage, staff.length])

  const handleAddStaff = async (userId: string, permissions: StaffPermissions) => {
    if (!context) return

    try {
      if (!navigator.onLine) {
        showError(t('common.error.offline'))
        return
      }
      const { error: addError } = await addStaffMember(context, {
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
      if (!navigator.onLine) {
        showError(t('common.error.offline'))
        return
      }
      const { error: updateError } = await updateStaffPermissions(
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
      if (!navigator.onLine) {
        showError(t('common.error.offline'))
        return
      }
      const { error: revokeError } = await revokeStaffAccess(
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
          <div className="oa-body-m" style={{ fontWeight: 600 }}>
            {row.user?.display_name || `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || t('common.unknown')}
          </div>
          {row.user?.email && (
            <div className="oa-body-s oa-text-muted">{row.user.email}</div>
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
          .map(([key]) => {
            const labelKey = STAFF_PERMISSION_LABEL_KEYS[key as keyof StaffPermissions]
            return labelKey ? t(labelKey) : key
          })
        
        return (
          <div className="oa-flex oa-gap-1 oa-flex-wrap">
            {activePerms.length > 0 ? (
              activePerms.map((perm) => (
                <span
                  key={perm}
                  className="oa-badge oa-badge--neutral"
                  style={{ fontSize: '11px', textTransform: 'capitalize' }}
                >
                  {perm}
                </span>
              ))
            ) : (
              <span className="oa-text-muted">{t('admin.staff.noPermissions')}</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      label: t('admin.staff.status'),
      render: (row) => (
        <span className={`oa-badge ${row.is_active ? 'oa-badge--success' : 'oa-badge--neutral'}`}>
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
        <div className="oa-flex oa-gap-2" style={{ justifyContent: 'flex-end' }}>
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
            {t('admin.staff.auditLog.label')}
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

  const pagedStaff = staff.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <div>
      <div className="oa-flex oa-justify-between oa-items-center oa-mb-4">
        <div>
          <h2 className="oa-heading-m">{t('admin.staff.title')}</h2>
          <p className="oa-body-s oa-text-muted">
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
          className="oa-mb-4"
        />
      )}

      <Card>
        <OrgDataTable
          columns={columns}
          rows={pagedStaff}
          loading={loading}
          totalCount={staff.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(nextRows) => {
            setRowsPerPage(nextRows)
            setPage(0)
          }}
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
