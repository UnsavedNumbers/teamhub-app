/**
 * Accordion Component
 * 
 * Collapsible accordion for grouping related content
 */

import { useState, type ReactNode } from 'react'
import { Badge } from './Badge'

interface AccordionItemProps {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
  count?: number | string
}

interface AccordionProps {
  items: AccordionItemProps[]
  allowMultiple?: boolean
}

export function AccordionItem({ title, children, defaultExpanded = false, count }: AccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="pa-card" style={{ padding: 0, marginBottom: 'var(--pa-space-2)' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="pa-flex pa-items-center pa-justify-between"
        style={{
          width: '100%',
          padding: 'var(--pa-space-4) var(--pa-space-5)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          borderBottom: isExpanded ? '1px solid var(--pa-n100)' : 'none',
        }}
      >
        <div className="pa-flex pa-items-center pa-gap-3" style={{ flex: 1 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '20px',
              color: 'var(--pa-n600)',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            expand_more
          </span>
          <span className="pa-body-m" style={{ fontWeight: 600 }}>{title}</span>
          {count !== undefined && (
            <Badge variant="neutral" style={{ marginLeft: 'var(--pa-space-2)' }}>{count}</Badge>
          )}
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: 'var(--pa-space-4) var(--pa-space-5)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export function Accordion({ items, allowMultiple = true }: AccordionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(
    new Set(items.map((item, index) => item.defaultExpanded ? index : -1).filter(i => i !== -1))
  )

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        if (!allowMultiple) {
          next.clear()
        }
        next.add(index)
      }
      return next
    })
  }

  return (
    <div>
      {items.map((item, index) => {
        const isExpanded = expandedItems.has(index)
        return (
          <div key={index} className="pa-card" style={{ padding: 0, marginBottom: 'var(--pa-space-2)' }}>
            <button
              onClick={() => toggleItem(index)}
              className="pa-flex pa-items-center pa-justify-between"
              style={{
                width: '100%',
                padding: 'var(--pa-space-4) var(--pa-space-5)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: isExpanded ? '1px solid var(--pa-n100)' : 'none',
              }}
            >
              <div className="pa-flex pa-items-center pa-gap-3" style={{ flex: 1 }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '20px',
                    color: 'var(--pa-n600)',
                    transition: 'transform 0.2s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  expand_more
                </span>
                <span className="pa-body-m" style={{ fontWeight: 600, flex: 1 }}>{item.title}</span>
                {item.count !== undefined && (
                  <div className="pa-flex pa-items-center pa-gap-2" style={{ marginLeft: 'var(--pa-space-3)' }}>
                    <span 
                      className="pa-body-s" 
                      style={{ 
                        color: 'var(--pa-n700)', 
                        fontWeight: 600,
                        fontFamily: 'var(--pa-font-mono)',
                        fontSize: '13px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {item.count}
                    </span>
                  </div>
                )}
              </div>
            </button>

            {isExpanded && (
              <div style={{ padding: 'var(--pa-space-4) var(--pa-space-5)' }}>
                {item.children}
              </div>
            )}
          </div>
        )
      }      )}
    </div>
  )
}
