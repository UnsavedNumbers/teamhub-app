/**
 * FieldRenderer Component
 * 
 * Universal field renderer that handles all field types dynamically.
 * Renders appropriate input based on field definition.
 * 
 * Design: Clean, breathable inputs with clear labels and helpful guidance.
 */

import { useState, useCallback } from 'react'
import type { SportFieldDefinition } from '../../types/athleteSportProfiles'

interface FieldRendererProps {
  /** Field definition from database */
  field: SportFieldDefinition
  /** Current field value */
  value: unknown
  /** Change handler */
  onChange: (value: unknown) => void
  /** Whether field is required (considers org overrides) */
  isRequired?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Custom help text (org override) */
  customHelpText?: string
  /** Error message */
  error?: string
}

/**
 * FieldRenderer - Renders any field type dynamically
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  isRequired = !field.is_optional,
  disabled = false,
  customHelpText,
  error,
}: FieldRendererProps) {
  const helpText = customHelpText || field.help_text

  // Render based on field type
  switch (field.field_type) {
    case 'text':
      return (
        <TextFieldInput
          field={field}
          value={value as string | null}
          onChange={onChange}
          isRequired={isRequired}
          disabled={disabled}
          helpText={helpText}
          error={error}
        />
      )

    case 'int':
    case 'numeric':
      return (
        <NumberFieldInput
          field={field}
          value={value as number | null}
          onChange={onChange}
          isRequired={isRequired}
          disabled={disabled}
          helpText={helpText}
          error={error}
          isInteger={field.field_type === 'int'}
        />
      )

    case 'bool':
      return (
        <BooleanFieldInput
          field={field}
          value={value as boolean | null}
          onChange={onChange}
          disabled={disabled}
          helpText={helpText}
          error={error}
        />
      )

    case 'enum':
      return (
        <EnumFieldInput
          field={field}
          value={value as string | null}
          onChange={onChange}
          isRequired={isRequired}
          disabled={disabled}
          helpText={helpText}
          error={error}
        />
      )

    case 'multi_enum':
      return (
        <MultiEnumFieldInput
          field={field}
          value={value as string[] | null}
          onChange={onChange}
          isRequired={isRequired}
          disabled={disabled}
          helpText={helpText}
          error={error}
        />
      )

    case 'time':
      return (
        <TimeFieldInput
          field={field}
          value={value as string | null}
          onChange={onChange}
          isRequired={isRequired}
          disabled={disabled}
          helpText={helpText}
          error={error}
        />
      )

    case 'object':
      return (
        <ObjectFieldInput
          field={field}
          value={value as Record<string, unknown> | null}
          onChange={onChange}
          isRequired={isRequired}
          disabled={disabled}
          helpText={helpText}
          error={error}
        />
      )

    default:
      console.warn(`[FieldRenderer] Unknown field type: ${field.field_type}`)
      return null
  }
}

/**
 * Text Field Input
 */
function TextFieldInput({
  field,
  value,
  onChange,
  isRequired,
  disabled,
  helpText,
  error,
}: {
  field: SportFieldDefinition
  value: string | null
  onChange: (value: string | null) => void
  isRequired: boolean
  disabled: boolean
  helpText: string | null
  error?: string
}) {
  return (
    <div className="field-group">
      <label htmlFor={field.field_key} className="field-label">
        {field.field_label}
        {isRequired && <span className="field-required">*</span>}
        {field.unit && <span className="field-unit">({field.unit})</span>}
      </label>
      
      <input
        id={field.field_key}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        placeholder={`Enter ${field.field_label.toLowerCase()}`}
      />
      
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Number Field Input
 */
function NumberFieldInput({
  field,
  value,
  onChange,
  isRequired,
  disabled,
  helpText,
  error,
  isInteger,
}: {
  field: SportFieldDefinition
  value: number | null
  onChange: (value: number | null) => void
  isRequired: boolean
  disabled: boolean
  helpText: string | null
  error?: string
  isInteger: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      onChange(null)
      return
    }
    
    const num = isInteger ? parseInt(val, 10) : parseFloat(val)
    if (!isNaN(num)) {
      onChange(num)
    }
  }

  return (
    <div className="field-group">
      <label htmlFor={field.field_key} className="field-label">
        {field.field_label}
        {isRequired && <span className="field-required">*</span>}
        {field.unit && <span className="field-unit">({field.unit})</span>}
      </label>
      
      <input
        id={field.field_key}
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        step={isInteger ? '1' : '0.01'}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        placeholder={`Enter ${field.field_label.toLowerCase()}`}
      />
      
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Boolean Field Input (Toggle)
 */
function BooleanFieldInput({
  field,
  value,
  onChange,
  disabled,
  helpText,
  error,
}: {
  field: SportFieldDefinition
  value: boolean | null
  onChange: (value: boolean | null) => void
  disabled: boolean
  helpText: string | null
  error?: string
}) {
  return (
    <div className="field-group">
      <div className="field-toggle-wrapper">
        <label htmlFor={field.field_key} className="field-toggle-label">
          <input
            id={field.field_key}
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="field-toggle-input"
          />
          <span className="field-toggle-slider"></span>
          <span className="field-toggle-text">{field.field_label}</span>
        </label>
      </div>
      
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Enum Field Input (Select)
 */
function EnumFieldInput({
  field,
  value,
  onChange,
  isRequired,
  disabled,
  helpText,
  error,
}: {
  field: SportFieldDefinition
  value: string | null
  onChange: (value: string | null) => void
  isRequired: boolean
  disabled: boolean
  helpText: string | null
  error?: string
}) {
  const enumValues = field.enum_values || []

  return (
    <div className="field-group">
      <label htmlFor={field.field_key} className="field-label">
        {field.field_label}
        {isRequired && <span className="field-required">*</span>}
      </label>
      
      <select
        id={field.field_key}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`field-select ${error ? 'field-select-error' : ''}`}
      >
        <option value="">Select {field.field_label.toLowerCase()}</option>
        {enumValues.map((option) => (
          <option key={option} value={option}>
            {formatEnumValue(option)}
          </option>
        ))}
      </select>
      
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Multi-Enum Field Input (Checkboxes)
 */
function MultiEnumFieldInput({
  field,
  value,
  onChange,
  isRequired,
  disabled,
  helpText,
  error,
}: {
  field: SportFieldDefinition
  value: string[] | null
  onChange: (value: string[] | null) => void
  isRequired: boolean
  disabled: boolean
  helpText: string | null
  error?: string
}) {
  const enumValues = field.enum_values || []
  const selectedValues = value || []

  const handleToggle = (option: string) => {
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option]
    
    onChange(newValues.length > 0 ? newValues : null)
  }

  return (
    <div className="field-group">
      <label className="field-label">
        {field.field_label}
        {isRequired && <span className="field-required">*</span>}
      </label>
      
      <div className="field-checkbox-group">
        {enumValues.map((option) => (
          <label key={option} className="field-checkbox-label">
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={() => handleToggle(option)}
              disabled={disabled}
              className="field-checkbox-input"
            />
            <span className="field-checkbox-text">{formatEnumValue(option)}</span>
          </label>
        ))}
      </div>
      
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Time Field Input
 */
function TimeFieldInput({
  field,
  value,
  onChange,
  isRequired,
  disabled,
  helpText,
  error,
}: {
  field: SportFieldDefinition
  value: string | null
  onChange: (value: string | null) => void
  isRequired: boolean
  disabled: boolean
  helpText: string | null
  error?: string
}) {
  return (
    <div className="field-group">
      <label htmlFor={field.field_key} className="field-label">
        {field.field_label}
        {isRequired && <span className="field-required">*</span>}
      </label>
      
      <input
        id={field.field_key}
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`field-input ${error ? 'field-input-error' : ''}`}
      />
      
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Object Field Input (JSON textarea for now - can be enhanced)
 */
function ObjectFieldInput({
  field,
  value,
  onChange,
  isRequired,
  disabled,
  helpText,
  error,
}: {
  field: SportFieldDefinition
  value: Record<string, unknown> | null
  onChange: (value: Record<string, unknown> | null) => void
  isRequired: boolean
  disabled: boolean
  helpText: string | null
  error?: string
}) {
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val === '') {
      onChange(null)
      setJsonError(null)
      return
    }

    try {
      const parsed = JSON.parse(val)
      onChange(parsed)
      setJsonError(null)
    } catch (err) {
      setJsonError('Invalid JSON format')
    }
  }

  return (
    <div className="field-group">
      <label htmlFor={field.field_key} className="field-label">
        {field.field_label}
        {isRequired && <span className="field-required">*</span>}
      </label>
      
      <textarea
        id={field.field_key}
        value={value ? JSON.stringify(value, null, 2) : ''}
        onChange={handleChange}
        disabled={disabled}
        rows={4}
        className={`field-textarea ${error || jsonError ? 'field-textarea-error' : ''}`}
        placeholder={`Enter ${field.field_label.toLowerCase()} as JSON`}
      />
      
      {helpText && <p className="field-help">{helpText}</p>}
      {jsonError && <p className="field-error">{jsonError}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Helper: Format enum value for display
 */
function formatEnumValue(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
