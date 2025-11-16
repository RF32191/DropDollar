'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary Caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-900/30 border-4 border-red-700 rounded-lg p-6">
              <h1 className="text-3xl font-bold text-red-400 mb-4">
                🚨 Application Error Caught!
              </h1>
              
              <div className="bg-red-950 p-4 rounded-lg mb-4">
                <h2 className="text-xl font-bold mb-2">Error Message:</h2>
                <p className="text-red-300 font-mono text-sm">
                  {this.state.error?.toString()}
                </p>
              </div>

              {this.state.error?.stack && (
                <div className="bg-red-950 p-4 rounded-lg mb-4">
                  <h2 className="text-xl font-bold mb-2">Stack Trace:</h2>
                  <pre className="text-xs text-red-300 overflow-auto max-h-96">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              {this.state.errorInfo && (
                <div className="bg-red-950 p-4 rounded-lg mb-4">
                  <h2 className="text-xl font-bold mb-2">Component Stack:</h2>
                  <pre className="text-xs text-red-300 overflow-auto max-h-96">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                🔄 Reload Page
              </button>

              <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <h3 className="font-bold text-yellow-400 mb-2">📋 Copy this error and send to developer:</h3>
                <textarea
                  readOnly
                  className="w-full h-32 bg-gray-800 text-white p-2 rounded font-mono text-xs"
                  value={`Error: ${this.state.error?.toString()}\n\nStack: ${this.state.error?.stack}`}
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
