/**
 * Accordion Component (Video Detail Page)
 *
 * Tailwind-based collapsible accordion used on the coach video detail page.
 * Supports badge counts, smooth height animation, and optional
 * "only one open at a time" behavior.
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'

// ─── Standalone Accordion Item ─────────────────────────────────────────────

export interface AccordionItemProps {
  /** Section title shown in the header */
  title: string
  /** Optional badge (count or label) rendered next to the title */
  badge?: string | number
  /** Whether the item starts expanded (default: false) */
  defaultOpen?: boolean
  /** External open control – overrides internal state when provided */
  isOpen?: boolean
  /** Called when header is clicked */
  onToggle?: () => void
  /** Optional action element rendered at the far-right of the header */
  headerAction?: ReactNode
  children: ReactNode
  className?: string
}

export function AccordionItem({
  title,
  badge,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  headerAction,
  children,
  className,
}: AccordionItemProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(isOpen ? undefined : 0)

  // Measure content height for smooth animation
  useEffect(() => {
    if (!contentRef.current) return
    if (isOpen) {
      setHeight(contentRef.current.scrollHeight)
      // After the transition completes, switch to auto so dynamic content still works
      const timer = setTimeout(() => setHeight(undefined), 300)
      return () => clearTimeout(timer)
    } else {
      // First set explicit height so browser can transition from it
      setHeight(contentRef.current.scrollHeight)
      // Force reflow then collapse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0))
      })
    }
  }, [isOpen])

  const toggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen((prev) => !prev)
    }
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {badge !== undefined && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerAction && (
            <span
              onClick={(e) => e.stopPropagation()}
              className="flex items-center"
            >
              {headerAction}
            </span>
          )}
          <Icon
            name="expand_more"
            size="text-xl"
            className={cn(
              'text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Collapsible Content */}
      <div
        ref={contentRef}
        className="transition-[height] duration-300 ease-out overflow-hidden"
        style={{ height: height !== undefined ? `${height}px` : 'auto' }}
      >
        <div className="px-5 pb-5 pt-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Multi-Item Accordion (optional single-expand mode) ────────────────────

export interface AccordionGroupProps {
  /** Allow multiple items open simultaneously (default: true) */
  allowMultiple?: boolean
  children: ReactNode
  className?: string
}

/**
 * Wraps multiple `<AccordionItem>` elements and optionally enforces
 * "only one open at a time" behaviour.
 *
 * When `allowMultiple={false}`, this component clones children and
 * injects controlled `isOpen` / `onToggle` props.
 */
export function AccordionGroup({
  allowMultiple = true,
  children,
  className,
}: AccordionGroupProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (allowMultiple) {
    // Just render children as-is; each AccordionItem manages its own state
    return <div className={cn('space-y-3', className)}>{children}</div>
  }

  // Single-expand mode: inject controlled props
  const items = Array.isArray(children) ? children : [children]

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((child, index) => {
        if (!child || typeof child !== 'object' || !('props' in child)) return child
        return (
          <AccordionItem
            key={index}
            {...(child as React.ReactElement<AccordionItemProps>).props}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        )
      })}
    </div>
  )
}

export default AccordionItem
