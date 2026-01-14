import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900 max-w-sm w-full animate-slide-up">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ops, algo deu errado.</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Não foi possível carregar este recurso. Isso geralmente acontece por falha na conexão.
            </p>
            <button 
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200 dark:shadow-none"
            >
                Tentar Novamente
            </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}