import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, ArrowLeft, FileText, AlertTriangle, CheckCircle,
  Loader2, Eye, Plus, Info
} from 'lucide-react';
import { Brief } from '@/api/entities';
import { Client } from '@/api/entities';
import { Project } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import ContextHeader from '@/components/navigation/ContextHeader';
import BriefingForm from '@/components/briefings/BriefingForm';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

function BriefingEditorPage() {
  const { user, agencyId } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 🔧 CORREÇÃO MELHORADA: Extrair parâmetros de múltiplas formas
  const getUrlParams = () => {
    // Método 1: URLSearchParams
    const searchParams = new URLSearchParams(location.search);
    const fromSearch = {
      briefingId: searchParams.get('briefingId'),
      clientId: searchParams.get('clientId'),
      projectId: searchParams.get('projectId')
    };
    
    // Método 2: window.location.search (backup)
    const windowParams = new URLSearchParams(window.location.search);
    const fromWindow = {
      briefingId: windowParams.get('briefingId'),
      clientId: windowParams.get('clientId'),
      projectId: windowParams.get('projectId')
    };
    
    // Método 3: Hash parameters (se estiver sendo usado)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const fromHash = {
      briefingId: hashParams.get('briefingId'),
      clientId: hashParams.get('clientId'),
      projectId: hashParams.get('projectId')
    };
    
    // Consolidar parâmetros (prioridade: search > window > hash)
    const params = {
      briefingId: fromSearch.briefingId || fromWindow.briefingId || fromHash.briefingId,
      clientId: fromSearch.clientId || fromWindow.clientId || fromHash.clientId,
      projectId: fromSearch.projectId || fromWindow.projectId || fromHash.projectId
    };
    
    console.log('🔍 Debug URL Params:', {
      currentUrl: window.location.href,
      locationSearch: location.search,
      windowSearch: window.location.search,
      hash: window.location.hash,
      fromSearch,
      fromWindow,
      fromHash,
      finalParams: params
    });
    
    return params;
  };
  
  const { briefingId, clientId, projectId } = getUrlParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [client, setClient] = useState(null);
  const [project, setProject] = useState(null);

  // 🔧 CORREÇÃO: Modo de operação mais permissivo
  const isEditing = Boolean(briefingId);
  const isCreating = Boolean(clientId || projectId);

  console.log('📝 Modo de operação:', { 
    isEditing, 
    isCreating, 
    briefingId, 
    clientId, 
    projectId,
    hasAnyParams: Boolean(briefingId || clientId || projectId)
  });

  const loadBriefingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Iniciando carregamento com parâmetros:', {
        agencyId,
        briefingId,
        clientId,
        projectId
      });

      if (!agencyId) {
        console.log('❌ AgencyId não encontrado');
        setError('Agência não identificada');
        return;
      }

      // Se não temos parâmetros suficientes, mostrar erro mais específico
      if (!isEditing && !isCreating) {
        console.log('❌ Nenhum parâmetro encontrado');
        setError(`Parâmetros da URL não encontrados. URL atual: ${window.location.href}`);
        return;
      }

      if (isEditing && briefingId) {
        console.log('📝 Modo Edição - briefingId:', briefingId);
        
        // Carregar briefing existente
        const briefingData = await Brief.get(briefingId);
        
        if (!briefingData || briefingData.agencyId !== agencyId) {
          throw new Error('Briefing não encontrado ou sem permissão');
        }

        setBriefing(briefingData);
        console.log('✅ Briefing carregado:', briefingData.id);

        // Carregar dados relacionados
        if (briefingData.projectId) {
          try {
            const clientData = await Client.get(briefingData.projectId);
            setClient(clientData);
            console.log('✅ Cliente carregado:', clientData.name);
          } catch (clientError) {
            console.warn('⚠️ Erro ao carregar cliente:', clientError);
          }

          try {
            const projectData = await Project.get(briefingData.projectId);
            setProject(projectData);
            console.log('✅ Projeto carregado');
          } catch (projectError) {
            console.warn('⚠️ Erro ao carregar projeto:', projectError);
          }
        }

      } else if (isCreating) {
        console.log('🆕 Modo Criação - clientId:', clientId, 'projectId:', projectId);
        
        const targetClientId = clientId;
        const targetProjectId = projectId || clientId; // Usar clientId como projectId se necessário

        if (!targetClientId) {
          setError('ID do cliente é obrigatório para criar briefing');
          return;
        }

        // Carregar dados do cliente
        const clientData = await Client.get(targetClientId);
        
        if (!clientData || clientData.agencyId !== agencyId) {
          throw new Error('Cliente não encontrado ou sem permissão');
        }

        setClient(clientData);
        console.log('✅ Cliente carregado para criação:', clientData.name);

        // Verificar se já existe briefing para este cliente
        const existingBriefings = await Brief.filter({
          agencyId,
          projectId: targetProjectId
        });

        if (existingBriefings.length > 0) {
          console.log('📋 Briefing existente encontrado, redirecionando...');
          navigate(`${createPageUrl('briefing-editor')}?briefingId=${existingBriefings[0].id}`);
          return;
        }

        // Criar estrutura de briefing vazio
        const newBriefingStructure = {
          agencyId,
          projectId: targetProjectId,
          assignedClientUserId: null,
          business_context: '',
          company_profile: '',
          current_challenges: '',
          objectives: '',
          success_metrics: '',
          stakeholders: '',
          communication_preferences: 'consultivo',
          budget_expectations: '',
          timeline_expectations: '',
          additional_context: '',
          financial_data_availability: {
            has_organized_data: false,
            systems_used: [],
            data_quality_notes: ''
          },
          regulatory_context: {
            industry_regulations: [],
            compliance_status: '',
            regulatory_challenges: ''
          },
          dynamic_questions: [],
          gaps_identified: [],
          completion_score: 0,
          status: 'DRAFT'
        };

        setBriefing(newBriefingStructure);
        console.log('✅ Estrutura de briefing criada para novo cliente');

      } else {
        console.log('❌ Estado inconsistente:', { isEditing, isCreating, briefingId, clientId, projectId });
        setError('Estado inconsistente no carregamento do briefing');
      }

    } catch (err) {
      console.error('❌ Erro ao carregar briefing:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agencyId, briefingId, clientId, projectId, isEditing, isCreating, navigate]);

  useEffect(() => {
    console.log('🚀 useEffect executado - location.search:', location.search);
    loadBriefingData();
  }, [loadBriefingData, location.search]);

  const handleSave = async (formData) => {
    try {
      setSaving(true);

      console.log('💾 Salvando briefing:', { isEditing, formData });

      if (isEditing && briefingId) {
        // Atualizar briefing existente
        const updatedBriefing = await Brief.update(briefingId, {
          ...formData,
          completion_score: calculateCompletionScore(formData)
        });
        setBriefing(updatedBriefing);
        toast.success('Briefing atualizado com sucesso!');
        
      } else if (isCreating && briefing) {
        // Criar novo briefing
        const newBriefing = await Brief.create({
          ...briefing,
          ...formData,
          completion_score: calculateCompletionScore(formData)
        });
        
        toast.success('Briefing criado com sucesso!');
        
        // Redirecionar para edição do briefing criado
        navigate(`${createPageUrl('briefing-editor')}?briefingId=${newBriefing.id}`);
        return;
      } else {
        throw new Error('Estado inválido para salvamento');
      }

    } catch (error) {
      console.error('❌ Erro ao salvar briefing:', error);
      toast.error(`Erro ao salvar briefing: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const calculateCompletionScore = (data) => {
    const requiredFields = [
      'business_context', 'company_profile', 'current_challenges',
      'objectives', 'success_metrics', 'timeline_expectations'
    ];
    
    const filledFields = requiredFields.filter(field => 
      data[field] && data[field].toString().trim().length > 10
    );
    
    return Math.round((filledFields.length / requiredFields.length) * 100);
  };

  const breadcrumbItems = [
    { label: 'Clientes', href: createPageUrl('clients'), icon: FileText },
    ...(client ? [{ 
      label: client.name || client.legal_name || 'Cliente', 
      href: createPageUrl('client') + `?clientId=${client.id}` 
    }] : []),
    { label: isEditing ? 'Editar Briefing' : 'Criar Briefing' }
  ];

  if (loading) {
    return <LoadingState message="Carregando briefing..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        
        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>URL atual:</strong> {window.location.href}</p>
            <p><strong>Parâmetros encontrados:</strong></p>
            <pre className="bg-gray-100 p-2 rounded text-xs">
              {JSON.stringify({ briefingId, clientId, projectId }, null, 2)}
            </pre>
          </div>
          
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={createPageUrl('clients')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Clientes
              </Link>
            </Button>
            
            {clientId && (
              <Button asChild>
                <Link to={`${createPageUrl('client')}?clientId=${clientId}`}>
                  Ir para Cliente
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        {/* Header de contexto */}
        <ContextHeader
          title={isEditing ? 'Editar Briefing Mestre' : 'Criar Briefing Mestre'}
          subtitle={client ? `${client.name || client.legal_name} • ${client.legal_name || 'Empresa'}` : 'Cliente não identificado'}
          backButton={{
            href: client ? `${createPageUrl('client')}?clientId=${client.id}` : createPageUrl('clients')
          }}
          entity={{
            type: 'briefing',
            status: briefing?.status || 'draft',
            metadata: briefing ? [
              {
                icon: CheckCircle,
                label: 'Completude',
                value: `${briefing.completion_score || 0}%`
              }
            ] : []
          }}
          actions={[
            {
              label: saving ? 'Salvando...' : 'Salvar',
              icon: saving ? Loader2 : Save,
              onClick: () => {
                // Trigger save do form
                const event = new CustomEvent('briefing-save');
                document.dispatchEvent(event);
              },
              className: saving ? 'opacity-50' : '',
              variant: 'default'
            }
          ]}
        />

        <div className="p-6">
          <Breadcrumbs items={breadcrumbItems} />

          {/* Formulário de briefing */}
          <div className="max-w-4xl mx-auto">
            <BriefingForm
              briefing={briefing}
              setBriefing={setBriefing}
              client={client}
              isEditing={isEditing}
              onSave={handleSave}
              saving={saving}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default BriefingEditorPage;