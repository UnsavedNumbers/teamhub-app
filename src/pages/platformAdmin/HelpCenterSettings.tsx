/**
 * Help Center Settings Page
 * 
 * Platform admin interface for configuring WordPress integration.
 */

import { useState, useEffect } from 'react'
import { PageHeader } from '../../components/platformAdmin'
import { Card, Button, Input, Select } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { getWordPressConfig, saveWordPressConfig, updateConnectionStatus } from '../../data/services/helpCenterConfigService'
import { testWordPressConnection } from '../../data/services/wordpressApiService'
import { syncWordPressData, type SyncProgress } from '../../data/services/helpCenterSyncService'
import type { HelpCenterConfig } from '../../data/services/helpCenterConfigService'
import { debug } from '../../lib/debug'

export default function HelpCenterSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Form state
  const [apiUrl, setApiUrl] = useState('')
  const [authMethod, setAuthMethod] = useState<'application_password' | 'oauth_token' | 'public'>('application_password')
  const [credentials, setCredentials] = useState('')

  // Config state
  const [config, setConfig] = useState<HelpCenterConfig | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncResult, setSyncResult] = useState<{ success: boolean; errors: string[] } | null>(null)

  // Load existing config
  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    try {
      const result = await getWordPressConfig()
      if (result.error) {
        showError('Failed to load configuration: ' + result.error.message)
        return
      }

      if (result.data) {
        setConfig(result.data)
        setApiUrl(result.data.apiUrl)
        setAuthMethod(result.data.authMethod)
        // Don't load credentials for security
      }
    } catch (err) {
      showError('Failed to load configuration')
      debug.error('HelpCenterSettings', 'Exception loading config', { error: err })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!apiUrl.trim()) {
      showError('WordPress API URL is required')
      return
    }

    setSaving(true)
    try {
      const result = await saveWordPressConfig({
        apiUrl,
        authMethod,
        credentials: credentials.trim() || undefined,
      })

      if (result.error) {
        showError('Failed to save configuration: ' + result.error.message)
        return
      }

      setConfig(result.data)
      showSuccess('Configuration saved successfully')
    } catch (err) {
      showError('Failed to save configuration')
      debug.error('HelpCenterSettings', 'Exception saving config', { error: err })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    if (!apiUrl.trim()) {
      showError('Please enter WordPress API URL first')
      return
    }

    setTesting(true)
    try {
      const result = await testWordPressConnection({
        apiUrl,
        authMethod,
        credentials: credentials.trim() || undefined,
      })

      if (result.error) {
        await updateConnectionStatus('error', result.error.message)
        showError('Connection test failed: ' + result.error.message)
        return
      }

      await updateConnectionStatus('connected')
      showSuccess('Connection test successful!')
      
      // Reload config to show updated status
      await loadConfig()
    } catch (err) {
      await updateConnectionStatus('error', err instanceof Error ? err.message : String(err))
      showError('Connection test failed')
      debug.error('HelpCenterSettings', 'Exception testing connection', { error: err })
    } finally {
      setTesting(false)
    }
  }

  async function handleInitialize() {
    if (!apiUrl.trim()) {
      showError('Please configure and test connection first')
      return
    }

    setSyncing(true)
    setSyncProgress(null)
    setSyncResult(null)

    try {
      const result = await syncWordPressData(
        {
          apiUrl,
          authMethod,
          credentials: credentials.trim() || undefined,
        },
        (progress) => {
          setSyncProgress(progress)
        }
      )

      setSyncResult({
        success: result.success,
        errors: result.errors,
      })

      if (result.success) {
        showSuccess(
          `Sync completed successfully! Synced ${result.categoriesSynced} categories, ` +
          `${result.tagsSynced} tags, ${result.postsSynced} posts, and ${result.pagesSynced} pages.`
        )
      } else {
        showError(
          `Sync completed with errors. ${result.errors.length} error(s). ` +
          `Synced ${result.postsSynced} posts.`
        )
      }

      // Reload config to show updated sync timestamp
      await loadConfig()
    } catch (err) {
      showError('Sync failed: ' + (err instanceof Error ? err.message : String(err)))
      debug.error('HelpCenterSettings', 'Exception syncing', { error: err })
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }

  if (loading) {
    return (
      <div className="pa-root">
        <PageHeader title="Help Center Settings" />
        <Card>
          <p>Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Help Center Settings"
        subtitle="Configure WordPress integration for help center content"
      />

      <div className="pa-content pa-content--narrow">
        {/* WordPress Connection Configuration */}
        <Card>
          <h2 className="pa-h2 pa-mb-4">WordPress Connection</h2>

          <div className="pa-form-group pa-mb-4">
            <Input
              label="WordPress API URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://yourdomain.com/wp-json/wp/v2"
              required
              helper="Enter your WordPress site URL. It will be automatically appended with /wp-json/wp/v2 if needed."
            />
          </div>

          <div className="pa-form-group pa-mb-4">
            <Select
              label="Authentication Method"
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as any)}
              options={[
                { value: 'application_password', label: 'Application Password' },
                { value: 'oauth_token', label: 'OAuth Token' },
                { value: 'public', label: 'Public (No Authentication)' },
              ]}
              helper="Select how to authenticate with WordPress REST API"
            />
          </div>

          {(authMethod === 'application_password' || authMethod === 'oauth_token') && (
            <div className="pa-form-group pa-mb-4">
              <Input
                label={authMethod === 'application_password' ? 'Application Password' : 'OAuth Token'}
                type="password"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder={
                  authMethod === 'application_password'
                    ? 'username:password'
                    : 'Enter OAuth token'
                }
                helper={
                  authMethod === 'application_password'
                    ? 'Format: username:password (created in WordPress Users → Application Passwords)'
                    : 'Enter your OAuth token'
                }
              />
            </div>
          )}

          <div className="pa-flex pa-gap-3 pa-mt-6">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !apiUrl.trim()}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testing || !apiUrl.trim()}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {/* Connection Status */}
          {config && (
            <div className="pa-mt-6 pa-pt-6 pa-border-t">
              <h3 className="pa-h3 pa-mb-3">Connection Status</h3>
              <div className="pa-flex pa-items-center pa-gap-2 pa-mb-2">
                <span className="pa-text-sm pa-text-muted">Status:</span>
                <span
                  className={`pa-badge ${
                    config.connectionStatus === 'connected'
                      ? 'pa-badge--success'
                      : config.connectionStatus === 'error'
                      ? 'pa-badge--error'
                      : 'pa-badge--warning'
                  }`}
                >
                  {config.connectionStatus}
                </span>
              </div>
              {config.lastSyncAt && (
                <div className="pa-text-sm pa-text-muted pa-mb-2">
                  Last sync: {new Date(config.lastSyncAt).toLocaleString()}
                </div>
              )}
              {config.lastError && (
                <div className="pa-text-sm pa-text-error pa-mt-2">
                  Last error: {config.lastError}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Initialize/Resync */}
        <Card className="pa-mt-6">
          <h2 className="pa-h2 pa-mb-4">Sync WordPress Data</h2>
          <p className="pa-text-muted pa-mb-4">
            Initialize or resync help center content from WordPress. This will fetch categories,
            tags, posts, and pages and cache them locally.
          </p>

          <Button
            variant="primary"
            onClick={handleInitialize}
            disabled={syncing || !apiUrl.trim()}
          >
            {syncing ? 'Syncing...' : config ? 'Resync Now' : 'Initialize Help Center'}
          </Button>

          {/* Sync Progress */}
          {syncProgress && (
            <div className="pa-mt-6 pa-pt-6 pa-border-t">
              <h3 className="pa-h3 pa-mb-3">Sync Progress</h3>
              <div className="pa-mb-2">
                <div className="pa-text-sm pa-text-muted pa-mb-1">
                  {syncProgress.message || `Syncing ${syncProgress.step}...`}
                </div>
                {syncProgress.total > 0 && (
                  <div className="pa-progress-bar">
                    <div
                      className="pa-progress-bar__fill"
                      style={{
                        width: `${(syncProgress.progress / syncProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sync Result */}
          {syncResult && !syncing && (
            <div className="pa-mt-6 pa-pt-6 pa-border-t">
              <h3 className="pa-h3 pa-mb-3">Sync Result</h3>
              {syncResult.success ? (
                <div className="pa-text-success pa-text-sm">
                  Sync completed successfully!
                </div>
              ) : (
                <div className="pa-text-error pa-text-sm">
                  Sync completed with errors.
                </div>
              )}
              {syncResult.errors.length > 0 && (
                <div className="pa-mt-3">
                  <details className="pa-text-sm">
                    <summary className="pa-cursor-pointer pa-text-muted">
                      View {syncResult.errors.length} error(s)
                    </summary>
                    <ul className="pa-mt-2 pa-list-disc pa-list-inside">
                      {syncResult.errors.map((error, index) => (
                        <li key={index} className="pa-text-error">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
