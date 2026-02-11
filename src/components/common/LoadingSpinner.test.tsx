import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  test('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  test('applies size class for medium', () => {
    const { container } = render(<LoadingSpinner size="medium" />)
    expect(container.querySelector('.h-6')).toBeInTheDocument()
  })

  test('applies size class for small', () => {
    const { container } = render(<LoadingSpinner size="small" />)
    expect(container.querySelector('.h-4')).toBeInTheDocument()
  })
})
