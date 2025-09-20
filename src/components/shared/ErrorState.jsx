import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorState({ 
  title = "Algo deu errado",
  message = "Ocorreu um erro inesperado. Tente novamente.",
  onRetry = null,
  onGoHome = null,
  showHomeButton = true,
  className = ""
}) {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/today';
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-[400px] p-6 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{message}</p>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {onRetry && (
              <Button onClick={onRetry} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </Button>
            )}
            
            {showHomeButton && (
              <Button 
                variant="outline" 
                onClick={handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Ir para Início
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}