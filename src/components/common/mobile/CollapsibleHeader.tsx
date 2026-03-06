import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/utils/cn'

interface CollapsibleHeaderProps {
  title: string
  rightSlot?: React.ReactNode
  leftSlot?: React.ReactNode
  mode?: 'large' | 'inline'
  scrollContainerSelector?: string
  className?: string
}

const COLLAPSE_TRIGGER = 44

export default function CollapsibleHeader({
  title,
  rightSlot,
  leftSlot,
  mode = 'large',
  scrollContainerSelector,
  className,
}: CollapsibleHeaderProps) {
  const [collapsed, setCollapsed] = useState(mode === 'inline')

  const scrollContainer = useMemo(() => {
    if (typeof document === 'undefined') {
      return null
    }

    if (scrollContainerSelector) {
      return document.querySelector<HTMLElement>(scrollContainerSelector)
    }

    return null
  }, [scrollContainerSelector])

  useEffect(() => {
    if (mode === 'inline') {
      setCollapsed(true)
      return
    }

    const target: HTMLElement | Window = scrollContainer ?? window

    const getOffset = () => {
      if (target === window) {
        return window.scrollY
      }
      return (target as HTMLElement).scrollTop
    }

    const handleScroll = () => {
      setCollapsed(getOffset() >= COLLAPSE_TRIGGER)
    }

    handleScroll()
    target.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      target.removeEventListener('scroll', handleScroll)
    }
  }, [mode, scrollContainer])

  return (
    <header className={cn('ios-collapsible-header', collapsed && 'ios-collapsible-header--collapsed', className)}>
      <div className="ios-collapsible-header__bar">
        <div className="ios-collapsible-header__slot ios-collapsible-header__slot--left">{leftSlot}</div>
        <h1 className="ios-collapsible-header__inline-title" aria-hidden={!collapsed}>
          {title}
        </h1>
        <div className="ios-collapsible-header__slot ios-collapsible-header__slot--right">{rightSlot}</div>
      </div>
      <div className="ios-collapsible-header__large-title-wrap" aria-hidden={collapsed}>
        <h2 className="ios-collapsible-header__large-title">{title}</h2>
      </div>
    </header>
  )
}
