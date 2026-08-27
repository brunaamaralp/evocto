import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  Lightbulb, 
  BookOpen, 
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
  Users,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

/**
 * Sistema de Microtextos Educativos
 */
export default function EducationalMicrotexts() {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(null);

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* KPIs Educativos */}
      <EducationalKPISection 
        expandedItems={expandedItems}
        onToggle={toggleExpanded}
        activeTooltip={activeTooltip}
        setActiveTooltip={setActiveTooltip}
      />

      {/* Fases do Projeto */}
      <EducationalPhasesSection 
        expandedItems={expandedItems}
        onToggle={toggleExpanded}
      />

      {/* Termos Técnicos */}
      <EducationalTermsSection 
        expandedItems={expandedItems}
        onToggle={toggleExpanded}
      />

      {/* Dicas e Insights */}
      <EducationalTipsSection />
    </div>
  );
}

/**
 * Seção Educativa de KPIs
 */
function EducationalKPISection({ expandedItems, onToggle, activeTooltip, setActiveTooltip }) {
  const kpiDefinitions = [
    {
      id: 'receita_mensal',
      name: 'Receita Mensal',
      icon: DollarSign,
      shortDescription: 'Total de vendas realizadas no mês',
      fullDescription: 'A receita mensal representa todo o dinheiro que sua empresa recebeu através de vendas de produtos ou serviços em um mês específico. É o valor bruto antes de descontar custos e despesas.',
      whyImportant: 'A receita é o ponto de partida para calcular a lucratividade. Sem receita, não há negócio.',
      howToImprove: 'Para aumentar a receita: melhore a qualidade dos produtos, invista em marketing, expanda para novos mercados ou aumente os preços.',
      examples: [
        'Loja que vendeu R$ 50.000 em produtos no mês',
        'Agência que faturou R$ 30.000 em serviços',
        'Restaurante com R$ 80.000 em vendas mensais'
      ],
      target: 'Crescer 10-15% ao mês é um bom objetivo',
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 'margem_percent',
      name: 'Margem de Lucro',
      icon: Percent,
      shortDescription: 'Percentual de lucro sobre as vendas',
      fullDescription: 'A margem de lucro mostra quanto você ganha de cada real vendido, após descontar todos os custos. É calculada dividindo o lucro pela receita e multiplicando por 100.',
      whyImportant: 'Uma margem saudável garante que você tenha dinheiro para investir e crescer.',
      howToImprove: 'Para melhorar a margem: reduza custos desnecessários, aumente preços estrategicamente, melhore a eficiência operacional.',
      examples: [
        'Margem de 20% = R$ 0,20 de lucro para cada R$ 1,00 vendido',
        'Margem de 15% = R$ 0,15 de lucro para cada R$ 1,00 vendido',
        'Margem de 25% = R$ 0,25 de lucro para cada R$ 1,00 vendido'
      ],
      target: 'Margem entre 15-25% é considerada saudável',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'fluxo_saldo',
      name: 'Fluxo de Caixa',
      icon: TrendingUp,
      shortDescription: 'Dinheiro disponível em caixa',
      fullDescription: 'O fluxo de caixa é o dinheiro que entra e sai da sua empresa. Um saldo positivo significa que você tem mais dinheiro entrando do que saindo.',
      whyImportant: 'Sem fluxo de caixa positivo, você não consegue pagar fornecedores, funcionários ou investir no crescimento.',
      howToImprove: 'Para melhorar o fluxo: acelere recebimentos, negocie prazos com fornecedores, controle gastos desnecessários.',
      examples: [
        'Saldo positivo de R$ 10.000 = empresa tem dinheiro para operar',
        'Saldo negativo de R$ 5.000 = empresa está gastando mais do que recebe',
        'Saldo zero = empresa está no limite'
      ],
      target: 'Manter saldo positivo suficiente para 3 meses de operação',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: 'inadimplencia_percent',
      name: 'Inadimplência',
      icon: AlertCircle,
      shortDescription: 'Percentual de clientes que não pagam',
      fullDescription: 'A inadimplência mostra quantos clientes não pagaram suas contas em dia. É calculada dividindo o valor em atraso pelo total de vendas.',
      whyImportant: 'Inadimplência alta significa que você está trabalhando sem receber o dinheiro.',
      howToImprove: 'Para reduzir inadimplência: melhore a análise de crédito, ofereça descontos para pagamento à vista, tenha políticas claras de cobrança.',
      examples: [
        'Inadimplência de 5% = R$ 5.000 em atraso para cada R$ 100.000 vendidos',
        'Inadimplência de 10% = R$ 10.000 em atraso para cada R$ 100.000 vendidos',
        'Inadimplência de 2% = R$ 2.000 em atraso para cada R$ 100.000 vendidos'
      ],
      target: 'Manter inadimplência abaixo de 5%',
      color: 'text-red-600 bg-red-100'
    },
    {
      id: 'ciclo_caixa_dias',
      name: 'Ciclo de Caixa',
      icon: Clock,
      shortDescription: 'Tempo para receber o dinheiro das vendas',
      fullDescription: 'O ciclo de caixa mostra quantos dias você leva para receber o dinheiro após fazer uma venda. Quanto menor, melhor para seu fluxo de caixa.',
      whyImportant: 'Ciclo longo significa que você precisa de mais capital de giro para operar.',
      howToImprove: 'Para reduzir o ciclo: ofereça descontos para pagamento à vista, melhore a cobrança, negocie prazos com fornecedores.',
      examples: [
        'Ciclo de 30 dias = você recebe o dinheiro 30 dias após a venda',
        'Ciclo de 15 dias = você recebe o dinheiro 15 dias após a venda',
        'Ciclo de 45 dias = você recebe o dinheiro 45 dias após a venda'
      ],
      target: 'Ciclo entre 15-30 dias é ideal',
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: 'giro_estoque',
      name: 'Giro de Estoque',
      icon: BarChart3,
      shortDescription: 'Quantas vezes o estoque é renovado por ano',
      fullDescription: 'O giro de estoque mostra quantas vezes você vende todo seu estoque durante o ano. Quanto maior, melhor, pois significa que você não tem produtos parados.',
      whyImportant: 'Estoque parado significa dinheiro investido que não está gerando retorno.',
      howToImprove: 'Para aumentar o giro: melhore a previsão de vendas, reduza estoque desnecessário, negocie prazos menores com fornecedores.',
      examples: [
        'Giro de 6x = estoque é renovado 6 vezes por ano',
        'Giro de 12x = estoque é renovado 12 vezes por ano',
        'Giro de 4x = estoque é renovado 4 vezes por ano'
      ],
      target: 'Giro entre 6-12 vezes por ano é saudável',
      color: 'text-indigo-600 bg-indigo-100'
    }
  ];

  return (
    <Card className="bg-white border-0 shadow-lg">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Entenda Seus Indicadores Financeiros
          </h2>
          <p className="text-gray-600">
            Aprenda o que cada número significa para seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiDefinitions.map((kpi, index) => (
            <KPIEducationalCard 
              key={kpi.id} 
              kpi={kpi} 
              index={index}
              isExpanded={expandedItems.has(kpi.id)}
              onToggle={() => onToggle(kpi.id)}
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card Educativo de KPI
 */
function KPIEducationalCard({ kpi, index, isExpanded, onToggle, activeTooltip, setActiveTooltip }) {
  const IconComponent = kpi.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{kpi.name}</h3>
              <p className="text-sm text-gray-600">{kpi.shortDescription}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTooltip(activeTooltip === kpi.id ? null : kpi.id)}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-700 mb-4">
            {kpi.fullDescription}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className="w-full"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Menos Detalhes
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Mais Detalhes
              </>
            )}
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Por que é importante?
                    </h4>
                    <p className="text-gray-700">{kpi.whyImportant}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Como melhorar?
                    </h4>
                    <p className="text-gray-700">{kpi.howToImprove}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      Exemplos práticos:
                    </h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {kpi.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-1">Meta Ideal:</h4>
                    <p className="text-blue-800">{kpi.target}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tooltip */}
          <AnimatePresence>
            {activeTooltip === kpi.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute z-10 p-4 bg-white border border-gray-200 rounded-lg shadow-lg"
                style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}
              >
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Dica Rápida:</h4>
                    <p className="text-sm text-gray-700">{kpi.shortDescription}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTooltip(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Seção Educativa de Fases
 */
function EducationalPhasesSection({ expandedItems, onToggle }) {
  const phases = [
    {
      id: 'diagnostico',
      name: 'Diagnóstico',
      icon: FileText,
      description: 'Análise completa da situação atual do seu negócio',
      duration: '1-2 semanas',
      deliverables: ['Relatório de Diagnóstico', 'Análise de Mercado', 'Identificação de Oportunidades'],
      whatHappens: 'Coletamos dados sobre sua empresa, analisamos o mercado e identificamos pontos de melhoria.',
      whyImportant: 'Sem diagnóstico preciso, não sabemos por onde começar as melhorias.',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'planejamento',
      name: 'Planejamento',
      icon: Target,
      description: 'Criação do plano de ação para alcançar seus objetivos',
      duration: '1 semana',
      deliverables: ['Plano de Ação', 'Cronograma', 'Metas e KPIs'],
      whatHappens: 'Definimos estratégias, criamos cronogramas e estabelecemos metas claras.',
      whyImportant: 'Um bom plano é a base para o sucesso de qualquer projeto.',
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 'implementacao',
      name: 'Implementação',
      icon: TrendingUp,
      description: 'Execução das estratégias e mudanças planejadas',
      duration: '4-8 semanas',
      deliverables: ['Processos Implementados', 'Treinamentos', 'Acompanhamento'],
      whatHappens: 'Colocamos em prática todas as estratégias definidas no planejamento.',
      whyImportant: 'A implementação é onde as mudanças realmente acontecem.',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: 'monitoramento',
      name: 'Monitoramento',
      icon: BarChart3,
      description: 'Acompanhamento dos resultados e ajustes necessários',
      duration: 'Contínuo',
      deliverables: ['Relatórios Mensais', 'Análise de Resultados', 'Ajustes'],
      whatHappens: 'Monitoramos os resultados, analisamos o progresso e fazemos ajustes quando necessário.',
      whyImportant: 'O monitoramento garante que você continue evoluindo e alcançando seus objetivos.',
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  return (
    <Card className="bg-white border-0 shadow-lg">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Fases do Seu Projeto
          </h2>
          <p className="text-gray-600">
            Entenda cada etapa do processo com a agência
          </p>
        </div>

        <div className="space-y-6">
          {phases.map((phase, index) => (
            <PhaseEducationalCard 
              key={phase.id} 
              phase={phase} 
              index={index}
              isExpanded={expandedItems.has(phase.id)}
              onToggle={() => onToggle(phase.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card Educativo de Fase
 */
function PhaseEducationalCard({ phase, index, isExpanded, onToggle }) {
  const IconComponent = phase.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="p-6 bg-gray-50 rounded-lg border border-gray-200"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${phase.color}`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">{phase.name}</h3>
          <p className="text-gray-600">{phase.description}</p>
        </div>
        <Badge variant="outline">{phase.duration}</Badge>
      </div>

      <div className="mb-4">
        <p className="text-gray-700">{phase.whatHappens}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="w-full"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-2" />
            Menos Detalhes
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            Mais Detalhes
          </>
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  O que você receberá:
                </h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {phase.deliverables.map((deliverable, i) => (
                    <li key={i}>{deliverable}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">Por que é importante:</h4>
                <p className="text-blue-800">{phase.whyImportant}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Seção de Termos Técnicos
 */
function EducationalTermsSection({ expandedItems, onToggle }) {
  const terms = [
    {
      id: 'kpi',
      term: 'KPI',
      fullName: 'Key Performance Indicator',
      description: 'Indicador-chave de performance que mostra se você está atingindo seus objetivos',
      example: 'Receita mensal, margem de lucro, número de clientes'
    },
    {
      id: 'roi',
      term: 'ROI',
      fullName: 'Return on Investment',
      description: 'Retorno sobre investimento - quanto você ganha para cada real investido',
      example: 'ROI de 200% significa que você ganha R$ 2,00 para cada R$ 1,00 investido'
    },
    {
      id: 'cac',
      term: 'CAC',
      fullName: 'Customer Acquisition Cost',
      description: 'Custo de aquisição de cliente - quanto você gasta para conquistar um novo cliente',
      example: 'CAC de R$ 100 significa que você gasta R$ 100 para cada novo cliente'
    },
    {
      id: 'ltv',
      term: 'LTV',
      fullName: 'Lifetime Value',
      description: 'Valor vitalício do cliente - quanto um cliente gasta com você ao longo do tempo',
      example: 'LTV de R$ 1.000 significa que cada cliente gasta R$ 1.000 com você ao longo do tempo'
    }
  ];

  return (
    <Card className="bg-white border-0 shadow-lg">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Glossário de Termos
          </h2>
          <p className="text-gray-600">
            Entenda os termos técnicos que usamos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {terms.map((term, index) => (
            <TermCard 
              key={term.id} 
              term={term} 
              index={index}
              isExpanded={expandedItems.has(term.id)}
              onToggle={() => onToggle(term.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card de Termo
 */
function TermCard({ term, index, isExpanded, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{term.term}</h3>
          <p className="text-sm text-gray-600">{term.fullName}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      <p className="text-sm text-gray-700 mb-2">{term.description}</p>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-2 border-t border-gray-200"
          >
            <div className="text-sm text-gray-600">
              <strong>Exemplo:</strong> {term.example}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Seção de Dicas e Insights
 */
function EducationalTipsSection() {
  const tips = [
    {
      icon: Lightbulb,
      title: 'Dica de Ouro',
      content: 'Foque em melhorar um KPI por vez. Tentar melhorar tudo ao mesmo tempo pode ser contraproducente.',
      color: 'text-yellow-600 bg-yellow-100'
    },
    {
      icon: Target,
      title: 'Meta Realista',
      content: 'Estabeleça metas desafiadoras, mas alcançáveis. Metas impossíveis desmotivam a equipe.',
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: TrendingUp,
      title: 'Crescimento Sustentável',
      content: 'É melhor crescer 5% consistentemente do que 20% um mês e -10% no outro.',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Users,
      title: 'Equipe Engajada',
      content: 'Funcionários felizes produzem mais. Invista no bem-estar da sua equipe.',
      color: 'text-purple-600 bg-purple-100'
    }
  ];

  return (
    <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-0 shadow-lg">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            💡 Dicas para o Sucesso
          </h2>
          <p className="text-gray-600">
            Insights valiosos para impulsionar seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="p-6 bg-white rounded-lg shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tip.color}`}>
                  <tip.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{tip.title}</h3>
                  <p className="text-gray-700">{tip.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

