/**
 * Staff Audit Log
 * 
 * Modal showing audit log for a staff member.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { 
  Button,
  PlatformDataTable,
  InlineNotice,
  type ColumnConfig 
} from '../../../components/platformAdmin'
import Modal from '../../../components/platformAdmin/Modal'
import { formatDate } from '../../../utils/dateFormatters'

interface AuditLogEntry {
  id: string
  action: string
  changed_by: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
  changed_by_user?: {
    email: string | null
    display_name: string | null
  }
}

interface StaffAuditLogProps {
  orgUserId: string
  onClose: () => void
}

export default function StaffAuditLog({ orgUserId, onClose }: StaffAuditLogProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAuditLog = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('org_user_audit_log')
          .select(`
            id,
            action,
            changed_by,
            old_values,
            new_values,
            created_at,
            changed_by_user:users!org_user_audit_log_changed_by_fkey(email, display_name)
          `)
          .eq('org_user_id', orgUserId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (fetchError) {
          setError(fetchError.message || 'Failed to load audit log')
          setEntries([])
        } else {
          setEntries((data || []) as AuditLogEntry[])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log')
        setEntries([])
      } finally {
        setLoading(false)
      }
    }

    fetchAuditLog()
  }, [orgUserId])

  const columns: ColumnConfig<AuditLogEntry>[] = [
    {
      id: 'created_at',
      label: 'Date',
      render: (row) => formatDate(row.created_at, 'long'),
    },
    {
      id: 'action',
      label: 'Action',
      render: (row) => (
        <span className="pa-badge pa-badge--neutral" style={{ textTransform: 'capitalize' }}>
          {row.action}
        </span>
      ),
    },
    {
      id: 'changed_by',
      label: 'Changed By',
      render: (row) => row.changed_by_user?.display_name || row.changed_by_user?.email || 'System',
    },
    {
      id: 'changes',
      label: 'Changes',
      render: (row) => {
        const changes: string[] = []
        if (row.new_values) {
          Object.keys(row.new_values).forEach((key) => {
            const oldVal = row.old_values?.[key]
            const newVal = row.new_values[key]
            if (oldVal !== newVal) {
              changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`)
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
                {changes.length > 3 && <li>...and {changes.length - 3} more</li>}
              </ul>
            ) : (
              <span className="pa-text-muted">No changes recorded</span>
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
      title="Staff Audit Log"
      size="large"
    >
      <div className="pa-space-y-4">
        {error && (
          <InlineNotice
            tone="error"
            title="Unable to load audit log"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <PlatformDataTable
          columns={columns}
          rows={entries}
          loading={loading}
          totalCount={entries.length}
          page={0}
          rowsPerPage={entries.length || 25}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          emptyMessage="No audit log entries found."
        />

        <div className="pa-flex pa-justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
