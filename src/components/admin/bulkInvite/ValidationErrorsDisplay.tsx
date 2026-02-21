/**
 * Validation Errors Display Component
 * 
 * Shows validation errors and warnings in expandable sections per sheet
 */

import { useState } from 'react'
import { useT } from '@/i18n/useI18n'
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react'
import type { ValidationResult } from '@/data/services/bulkInviteService'

interface ValidationErrorsDisplayProps {
  validationResult: ValidationResult
}

export default function ValidationErrorsDisplay({ validationResult }: ValidationErrorsDisplayProps) {
  const t = useT()
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set())

  const toggleSheet = (sheet: string) => {
    const newExpanded = new Set(expandedSheets)
    if (newExpanded.has(sheet)) {
      newExpanded.delete(sheet)
    } else {
      newExpanded.add(sheet)
    }
    setExpandedSheets(newExpanded)
  }

  // Group errors by sheet
  const errorsBySheet = new Map<string, typeof validationResult.row_errors>()
  const warningsBySheet = new Map<string, typeof validationResult.row_errors>()

  for (const error of validationResult.row_errors) {
    if (error.severity === 'error') {
      if (!errorsBySheet.has(error.sheet)) {
        errorsBySheet.set(error.sheet, [])
      }
      errorsBySheet.get(error.sheet)!.push(error)
    } else {
      if (!warningsBySheet.has(error.sheet)) {
        warningsBySheet.set(error.sheet, [])
      }
      warningsBySheet.get(error.sheet)!.push(error)
    }
  }

  const allSheets = new Set([
    ...Array.from(errorsBySheet.keys()),
    ...Array.from(warningsBySheet.keys()),
  ])

  return (
    <div className="space-y-4 max-w-full">
      {/* Errors Section */}
      {errorsBySheet.size > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            {t('admin.bulkInvite.steps.validation.errors')} ({validationResult.blocking_errors})
          </h3>
          <div className="space-y-2">
            {Array.from(allSheets).map((sheet) => {
              const errors = errorsBySheet.get(sheet) || []
              if (errors.length === 0) return null

              const isExpanded = expandedSheets.has(`${sheet}-errors`)
              return (
                <div key={`${sheet}-errors`} className="border border-red-200 rounded">
                  <button
                    onClick={() => toggleSheet(`${sheet}-errors`)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">{sheet}</span>
                      <span className="text-sm text-gray-600">({errors.length} errors)</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-red-200">
                      <div className="mt-3 space-y-2">
                        {errors.map((error, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="font-medium text-red-800">
                              Row {error.row > 0 ? error.row : 'Header'}: {error.field || 'General'}
                            </div>
                            <div className="text-red-600">{error.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {warningsBySheet.size > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            {t('admin.bulkInvite.steps.validation.warnings')} ({validationResult.warnings})
          </h3>
          <div className="space-y-2">
            {Array.from(allSheets).map((sheet) => {
              const warnings = warningsBySheet.get(sheet) || []
              if (warnings.length === 0) return null

              const isExpanded = expandedSheets.has(`${sheet}-warnings`)
              return (
                <div key={`${sheet}-warnings`} className="border border-yellow-200 rounded">
                  <button
                    onClick={() => toggleSheet(`${sheet}-warnings`)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">{sheet}</span>
                      <span className="text-sm text-gray-600">({warnings.length} warnings)</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-yellow-200">
                      <div className="mt-3 space-y-2">
                        {warnings.map((warning, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="font-medium text-yellow-800">
                              Row {warning.row > 0 ? warning.row : 'Header'}: {warning.field || 'General'}
                            </div>
                            <div className="text-yellow-600">{warning.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
