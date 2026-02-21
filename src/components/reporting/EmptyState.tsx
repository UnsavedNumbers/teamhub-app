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
          background: 'var(--org-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--org-text-secondary)' }}>
          {icon}
        </span>
      </div>
      <h3
        style={{
          fontSize: '24px',
          fontWeight: '600',
          color: 'var(--org-text-primary)',
          margin: '0 0 12px 0',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '16px',
          color: 'var(--org-text-secondary)',
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
