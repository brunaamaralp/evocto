/**
 * 📊 Visualizador de Ajustes de Tarefas
 * 
 * Componente para visualizar ajustes aplicados às tarefas
 * Mostra diferenças entre template original e versão ajustada
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Plus, 
  FileText, 
  Target,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import { useTaskAdjustments } from '@/hooks/useTaskAdjustments';
import { Input } from '@/components/ui/input';

export default function TaskAdjustmentsViewer({ 
  servicoInstanciaId, 
  tasks = [],
  showStats = true 
}) {
  const {
    adjustments,
    isLoading,
    error,
    stats,
    getAdjustmentsByAction,
    getAdjustmentsForTask,
    hasAdjustments,
    totalAdjustments,
    prioritizeCount,
    deferCount,
    hideCount,
    addTaskCount,
    addSubtaskCount,
    addNoteCount,
    setMilestoneCount
  } = useTaskAdjustments(servicoInstanciaId);

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  // Filtrar ajustes
  const filteredAdjustments = adjustments.filter(adjustment => {
    const matchesSearch = !searchTerm || 
      adjustment.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adjustment.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAction === 'all' || adjustment.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });

  // Obter cor da ação
  const getActionColor = (action) => {
    const colors = {
      'PRIORITIZE': 'bg-red-100 text-red-800',
      'DEFER': 'bg-yellow-100 text-yellow-800',
      'HIDE': 'bg-gray-100 text-gray-800',
      'ADD_TASK': 'bg-green-100 text-green-800',
      'ADD_SUBTASK': 'bg-blue-100 text-blue-800',
      'ADD_NOTE': 'bg-purple-100 text-purple-800',
      'SET_MILESTONE': 'bg-orange-100 text-orange-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  // Obter ícone da ação
  const getActionIcon = (action) => {
    const icons = {
      'PRIORITIZE': ArrowUp,
      'DEFER': ArrowDown,
      'HIDE': EyeOff,
      'ADD_TASK': Plus,
      'ADD_SUBTASK': Plus,
      'ADD_NOTE': FileText,
      'SET_MILESTONE': Target
    };
    return icons[action] || Settings;
  };

  // Obter label da ação
  const getActionLabel = (action) => {
    const labels = {
      'PRIORITIZE': 'Priorizar',
      'DEFER': 'Adiar',
      'HIDE': 'Ocultar',
      'ADD_TASK': 'Adicionar Tarefa',
      'ADD_SUBTASK': 'Adicionar Subtarefa',
      'ADD_NOTE': 'Adicionar Nota',
      'SET_MILESTONE': 'Definir Marco'
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Settings className="w-6 h-6 animate-spin mr-2" />
            <span>Carregando ajustes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <Settings className="w-6 h-6 mx-auto mb-2" />
            <p>Erro ao carregar ajustes: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Ajustes de Tarefas
          <Badge variant="outline">{totalAdjustments}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            {showStats && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{prioritizeCount}</div>
                    <div className="text-sm text-gray-600">Priorizadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{deferCount}</div>
                    <div className="text-sm text-gray-600">Adiadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{addTaskCount}</div>
                    <div className="text-sm text-gray-600">Novas Tarefas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{addSubtaskCount}</div>
                    <div className="text-sm text-gray-600">Subtarefas</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Ação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats?.by_action || {}).map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {React.createElement(getActionIcon(action), { className: "w-4 h-4" })}
                          <span className="text-sm">{getActionLabel(action)}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Motivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats?.by_reason || {}).slice(0, 5).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between">
                        <span className="text-sm truncate">{reason}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ajustes */}
          <TabsContent value="adjustments" className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar ajustes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="PRIORITIZE">Priorizar</SelectItem>
                  <SelectItem value="DEFER">Adiar</SelectItem>
                  <SelectItem value="HIDE">Ocultar</SelectItem>
                  <SelectItem value="ADD_TASK">Adicionar Tarefa</SelectItem>
                  <SelectItem value="ADD_SUBTASK">Adicionar Subtarefa</SelectItem>
                  <SelectItem value="ADD_NOTE">Adicionar Nota</SelectItem>
                  <SelectItem value="SET_MILESTONE">Definir Marco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredAdjustments.map(adjustment => (
                <Card key={adjustment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2">
                          {React.createElement(getActionIcon(adjustment.action), { 
                            className: "w-4 h-4" 
                          })}
                          <Badge className={getActionColor(adjustment.action)}>
                            {getActionLabel(adjustment.action)}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{adjustment.reason}</p>
                          {adjustment.task_template_key && (
                            <p className="text-xs text-gray-500">
                              Tarefa: {adjustment.task_template_key}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(adjustment.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {adjustment.created_by}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredAdjustments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-8 h-8 mx-auto mb-2" />
                  <p>Nenhum ajuste encontrado</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tarefas */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="space-y-3">
              {tasks.map(task => {
                const taskAdjustments = getAdjustmentsForTask(task.id, task.template_key);
                const hasTaskAdjustments = hasAdjustments(task.id, task.template_key);

                return (
                  <Card key={task.id} className={hasTaskAdjustments ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            {hasTaskAdjustments && (
                              <Badge variant="outline" className="text-blue-600">
                                Ajustado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          
                          {taskAdjustments.length > 0 && (
                            <div className="space-y-1">
                              {taskAdjustments.map(adjustment => (
                                <div key={adjustment.id} className="flex items-center gap-2 text-xs">
                                  {React.createElement(getActionIcon(adjustment.action), { 
                                    className: "w-3 h-3" 
                                  })}
                                  <Badge 
                                    variant="outline" 
                                    className={getActionColor(adjustment.action)}
                                  >
                                    {getActionLabel(adjustment.action)}
                                  </Badge>
                                  <span className="text-gray-500">{adjustment.reason}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {task.priority && (
                            <Badge variant="outline">{task.priority}</Badge>
                          )}
                          {task.hidden && (
                            <Badge variant="outline" className="text-gray-600">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Oculto
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {tasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                  <p>Nenhuma tarefa encontrada</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

