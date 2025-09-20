import React, { useEffect } from 'react';
import { useSession } from './SessionManager';
import { LoadingSpinner } from '@/components/shared/LoadingStates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole = null,
  fallback = null,
  redirectTo = null 
}) {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    login 
  } = useSession();

  useEffect(() => {
    if (!loading && requireAuth && !isAuthenticated && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [loading, requireAuth, isAuthenticated, redirectTo]);

  // Still loading session
  if (loading) {
    return fallback || <LoadingSpinner size="large" text="Verificando autenticação..." />;
  }

  // Not authenticated but auth required
  if (requireAuth && !isAuthenticated) {
    if (fallback) return fallback;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center p-6">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Necessário</h2>
            <p className="text-gray-600 mb-4">
              Você precisa estar logado para acessar esta área.
            </p>
            <Button onClick={login} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role authorization
  if (requiredRole && user?.role !== requiredRole) {
    const roleNames = {
      'owner': 'Proprietário',
      'admin': 'Administrador', 
      'team': 'Membro da Equipe',
      'client': 'Cliente'
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center p-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">
              Você precisa ser {roleNames[requiredRole] || requiredRole} para acessar esta área.
            </p>
            <p className="text-sm text-gray-500">
              Seu nível atual: {roleNames[user?.role] || user?.role || 'Não definido'}
            </p>
            <Button 
              onClick={() => window.history.back()} 
              variant="outline" 
              className="mt-4"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}

export function PublicRoute({ children }) {
  return <AuthGuard requireAuth={false}>{children}</AuthGuard>;
}

export function ProtectedRoute({ children, requiredRole = null }) {
  return (
    <AuthGuard requireAuth={true} requiredRole={requiredRole}>
      {children}
    </AuthGuard>
  );
}

export function OwnerOnlyRoute({ children }) {
  return <ProtectedRoute requiredRole="owner">{children}</ProtectedRoute>;
}

export function AdminRoute({ children }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
}

export default AuthGuard;