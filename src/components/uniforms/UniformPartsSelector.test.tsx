import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniformPartsSelector } from './UniformPartsSelector'
import type { SportUniformConfig } from '@/types/uniforms'

const mockConfig: SportUniformConfig = {
  visibleParts: ['jersey', 'shorts', 'hat'],
  fields: [],
}

describe('UniformPartsSelector', () => {
  test('renders empty state when no config', () => {
    render(
      <UniformPartsSelector config={null} selectedParts={[]} onPartsChange={vi.fn()} />
    )
    expect(screen.getByText(/select a sport/i)).toBeInTheDocument()
  })

  test('renders part buttons when config provided', () => {
    const onPartsChange = vi.fn()
    render(
      <UniformPartsSelector config={mockConfig} selectedParts={[]} onPartsChange={onPartsChange} />
    )
    expect(screen.getByRole('button', { name: 'jersey' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'shorts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'hat' })).toBeInTheDocument()
  })

  test('calls onPartsChange when part clicked', async () => {
    const user = userEvent.setup()
    const onPartsChange = vi.fn()
    render(
      <UniformPartsSelector config={mockConfig} selectedParts={[]} onPartsChange={onPartsChange} />
    )
    await user.click(screen.getByRole('button', { name: 'jersey' }))
    expect(onPartsChange).toHaveBeenCalledWith(['jersey'])
  })
})
