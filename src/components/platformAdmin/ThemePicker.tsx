/**
 * Theme Picker Component
 *
 * Displays available organization themes as selectable cards.
 * Shows theme colors and allows selection with visual feedback.
 */

import { useState } from 'react'
import { Card, Button } from './index'
import { getActiveThemes, getDefaultTheme, type Theme } from '../../config/themes'

interface ThemePickerProps {
  selectedThemeId: string | null
  onChange: (themeId: string | null) => void
  disabled?: boolean
}

export default function ThemePicker({
  selectedThemeId,
  onChange,
  disabled = false
}: ThemePickerProps) {
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null)
  const themes = getActiveThemes()
  const defaultTheme = getDefaultTheme()

  const handleThemeSelect = (themeId: string | null) => {
    if (disabled) return
    onChange(themeId)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Platform Default Option */}
        <Card
          className={`cursor-pointer transition-all duration-200 ${
            selectedThemeId === null
              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
              : hoveredThemeId === 'default'
              ? 'ring-1 ring-gray-300 bg-gray-50 dark:bg-gray-800'
              : 'hover:ring-1 hover:ring-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleThemeSelect(null)}
          onMouseEnter={() => setHoveredThemeId('default')}
          onMouseLeave={() => setHoveredThemeId(null)}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Platform Default</h3>
              {selectedThemeId === null && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex space-x-2 mb-3">
              <div
                className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                style={{ backgroundColor: defaultTheme.colors.primary }}
                title="Primary"
              />
              <div
                className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                style={{ backgroundColor: defaultTheme.colors.secondary }}
                title="Secondary"
              />
              <div
                className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                style={{ backgroundColor: defaultTheme.colors.accent }}
                title="Accent"
              />
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Use the platform's default theme ({defaultTheme.name})
            </p>
          </div>
        </Card>

        {/* Theme Options */}
        {themes.map((theme) => (
          <Card
            key={theme.id}
            className={`cursor-pointer transition-all duration-200 ${
              selectedThemeId === theme.id
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                : hoveredThemeId === theme.id
                ? 'ring-1 ring-gray-300 bg-gray-50 dark:bg-gray-800'
                : 'hover:ring-1 hover:ring-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleThemeSelect(theme.id)}
            onMouseEnter={() => setHoveredThemeId(theme.id)}
            onMouseLeave={() => setHoveredThemeId(null)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{theme.name}</h3>
                {selectedThemeId === theme.id && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 mb-3">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Primary"
                />
                <div
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                  style={{ backgroundColor: theme.colors.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                  style={{ backgroundColor: theme.colors.accent }}
                  title="Accent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Light</span>
                <div className="w-3 h-3 bg-gray-800 dark:bg-gray-200 rounded-full border border-gray-300 dark:border-gray-600"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Dark</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {disabled && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Theme selection is disabled while saving changes.
        </p>
      )}
    </div>
  )
}