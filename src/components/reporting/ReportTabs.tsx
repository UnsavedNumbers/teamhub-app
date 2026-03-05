/**
 * Report Tabs Component
 *
 * Tab navigation for report chapters (Prezi-style).
 * Clean, minimal design with smooth transitions.
 */

import { useState } from 'react'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface ReportTabsProps {
  tabs: Tab[]
  defaultTab?: string
}

export function ReportTabs({ tabs, defaultTab }: ReportTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  if (tabs.length === 0) return null

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content

  return (
    <div>
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--org-border-default)',
          marginBottom: '48px',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--org-color-primary)' : '2px solid transparent',
                color: isActive ? 'var(--org-color-primary)' : 'var(--org-text-secondary)',
                fontSize: '16px',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                marginBottom: '-2px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--org-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--org-text-secondary)'
                }
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>{activeTabContent}</div>
    </div>
  )
}
