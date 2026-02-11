/**
 * Vitest global setup file.
 * Runs before each test file; used for mocks and environment stubs.
 */
import '@testing-library/jest-dom/vitest'
import { vi, afterEach } from 'vitest'

// Restore all mocks after each test to prevent leakage between tests
afterEach(() => {
  vi.restoreAllMocks()
})

// Mock i18n - returns translation keys as-is so tests can assert which key was selected
vi.mock('@/i18n', () => ({
  t: (key: string) => key,
  i18n: { language: 'en' },
  setLocale: vi.fn(),
  getLocale: () => 'en',
  format: (template: string, params?: Record<string, string | number>) =>
    params ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)), template) : template,
}))

// Stub window.matchMedia for jsdom (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Stub IntersectionObserver for jsdom (used by lazy loading, infinite scroll, etc.)
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: readonly number[] = []

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn<() => IntersectionObserverEntry[]>(() => [])

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})
