import { useCallback, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  disabled?: boolean
  triggerDistance?: number
}

export default function PullToRefreshContainer({
  onRefresh,
  children,
  className,
  disabled = false,
  triggerDistance = 80,
}: PullToRefreshContainerProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [loading, setLoading] = useState(false)
  const startYRef = useRef<number | null>(null)
  const refreshingRef = useRef(false)

  const reset = useCallback(() => {
    setPullDistance(0)
    startYRef.current = null
  }, [])

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) {
      return
    }

    refreshingRef.current = true
    setLoading(true)

    try {
      await onRefresh()
    } finally {
      setLoading(false)
      refreshingRef.current = false
      reset()
    }
  }, [onRefresh, reset])

  return (
    <div
      className={cn('ios-pull-refresh', className)}
      onPointerDown={(event) => {
        if (disabled || loading) {
          return
        }

        const target = event.currentTarget
        if (target.scrollTop > 0) {
          return
        }

        startYRef.current = event.clientY
      }}
      onPointerMove={(event) => {
        if (disabled || loading || startYRef.current === null) {
          return
        }

        const delta = event.clientY - startYRef.current
        if (delta <= 0) {
          setPullDistance(0)
          return
        }

        const dampened = Math.min(delta * 0.55, triggerDistance * 1.6)
        setPullDistance(dampened)
      }}
      onPointerUp={async () => {
        if (disabled || loading) {
          return
        }

        if (pullDistance >= triggerDistance) {
          await runRefresh()
          return
        }

        reset()
      }}
      onPointerCancel={() => {
        if (!loading) {
          reset()
        }
      }}
    >
      <div className="ios-pull-refresh__indicator" style={{ height: pullDistance }}>
        {loading ? <span className="ios-spinner" aria-hidden="true" /> : null}
      </div>
      <div className="ios-pull-refresh__content">{children}</div>
    </div>
  )
}
