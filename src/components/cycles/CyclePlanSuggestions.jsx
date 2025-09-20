import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { InvokeLLM } from '@/api/integrations';
import { Brief, LearningEntry, PlaybookItem } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CyclePlanSuggestions({ cyclePlan, onApplySuggestion, service }) {
  const { agency } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const handleGeneratePlan = async () => {
    if (!cyclePlan || !service) return;

    setIsLoading(true);
    toast.info("Gerando sugestões de plano com IA...");

    try {
      // 1. Gather context
      const [brief, learnings, playbooks] = await Promise.all([
        Brief.filter({ project_id: cyclePlan.clientId, _sort: '-created_date', _limit: 1 }).then(res => res[0]),
        LearningEntry.filter({ agencyId: agency.id, _sort: '-created_date', _limit: 20 }),
        PlaybookItem.filter({ agencyId: agency.id, _sort: '-created_date', _limit: 20 })
      ]);

      const context = {
        masterBrief: brief?.content,
        serviceTemplateKPIs: service?.kpis,
        recentLearnings: learnings.map(l => ({ title: l.title, rationale: l.rationale })),
        availablePlaybooks: playbooks.map(p => ({ title: p.title, description: p.description })),
        guardrails: {
          budget: service?.budget,
          forbiddenClaims: service?.forbidden_claims,
        }
      };

      // 2. Invoke LLM
      const prompt = `
        Você é um estrategista de marketing digital. Sua tarefa é criar um rascunho de plano para o próximo ciclo de um cliente.

        Contexto Disponível:
        - Master Brief do Cliente: ${JSON.stringify(context.masterBrief, null, 2)}
        - KPIs do Serviço: ${JSON.stringify(context.serviceTemplateKPIs, null, 2)}
        - Aprendizados Recentes da Agência: ${JSON.stringify(context.recentLearnings, null, 2)}
        - Playbooks Disponíveis: ${JSON.stringify(context.availablePlaybooks, null, 2)}
        - Guardrails (Regras Obrigatórias): ${JSON.stringify(context.guardrails, null, 2)}

        Tarefa:
        Baseado em todo o contexto, gere um rascunho de plano para o ciclo '${cyclePlan.cyclePeriod}'.
        O plano deve conter:
        1.  'prioridades': Uma lista de 2-3 prioridades estratégicas para o ciclo.
        2.  'escopo': Um objeto com duas listas, 'in' e 'out'. Para cada item em 'in', adicione 'effort' (low/medium/high), 'impact' (low/medium/high), e 'rationale' (uma breve justificativa baseada no contexto).
        3.  'guardrailViolations': Uma lista de quaisquer violações das regras (budget, claims, etc.) que seu plano possa ter, com uma explicação.
        4.  'references': Uma lista dos IDs dos aprendizados e playbooks que você usou como referência.

        Responda APENAS com o objeto JSON.
      `;

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            prioridades: { type: "array", items: { type: "string" } },
            escopo: {
              type: "object",
              properties: {
                in: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item: { type: "string" },
                      effort: { type: "string" },
                      impact: { type: "string" },
                      rationale: { type: "string" }
                    },
                    required: ["item", "effort", "impact", "rationale"]
                  }
                },
                out: { type: "array", items: { type: "string" } }
              }
            },
            guardrailViolations: { type: "array", items: { type: "object", properties: { rule: { type: "string" }, explanation: { type: "string" } } } },
            references: { type: "array", items: { type: "string" } }
          },
          required: ["prioridades", "escopo"]
        }
      });
      
      setSuggestions(result);
      toast.success("Sugestões de plano geradas!");

    } catch (error) {
      console.error("Erro ao gerar plano:", error);
      toast.error("Falha ao gerar sugestões de plano.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestions) {
      onApplySuggestion(suggestions);
      setSuggestions(null); // Clear after applying
    }
  };

  if (!cyclePlan || cyclePlan.status !== 'draft') {
    return null;
  }

  return (
    <Card className="bg-slate-50 border-dashed border-slate-300 shadow-sm mt-8">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
          Assistente de Planejamento IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!suggestions && (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Economize tempo. Deixe a IA analisar o briefing, aprendizados e playbooks para criar um rascunho do plano estratégico para este ciclo.
            </p>
            <Button onClick={handleGeneratePlan} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando plano...
                </>
              ) : (
                'Gerar Plano com IA'
              )}
            </Button>
          </>
        )}

        {suggestions && (
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Plano Sugerido:</h4>
            
            {suggestions.guardrailViolations && suggestions.guardrailViolations.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <h5 className="font-bold text-red-700 flex items-center mb-2"><AlertTriangle className="w-4 h-4 mr-2"/> Violações de Guardrails Detectadas</h5>
                <ul className="list-disc pl-5 text-sm text-red-600">
                  {suggestions.guardrailViolations.map((v, i) => <li key={i}><strong>{v.rule}:</strong> {v.explanation}</li>)}
                </ul>
              </div>
            )}

            <div>
              <h5 className="font-semibold">Prioridades:</h5>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {suggestions.prioridades.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>

            <div>
              <h5 className="font-semibold">Escopo Sugerido (IN):</h5>
              <div className="space-y-2">
                {suggestions.escopo.in.map((item, i) => (
                  <div key={i} className="p-2 border rounded-md bg-white">
                    <p className="font-medium text-slate-800">{item.item}</p>
                    <p className="text-xs text-slate-500">{item.rationale}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">Impacto: {item.impact}</Badge>
                      <Badge variant="outline">Esforço: {item.effort}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSuggestions(null)}>Descartar</Button>
              <Button onClick={handleApply}>Aplicar Sugestões ao Plano</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}