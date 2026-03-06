import { useCallback, useEffect, useRef, useState } from 'react'
import { triggerHaptic } from '@/utils/haptics'

export interface ContextMenuAction {
  id: string
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  children: React.ReactNode
  actions: ContextMenuAction[]
  ariaLabel?: string
  longPressMs?: number
}

const MOVE_CANCEL_THRESHOLD = 8

export default function ContextMenu({
  children,
  actions,
  ariaLabel,
  longPressMs = 500,
}: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const openMenu = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    triggerHaptic('warning')
    setOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  return (
    <>
      <div
        ref={anchorRef}
        aria-label={ariaLabel}
        onPointerDown={(event) => {
          startRef.current = { x: event.clientX, y: event.clientY }
          clearTimer()
          timeoutRef.current = window.setTimeout(() => {
            openMenu()
          }, longPressMs)
        }}
        onPointerMove={(event) => {
          if (!startRef.current) {
            return
          }

          const moveX = Math.abs(event.clientX - startRef.current.x)
          const moveY = Math.abs(event.clientY - startRef.current.y)
          if (moveX > MOVE_CANCEL_THRESHOLD || moveY > MOVE_CANCEL_THRESHOLD) {
            clearTimer()
          }
        }}
        onPointerUp={() => {
          clearTimer()
          startRef.current = null
        }}
        onPointerCancel={() => {
          clearTimer()
          startRef.current = null
        }}
      >
        {children}
      </div>

      {open ? (
        <div className="ios-context-menu-backdrop" onClick={closeMenu} role="presentation">
          <div
            className="ios-context-menu"
            style={{ left: position.x, top: position.y }}
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                className={`ios-context-menu__item ${action.destructive ? 'ios-context-menu__item--destructive' : ''}`}
                disabled={action.disabled}
                onClick={() => {
                  action.onSelect()
                  closeMenu()
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
