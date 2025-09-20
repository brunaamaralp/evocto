
import React, { useState, useEffect } from 'react';
import { LearningEntry, AuditLog } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Users, 
  BarChart3, 
  MessageSquare, 
  PenTool,
  Lightbulb,
  Loader2,
  ArrowLeft,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../auth/SessionManager';
import { toast } from 'sonner';

const SOURCE_TYPES = [
  {
    id: 'briefing',
    title: 'Do Briefing Aprovado',
    description: 'Extrair aprendizado de um briefing/escopo aprovado pelo cliente',
    icon: FileText,
    color: 'bg-blue-500'
  },
  {
    id: 'meeting',
    title: 'De Reunião/Transcrição',
    description: 'Capturar insights de reuniões ou call com clientes',
    icon: Users,
    color: 'bg-green-500'
  },
  {
    id: 'execution',
    title: 'De Execução/Métricas',
    description: 'Documentar resultados de campanhas executadas',
    icon: BarChart3,
    color: 'bg-purple-500'
  },
  {
    id: 'feedback',
    title: 'De Feedback do Cliente',
    description: 'Registrar feedback específico recebido do cliente',
    icon: MessageSquare,
    color: 'bg-orange-500'
  },
  {
    id: 'manual',
    title: 'Manual/Anotação Livre',
    description: 'Criar aprendizado personalizado com observações próprias',
    icon: PenTool,
    color: 'bg-slate-500'
  }
];

const LEARNING_PROMPTS = {
  briefing: `
Você é um estrategista sênior de marketing. Analise este briefing/escopo aprovado e extraia um aprendizado estruturado:

BRIEFING/ESCOPO:
{context}

Extraia um aprendizado seguindo esta estrutura:
- **título**: Resumo em 1 frase do aprendizado principal
- **descrição**: Detalhamento do aprendizado (2-3 parágrafos)
- **niche**: Segmento/nicho específico
- **format**: Canal/formato principal usado
- **trigger**: Gatilho psicológico identificado
- **promise**: Promessa/benefício central
- **rationale**: Por que funcionou ou contexto importante
- **tags**: 3-5 tags relevantes para busca

Seja específico e acionável. Foque no que pode ser reaplicado em projetos futuros.
  `,
  
  meeting: `
Você é um consultor de marketing experiente. Analise esta transcrição/notas de reunião e extraia insights acionáveis:

REUNIÃO-TRANSCRIÇÃO:
{context}

Identifique e estruture um aprendizado:
- **título**: Principal insight da reunião
- **descrição**: Contexto e detalhes importantes
- **niche**: Segmento do cliente/discussão
- **format**: Canal/formato discutido (se aplicável)
- **trigger**: Motivação/dor identificada
- **promise**: Solução/benefício discutido
- **rationale**: Por que é relevante para futuros projetos
- **tags**: Palavras-chave para categorização

Foque em insights que podem guiar estratégias futuras.
  `,
  
  execution: `
Você é um analista de performance de marketing digital. Analise estes dados de execução e extraia aprendizados:

DADOS DE EXECUÇÃO:
{context}

Métricas (se fornecidas):
{metrics}

Crie um aprendizado estruturado:
- **título**: Principal lição dos resultados
- **descrição**: Análise dos resultados e contexto
- **niche**: Segmento/público testado
- **format**: Canal/formato executado
- **trigger**: Abordagem/gatilho que funcionou (ou não)
- **promise**: Benefício comunicado
- **rationale**: Por que os resultados foram assim e como aplicar
- **tags**: Categorias relevantes

Seja específico sobre o que funcionou, o que não funcionou e por quê.
  `,
  
  feedback: `
Você é um especialista em relacionamento com clientes. Analise este feedback e transforme em aprendizado estruturado:

FEEDBACK DO CLIENTE:
{context}

Extraia um aprendizado acionável:
- **título**: Principal insight do feedback
- **descrição**: Contexto e detalhamento do feedback
- **niche**: Área/segmento do cliente
- **format**: Formato/canal relacionado (se aplicável)
- **trigger**: Motivação/preocupação do cliente
- **promise**: Expectativa/benefício esperado
- **rationale**: Como aplicar este feedback em futuros projetos
- **tags**: Categorias para classificação

Foque em como este feedback pode melhorar abordagens futuras.
  `
};

const learningSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    niche: { type: "string" },
    format: { type: "string" },
    trigger: { type: "string" },
    promise: { type: "string" },
    rationale: { type: "string" },
    tags: { type: "array", items: { type: "string" } }
  },
  required: ["title", "description", "niche", "format", "trigger", "promise", "rationale", "tags"]
};

export default function QuickCreateModal({ 
  open, 
  onClose, 
  projectId = null,
  preselectedSource = null,
  contextData = null 
}) {
  const { user, agency } = useSession();
  const [step, setStep] = useState('source'); // 'source' | 'form' | 'ai'
  const [selectedSource, setSelectedSource] = useState(preselectedSource);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    niche: '',
    format: '',
    trigger: '',
    promise: '',
    rationale: '',
    tags: [],
    contextInput: '',
    metricsInput: ''
  });

  useEffect(() => {
    if (open && !preselectedSource) {
      // Log modal open
      AuditLog.create({
        agencyId: agency?.id,
        entity_type: 'LearningEntry',
        entity_id: 'quick_create_modal',
        action: 'LEARNING_OPEN_CREATE',
        actor_id: user?.email,
        meta_json: { projectId, timestamp: new Date().toISOString() }
      });
    }
  }, [open, preselectedSource, agency, user, projectId]);

  useEffect(() => {
    if (preselectedSource) {
      setSelectedSource(preselectedSource);
      setStep('form');
    }
  }, [preselectedSource]);

  const handleSourceSelect = (sourceType) => {
    setSelectedSource(sourceType);
    setStep('form');
    
    // Log source selection
    AuditLog.create({
      agencyId: agency?.id,
      entity_type: 'LearningEntry',
      entity_id: 'source_selection',
      action: 'LEARNING_OPEN_CREATE',
      actor_id: user?.email,
      meta_json: { sourceType, projectId }
    });
  };

  const handleGenerateWithAI = async () => {
    if (!selectedSource || !formData.contextInput.trim()) {
      toast.error('Por favor, forneça o contexto necessário.');
      return;
    }

    setIsGenerating(true);
    toast.info('Gerando aprendizado com IA...');

    try {
      const prompt = LEARNING_PROMPTS[selectedSource.id] || LEARNING_PROMPTS.manual;
      let contextToUse = contextData || formData.contextInput;
      
      const response = await InvokeLLM({
        prompt: prompt
          .replace('{context}', contextToUse)
          .replace('{metrics}', formData.metricsInput || 'Nenhuma métrica fornecida'),
        response_json_schema: learningSchema
      });

      if (response) {
        setFormData(prev => ({
          ...prev,
          title: response.title || '',
          description: response.description || '',
          niche: response.niche || '',
          format: response.format || '',
          trigger: response.trigger || '',
          promise: response.promise || '',
          rationale: response.rationale || '',
          tags: response.tags || []
        }));
        
        setStep('form');
        toast.success('Aprendizado gerado! Revise e ajuste conforme necessário.');
      }
    } catch (error) {
      console.error('Erro ao gerar aprendizado:', error);
      toast.error('Erro ao gerar aprendizado. Tente preencher manualmente.');
      setStep('form');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Título e descrição são obrigatórios.');
      return;
    }

    if (!agency?.id || !user?.email) {
      toast.error('Erro de sessão. Tente novamente.');
      return;
    }

    setIsSaving(true);

    try {
      const learningData = {
        agencyId: agency.id,
        projectId: projectId || 'global',
        sourceType: selectedSource.id,
        sourceRef: contextData?.id || 'manual',
        title: formData.title.trim(),
        description: formData.description.trim(),
        niche: formData.niche.trim() || 'Geral',
        format: formData.format.trim() || 'Não especificado',
        trigger: formData.trigger.trim() || 'Não identificado',
        promise: formData.promise.trim() || 'Não especificado',
        rationale: formData.rationale.trim() || '',
        tags: formData.tags.filter(tag => tag.trim().length > 0),
        createdBy: user.email,
        reviewed: false
      };

      // Add metrics if provided (for execution type)
      if (selectedSource.id === 'execution' && formData.metricsInput.trim()) {
        try {
          const metrics = JSON.parse(formData.metricsInput);
          learningData.resultJSON = metrics;
        } catch {
          // If not valid JSON, store as text
          learningData.resultJSON = { raw_data: formData.metricsInput };
        }
      }

      const newLearning = await LearningEntry.create(learningData);

      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'LearningEntry',
        entity_id: newLearning.id,
        action: 'LEARNING_SAVED',
        actor_id: user.email,
        meta_json: { 
          sourceType: selectedSource.id, 
          sourceRef: learningData.sourceRef,
          projectId 
        }
      });

      toast.success('Aprendizado salvo com sucesso!');
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        niche: '',
        format: '',
        trigger: '',
        promise: '',
        rationale: '',
        tags: [],
        contextInput: '',
        metricsInput: ''
      });
      setStep('source');
      setSelectedSource(null);

    } catch (error) {
      console.error('Erro ao salvar aprendizado:', error);
      toast.error('Erro ao salvar aprendizado. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('source');
    setSelectedSource(null);
    setFormData({
      title: '',
      description: '',
      niche: '',
      format: '',
      trigger: '',
      promise: '',
      rationale: '',
      tags: [],
      contextInput: '',
      metricsInput: ''
    });
  };

  const handleTagsChange = (tagsString) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Criar Novo Aprendizado
          </DialogTitle>
          <DialogDescription>
            Documente insights e aprendizados para reutilização em projetos futuros.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'source' && (
            <motion.div
              key="source"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selecione a fonte do aprendizado:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {SOURCE_TYPES.map((source) => {
                    const Icon = source.icon;
                    return (
                      <Card
                        key={source.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => handleSourceSelect(source)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${source.color} flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            {source.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-600">{source.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {(step === 'ai' || step === 'form') && selectedSource && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setStep('source')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Badge variant="outline" className="flex items-center gap-2">
                    {React.createElement(selectedSource.icon, { className: 'w-4 h-4' })}
                    {selectedSource.title}
                  </Badge>
                </div>
              </div>

              {!contextData && step === 'ai' && (
                <div className="space-y-4 p-6 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold">Forneça o contexto para gerar o aprendizado:</h3>
                  
                  <div className="space-y-3">
                    <Label htmlFor="contextInput">
                      {selectedSource.id === 'briefing' && 'Cole aqui o conteúdo do briefing/escopo:'}
                      {selectedSource.id === 'meeting' && 'Cole aqui a transcrição ou notas da reunião:'}
                      {selectedSource.id === 'execution' && 'Descreva a campanha executada:'}
                      {selectedSource.id === 'feedback' && 'Cole aqui o feedback recebido do cliente:'}
                      {selectedSource.id === 'manual' && 'Descreva o contexto do aprendizado:'}
                    </Label>
                    <Textarea
                      id="contextInput"
                      placeholder="Cole ou digite o contexto aqui..."
                      value={formData.contextInput}
                      onChange={(e) => setFormData(prev => ({ ...prev, contextInput: e.target.value }))}
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  {selectedSource.id === 'execution' && (
                    <div className="space-y-3">
                      <Label htmlFor="metricsInput">Métricas (opcional, formato JSON ou texto livre):</Label>
                      <Textarea
                        id="metricsInput"
                        placeholder='{"ctr": 2.5, "cpc": 1.20, "conversions": 45} ou descreva as métricas em texto'
                        value={formData.metricsInput}
                        onChange={(e) => setFormData(prev => ({ ...prev, metricsInput: e.target.value }))}
                        rows={3}
                        className="resize-none font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating || !formData.contextInput.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Lightbulb className="w-4 h-4 mr-2" />
                      )}
                      {isGenerating ? 'Gerando...' : 'Gerar com IA'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setStep('form')}
                    >
                      Preencher Manualmente
                    </Button>
                  </div>
                </div>
              )}

              {step === 'form' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título do Aprendizado *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Headlines com urgência convertem 40% mais"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição Detalhada *</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva o aprendizado, contexto e aplicabilidade..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rationale">Contexto/Justificativa</Label>
                      <Textarea
                        id="rationale"
                        placeholder="Por que funcionou? Em que situações aplicar?"
                        value={formData.rationale}
                        onChange={(e) => setFormData(prev => ({ ...prev, rationale: e.target.value }))}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="niche">Nicho/Segmento</Label>
                      <Input
                        id="niche"
                        placeholder="Ex: E-commerce, SaaS, Consultoria"
                        value={formData.niche}
                        onChange={(e) => setFormData(prev => ({ ...prev, niche: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="format">Formato/Canal</Label>
                      <Input
                        id="format"
                        placeholder="Ex: Instagram Post, Email Marketing, Landing Page"
                        value={formData.format}
                        onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trigger">Gatilho Psicológico</Label>
                      <Input
                        id="trigger"
                        placeholder="Ex: Escassez, Prova Social, Autoridade"
                        value={formData.trigger}
                        onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promise">Promessa/Benefício</Label>
                      <Input
                        id="promise"
                        placeholder="Ex: Aumentar conversões, Reduzir CAC"
                        value={formData.promise}
                        onChange={(e) => setFormData(prev => ({ ...prev, promise: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                      <Input
                        id="tags"
                        placeholder="urgência, headline, conversão, facebook-ads"
                        value={formData.tags.join(', ')}
                        onChange={(e) => handleTagsChange(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!contextData && step === 'form' && (
                <div className="flex items-center justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('ai')}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Gerar com IA
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !formData.title.trim() || !formData.description.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Aprendizado'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
