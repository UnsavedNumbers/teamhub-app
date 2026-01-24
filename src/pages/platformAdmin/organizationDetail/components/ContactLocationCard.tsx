/**
 * ContactLocationCard Component
 * 
 * Displays organization contact information and location details.
 */

import { Card, Button } from '../../../../components/platformAdmin'
import { safeString } from '../../../../utils/safeAccessors'
import { copyToClipboard } from '../../../../utils/clipboardUtils'
import type { AdminOrganization } from '../../../../types/platformAdmin.types'

interface ContactLocationCardProps {
  organization: AdminOrganization
}

export function ContactLocationCard({ organization }: ContactLocationCardProps) {
  const handleCopyId = async () => {
    await copyToClipboard(organization.id)
  }

  return (
    <Card title="Contact & Location">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pa-space-4)' }}>
        {/* Contact Information */}
        <div>
          <div className="pa-caption pa-text-muted pa-mb-1">Website</div>
          <div className="pa-body-m">
            {organization.website ? (
              <a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--pa-primary)', textDecoration: 'none' }}
              >
                {organization.website}
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginLeft: '4px' }}>
                  open_in_new
                </span>
              </a>
            ) : (
              '—'
            )}
          </div>
        </div>

        <div>
          <div className="pa-caption pa-text-muted pa-mb-1">Phone</div>
          <div className="pa-body-m">{safeString(organization.phone)}</div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <div className="pa-caption pa-text-muted pa-mb-1">Contact Email</div>
          <div className="pa-body-m">{safeString(organization.contact_email)}</div>
        </div>

        {/* Location Information */}
        {organization.address && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="pa-caption pa-text-muted pa-mb-1">Address</div>
            <div className="pa-body-m">{organization.address}</div>
          </div>
        )}

        <div>
          <div className="pa-caption pa-text-muted pa-mb-1">City</div>
          <div className="pa-body-m">{safeString(organization.city)}</div>
        </div>

        <div>
          <div className="pa-caption pa-text-muted pa-mb-1">State</div>
          <div className="pa-body-m">{safeString(organization.state)}</div>
        </div>

        <div>
          <div className="pa-caption pa-text-muted pa-mb-1">ZIP</div>
          <div className="pa-body-m">{safeString(organization.zip)}</div>
        </div>

        {/* Primary Location (for travel detection) */}
        {(organization.primary_city || organization.primary_state) && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="pa-caption pa-text-muted pa-mb-1">Primary Location</div>
            <div className="pa-body-m">
              {safeString(organization.primary_city)}
              {organization.primary_city && organization.primary_state && ', '}
              {safeString(organization.primary_state)}
              {organization.primary_region_radius_miles && (
                <span className="pa-text-muted" style={{ marginLeft: '8px' }}>
                  ({organization.primary_region_radius_miles} mi radius)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Organization ID with copy */}
        <div style={{ gridColumn: '1 / -1', marginTop: 'var(--pa-space-2)' }}>
          <div className="pa-caption pa-text-muted pa-mb-1">Organization ID</div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <code style={{ fontSize: '12px', wordBreak: 'break-all', flex: 1 }}>
              {organization.id}
            </code>
            <Button
              variant="ghost"
              size="dense"
              icon="content_copy"
              onClick={handleCopyId}
              title="Copy Organization ID"
            >
              Copy
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
