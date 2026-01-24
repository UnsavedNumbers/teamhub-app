/**
 * SportFieldRenderer Component
 * 
 * Renders individual sport-specific fields based on field type.
 * Supports text, select, toggle, color, and number field types.
 */

import { Controller, useFormContext } from 'react-hook-form'
import { Input, Select, Checkbox } from '../platformAdmin'
import type { UniformFieldDefinition } from '../../types/uniforms'

interface SportFieldRendererProps {
  field: UniformFieldDefinition
  name: string
}

export function SportFieldRenderer({ field, name }: SportFieldRendererProps) {
  const { control, watch } = useFormContext()

  // Handle conditional visibility
  if (field.visibility?.dependsOn) {
    const dependsOnValue = watch(field.visibility.dependsOn)
    if (field.visibility.condition && !field.visibility.condition(dependsOnValue)) {
      return null
    }
  }

  switch (field.type) {
    case 'text':
      return (
        <Controller
          name={name}
          control={control}
          rules={{ required: field.required ? `${field.label} is required` : false }}
          render={({ field: formField, fieldState }) => (
            <Input
              label={field.label}
              required={field.required}
              error={fieldState.error?.message}
              {...formField}
              placeholder={field.defaultValue || ''}
            />
          )}
        />
      )

    case 'number':
      return (
        <Controller
          name={name}
          control={control}
          rules={{ 
            required: field.required ? `${field.label} is required` : false,
            min: { value: 0, message: 'Must be a positive number' }
          }}
          render={({ field: formField, fieldState }) => (
            <Input
              type="number"
              label={field.label}
              required={field.required}
              error={fieldState.error?.message}
              {...formField}
              value={formField.value || ''}
            />
          )}
        />
      )

    case 'select':
      if (!field.options) {
        console.warn(`Select field ${field.key} missing options`)
        return null
      }
      return (
        <Controller
          name={name}
          control={control}
          rules={{ required: field.required ? `${field.label} is required` : false }}
          render={({ field: formField, fieldState }) => (
            <Select
              label={field.label}
              required={field.required}
              error={fieldState.error?.message}
              options={(field.options || []).map(opt => ({ value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) }))}
              {...formField}
            />
          )}
        />
      )

    case 'toggle':
      return (
        <Controller
          name={name}
          control={control}
          render={({ field: formField }) => (
            <div className="pa-form-group">
              <Checkbox
                checked={formField.value || false}
                onChange={(e) => formField.onChange(e.target.checked)}
                label={field.label}
              />
            </div>
          )}
        />
      )

    case 'color':
      return (
        <Controller
          name={name}
          control={control}
          rules={{ required: field.required ? `${field.label} is required` : false }}
          render={({ field: formField, fieldState }) => (
            <div className="pa-form-group">
              <label className={`pa-label ${field.required ? 'pa-label--required' : ''}`}>
                {field.label}
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="color"
                  {...formField}
                  value={formField.value || '#000000'}
                  style={{
                    width: '60px',
                    minWidth: '60px',
                    height: '44px',
                    border: '1px solid var(--pa-n300)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <Input
                  {...formField}
                  value={formField.value || '#000000'}
                  placeholder="#000000"
                  error={fieldState.error?.message}
                  style={{ 
                    flex: '1 1 auto',
                    minWidth: '120px'
                  }}
                />
              </div>
              {fieldState.error && (
                <div className="pa-helper pa-helper--error">
                  {fieldState.error.message}
                </div>
              )}
            </div>
          )}
        />
      )

    default:
      console.warn(`Unknown field type: ${field.type}`)
      return null
  }
}

export default SportFieldRenderer
