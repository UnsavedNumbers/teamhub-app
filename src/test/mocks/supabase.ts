/**
 * Supabase Mock Factory
 *
 * Produces a chainable proxy that mimics Supabase PostgREST query builder.
 * Any method call returns the proxy itself except terminal methods (.single(), .maybeSingle(), .then(), .execute())
 * which resolve to a configurable { data, error } value.
 */

import { vi } from 'vitest'

export interface SupabaseResponse<T = unknown> {
  data: T | null
  error: Error | { message: string; code?: string } | null
}

type ChainMethod =
  | 'from'
  | 'select'
  | 'or'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'order'
  | 'limit'
  | 'in'
  | 'is'
  | 'not'
  | 'like'
  | 'ilike'
  | 'contains'
  | 'overlaps'
  | 'filter'
  | 'insert'
  | 'update'
  | 'upsert'
  | 'delete'

type TerminalMethod = 'single' | 'maybeSingle' | 'then' | 'execute'

const CHAIN_METHODS: ChainMethod[] = [
  'from',
  'select',
  'or',
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'order',
  'limit',
  'in',
  'is',
  'not',
  'like',
  'ilike',
  'contains',
  'overlaps',
  'filter',
  'insert',
  'update',
  'upsert',
  'delete',
]

const TERMINAL_METHODS: TerminalMethod[] = ['single', 'maybeSingle', 'then', 'execute']

function createChainProxy(
  terminalResponse: SupabaseResponse
): Record<string, unknown> & Promise<SupabaseResponse> {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (TERMINAL_METHODS.includes(prop as TerminalMethod)) {
        return () => Promise.resolve(terminalResponse)
      }
      if (CHAIN_METHODS.includes(prop as ChainMethod)) {
        return () => createChainProxy(terminalResponse)
      }
      return undefined
    },
  }

  const proxy = new Proxy(
    {},
    {
      ...handler,
      get(target, prop) {
        if (prop === 'then') {
          return (onFulfilled?: (value: SupabaseResponse) => unknown) =>
            Promise.resolve(terminalResponse).then(onFulfilled)
        }
        return handler.get!(target, prop, proxy)
      },
    }
  ) as Record<string, unknown> & Promise<SupabaseResponse>

  return proxy
}

export function createSupabaseMock() {
  let terminalResponse: SupabaseResponse = { data: null, error: null }

  const mockResolvedData = <T>(data: T) => {
    terminalResponse = { data, error: null }
  }

  const mockResolvedError = (error: Error | { message: string; code?: string }) => {
    terminalResponse = { data: null, error }
  }

  const mockAuth = () => ({
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  })

  const from = vi.fn(() => createChainProxy(terminalResponse))

  const client = {
    from,
    select: vi.fn(() => createChainProxy(terminalResponse)),
    insert: vi.fn(() => createChainProxy(terminalResponse)),
    update: vi.fn(() => createChainProxy(terminalResponse)),
    delete: vi.fn(() => createChainProxy(terminalResponse)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: mockAuth(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    mockResolvedData,
    mockResolvedError,
    mockAuth,
  }

  return client
}

export type SupabaseMockClient = ReturnType<typeof createSupabaseMock>

/**
 * Create a full Supabase client mock suitable for vi.mock() replacement.
 * Use createSupabaseMock() for per-test configuration.
 */
export function createMockSupabaseClient() {
  const mock = createSupabaseMock()
  return {
    from: mock.from,
    select: mock.select,
    insert: mock.insert,
    update: mock.update,
    delete: mock.delete,
    rpc: mock.rpc,
    auth: mock.auth,
    storage: mock.storage,
    functions: mock.functions,
  }
}
