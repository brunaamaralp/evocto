/**
 * 📋 Página de Briefing Público
 * 
 * Página dedicada para o cliente responder ao briefing obrigatório
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  ArrowLeft, 
  Lock,
  CheckCircle
} from 'lucide-react';
import PublicBriefing from '@/components/briefing/PublicBriefing';
import { Service, Task } from '@/api/entities';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function PublicBriefingPage() {
  const { serviceId, clientId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSession();
  const [service, setService] = useState(null);
  const [briefingTask, setBriefingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar se usuário tem acesso
  useEffect(() => {
    const checkAccess = async () => {
      if (!serviceId || !clientId) {
        setError('Parâmetros inválidos');
        setLoading(false);
        return;
      }

      try {
        // Verificar se o serviço existe e se o usuário tem acesso
        const serviceData = await Service.get(serviceId);
        if (!serviceData) {
          setError('Serviço não encontrado');
          setLoading(false);
          return;
        }

        // Verificar se o cliente tem acesso a este serviço
        if (serviceData.clientId !== clientId) {
          setError('Acesso negado');
          setLoading(false);
          return;
        }

        setService(serviceData);

        // Verificar se existe briefing task
        const tasks = await Task.filter({
          serviceId,
          type: 'mandatory_briefing'
        });

        if (tasks.length === 0) {
          setError('Briefing não encontrado para este serviço');
          setLoading(false);
          return;
        }

        setBriefingTask(tasks[0]);

        // Verificar se briefing já foi completado
        if (tasks[0].status === 'completed') {
          setError('Briefing já foi completado');
          setLoading(false);
          return;
        }

      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        setError('Erro ao carregar briefing');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [serviceId, clientId]);

  const handleBriefingComplete = () => {
    toast.success('Briefing concluído com sucesso!');
    navigate(`/client-portal`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando briefing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Erro no Acesso
              </h1>
              <p className="text-gray-600 mb-6">{error}</p>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/client-portal')}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Portal
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/client-portal')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Briefing Estratégico
                  </h1>
                  <p className="text-sm text-gray-600">
                    {service?.name} • {service?.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Obrigatório</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <PublicBriefing
          serviceId={serviceId}
          clientId={clientId}
          onComplete={handleBriefingComplete}
        />
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este briefing é obrigatório para o início do projeto. 
              Suas respostas nos ajudarão a personalizar o projeto para suas necessidades específicas.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}