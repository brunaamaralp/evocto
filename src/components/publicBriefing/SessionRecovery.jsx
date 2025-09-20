import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SessionRecovery({ 
  onReconnect, 
  onForceReload, 
  hasUnsavedChanges, 
  lastSyncTime,
  connectionStatus = 'unknown'
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onReconnect();
    } catch (error) {
      console.error('Recovery failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'offline':
        return {
          icon: <WifiOff className="h-5 w-5" />,
          title: 'Você está offline',
          description: 'Suas respostas estão sendo salvas localmente.',
          variant: 'warning'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-5 w-5 animate-spin" />,
          title: 'Reconectando...',
          description: 'Tentando restaurar a conexão.',
          variant: 'info'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Problema de conexão',
          description: 'Não foi possível sincronizar suas respostas.',
          variant: 'error'
        };
      case 'recovered':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          title: 'Conexão restaurada',
          description: 'Suas respostas foram sincronizadas com sucesso.',
          variant: 'success'
        };
      default:
        return null;
    }
  };

  const status = getStatusMessage();
  if (!status || connectionStatus === 'online') return null;

  return (
    <Card className="mb-6 border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {status.icon}
          {status.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={`border-${status.variant === 'error' ? 'red' : status.variant === 'success' ? 'green' : 'amber'}-200`}>
          <AlertDescription>
            {status.description}
            {lastSyncTime && (
              <div className="mt-2 text-xs text-gray-600">
                Último salvamento: {new Date(lastSyncTime).toLocaleTimeString('pt-BR')}
              </div>
            )}
          </AlertDescription>
        </Alert>

        {hasUnsavedChanges && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você tem alterações não sincronizadas. Elas serão enviadas quando a conexão for restaurada.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'error' && (
          <div className="flex gap-2">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              variant="outline"
              size="sm"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Tentando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente ({retryCount > 0 ? `${retryCount}ª tentativa` : 'retry'})
                </>
              )}
            </Button>
            
            {retryCount >= 3 && (
              <Button 
                onClick={onForceReload} 
                variant="destructive"
                size="sm"
              >
                Recarregar Página
              </Button>
            )}
          </div>
        )}

        {connectionStatus === 'recovered' && (
          <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
            ✓ Todas as suas respostas foram salvas com segurança.
          </div>
        )}
      </CardContent>
    </Card>
  );
}