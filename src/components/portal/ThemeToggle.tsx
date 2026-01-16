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
  const { mode, resolvedTheme, loading, toggle, setTheme } = useTheme()

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    )
  }

  if (variant === 'icon-only') {
    return (
      <button
        onClick={toggle}
        className={`size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${resolvedTheme} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <Icon name="light_mode" className="text-slate-600 dark:text-slate-300" />
        ) : (
          <Icon name="dark_mode" className="text-slate-600 dark:text-slate-300" />
        )}
      </button>
    )
  }

  // Button variant with label
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Theme
        </span>
      )}
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <>
            <Icon name="light_mode" className="text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Light</span>
          </>
        ) : (
          <>
            <Icon name="dark_mode" className="text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Dark</span>
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
        <div className="h-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
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
                ? 'border-[#137fec] bg-[#137fec]/10 dark:bg-[#137fec]/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon 
                name={option.icon} 
                className={mode === option.value ? 'text-[#137fec]' : 'text-slate-600 dark:text-slate-400'} 
              />
              <div>
                <span className={`font-black block ${
                  mode === option.value ? 'text-[#137fec]' : 'text-slate-900 dark:text-white'
                }`}>
                  {option.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              </div>
            </div>
            {mode === option.value && (
              <Icon name="check_circle" className="text-[#137fec]" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
