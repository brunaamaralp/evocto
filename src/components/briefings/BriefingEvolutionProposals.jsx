
import React from 'react';
import { Brief, EvolutionEvent, AuditLog } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, Zap, TrendingUp, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sectionLabels = {
  target_audience: 'Público-alvo',
  current_challenges: 'Desafios Atuais',
  objectives: 'Objetivos',
  brand_tone: 'Tom de Voz'
};

export default function BriefingEvolutionProposals({ clientId, briefId, proposals, onUpdate, onRemoveProposal }) {
  const { user } = useSession();

  const handleApply = async (proposal) => {
    // GATE DE SEGURANÇA: Não permite aplicar mudanças de alto impacto diretamente
    if (proposal.impacto === 'Alto') {
      toast.info('Ação Requerida', {
        description: 'Esta é uma mudança disruptiva. Discuta com sua equipe e aplique manualmente no briefing.',
      });
      return;
    }

    try {
      const updateData = {
        [proposal.secao_briefing]: proposal.texto_proposto
      };

      await Brief.update(briefId, updateData);

      // Registrar o evento de evolução
      await EvolutionEvent.create({
        agencyId: user.agency?.id,
        clientId: clientId,
        serviceId: null, // Pode ser preenchido se o contexto estiver disponível
        type: 'briefing_major_update',
        title: `Briefing atualizado: ${sectionLabels[proposal.secao_briefing] || proposal.secao_briefing.replace('_', ' ')}`,
        description: `A seção '${sectionLabels[proposal.secao_briefing] || proposal.secao_briefing.replace('_', ' ')}' foi atualizada com base em novos aprendizados. Justificativa: ${proposal.justificativa}`,
        date: new Date().toISOString(),
        impact: proposal.impacto.toLowerCase(),
        confidence: 0.85, // Placeholder, idealmente viria da IA
        authored_by: 'ai',
        requires_review: true,
        before_after: {
          after: proposal.texto_proposto,
        },
        source: {
          kind: 'library_learning',
          snippets: [proposal.justificativa]
        }
      });

      // Log to Audit
      await AuditLog.create({
        agencyId: user.agency?.id,
        entity_type: 'Brief',
        entity_id: briefId,
        action: 'briefing_evolution_accepted',
        actor_id: user.email,
        meta_json: {
          change: 'briefing_evolution_accepted',
          section: proposal.secao_briefing,
          applied_text: proposal.texto_proposto,
          justification: proposal.justificativa,
        }
      });

      toast.success("Briefing atualizado com sucesso!");
      onRemoveProposal(proposal); // Notify parent to remove this proposal from its list
      onUpdate(); // Notify parent of general brief update

    } catch (err) {
      console.error("Erro ao aplicar proposta:", err);
      toast.error("Falha ao atualizar o briefing.");
    }
  };

  const handleDiscard = (proposal) => {
    onRemoveProposal(proposal); // Notify parent to remove this proposal from its list
    toast.info("Sugestão descartada.");
  };

  const getImpactConfig = (impact) => {
    switch (impact) {
      case 'Alto':
        return { label: 'Disruptivo', icon: AlertTriangle, color: 'text-red-600', badgeColor: 'bg-red-100 text-red-800' };
      case 'Médio':
        return { label: 'Estratégico', icon: TrendingUp, color: 'text-amber-600', badgeColor: 'bg-amber-100 text-amber-800' };
      case 'Baixo':
        return { label: 'Aditivo', icon: Zap, color: 'text-blue-600', badgeColor: 'bg-blue-100 text-blue-800' };
      default:
        return { label: 'Sugestão', icon: Lightbulb, color: 'text-slate-500', badgeColor: 'bg-slate-100 text-slate-800' };
    }
  };

  if (!proposals || proposals.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed p-6">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
            <Lightbulb className="w-8 h-8 text-slate-400" />
            <div>
                <p className="font-semibold text-slate-800">Sem Sugestões de Evolução no momento.</p>
                <p className="text-sm text-slate-500">Aguarde novas análises ou verifique o briefing manualmente.</p>
            </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal, index) => {
        const impactConfig = getImpactConfig(proposal.impacto);
        const Icon = impactConfig.icon;

        return (
          <Card key={index} className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${impactConfig.color}`} />
                    Proposta para: {sectionLabels[proposal.secao_briefing] || proposal.secao_briefing.replace('_', ' ')}
                  </CardTitle>
                  <Badge className={`mt-2 ${impactConfig.badgeColor}`}>{impactConfig.label}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleDiscard(proposal)}>
                    <X className="w-4 h-4 mr-1" />
                    Descartar
                  </Button>

                  {proposal.impacto === 'Alto' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex="0">
                            <Button size="sm" disabled>
                              <Check className="w-4 h-4 mr-1" />
                              Aplicar Manualmente
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mudanças disruptivas devem ser discutidas e aplicadas manualmente.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button size="sm" onClick={() => handleApply(proposal)} className="bg-purple-600 hover:bg-purple-700">
                      <Check className="w-4 h-4 mr-1" />
                      Aceitar e Aplicar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-green-50 text-green-900 p-3 rounded-md text-sm border border-green-200">
                <p className="font-semibold text-xs mb-1">Texto Sugerido:</p>
                <p>{proposal.texto_proposto}</p>
              </div>
              <div className="bg-blue-50 text-blue-900 p-3 rounded-md text-sm border border-blue-200">
                <p className="font-semibold text-xs mb-1">Justificativa da IA:</p>
                <p className="italic">"{proposal.justificativa}"</p>
              </div>
               {proposal.impacto === 'Alto' && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>Atenção:</strong> Esta é uma mudança de alto impacto. Recomenda-se uma discussão estratégica antes de alterar o briefing manualmente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
