import type { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'

/**
 * Wrapper that provides I18nProvider for components using useI18n/useT.
 */
export function TestWrapper({ children }: { children: ReactNode }): ReactNode {
  return <I18nProvider>{children}</I18nProvider>
}
