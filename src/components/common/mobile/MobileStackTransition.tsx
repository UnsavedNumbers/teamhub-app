import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useMobile } from '@/hooks/useMobile'

interface MobileStackTransitionProps {
  children: React.ReactNode
  className?: string
}

type TransitionDirection = 'forward' | 'back'

export default function MobileStackTransition({ children, className }: MobileStackTransitionProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const isMobile = useMobile()
  const [isAnimating, setIsAnimating] = useState(false)
  const [edgeOffset, setEdgeOffset] = useState(0)
  const [draggingEdgeBack, setDraggingEdgeBack] = useState(false)

  const direction: TransitionDirection = useMemo(() => {
    if (navigationType === 'POP') {
      return 'back'
    }
    return 'forward'
  }, [navigationType])

  useEffect(() => {
    setIsAnimating(true)
    const timer = window.setTimeout(() => {
      setIsAnimating(false)
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [location.key])

  const resetEdge = () => {
    setEdgeOffset(0)
    setDraggingEdgeBack(false)
  }

  const canEdgeBack = isMobile && typeof window !== 'undefined' && window.history.length > 1

  const style = draggingEdgeBack
    ? { transform: `translateX(${edgeOffset}px)` }
    : undefined

  return (
    <div
      key={location.key}
      className={cn(
        'mobile-stack-view',
        isAnimating && `mobile-stack-view--enter-${direction}`,
        draggingEdgeBack && 'mobile-stack-view--edge-back',
        className,
      )}
      data-mobile-transition={direction}
      style={style}
      onPointerDown={(event) => {
        if (!canEdgeBack || event.clientX > 20) {
          return
        }

        setDraggingEdgeBack(true)
        setEdgeOffset(0)
      }}
      onPointerMove={(event) => {
        if (!draggingEdgeBack) {
          return
        }

        if (typeof window === 'undefined') {
          return
        }

        const nextOffset = Math.max(0, Math.min(event.clientX, window.innerWidth * 0.6))
        setEdgeOffset(nextOffset)
      }}
      onPointerUp={() => {
        if (!draggingEdgeBack) {
          return
        }

        if (typeof window === 'undefined') {
          resetEdge()
          return
        }

        const ratio = edgeOffset / Math.max(window.innerWidth, 1)
        if (ratio >= 0.4) {
          navigate(-1)
          resetEdge()
          return
        }

        resetEdge()
      }}
      onPointerCancel={resetEdge}
    >
      {children}
    </div>
  )
}
