import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './index';
import { logDiscoveryError } from '../../utils/featureDiscovery/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DiscoveryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logDiscoveryError(error, { 
        errorType: 'DiscoveryError', 
        message: 'React Component Error', 
        details: errorInfo 
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Ideally this would trigger a re-fetch or reset keys in parent
    window.location.reload(); 
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
            padding: '24px', 
            border: '1px solid var(--pa-error)', 
            borderRadius: '8px', 
            background: '#fff5f5',
            color: 'var(--pa-n900)'
        }}>
          <h3 className="pa-heading-s" style={{ color: 'var(--pa-error)' }}>
            Something went wrong with Feature Discovery.
          </h3>
          <p className="pa-body-m" style={{ marginBottom: '16px' }}>
            We've logged this issue. Please try refreshing the page.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
             <Button variant="ghost" onClick={this.handleRetry}>
                Reload Page
             </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{ marginTop: '16px', fontSize: '12px', overflow: 'auto' }}>
                {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
