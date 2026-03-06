import { useCallback, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { useMobile } from '@/hooks/useMobile'

export interface SwipeAction {
  id: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

interface SwipeableRowProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  className?: string
}

const OPEN_AT_RATIO = 0.4
const REVEAL_FIRST_RATIO = 0.25
const REVEAL_SECOND_RATIO = 0.5

export default function SwipeableRow({ children, leftActions = [], rightActions = [], className }: SwipeableRowProps) {
  const isMobile = useMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startOffsetRef = useRef(0)

  const getMaxReveal = () => {
    const width = containerRef.current?.offsetWidth ?? 0
    return width * 0.6
  }

  const setClosed = useCallback(() => {
    setOffsetX(0)
    setDragging(false)
    startXRef.current = null
    startYRef.current = null
    startOffsetRef.current = 0
  }, [])

  const getOpenOffset = useCallback((direction: 'left' | 'right') => {
    const width = containerRef.current?.offsetWidth ?? 0
    const maxReveal = getMaxReveal()
    const actionsCount = direction === 'left' ? leftActions.length : rightActions.length
    const targetByRatio = width * (actionsCount > 1 ? REVEAL_SECOND_RATIO : REVEAL_FIRST_RATIO)
    const signed = Math.min(maxReveal, targetByRatio)
    return direction === 'left' ? signed : -signed
  }, [leftActions.length, rightActions.length])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    startOffsetRef.current = offsetX
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [offsetX])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || startXRef.current === null || startYRef.current === null) {
      return
    }

    const deltaX = event.clientX - startXRef.current
    const deltaY = event.clientY - startYRef.current

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return
    }

    const maxReveal = getMaxReveal()
    const rawOffset = startOffsetRef.current + deltaX

    let limited = Math.max(-maxReveal, Math.min(maxReveal, rawOffset))

    if (limited > 0 && leftActions.length === 0) {
      limited = 0
    }

    if (limited < 0 && rightActions.length === 0) {
      limited = 0
    }

    setOffsetX(limited)
  }, [dragging, leftActions.length, rightActions.length])

  const handlePointerEnd = useCallback(() => {
    if (!dragging) {
      return
    }

    setDragging(false)
    startXRef.current = null
    startYRef.current = null

    const width = containerRef.current?.offsetWidth ?? 1
    const openThreshold = width * OPEN_AT_RATIO

    if (Math.abs(offsetX) < openThreshold) {
      setClosed()
      return
    }

    if (offsetX > 0 && leftActions.length > 0) {
      setOffsetX(getOpenOffset('left'))
      return
    }

    if (offsetX < 0 && rightActions.length > 0) {
      setOffsetX(getOpenOffset('right'))
      return
    }

    setClosed()
  }, [dragging, getOpenOffset, leftActions.length, offsetX, rightActions.length, setClosed])

  const leftVisibleCount = Math.abs(offsetX) >= (containerRef.current?.offsetWidth ?? 1) * REVEAL_SECOND_RATIO ? 2 : Math.abs(offsetX) >= (containerRef.current?.offsetWidth ?? 1) * REVEAL_FIRST_RATIO ? 1 : 0
  const rightVisibleCount = leftVisibleCount

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('ios-swipe-row', className)} ref={containerRef}>
      {leftActions.length > 0 ? (
        <div className="ios-swipe-row__actions ios-swipe-row__actions--left" aria-hidden="true">
          {leftActions.slice(0, leftVisibleCount || 1).map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn('ios-swipe-row__action', `ios-swipe-row__action--${action.tone ?? 'default'}`)}
              onClick={() => {
                action.onSelect()
                setClosed()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {rightActions.length > 0 ? (
        <div className="ios-swipe-row__actions ios-swipe-row__actions--right" aria-hidden="true">
          {rightActions.slice(0, rightVisibleCount || 1).map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn('ios-swipe-row__action', `ios-swipe-row__action--${action.tone ?? 'default'}`)}
              onClick={() => {
                action.onSelect()
                setClosed()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn('ios-swipe-row__content', dragging && 'ios-swipe-row__content--dragging')}
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {children}
      </div>
    </div>
  )
}
