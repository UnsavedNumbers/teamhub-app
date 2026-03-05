import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoachEmptyState } from './CoachEmptyState'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

describe('CoachEmptyState', () => {
  describe('rendering', () => {
    test('renders default message', () => {
      render(
        <TestWrapper>
          <CoachEmptyState />
        </TestWrapper>
      )
      
      expect(screen.getByText('No Teams Assigned')).toBeInTheDocument()
      expect(screen.getByText('Contact your organization admin to get assigned to a team.')).toBeInTheDocument()
    })

    test('renders custom message', () => {
      const customMessage = 'Please contact support for team assignment.'
      render(
        <TestWrapper>
          <CoachEmptyState message={customMessage} />
        </TestWrapper>
      )
      
      expect(screen.getByText('No Teams Assigned')).toBeInTheDocument()
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    test('has correct styling classes', () => {
      const { container } = render(
        <TestWrapper>
          <CoachEmptyState />
        </TestWrapper>
      )
      
      const emptyState = container.querySelector('.coach-empty-state')
      expect(emptyState).toBeInTheDocument()
    })
  })
})
