import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FocusLock from 'react-focus-lock'
import { RemoveScroll } from 'react-remove-scroll'
import { useScrollLock } from '@/hooks/useScrollLock'
import { cn } from '@/utils/cn'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  closeAriaLabel?: string
  dismissThreshold?: number
  className?: string
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  closeAriaLabel,
  dismissThreshold = 0.3,
  className,
}: BottomSheetProps) {
  const [translateY, setTranslateY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startYRef = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useScrollLock(isOpen)

  const reset = useCallback(() => {
    setDragging(false)
    setTranslateY(0)
    startYRef.current = null
  }, [])

  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const maxElasticDistance = useMemo(() => {
    const height = sheetRef.current?.offsetHeight ?? window.innerHeight
    return height * 0.6
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = event.clientY
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || startYRef.current === null) {
      return
    }

    const delta = event.clientY - startYRef.current
    if (delta <= 0) {
      setTranslateY(0)
      return
    }

    const resisted = Math.min(delta, maxElasticDistance)
    setTranslateY(resisted)
  }, [dragging, maxElasticDistance])

  const handlePointerEnd = useCallback(() => {
    if (!dragging) {
      return
    }

    const sheetHeight = sheetRef.current?.offsetHeight ?? 1
    const ratio = translateY / sheetHeight
    if (ratio >= dismissThreshold) {
      onClose()
      reset()
      return
    }

    reset()
  }, [dismissThreshold, dragging, onClose, reset, translateY])

  if (!isOpen) {
    return null
  }

  return (
    <RemoveScroll enabled={isOpen}>
      <FocusLock disabled={!isOpen}>
        <div className="ios-sheet-backdrop" onClick={onClose} role="presentation">
          <div
            ref={sheetRef}
            className={cn('ios-sheet', className)}
            style={{ transform: `translateY(${translateY}px)` }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="ios-sheet__drag-zone"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              <span className="ios-sheet__drag-indicator" />
            </div>
            {(title || closeAriaLabel) && (
              <div className="ios-sheet__header">
                {title ? <h2 className="ios-sheet__title">{title}</h2> : <span />}
                {closeAriaLabel ? (
                  <button
                    type="button"
                    className="ios-sheet__close"
                    aria-label={closeAriaLabel}
                    onClick={onClose}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                ) : null}
              </div>
            )}
            <div className="ios-sheet__content">{children}</div>
          </div>
        </div>
      </FocusLock>
    </RemoveScroll>
  )
}
