
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, RefreshCw, Plus, Inbox } from 'lucide-react';

/**
 * Componente para renderizar diferentes estados de forma consistente
 */
export function StateRenderer({ 
  loading, 
  error, 
  isEmpty, 
  data,
  onRetry,
  emptyState,
  children,
  loadingMessage = "Carregando...",
  className = ""
}) {
  if (loading) {
    return (
      <Card className={`text-center p-12 ${className}`}>
        <CardContent>
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-slate-400" />
          <p className="text-slate-500">{loadingMessage}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`text-center p-12 ${className}`}>
        <CardContent>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Ops! Algo deu errado
          </h3>
          <p className="text-slate-500 mb-4">
            {error.message || 'Não foi possível carregar as informações.'}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return emptyState || (
      <Card className={`text-center p-12 bg-slate-50 ${className}`}>
        <CardContent>
          <Inbox className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Nenhum item encontrado
          </h3>
          <p className="text-slate-500">
            Os dados solicitados não estão disponíveis no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return children;
}

/**
 * Estado vazio customizável
 */
export function EmptyState({ 
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = ""
}) {
  return (
    <Card className={`text-center p-12 bg-slate-50/50 border border-slate-200/60 ${className}`}>
      <CardContent>
        <Icon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {title}
        </h3>
        <p className="text-slate-500 mb-6">
          {description}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}

/**
 * Alerta de erro inline
 */
export function ErrorAlert({ error, onDismiss, className = "" }) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className={`mb-4 ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error.message || 'Erro inesperado'}</span>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dispensar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
