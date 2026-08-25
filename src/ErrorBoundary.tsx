import { Component, ReactNode, ErrorInfo } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null, info: ErrorInfo | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error("ErrorBoundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Show Error Details</summary>
            {this.state.error?.toString()}
            <br />
            {this.state.info?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
