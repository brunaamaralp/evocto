import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, User, CheckCircle, AlertCircle, PlayCircle,
  PauseCircle, XCircle, Edit3, UserPlus, MessageSquare,
  Paperclip, Calendar, ArrowRight
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_TYPES = {
  status_change: {
    icon: ArrowRight,
    label: 'Mudança de Status',
    color: 'bg-blue-100 text-blue-700'
  },
  assignment: {
    icon: UserPlus,
    label: 'Atribuição',
    color: 'bg-green-100 text-green-700'
  },
  comment: {
    icon: MessageSquare,
    label: 'Comentário',
    color: 'bg-gray-100 text-gray-700'
  },
  attachment: {
    icon: Paperclip,
    label: 'Anexo',
    color: 'bg-purple-100 text-purple-700'
  },
  due_date_change: {
    icon: Calendar,
    label: 'Prazo Alterado',
    color: 'bg-orange-100 text-orange-700'
  },
  progress_update: {
    icon: CheckCircle,
    label: 'Progresso',
    color: 'bg-teal-100 text-teal-700'
  }
};

const STATUS_ICONS = {
  todo: PlayCircle,
  in_progress: PlayCircle,
  in_review: AlertCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  blocked: AlertCircle
};

const STATUS_COLORS = {
  todo: 'text-gray-500',
  in_progress: 'text-blue-500',
  in_review: 'text-purple-500',
  completed: 'text-green-500',
  cancelled: 'text-red-500',
  blocked: 'text-orange-500'
};

export default function TaskHistory({ task }) {
  // Construir timeline de eventos
  const buildTimeline = () => {
    const events = [];

    // Evento de criação
    events.push({
      id: 'created',
      type: 'creation',
      timestamp: task.created_date,
      actor: task.created_by,
      actorName: 'Sistema',
      description: 'Tarefa criada',
      icon: PlayCircle,
      color: 'bg-green-100 text-green-700'
    });

    // Eventos de mudança de status
    if (task.statusHistory) {
      task.statusHistory.forEach((status, index) => {
        const StatusIcon = STATUS_ICONS[status.status] || ArrowRight;
        events.push({
          id: `status_${index}`,
          type: 'status_change',
          timestamp: status.changedAt,
          actor: status.changedBy,
          actorName: status.changedByName,
          description: `Status alterado para "${status.status}"`,
          previousValue: status.previousStatus,
          newValue: status.status,
          reason: status.reason,
          icon: StatusIcon,
          color: STATUS_COLORS[status.status] || 'text-gray-500',
          metadata: status
        });
      });
    }

    // Eventos de atribuição (inferidos das mudanças)
    if (task.assignedTo && task.assignedBy && task.assignedTo !== task.created_by) {
      events.push({
        id: 'assignment',
        type: 'assignment',
        timestamp: task.updated_date, // Aproximação
        actor: task.assignedBy,
        actorName: 'Atribuidor',
        description: `Tarefa atribuída para usuário`,
        icon: UserPlus,
        color: 'bg-green-100 text-green-700'
      });
    }

    // Eventos de comentários
    if (task.comments) {
      task.comments.forEach((comment, index) => {
        events.push({
          id: `comment_${index}`,
          type: 'comment',
          timestamp: comment.createdAt,
          actor: comment.userId,
          actorName: comment.userName,
          description: comment.type === 'comment' ? 
            `Adicionou comentário: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"` :
            comment.content,
          icon: MessageSquare,
          color: comment.type === 'system' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700',
          metadata: comment
        });
      });
    }

    // Eventos de anexos
    if (task.attachments) {
      task.attachments.forEach((attachment, index) => {
        events.push({
          id: `attachment_${index}`,
          type: 'attachment',
          timestamp: attachment.uploadedAt,
          actor: attachment.uploadedBy,
          actorName: attachment.uploadedByName,
          description: `Adicionou anexo: ${attachment.name}`,
          icon: Paperclip,
          color: attachment.isEvidence ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700',
          metadata: attachment
        });
      });
    }

    // Eventos de progresso (inferidos)
    if (task.progress > 0) {
      events.push({
        id: 'progress_update',
        type: 'progress_update',
        timestamp: task.updated_date,
        actor: task.assignedTo || task.created_by,
        actorName: 'Responsável',
        description: `Progresso atualizado para ${task.progress}%`,
        icon: CheckCircle,
        color: 'bg-teal-100 text-teal-700'
      });
    }

    // Ordenar por timestamp
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const timeline = buildTimeline();

  const getTimeFromNow = (timestamp) => {
    try {
      return formatDistance(new Date(timestamp), new Date(), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getActorInitials = (actorName) => {
    if (!actorName) return 'S';
    return actorName.split(' ').map(name => name.charAt(0)).join('').substring(0, 2);
  };

  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum histórico disponível</p>
            <p className="text-sm">O histórico aparecerá conforme a tarefa for atualizada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Histórico da Tarefa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((event, index) => {
            const IconComponent = event.icon;
            const isLast = index === timeline.length - 1;

            return (
              <div key={event.id} className="relative">
                <div className="flex gap-3">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.color} border-2 border-white shadow-sm`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {!isLast && (
                      <div className="absolute top-8 left-4 w-px h-6 bg-gray-200 -ml-px"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {getActorInitials(event.actorName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">
                        {event.actorName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getTimeFromNow(event.timestamp)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {EVENT_TYPES[event.type]?.label || event.type}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      {event.description}
                    </p>

                    {/* Detalhes específicos do evento */}
                    {event.type === 'status_change' && event.previousValue && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <span className="font-medium">De:</span> {event.previousValue} 
                        <span className="mx-2">→</span> 
                        <span className="font-medium">Para:</span> {event.newValue}
                        {event.reason && (
                          <div className="mt-1">
                            <span className="font-medium">Motivo:</span> {event.reason}
                          </div>
                        )}
                      </div>
                    )}

                    {event.type === 'attachment' && event.metadata && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <div>
                          <span className="font-medium">Tipo:</span> {event.metadata.type}
                          {event.metadata.isEvidence && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Evidência
                            </Badge>
                          )}
                        </div>
                        {event.metadata.description && (
                          <div className="mt-1">
                            <span className="font-medium">Descrição:</span> {event.metadata.description}
                          </div>
                        )}
                      </div>
                    )}

                    {event.type === 'comment' && event.metadata?.type === 'comment' && (
                      <div className="text-xs text-gray-600 bg-blue-50 rounded p-2 italic">
                        "{event.metadata.content.substring(0, 100)}{event.metadata.content.length > 100 ? '...' : ''}"
                      </div>
                    )}
                  </div>
                </div>

                {index < timeline.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </div>

        {/* Estatísticas do Histórico */}
        <Card className="mt-6 bg-gray-50">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Resumo da Atividade</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-blue-600">
                  {timeline.filter(e => e.type === 'status_change').length}
                </p>
                <p className="text-xs text-gray-600">Mudanças de Status</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">
                  {timeline.filter(e => e.type === 'comment').length}
                </p>
                <p className="text-xs text-gray-600">Comentários</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">
                  {timeline.filter(e => e.type === 'attachment').length}
                </p>
                <p className="text-xs text-gray-600">Anexos</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-600">
                  {task.estimatedHours || 0}h
                </p>
                <p className="text-xs text-gray-600">Estimativa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}