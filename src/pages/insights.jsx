
import React, { useState, useEffect } from "react";
import { Insights, Brief, Project, Client, AuditLog, Job } from "@/api/entities"; // Added AuditLog, Job
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Lightbulb, Brain, BarChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSession } from "@/components/auth/SessionManager"; // Added import
import { toast } from 'sonner'; // Added for user feedback
import ContextLine from '../components/utils/ContextLine'; // Added ContextLine import

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewInsightDialog, setShowNewInsightDialog] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState("");
  const [isCreating, setIsCreating] = useState(false); // Added for loading state
  const navigate = useNavigate();
  const { agency, user } = useSession(); // Get user for audit log

  useEffect(() => {
    if (agency?.id) { // Check for agency context before loading
        loadData();
    }
  }, [agency?.id]);

  const loadData = async () => {
    setLoading(true);
    const agencyId = agency.id;
    try {
      const [insightsData, briefsData, projectsData, clientsDataUnsafe] = await Promise.all([
        Insights.filter({ agencyId }, "-created_date"),
        Brief.filter({ agencyId }),
        Project.filter({ agencyId }),
        Client.filter({ agencyId })
      ]);

      // Safeguard against RLS issues
      const clientsData = clientsDataUnsafe.filter(c => c.agency_id === agencyId);

      setInsights(insightsData);
      setBriefs(briefsData);
      setProjects(projectsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectInfo = (briefId) => {
    const brief = briefs.find(b => b.id === briefId);
    if (!brief) return { title: "Briefing não encontrado", clientName: "", projectId: null };
    
    const project = projects.find(p => p.id === brief.project_id);
    if (!project) return { title: "Projeto não encontrado", clientName: "", projectId: brief.project_id };
    
    const client = clients.find(c => c.id === project.client_id);
    return {
      title: project.title,
      clientName: client ? client.name : "Cliente desconhecido",
      projectId: project.id
    };
  };

  const handleCreateInsight = async () => {
    if (!selectedBrief || isCreating) return;
    
    setIsCreating(true);

    const idempotencyKey = `insight-gen-${selectedBrief}`;
    
    try {
      // 1. Verificar se já existe um Insight para este brief (ou se está sendo gerado)
      const [existingInsight] = await Insights.filter({ brief_id: selectedBrief });
      if (existingInsight) {
          toast.info("Insights já existem ou estão sendo gerados.", { description: "Redirecionando para o editor..." });
          navigate(createPageUrl(`InsightsEditor?id=${existingInsight.id}`));
          return;
      }
      
      // 2. Criar a entidade Insight com status 'generating'
      const brief = briefs.find(b => b.id === selectedBrief);
      const newInsight = await Insights.create({ 
        brief_id: selectedBrief, 
        project_id: brief.project_id,
        agency_id: agency.id,
        status: 'generating' // Set status to generating
      });
      
      // 3. Enfileirar o Job para processamento assíncrono
      await Job.create({
        agencyId: agency.id,
        idempotencyKey: idempotencyKey,
        type: 'generate_insights',
        payload: {
          insightId: newInsight.id,
          briefId: selectedBrief,
          agencyId: agency.id
        },
        processAt: new Date().toISOString()
      });

      await AuditLog.create({
          agency_id: agency.id,
          entity_type: 'Job',
          entity_id: idempotencyKey, // Use idempotencyKey as Job identifier in logs for easier tracking
          action: 'JOB_QUEUED',
          actor_id: user?.email || 'system',
          meta_json: { type: 'generate_insights', insightId: newInsight.id, brief_id: selectedBrief }
      });
      
      toast.success("Geração de insights iniciada!", { description: "Você será redirecionado para o editor, e os insights aparecerão em breve." });
      setShowNewInsightDialog(false);
      navigate(createPageUrl(`InsightsEditor?id=${newInsight.id}`));

    } catch (error) {
      console.error("Erro ao enfileirar geração de insights:", error);
      toast.error("Falha ao iniciar a geração de insights", { description: error.message });
    } finally {
        setIsCreating(false);
    }
  };
  
  // Only show briefs that have completion score > 50 and don't have insights yet
  const availableBriefs = briefs.filter(b => 
    (b.completion_score || 0) > 50 && 
    !insights.some(i => i.brief_id === b.id)
  );

  const filteredInsights = insights.filter(insight => {
    const projectInfo = getProjectInfo(insight.brief_id);
    return projectInfo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           projectInfo.clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const projectInfoForModal = selectedBrief ? getProjectInfo(selectedBrief) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Insights de Marketing</h1>
          <p className="text-slate-600 mt-1">Transforme briefings em insights estratégicos acionáveis.</p>
        </div>
        <Button 
          onClick={() => setShowNewInsightDialog(true)}
          className="bg-purple-600 hover:bg-purple-700 shadow-lg"
          disabled={availableBriefs.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Gerar Insights
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por projeto ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl shadow-lg p-6 space-y-4">
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="flex justify-between">
                <div className="h-6 bg-slate-200 rounded-full w-24"></div>
                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredInsights.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInsights.map(insight => {
            const projectInfo = getProjectInfo(insight.brief_id);
            const confidence = insight.confidence_score || 0;
            
            return (
              <Link to={createPageUrl(`InsightsEditor?id=${insight.id}`)} key={insight.id}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    className="bg-white rounded-xl shadow-lg p-6 space-y-4 h-full flex flex-col justify-between cursor-pointer border"
                >
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{projectInfo.title}</CardTitle>
                    <p className="text-sm text-slate-500">{projectInfo.clientName}</p>
                    
                    {insight.persona && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        Persona: {insight.persona.substring(0, 80)}...
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <Badge 
                      variant={insight.status === 'generating' ? 'secondary' : (confidence > 70 ? "default" : "secondary")} 
                      className={insight.status === 'generating' ? 'bg-orange-100 text-orange-700' : (confidence > 70 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700')}
                    >
                      {insight.status === 'generating' ? (
                        <>
                          <div className="w-3 h-3 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Brain className="w-3 h-3 mr-1.5" />
                          Confiança: {confidence}%
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      <BarChart className="w-3 h-3 mr-1.5" />
                      {new Date(insight.created_date).toLocaleDateString('pt-BR')}
                    </Badge>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-lg text-center p-12">
            <Lightbulb className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold">Nenhum insight encontrado</h3>
            <p className="text-slate-500 mt-2">Gere insights a partir de briefings com pontuação acima de 50%.</p>
        </Card>
      )}

      {/* New Insight Dialog */}
      <Dialog open={showNewInsightDialog} onOpenChange={setShowNewInsightDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Insights de Marketing</DialogTitle>
            <DialogDescription>
              Selecione um briefing para gerar insights estratégicos. Apenas briefings com pontuação acima de 50% são elegíveis.
            </DialogDescription>
          </DialogHeader>
          
          {projectInfoForModal && (
            <div className="pt-4">
              <ContextLine
                  context={`Briefing do Projeto: ${projectInfoForModal.title}`}
                  outcome="Serão gerados insights (persona, dores, tom de voz) para este briefing."
              />
            </div>
          )}

          <div className="py-4">
            <Select onValueChange={setSelectedBrief}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um briefing..." />
              </SelectTrigger>
              <SelectContent>
                {availableBriefs.map(brief => {
                  const projectInfo = getProjectInfo(brief.id);
                  return (
                    <SelectItem key={brief.id} value={brief.id}>
                      {projectInfo.title} - {projectInfo.clientName} (Score: {brief.completion_score || 0}%)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInsightDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateInsight} disabled={!selectedBrief || isCreating} className="bg-purple-600 hover:bg-purple-700 min-w-[140px]">
              {isCreating ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enfileirando...
                  </>
              ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2"/> Gerar Insights
                  </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
