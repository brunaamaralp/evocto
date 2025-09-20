
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

const CONTENT_GUARDRAILS = [
  'Nada de conteúdo político ou controverso',
  'Linguagem profissional e respeitosa',
  'Sem promessas impossíveis ou enganosas',
  'Conformidade com LGPD e regulamentações',
  'Adequado para audiência corporativa'
];

const BLOCKED_TERMS = [
  'garantido', 'milagre', 'seçã[o]', 'politica', 'religioso',
  'sem esforço', 'dinheiro fácil', 'urgente', 'última chance'
];

function validateContent(content) {
  const issues = [];
  const lowerContent = content.toLowerCase();
  
  // Verificar termos bloqueados
  BLOCKED_TERMS.forEach(term => {
    // Usar regex para termos com colchetes para melhor correspondência (seçã[o])
    const regex = new RegExp(term.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g');
    if (regex.test(lowerContent)) {
      issues.push(`Termo não recomendado: "${term}"`);
    }
  });
  
  // Verificar comprimento
  if (content.length < 10) {
    issues.push('Conteúdo muito curto');
  }
  
  if (content.length > 2000) {
    issues.push('Conteúdo muito longo');
  }
  
  // Verificar excesso de maiúsculas
  const upperCaseCount = (content.match(/[A-Z]/g) || []).length;
  if (content.length > 0 && upperCaseCount / content.length > 0.3) {
    issues.push('Excesso de letras maiúsculas');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

export default function ContentHelper({ planData, visible = false }) {
  const { agency } = useSession();
  const [contentRequest, setContentRequest] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Não renderizar se feature flag não estiver ativa
  if (!visible || !agency?.feature_flags?.contentHelper) {
    return null;
  }

  const handleGenerateContent = async () => {
    if (!contentRequest.trim()) return;
    
    setIsGenerating(true);
    setValidationResult(null);
    
    try {
      // Simular chamada para IA (na implementação real, seria uma função backend)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockContent = `Baseado no plano "${planData?.mudancaChave || 'estratégia atual'}", aqui está uma sugestão de conteúdo para ${contentRequest}:

📊 NOVA ESTRATÉGIA EM AÇÃO

Identificamos uma oportunidade única de ${planData?.ajustesEstrategicos?.frequencia || 'otimização'} que pode transformar seus resultados.

✅ O que mudou:
${planData?.prioridades?.slice(0, 2).map(p => `• ${p}`).join('\n') || '• Foco em performance'}

💡 Próximos passos:
Acompanhe os resultados e ajustes que implementaremos nas próximas semanas.

#MarketingDigital #Estratégia #Resultados`;

      setGeneratedContent(mockContent);
      
      // Validar conteúdo gerado
      const validation = validateContent(mockContent);
      setValidationResult(validation);
      
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyContent = () => {
    // IMPORTANTE: Esta é apenas uma funcionalidade assistente
    // O conteúdo NÃO substitui o plano, apenas oferece sugestões
    navigator.clipboard.writeText(generatedContent);
    toast.success('Conteúdo copiado para a área de transferência');
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base">Assistente de Conteúdo</CardTitle>
            <Badge variant="secondary" className="text-xs">BETA</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <Shield className="w-3 h-3" />
            Guardrails Ativos
          </div>
        </div>
        
        <Alert className="border-amber-200 bg-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            <strong>Modo Assistente:</strong> Este recurso oferece sugestões de conteúdo baseadas no seu plano. 
            Sempre revise e adapte o conteúdo antes de usar.
          </AlertDescription>
        </Alert>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Guardrails visíveis */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Diretrizes de Segurança</h4>
          <div className="grid grid-cols-1 gap-1">
            {CONTENT_GUARDRAILS.map((guardrail, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <Shield className="w-3 h-3 text-green-500" />
                {guardrail}
              </div>
            ))}
          </div>
        </div>

        {/* Input para solicitação */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            O que você gostaria de criar?
          </label>
          <Textarea
            value={contentRequest}
            onChange={(e) => setContentRequest(e.target.value)}
            placeholder="Ex: Post para LinkedIn anunciando os novos ajustes na estratégia..."
            className="min-h-[80px]"
          />
        </div>

        <Button 
          onClick={handleGenerateContent}
          disabled={!contentRequest.trim() || isGenerating}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando conteúdo...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Sugestão
            </>
          )}
        </Button>

        {/* Conteúdo gerado */}
        {generatedContent && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Conteúdo Sugerido</h4>
              <div className="p-3 bg-white rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                  {generatedContent}
                </pre>
              </div>
            </div>

            {/* Validação */}
            {validationResult && (
              <div>
                {validationResult.isValid ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Shield className="w-4 h-4" />
                    Conteúdo aprovado pelos guardrails
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Problemas detectados:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.issues.map((issue, idx) => (
                          <li key={idx} className="text-xs">{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {validationResult?.isValid && (
              <Button onClick={handleApplyContent} variant="outline" className="w-full">
                Copiar para Área de Transferência
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
