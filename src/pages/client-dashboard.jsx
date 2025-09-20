import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import ClientFinancialDashboard from '@/components/client_portal/ClientFinancialDashboard';
import LoadingState from '@/components/shared/LoadingStates';

/**
 * Página do dashboard financeiro do cliente
 * Rota: /cliente/:clienteId/servicos/:servicoId/dashboard
 */
export default function ClientDashboardPage() {
  const { clienteId, servicoId } = useParams();
  const { user, isAuthenticated, loading: sessionLoading } = useSession();

  // Verificar se está carregando a sessão
  if (sessionLoading) {
    return <LoadingState message="Verificando acesso..." />;
  }

  // Verificar se está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/client-login" replace />;
  }

  // Verificar se é cliente
  if (user?.role !== 'client') {
    return <Navigate to="/" replace />;
  }

  // Verificar se o clienteId pertence ao usuário
  if (user?.clientId !== clienteId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Acesso Negado
            </h2>
            <p className="text-red-700">
              Você não tem permissão para acessar este dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se os parâmetros estão presentes
  if (!clienteId || !servicoId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              Parâmetros Inválidos
            </h2>
            <p className="text-yellow-700">
              Cliente ou serviço não especificado na URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientFinancialDashboard 
      clientId={clienteId} 
      serviceId={servicoId} 
    />
  );
}

