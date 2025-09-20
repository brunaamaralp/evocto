import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  GitCommit,
  Target,
  AlertCircle,
  FlaskConical,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  FileSignature,
  Loader2,
  Mail,
  History,
  Download,
  GitBranchPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Mock Data para Simulação ---
const mockInputs = {
    previousCycleResults: {
        periodo: "Janeiro 2024",
        metricas: "↑ 15% Engajamento, ↓ 5% CPL, 78 novos leads",
        aprendizadoChave: "Conteúdo sobre 'dashboard' teve 3x mais saves."
    },
    clientFeedback: {
        data: new Date('2024-02-01'),
        resumo: "Cliente satisfeito com os leads, mas quer ver mais conteúdo sobre a concorrência e como nos diferenciamos."
    },
    libraryLearnings: [
        "Cases de sucesso B2B performam melhor no LinkedIn.",
        "Gatilho de 'prova social' é eficaz para este público."
    ]
};

const mockGeneratedPlan = {
    mudancaChave: "Pivotar de conteúdo de topo de funil para foco em comparação e cases de sucesso, aproveitando o interesse gerado no dashboard.",
    prioridades: [
        "Criar 2 carrosséis comparativos (Nós vs. Concorrente A)",
        "Produzir 1 case de sucesso em vídeo focado no dashboard",
        "Manter 2 posts semanais sobre dores do público"
    ],
    ajustesEstrategicos: {
        manter: "Frequência de 4 posts/semana no LinkedIn.",
        pivotar: "Reduzir conteúdo de topo de funil e focar em meio/fundo.",
        testar: "Testar novo formato de 'Análise de Notícia do Setor'."
    },
    pendenciasCliente: [
        "Aprovar verba de R$500 para impulsionar o case de sucesso.",
        "Enviar contato do cliente 'Empresa Feliz' para colher depoimento."
    ],
    sugestoesIA: [
        "Testar o claim 'A única plataforma com análise de ROI em tempo real' nos próximos criativos.",
        "Sugerir um artigo de blog sobre 'Como a TechCorp economizou 20h/mês com nosso dashboard'."
    ],
    aprovacao: {
      aprovadoPor: "Maria CEO",
      dataAprovacao: new Date('2024-02-05')
    }
};

// ... (keep PlanInputsCard component as is) ...
const PlanInputsCard = ({ inputs, onGenerate, isGenerating, isPlanGenerated }) => (
    <Card className="shadow-lg border-0 lg:sticky lg:top-24">
        <CardHeader>
            <CardTitle>Insumos para o Plano</CardTitle>
            <CardDescription>Contexto usado pela IA para gerar a proposta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border">
                <h4 className="font-semibold text-sm flex items-center gap-2"><History className="w-4 h-4 text-slate-500" />Ciclo Anterior ({inputs.previousCycleResults.periodo})</h4>
                <p className="text-xs text-slate-600 mt-1"><strong>Métricas:</strong> {inputs.previousCycleResults.metricas}</p>
                <p className="text-xs text-slate-600"><strong>Aprendizado:</strong> {inputs.previousCycleResults.aprendizadoChave}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
                <h4 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-500" />Feedback do Cliente</h4>
                <p className="text-xs text-slate-600 mt-1">{inputs.clientFeedback.resumo}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-slate-500" />Learnings da Biblioteca</h4>
                <ul className="list-disc list-inside text-xs text-slate-600 mt-1">
                    {inputs.libraryLearnings.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </div>
            {!isPlanGenerated && (
                <Button onClick={onGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-lg hover:shadow-xl">
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
                    {isGenerating ? "Analisando Insumos..." : "Gerar Plano com IA"}
                </Button>
            )}
        </CardContent>
    </Card>
);


// Componente para a Proposta do Plano de Execução
const ExecutionPlanCard = ({ plan, status, onEdit, onSend, onApprove }) => {
    if (!plan) {
        return (
            <Card className="lg:col-span-2 flex items-center justify-center h-96 border-dashed border-2">
                <div className="text-center text-slate-500">
                    <Sparkles className="w-12 h-12 mx-auto text-slate-400 mb-2"/>
                    <p className="font-medium">O Plano de Execução aparecerá aqui.</p>
                    <p className="text-sm">Clique em "Gerar Plano com IA" para começar.</p>
                </div>
            </Card>
        );
    }

    const PlanSection = ({ title, icon: Icon, items, children }) => (
        <div>
            <h3 className="font-bold text-md flex items-center gap-2 mb-2 text-slate-800"><Icon className="w-5 h-5 text-purple-600"/>{title}</h3>
            <div className="pl-4 border-l-2 border-purple-200 space-y-3">
                {items && items.map((item, i) => (
                    <div key={i} className="text-sm text-slate-700 bg-white p-3 rounded-md shadow-sm border border-slate-100">{item}</div>
                ))}
                {children}
            </div>
        </div>
    );
    
    return (
        <Card className="lg:col-span-2 shadow-xl border-purple-200 bg-white">
            <CardHeader>
                <div className="flex justify-between items-start">
                     <div>
                        <CardTitle className="text-xl">Plano de Execução • Fevereiro 2024</CardTitle>
                        <CardDescription>Estratégia e prioridades para o ciclo atual.</CardDescription>
                     </div>
                     <Badge variant={status === 'approved' ? 'default' : 'secondary'} className={`${status === 'approved' ? "bg-green-100 text-green-800 border-green-200" : status === 'pending_approval' ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-800 border-slate-200"} py-1 px-3`}>
                        {status === 'draft' && 'Rascunho'}
                        {status === 'pending_approval' && 'Aguardando Aprovação'}
                        {status === 'approved' && 'Aprovado'}
                     </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Destaque do que mudou */}
                <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <GitBranchPlus className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-900">Mudança Estratégica para este Ciclo</AlertTitle>
                    <AlertDescription className="text-blue-800">
                        {plan.mudancaChave}
                    </AlertDescription>
                </Alert>

                <PlanSection title="Prioridades do Ciclo" icon={Target} items={plan.prioridades} />
                
                <PlanSection title="Ajustes Estratégicos" icon={GitCommit}>
                    <div className="text-sm space-y-2">
                        <p><strong>Manter:</strong> {plan.ajustesEstrategicos.manter}</p>
                        <p><strong>Pivotar:</strong> {plan.ajustesEstrategicos.pivotar}</p>
                        <p><strong>Testar:</strong> {plan.ajustesEstrategicos.testar}</p>
                    </div>
                </PlanSection>

                <PlanSection title="Sugestões de Teste (IA)" icon={FlaskConical} items={plan.sugestoesIA} />

                {/* Pendências do Cliente */}
                <Alert variant="destructive" className="bg-red-50/80 border-red-200 shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertTitle className="text-red-800">Pendências Críticas do Cliente</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc list-inside mt-1 text-red-700">
                            {plan.pendenciasCliente.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>

                {/* Área de Edição e Ações */}
                {status === 'draft' && (
                     <div>
                        <h3 className="font-bold text-md flex items-center gap-2 mb-2 text-slate-800">Ajustes Manuais</h3>
                        <Textarea placeholder="Adicione observações ou ajustes manuais ao plano antes de enviar para aprovação..."/>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={onEdit}>Salvar Rascunho</Button>
                            <Button onClick={onSend} className="bg-blue-600 hover:bg-blue-700">
                                <Mail className="w-4 h-4 mr-2"/>Enviar para Aprovação
                            </Button>
                        </div>
                    </div>
                )}
                 {status === 'pending_approval' && (
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="font-semibold text-amber-800">Aguardando aprovação do cliente.</p>
                        <p className="text-xs text-amber-700">O cliente foi notificado por e-mail.</p>
                        {/* Mock da aprovação pelo lado da agência */}
                        <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700" onClick={onApprove}>
                           <CheckCircle2 className="w-4 h-4 mr-2"/> Forçar Aprovação (Simulação)
                        </Button>
                    </div>
                 )}
                 {status === 'approved' && (
                    <Alert className="border-green-600 bg-green-50 text-green-900">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <AlertTitle>Plano Aprovado!</AlertTitle>
                        <AlertDescription>
                            Aprovado por <strong>{plan.aprovacao.aprovadoPor}</strong> em {format(plan.aprovacao.dataAprovacao, 'dd/MM/yyyy')}.
                            <div className="mt-3">
                                <Button size="sm" variant="outline" className="border-green-300 text-green-800 hover:bg-green-100">
                                    <Download className="w-4 h-4 mr-2"/> Baixar PDF do Plano
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                 )}

            </CardContent>
        </Card>
    );
};

export default function CycleExecutionPlanView() {
  const [status, setStatus] = useState('pending_generation'); // pending_generation, draft, pending_approval, approved
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState(null);

  const handleGeneratePlan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPlan(mockGeneratedPlan);
      setStatus('draft');
      setIsGenerating(false);
      // AuditLog.create({ action: 'PLAN_GENERATED_IA' ... })
    }, 1500); // Simula a chamada da IA
  };

  const handleSendForApproval = () => {
      setStatus('pending_approval');
      // AuditLog.create({ action: 'PLAN_SENT_FOR_APPROVAL' ... })
      // Lógica de notificar o cliente, criar o PDF, etc.
  };

  const handleApprove = () => {
    setStatus('approved');
    // AuditLog.create({ action: 'PLAN_APPROVED' ... })
  };

  const handleEdit = () => {
      // Lógica para salvar as edições do textarea
  };

  return (
    <div className="p-1 md:p-4">
      {/* Stepper de Status */}
      <div className="mb-6">
        <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500">
            <li className={`flex md:w-full items-center ${status !== 'pending_generation' ? 'text-blue-600' : ''} after:content-[''] after:w-full after:h-1 after:border-b ${status === 'draft' || status === 'pending_approval' || status === 'approved' ? 'after:border-blue-200' : 'after:border-gray-200'} after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10`}>
                <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200">
                    <FileSignature className={`w-5 h-5 mr-2 shrink-0 ${status !== 'pending_generation' ? 'text-blue-600' : ''}`} />
                    Rascunho
                </span>
            </li>
            <li className={`flex md:w-full items-center ${status === 'pending_approval' || status === 'approved' ? 'text-blue-600' : ''} after:content-[''] after:w-full after:h-1 after:border-b ${status === 'approved' ? 'after:border-blue-200' : 'after:border-gray-200'} after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10`}>
                <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200">
                    <Mail className={`w-5 h-5 mr-2 shrink-0 ${status === 'pending_approval' || status === 'approved' ? 'text-blue-600' : ''}`} />
                    Aprovação
                </span>
            </li>
            <li className={`flex items-center ${status === 'approved' ? 'text-blue-600' : ''}`}>
                <CheckCircle2 className={`w-5 h-5 mr-2 shrink-0 ${status === 'approved' ? 'text-blue-600' : ''}`} />
                Execução
            </li>
        </ol>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <PlanInputsCard 
            inputs={mockInputs} 
            onGenerate={handleGeneratePlan}
            isGenerating={isGenerating}
            isPlanGenerated={!!plan}
        />
        <ExecutionPlanCard 
            plan={plan} 
            status={status}
            onEdit={handleEdit}
            onSend={handleSendForApproval}
            onApprove={handleApprove}
        />
      </div>
    </div>
  );
}