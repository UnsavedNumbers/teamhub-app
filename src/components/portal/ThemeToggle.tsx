/**
 * Theme Toggle Component
 * 
 * Provides a toggle button for switching between light/dark/system themes.
 * Can be used in header or settings page.
 */

import { useTheme } from '../../hooks/useTheme'
import Icon from './Icon'

interface ThemeToggleProps {
  variant?: 'button' | 'icon-only'
  className?: string
  showLabel?: boolean
}

export default function ThemeToggle({ 
  variant = 'icon-only', 
  className = '',
  showLabel = false 
}: ThemeToggleProps) {
  const { resolvedTheme, loading, toggle } = useTheme()

  if (loading) {
      return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
      </div>
    )
  }

  if (variant === 'icon-only') {
    return (
      <button
        onClick={toggle}
        className={`size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${resolvedTheme} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <Icon name="light_mode" className="text-gray-600 dark:text-gray-300" />
        ) : (
          <Icon name="dark_mode" className="text-gray-600 dark:text-gray-300" />
        )}
      </button>
    )
  }

  // Button variant with label
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Theme
        </span>
      )}
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <>
            <Icon name="light_mode" className="text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Light</span>
          </>
        ) : (
          <>
            <Icon name="dark_mode" className="text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Dark</span>
          </>
        )}
      </button>
    </div>
  )
}

/**
 * Theme Selector Component (for Settings page)
 * 
 * Provides radio buttons for selecting light/dark/system themes.
 */
export function ThemeSelector({ className = '' }: { className?: string }) {
  const { mode, setTheme, loading } = useTheme()

  if (loading) {
    return (
      <div className={className}>
        <div className="h-32 bg-gray-200 dark:bg-gray-900 animate-pulse rounded-xl" />
      </div>
    )
  }

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string; description: string }> = [
    {
      value: 'light',
      label: 'Light',
      icon: 'light_mode',
      description: 'Always use light theme',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: 'dark_mode',
      description: 'Always use dark theme',
    },
    {
      value: 'system',
      label: 'System',
      icon: 'brightness_auto',
      description: 'Follow system preference',
    },
  ]

  return (
    <div className={className}>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
              mode === option.value
                ? 'border-[var(--org-btn-primary-bg, #137fec)] bg-[var(--org-btn-primary-bg)]/10 dark:bg-[var(--org-btn-primary-bg)]/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-neutral-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon 
                name={option.icon} 
                className={mode === option.value ? 'text-[var(--org-link-color)]' : 'text-gray-600 dark:text-gray-400'} 
              />
              <div>
                <span className={`font-black block ${
                  mode === option.value ? 'text-[var(--org-link-color)]' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {option.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              </div>
            </div>
            {mode === option.value && (
              <Icon name="check_circle" className="text-[var(--org-link-color)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
