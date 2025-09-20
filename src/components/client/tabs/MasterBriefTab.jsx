import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  User,
  HeartCrack,
  ThumbsUp,
  Target,
  PlusCircle,
  MinusCircle,
  Check,
  X,
  History,
  GitCommit,
  Sparkles,
  MessageSquare,
  Award
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Mock Data Completo para Simulação ---
const mockBriefing = {
  persona: [
    { text: "CEO de startup de tecnologia, 35-45 anos, focado em crescimento rápido e ROI.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Lê blogs de tecnologia e ouve podcasts sobre empreendedorismo.", status: "added", source: "Aprendizado: Campanha Q1", date: new Date('2024-01-20') }
  ],
  dores: [
    { text: "Dificuldade em gerar leads qualificados.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Baixo engajamento nas redes sociais.", status: "removed", source: "Reunião de Alinhamento", date: new Date('2024-01-15') },
    { text: "Concorrência agressiva em tráfego pago.", status: "added", source: "Análise de Concorrência", date: new Date('2024-01-18') }
  ],
  claims: [
    { text: "Aumente seu ROI em 90 dias.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Plataforma all-in-one para marketing.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Resultados comprovados por +500 empresas.", status: "added", source: "Case de Sucesso Q4", date: new Date('2024-01-22') }
  ],
  tom_de_voz: [
    { text: "Profissional, mas acessível. Evita jargões técnicos complexos.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Foco em dados e resultados mensuráveis.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Tom de urgência moderada - criar senso de oportunidade sem pressão.", status: "added", source: "A/B Test Tom de Voz", date: new Date('2024-01-19') }
  ],
  diferenciais: [
    { text: "Único no mercado com integração nativa ao CRM Salesforce.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Suporte 24/7 em português.", status: "active", source: "Briefing Inicial", date: new Date('2023-11-01') },
    { text: "Dashboard de ROI em tempo real.", status: "added", source: "Feature Launch Q4", date: new Date('2024-01-20') }
  ]
};

const mockChangeLog = [
  { change: "+ Tom: Urgência moderada adicionada", source: "A/B Test Tom de Voz", date: new Date('2024-01-22') },
  { change: "+ Claim: Resultados comprovados por +500 empresas", source: "Case de Sucesso Q4", date: new Date('2024-01-22') },
  { change: "+ Diferencial: Dashboard ROI em tempo real", source: "Feature Launch Q4", date: new Date('2024-01-20') },
  { change: "+ Dor: Concorrência agressiva em tráfego pago", source: "Análise de Concorrência", date: new Date('2024-01-18') },
  { change: "- Dor: Baixo engajamento nas redes sociais", source: "Reunião de Alinhamento", date: new Date('2024-01-15') }
];

const mockPendingValidation = {
  type: "Mudança de Persona Principal",
  proposedChange: "Expandir persona para incluir 'Diretores de Marketing de empresas médias (100-500 funcionários)' como público secundário.",
  reason: "Análise dos últimos 3 meses mostra 40% dos leads qualificados vêm desse perfil, sugerindo oportunidade de expansão.",
  source: "Relatório de Performance Q4",
  proposer: "Ana Silva"
};

// Componente reutilizável para cada seção do briefing
const BriefingSection = ({ title, icon: Icon, items, description }) => (
  <Card className="shadow-sm border-slate-200/60">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
        <Icon className="w-5 h-5 text-purple-600"/>
        {title}
      </CardTitle>
      <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li 
            key={index}
            className={`p-4 rounded-lg flex items-start gap-3 transition-all border
              ${item.status === 'added' ? 'bg-gradient-to-r from-green-50 to-emerald-50/50 border-green-200' : ''}
              ${item.status === 'removed' ? 'bg-gradient-to-r from-red-50 to-pink-50/50 border-red-200' : ''}
              ${item.status === 'active' ? 'bg-slate-50/70 border-slate-200' : ''}
            `}
          >
            {item.status === 'added' && (
              <div className="flex items-center gap-1">
                <PlusCircle className="w-4 h-4 text-green-600 shrink-0"/>
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                  NOVO
                </Badge>
              </div>
            )}
            {item.status === 'removed' && <MinusCircle className="w-4 h-4 text-red-600 mt-1 shrink-0"/>}
            {item.status === 'active' && <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 shrink-0"></div>}

            <div className="flex-1">
              <p className={`font-medium leading-relaxed ${item.status === 'removed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                {item.text}
              </p>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                <span className="font-medium">
                  {item.status === 'added' ? '✓ Adicionado' : item.status === 'removed' ? '✗ Removido' : '📌 Origem'}: 
                </span>
                <span>{item.source}</span>
                <span>•</span>
                <span>{formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

const PendingValidationCard = ({ validation }) => (
  <Alert className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-lg mb-6">
    <Sparkles className="h-6 w-6 text-amber-600" />
    <AlertTitle className="font-bold text-xl text-amber-900 mb-2">🚨 Validação Manual Necessária</AlertTitle>
    <AlertDescription className="space-y-4">
      <p className="text-slate-700 font-medium">Uma mudança estratégica foi proposta e precisa da sua aprovação para ser integrada ao Briefing Mestre.</p>
      <div className="p-4 bg-white/80 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-amber-100 text-amber-800">{validation.type}</Badge>
          <span className="text-xs text-slate-500">Proposto por: {validation.proposer}</span>
        </div>
        <p className="font-semibold text-slate-900 mb-2">"{validation.proposedChange}"</p>
        <p className="text-sm text-slate-700">
          <strong>Justificativa:</strong> {validation.reason}
        </p>
        <p className="text-xs text-slate-500 mt-2">Fonte: {validation.source}</p>
      </div>
      <div className="flex gap-3">
        <Button className="bg-green-600 hover:bg-green-700">
          <Check className="w-4 h-4 mr-2"/>
          Aprovar e Integrar
        </Button>
        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
          <X className="w-4 h-4 mr-2"/>
          Rejeitar Mudança
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);

const ChangeLog = ({ logs }) => (
  <Card className="sticky top-24 shadow-sm">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-md text-slate-900">
        <GitCommit className="w-5 h-5 text-slate-600"/>
        Mudanças Recentes
      </CardTitle>
      <CardDescription>Últimas atualizações no briefing</CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3">
        {logs.slice(0, 5).map((log, i) => (
          <li key={i} className="flex items-start gap-3 pb-2 border-b border-slate-100 last:border-0">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-purple-400 shrink-0"></div>
            <div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">{log.change}</p>
              <p className="text-xs text-slate-500 mt-1">
                {log.source} • {formatDistanceToNow(log.date, { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="link" className="p-0 mt-4 h-auto text-purple-600 hover:text-purple-800">
        <History className="w-4 h-4 mr-2"/>
        Ver histórico completo na Evolução
      </Button>
    </CardContent>
  </Card>
);

export default function MasterBriefTab({ client }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Briefing Mestre</h2>
        <p className="text-slate-600 mt-1">Estado atual e confiável do conhecimento sobre <strong>{client?.name}</strong>. Atualizado automaticamente com base em aprendizados.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Coluna Principal: O Briefing Mestre */}
        <div className="lg:col-span-2 space-y-6">
          {mockPendingValidation && <PendingValidationCard validation={mockPendingValidation}/>}
          
          <BriefingSection 
            title="Persona Principal" 
            icon={User}
            description="Quem estamos tentando alcançar e suas características."
            items={mockBriefing.persona} 
          />
          <BriefingSection 
            title="Dores e Objeções" 
            icon={HeartCrack}
            description="Os problemas que nosso cliente resolve e barreiras na conversão."
            items={mockBriefing.dores}
          />
          <BriefingSection 
            title="Claims e Promessas" 
            icon={ThumbsUp}
            description="As promessas de valor que funcionam melhor com a audiência."
            items={mockBriefing.claims}
          />
          <BriefingSection 
            title="Tom de Voz" 
            icon={MessageSquare}
            description="Como nos comunicamos: linguagem, estilo e abordagem."
            items={mockBriefing.tom_de_voz}
          />
          <BriefingSection 
            title="Diferenciais do Negócio" 
            icon={Award}
            description="O que torna este cliente único no mercado."
            items={mockBriefing.diferenciais}
          />
        </div>

        {/* Coluna Lateral: Histórico e Contexto */}
        <div className="space-y-6">
          <ChangeLog logs={mockChangeLog} />
          
          {/* Summary Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200/50">
            <CardContent className="p-4">
              <h3 className="font-bold text-purple-900 mb-2">📊 Resumo Rápido</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Persona:</span> CEO Startup Tech, 35-45 anos</div>
                <div><span className="font-medium">Dor Principal:</span> Gerar leads qualificados</div>
                <div><span className="font-medium">Claim Top:</span> ROI em 90 dias</div>
                <div><span className="font-medium">Última Mudança:</span> {mockChangeLog[0].change}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}