import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NoOrganizationEmptyState } from './NoOrganizationEmptyState'

describe('NoOrganizationEmptyState', () => {
  test('renders title and description', () => {
    render(
      <MemoryRouter>
        <NoOrganizationEmptyState />
      </MemoryRouter>
    )
    expect(screen.getByText(/no organization found/i)).toBeInTheDocument()
    expect(screen.getByText(/set up an organization/i)).toBeInTheDocument()
  })

  test('renders Set Up Organization button', () => {
    render(
      <MemoryRouter>
        <NoOrganizationEmptyState />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /set up organization/i })).toBeInTheDocument()
  })
})
