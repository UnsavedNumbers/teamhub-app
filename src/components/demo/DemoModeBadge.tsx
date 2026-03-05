/**
 * Demo Mode Badge Component
 * 
 * Subtle badge indicator that shows when user is in demo mode.
 * Non-intrusive, appears in header or navigation area.
 */

import { useT } from '@/i18n/useI18n'
import { useDemoSession } from '@/contexts/DemoSessionContext'
import { isInDemoSession } from '@/utils/demoMode'
import './DemoModeBadge.css'

interface DemoModeBadgeProps {
  /** Optional className for styling */
  className?: string
}

export function DemoModeBadge({ className = '' }: DemoModeBadgeProps) {
  const t = useT()
  const { session } = useDemoSession()

  if (!isInDemoSession() || !session.is_demo_session) {
    return null
  }

  return (
    <div className={`demo-mode-badge ${className}`} title={t('demo.badge.tooltip')}>
      <span className="demo-mode-badge-icon">demo</span>
      <span className="demo-mode-badge-label">{t('demo.badge.label')}</span>
    </div>
  )
}
