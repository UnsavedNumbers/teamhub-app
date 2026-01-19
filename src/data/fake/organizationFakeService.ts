/**
 * Fake Organization Service
 *
 * Provides organization data for demo mode.
 */

import { FAKE_DATA_DELAY_MS } from '../config'
import type { Organization } from '../../types/domain/Organization'
import type { OrganizationUpdateDTO } from '../services/organizationService'
import {
  fakeOrganizations,
  type FakeOrganization,
  getOrganizationById,
  getOrganizationLicense,
} from './fakeOrganizations'

// Local in-memory store to simulate updates
const organizationStore = new Map<string, FakeOrganization>(
  fakeOrganizations.map((org) => [org.id, { ...org }])
)

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

function mapFakeToDomain(org: FakeOrganization): Organization {
  const license = getOrganizationLicense(org.id)

  return {
    id: org.id,
    name: org.name,
    orgType: org.org_type || null,
    status: org.status,
    createdAt: org.created_at,
    updatedAt: org.updated_at,

    licenseStatus: license?.status ?? null,
    licensePlan: license?.plan ?? null,
    licenseTrialEndsAt: license?.trial_ends_at ?? null,
    licenseCurrentPeriodEnd: license?.current_period_end ?? null,

    payoutAccountId: null,
    payoutsEnabled: false,
    stripeConnected: false,

    teamCount: 0,
    sportCount: 0,
    userCount: 0,

    website: org.website ?? null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    address: org.address_line2
      ? `${org.address_line1 ?? ''}, ${org.address_line2}`.trim()
      : org.address_line1 ?? null,
    city: org.city ?? null,
    state: org.state ?? null,
    zip: org.postal_code ?? null,
  }
}

export async function getOrganizationDetails(
  orgId: string
): Promise<{ data: Organization | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { data: null, error: new Error('Organization ID is required') }
    }

    await simulateDelay()

    const org = organizationStore.get(orgId) ?? getOrganizationById(orgId)
    if (!org) {
      return { data: null, error: new Error('Organization not found') }
    }

    return { data: mapFakeToDomain(org), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateOrganizationDetails(
  orgId: string,
  updates: OrganizationUpdateDTO
): Promise<{ data: Organization | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { data: null, error: new Error('Organization ID is required') }
    }

    if (updates.name !== undefined && updates.name.trim().length === 0) {
      return { data: null, error: new Error('Organization name is required') }
    }

    await simulateDelay()

    const existing = organizationStore.get(orgId)
    if (!existing) {
      return { data: null, error: new Error('Organization not found') }
    }

    const updated: FakeOrganization = {
      ...existing,
      name: updates.name ?? existing.name,
      website: updates.website ?? existing.website,
      phone: updates.phone ?? existing.phone,
      email: updates.email ?? existing.email,
      address_line1: updates.address ?? existing.address_line1,
      city: updates.city ?? existing.city,
      state: updates.state ?? existing.state,
      postal_code: updates.zip ?? existing.postal_code,
      logo_url: updates.logo_path ?? existing.logo_url,
      updated_at: new Date().toISOString(),
    }

    organizationStore.set(orgId, updated)

    return { data: mapFakeToDomain(updated), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function uploadOrganizationLogo(
  orgId: string,
  file: File
): Promise<{ path: string | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { path: null, error: new Error('Organization ID is required') }
    }

    if (!file) {
      return { path: null, error: new Error('Logo file is required') }
    }

    await simulateDelay()

    const ext = file.name.split('.').pop() || 'png'
    const path = `${orgId}/logo.${ext}`

    return { path, error: null }
  } catch (err) {
    return { path: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
