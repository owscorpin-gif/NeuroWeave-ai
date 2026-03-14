import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorDisplay } from "./ErrorDisplay";
import { ShieldAlert, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private parseFirestoreError(error: Error) {
    try {
      return JSON.parse(error.message);
    } catch {
      return null;
    }
  }

  public render() {
    if (this.state.hasError) {
      const firestoreError = this.state.error ? this.parseFirestoreError(this.state.error) : null;

      if (firestoreError) {
        return (
          <div className="min-h-screen bg-bg flex items-center justify-center p-8">
            <div className="max-w-md w-full glass rounded-[2.5rem] p-10 text-center border-red-500/20">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                  <ShieldAlert className="text-red-500 w-8 h-8" />
                </div>
              </div>
              
              <h2 className="text-2xl font-serif font-bold text-white mb-4">Security Restriction</h2>
              
              <div className="text-gray-400 text-sm mb-8 leading-relaxed">
                <p className="mb-2">You don't have permission to perform this action.</p>
                <div className="bg-black/40 p-3 rounded-xl font-mono text-[10px] text-left overflow-x-auto">
                  <div className="text-red-400 mb-1 uppercase tracking-widest">Operation: {firestoreError.operationType}</div>
                  <div className="text-gray-500">Path: {firestoreError.path}</div>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
              >
                <RefreshCw size={18} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="h-screen w-screen bg-bg flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <ErrorDisplay 
              error={this.state.error} 
              onRetry={() => window.location.reload()} 
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
