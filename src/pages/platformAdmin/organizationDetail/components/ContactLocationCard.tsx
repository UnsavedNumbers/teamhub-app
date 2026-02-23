/**
 * ContactLocationCard Component
 * 
 * Displays organization contact information and location details.
 */

import { useState } from 'react'
import { safeString } from '../../../../utils/safeAccessors'
import { copyToClipboard } from '../../../../utils/clipboardUtils'
import type { AdminOrganization } from '../../../../types/platformAdmin.types'

interface ContactLocationCardProps {
  organization: AdminOrganization
}

export function ContactLocationCard({ organization }: ContactLocationCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = async () => {
    await copyToClipboard(organization.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--pa-n0)',
      borderRadius: 'var(--pa-radius-m)',
      boxShadow: 'var(--pa-shadow-1)',
      padding: 'var(--pa-space-6)',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: 0,
        marginBottom: 'var(--pa-space-5)',
        display: 'flex',
        alignItems: 'center',
        color: 'var(--pa-n600)',
        fontFamily: 'var(--pa-font-body)',
      }}>
        <span style={{
          width: '32px',
          height: '2px',
          background: 'var(--pa-theme-action-primary)',
          marginRight: 'var(--pa-space-3)',
          display: 'block',
        }} />
        Contact & Location
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--pa-space-5)' }}>
        {/* Contact Information */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>Website</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
            {organization.website ? (
              <a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--pa-theme-action-primary)', 
                  textDecoration: 'none',
                  transition: 'text-decoration 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
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
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>Phone</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>{safeString(organization.phone)}</div>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>Contact Email</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>{safeString(organization.contact_email)}</div>
        </div>

        {/* Location Information */}
        {organization.address && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>Address</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>{organization.address}</div>
          </div>
        )}

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>City</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>{safeString(organization.city)}</div>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>State</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>{safeString(organization.state)}</div>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>ZIP</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>{safeString(organization.zip)}</div>
        </div>

        {/* Primary Location (for travel detection) */}
        {(organization.primary_city || organization.primary_state) && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>Primary Location</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
              {safeString(organization.primary_city)}
              {organization.primary_city && organization.primary_state && ', '}
              {safeString(organization.primary_state)}
              {organization.primary_region_radius_miles && (
                <span style={{ marginLeft: 'var(--pa-space-2)', color: 'var(--pa-n500)' }}>
                  ({organization.primary_region_radius_miles} mi radius)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Organization ID with copy */}
        <div style={{ marginTop: 'var(--pa-space-2)', paddingTop: 'var(--pa-space-5)', borderTop: '1px solid var(--pa-n100)' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-2)', fontFamily: 'var(--pa-font-body)' }}>Organization ID</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
            <code style={{ 
              fontSize: '12px', 
              wordBreak: 'break-all', 
              flex: 1,
              color: 'var(--pa-n700)',
              fontFamily: 'var(--pa-font-mono)',
            }}>
              {organization.id}
            </code>
            <button
              onClick={handleCopyId}
              style={{
                padding: 'var(--pa-space-2) var(--pa-space-3)',
                background: 'transparent',
                border: '1px solid var(--pa-n200)',
                borderRadius: 'var(--pa-radius-xs)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--pa-n600)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--pa-space-1)',
                transition: 'background-color 150ms ease, border-color 150ms ease',
                fontFamily: 'var(--pa-font-body)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--pa-n50)'
                e.currentTarget.style.borderColor = 'var(--pa-theme-action-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--pa-n200)'
              }}
              title={copied ? 'Copied!' : 'Copy Organization ID'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
