import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, Home, LogOut, Mail } from 'lucide-react';
import { User } from '@/api/entities';
import { routes } from '../components/utils/route-registry';

export default function Unauthorized() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await User.logout();
      navigate(routes.home());
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = routes.home();
    }
  };

  const handleRequestAccess = () => {
    const subject = 'Solicitação de Acesso - InsightFlow';
    const body = `Olá,\n\nGostaria de solicitar acesso ao sistema.\n\nURL tentando acessar: ${window.location.href}\n\nObrigado!`;
    
    window.location.href = `mailto:contato@insightflow.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-xl">Acesso negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página ou seu login expirou.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleRequestAccess}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Solicitar Acesso
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Trocar Conta
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate(routes.dashboard())}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Tentar Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}