import React, { useState, useEffect } from 'react';
import { LearningEntry, AuditLog } from '@/api/entities';
import { useAppContext } from '../components/context/ContextProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, LineChart } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import sub-components
import TimelineView from '../components/evolution/TimelineView';
import MetricsView from '../components/evolution/MetricsView';
import RecentLearnings from '../components/evolution/RecentLearnings';

export default function EvolutionPanel() {
  const { currentClient, currentProject, hasValidContext } = useAppContext();
  const [learnings, setLearnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasValidContext) {
      loadLearnings();
      
      AuditLog.create({
        agencyId: currentProject.agencyId,
        entity_type: 'Project',
        entity_id: currentProject.id,
        action: 'EVOLUTION_VIEWED',
        actor_id: 'current_user',
        meta_json: {
          projectId: currentProject.id,
          projectName: currentProject.title,
          clientId: currentClient.id,
          clientName: currentClient.name
        }
      });
    }
  }, [currentProject, currentClient, hasValidContext]);

  const loadLearnings = async () => {
    setLoading(true);
    try {
      const data = await LearningEntry.filter({ projectId: currentProject.id }, '-created_date');
      setLearnings(data);
    } catch (error) {
      console.error("Erro ao carregar aprendizados:", error);
      toast.error("Falha ao carregar a linha do tempo de aprendizados.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // This is a placeholder. PDF export of a complex dashboard is not supported.
    toast.info("A exportação do painel para PDF não é suportada nesta versão.");
    
    AuditLog.create({
      agencyId: currentProject.agencyId,
      entity_type: 'Project',
      entity_id: currentProject.id,
      action: 'EVOLUTION_EXPORTED',
      actor_id: 'current_user',
      meta_json: { status: 'attempted_not_supported' }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Painel de Evolução</h1>
          <p className="text-slate-600 mt-1">
            Cliente: <span className="font-medium">{currentClient?.name}</span> • Projeto: <span className="font-medium">{currentProject?.title}</span>
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline"
                onClick={handleExport}
                disabled={true} // Disabled as the feature is not supported
                aria-label="Exportar para PDF (desabilitado)"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Evolução (PDF)
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>A exportação deste painel para PDF não é suportada no momento.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="metrics">Métricas & Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <div className="grid lg:grid-cols-4 gap-6 items-start mt-4">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Linha do Tempo de Aprendizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <TimelineView learnings={learnings} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1 sticky top-24">
              <RecentLearnings learnings={learnings.slice(0, 3)} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="metrics">
           <div className="grid lg:grid-cols-4 gap-6 items-start mt-4">
            <div className="lg:col-span-3">
              <MetricsView learnings={learnings} />
            </div>
             <div className="lg:col-span-1 sticky top-24">
              <RecentLearnings learnings={learnings.slice(0, 3)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}