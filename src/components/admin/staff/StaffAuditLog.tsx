/**
 * Staff Audit Log
 * 
 * Modal showing audit log for a staff member.
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  Button,
  PlatformDataTable,
  InlineNotice,
  type ColumnConfig 
} from '../../../components/platformAdmin'
import Modal from '../../../components/platformAdmin/Modal'
import { formatDate } from '../../../utils/dateFormatters'
import { useI18n } from '../../../i18n/useI18n'
import { getStaffAuditLog, type StaffAuditLogEntry } from '../../../data/services/usersService'

interface StaffAuditLogProps {
  orgUserId: string
  onClose: () => void
}

export default function StaffAuditLog({ orgUserId, onClose }: StaffAuditLogProps) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<StaffAuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const fetchAuditLog = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getStaffAuditLog(orgUserId)
      if (fetchError) {
        setError(fetchError.message || t('admin.staff.auditLog.loadFailed'))
        setEntries([])
      } else {
        setEntries(data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.staff.auditLog.loadFailed'))
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [orgUserId, t])

  useEffect(() => {
    fetchAuditLog()
  }, [fetchAuditLog])

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= entries.length) {
      setPage(0)
    }
  }, [entries.length, page, rowsPerPage])

  const pagedEntries = entries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const columns: ColumnConfig<StaffAuditLogEntry>[] = [
    {
      id: 'created_at',
      label: t('admin.staff.auditLog.columns.date'),
      render: (row) => formatDate(row.created_at, 'long'),
    },
    {
      id: 'action',
      label: t('admin.staff.auditLog.columns.action'),
      render: (row) => (
        <span className="pa-badge pa-badge--neutral" style={{ textTransform: 'capitalize' }}>
          {row.action}
        </span>
      ),
    },
    {
      id: 'changed_by',
      label: t('admin.staff.auditLog.columns.changedBy'),
      render: (row) => row.changed_by_user?.display_name || row.changed_by_user?.email || t('admin.staff.auditLog.system'),
    },
    {
      id: 'changes',
      label: t('admin.staff.auditLog.columns.changes'),
      render: (row) => {
        const changes: string[] = []
        if (row.new_values) {
          Object.keys(row.new_values).forEach((key) => {
            const oldVal = row.old_values?.[key]
            const newVal = row.new_values[key]
            if (oldVal !== newVal) {
              changes.push(`${key}: ${JSON.stringify(oldVal)} -> ${JSON.stringify(newVal)}`)
            }
          })
        }
        return (
          <div className="pa-body-s" style={{ maxWidth: '400px' }}>
            {changes.length > 0 ? (
              <ul className="pa-list-disc pa-list-inside">
                {changes.slice(0, 3).map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
                {changes.length > 3 && <li>{t('admin.staff.auditLog.moreChanges', { count: changes.length - 3 })}</li>}
              </ul>
            ) : (
              <span className="pa-text-muted">{t('admin.staff.auditLog.noChanges')}</span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t('admin.staff.auditLog.title')}
      size="large"
    >
      <div className="pa-space-y-4">
        {error && (
          <InlineNotice
            tone="error"
            title={t('admin.staff.auditLog.unableToLoad')}
            message={error}
            actions={
              <Button
                variant="ghost"
                size="dense"
                icon="refresh"
                onClick={fetchAuditLog}
                disabled={loading}
              >
                {t('admin.staff.retry')}
              </Button>
            }
            onClose={() => setError(null)}
          />
        )}

        <PlatformDataTable
          columns={columns}
          rows={pagedEntries}
          loading={loading}
          totalCount={entries.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(nextRows) => {
            setRowsPerPage(nextRows)
            setPage(0)
          }}
          emptyMessage={t('admin.staff.auditLog.empty')}
        />

        <div className="pa-flex pa-justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
