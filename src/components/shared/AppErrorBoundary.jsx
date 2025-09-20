import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppErrorBoundary] Error caught:', {
      error: error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorInfo: errorInfo,
      componentStack: errorInfo?.componentStack
    });

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log mais detalhado para debug
    if (error?.message?.includes("Cannot read properties of undefined")) {
      console.error('[AppErrorBoundary] Detailed undefined property error:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        props: Object.keys(this.props || {}),
        componentStack: errorInfo?.componentStack?.split('\n')?.slice(0, 10)
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const isDev = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || 
                   (typeof window !== 'undefined' && window.location.hostname === 'localhost');

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-800">Erro inesperado</CardTitle>
                  <p className="text-sm text-red-600 mt-1">
                    Ocorreu um problema técnico na aplicação.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  Possíveis soluções:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Recarregue a página</li>
                  <li>• Tente usar outro navegador</li>
                  <li>• Limpe o cache do navegador</li>
                  <li>• Entre em contato com o suporte se o problema persistir</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  Recarregar Página
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Início
                </Button>
              </div>

              {isDev && error && (
                <details className="mt-6 bg-gray-100 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Informações técnicas (desenvolvimento)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-600">ERRO:</h4>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto text-red-600">
                        {error.name}: {error.message}
                      </pre>
                    </div>
                    
                    {error.stack && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-600">STACK TRACE:</h4>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-600">COMPONENT STACK:</h4>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-bold text-gray-600">URL ATUAL:</h4>
                      <p className="text-xs text-gray-700">{typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-600">USER AGENT:</h4>
                      <p className="text-xs text-gray-700 break-all">{typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-600">TIMESTAMP:</h4>
                      <p className="text-xs text-gray-700">{new Date().toISOString()}</p>
                    </div>
                  </div>
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

export default AppErrorBoundary;