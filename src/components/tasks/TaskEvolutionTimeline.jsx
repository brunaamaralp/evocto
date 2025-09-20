import React, { useState, useEffect, useCallback } from 'react';
import { Task, EvolutionEvent, Client, CyclePlan } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, CheckCircle, Play, Target, Clock,
  TrendingUp, Award, Sparkles, ChevronDown, ChevronRight,
  User, MessageCircle, FileText, Eye, Lightbulb,
  Activity, BarChart3, Zap, AlertTriangle
} from 'lucide-react';
import { format, parseISO, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// Mapeamento de ícones para tipos de evento
const getEventIcon = (type, category) => {
  const iconMap = {
    // Eventos de tarefas
    'task_completed': <CheckCircle className="w-4 h-4 text-green-500" />,
    'task_started': <Play className="w-4 h-4 text-blue-500" />,
    'task_approved': <CheckCircle className="w-4 h-4 text-green-600" />,
    'task_overdue': <AlertTriangle className="w-4 h-4 text-red-500" />,
    
    // Eventos de ciclo
    'cycle_started': <Target className="w-4 h-4 text-purple-500" />,
    'cycle_completed': <Award className="w-4 h-4 text-green-600" />,
    'plan_approved': <CheckCircle className="w-4 h-4 text-blue-600" />,
    
    // Eventos de aprendizado
    'learning_applied': <Lightbulb className="w-4 h-4 text-yellow-500" />,
    'milestone_achieved': <Sparkles className="w-4 h-4 text-purple-600" />,
    
    // Eventos de resultado
    'result_outlier': <TrendingUp className="w-4 h-4 text-orange-500" />,
    'performance_improvement': <BarChart3 className="w-4 h-4 text-green-500" />
  };

  return iconMap[type] || <Clock className="w-4 h-4 text-gray-400" />;
};

// Componente de evento da timeline
const TimelineEvent = ({ event, isLast, showDetails = false }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getEventColor = (type, impact) => {
    if (impact === 'high') return 'border-green-400 bg-green-50';
    if (impact === 'medium') return 'border-blue-400 bg-blue-50';
    if (type.includes('overdue') || type.includes('bottleneck')) return 'border-red-400 bg-red-50';
    return 'border-gray-300 bg-white';
  };

  const getEventPriority = (event) => {
    if (event.impact === 'high') return { label: 'Alto Impacto', color: 'bg-green-100 text-green-700' };
    if (event.impact === 'medium') return { label: 'Médio Impacto', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Baixo Impacto', color: 'bg-gray-100 text-gray-700' };
  };

  const priority = getEventPriority(event);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex gap-4 pb-6"
    >
      {/* Linha vertical da timeline */}
      {!isLast && (
        <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200" />
      )}
      
      {/* Ícone do evento */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm ${getEventColor(event.type, event.impact)}`}>
          {getEventIcon(event.type)}
        </div>
      </div>

      {/* Conteúdo do evento */}
      <div className="flex-1 min-w-0">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {event.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {event.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {isToday(parseISO(event.date)) 
                      ? 'Hoje' 
                      : format(parseISO(event.date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
                    }
                  </span>
                  {event.authored_by === 'ai' && (
                    <>
                      <span>•</span>
                      <Zap className="w-3 h-3" />
                      <span>IA</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={`${priority.color} text-xs`}>
                  {priority.label}
                </Badge>
                {event.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(event.confidence * 100)}% confiança
                  </Badge>
                )}
              </div>
            </div>

            {/* Métricas do evento */}
            {event.metrics && Object.keys(event.metrics).length > 0 && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(event.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                      <span className="font-medium">{typeof value === 'number' ? value : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links e referências */}
            {event.links && Object.keys(event.links).length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(event.links).map(([type, id]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Detalhes expandíveis */}
            {showDetails && event.source && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="text-gray-500 p-0 h-auto text-xs mb-2"
                >
                  {expanded ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  Ver detalhes da fonte
                </Button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-3 bg-blue-50 rounded-lg text-xs"
                    >
                      <div className="mb-2">
                        <span className="font-medium text-blue-900">Fonte: </span>
                        <span className="text-blue-700">{event.source.kind}</span>
                      </div>
                      
                      {event.source.snippets && event.source.snippets.length > 0 && (
                        <div className="mb-2">
                          <span className="font-medium text-blue-900">Evidências:</span>
                          <ul className="mt-1 space-y-1">
                            {event.source.snippets.map((snippet, i) => (
                              <li key={i} className="text-blue-700 italic">
                                "...{snippet}..."
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {event.source.refId && (
                        <div>
                          <span className="font-medium text-blue-900">Referência: </span>
                          <span className="text-blue-700 font-mono">{event.source.refId}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

// Agrupamento por período
const TimelinePeriod = ({ period, events, periodLabel }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="p-0 h-auto font-semibold text-gray-900"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 mr-2" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-2" />
          )}
          {periodLabel}
        </Button>
        <Badge className="bg-blue-100 text-blue-700 text-xs">
          {events.length} eventos
        </Badge>
        
        {events.some(e => e.impact === 'high') && (
          <Badge className="bg-green-100 text-green-700 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Alto impacto
          </Badge>
        )}
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {events.map((event, index) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
                showDetails={true}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente principal da timeline de evolução de tarefas
export const TaskEvolutionTimeline = ({ 
  clientId = null, 
  cycleId = null, 
  serviceId = null,
  limit = 50 
}) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'tasks', 'cycles', 'learnings', 'high_impact'

  // Carregar eventos de evolução
  const loadEvolutionEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Carregar eventos de evolução existentes
      const evolutionFilters = {};
      if (clientId) evolutionFilters.clientId = clientId;
      if (cycleId) evolutionFilters.cycleId = cycleId;
      if (serviceId) evolutionFilters.serviceId = serviceId;

      const evolutionEvents = await EvolutionEvent.filter(
        evolutionFilters, 
        '-date', 
        Math.floor(limit / 2)
      );

      // Carregar tarefas recentes e converter em eventos
      const taskFilters = {};
      if (clientId) taskFilters.clientId = clientId;
      if (cycleId) taskFilters.cycleId = cycleId;
      if (serviceId) taskFilters.serviceId = serviceId;

      const tasks = await Task.filter(taskFilters, '-updated_date', Math.floor(limit / 2));
      
      // Converter tarefas em eventos de timeline
      const taskEvents = await Promise.all(
        tasks
          .filter(task => task.status === 'completed' || task.status === 'in_progress')
          .map(async (task) => {
            let client = null;
            if (task.clientId) {
              try {
                client = await Client.get(task.clientId);
              } catch (e) {
                console.warn('Cliente não encontrado:', task.clientId);
              }
            }

            return {
              id: `task_${task.id}`,
              type: task.status === 'completed' ? 'task_completed' : 'task_started',
              title: task.status === 'completed' 
                ? `Tarefa concluída: ${task.title}`
                : `Tarefa iniciada: ${task.title}`,
              description: task.description || `${task.type} - ${client?.name || 'Cliente'}`,
              date: task.status === 'completed' ? task.completedAt || task.updated_date : task.created_date,
              impact: task.priority === 'urgent' ? 'high' : task.priority === 'high' ? 'medium' : 'low',
              confidence: 0.8,
              authored_by: 'user',
              source: {
                kind: 'task_execution',
                refId: task.id
              },
              metrics: {
                progress: task.progress || 0,
                estimatedHours: task.estimatedHours || 0,
                actualHours: task.actualHours || 0,
                priority: task.priority
              },
              links: {
                taskId: task.id, 
                clientId: task.clientId
              }
            };
          })
      );

      // Combinar eventos e ordenar por data
      let allEvents = [...evolutionEvents, ...taskEvents]
        .filter(event => event.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Aplicar filtros
      if (filter !== 'all') {
        allEvents = allEvents.filter(event => {
          switch (filter) {
            case 'tasks':
              return event.type.startsWith('task_');
            case 'cycles':
              return event.type.includes('cycle_') || event.type.includes('plan_');
            case 'learnings':
              return event.type.includes('learning_');
            case 'high_impact':
              return event.impact === 'high';
            default:
              return true;
          }
        });
      }

      setEvents(allEvents);

    } catch (error) {
      console.error('Erro ao carregar timeline de evolução:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, cycleId, serviceId, limit, filter]);

  useEffect(() => {
    loadEvolutionEvents();
  }, [loadEvolutionEvents]);

  // Agrupar eventos por mês
  const eventsByMonth = events.reduce((groups, event) => {
    const eventDate = parseISO(event.date);
    const monthKey = format(eventDate, 'yyyy-MM');
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        month: eventDate,
        events: []
      };
    }
    
    groups[monthKey].events.push(event);
    return groups;
  }, {});

  const monthGroups = Object.values(eventsByMonth)
    .sort((a, b) => new Date(b.month) - new Date(a.month));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Timeline de Evolução
          </CardTitle>
          
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'tasks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('tasks')}
            >
              Tarefas
            </Button>
            <Button
              variant={filter === 'cycles' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('cycles')}
            >
              Ciclos
            </Button>
            <Button
              variant={filter === 'learnings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('learnings')}
            >
              Aprendizados
            </Button>
            <Button
              variant={filter === 'high_impact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('high_impact')}
            >
              Alto Impacto
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-6">
            {monthGroups.map(({ month, events }) => (
              <TimelinePeriod
                key={format(month, 'yyyy-MM')}
                period={month}
                periodLabel={format(month, "MMMM 'de' yyyy", { locale: ptBR })}
                events={events}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum evento encontrado na timeline.</p>
            <p className="text-sm mt-1">
              Os eventos aparecerão conforme as tarefas e ciclos forem executados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskEvolutionTimeline;