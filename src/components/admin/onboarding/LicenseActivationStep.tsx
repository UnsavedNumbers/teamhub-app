import { useState } from 'react'
import { getErrorMessage } from '../../../utils/errorUtils'
import { 
  Card, 
  Button, 
  Badge 
} from '../../platformAdmin'

interface LicenseActivationStepProps {
  organizationId?: string
  onComplete: () => void
  onBack: () => void
}

export default function LicenseActivationStep({
  organizationId,
  onComplete,
  onBack,
}: LicenseActivationStepProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivateLicense = async () => {
    if (!organizationId) { setError('Organization not found'); return }
    setLoading(true); setError(null)
    try {
      // Simulation of checkout process
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onComplete()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to activate license')
    } finally { setLoading(false) }
  }

  return (
    <div className="pa-flex pa-justify-center pa-items-center pa-p-8" style={{ minHeight: '100vh', background: 'var(--pa-bg)' }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        <header className="pa-mb-12 pa-text-center">
          <Badge variant="neutral" className="pa-mb-4">SEASON READY 2024</Badge>
          <h1 className="pa-h1 pa-mb-4" style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>ACTIVATE YOUR ORGANIZATION</h1>
          <p className="pa-body-m pa-text-muted pa-mb-0">One flat fee for full-scale professional management. No per-user complexity.</p>
        </header>

        <div className="pa-grid pa-grid-12 pa-gap-8">
          <div className="pa-col-8">
            <Card style={{ padding: 'var(--pa-space-8)' }}>
              <h3 className="pa-h3 pa-mb-8 pa-flex pa-items-center pa-gap-2">
                <span className="material-symbols-outlined">verified</span>
                LICENSE OVERVIEW
              </h3>

              {error && <div className="pa-card pa-mb-6 pa-text-danger pa-bg-danger-bg" style={{ border: 'none' }}>{error}</div>}

              <div className="pa-flex pa-flex-col pa-gap-8">
                <FeatureItem icon="groups" title="UNLIMITED PARENTS & PLAYERS" description="Scale your community without increasing infrastructure costs." />
                <FeatureItem icon="hub" title="UNLIMITED TEAMS" description="Add as many divisions and teams as your organization requires." />
                <FeatureItem icon="calendar_today" title="UNLIMITED SEASONS" description="Archive old data and start new seasons effortlessly." />
                <FeatureItem icon="security" title="PREMIUM INFRASTRUCTURE" description="99.9% uptime and enterprise-grade data security." />
              </div>
            </Card>
          </div>

          <div className="pa-col-4">
            <Card style={{ background: 'var(--pa-n900)', color: 'var(--pa-n0)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: 'var(--pa-space-8)' }}>
              <div className="pa-text-overline pa-mb-4" style={{ opacity: 0.6 }}>ANNUAL BILLING</div>
              <div className="pa-h1 pa-mb-2" style={{ fontSize: '4.5rem', fontWeight: 900 }}>$499<span style={{ fontSize: '1.5rem', opacity: 0.5 }}>/YR</span></div>
              <div className="pa-body-s pa-mb-10" style={{ opacity: 0.8 }}>ONE FLAT FEE PER ORGANIZATION</div>
              
              <Button 
                onClick={handleActivateLicense} 
                loading={loading} 
                style={{ width: '100%', height: '64px', background: 'var(--pa-n0)', color: 'var(--pa-n900)', border: 'none' }}
              >
                ACTIVATE LICENSE
              </Button>

              <div className="pa-mt-8 pa-flex pa-flex-col pa-gap-2 pa-opacity-40">
                <div className="pa-text-overline" style={{ fontSize: '10px' }}>SECURE PAYMENTS</div>
                <div className="pa-flex pa-justify-center pa-gap-4 pa-text-overline" style={{ fontSize: '10px', fontStyle: 'italic' }}>
                  <span>VISA</span><span>MASTERCARD</span><span>ACH</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <footer className="pa-mt-12 pa-flex pa-justify-between pa-items-center">
          <Button variant="secondary" onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            BACK TO IDENTITY
          </Button>
          <div className="pa-text-overline pa-text-muted">© 2024 YOUTHSPORTS INFRASTRUCTURE. ALL RIGHTS RESERVED.</div>
        </footer>
      </div>
    </div>
  )
}

function FeatureItem({ icon, title, description }: { icon: string, title: string, description: string }) {
  return (
    <div className="pa-flex pa-gap-4">
      <div className="pa-badge pa-badge--neutral pa-p-3" style={{ height: 'fit-content', borderRadius: '50%' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <div>
        <div className="pa-h4 pa-mb-1">{title}</div>
        <div className="pa-body-s pa-text-muted">{description}</div>
      </div>
    </div>
  )
}
