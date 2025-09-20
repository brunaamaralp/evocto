import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Target,
  Users,
  Zap,
  Download,
  Edit3,
  Eye,
  Sparkles,
  ArrowRight,
  History
} from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data para demonstração
const mockServiceContract = {
  id: "contract_social_media_001",
  serviceName: "Social Media",
  cliente: "TechCorp",
  contratoInicio: new Date('2023-09-01'),
  contratoFim: new Date('2024-08-31'),
  status: "ativo",
  
  // ESCOPO FIXO (raramente muda)
  escopoFixo: {
    entregaveisBase: [
      "16 posts por mês (4 por semana)",
      "2 stories por dia",
      "1 carrossel semanal educativo",
      "Resposta a comentários em até 4h"
    ],
    canaisInclusos: ["Instagram", "LinkedIn"],
    slas: {
      "Aprovação de conteúdo": "48h antes da publicação",
      "Resposta a comentários": "4 horas úteis",
      "Relatório mensal": "Até dia 5 do mês seguinte"
    },
    limitesContrato: [
      "Máximo 2 rodadas de revisão por peça",
      "Posts de evento/promocional: máximo 4 por mês",
      "Alteração de calendário: até 72h de antecedência"
    ]
  },

  // INVESTIMENTO E ESTRUTURA
  investimento: {
    valorMensal: 4500,
    horasInclusas: 40,
    equipeAlocada: ["Ana Silva (Estratégia)", "Carlos Santos (Criação)"]
  }
};

const mockCiclos = [
  {
    id: "cycle_2024_01",
    periodo: "Janeiro 2024",
    status: "em_andamento",
    inicioReal: new Date('2024-01-01'),
    fimPlanejado: new Date('2024-01-31'),
    progresso: 75,
    
    // PLANO TÁTICO DO CICLO (aprovado pelo cliente)
    planoTatico: {
      focoEstrategico: "Lançamento da nova funcionalidade de dashboard",
      prioridadesMes: [
        "50% do conteúdo focado em educação sobre dashboards",
        "25% em social proof (cases de sucesso)",
        "25% em conteúdo de branding/autoridade"
      ],
      ajustesEspeciais: [
        "Incluir 4 posts sobre dashboard vs outras ferramentas",
        "Criar série de tutoriais em carrossel",
        "Intensificar Stories sobre bastidores do produto"
      ],
      resultadoEsperado: "20% aumento no engajamento + 100 novos seguidores qualificados"
    },
    
    aprovacao: {
      status: "aprovado",
      aprovadoPor: "Maria CEO",
      dataAprovacao: new Date('2023-12-28'),
      observacoes: "Aprovado. Ênfase especial na educação técnica sem ser muito complexo."
    },
    
    metricas: {
      postsPublicados: 12,
      totalPlanejado: 16,
      engajamentoMedio: "4.2%",
      alcanceTotal: "45.2k",
      novosSeguidores: 78
    },
    
    // Destaque do que mudou vs. ciclo anterior
    mudancasChave: "+ Foco total no lançamento do dashboard"
  },
  {
    id: "cycle_2023_12",
    periodo: "Dezembro 2023",
    status: "finalizado",
    inicioReal: new Date('2023-12-01'),
    fimReal: new Date('2023-12-31'),
    progresso: 100,
    
    planoTatico: {
      focoEstrategico: "Black Friday + preparação para 2024",
      prioridadesMes: [
        "60% conteúdo promocional Black Friday",
        "40% preparação de expectativa para 2024"
      ],
      resultadoAlcancado: "35% aumento nas conversões durante Black Friday"
    },
    
    aprovacao: {
      status: "aprovado",
      aprovadoPor: "Maria CEO",
      dataAprovacao: new Date('2023-11-25')
    },
    
    metricas: {
      postsPublicados: 16,
      totalPlanejado: 16,
      engajamentoMedio: "6.1%",
      alcanceTotal: "62.3k",
      novosSeguidores: 124
    },
    mudancasChave: "+ Foco massivo em promoção"
  }
];

const mockProximoCiclo = {
  periodo: "Fevereiro 2024",
  status: "planejamento",
  
  planoProposto: {
    focoEstrategico: "Consolidação pós-lançamento + captura de leads",
    prioridadesSugeridas: [
      "40% cases e depoimentos de quem usa dashboard",
      "35% conteúdo educativo avançado",
      "25% thought leadership sobre métricas"
    ],
    justificativaIA: "Com base nos resultados de Janeiro (alta educação sobre dashboard), sugiro focar em social proof para converter interessados em leads.",
    fontesInsumo: ["Relatório de Janeiro", "Feedback da reunião quinzenal", "Aprendizado: Cases B2B funcionam 3x melhor"]
  }
};

// Componente para o Escopo Fixo (Contrato)
const ContratoFixoCard = ({ contrato }) => (
  <Card className="border-2 border-slate-200 bg-slate-50/70">
    <CardHeader className="flex flex-row justify-between items-start">
      <div>
        <CardTitle className="flex items-center gap-3 text-lg text-slate-800">
          <FileText className="w-5 h-5 text-slate-600"/>
          Contrato Base • {contrato.serviceName}
        </CardTitle>
        <CardDescription className="text-slate-600 mt-1">
          Escopo fixo acordado • Válido até {format(contrato.contratoFim, 'dd/MM/yyyy')}
        </CardDescription>
      </div>
      <Button variant="outline" size="sm" className="shrink-0"><Edit3 className="w-3 h-3 mr-2" />Renegociar</Button>
    </CardHeader>
    <CardContent>
      <Tabs defaultValue="entregaveis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entregaveis">Entregáveis Base</TabsTrigger>
          <TabsTrigger value="slas">SLAs</TabsTrigger>
          <TabsTrigger value="limites">Limites</TabsTrigger>
        </TabsList>
        <TabsContent value="entregaveis" className="pt-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
            {contrato.escopoFixo.entregaveisBase.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </TabsContent>
        <TabsContent value="slas" className="pt-4">
            <ul className="space-y-2 text-sm">
                {Object.entries(contrato.escopoFixo.slas).map(([key, value]) => (
                    <li key={key} className="flex justify-between">
                        <span className="font-medium text-slate-800">{key}:</span>
                        <span className="text-slate-600">{value}</span>
                    </li>
                ))}
            </ul>
        </TabsContent>
        <TabsContent value="limites" className="pt-4">
           <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
            {contrato.escopoFixo.limitesContrato.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
);

// Componente para o Ciclo Atual
const CicloAtualCard = ({ ciclo }) => (
  <Card className="shadow-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-white to-orange-50 relative overflow-hidden">
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-3 text-xl text-purple-900">
          <RotateCcw className="w-6 h-6"/>
          Ciclo Atual • {ciclo.periodo}
        </CardTitle>
        <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
            <Zap className="w-3 h-3 mr-1.5"/>
            Em Andamento
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
        {/* Progresso do Ciclo */}
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-700">Progresso do Ciclo</span>
                <span className="text-sm font-bold text-purple-800">{ciclo.progresso}%</span>
            </div>
            <Progress value={ciclo.progresso} className="w-full [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-orange-500" />
            <p className="text-xs text-slate-500 text-right mt-1">
                Finaliza em {format(ciclo.fimPlanejado, 'dd/MM/yyyy')}
            </p>
        </div>

        {/* Destaque da Mudança */}
        <div className="p-3 bg-white/80 rounded-lg border border-purple-200 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-600 shrink-0"/>
            <div>
                <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">O que mudou</p>
                <p className="text-sm font-medium text-slate-900">{ciclo.mudancasChave}</p>
            </div>
        </div>

        {/* Plano Tático */}
        <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4"/>Plano de Execução</h4>
            <p className="text-sm text-slate-600 mt-2">
                <strong>Foco Estratégico:</strong> {ciclo.planoTatico.focoEstrategico}
            </p>
            <p className="text-sm text-slate-600 mt-1">
                <strong>Resultado Esperado:</strong> {ciclo.planoTatico.resultadoEsperado}
            </p>
        </div>

        {/* Aprovação */}
        <div className="text-xs text-green-700 bg-green-50 p-2 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0"/>
            <span>Plano aprovado por <strong>{ciclo.aprovacao.aprovadoPor}</strong> em {format(ciclo.aprovacao.dataAprovacao, 'dd/MM/yyyy')}</span>
        </div>

        <Button className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-md">
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalhes do Ciclo
            <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
    </CardContent>
  </Card>
);

// Componente para o Próximo Ciclo
const ProximoCicloCard = ({ ciclo }) => (
    <Card className="border-dashed border-2 border-slate-300 bg-slate-50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-5 h-5" />
                Próximo Ciclo • {ciclo.periodo}
            </CardTitle>
            <CardDescription>Plano de execução proposto para o próximo período.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <h4 className="font-bold text-slate-900">Sugestão da IA</h4>
                </div>
                <p className="text-sm text-slate-700 italic">"{ciclo.planoProposto.justificativaIA}"</p>
                <p className="text-xs text-slate-500 mt-2">
                    <strong>Fontes:</strong> {ciclo.planoProposto.fontesInsumo.join(', ')}
                </p>
            </div>
            
            <div>
                <h5 className="font-semibold text-sm mb-1">Prioridades Sugeridas:</h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                    {ciclo.planoProposto.prioridadesSugeridas.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </div>

            <div className="flex gap-2">
                 <Button variant="outline" className="w-full">
                    <Edit3 className="w-4 h-4 mr-2"/>
                    Ajustar Plano
                </Button>
                <Button className="w-full">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Enviar para Aprovação
                </Button>
            </div>
        </CardContent>
    </Card>
);


// Componente para o Histórico de Ciclos
const HistoricoCiclos = ({ ciclos }) => (
    <Card className="shadow-lg border-0">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Histórico de Ciclos</CardTitle>
            <CardDescription>Planos e resultados de ciclos anteriores.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {ciclos.map(ciclo => (
                    <div key={ciclo.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-slate-800">{ciclo.periodo}</h4>
                            <Badge variant="outline" className="bg-white">Finalizado</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                           <strong>Foco:</strong> {ciclo.planoTatico.focoEstrategico}
                        </p>
                         <p className="text-sm text-slate-600 mt-1">
                           <strong>Resultado:</strong> <span className="font-medium text-green-700">{ciclo.planoTatico.resultadoAlcancado}</span>
                        </p>
                        <Button variant="link" className="p-0 h-auto mt-2 text-sm">Ver relatório completo</Button>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

export default function RecurringServiceView({ serviceId }) {
  const [activeTab, setActiveTab] = useState('ciclo-atual');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">{mockServiceContract.serviceName}</h2>
            <p className="text-slate-600">Visão geral do serviço recorrente para <strong>{mockServiceContract.cliente}</strong></p>
        </div>
      </div>
      
      {/* Abas Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contrato-base">
            <FileText className="w-4 h-4 mr-2"/>Contrato Base
          </TabsTrigger>
          <TabsTrigger value="ciclo-atual">
            <RotateCcw className="w-4 h-4 mr-2"/>Ciclo Atual
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="w-4 h-4 mr-2"/>Histórico
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo Aba Contrato */}
        <TabsContent value="contrato-base" className="pt-6">
            <ContratoFixoCard contrato={mockServiceContract} />
        </TabsContent>
        
        {/* Conteúdo Aba Ciclo Atual */}
        <TabsContent value="ciclo-atual" className="pt-6">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
                <CicloAtualCard ciclo={mockCiclos.find(c => c.status === 'em_andamento')} />
                <ProximoCicloCard ciclo={mockProximoCiclo} />
            </div>
        </TabsContent>
        
        {/* Conteúdo Aba Histórico */}
        <TabsContent value="historico" className="pt-6">
            <HistoricoCiclos ciclos={mockCiclos.filter(c => c.status === 'finalizado')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}