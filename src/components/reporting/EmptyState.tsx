/**
 * Empty State Component
 *
 * Premium empty state for reports with no data.
 * Provides helpful messaging and suggested next steps.
 */

interface EmptyStateProps {
  title: string
  description: string
  icon?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon = 'insights', action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--pa-n100, #f1f5f9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
        className="empty-state-icon"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--pa-n500, #64748b)' }}>
          {icon}
        </span>
      </div>
      <h3
        className="oa-h2"
        style={{
          margin: '0 0 12px 0',
        }}
      >
        {title}
      </h3>
      <p
        className="oa-body-m"
        style={{
          margin: '0 0 32px 0',
          maxWidth: '500px',
          lineHeight: '1.6',
        }}
      >
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '12px 24px',
            background: 'var(--org-color-primary)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
