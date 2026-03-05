import { Component, ErrorInfo, ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class NotificationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('NotificationErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return <NotificationErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function NotificationErrorFallback({ error }: { error: Error | null }) {
  const t = useT()
  
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
      <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        {t('common.error.label')}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-4 text-center max-w-md">
        {error?.message || 'Something went wrong loading notifications'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-[var(--org-btn-primary-bg)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
      >
        Reload Page
      </button>
    </div>
  )
}

export default NotificationErrorBoundary
