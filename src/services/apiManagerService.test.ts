import { describe, expect, it, vi, beforeEach } from 'vitest'
import { invokeApiOperation } from './apiManagerService'

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}))

describe('apiManagerService', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('returns normalized success contract', async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        data: { statusCode: 200 },
        traceId: 'trace-abc',
      },
      error: null,
    })

    const response = await invokeApiOperation<{ statusCode: number }>({
      operation: 'automation.sendDemoRequest',
      input: { demo_org_id: 'org-1', email: 'test@example.com', review_url: 'https://x' },
    })

    expect(response.ok).toBe(true)
    if (response.ok) {
      expect(response.data.statusCode).toBe(200)
      expect(response.traceId).toBe('trace-abc')
    }
  })

  it('returns normalized failure contract from edge function', async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: false,
        traceId: 'trace-def',
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden',
        },
      },
      error: null,
    })

    const response = await invokeApiOperation({
      operation: 'automation.sendDemoResult',
      input: { demo_org_id: 'org-1' },
    })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('FORBIDDEN')
      expect(response.traceId).toBe('trace-def')
    }
  })

  it('returns invoke error when edge function call fails', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    })

    const response = await invokeApiOperation({
      operation: 'automation.submitContact',
      input: { surface: 'help' },
    })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('EDGE_INVOKE_FAILED')
    }
  })
})
