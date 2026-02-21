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
    const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
      draft: { label: t('admin.bulkInvite.history.statusDraft'), variant: 'default' },
      validated: { label: t('admin.bulkInvite.history.statusValidated'), variant: 'default' },
      running: { label: t('admin.bulkInvite.history.statusRunning'), variant: 'default' },
      completed: { label: t('admin.bulkInvite.history.statusCompleted'), variant: 'success' },
      completed_with_errors: { label: t('admin.bulkInvite.history.statusCompletedWithErrors'), variant: 'warning' },
      failed: { label: t('admin.bulkInvite.history.statusFailed'), variant: 'error' },
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
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{job.file_name || 'Unknown file'}</div>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {t('admin.bulkInvite.history.uploadedAt')}: {new Date(job.created_at).toLocaleString()}
                  </div>
                  {job.finished_at && (
                    <div className="text-sm text-gray-600">
                      {t('admin.bulkInvite.history.completedAt')}: {new Date(job.finished_at).toLocaleString()}
                    </div>
                  )}
                  {job.totals_json && typeof job.totals_json === 'object' && (
                    <div className="text-sm text-gray-600 mt-2">
                      {t('admin.bulkInvite.history.totals')}: {JSON.stringify(job.totals_json)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    {t('admin.bulkInvite.history.viewDetails')}
                  </Button>
                  {job.status === 'completed' || job.status === 'completed_with_errors' ? (
                    <Button variant="outline" size="sm">
                      {t('admin.bulkInvite.history.downloadResults')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
