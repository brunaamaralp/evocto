import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, Clock, Users, CheckSquare, AlertCircle, 
  PlayCircle, Calendar, Target, ArrowRight, Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { generateTasksFromCyclePlan } from '@/api/functions/generateTasksFromCyclePlan';
import { motion } from 'framer-motion';

// Componente para preview das tarefas que serão criadas
const TaskPreview = ({ priorities, cyclePeriod }) => {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Tarefas que serão criadas:</h4>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {priorities.map((prioridade, index) => {
          const title = typeof prioridade === 'string' ? prioridade : prioridade.tarefa || prioridade.title;
          const impact = prioridade.impacto || 'Médio';
          
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">Auto-gerada do plano</p>
              </div>
              <Badge 
                className={
                  impact === 'Alto' ? 'bg-red-100 text-red-700' :
                  impact === 'Baixo' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }
              >
                {impact === 'Alto' ? 'Alta' : impact === 'Baixo' ? 'Baixa' : 'Média'}
              </Badge>
            </div>
          );
        })}
      </div>
      
      <div className="pt-3 border-t border-gray-200">
        <h5 className="font-medium text-gray-900 mb-2">Tarefas de Milestone:</h5>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4" />
            <span>Kick-off do ciclo {cyclePeriod}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Review semanal</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            <span>Fechamento do ciclo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
export const TaskGenerationButton = ({ cyclePlan, onTasksGenerated }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  const planData = cyclePlan?.planData || cyclePlan?.snapshot_data;
  const priorities = planData?.prioridades || [];
  const canGenerate = cyclePlan?.status === 'approved' && priorities.length > 0;

  const handleGenerateTasks = async () => {
    try {
      setGenerating(true);
      
      const { data } = await generateTasksFromCyclePlan({
        cyclePlanId: cyclePlan.id,
        autoAssign: true
      });

      if (data.success) {
        setGenerationResult(data);
        toast.success(`${data.tasksCreated} tarefas criadas com sucesso!`);
        
        if (onTasksGenerated) {
          onTasksGenerated(data.tasks);
        }
      } else {
        throw new Error(data.error || 'Erro ao gerar tarefas');
      }
    } catch (error) {
      console.error('Erro ao gerar tarefas:', error);
      toast.error('Erro ao gerar tarefas: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!canGenerate) {
    return (
      <Button disabled variant="outline" className="gap-2">
        <AlertCircle className="w-4 h-4" />
        Plano deve estar aprovado
      </Button>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
      >
        <Zap className="w-4 h-4" />
        Gerar Tarefas Automaticamente
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Gerar Tarefas do Plano de Ciclo
            </DialogTitle>
            <DialogDescription>
              Converter automaticamente as prioridades do plano em tarefas organizadas com cronograma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!generationResult ? (
              <>
                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{priorities.length}</div>
                      <div className="text-sm text-gray-600">Prioridades</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{priorities.length + 3}</div>
                      <div className="text-sm text-gray-600">Tarefas Totais</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">30</div>
                      <div className="text-sm text-gray-600">Dias</div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Preview das tarefas */}
                <TaskPreview 
                  priorities={priorities} 
                  cyclePeriod={cyclePlan.cyclePeriod} 
                />

                <Separator />

                {/* Configurações */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Configurações:</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-green-600" />
                      <span>Atribuição automática para membros da equipe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Cronograma distribuído ao longo do ciclo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Notificações automáticas para responsáveis</span>
                    </div>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDialog(false)}
                    disabled={generating}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleGenerateTasks}
                    disabled={generating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando Tarefas...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Gerar {priorities.length + 3} Tarefas
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              /* Resultado da geração */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckSquare className="w-8 h-8 text-green-600" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Tarefas Criadas com Sucesso!
                  </h3>
                  <p className="text-gray-600">
                    {generationResult.tasksCreated} tarefas foram criadas e organizadas automaticamente
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-800">Status do Ciclo:</span>
                      <p className="text-green-600">Em Execução</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Próximo Passo:</span>
                      <p className="text-green-600">Kick-off da equipe</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                  >
                    Fechar
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowDialog(false);
                      window.open('/tasks-manager?cycle=' + cyclePlan.id, '_blank');
                    }}
                    className="gap-2"
                  >
                    Ver Tarefas
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskGenerationButton;