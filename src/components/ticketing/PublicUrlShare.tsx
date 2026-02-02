/**
 * Public URL Share Component
 * 
 * Displays public URL with copy button and QR code generation
 * Used in admin pages to share org-scoped public URLs
 */

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { QUERY_KEY_ORG_SLUG } from '@/components/admin/PublicUrlBanner'

interface PublicUrlShareProps {
  orgId: string
  path: string // Path after /o/{org-slug}/, e.g., "tickets/events/{event-id}"
  title?: string
  description?: string
}

const QR_SIZE = 256

export default function PublicUrlShare({ orgId, path, title = 'Public Link', description }: PublicUrlShareProps) {
  const [copied, setCopied] = useState(false)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const qrWrapperRef = useRef<HTMLDivElement>(null)

  // Fetch org slug (use consistent query key)
  const { data: orgData } = useQuery({
    queryKey: [QUERY_KEY_ORG_SLUG, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', orgId)
        .single()

      if (error || !data?.slug) {
        return null
      }

      return data.slug
    },
    enabled: !!orgId,
  })

  useEffect(() => {
    if (orgData) {
      const baseUrl = window.location.origin
      setPublicUrl(`${baseUrl}/o/${orgData}/${path}`)
    } else {
      setPublicUrl(null)
    }
  }, [orgData, path])

  const handleCopy = async () => {
    if (!publicUrl) return

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback: select text
      const textArea = document.createElement('textarea')
      textArea.value = publicUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleDownloadQR = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas')
    if (!canvas || !publicUrl) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `qr-${path.replace(/\//g, '-')}.png`
    link.href = dataUrl
    link.click()
  }

  if (!orgData) {
    return (
      <div className="pa-card">
        <h3 className="pa-card-title">{title}</h3>
        <p className="text-gray-500 text-sm">
          Organization slug not set. Please set a slug in organization settings to generate public URLs.
        </p>
      </div>
    )
  }

  if (!publicUrl) {
    return (
      <div className="pa-card">
        <h3 className="pa-card-title">{title}</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="pa-card">
      <h3 className="pa-card-title">{title}</h3>
      {description && <p className="text-gray-600 text-sm mb-4">{description}</p>}
      
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          readOnly
          value={publicUrl}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          className={`pa-button pa-button-sm ${copied ? 'pa-button-success' : 'pa-button-primary'}`}
        >
          {copied ? (
            <>
              <span className="material-symbols-outlined text-sm mr-1">check</span>
              Copied!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm mr-1">content_copy</span>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Social sharing buttons */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(publicUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pa-button pa-button-sm pa-button-secondary"
        >
          <span className="material-symbols-outlined text-sm mr-1">share</span>
          Twitter
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pa-button pa-button-sm pa-button-secondary"
        >
          <span className="material-symbols-outlined text-sm mr-1">share</span>
          Facebook
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this event: ${publicUrl}`)}`}
          className="pa-button pa-button-sm pa-button-secondary"
        >
          <span className="material-symbols-outlined text-sm mr-1">email</span>
          Email
        </a>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">QR Code</p>
        <p className="text-xs text-gray-500 mb-3">Scan to open this link. Download for posters or print materials.</p>
        <div className="flex flex-col items-start gap-3">
          <div ref={qrWrapperRef} className="rounded-lg border border-gray-200 bg-white p-3 inline-block">
            <QRCodeCanvas
              value={publicUrl}
              size={QR_SIZE}
              level="M"
              includeMargin={false}
              style={{ width: 128, height: 128 }}
            />
          </div>
          <button
            type="button"
            onClick={handleDownloadQR}
            className="pa-button pa-button-sm pa-button-secondary"
          >
            <span className="material-symbols-outlined text-sm mr-1">download</span>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  )
}
