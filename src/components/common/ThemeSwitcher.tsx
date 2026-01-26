import { useTheme } from '../../hooks/useTheme'

/**
 * ThemeSwitcher - Toggle between light and dark modes
 *
 * Uses the useTheme hook for consistent theme management across the app.
 */
export default function ThemeSwitcher() {
  const { resolvedTheme, toggle } = useTheme()

  return (
    <button
      className="gn-util-btn gn-theme-btn"
      onClick={toggle}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="material-symbols-outlined">
        {resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
