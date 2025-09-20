import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log to monitoring service (Sentry, etc.)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to monitoring if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false, context = 'página' } = this.props;
      
      if (fallback) {
        return fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="min-h-64 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardContent className="text-center p-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Ops! Algo deu errado
              </h2>
              <p className="text-gray-600 mb-4">
                Ocorreu um erro inesperado ao carregar esta {context}. Nossa equipe foi notificada automaticamente.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Ir para Dashboard
                </Button>
              </div>

              {showDetails && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Detalhes técnicos (para desenvolvedores)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 text-xs rounded overflow-x-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;