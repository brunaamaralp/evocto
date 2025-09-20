/**
 * 🎨 Componente de Preview de Tarefas
 * 
 * Mostra preview das tarefas que serão geradas antes da ativação
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Users,
  FileText,
  Package,
  Play,
  Eye,
  Loader2
} from 'lucide-react';

interface TaskPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  service: any;
  deliverables: any[];
  isLoading?: boolean;
  validationResult?: {
    canActivate: boolean;
    errors: string[];
    warnings: string[];
  };
}

export function TaskPreview({
  isOpen,
  onClose,
  onConfirm,
  service,
  deliverables,
  isLoading = false,
  validationResult
}: TaskPreviewProps) {
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalHours, setTotalHours] = useState(0);

  // Calcular estatísticas das tarefas
  useEffect(() => {
    if (deliverables) {
      let tasks = 0;
      let hours = 0;

      deliverables.forEach(deliverable => {
        const taskTemplates = deliverable.task_templates || [];
        tasks += taskTemplates.length;
        
        taskTemplates.forEach(task => {
          hours += task.estimated_hours || 4;
        });
      });

      setTotalTasks(tasks);
      setTotalHours(hours);
    }
  }, [deliverables]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'analise_documentos': return <FileText className="w-4 h-4" />;
      case 'reuniao': return <Users className="w-4 h-4" />;
      case 'desenvolvimento': return <Package className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Preview das Tarefas
            <Badge variant="outline" className="text-xs">
              {service?.name}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Revise as tarefas que serão geradas antes de ativar o serviço
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {/* Validação */}
          {validationResult && (
            <div className="mb-6 space-y-3">
              {validationResult.errors.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>Erros encontrados:</strong>
                    <ul className="mt-2 list-disc list-inside">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.warnings.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <strong>Atenção:</strong>
                    <ul className="mt-2 list-disc list-inside">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
                <div className="text-sm text-gray-600">Tarefas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{totalHours}h</div>
                <div className="text-sm text-gray-600">Horas Estimadas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{deliverables.length}</div>
                <div className="text-sm text-gray-600">Deliverables</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Deliverables e Tarefas */}
          <div className="space-y-4">
            {deliverables.map((deliverable, dIndex) => (
              <Card key={deliverable.id || dIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    {deliverable.name}
                  </CardTitle>
                  {deliverable.description && (
                    <p className="text-sm text-gray-600">{deliverable.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {deliverable.task_templates && deliverable.task_templates.length > 0 ? (
                    <div className="space-y-3">
                      {deliverable.task_templates.map((task, tIndex) => (
                        <div key={task.id || tIndex} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getTypeIcon(task.type)}
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.estimated_hours || 4}h
                                </div>
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {task.checklist?.length || 0} itens
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Checklist Preview */}
                          {task.checklist && task.checklist.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-gray-700 mb-1">Checklist:</div>
                              <div className="space-y-1">
                                {task.checklist.slice(0, 3).map((item, cIndex) => (
                                  <div key={cIndex} className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                    <span className="text-gray-600">{item.text}</span>
                                    {item.required && (
                                      <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                                    )}
                                  </div>
                                ))}
                                {task.checklist.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{task.checklist.length - 3} itens adicionais
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                      <p>Nenhum template de tarefa encontrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {validationResult?.canActivate ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                Pronto para ativação
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Corrija os erros antes de continuar
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!validationResult?.canActivate || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Ativando...' : 'Ativar e Gerar Tarefas'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

