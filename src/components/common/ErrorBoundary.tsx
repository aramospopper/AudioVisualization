import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
  info?: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<{}, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // keep state for render; also surface to console for devs
    this.setState({ error, info });
    // eslint-disable-next-line no-console
    console.error('Unhandled error captured by ErrorBoundary', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children as React.ReactElement;

    const message = this.state.error?.message || 'Unknown error';
    const stack = this.state.error?.stack || this.state.info?.componentStack || '';

    return (
      <div style={{ padding: 24, fontFamily: 'Inter, ui-sans-serif, system-ui', lineHeight: 1.4 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ef4444' }} />
          <h2 style={{ margin: 0 }}>AudioVisor — runtime error</h2>
        </div>

        <div style={{ marginTop: 16, background: '#fff6f6', border: '1px solid #fee2e2', padding: 16, borderRadius: 8 }}>
          <div style={{ fontWeight: 600, color: '#991b1b' }}>{message}</div>
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 13 }}>{stack}</pre>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#3C50E0',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(`${message}\n\n${stack}`)}
              style={{
                marginLeft: 8,
                background: '#efefef',
                color: '#111827',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Copy error
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, color: '#6b7280', fontSize: 13 }}>
          <strong>Tip:</strong> open the browser console for a full stack trace and network errors. If this is happening on first load, try disabling any aggressive ad/content blockers.
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
