import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Download,
  ExternalLink,
  Target,
  XCircle,
  TrendingUp,
  Lightbulb,
  History,
  Paperclip,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UploadFile } from '@/api/integrations';
import { LearningEntry, AuditLog } from '@/api/entities';

// Mock data para demonstração completa
const mockWorkOrder = {
  id: 'wo_landing_bf_001',
  title: 'Landing Page Black Friday',
  category: 'landing_page',
  status: 'concluido',
  clientId: 'client_techcorp_001',
  
  scope: {
    objetivo: 'Criar landing page de conversão para campanha Black Friday com foco em captação de leads qualificados e vendas diretas.',
    entregaveis: [
      'Design responsivo da landing page',
      'Copywriting otimizado para conversão',
      'Integração com ferramentas de analytics',
      'Formulário de captação de leads',
      'Botões de CTA otimizados'
    ],
    fora_do_escopo: [
      'Criação de campanhas de tráfego pago',
      'Setup de email marketing',
      'Manutenção pós-Black Friday'
    ],
    timeline: {
      inicio_planejado: new Date('2023-10-15'),
      entrega_planejada: new Date('2023-11-20'),
      inicio_real: new Date('2023-10-16'),
      entrega_real: new Date('2023-11-18')
    },
    investimento: {
      valor_fixo: 8500,
      horas_estimadas: 35,
      equipe_alocada: ['Maria Designer', 'João Copywriter', 'Carlos Dev']
    }
  },
  
  aprovacao: {
    public_share_token: 'wo_token_bf2023',
    approved_at: new Date('2023-10-25'),
    approved_by: 'cliente@techcorp.com',
    version: 'v1.2',
    pdf_url: '/workorders/wo_landing_bf_001_v1.2_approved.pdf'
  },
  
  resultados: {
    metricas_principais: {
      visitors: 12500,
      conversion_rate: 4.2,
      leads_generated: 525,
      revenue: 45000,
      cpl: 16.19
    },
    aprendizados_chave: [
      'CTA "Garantir Desconto" converteu 40% melhor que "Saber Mais"',
      'Seção de FAQ reduziu bounce rate em 25%',
      'Prova social com logos dos clientes aumentou credibilidade'
    ],
    files_entregues: [
      'landing-page-final.zip',
      'relatorio-metricas-bf.pdf',
      'assets-aprovados.zip'
    ],
    satisfacao_cliente: 5
  },
  
  learning_extracted: false,
  attachments: [
    { name: 'Brief inicial.pdf', url: '/files/brief-landing-bf.pdf', type: 'brief' },
    { name: 'Referências visuais.zip', url: '/files/refs-visuais.zip', type: 'reference' }
  ]
};

const mockVersionHistory = [
  { version: 'v1.2', date: new Date('2023-10-25'), author: 'João Strategy', changes: 'Adicionada seção de FAQ por solicitação do cliente', status: 'approved' },
  { version: 'v1.1', date: new Date('2023-10-20'), author: 'Maria Designer', changes: 'Ajustes de layout para mobile', status: 'superseded' },
  { version: 'v1.0', date: new Date('2023-10-18'), author: 'João Strategy', changes: 'Versão inicial do escopo', status: 'superseded' }
];

// Componente para Escopo Detalhado
const EscopoCard = ({ scope }) => (
  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-blue-900">
        <Target className="w-6 h-6 text-blue-600"/>
        Escopo Aprovado
      </CardTitle>
      <CardDescription className="text-blue-700">
        Definição formal do que está incluído neste trabalho
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div>
        <h4 className="font-semibold text-slate-800 mb-2">Objetivo Principal</h4>
        <p className="text-slate-700 bg-white/60 p-3 rounded-lg border">{scope.objetivo}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            ✅ Está Incluído
          </h4>
          <ul className="space-y-2">
            {scope.entregaveis.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-green-50/60 p-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 shrink-0"></div>
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            ❌ Fora do Escopo
          </h4>
          <ul className="space-y-2">
            {scope.fora_do_escopo.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-red-50/60 p-2 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 p-4 bg-white/60 rounded-lg border">
        <div>
          <h5 className="font-medium text-slate-800 text-sm">Investimento</h5>
          <p className="text-lg font-bold text-slate-900">R$ {scope.investimento.valor_fixo.toLocaleString()}</p>
        </div>
        <div>
          <h5 className="font-medium text-slate-800 text-sm">Prazo</h5>
          <p className="text-sm text-slate-700">
            {format(scope.timeline.entrega_real || scope.timeline.entrega_planejada, 'dd/MM/yyyy')}
          </p>
        </div>
        <div>
          <h5 className="font-medium text-slate-800 text-sm">Equipe</h5>
          <p className="text-xs text-slate-600">{scope.investimento.equipe_alocada.join(', ')}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente para Resultados e Extração de Aprendizados
const ResultadosCard = ({ workOrder, onExtractLearning }) => {
  const [extracting, setExtracting] = useState(false);
  const [resultFiles, setResultFiles] = useState([]);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await UploadFile({ file });
      setResultFiles(prev => [...prev, { name: file.name, url: file_url, uploaded_at: new Date() }]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    }
  };

  const handleExtractLearning = async () => {
    setExtracting(true);
    
    try {
      // Criar learning entry com base nos resultados
      await LearningEntry.create({
        agencyId: workOrder.agencyId || 'agency_demo_01',
        projectId: null, // WorkOrder não tem projeto específico
        sourceType: 'workorder',
        sourceRef: workOrder.id,
        title: `Aprendizados: ${workOrder.title}`,
        description: `Insights extraídos do WorkOrder "${workOrder.title}" com taxa de conversão de ${workOrder.resultados.metricas_principais.conversion_rate}%`,
        niche: workOrder.category,
        format: 'landing_page',
        trigger: workOrder.resultados.aprendizados_chave[0],
        promise: `Conversão de ${workOrder.resultados.metricas_principais.conversion_rate}%`,
        rationale: workOrder.resultados.aprendizados_chave.join('; '),
        resultJSON: workOrder.resultados.metricas_principais,
        tags: [workOrder.category, 'workorder', 'conversion_optimization']
      });

      // Registrar no audit log
      await AuditLog.create({
        agencyId: workOrder.agencyId || 'agency_demo_01',
        entity_type: 'WorkOrder',
        entity_id: workOrder.id,
        action: 'LEARNING_EXTRACTED',
        actor_id: 'current_user',
        meta_json: {
          workorder_title: workOrder.title,
          conversion_rate: workOrder.resultados.metricas_principais.conversion_rate,
          leads_generated: workOrder.resultados.metricas_principais.leads_generated
        }
      });

      workOrder.learning_extracted = true;
    } catch (error) {
      console.error('Erro ao extrair aprendizado:', error);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-600"/>
          Resultados & Aprendizados
        </CardTitle>
        <CardDescription>Métricas finais e insights gerados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {workOrder.status === 'concluido' && workOrder.resultados ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {workOrder.resultados.metricas_principais.visitors?.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600">Visitantes</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-900">
                  {workOrder.resultados.metricas_principais.conversion_rate}%
                </div>
                <div className="text-xs text-green-600">Taxa Conversão</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {workOrder.resultados.metricas_principais.leads_generated?.toLocaleString()}
                </div>
                <div className="text-xs text-purple-600">Leads Gerados</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-900">
                  R$ {workOrder.resultados.metricas_principais.cpl?.toFixed(2)}
                </div>
                <div className="text-xs text-orange-600">CPL</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500"/>
                Aprendizados-Chave
              </h4>
              <ul className="space-y-2">
                {workOrder.resultados.aprendizados_chave.map((learning, i) => (
                  <li key={i} className="p-3 bg-amber-50/60 rounded-lg border-l-4 border-amber-400">
                    <p className="text-sm text-slate-700">{learning}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Arquivos Entregues</h4>
              <div className="grid grid-cols-1 gap-2">
                {workOrder.resultados.files_entregues.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{file}</span>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3 mr-1"/>
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {!workOrder.learning_extracted && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">💡 Extrair Aprendizados</h4>
                <p className="text-sm text-purple-700 mb-4">
                  Transforme os resultados deste WorkOrder em aprendizados para a biblioteca e evolução do cliente.
                </p>
                <Button onClick={handleExtractLearning} disabled={extracting} className="bg-purple-600 hover:bg-purple-700">
                  {extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Lightbulb className="w-4 h-4 mr-2"/>}
                  {extracting ? 'Processando...' : 'Extrair Aprendizados'}
                </Button>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Upload de Relatórios</h4>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.csv,.png,.jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="result-upload"
                />
                <Button variant="outline" onClick={() => document.getElementById('result-upload').click()}>
                  <Upload className="w-4 h-4 mr-2"/>
                  Adicionar Arquivo
                </Button>
                <span className="text-xs text-slate-500">PDF, Excel, CSV, Imagens</span>
              </div>
              
              {resultFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {resultFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-800">{file.name}</span>
                      <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">Resultados serão adicionados após conclusão do trabalho.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente para Histórico de Versões
const HistoricoCard = ({ versions }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <History className="w-5 h-5 text-slate-600"/>
        Histórico de Versões
      </CardTitle>
      <CardDescription>Rastreamento completo de mudanças no escopo</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {versions.map((version, i) => (
          <div key={i} className={`p-4 rounded-lg border-l-4 ${version.status === 'approved' ? 'border-green-500 bg-green-50/60' : 'border-slate-300 bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={version.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
                  {version.version}
                </Badge>
                <span className="text-sm font-medium text-slate-800">{version.author}</span>
              </div>
              <span className="text-xs text-slate-500">
                {format(version.date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm text-slate-700">{version.changes}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Componente principal
export default function WorkOrderOverview({ workOrderId }) {
  const workOrder = mockWorkOrder; // Em produção viria do banco
  const versions = mockVersionHistory;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{workOrder.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={`${workOrder.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'} text-sm`}>
              {workOrder.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
            </Badge>
            <span className="text-slate-500">Job Pontual</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-500">{workOrder.category.replace('_', ' ')}</span>
          </div>
        </div>
        
        {workOrder.aprovacao?.pdf_url && (
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2"/>
            Baixar PDF Aprovado
          </Button>
        )}
      </div>

      <Tabs defaultValue="escopo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="escopo">Escopo</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="escopo" className="pt-6">
          <EscopoCard scope={workOrder.scope} />
        </TabsContent>

        <TabsContent value="resultados" className="pt-6">
          <ResultadosCard workOrder={workOrder} />
        </TabsContent>

        <TabsContent value="historico" className="pt-6">
          <HistoricoCard versions={versions} />
        </TabsContent>

        <TabsContent value="anexos" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5"/>
                Anexos & Referências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workOrder.attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-500"/>
                      <span className="text-sm font-medium text-slate-800">{file.name}</span>
                      <Badge variant="outline" className="text-xs">{file.type}</Badge>
                    </div>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-3 h-3 mr-1"/>
                      Abrir
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}