/**
 * Export Button Component
 *
 * Dropdown button for exporting reports in various formats.
 */

import { useState, useRef, useEffect } from 'react'
import { useT } from '../../i18n/useI18n'
import { exportToCSV, exportToXLSX, exportToPDF, formatDataForExport } from '../../utils/reporting/exportFormatters'

interface ExportButtonProps {
  data: unknown[]
  filename: string
  title?: string
  columns?: string[]
  disabled?: boolean
}

export function ExportButton({ data, filename, title, columns, disabled = false }: ExportButtonProps) {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const formattedData = formatDataForExport(data)
      const exportFilename = filename || 'report'
      const exportTitle = title || 'Report'

      switch (format) {
        case 'csv':
          exportToCSV(formattedData, exportFilename)
          break
        case 'xlsx':
          exportToXLSX(formattedData, exportFilename)
          break
        case 'pdf':
          const exportColumns = columns || (formattedData.length > 0 ? Object.keys(formattedData[0]) : [])
          exportToPDF(formattedData, exportFilename, exportTitle, exportColumns)
          break
      }
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert(t('admin.reporting.export.error'))
    }
  }

  if (disabled || !data || data.length === 0) {
    return (
      <button
        disabled
        style={{
          padding: '8px 16px',
          border: '1px solid var(--org-border-color)',
          borderRadius: '4px',
          background: 'transparent',
          cursor: 'not-allowed',
          opacity: 0.5,
        }}
      >
        {t('common.download')}
      </button>
    )
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          border: '1px solid var(--org-border-color)',
          borderRadius: '4px',
          background: 'var(--org-btn-primary-bg)',
          color: 'var(--org-btn-primary-text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          download
        </span>
        {t('common.download')}
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--org-bg-primary)',
            border: '1px solid var(--org-border-color)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '150px',
          }}
        >
          <button
            onClick={() => handleExport('csv')}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--org-bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {t('admin.reporting.export.csv')}
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--org-bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {t('admin.reporting.export.xlsx')}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--org-bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {t('admin.reporting.export.pdf')}
          </button>
        </div>
      )}
    </div>
  )
}
