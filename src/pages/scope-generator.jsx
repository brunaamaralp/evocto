
import React, { useState, useEffect } from "react";
import { Scope, Brief, Project, Client, AuditLog, User } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Target, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthorization } from '../components/auth/useAuthorization';
import { useSession } from '../components/auth/SessionManager';
import { toast } from "sonner"; // Added toast import
import ContextLine from '../components/utils/ContextLine';

const briefValidatorPrompt = `
Você é um especialista em gestão de projetos de marketing. Valide se este briefing possui informações mínimas para gerar um escopo de campanha:

{briefing_content}

REGRAS DE VALIDAÇÃO (SEJA RIGOROSO):
1. **objetivo** (objectives): deve ter ao menos 8 caracteres.
2. **publicoAlvo** (target_audience): deve ter ao menos 8 palavras.  
3. **canais**: inferir dos campos business_context, additional_info ou competitors. O resultado inferido não pode estar vazio.
4. **orcamento** (budget_range): não pode estar vazio.
5. **diferenciais**: inferir do business_context ou competitors. Deve ter pelo menos 1 frase.

Para cada campo que falhar, adicione uma mensagem clara e orientativa na lista "messages".

Se qualquer campo falhar, isValid = false. Se tudo estiver correto, isValid = true e a lista de mensagens deve ser vazia.
`;

const validatorSchema = {
  type: "object",
  properties: {
    isValid: { type: "boolean" },
    missingFields: {
      type: "array", 
      items: { type: "string" }
    },
    messages: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["isValid", "missingFields", "messages"]
};

export default function ScopeGeneratorPage() {
  const [scopes, setScopes] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewScopeDialog, setShowNewScopeDialog] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState("");
  const [validationError, setValidationError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // Added for creation loading state
  const navigate = useNavigate();
  const { authorize, can, ROLES } = useAuthorization();
  const { agency, user } = useSession(); // Correctly get user from useSession

  useEffect(() => {
    const fetchData = async () => {
        if (!agency?.id) return; // Wait for agency context
        setLoading(true);
        const agencyId = agency.id;
        try {
            const [scopesData, briefsData, projectsData, clientsDataUnsafe] = await Promise.all([
                Scope.filter({ agencyId }, "-created_date"),
                Brief.filter({ agencyId }),
                Project.filter({ agencyId }),
                Client.filter({ agencyId }),
            ]);

            // Safeguard against RLS issues
            const clientsData = clientsDataUnsafe.filter(c => c.agencyId === agencyId);

            setScopes(scopesData);
            setBriefs(briefsData);
            setProjects(projectsData);
            setClients(clientsData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [agency?.id]);

  const getProjectInfo = (briefId) => {
    const brief = briefs.find(b => b.id === briefId);
    if (!brief) return { title: "Briefing não encontrado", clientName: "", projectId: null };
    
    const project = projects.find(p => p.id === brief.projectId);
    if (!project) return { title: "Projeto não encontrado", clientName: "", projectId: brief.projectId };
    
    const client = clients.find(c => c.id === project.client_id);
    return {
      title: project.title,
      clientName: client ? client.name : "Cliente desconhecido",
      projectId: project.id
    };
  };

  const validateBriefing = async (briefData) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const { id, projectId, agencyId, created_date, updated_date, created_by, gaps_identified, completion_score, ...briefContent } = briefData;
      
      const response = await InvokeLLM({
        prompt: briefValidatorPrompt.replace('{briefing_content}', JSON.stringify(briefContent, null, 2)),
        response_json_schema: validatorSchema
      });

      return {
        ...response,
        validation_date: new Date().toISOString(),
        bypassed: false
      };
    } catch (error) {
      console.error("Erro na validação:", error);
      // Fallback validation
      return {
        isValid: false,
        missingFields: ["sistema"],
        messages: ["Erro no sistema de validação. Tente novamente em alguns instantes."],
        validation_date: new Date().toISOString(),
        bypassed: false
      };
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateScope = async (bypassValidation = false) => {
    if (!authorize('scope:generate')) return;
    if (!selectedBrief || isCreating || isValidating) return; // Prevent double-click or concurrent operations
    
    setIsCreating(true); // Set creation loading state
    setValidationError(null); // Clear previous validation errors
    
    const briefData = briefs.find(b => b.id === selectedBrief);
    if (!briefData) {
        setIsCreating(false);
        toast.error("Briefing não encontrado", { description: "Por favor, selecione um briefing válido." });
        return;
    }

    // Check if scope for this brief already exists first to avoid unnecessary validation
    const existingScope = scopes.find(s => s.briefId === selectedBrief);
    if (existingScope) {
        toast.info("Escopo já existe.", { description: "Redirecionando para o editor..."});
        navigate(createPageUrl(`scope-editor?id=${existingScope.id}`));
        setIsCreating(false);
        return;
    }

    let validationResult = { isValid: true, bypassed: false };
    const idempotencyKey = `scope-gen-${selectedBrief}-${Date.now()}`;

    if (!bypassValidation) {
        validationResult = await validateBriefing(briefData);
        if (!validationResult.isValid) {
            setValidationError(validationResult);
            setIsCreating(false); // Stop loading on validation error
            return;
        }
    } else {
        // Validation bypassed by team member
        validationResult.isValid = true;
        validationResult.bypassed = true;
        validationResult.messages = ['Validação ignorada pela equipe.'];
        validationResult.validation_date = new Date().toISOString();
        
        if (user) {
            try {
                await AuditLog.create({
                    entity_type: 'Brief',
                    entity_id: briefData.id,
                    action: 'VALIDATION_BYPASSED',
                    actor_id: user?.email,
                    meta_json: { description: `Validação do briefing ignorada por ${user?.email}.`, idempotencyKey },
                    agencyId: agency.id // Ensure agencyId is set for audit log
                });
            } catch (auditError) {
                console.error("Erro ao registrar auditoria de bypass:", auditError);
                toast.error("Falha ao registrar auditoria de bypass.", { description: auditError.message });
            }
        }
    }

    try {
      const newScope = await Scope.create({ 
        briefId: selectedBrief, 
        projectId: briefData.projectId,
        agencyId: briefData.agencyId,
        validation_results: validationResult
      }, { idempotencyKey });

      await AuditLog.create({
          agencyId: agency.id,
          entity_type: 'Scope',
          entity_id: newScope.id,
          action: 'SCOPE_GENERATED', // Consistent event name
          actor_id: user?.email,
          meta_json: { brief_id: selectedBrief, bypass: bypassValidation, idempotencyKey }
      });
      setShowNewScopeDialog(false);
      setValidationError(null); // Clear error on successful creation
      navigate(createPageUrl(`scope-editor?id=${newScope.id}`));
      toast.success("Escopo criado com sucesso!", { description: "Redirecionando para o editor de escopo." });
    } catch (error) {
      console.error("Erro ao criar escopo:", error);
      toast.error("Falha ao criar escopo", { description: error.message });
    } finally {
        setIsCreating(false); // Reset loading state
    }
  };
  
  // Only show briefs that have completion score > 70
  const availableBriefs = briefs.filter(b => 
    (b.completion_score || 0) > 70 && 
    !scopes.some(s => s.briefId === b.id)
  );

  const filteredScopes = scopes.filter(scope => {
    const projectInfo = getProjectInfo(scope.briefId);
    return projectInfo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           projectInfo.clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const projectInfoForModal = selectedBrief ? getProjectInfo(selectedBrief) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gerador de Escopo</h1>
          <p className="text-slate-600 mt-1">Crie escopos detalhados baseados em briefings validados.</p>
        </div>
        <Button 
          onClick={() => setShowNewScopeDialog(true)}
          className="bg-green-600 hover:bg-green-700 shadow-lg"
          disabled={availableBriefs.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Gerar Escopo
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
      ) : filteredScopes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScopes.map(scope => {
            const projectInfo = getProjectInfo(scope.briefId);
            const confidence = scope.confidence_score || 0;
            
            return (
              <Link to={createPageUrl(`scope-editor?id=${scope.id}`)} key={scope.id}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    className="bg-white rounded-xl shadow-lg p-6 space-y-4 h-full flex flex-col justify-between cursor-pointer border"
                >
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{projectInfo.title}</CardTitle>
                    <p className="text-sm text-slate-500">{projectInfo.clientName}</p>
                    
                    {scope.in_scope && scope.in_scope.length > 0 && (
                      <p className="text-xs text-slate-600 mt-2">
                        {scope.in_scope.length} itens no escopo
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant={confidence > 80 ? "default" : "secondary"} className={confidence > 80 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                      <Target className="w-3 h-3 mr-1.5" />
                      Confiança: {confidence}%
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      {new Date(scope.created_date).toLocaleDateString('pt-BR')}
                    </Badge>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-lg text-center p-12">
            <Target className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold">Nenhum escopo encontrado</h3>
            <p className="text-slate-500 mt-2">Gere escopos a partir de briefings com pontuação acima de 70%.</p>
        </Card>
      )}

      {/* New Scope Dialog */}
      <Dialog open={showNewScopeDialog} onOpenChange={(open) => {
        setShowNewScopeDialog(open);
        if (!open) {
          setValidationError(null);
          setSelectedBrief(""); // Reset selected brief on close
          setIsValidating(false); // Ensure validation loading is reset
          setIsCreating(false); // Ensure creation loading is reset
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Escopo de Projeto</DialogTitle>
            <DialogDescription>
              Selecione um briefing para validar e gerar o escopo detalhado. Apenas briefings com pontuação acima de 70% são elegíveis.
            </DialogDescription>
          </DialogHeader>
          
          {projectInfoForModal && (
            <div className="pt-4">
                <ContextLine
                    context={`Projeto: ${projectInfoForModal.title} (${projectInfoForModal.clientName})`}
                    outcome="Será gerado um escopo detalhado (IN/OUT) para este projeto."
                />
            </div>
          )}
          
          {validationError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-red-800">Briefing incompleto para gerar escopo:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {validationError.messages.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-red-600 mt-3">
                    <strong>Ação:</strong> Volte ao briefing e preencha os campos faltantes ou, se for membro da equipe, ignore a validação.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="py-4">
            <Select onValueChange={setSelectedBrief} value={selectedBrief}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um briefing..." />
              </SelectTrigger>
              <SelectContent>
                {availableBriefs.length === 0 && (
                    <SelectItem value="no-briefs" disabled>
                        Nenhum briefing elegível disponível
                    </SelectItem>
                )}
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
          <DialogFooter className="sm:justify-between gap-2">
            <div>
              {can('admin:access') && (
                <Button 
                  variant="secondary"
                  onClick={() => handleCreateScope(true)}
                  disabled={!selectedBrief || isValidating || isCreating}
                >
                  Ignorar validação (modo equipe)
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowNewScopeDialog(false);
                setValidationError(null);
              }}>Cancelar</Button>
              <Button 
                onClick={() => handleCreateScope(false)} 
                disabled={!selectedBrief || isValidating || isCreating} 
                className="bg-green-600 hover:bg-green-700 min-w-[140px]"
              >
                {isValidating || isCreating ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isValidating ? 'Validando...' : 'Gerando...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2"/> 
                    Validar e Gerar
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
