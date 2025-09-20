import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  User, 
  Building, 
  Save, 
  Send, 
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import UnifiedBriefingForm from './UnifiedBriefingForm';
import { Brief } from '@/api/entities';

/**
 * Componente para consultores preencherem briefings internamente
 */
export default function InternalBriefingForm({ 
  clientId, 
  projectId,
  existingBrief = null 
}) {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [brief, setBrief] = useState(existingBrief);
  const [responses, setResponses] = useState({});
  const [mode, setMode] = useState('consultant'); // 'consultant' | 'client_view'

  const loadClientData = useCallback(async () => {
    try {
      const { Client } = await import('@/api/entities');
      const clientData = await Client.get(clientId);
      setClient(clientData);
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
    }
  }, [clientId]);

  const loadExistingResponses = useCallback(() => {
    if (existingBrief && existingBrief.business_context) {
      // Mapear campos do Brief para o formato do formulário
      setResponses({
        business_description: existingBrief.business_context,
        main_objectives: existingBrief.objectives,
        success_metrics: existingBrief.success_metrics,
        current_challenges: existingBrief.current_challenges,
        // ... outros campos mapeados
      });
    }
  }, [existingBrief]);

  useEffect(() => {
    loadClientData();
    if (existingBrief) {
      loadExistingResponses();
    }
  }, [loadClientData, loadExistingResponses, existingBrief]);

  const handleAutoSave = async (newResponses) => {
    try {
      const updatedResponses = { ...responses, ...newResponses };
      setResponses(updatedResponses);

      // Mapear de volta para o formato Brief
      const briefData = {
        agencyId,
        projectId,
        business_context: updatedResponses.business_description || '',
        objectives: updatedResponses.main_objectives || '',
        success_metrics: updatedResponses.success_metrics || '',
        current_challenges: updatedResponses.current_challenges || '',
        // ... outros campos
        status: 'DRAFT'
      };

      if (brief) {
        await Brief.update(brief.id, briefData);
      } else {
        const newBrief = await Brief.create(briefData);
        setBrief(newBrief);
      }

      console.log('✅ Auto-save realizado');
    } catch (error) {
      console.error('❌ Erro no auto-save:', error);
      throw error;
    }
  };

  const handleSubmitBriefing = async (briefingData) => {
    setLoading(true);
    try {
      const briefData = {
        agencyId,
        projectId,
        business_context: briefingData.responses.business_description || '',
        objectives: briefingData.responses.main_objectives || '',
        success_metrics: briefingData.responses.success_metrics || '',
        current_challenges: briefingData.responses.current_challenges || '',
        status: 'READY',
        completion_score: calculateCompletionScore(briefingData.responses),
        // ... outros campos mapeados
      };

      if (brief) {
        await Brief.update(brief.id, briefData);
      } else {
        const newBrief = await Brief.create(briefData);
        setBrief(newBrief);
      }

      console.log('✅ Briefing finalizado pelo consultor');
    } catch (error) {
      console.error('❌ Erro ao finalizar briefing:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionScore = (responses) => {
    const requiredFields = [
      'business_description', 'main_products', 'target_market',
      'main_objectives', 'success_metrics', 'current_challenges'
    ];
    
    const completed = requiredFields.filter(field => 
      responses[field] && responses[field].trim().length > 0
    ).length;
    
    return Math.round((completed / requiredFields.length) * 100);
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Briefing Estratégico - {client.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {client.legal_name || client.name}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Preenchido por: {user.full_name}
                </div>
                {brief && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Última atualização: {new Date(brief.updated_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {brief && (
            <div className="flex items-center gap-2">
              <Badge 
                variant={brief.status === 'READY' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {brief.status === 'READY' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                {brief.status === 'READY' ? 'Finalizado' : 'Em andamento'}
              </Badge>
              {brief.completion_score && (
                <Badge variant="outline">
                  {brief.completion_score}% completo
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs para diferentes modos */}
      <Tabs value={mode} onValueChange={setMode} className="mb-6">
        <TabsList>
          <TabsTrigger value="consultant" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Modo Consultor
          </TabsTrigger>
          <TabsTrigger value="client_view" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Visão do Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultant">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Preenchimento pelo Consultor
              </CardTitle>
              <p className="text-sm text-gray-600">
                Preencha o briefing em nome do cliente. As respostas serão salvas automaticamente.
              </p>
            </CardHeader>
            <CardContent>
              <UnifiedBriefingForm
                mode="internal"
                clientData={client}
                initialResponses={responses}
                onSave={handleAutoSave}
                onSubmit={handleSubmitBriefing}
                allowSave={true}
                showProgress={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client_view">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Prévia do Cliente
              </CardTitle>
              <p className="text-sm text-gray-600">
                Visualização de como o cliente veria este briefing no portal público.
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-6 rounded-lg">
                <UnifiedBriefingForm
                  mode="public"
                  clientData={client}
                  initialResponses={responses}
                  showProgress={true}
                  // Modo preview - sem funcionalidades de save/submit
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}