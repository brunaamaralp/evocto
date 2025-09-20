
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CyclePlan, Service, Client, AuditLog } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { useAppContext } from '@/components/context/ContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Send, CheckCircle, ExternalLink, Loader2, Bot, Package, Hash, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';
import SaveableForm from '../components/shared/SaveableForm';
import AIPlanningAssistant from '../components/cycles/AIPlanningAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const CyclePlanSkeleton = () => (
  <div className="space-y-6 px-4 sm:px-0">
    {/* Breadcrumb Skeleton */}
    <div className="h-6 bg-slate-200 rounded w-64 animate-pulse"></div>
    
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4">
      <div>
        <div className="h-8 bg-slate-200 rounded w-56 animate-pulse"></div>
        <div className="h-5 bg-slate-200 rounded w-40 mt-2 animate-pulse"></div>
      </div>
      <div className="flex gap-3 mt-4 sm:mt-0">
        <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        <div className="h-10 bg-slate-200 rounded w-40 animate-pulse"></div>
      </div>
    </div>

    {/* Form Skeleton */}
    <div className="space-y-4">
      <div className="h-32 bg-slate-200 rounded-lg animate-pulse"></div>
      <div className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
      <div className="h-48 bg-slate-200 rounded-lg animate-pulse"></div>
    </div>
  </div>
);

const getStatusLabel = (status) => {
    switch (status) {
        case 'draft': return 'Rascunho';
        case 'pending_approval': return 'Aguardando Aprovação';
        case 'approved': return 'Aprovado';
        case 'rejected': return 'Rejeitado';
        case 'active': return 'Ativo';
        case 'completed': return 'Concluído';
        default: return status;
    }
};

const FREQUENCY_LABELS = {
    weekly: 'Semanal',
    bi_weekly: 'Quinzenal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    yearly: 'Anual',
    one_time: 'Única',
};

const PRIORITY_COLORS = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200',
};

export default function CyclePlanPage() {
    const { planId } = useParams();
    const navigate = useNavigate();
    const { agency, user } = useSession();
    const { buildRibbonContext, setRibbonContext } = useAppContext();
    const [cyclePlan, setCyclePlan] = useState(null);
    const [service, setService] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showAIAssistant, setShowAIAssistant] = useState(false);
    const [activeTab, setActiveTab] = useState('plan'); // State for managing active tab
    const [isGenerating, setIsGenerating] = useState(false); // For new generate plan function

    useEffect(() => {
        if (planId && agency?.id) {
            loadPlanData();
        }
    }, [planId, agency?.id]);

    const loadPlanData = async () => {
        setLoading(true);
        try {
            const planData = await CyclePlan.get(planId);
            setCyclePlan(planData);

            // OTIMIZAÇÃO: Paralelizar chamadas de Service e Client
            const [serviceData, clientData] = await Promise.all([
                Service.get(planData.serviceId),
                Client.get(planData.clientId)
            ]);
            
            setService(serviceData);
            setClient(clientData);

            // Build context ribbon after all data is loaded
            buildRibbonContext(clientData, serviceData, {
                id: planData.id,
                label: `Plano de ${planData.cyclePeriod}`
            });

        } catch (error) {
            console.error("Erro ao carregar plano do ciclo:", error);
            toast.error("Falha ao carregar o plano.");
            navigate(createPageUrl('cycles'));
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = async (formData) => {
        try {
            const updatedPlan = await CyclePlan.update(planId, { planData: formData });
            setCyclePlan(prev => ({ ...prev, planData: updatedPlan.planData }));
            // The form data in SaveableForm is automatically updated on success.
            // We just need to return the saved data.
            return updatedPlan.planData;
        } catch (error) {
            console.error("Erro ao salvar plano:", error);
            // Let SaveableForm handle the toast
            throw error;
        }
    };

    const handleSendForApproval = async () => {
        if (!cyclePlan || isSending) return;

        if (cyclePlan.status !== 'draft') {
            toast.error("Ação Inválida", {
                description: `Este plano não pode ser enviado para aprovação pois seu status é '${getStatusLabel(cyclePlan.status)}'.`
            });
            return;
        }

        if (cyclePlan.approvalData?.public_share_token) {
            toast.info("Link já existe", {
                description: "Já existe um link de aprovação ativo. Você pode reenviá-lo.",
                action: {
                    label: 'Copiar Link',
                    onClick: () => {
                        const url = `${window.location.origin}/public-approval/${cyclePlan.approvalData.public_share_token}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado!");
                    }
                }
            });
            return;
        }

        setIsSending(true);
        try {
            const rcExpiryDays = agency?.policies?.rcExpiryDays || 7;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + rcExpiryDays);
            const approvalToken = `cpl_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

            const updatedPlan = await CyclePlan.update(planId, {
                status: 'pending_approval',
                approvalData: {
                    public_share_token: approvalToken,
                    token_expires_at: expiresAt.toISOString(),
                }
            });

            setCyclePlan(updatedPlan);

            await AuditLog.create({
                agencyId: agency.id,
                entity_type: 'CyclePlan',
                entity_id: planId,
                action: 'APPROVAL_CREATED',
                actor_id: user.email,
                meta_json: { expires_at: expiresAt.toISOString() }
            });

            toast.success("Plano enviado para aprovação!", {
                description: "O link de aprovação foi gerado.",
            });

        } catch (error) {
            console.error("Erro ao enviar para aprovação:", error);
            let errorMessage = "Não foi possível enviar para aprovação.";
            if (error.status === 422) {
                errorMessage = "O plano não está em um estado que permita esta ação.";
            }
            toast.error("Erro", { description: errorMessage });
        } finally {
            setIsSending(false);
        }
    };

    const getApprovalUrl = () => {
        if (cyclePlan?.approvalData?.public_share_token) {
            return `${window.location.origin}/public-approval/${cyclePlan.approvalData.public_share_token}`;
        }
        return null;
    };
    
    const handleAIPlanGenerated = (aiResult) => {
        if (aiResult.cyclePlanId) {
            // Se foi criado um novo plano, recarregar
            navigate(createPageUrl(`cycle-plan/${aiResult.cyclePlanId}`));
        } else {
            // Se foi apenas gerado o preview, aplicar aos dados do formulário
            setCyclePlan(prevPlan => ({
                ...prevPlan,
                planData: {
                    ...prevPlan.planData,
                    ...aiResult.plan
                }
            }));
            setShowAIAssistant(false);
            toast.success('Plano aplicado ao formulário');
        }
    };

    const handleGeneratePlan = async () => {
        if (!service?.id) {
            toast.error('Serviço não encontrado para gerar plano.');
            return;
        }

        setIsGenerating(true);
        try {
            const { generateCyclePlan } = await import('@/api/functions');
            const result = await generateCyclePlan({
                serviceId: service.id,
                targetPeriod: cyclePlan.cyclePeriod,
                mode: 'preview' // Assuming 'preview' mode for direct application
            });

            if (result.success) {
                setCyclePlan(prev => ({ ...prev, planData: result.plan }));
                toast.success(`Plano gerado com ${result.confidence}% de confiança!`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erro na geração:', error);
            toast.error('Erro ao gerar plano automático');
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return <CyclePlanSkeleton />;
    }

    if (!cyclePlan || !service || !client) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold">Plano não encontrado</h2>
                <p className="text-slate-600 mt-2">Este plano pode ter sido removido ou você não tem permissão para acessá-lo.</p>
                <Button asChild className="mt-4">
                    <Link to={createPageUrl('cycles')}>Voltar para Ciclos</Link>
                </Button>
            </div>
        );
    }

    const isApprovalActive = cyclePlan.status === 'pending_approval' && cyclePlan.approvalData?.public_share_token;
    const approvalUrl = getApprovalUrl();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl(`services/${service.id}`))}>
                            <ArrowLeft className="w-4 h-4 mr-2"/>
                            Voltar para {service.name}
                        </Button>
                        <CardTitle className="mt-2 text-2xl">Plano de {cyclePlan.cyclePeriod}</CardTitle>
                        <CardDescription>{client.name}</CardDescription>
                    </div>
                    {isApprovalActive ? (
                        <Button asChild>
                            <a href={approvalUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2"/>
                                Abrir link de aprovação
                            </a>
                        </Button>
                    ) : (
                         <Button onClick={handleSendForApproval} disabled={isSending || cyclePlan.status !== 'draft'}>
                            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Send className="w-4 h-4 mr-2" />}
                            Enviar para Aprovação
                        </Button>
                    )}
                </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="plan">Plano</TabsTrigger>
                    <TabsTrigger value="deliverables">Entregáveis</TabsTrigger>
                    <TabsTrigger value="context">Contexto</TabsTrigger>
                    <TabsTrigger value="approval">Aprovação</TabsTrigger>
                </TabsList>

                <TabsContent value="plan" className="mt-6">
                    <Card>
                        <CardContent>
                            {/* Conteúdo do Plano - Formulário */}
                            <SaveableForm
                                initialData={cyclePlan.planData || {}}
                                onSave={handleSavePlan}
                                entityName="Plano"
                            >
                                {({ formData, setFormData }) => (
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="mudancaChave" className="block text-sm font-medium text-gray-700">Mudança Chave para o Mês</label>
                                            <textarea
                                                id="mudancaChave"
                                                rows={3}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.mudancaChave || ''}
                                                onChange={(e) => setFormData({ ...formData, mudancaChave: e.target.value })}
                                                placeholder="Ex: Focar em vídeos curtos no Instagram para aumentar o alcance da marca."
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="prioridades" className="block text-sm font-medium text-gray-700">Prioridades</label>
                                            <textarea
                                                id="prioridades"
                                                rows={5}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.prioridades?.join('\n') || ''}
                                                onChange={(e) => setFormData({ ...formData, prioridades: e.target.value.split('\n') })}
                                                placeholder="Liste as prioridades do mês, uma por linha."
                                            />
                                        </div>
                                    </div>
                                )}
                            </SaveableForm>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="deliverables" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Entregáveis Previstos</CardTitle>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Baseado no serviço contratado para este ciclo
                                    </p>
                                </div>
                                <Badge variant="outline">
                                    {service?.deliverables?.length || 0} entregáveis
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {service?.deliverables && service.deliverables.length > 0 ? (
                                <div className="space-y-4">
                                    {service.deliverables.map(deliverable => (
                                        <div key={deliverable.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium">{deliverable.name}</h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        <Hash className="w-3 h-3 mr-1" />
                                                        {deliverable.quantity} {FREQUENCY_LABELS[deliverable.frequency] || deliverable.frequency}
                                                    </Badge>
                                                    <Badge className={PRIORITY_COLORS[deliverable.priority]} variant="outline">
                                                        {deliverable.priority === 'low' ? 'Baixa' : 
                                                         deliverable.priority === 'medium' ? 'Média' : 'Alta'}
                                                    </Badge>
                                                </div>
                                                {deliverable.description && (
                                                    <p className="text-sm text-slate-500 mt-1">{deliverable.description}</p>
                                                )}
                                            </div>
                                            {deliverable.estimated_hours > 0 && (
                                                <Badge variant="outline" className="ml-4">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {deliverable.estimated_hours}h
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                    
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-medium text-blue-900 mb-2">📋 Integração com o Plano</h4>
                                        <p className="text-sm text-blue-700">
                                            Estes entregáveis servem como referência para o planejamento do ciclo. 
                                            A IA já considera esta lista ao sugerir prioridades e ajustes estratégicos.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500">Nenhum entregável definido para este serviço.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="context" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contexto do Cliente e Serviço</CardTitle>
                            <CardDescription>Informações detalhadas sobre o cliente e o serviço para auxiliar no planejamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Example Context Details */}
                                <div>
                                    <h4 className="font-semibold">Informações do Cliente:</h4>
                                    <p className="text-sm text-gray-700">Nome: {client.name}</p>
                                    <p className="text-sm text-gray-700">Segmento: {client.segment || 'Não especificado'}</p>
                                    <p className="text-sm text-gray-700">Observações: {client.notes || 'Nenhuma'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Informações do Serviço:</h4>
                                    <p className="text-sm text-gray-700">Nome: {service.name}</p>
                                    <p className="text-sm text-gray-700">Tipo: {service.type || 'Não especificado'}</p>
                                    <p className="text-sm text-gray-700">Descrição: {service.description || 'Nenhuma'}</p>
                                </div>
                                {service.historicalData && Object.keys(service.historicalData).length > 0 && (
                                    <div>
                                        <h4 className="font-semibold">Dados Históricos do Serviço:</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-700">
                                            {Object.entries(service.historicalData).map(([key, value]) => (
                                                <li key={key}><strong>{key}:</strong> {JSON.stringify(value)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                                    <p>Este painel contextualiza o planejamento, fornecendo acesso rápido a dados relevantes para decisões estratégicas.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="approval" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Aprovação</CardTitle>
                            <CardDescription>Acompanhe o status e as interações relacionadas à aprovação deste plano.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold">Status Atual:</h4>
                                    <p className="text-lg font-medium text-blue-600">{getStatusLabel(cyclePlan.status)}</p>
                                </div>
                                {cyclePlan.approvalData && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Detalhes da Aprovação:</h4>
                                        {cyclePlan.approvalData.public_share_token && (
                                            <p className="text-sm text-gray-700">
                                                Link de Aprovação: 
                                                <a href={approvalUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">
                                                    Abrir Link <ExternalLink className="inline-block w-4 h-4 ml-1" />
                                                </a>
                                            </p>
                                        )}
                                        {cyclePlan.approvalData.token_expires_at && (
                                            <p className="text-sm text-gray-700">Expira em: {new Date(cyclePlan.approvalData.token_expires_at).toLocaleDateString('pt-BR')}</p>
                                        )}
                                        {cyclePlan.approvalData.approved_by && (
                                            <p className="text-sm text-gray-700">Aprovado por: {cyclePlan.approvalData.approved_by} em {new Date(cyclePlan.approvalData.approved_at).toLocaleDateString('pt-BR')}</p>
                                        )}
                                        {cyclePlan.approvalData.rejected_by && (
                                            <p className="text-sm text-gray-700">Rejeitado por: {cyclePlan.approvalData.rejected_by} em {new Date(cyclePlan.approvalData.rejected_at).toLocaleDateString('pt-BR')}</p>
                                        )}
                                        {cyclePlan.approvalData.rejection_reason && (
                                            <p className="text-sm text-gray-700">Motivo da Rejeição: <span className="font-medium italic">{cyclePlan.approvalData.rejection_reason}</span></p>
                                        )}
                                    </div>
                                )}
                                <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                                    <p>Este histórico permite auditar todas as ações de aprovação, garantindo transparência e rastreabilidade.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Assistant Toggle */}
            {cyclePlan?.status === 'draft' && (
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bot className="w-6 h-6 text-purple-600" />
                                <div>
                                    <h3 className="font-semibold text-slate-900">Assistente de Planejamento IA</h3>
                                    <p className="text-sm text-slate-600">
                                        Gere um plano otimizado baseado em histórico e aprendizados
                                    </p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => setShowAIAssistant(!showAIAssistant)}
                                variant={showAIAssistant ? "outline" : "default"}
                                className={!showAIAssistant ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                            >
                                {showAIAssistant ? 'Fechar IA' : 'Ativar IA'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AI Planning Assistant */}
            {showAIAssistant && cyclePlan && (
                <AIPlanningAssistant
                    serviceId={cyclePlan.serviceId}
                    targetPeriod={cyclePlan.cyclePeriod}
                    onPlanGenerated={handleAIPlanGenerated}
                    onPlanUpdated={(updatedPlan) => {
                        setCyclePlan(prev => ({
                            ...prev,
                            planData: {
                                ...prev.planData,
                                ...updatedPlan
                            }
                        }));
                    }}
                />
            )}
        </div>
    );
}
