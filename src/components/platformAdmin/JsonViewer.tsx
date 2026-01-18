import { useState } from 'react'

interface JsonViewerProps {
  data: unknown
  title?: string
  defaultExpanded?: boolean
}

export function JsonViewer({ data, title = 'JSON Data', defaultExpanded = false }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const jsonString = JSON.stringify(data, null, 2)

  return (
    <div className="pa-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--pa-space-4)',
          background: 'var(--pa-n50)',
          border: 'none',
          borderBottom: '1px solid var(--pa-n100)',
          cursor: 'pointer',
          transition: 'background var(--pa-motion-normal) var(--pa-ease-out)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pa-n100)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--pa-n50)')}
      >
        <span className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-n900)' }}>
          {title}
        </span>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '20px',
            color: 'var(--pa-n700)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--pa-motion-normal) var(--pa-ease-out)',
          }}
        >
          expand_more
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          style={{
            padding: 'var(--pa-space-4)',
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--pa-font-mono)',
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'var(--pa-n900)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  )
}

export default JsonViewer
