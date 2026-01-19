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
          className={`cursor-pointer transition-all duration-200 overflow-hidden ${
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
          {/* Theme Preview Header */}
          <div 
            className="p-3 flex items-center justify-between"
            style={{ backgroundColor: defaultTheme.colors.primary }}
          >
            <span className="text-white font-semibold text-xs">Platform Default</span>
            {selectedThemeId === null && (
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5" style={{ color: defaultTheme.colors.primary }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Theme Preview Body */}
          <div className="p-4" style={{ backgroundColor: defaultTheme.colors.secondary }}>
            <div className="space-y-2">
              <div className="h-2 bg-white/30 rounded w-3/4"></div>
              <div className="h-2 bg-white/30 rounded w-1/2"></div>
              
              {/* Sample Button */}
              <div className="pt-2">
                <div 
                  className="inline-block px-3 py-1.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: defaultTheme.colors.accent }}
                >
                  Action Button
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {defaultTheme.name}
            </p>
          </div>
        </Card>

        {/* Theme Options */}
        {themes.map((theme) => (
          <Card
            key={theme.id}
            className={`cursor-pointer transition-all duration-200 overflow-hidden ${
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
            {/* Theme Preview Header */}
            <div 
              className="p-3 flex items-center justify-between"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <span className="text-white font-semibold text-xs">{theme.name}</span>
              {selectedThemeId === theme.id && (
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" style={{ color: theme.colors.primary }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Theme Preview Body */}
            <div className="p-4" style={{ backgroundColor: theme.colors.secondary }}>
              <div className="space-y-2">
                <div className="h-2 bg-white/30 rounded w-3/4"></div>
                <div className="h-2 bg-white/30 rounded w-1/2"></div>
                
                {/* Sample Button */}
                <div className="pt-2">
                  <div 
                    className="inline-block px-3 py-1.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: theme.colors.accent }}
                  >
                    Action Button
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pb-3">
              <div className="flex items-center space-x-1.5">
                <div 
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Primary"
                />
                <div 
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.colors.secondary }}
                  title="Secondary"
                />
                <div 
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.colors.accent }}
                  title="Accent"
                />
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