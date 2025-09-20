import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  Flag,
  MessageSquare,
  Paperclip,
  CheckSquare
} from 'lucide-react';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const TYPE_COLORS = {
  analise_documentos: 'bg-purple-100 text-purple-800',
  coleta_dados: 'bg-green-100 text-green-800',
  analise_dados: 'bg-blue-100 text-blue-800',
  analise_financeira: 'bg-indigo-100 text-indigo-800',
  relatorio_financeiro: 'bg-cyan-100 text-cyan-800',
  reuniao_alinhamento: 'bg-pink-100 text-pink-800',
  planejamento_estrategico: 'bg-violet-100 text-violet-800',
  implementacao: 'bg-emerald-100 text-emerald-800',
  treinamento: 'bg-amber-100 text-amber-800',
  administrativo: 'bg-gray-100 text-gray-800',
  auditoria: 'bg-red-100 text-red-800',
  consultoria: 'bg-teal-100 text-teal-800'
};

export default function TaskCard({ task, users = [], onClick, isDragging = false }) {
  const assignedUser = users.find(u => u.id === task.assignedTo);
  
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(task);
    } else {
      // Fallback para abrir drawer global
      window.dispatchEvent(new CustomEvent('task:open', { 
        detail: { taskId: task.id } 
      }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const checklistProgress = task.checklist?.length > 0 ? 
    (task.checklist.filter(c => c.completed).length / task.checklist.length) * 100 : 0;

  return (
    <Card
      className={`mb-3 cursor-pointer transition-all hover:shadow-md select-none ${
        isDragging ? 'shadow-lg rotate-2 opacity-90' : ''
      } ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}
      onClick={handleClick}
    >
      {/* Header compacto */}
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-medium line-clamp-2 leading-tight">
          {task.title}
        </CardTitle>
      </CardHeader>

      {/* Content otimizado */}
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Descrição truncada */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Badges compactos */}
        <div className="flex flex-wrap gap-1">
          <Badge 
            variant="outline" 
            className={`text-xs px-2 py-0.5 ${PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-800'}`}
          >
            <Flag className="w-3 h-3 mr-1" />
            {task.priority || 'medium'}
          </Badge>
          
          {task.type && (
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-0.5 ${TYPE_COLORS[task.type] || 'bg-gray-100 text-gray-800'}`}
            >
              {task.type.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        {/* Metadados em linha */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {/* Data de vencimento */}
            {task.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="w-3 h-3" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}

            {/* Estimativa */}
            {task.estimatedHours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{task.estimatedHours}h</span>
              </div>
            )}
          </div>

          {/* Responsável */}
          {assignedUser && (
            <div className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-800">
                  {assignedUser.full_name?.charAt(0)?.toUpperCase() || 
                   assignedUser.email?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-16 truncate">
                {assignedUser.full_name?.split(' ')[0] || assignedUser.email?.split('@')[0]}
              </span>
            </div>
          )}
        </div>

        {/* Indicadores de atividade */}
        <div className="flex items-center justify-between">
          {/* Progresso da checklist */}
          {task.checklist?.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <CheckSquare className="w-3 h-3" />
              <div className="flex-1 bg-gray-200 rounded-full h-1 w-12">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
              <span className="text-muted-foreground min-w-0">
                {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
              </span>
            </div>
          )}

          {/* Indicadores de atividade */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
            
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}