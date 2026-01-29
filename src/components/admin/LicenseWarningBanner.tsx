import type { LicenseSummary } from '../../utils/licenseUtils'
import { OrgAdminButton } from './OrgAdminButton'

interface LicenseWarningBannerProps {
  summary: LicenseSummary
}

export function LicenseWarningBanner({ summary }: LicenseWarningBannerProps) {
  if (!summary.isTrial && !summary.isGracePeriod) return null

  const isCritical = (summary.daysRemaining ?? 0) <= 3

  return (
    <div
      className="oa-card"
      style={{
        margin: '1.25rem 1.25rem 0',
        padding: '0.75rem 1rem',
        background: isCritical ? 'var(--org-status-error-bg, #1e293b)' : 'var(--org-surface-tertiary, #334155)',
        color: 'var(--org-btn-primary-text, #fff)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--org-btn-primary-text, #fff)' }}>
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
      <OrgAdminButton
        as="a"
        href="/admin/organization/billing"
        variant="secondary"
        size="compact"
        className="!h-8 !px-3 !text-xs"
      >
        Renew Now
      </OrgAdminButton>
    </div>
  )
}
