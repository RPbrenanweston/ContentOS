// @crumb studio-error-boundary
// [UI] | React class error boundary | Global error catch component
// why: Catches unhandled React render errors to prevent studio session loss and give users recovery path
// in:[ReactNode children, optional fallback ReactNode] out:[children or fallback UI] err:[none—this IS the error handler]
// hazard: getDerivedStateFromError only catches render-phase errors, not event handlers or async code
// hazard: Resetting state with Try again re-renders the same subtree—parent data may still be broken
// edge:apps/studio/src/app/layout.tsx -> USED_BY
// edge:apps/studio/src/components/console/ConsoleLayout.tsx -> USED_BY
// edge:apps/studio/src/components/logbook/LogbookLayout.tsx -> USED_BY
// edge:apps/studio/src/components/assembly/AssemblyLayout.tsx -> USED_BY
// prompt: Wire componentDidCatch to Sentry once error tracking is configured; consider per-route boundaries

'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    // Future: send to Sentry
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666', margin: '1rem 0' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
