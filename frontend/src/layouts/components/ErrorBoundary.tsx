import { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { ErrorBoundaryProps } from '../types/layout.types';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorInfoString = errorInfo.componentStack || null;
    
    this.setState({
      error,
      errorInfo: errorInfoString,
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfoString || 'Unknown error');
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    // Implementation for error reporting
    const errorData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    console.log('Error report data:', errorData);
    // Here you would typically send this to your error reporting service
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Oops! Something went wrong
              </h1>
              
              <p className="text-muted-foreground mb-8 leading-relaxed">
                We apologize for the inconvenience. An unexpected error occurred while rendering this page.
                Our team has been notified and is working to fix the issue.
              </p>

              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-8 p-4 bg-muted rounded-lg text-left">
                  <h3 className="font-semibold text-foreground mb-2">Error Details:</h3>
                  <p className="text-sm text-muted-foreground font-mono mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                        {this.state.errorInfo}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 font-medium transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </button>
                
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={this.handleReportError}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 font-medium transition-colors"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Report Error
                  </button>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Error ID: {Math.random().toString(36).substr(2, 9)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please include this ID when contacting support
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading overlay component
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({ isLoading, message, progress, className = '' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="bg-card border border-border rounded-lg shadow-lg p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin"></div>
            {progress !== undefined && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {progress !== undefined && (
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          )}

          {/* Message */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {message || 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-10 bg-muted rounded w-24 animate-pulse"></div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            <div className="h-20 bg-muted rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component loading skeleton
export function ComponentLoadingSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
      ))}
    </div>
  );
}