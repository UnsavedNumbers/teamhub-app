import { describe, expect, it, vi } from 'vitest'
import { getOperationDefinition } from '../operations/registry.ts'
import { resolveAuthorizationContext } from '../core/authz.ts'
import { ApiManagerError } from '../core/errors.ts'

vi.mock('../providers/make.ts', () => ({
  runScenario: vi.fn(async () => ({ status: 200, body: { ok: true } })),
}))

vi.mock('../providers/huggingface.ts', () => ({
  infer: vi.fn(async () => ({ output: [{ summary_text: 'Short summary' }] })),
}))

describe('api gateway operation registry', () => {
  it('denies unknown operations by lookup', () => {
    const operation = getOperationDefinition('automation.unknownOperation')
    expect(operation).toBeNull()
  })

  it('has a Make operation success path definition', async () => {
    const operation = getOperationDefinition('automation.sendDemoRequest')
    expect(operation).not.toBeNull()

    const validation = operation?.validateInput({
      demo_org_id: 'org-1',
      email: 'test@example.com',
      review_url: 'https://example.com/review',
    })

    expect(validation?.ok).toBe(true)

    if (!operation || !validation || !validation.ok) {
      throw new Error('Operation validation unexpectedly failed')
    }

    const result = await operation.handler(validation.data, {
      traceId: 'trace-1',
      authorization: {
        userId: null,
        orgId: null,
        roles: ['public'],
        isPlatformAdmin: false,
        staffPermissions: {},
      },
      definition: operation,
    })

    expect(result).toMatchObject({ statusCode: 200 })
  })

  it('has an HF operation success path definition', async () => {
    const operation = getOperationDefinition('ai.summarizeAnnouncement')
    expect(operation).not.toBeNull()

    const validation = operation?.validateInput({
      announcement: 'This is a long announcement intended for players and guardians to summarize.',
      maxLength: 120,
    })

    expect(validation?.ok).toBe(true)

    if (!operation || !validation || !validation.ok) {
      throw new Error('Operation validation unexpectedly failed')
    }

    const result = await operation.handler(validation.data, {
      traceId: 'trace-2',
      authorization: {
        userId: 'user-1',
        orgId: 'org-1',
        roles: ['org_admin'],
        isPlatformAdmin: false,
        staffPermissions: {},
      },
      definition: operation,
    })

    expect(result).toMatchObject({ summary: 'Short summary' })
  })
})

describe('api gateway authz guardrails', () => {
  function buildSupabaseMock(args: {
    platformRole?: string | null
    memberships?: Array<{ org_id: string; roles: string[] }>
    memberRow?: { org_id: string; role: string; permissions: unknown; is_active: boolean | null } | null
  }) {
    return {
      from: (table: string) => {
        if (table === 'platform_admins') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: args.platformRole ? { role: args.platformRole } : null,
                  error: null,
                }),
              }),
            }),
          }
        }

        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: args.memberRow ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      },
      rpc: async () => ({ data: args.memberships ?? [], error: null }),
    }
  }

  it('denies when role is not allowed', async () => {
    const supabase = buildSupabaseMock({
      memberships: [{ org_id: 'org-1', roles: ['coach'] }],
      memberRow: { org_id: 'org-1', role: 'coach', permissions: {}, is_active: true },
    })

    await expect(
      resolveAuthorizationContext(
        supabase as never,
        { userId: 'u1', isAuthenticated: true, currentOrgId: null },
        {
          requireAuth: true,
          orgScoped: true,
          allowedRoles: ['org_admin'],
          requiredStaffFlags: [],
          allowPlatformAdmin: false,
        },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(ApiManagerError)
  })

  it('denies when required staff flags are missing', async () => {
    const supabase = buildSupabaseMock({
      memberships: [{ org_id: 'org-1', roles: ['staff'] }],
      memberRow: {
        org_id: 'org-1',
        role: 'staff',
        permissions: { can_manage_messages: false },
        is_active: true,
      },
    })

    await expect(
      resolveAuthorizationContext(
        supabase as never,
        { userId: 'u1', isAuthenticated: true, currentOrgId: null },
        {
          requireAuth: true,
          orgScoped: true,
          allowedRoles: ['staff'],
          requiredStaffFlags: ['can_manage_messages'],
          allowPlatformAdmin: false,
        },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(ApiManagerError)
  })
})
