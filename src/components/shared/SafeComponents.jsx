import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Componente para estados vazios padronizados
export function EmptyState({ 
  icon: Icon = Inbox,
  title = "Nenhum item encontrado",
  description = "Não há itens para exibir no momento.",
  action = null,
  className = ""
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Icon className="w-12 h-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

// Componente para estados de erro padronizados
export function ErrorState({
  error = "Ocorreu um erro inesperado",
  title = "Algo deu errado",
  onRetry = null,
  showRetry = true,
  className = ""
}) {
  const errorMessage = typeof error === 'string' ? error : error?.message || "Erro desconhecido";
  
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-sm">{errorMessage}</p>
      {showRetry && (
        <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}

// Componente para estados de loading padronizados
export function LoadingState({
  text = "Carregando...",
  size = "default",
  className = ""
}) {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-6 h-6", 
    large: "w-8 h-8"
  };
  
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 mb-3`} />
      <p className="text-gray-600">{text}</p>
    </div>
  );
}

// Wrapper para componentes que podem falhar
export function SafeComponent({ 
  children, 
  fallback = null, 
  onError = null,
  name = "Component"
}) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
      if (onError) onError(error);
      console.error(`Error in ${name}:`, error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [name, onError]);
  
  if (hasError) {
    if (fallback) return fallback;
    
    return (
      <ErrorState 
        title={`Erro no componente ${name}`}
        error={error}
        onRetry={() => {
          setHasError(false);
          setError(null);
        }}
      />
    );
  }
  
  return children;
}

// Hook para dados com estados padronizados
export function useDataState(initialData = null) {
  const [data, setData] = React.useState(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  const setState = React.useCallback((newState) => {
    if (newState?.loading !== undefined) setLoading(newState.loading);
    if (newState?.error !== undefined) setError(newState.error);
    if (newState?.data !== undefined) setData(newState.data);
  }, []);
  
  const resetError = React.useCallback(() => setError(null), []);
  
  return {
    data,
    loading,
    error,
    setState,
    resetError,
    isEmpty: data == null || (Array.isArray(data) && data.length === 0),
    hasData: data != null && (!Array.isArray(data) || data.length > 0)
  };
}

// Componente condicional seguro
export function ConditionalRender({ 
  condition, 
  children, 
  fallback = null,
  loading = false,
  error = null
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!condition) return fallback;
  
  return children;
}

// Lista segura com fallbacks
export function SafeList({ 
  items = [], 
  renderItem, 
  keyExtractor = (item, index) => item?.id || index,
  emptyState = null,
  loading = false,
  error = null,
  className = ""
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  const safeItems = Array.isArray(items) ? items : [];
  
  if (safeItems.length === 0) {
    return emptyState || <EmptyState />;
  }
  
  return (
    <div className={className}>
      {safeItems.map((item, index) => {
        if (!item) return null;
        
        const key = keyExtractor(item, index);
        
        return (
          <SafeComponent key={key} name={`ListItem-${key}`}>
            {renderItem(item, index)}
          </SafeComponent>
        );
      })}
    </div>
  );
}