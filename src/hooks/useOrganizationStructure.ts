import { useContext } from 'react'
import { Context } from '../contexts/OrganizationStructureContext'

export function useOrganizationStructure() {
  const ctx = useContext(Context)
  if (!ctx) {
    throw new Error('useOrganizationStructure must be used within OrganizationStructureProvider')
  }
  return ctx
}
