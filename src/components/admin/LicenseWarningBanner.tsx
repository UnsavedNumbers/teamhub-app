import type { LicenseSummary } from '../hooks/useLicense'

interface LicenseWarningBannerProps {
  summary: LicenseSummary
}

export function LicenseWarningBanner({ summary }: LicenseWarningBannerProps) {
  if (!summary.isTrial && !summary.isGracePeriod) return null

  const isCritical = summary.daysRemaining <= 3

  return (
    <div 
      className="pa-card" 
      style={{ 
        margin: 'var(--pa-space-5) var(--pa-space-5) 0',
        padding: 'var(--pa-space-3) var(--pa-space-4)',
        background: isCritical ? 'var(--pa-n900)' : 'var(--pa-n800)',
        color: 'var(--pa-white)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--pa-white)' }}>
          {isCritical ? 'warning' : 'info'}
        </span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'uppercase' }}>
            {summary.isTrial ? 'Trial Subscription' : 'Grace Period'}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Your {summary.isTrial ? 'trial' : 'subscription'} ends in {summary.daysRemaining} days.
          </div>
        </div>
      </div>
      <a 
        href="/admin/organization/billing" 
        className="pa-btn"
        style={{ 
          background: 'var(--pa-white)', 
          color: 'var(--pa-n900)',
          height: '32px',
          padding: '0 12px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: 0,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        Renew Now
      </a>
    </div>
  )
}
