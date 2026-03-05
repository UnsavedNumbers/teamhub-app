/**
 * Bulk Invite History Component
 * 
 * Displays past bulk import jobs with status and results
 */

import { useEffect, useState } from 'react'
import { useT } from '@/i18n/useI18n'
import { useUserContext } from '@/hooks/useUserContext'
import { getBulkInviteJobHistory, type ImportJobStatus } from '@/data/services/bulkInviteService'
import { Card, Button, Badge } from '@/components/admin'
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner'

export default function BulkInviteHistory() {
  const t = useT()
  const { context } = useUserContext()
  const [jobs, setJobs] = useState<ImportJobStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orgId = context?.orgId

  useEffect(() => {
    if (!orgId) return

    const loadHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await getBulkInviteJobHistory(orgId)
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setJobs(data || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [orgId])

  const getStatusBadge = (status: ImportJobStatus['status']) => {
    type BadgeV = 'neutral' | 'success' | 'warning' | 'danger'
    const statusMap: Record<string, { label: string; variant: BadgeV }> = {
      draft: { label: t('admin.bulkInvite.history.statusDraft'), variant: 'neutral' },
      validated: { label: t('admin.bulkInvite.history.statusValidated'), variant: 'neutral' },
      running: { label: t('admin.bulkInvite.history.statusRunning'), variant: 'neutral' },
      completed: { label: t('admin.bulkInvite.history.statusCompleted'), variant: 'success' },
      completed_with_errors: { label: t('admin.bulkInvite.history.statusCompletedWithErrors'), variant: 'warning' },
      failed: { label: t('admin.bulkInvite.history.statusFailed'), variant: 'danger' },
    }
    const config = statusMap[status] || statusMap.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return <AdminLoadingSpinner />
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{t('admin.bulkInvite.history.title')}</h2>

      {jobs.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-600">
            {t('admin.bulkInvite.history.noImports')}
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop: Table layout */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full oa-bulk-invite-history-table">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">File Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Uploaded</th>
                  <th className="text-left py-3 px-4 font-semibold">Completed</th>
                  <th className="text-left py-3 px-4 font-semibold">Totals</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div className="font-medium">{job.file_name || 'Unknown file'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {job.finished_at ? new Date(job.finished_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {job.totals_json ? (
                        <div className="space-y-1">
                          {job.totals_json.unique_emails != null && <div>Users: {job.totals_json.unique_emails}</div>}
                          {job.totals_json.athletes != null && <div>Athletes: {job.totals_json.athletes}</div>}
                          {job.totals_json.guardians != null && <div>Guardians: {job.totals_json.guardians}</div>}
                          {job.totals_json.coaches != null && <div>Coaches: {job.totals_json.coaches}</div>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="compact">
                          {t('admin.bulkInvite.history.viewDetails')}
                        </Button>
                        {(job.status === 'completed' || job.status === 'completed_with_errors') && (
                          <Button variant="secondary" size="compact">
                            {t('admin.bulkInvite.history.downloadResults')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card layout */}
          <div className="lg:hidden space-y-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{job.file_name || 'Unknown file'}</div>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      {t('admin.bulkInvite.history.uploadedAt')}: {new Date(job.created_at).toLocaleString()}
                    </div>
                    {job.finished_at && (
                      <div>
                        {t('admin.bulkInvite.history.completedAt')}: {new Date(job.finished_at).toLocaleString()}
                      </div>
                    )}
                    {job.totals_json ? (
                      <div className="mt-2">
                        {t('admin.bulkInvite.history.totals')}: {JSON.stringify(job.totals_json)}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="secondary" size="compact" className="flex-1">
                      {t('admin.bulkInvite.history.viewDetails')}
                    </Button>
                    {(job.status === 'completed' || job.status === 'completed_with_errors') && (
                      <Button variant="secondary" size="compact" className="flex-1">
                        {t('admin.bulkInvite.history.downloadResults')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
