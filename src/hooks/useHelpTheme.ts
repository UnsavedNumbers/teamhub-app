import { useCallback, useEffect, useState } from 'react'

export type HelpTheme = 'light' | 'dark'

const HELP_THEME_STORAGE_KEY = 'help-theme-preference'

function getInitialTheme(): HelpTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(HELP_THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useHelpTheme() {
  const [theme, setTheme] = useState<HelpTheme>(getInitialTheme)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(HELP_THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  }
}

