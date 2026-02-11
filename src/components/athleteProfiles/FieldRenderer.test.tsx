import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldRenderer } from './FieldRenderer'
import type { SportFieldDefinition } from '@/types/athleteSportProfiles'

const textField: SportFieldDefinition = {
  id: 'f1',
  sport_code: 'basketball',
  field_key: 'position',
  field_label: 'Position',
  field_group: 'profile',
  field_type: 'text',
  enum_values: null,
  unit: null,
  help_text: null,
  is_optional: false,
  is_enabled: true,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
}

describe('FieldRenderer', () => {
  test('renders text field with label', () => {
    const onChange = vi.fn()
    render(<FieldRenderer field={textField} value="" onChange={onChange} />)
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument()
  })

  test('calls onChange when value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FieldRenderer field={textField} value="" onChange={onChange} />)
    await user.type(screen.getByLabelText(/position/i), 'x')
    expect(onChange).toHaveBeenCalled()
  })
})
