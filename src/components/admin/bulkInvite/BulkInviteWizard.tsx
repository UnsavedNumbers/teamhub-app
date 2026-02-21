/**
 * Bulk Invite Wizard Component
 * 
 * Multi-step wizard for bulk invite import with validation and preview
 */

import { useState, useCallback, useEffect } from 'react'
import { useT } from '@/i18n/useI18n'
import { useUserContext } from '@/hooks/useUserContext'
import { isDemoMode, assertNotDemoMode } from '@/utils/demoMode'
import {
  downloadBulkInviteTemplate,
  uploadBulkInviteFile,
  validateBulkInviteFile,
  startBulkInviteImport,
  getBulkInviteJobStatus,
  downloadBulkInviteErrorsCSV,
  type ValidationResult,
  type ImportJobStatus,
} from '@/data/services/bulkInviteService'
import { FileUpload } from '@/components/common/FileUpload'
import { Button, Card, Badge } from '@/components/admin'
import { showError, showSuccess } from '@/utils/toast'
import ValidationErrorsDisplay from './ValidationErrorsDisplay'

type WizardStep = 'download' | 'upload' | 'validation' | 'preview' | 'confirm' | 'running' | 'results'

interface BulkInviteWizardProps {
  onComplete?: () => void
  onCancel?: () => void
}

export default function BulkInviteWizard({ onComplete, onCancel }: BulkInviteWizardProps) {
  const t = useT()
  const { context } = useUserContext()
  const [step, setStep] = useState<WizardStep>('download')
  const [file, setFile] = useState<File | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  const orgId = context?.orgId
  if (!orgId) {
    return <div>{t('common.error.permissionDenied')}</div>
  }

  // Block in demo mode
  if (isDemoMode()) {
    return (
      <Card>
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">{t('admin.bulkInvite.demoModeBlocked.title')}</h3>
          <p className="text-gray-600 mb-4">{t('admin.bulkInvite.demoModeBlocked.message')}</p>
          <Button onClick={() => window.location.href = '/signup'}>{t('admin.bulkInvite.demoModeBlocked.signUp')}</Button>
        </div>
      </Card>
    )
  }

  // Detect offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleDownloadTemplate = useCallback(async () => {
    assertNotDemoMode('download bulk invite template')
    if (isOffline) {
      setError(t('common.error.offline'))
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const { error: downloadError } = await downloadBulkInviteTemplate(orgId)
      if (downloadError) {
        setError(downloadError.message)
        showError(t('admin.bulkInvite.errors.downloadTemplateFailed'))
      } else {
        showSuccess('Template downloaded successfully')
        setStep('upload')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [orgId, t, isOffline])

  const handleFileSelect = useCallback(async (selectedFile: File | null) => {
    assertNotDemoMode('upload bulk invite file')
    if (isOffline) {
      setError(t('common.error.offline'))
      return
    }
    
    if (!selectedFile) {
      setFile(null)
      setFilePath(null)
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setError(null)

    try {
      // Upload file
      const { filePath: uploadedPath, error: uploadError } = await uploadBulkInviteFile(orgId, selectedFile)
      if (uploadError || !uploadedPath) {
        setError(uploadError?.message || 'Upload failed')
        showError(t('admin.bulkInvite.errors.uploadFailed'))
        return
      }

      setFilePath(uploadedPath)

      // Validate file
      const { data: validation, error: validationError } = await validateBulkInviteFile(orgId, uploadedPath)
      if (validationError || !validation) {
        setError(validationError?.message || 'Validation failed')
        showError(t('admin.bulkInvite.errors.validationFailed'))
        return
      }

      setValidationResult(validation)

      if (validation.valid) {
        setStep('preview')
      } else {
        setStep('validation')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [orgId, t, isOffline])

  const handleStartImport = useCallback(async () => {
    assertNotDemoMode('start bulk invite import')
    if (isOffline) {
      setError(t('common.error.offline'))
      return
    }
    
    if (!filePath || !file || !validationResult) return

    setLoading(true)
    setError(null)
    setStep('running')

    try {
      const { data, error: importError } = await startBulkInviteImport(
        orgId,
        filePath,
        file.name,
        file.size,
        validationResult.totals
      )

      if (importError || !data) {
        setError(importError?.message || 'Failed to start import')
        showError(t('admin.bulkInvite.errors.importStartFailed'))
        setStep('confirm')
        return
      }

      setJobId(data.jobId)
      showSuccess('Import started successfully')
      
      // Start polling for job status
      pollJobStatus(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStep('confirm')
    } finally {
      setLoading(false)
    }
  }, [orgId, filePath, file, validationResult, t, isOffline])

  const pollJobStatus = useCallback(async (id: string) => {
    const pollInterval = setInterval(async () => {
      if (!orgId) return
      
      const { data: status, error: statusError } = await getBulkInviteJobStatus(orgId, id)
      
      if (statusError || !status) {
        clearInterval(pollInterval)
        return
      }
      
      setJobStatus(status)
      
      // Stop polling if job is complete or failed
      if (status.status === 'completed' || status.status === 'completed_with_errors' || status.status === 'failed') {
        clearInterval(pollInterval)
        setStep('results')
      }
    }, 2000) // Poll every 2 seconds
    
    // Cleanup on unmount
    return () => clearInterval(pollInterval)
  }, [orgId])
  
  useEffect(() => {
    if (!jobId || step !== 'running') return
    let cleanup: (() => void) | undefined
    pollJobStatus(jobId).then((c) => {
      cleanup = c
    })
    return () => {
      cleanup?.()
    }
  }, [jobId, step, pollJobStatus])

  const handleBack = useCallback(() => {
    if (step === 'upload') setStep('download')
    else if (step === 'validation') setStep('upload')
    else if (step === 'preview') setStep('validation')
    else if (step === 'confirm') setStep('preview')
  }, [step])

  const handleNext = useCallback(() => {
    if (step === 'download') setStep('upload')
    else if (step === 'validation' && validationResult?.valid) setStep('preview')
    else if (step === 'preview') setStep('confirm')
  }, [step, validationResult])

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {(['download', 'upload', 'validation', 'preview', 'confirm'] as WizardStep[]).map((s, idx) => (
            <div
              key={s}
              className={`h-2 w-12 rounded ${
                step === s ? 'bg-blue-600' : idx < ['download', 'upload', 'validation', 'preview', 'confirm'].indexOf(step) ? 'bg-gray-300' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card>
        {step === 'download' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('admin.bulkInvite.steps.download.title')}</h2>
            <p className="text-gray-600">{t('admin.bulkInvite.steps.download.subtitle')}</p>
            {isOffline && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                <div className="text-sm text-yellow-800">{t('common.error.offline')}</div>
              </div>
            )}
            <div className="flex justify-start">
              <Button onClick={handleDownloadTemplate} disabled={loading || isOffline}>
                {loading ? 'Downloading...' : t('admin.bulkInvite.downloadTemplate')}
              </Button>
            </div>
            {error && <div className="text-red-600">{error}</div>}
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('admin.bulkInvite.steps.upload.title')}</h2>
            <p className="text-gray-600">{t('admin.bulkInvite.steps.upload.subtitle')}</p>
            {isOffline && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                <div className="text-sm text-yellow-800">{t('common.error.offline')}</div>
              </div>
            )}
            <div className="max-w-2xl">
              <FileUpload
                onFileSelect={handleFileSelect}
                value={file}
                accept=".xlsx,.csv"
                maxSize={10 * 1024 * 1024}
                showDropZone
                fullWidth
                disabled={isOffline}
              />
            </div>
            {error && <div className="text-red-600">{error}</div>}
          </div>
        )}

        {step === 'validation' && validationResult && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('admin.bulkInvite.steps.validation.title')}</h2>
            <p className="text-gray-600">{t('admin.bulkInvite.steps.validation.subtitle')}</p>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">{t('admin.bulkInvite.steps.validation.blockingErrors')}</div>
                <div className="text-2xl font-bold">{validationResult.blocking_errors}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">{t('admin.bulkInvite.steps.validation.warnings')}</div>
                <div className="text-2xl font-bold">{validationResult.warnings}</div>
              </div>
            </div>

            {/* Detailed Errors and Warnings */}
            <ValidationErrorsDisplay validationResult={validationResult} />
          </div>
        )}

        {step === 'preview' && validationResult && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold oa-card-title">{t('admin.bulkInvite.steps.preview.title')}</h2>
            <p className="text-sm" style={{ color: 'var(--org-text-secondary, var(--pa-text-secondary))' }}>
              {t('admin.bulkInvite.steps.preview.subtitle')}
            </p>
            
            {/* Consolidated Users Preview */}
            <div>
              <h3 className="font-semibold oa-card-title" style={{ marginBottom: '1.5rem' }}>
                {t('admin.bulkInvite.steps.preview.consolidatedUsers')}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {validationResult.consolidated_preview.map((user) => {
                  // Map role codes to display names
                  const roleDisplayNames: Record<string, string> = {
                    org_admin: 'Organization Admin',
                    coach: 'Coach',
                    parent: 'Guardian',
                    athlete: 'Athlete',
                  }
                  
                  const displayRoles = user.roles
                    .map(role => roleDisplayNames[role] || role)
                    .join(' / ')
                  
                  // User is valid if no blocking errors and no name conflicts
                  const isValid = user.name_conflicts.length === 0
                  
                  return (
                    <div key={user.email} className="oa-bulk-invite-preview-card relative">
                      <div className="flex items-start gap-3">
                        {/* Left column: Badges */}
                        <div className="flex-shrink-0 flex flex-col gap-2 items-start">
                          <Badge 
                            variant="neutral" 
                            className="text-xs"
                            style={{
                              background: 'var(--org-badge-primary-bg, var(--pa-theme-surface-accent, rgba(19, 127, 236, 0.1)))',
                              color: 'var(--org-badge-primary-text, var(--pa-theme-text-accent, var(--org-btn-primary-bg, #137fec)))',
                            }}
                          >
                            {displayRoles}
                          </Badge>
                          {user.is_new_user && (
                            <Badge 
                              variant="info" 
                              className="text-xs w-fit"
                              style={{
                                background: 'var(--org-badge-primary-bg, var(--pa-theme-surface-accent, rgba(19, 127, 236, 0.1)))',
                                color: 'var(--org-badge-primary-text, var(--pa-theme-text-accent, var(--org-btn-primary-bg, #137fec)))',
                              }}
                            >
                              New user
                            </Badge>
                          )}
                          {!user.is_new_user && (
                            <div className="text-xs" style={{ color: 'var(--org-text-muted, var(--pa-text-muted))' }}>
                              {user.existing_org_member ? 'Existing (in org)' : 'Existing (new to org)'}
                            </div>
                          )}
                        </div>
                        
                        {/* Right column: Name and Email */}
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="font-bold mb-1" style={{ color: 'var(--org-text-primary, var(--pa-text-primary))' }}>
                            {user.name}
                          </div>
                          <div className="font-bold text-sm" style={{ color: 'var(--org-text-secondary, var(--pa-text-secondary))' }}>
                            {user.email}
                          </div>
                        </div>
                        
                        {/* Checkmark: Middle aligned, floating right */}
                        {isValid && (
                          <span 
                            className="material-symbols-outlined absolute top-1/2 right-3 -translate-y-1/2" 
                            style={{ 
                              fontSize: '18px', 
                              color: 'var(--org-status-success, #10B981)' 
                            }}
                          >
                            check_circle
                          </span>
                        )}
                      </div>
                      {user.name_conflicts.length > 0 && (
                        <div className="text-xs mt-2" style={{ color: 'var(--org-status-warning, #F59E0B)' }}>
                          Name conflicts: {user.name_conflicts.map(c => `${c.sheet}: ${c.name}`).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Athlete-Guardian Links Preview */}
            {validationResult.athlete_guardian_links.length > 0 && (
              <div>
                <h3 className="font-semibold oa-card-title" style={{ marginBottom: '1.5rem' }}>
                  {t('admin.bulkInvite.steps.preview.athleteLinks')}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {validationResult.athlete_guardian_links.map((link, idx) => {
                    const getStatusClass = () => {
                      if (link.status === 'ok') {
                        return 'oa-bulk-invite-link-card--success'
                      } else if (link.status === 'missing') {
                        return 'oa-bulk-invite-link-card--error'
                      } else {
                        return 'oa-bulk-invite-link-card--warning'
                      }
                    }
                    const getStatusTextColor = () => {
                      if (link.status === 'ok') {
                        return 'var(--org-status-success, #10B981)'
                      } else if (link.status === 'missing') {
                        return 'var(--org-status-error, #EF4444)'
                      } else {
                        return 'var(--org-status-warning, #F59E0B)'
                      }
                    }
                    
                    const isValid = link.status === 'ok'
                    
                    return (
                      <div
                        key={idx}
                        className={`oa-bulk-invite-link-card ${getStatusClass()}`}
                      >
                        <div className="flex items-start gap-2">
                          {isValid && (
                            <span 
                              className="material-symbols-outlined flex-shrink-0 mt-0.5" 
                              style={{ 
                                fontSize: '18px', 
                                color: 'var(--org-status-success, #10B981)' 
                              }}
                            >
                              check_circle
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium mb-1" style={{ color: 'var(--org-text-primary, var(--pa-text-primary))' }}>
                              {link.athlete_name}
                            </div>
                            <div className="text-xs mb-2" style={{ color: 'var(--org-text-secondary, var(--pa-text-secondary))' }}>
                              {link.athlete_email}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--org-text-secondary, var(--pa-text-secondary))' }}>
                              Guardian: {link.guardian_name || link.guardian_email} 
                              {link.guardian_source === 'existing' && ' (existing)'}
                            </div>
                            {link.status !== 'ok' && (
                              <div className="text-xs mt-2" style={{ color: getStatusTextColor() }}>
                                Status: {link.status}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && validationResult && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('admin.bulkInvite.steps.confirm.title')}</h2>
            <p className="text-gray-600">{t('admin.bulkInvite.steps.confirm.subtitle')}</p>
            <div className="flex justify-start">
              <Button onClick={handleStartImport} disabled={loading}>
                {loading ? 'Starting...' : t('admin.bulkInvite.steps.confirm.startImport')}
              </Button>
            </div>
          </div>
        )}

        {step === 'running' && jobStatus && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('admin.bulkInvite.steps.running.title')}</h2>
            <p className="text-gray-600">{t('admin.bulkInvite.steps.running.subtitle')}</p>
            
            {jobStatus.progress_json ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{jobStatus.progress_json.step || 'Processing...'}</span>
                  <span>
                    {jobStatus.progress_json.completed ?? 0} / {jobStatus.progress_json.total ?? 0}
                  </span>
                </div>
                {jobStatus.progress_json.total != null && jobStatus.progress_json.total > 0 ? (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(((jobStatus.progress_json.completed ?? 0) / jobStatus.progress_json.total) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            
            <div className="text-sm text-gray-600">{t('admin.bulkInvite.steps.running.safeToNavigate')}</div>
          </div>
        )}

        {step === 'results' && jobStatus && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('admin.bulkInvite.steps.results.title')}</h2>
            <p className="text-gray-600">{t('admin.bulkInvite.steps.results.subtitle')}</p>
            
            {jobStatus.status === 'completed' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="font-medium text-green-800">{t('admin.bulkInvite.steps.results.success')}</div>
                {jobStatus.totals_json ? (
                  <div className="mt-2 text-sm text-green-700">
                    <div>Unique users: {jobStatus.totals_json.unique_emails ?? 0}</div>
                    <div>Athletes: {jobStatus.totals_json.athletes ?? 0}</div>
                    <div>Guardians: {jobStatus.totals_json.guardians ?? 0}</div>
                    <div>Coaches: {jobStatus.totals_json.coaches ?? 0}</div>
                  </div>
                ) : null}
              </div>
            )}
            
            {jobStatus.status === 'completed_with_errors' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-medium text-yellow-800">{t('admin.bulkInvite.steps.results.completedWithErrors')}</div>
                {jobStatus.error_summary ? (
                  <div className="mt-2 text-sm text-yellow-700">
                    {JSON.stringify(jobStatus.error_summary)}
                  </div>
                ) : null}
              </div>
            )}
            
            {jobStatus.status === 'failed' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <div className="font-medium text-red-800">{t('admin.bulkInvite.steps.results.failed')}</div>
                {jobStatus.error_summary ? (
                  <div className="mt-2 text-sm text-red-700">
                    {JSON.stringify(jobStatus.error_summary)}
                  </div>
                ) : null}
              </div>
            )}
            
            <div className="flex gap-2 justify-start">
              <Button onClick={onComplete}>{t('admin.bulkInvite.viewHistory')}</Button>
              {jobStatus.status === 'completed_with_errors' && jobId && (
                <Button 
                  variant="secondary"
                  onClick={async () => {
                    if (!orgId || !jobId) return
                    const { error } = await downloadBulkInviteErrorsCSV(orgId, jobId)
                    if (error) {
                      showError(error.message)
                    }
                  }}
                >
                  {t('admin.bulkInvite.steps.results.downloadResults')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between gap-4">
        <Button variant="secondary" onClick={step === 'download' ? onCancel : handleBack} disabled={loading}>
          {t('common.back')}
        </Button>
        {step !== 'download' && step !== 'running' && step !== 'results' && (
          <Button onClick={handleNext} disabled={loading || (step === 'validation' && !validationResult?.valid)}>
            {t('common.next')}
          </Button>
        )}
      </div>
    </div>
  )
}
