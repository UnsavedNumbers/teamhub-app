/**
 * Tool Link Popup Component
 * 
 * Displays contextual guidance popup when user clicks a tool link.
 */

import { useEffect, useState } from 'react'
import type { ToolLinkElement } from '../../utils/helpCenter/toolLinkRegistry'

interface ToolLinkPopupProps {
  element: ToolLinkElement
  context?: string
  targetElement?: HTMLElement | null
  onClose: () => void
}

export function ToolLinkPopup({
  element,
  context,
  targetElement,
  onClose,
}: ToolLinkPopupProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    // Calculate position near target element
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      setPosition({
        top: rect.bottom + scrollY + 20,
        left: rect.left + scrollX + rect.width / 2 - 150, // Center above element
      })
    } else {
      // Fallback: top of page
      setPosition({
        top: 100,
        left: window.innerWidth / 2 - 150,
      })
    }

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      onClose()
    }, 10000)

    return () => clearTimeout(timer)
  }, [targetElement, onClose])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const message =
    context && element.contextPrompts?.[context]
      ? element.contextPrompts[context]
      : element.defaultPrompt

  if (!position) return null

  return (
    <div
      className="tool-link-popup"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10000,
        maxWidth: '300px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-700 flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Close"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
