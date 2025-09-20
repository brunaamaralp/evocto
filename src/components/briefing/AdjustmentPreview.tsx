/**
 * 🎨 Componente de Preview de Ajustes de IA
 * 
 * Mostra preview dos ajustes que serão aplicados antes da confirmação
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
  Loader2,
  Bot,
  Settings,
  Target,
  Plus,
  ArrowUp,
  ArrowDown,
  EyeOff,
  StickyNote,
  Flag
} from 'lucide-react';

interface AdjustmentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (approvedAdjustments: any[]) => void;
  onReject: (rejectedAdjustments: any[]) => void;
  adjustments: any[];
  briefing: any;
  isLoading?: boolean;
}

export function AdjustmentPreview({
  isOpen,
  onClose,
  onApprove,
  onReject,
  adjustments,
  briefing,
  isLoading = false
}: AdjustmentPreviewProps) {
  const [selectedAdjustments, setSelectedAdjustments] = useState<Set<string>>(new Set());
  const [rejectedAdjustments, setRejectedAdjustments] = useState<Set<string>>(new Set());

  // Selecionar todos os ajustes por padrão
  useEffect(() => {
    if (adjustments.length > 0) {
      setSelectedAdjustments(new Set(adjustments.map(adj => adj.id)));
      setRejectedAdjustments(new Set());
    }
  }, [adjustments]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PRIORITIZE': return <ArrowUp className="w-4 h-4 text-orange-600" />;
      case 'DEFER': return <ArrowDown className="w-4 h-4 text-blue-600" />;
      case 'HIDE': return <EyeOff className="w-4 h-4 text-gray-600" />;
      case 'ADD_SUBTASK': return <Plus className="w-4 h-4 text-green-600" />;
      case 'ADD_TASK': return <Plus className="w-4 h-4 text-green-600" />;
      case 'ADD_NOTE': return <StickyNote className="w-4 h-4 text-yellow-600" />;
      case 'SET_MILESTONE': return <Flag className="w-4 h-4 text-purple-600" />;
      default: return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'PRIORITIZE': return 'bg-orange-100 text-orange-800';
      case 'DEFER': return 'bg-blue-100 text-blue-800';
      case 'HIDE': return 'bg-gray-100 text-gray-800';
      case 'ADD_SUBTASK': return 'bg-green-100 text-green-800';
      case 'ADD_TASK': return 'bg-green-100 text-green-800';
      case 'ADD_NOTE': return 'bg-yellow-100 text-yellow-800';
      case 'SET_MILESTONE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'PRIORITIZE': return 'Priorizar tarefa';
      case 'DEFER': return 'Adiar tarefa';
      case 'HIDE': return 'Ocultar tarefa';
      case 'ADD_SUBTASK': return 'Adicionar subtarefa';
      case 'ADD_TASK': return 'Adicionar nova tarefa';
      case 'ADD_NOTE': return 'Adicionar nota';
      case 'SET_MILESTONE': return 'Definir marco';
      default: return 'Ajuste personalizado';
    }
  };

  const handleToggleAdjustment = (adjustmentId: string) => {
    if (selectedAdjustments.has(adjustmentId)) {
      setSelectedAdjustments(prev => {
        const newSet = new Set(prev);
        newSet.delete(adjustmentId);
        return newSet;
      });
    } else {
      setSelectedAdjustments(prev => new Set([...prev, adjustmentId]));
    }
  };

  const handleRejectAdjustment = (adjustmentId: string) => {
    if (rejectedAdjustments.has(adjustmentId)) {
      setRejectedAdjustments(prev => {
        const newSet = new Set(prev);
        newSet.delete(adjustmentId);
        return newSet;
      });
    } else {
      setRejectedAdjustments(prev => new Set([...prev, adjustmentId]));
    }
  };

  const handleApprove = () => {
    const approvedAdjustments = adjustments.filter(adj => 
      selectedAdjustments.has(adj.id) && !rejectedAdjustments.has(adj.id)
    );
    onApprove(approvedAdjustments);
  };

  const handleReject = () => {
    const rejectedAdjustmentsList = adjustments.filter(adj => 
      rejectedAdjustments.has(adj.id)
    );
    onReject(rejectedAdjustmentsList);
  };

  const approvedCount = adjustments.filter(adj => 
    selectedAdjustments.has(adj.id) && !rejectedAdjustments.has(adj.id)
  ).length;

  const rejectedCount = adjustments.filter(adj => 
    rejectedAdjustments.has(adj.id)
  ).length;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Preview dos Ajustes de IA
            <Badge variant="outline" className="text-xs">
              {briefing?.servico_tipo?.replace('_', ' ')}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Revise os ajustes que serão aplicados às tarefas baseados no briefing
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{adjustments.length}</div>
                <div className="text-sm text-gray-600">Total de Ajustes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                <div className="text-sm text-gray-600">Aprovados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-sm text-gray-600">Rejeitados</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Ajustes */}
          <div className="space-y-4">
            {adjustments.map((adjustment, index) => {
              const isSelected = selectedAdjustments.has(adjustment.id);
              const isRejected = rejectedAdjustments.has(adjustment.id);
              
              return (
                <Card key={adjustment.id} className={`${isRejected ? 'opacity-50 bg-red-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected && !isRejected}
                            onChange={() => handleToggleAdjustment(adjustment.id)}
                            className="w-4 h-4"
                          />
                          {getActionIcon(adjustment.action)}
                          <CardTitle className="text-lg">
                            {getActionDescription(adjustment.action)}
                          </CardTitle>
                        </div>
                        <Badge className={getActionColor(adjustment.action)}>
                          {adjustment.action}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant={isRejected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleRejectAdjustment(adjustment.id)}
                          className={isRejected ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                          {isRejected ? "Rejeitado" : "Rejeitar"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {/* Razão */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Motivo:</h4>
                        <p className="text-sm text-gray-600">{adjustment.reason}</p>
                      </div>

                      {/* Tarefa Afetada */}
                      {adjustment.task_template_key && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Tarefa:</h4>
                          <Badge variant="outline" className="text-xs">
                            {adjustment.task_template_key}
                          </Badge>
                        </div>
                      )}

                      {/* Payload */}
                      {adjustment.payload && Object.keys(adjustment.payload).length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Detalhes:</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            <pre className="whitespace-pre-wrap text-gray-600">
                              {JSON.stringify(adjustment.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Metadados */}
                      {adjustment.metadata && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Metadados:</h4>
                          <div className="text-xs text-gray-500">
                            Regra: {adjustment.metadata.rule_index + 1}, 
                            Ação: {adjustment.metadata.action_index + 1}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Aviso se não há ajustes */}
          {adjustments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhum ajuste foi gerado para este briefing</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {approvedCount > 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                {approvedCount} ajuste{approvedCount !== 1 ? 's' : ''} será{approvedCount === 1 ? '' : 'ão'} aplicado{approvedCount === 1 ? '' : 's'}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <Info className="w-4 h-4" />
                Selecione ajustes para aplicar
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {rejectedCount > 0 && (
              <Button
                variant="outline"
                onClick={handleReject}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Rejeitar Selecionados
              </Button>
            )}
            <Button
              onClick={handleApprove}
              disabled={approvedCount === 0 || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Aplicando...' : `Aplicar ${approvedCount} Ajuste${approvedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

