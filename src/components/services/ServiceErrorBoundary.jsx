
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

class ServiceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: `service_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console for debugging
    console.error('ServiceErrorBoundary caught an error:', error, errorInfo);
    
    // P6: Report error to monitoring (simulate)
    try {
      // In real implementation, send to error tracking service
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      console.error('Error Report:', errorReport);
      
      // Could send to service like Sentry, LogRocket, etc.
      // trackError(errorReport);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: null 
    });
    
    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    if (this.props.onClose) {
      this.props.onClose();
    } else {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                            this.state.error?.message?.includes('network');
      
      const isValidationError = this.state.error?.message?.includes('validation') ||
                               this.state.error?.message?.includes('required');

      // Fixed: Check for development mode without using process
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('dev');

      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Ops! Algo deu errado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro na Criação do Serviço</AlertTitle>
              <AlertDescription>
                {isNetworkError 
                  ? 'Problema de conexão detectado. Verifique sua internet e tente novamente.'
                  : isValidationError
                  ? 'Dados inválidos foram detectados. Verifique os campos preenchidos.'
                  : 'Ocorreu um erro inesperado durante a criação do serviço.'
                }
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>ID do Erro:</strong> {this.state.errorId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Detalhes Técnicos:</strong> {this.state.error?.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              
              <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  const subject = `Erro na Criação de Serviço - ${this.state.errorId}`;
                  const body = `ID do Erro: ${this.state.errorId}\n\nDetalhes: ${this.state.error?.message}\n\nURL: ${window.location.href}`;
                  window.open(`mailto:suporte@exemplo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                }}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Reportar Problema
              </Button>
            </div>

            {isDevelopment && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Detalhes Técnicos (Desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {this.state.error && this.state.error.stack}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ServiceErrorBoundary;
