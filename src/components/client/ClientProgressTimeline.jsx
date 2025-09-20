import React, { useState, useEffect, useCallback } from 'react';
import { Task, CyclePlan, EvolutionEvent } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Clock, Play, Target, Calendar,
  TrendingUp, Award, Sparkles, ChevronDown, ChevronRight,
  FileText, MessageCircle, Eye, ThumbsUp, AlertCircle
} from 'lucide-react';
import { format, parseISO, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// Ícones para diferentes tipos de eventos
const getEventIcon = (type, status) => {
  switch (type) {
    case 'task_completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'task_started':
      return <Play className="w-4 h-4 text-blue-500" />;
    case 'task_approved':
      return <ThumbsUp className="w-4 h-4 text-green-600" />;
    case 'cycle_started':
      return <Target className="w-4 h-4 text-purple-500" />;
    case 'cycle_completed':
      return <Award className="w-4 h-4 text-green-600" />;
    case 'milestone':
      return <Sparkles className="w-4 h-4 text-yellow-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

// Evento da timeline
const TimelineEvent = ({ event, isLast }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex gap-4 pb-6"
    >
      {/* Linha vertical */}
      {!isLast && (
        <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200" />
      )}
      
      {/* Ícone do evento */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-10 h-10 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center shadow-sm">
          {getEventIcon(event.type, event.status)}
        </div>
      </div>

      {/* Conteúdo do evento */}
      <div className="flex-1 min-w-0">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">
                  {event.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {format(parseISO(event.date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              
              {/* Status badge */}
              {event.status && (
                <Badge 
                  className={`text-xs ${
                    event.status === 'completed' ? 'bg-green-100 text-green-700' :
                    event.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {event.status === 'completed' ? 'Concluído' :
                   event.status === 'in_progress' ? 'Em Andamento' : 
                   'Pendente'}
                </Badge>
              )}
            </div>

            {/* Descrição */}
            <p className="text-sm text-gray-600 mb-3">
              {event.description}
            </p>

            {/* Detalhes expandíveis */}
            {event.details && Object.keys(event.details).length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="text-gray-500 p-0 h-auto text-xs"
                >
                  {expanded ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  Ver detalhes
                </Button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {event.details.progress && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">Progresso: </span>
                          <span className="text-xs font-medium">{event.details.progress}%</span>
                        </div>
                      )}
                      
                      {event.details.deliverables && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">Entregáveis: </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {event.details.deliverables.map((item, index) => (
                              <Badge key={index} className="bg-blue-100 text-blue-700 text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {event.details.feedback && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">Feedback: </span>
                          <p className="text-xs text-gray-700 mt-1 italic">
                            "{event.details.feedback}"
                          </p>
                        </div>
                      )}

                      {event.details.attachments && event.details.attachments.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-600">Anexos: </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {event.details.attachments.map((attachment, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6"
                                onClick={() => window.open(attachment.url, '_blank')}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                {attachment.name}
                              </Button>
                            ))}
                          </div>
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

// Agrupamento por mês
const TimelineMonth = ({ month, events }) => {
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
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </Button>
        <Badge className="bg-blue-100 text-blue-700 text-xs">
          {events.length} eventos
        </Badge>
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
                key={event.id || index}
                event={event}
                isLast={index === events.length - 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente principal da timeline
export const ClientProgressTimeline = ({ clientId, cycleId, limit = null }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'tasks', 'cycles', 'milestones'

  // Carregar eventos da timeline
  const loadTimelineEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {};
      if (clientId) filters.clientId = clientId;
      if (cycleId) filters.cycleId = cycleId;

      // Carregar tarefas e converter para eventos
      const tasks = await Task.filter(filters, '-updated_date', limit);
      const cycles = cycleId ? [await CyclePlan.get(cycleId)] : 
                    await CyclePlan.filter({ clientId }, '-updated_date', 5);

      // Converter tarefas para eventos de timeline
      const taskEvents = tasks.map(task => ({
        id: `task_${task.id}`,
        type: task.status === 'completed' ? 'task_completed' : 'task_started',
        status: task.status,
        title: task.title,
        description: task.description || `Tarefa ${task.type === 'creative' ? 'criativa' : 'operacional'}`,
        date: task.status === 'completed' ? task.completedAt : task.created_date,
        details: {
          progress: task.progress,
          deliverables: task.tags,
          feedback: task.comments?.[task.comments.length - 1]?.content,
          attachments: task.attachments
        }
      }));

      // Converter ciclos para eventos de timeline
      const cycleEvents = cycles.filter(cycle => cycle).map(cycle => ({
        id: `cycle_${cycle.id}`,
        type: cycle.status === 'completed' ? 'cycle_completed' : 'cycle_started',
        status: cycle.status,
        title: `Ciclo ${cycle.cyclePeriod}`,
        description: cycle.planData?.mudancaChave || 'Novo ciclo de planejamento iniciado',
        date: cycle.status === 'completed' ? cycle.updated_date : cycle.created_date,
        details: {
          deliverables: cycle.planData?.prioridades?.map(p => 
            typeof p === 'string' ? p : p.tarefa
          ).slice(0, 3),
          progress: cycle.status === 'completed' ? 100 : 
                   cycle.status === 'in_execution' ? 50 : 0
        }
      }));

      // Combinar e ordenar eventos por data
      let allEvents = [...taskEvents, ...cycleEvents]
        .filter(event => event.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Aplicar filtro
      if (filter !== 'all') {
        allEvents = allEvents.filter(event => {
          switch (filter) {
            case 'tasks':
              return event.type.startsWith('task_');
            case 'cycles':
              return event.type.startsWith('cycle_');
            case 'milestones':
              return event.type.includes('completed');
            default:
              return true;
          }
        });
      }

      setEvents(allEvents);

    } catch (error) {
      console.error('Erro ao carregar timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, cycleId, limit, filter]);

  useEffect(() => {
    loadTimelineEvents();
  }, [loadTimelineEvents]);

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
            <Calendar className="w-5 h-5 text-blue-600" />
            Timeline de Progresso
          </CardTitle>
          
          {/* Filtros */}
          <div className="flex gap-2">
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
              variant={filter === 'milestones' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('milestones')}
            >
              Marcos
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-6">
            {monthGroups.map(({ month, events }) => (
              <TimelineMonth
                key={format(month, 'yyyy-MM')}
                month={month}
                events={events}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum evento encontrado na timeline.</p>
            <p className="text-sm mt-1">
              Os eventos aparecerão conforme as tarefas forem executadas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientProgressTimeline;