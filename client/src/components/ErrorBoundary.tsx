/**
 * Error Boundary Component
 * Catches JavaScript errors in React component tree and displays fallback UI
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * Or with custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  toggleStack = (): void => {
    this.setState(prev => ({ showStack: !prev.showStack }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showStack } = this.state;
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-red-500/10">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                Something went wrong
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Error Details (Development only by default) */}
            {showDetails && error && (
              <div className="mt-6 text-left">
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {showStack ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {showStack ? 'Hide' : 'Show'} Error Details
                </button>

                {showStack && (
                  <div className="mt-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-auto max-h-64">
                    <p className="text-sm font-mono text-red-400 mb-2">
                      {error.name}: {error.message}
                    </p>
                    {errorInfo?.componentStack && (
                      <pre className="text-xs font-mono text-[var(--color-text-muted)] whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * System Error Fallback - specifically for System Admin Layout
 */
export function SystemErrorFallback(): ReactNode {
  const handleReload = () => window.location.reload();
  const handleGoHome = () => window.location.href = '/system/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-background)]">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-red-500/10">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            System Error
          </h1>
          <p className="text-[var(--color-text-muted)]">
            The System Control Panel encountered an unexpected error.
            Our team has been notified.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button onClick={handleReload} size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
          <Button onClick={handleGoHome} variant="outline" size="lg">
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>

        <p className="text-xs text-[var(--color-text-muted)]">
          Error ID: {Date.now().toString(36).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

/**
 * Admin Error Fallback - for Tenant Admin Layout
 */
export function AdminErrorFallback(): ReactNode {
  const handleReload = () => window.location.reload();
  const handleGoHome = () => window.location.href = '/app/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-background)]">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-orange-500/10">
          <AlertTriangle className="w-10 h-10 text-orange-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Application Error
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Something went wrong while loading this page.
            Please try again or contact your administrator.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button onClick={handleReload} size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
          <Button onClick={handleGoHome} variant="outline" size="lg">
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
