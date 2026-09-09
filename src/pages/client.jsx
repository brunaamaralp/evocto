import { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import { Loader2 } from 'lucide-react';

/**
 * /client redireciona para o hub canônico /client-detail.
 * Preserva clientId e parâmetros auxiliares (ex.: open=invite).
 */
export default function ClientPage() {
  const location = useLocation();

  const target = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const clientId = getUrlSearchParam(params, 'clientId', 'id');
    if (!clientId) {
      return createPageUrl('clients');
    }
    const next = new URLSearchParams();
    next.set('clientId', clientId);
    const open = params.get('open');
    if (open) next.set('open', open);
    return `${createPageUrl('client-detail')}?${next.toString()}`;
  }, [location.search]);

  useEffect(() => {
    // Mantém deep-links antigos funcionando via Navigate abaixo
  }, []);

  if (!location.search && !target.includes('clientId')) {
    return <Navigate to={createPageUrl('clients')} replace />;
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-gray-600">Redirecionando ao perfil do cliente...</p>
        </div>
      </div>
      <Navigate to={target} replace />
    </>
  );
}
