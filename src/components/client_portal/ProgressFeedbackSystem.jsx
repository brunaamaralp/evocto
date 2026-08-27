import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Calendar,
  FileText,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Star,
  Award,
  Zap
} from 'lucide-react';

/**
 * Sistema de Feedback Claro de Progresso
 */
export default function ProgressFeedbackSystem({ clientId, serviceId }) {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [clientId, serviceId]);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      // Simular carregamento de dados de progresso
      const mockData = {
        overallProgress: 68,
        phaseProgress: [
          { name: 'Diagnóstico', progress: 100, status: 'completed', deliverables: 3 },
          { name: 'Planejamento', progress: 85, status: 'in_progress', deliverables: 2 },
          { name: 'Implementação', progress: 45, status: 'in_progress', deliverables: 1 },
          { name: 'Monitoramento', progress: 0, status: 'pending', deliverables: 0 }
        ],
        deliverables: [
          { name: 'Relatório de Diagnóstico', status: 'completed', completedAt: '2025-01-10' },
          { name: 'Plano de Ação', status: 'completed', completedAt: '2025-01-15' },
          { name: 'Análise de Mercado', status: 'completed', completedAt: '2025-01-12' },
          { name: 'Estratégia de Preços', status: 'in_progress', dueDate: '2025-01-25' },
          { name: 'Implementação de Processos', status: 'pending', dueDate: '2025-02-01' }
        ],
        nextSteps: [
          { title: 'Finalizar Estratégia de Preços', priority: 'alta', dueDate: '2025-01-25' },
          { title: 'Implementar Novos Processos', priority: 'média', dueDate: '2025-02-01' },
          { title: 'Treinamento da Equipe', priority: 'baixa', dueDate: '2025-02-05' }
        ],
        milestones: [
          { name: 'Diagnóstico Concluído', achieved: true, date: '2025-01-10' },
          { name: 'Plano Aprovado', achieved: true, date: '2025-01-15' },
          { name: 'Implementação Iniciada', achieved: false, date: '2025-02-01' },
          { name: 'Primeiros Resultados', achieved: false, date: '2025-03-01' }
        ]
      };
      
      setProgressData(mockData);
    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ProgressSkeleton />;
  }

  if (!progressData) {
    return <ProgressError />;
  }

  return (
    <div className="space-y-8">
      {/* Progresso Geral */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Progresso do Projeto
              </h2>
              <p className="text-gray-600">
                Acompanhe o andamento do seu projeto com a agência
              </p>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600"
                    strokeWidth="3"
                    strokeDasharray={`${progressData.overallProgress}, 100`}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">
                    {progressData.overallProgress}%
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {getProgressMessage(progressData.overallProgress)}
              </h3>
              <p className="text-gray-600">
                {getProgressDescription(progressData.overallProgress)}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progresso por Fase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 text-center">
              Progresso por Fase
            </CardTitle>
            <p className="text-gray-600 text-center">
              Veja o andamento de cada etapa do projeto
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {progressData.phaseProgress.map((phase, index) => (
                <PhaseProgressCard key={index} phase={phase} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Entregáveis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 text-center">
              Entregáveis
            </CardTitle>
            <p className="text-gray-600 text-center">
              Documentos e resultados que você receberá
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progressData.deliverables.map((deliverable, index) => (
                <DeliverableCard key={index} deliverable={deliverable} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Próximos Passos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 text-center flex items-center justify-center gap-2">
              <ArrowRight className="w-6 h-6 text-green-600" />
              Próximos Passos
            </CardTitle>
            <p className="text-gray-600 text-center">
              O que acontece agora no seu projeto
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.nextSteps.map((step, index) => (
                <NextStepCard key={index} step={step} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Marcos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 text-center">
              Marcos do Projeto
            </CardTitle>
            <p className="text-gray-600 text-center">
              Principais conquistas e objetivos
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.milestones.map((milestone, index) => (
                <MilestoneCard key={index} milestone={milestone} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  function getProgressMessage(progress) {
    if (progress >= 90) return '🎉 Quase Finalizado!';
    if (progress >= 70) return '🚀 Excelente Progresso!';
    if (progress >= 50) return '📈 Bom Andamento!';
    if (progress >= 30) return '🔄 Em Desenvolvimento';
    return '🚀 Iniciando';
  }

  function getProgressDescription(progress) {
    if (progress >= 90) return 'Seu projeto está quase completo. Os últimos detalhes estão sendo finalizados.';
    if (progress >= 70) return 'O projeto está avançando muito bem. Você já pode ver resultados significativos.';
    if (progress >= 50) return 'O projeto está na metade do caminho. Continue acompanhando o progresso.';
    if (progress >= 30) return 'O projeto está em desenvolvimento ativo. As primeiras entregas já foram feitas.';
    return 'O projeto está começando. Em breve você verá os primeiros resultados.';
  }
}

/**
 * Card de Progresso por Fase
 */
function PhaseProgressCard({ phase, index }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'in_progress': return 'Em Andamento';
      case 'pending': return 'Pendente';
      default: return 'Não Iniciada';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="p-6 bg-gray-50 rounded-lg border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(phase.status)}
          <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
        </div>
        <Badge className={getStatusColor(phase.status)}>
          {getStatusText(phase.status)}
        </Badge>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progresso</span>
          <span>{phase.progress}%</span>
        </div>
        <Progress value={phase.progress} className="h-2" />
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>Entregáveis: {phase.deliverables}</span>
        <span>
          {phase.status === 'completed' ? '✅ Concluída' : 
           phase.status === 'in_progress' ? '🔄 Em andamento' : 
           '⏳ Aguardando'}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Card de Entregável
 */
function DeliverableCard({ deliverable, index }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'border-green-200 bg-green-50';
      case 'in_progress': return 'border-blue-200 bg-blue-50';
      case 'pending': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Entregue';
      case 'in_progress': return 'Em Produção';
      case 'pending': return 'Pendente';
      default: return 'Não Iniciado';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`p-4 rounded-lg border-l-4 ${getStatusColor(deliverable.status)}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {getStatusIcon(deliverable.status)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{deliverable.name}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline" className="text-xs">
              {getStatusText(deliverable.status)}
            </Badge>
            {deliverable.completedAt && (
              <span className="text-green-600">
                ✅ {new Date(deliverable.completedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
            {deliverable.dueDate && !deliverable.completedAt && (
              <span className="text-blue-600">
                📅 {new Date(deliverable.dueDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Card de Próximo Passo
 */
function NextStepCard({ step, index }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return 'border-red-200 bg-red-50';
      case 'média': return 'border-yellow-200 bg-yellow-50';
      case 'baixa': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'alta': return <Zap className="w-4 h-4 text-red-600" />;
      case 'média': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'baixa': return <Calendar className="w-4 h-4 text-green-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`p-4 rounded-lg border-l-4 ${getPriorityColor(step.priority)}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {getPriorityIcon(step.priority)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{step.dueDate}</span>
            <Badge variant="outline" className="text-xs">
              {step.priority}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Card de Marco
 */
function MilestoneCard({ milestone, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        milestone.achieved ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {milestone.achieved ? (
          <Award className="w-6 h-6 text-green-600" />
        ) : (
          <Target className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
        <p className="text-sm text-gray-600">
          {milestone.achieved ? 
            `✅ Conquistado em ${new Date(milestone.date).toLocaleDateString('pt-BR')}` :
            `📅 Previsto para ${new Date(milestone.date).toLocaleDateString('pt-BR')}`
          }
        </p>
      </div>
      {milestone.achieved && (
        <Star className="w-5 h-5 text-yellow-500" />
      )}
    </motion.div>
  );
}

/**
 * Skeleton de Loading
 */
function ProgressSkeleton() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse">
        <div className="h-64 bg-gray-300 rounded-lg mb-8"></div>
        <div className="h-48 bg-gray-300 rounded-lg mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de Erro
 */
function ProgressError() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Erro ao Carregar Progresso
        </h2>
        <p className="text-gray-600 mb-4">
          Não foi possível carregar os dados de progresso.
        </p>
        <Button onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </CardContent>
    </Card>
  );
}

