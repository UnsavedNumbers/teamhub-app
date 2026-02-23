/**
 * Import Features Modal
 * 
 * Modal for importing features from JSON file for bulk updates.
 */

import React, { useState, useRef } from 'react'
import { Button } from './index'

interface ImportFeaturesModalProps {
  open: boolean
  onConfirm: (file: File) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ImportFeaturesModal({
  open,
  onConfirm,
  onCancel,
  loading = false,
}: ImportFeaturesModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.json')) {
      setError('Please select a JSON file')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Preview the file content
    try {
      const text = await selectedFile.text()
      const parsed = JSON.parse(text)
      setPreview(parsed)
    } catch (err) {
      setError('Invalid JSON file. Please check the file format.')
      setFile(null)
      setPreview(null)
    }
  }

  const handleDownloadTemplate = () => {
    // Create template inline (since static files may not be accessible)
    const template = {
      version: "1.0",
      description: "Template for bulk importing/updating features. Match features by feature_key. Use the exported CSV as reference for feature_key values.",
      features: [
        {
          feature_key: "example.feature.key",
          display_name: "Example Feature Name",
          category: "Scheduling & Calendar",
          feature_type: "module",
          description: "Optional description of the feature",
          rollout_status: "Live",
          tier_keys: ["free", "pro", "enterprise"],
          role_visibility: {
            admin: true,
            coach: true,
            parent: false
          },
          is_system_feature: false,
          platform_admin_only: false,
          parent_feature_key: null
        }
      ],
      field_descriptions: {
        feature_key: "Required. Unique identifier for the feature (matches exported CSV). Used to identify which feature to update.",
        display_name: "Optional. Human-readable name for the feature.",
        category: "Optional. Must be one of: Scheduling & Calendar, Teams & Rosters, Messaging & Communication, Payments, Registration & Forms, Tryouts, Travel, Uniforms & Gear, Photo Galleries, Video Library, Reporting & Analytics, Admin & Permissions, Integrations, Security & Compliance, Support Tools, Uncategorized",
        feature_type: "Optional. Must be one of: module, permission, limit, visibility, integration",
        description: "Optional. Description of the feature.",
        rollout_status: "Optional. Must be one of: Live, Disabled, Draft, Deprecated, Review",
        tier_keys: "Optional. Array of license tier keys (e.g., ['free', 'pro', 'enterprise']). Features will be assigned to these tiers. Empty array removes all tier assignments.",
        role_visibility: {
          admin: "Optional boolean. Whether visible to org admins.",
          coach: "Optional boolean. Whether visible to coaches.",
          parent: "Optional boolean. Whether visible to parents/guardians."
        },
        is_system_feature: "Optional boolean. If true, feature is available to all tiers automatically.",
        platform_admin_only: "Optional boolean. If true, feature is only available to platform admins.",
        parent_feature_key: "Optional. Feature key of parent feature for hierarchy. Set to null for top-level features."
      },
      notes: [
        "Only include fields you want to update. Omit fields to leave them unchanged.",
        "Features are matched by feature_key. If a feature_key doesn't exist, that feature will be skipped.",
        "Locked features (is_toggleable=false) cannot have their status changed or be removed from tiers.",
        "Setting is_system_feature=true will remove all tier assignments.",
        "Setting platform_admin_only=true will remove all tier assignments.",
        "Use the exported CSV to find feature_key values for existing features."
      ]
    }
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'feature-import-template.json'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleConfirm = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setError(null)
    try {
      await onConfirm(file)
      // Reset after successful import
      setFile(null)
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err.message || 'Import failed')
    }
  }

  const handleCancel = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onCancel()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleCancel}
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
            maxWidth: '700px',
            margin: 'var(--pa-space-4)',
            padding: 0,
          }}
        >
          {/* Header */}
          <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
            <h2 className="pa-h2" style={{ margin: 0, color: 'var(--pa-primary)' }}>
              Import Features
            </h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              Upload a JSON file to bulk update features and their settings. Use the exported CSV as reference for feature_key values.
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            {error && (
              <div
                style={{
                  padding: 'var(--pa-space-3)',
                  marginBottom: 'var(--pa-space-4)',
                  backgroundColor: 'var(--pa-danger-bg)',
                  border: '1px solid var(--pa-danger)',
                  borderRadius: '8px',
                  color: 'var(--pa-danger)',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: 'var(--pa-space-4)' }}>
              <Button
                variant="secondary"
                onClick={handleDownloadTemplate}
                style={{ marginBottom: 'var(--pa-space-3)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>
                  download
                </span>
                Download Template
              </Button>
            </div>

            <div style={{ marginBottom: 'var(--pa-space-4)' }}>
              <label
                htmlFor="file-input"
                style={{
                  display: 'block',
                  marginBottom: 'var(--pa-space-2)',
                  fontWeight: 600,
                  color: 'var(--pa-n900)',
                }}
              >
                Select JSON File
              </label>
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--pa-space-3)',
                  border: '1px solid var(--pa-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            {preview && (
              <div
                style={{
                  marginTop: 'var(--pa-space-4)',
                  padding: 'var(--pa-space-3)',
                  backgroundColor: 'var(--pa-neutral-50)',
                  borderRadius: '8px',
                  border: '1px solid var(--pa-border)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 'var(--pa-space-2)' }}>
                  Preview ({preview.features?.length || 0} feature{preview.features?.length !== 1 ? 's' : ''})
                </div>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    fontFamily: 'var(--pa-font-mono)',
                    fontSize: '12px',
                    color: 'var(--pa-n700)',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(preview, null, 2).substring(0, 500)}
                    {JSON.stringify(preview, null, 2).length > 500 ? '...' : ''}
                  </pre>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 'var(--pa-space-4)',
                padding: 'var(--pa-space-3)',
                backgroundColor: 'var(--pa-info-bg)',
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--pa-n700)',
              }}
            >
              <strong>Note:</strong> Features are matched by <code>feature_key</code>. Only fields included in the JSON will be updated. Locked features cannot have their status changed or be removed from tiers.
            </div>
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
            <Button variant="secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={loading || !file}
              loading={loading}
            >
              Import
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
