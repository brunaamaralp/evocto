import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Users, Target, TrendingUp, Calendar, 
  DollarSign, FileText, AlertTriangle, CheckCircle,
  Database, Shield, Briefcase
} from 'lucide-react';
import { useT } from '@/components/i18n/I18nProvider';

export default function BriefingForm({ 
  briefing, 
  setBriefing, 
  client, 
  isEditing = false, 
  onSave, 
  saving = false 
}) {
  const t = useT();
  const [completionScore, setCompletionScore] = useState(0);

  // Calcular score de completude
  useEffect(() => {
    if (briefing) {
      const requiredFields = [
        'business_context', 
        'company_profile', 
        'current_challenges', 
        'objectives', 
        'success_metrics', 
        'timeline_expectations'
      ];
      
      const filledFields = requiredFields.filter(field => 
        briefing[field] && briefing[field].toString().trim().length > 10
      );
      
      const score = Math.round((filledFields.length / requiredFields.length) * 100);
      setCompletionScore(score);
      
      // Atualizar briefing com score
      if (setBriefing && briefing.completion_score !== score) {
        setBriefing(prev => ({ ...prev, completion_score: score }));
      }
    }
  }, [briefing, setBriefing]);

  const handleInputChange = (field, value) => {
    if (setBriefing) {
      setBriefing(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = () => {
    if (onSave) {
      // Trigger save do form
      const event = new CustomEvent('briefing-save');
      document.dispatchEvent(event);
    }
  };

  // Listen for save events from external triggers
  useEffect(() => {
    const handleExternalSave = () => {
      if (onSave) {
        onSave(briefing);
      }
    };

    document.addEventListener('briefing-save', handleExternalSave);
    return () => document.removeEventListener('briefing-save', handleExternalSave);
  }, [briefing, onSave]);

  if (!briefing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Carregando briefing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Progress */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Briefing de Consultoria
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {client ? `${client.name} • ${client.company || 'Empresa'}` : 'Cliente não identificado'}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={completionScore >= 80 ? 'default' : completionScore >= 50 ? 'secondary' : 'outline'}>
                {completionScore}% completo
              </Badge>
              <Progress value={completionScore} className="w-24 mt-2" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contexto Empresarial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Contexto Empresarial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="business_context">
              Descrição do Negócio *
              <span className="text-xs text-gray-500 ml-2">(Atividade, produtos/serviços, mercado)</span>
            </Label>
            <Textarea
              id="business_context"
              value={briefing.business_context || ''}
              onChange={(e) => handleInputChange('business_context', e.target.value)}
              placeholder="Descreva a atividade principal da empresa, produtos/serviços oferecidos, mercado de atuação, diferenciais competitivos..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="company_profile">
              Perfil da Empresa *
              <span className="text-xs text-gray-500 ml-2">(Porte, estrutura, histórico)</span>
            </Label>
            <Textarea
              id="company_profile"
              value={briefing.company_profile || ''}
              onChange={(e) => handleInputChange('company_profile', e.target.value)}
              placeholder="Porte da empresa, número de funcionários, estrutura societária, tempo de mercado, principais marcos..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Desafios e Objetivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Desafios e Objetivos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current_challenges">
              Principais Desafios Atuais *
              <span className="text-xs text-gray-500 ml-2">(Problemas específicos que motivaram a busca por consultoria)</span>
            </Label>
            <Textarea
              id="current_challenges"
              value={briefing.current_challenges || ''}
              onChange={(e) => handleInputChange('current_challenges', e.target.value)}
              placeholder="Quais são os maiores desafios que a empresa enfrenta? Ex: Controle financeiro deficiente, alta carga tributária, necessidade de reestruturação..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="objectives">
              Objetivos com a Consultoria *
              <span className="text-xs text-gray-500 ml-2">(Resultados esperados e metas específicas)</span>
            </Label>
            <Textarea
              id="objectives"
              value={briefing.objectives || ''}
              onChange={(e) => handleInputChange('objectives', e.target.value)}
              placeholder="O que vocês esperam alcançar? Ex: Reduzir custos em X%, melhorar fluxo de caixa, otimizar carga tributária, preparar para venda..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="success_metrics">
              Como Medir o Sucesso *
              <span className="text-xs text-gray-500 ml-2">(KPIs e indicadores específicos)</span>
            </Label>
            <Textarea
              id="success_metrics"
              value={briefing.success_metrics || ''}
              onChange={(e) => handleInputChange('success_metrics', e.target.value)}
              placeholder="Como saberemos que os objetivos foram atingidos? Ex: Margem EBITDA > X%, redução de custos em X%, tempo de fechamento contábil..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stakeholders e Comunicação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Stakeholders e Comunicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="stakeholders">
              Principais Envolvidos
              <span className="text-xs text-gray-500 ml-2">(Tomadores de decisão, responsáveis por áreas)</span>
            </Label>
            <Textarea
              id="stakeholders"
              value={briefing.stakeholders || ''}
              onChange={(e) => handleInputChange('stakeholders', e.target.value)}
              placeholder="Quem são os principais envolvidos no projeto? Sócios, diretores, gerentes financeiros, contadores..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="communication_preferences">
              Estilo de Comunicação Preferido
            </Label>
            <Select 
              value={briefing.communication_preferences || 'consultivo'} 
              onValueChange={(value) => handleInputChange('communication_preferences', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal e Protocolar</SelectItem>
                <SelectItem value="direto">Direto e Objetivo</SelectItem>
                <SelectItem value="academico">Técnico e Detalhado</SelectItem>
                <SelectItem value="consultivo">Consultivo e Educacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expectativas e Recursos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Expectativas e Recursos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="timeline_expectations">
              Expectativas de Prazo *
              <span className="text-xs text-gray-500 ml-2">(Cronograma esperado e marcos importantes)</span>
            </Label>
            <Textarea
              id="timeline_expectations"
              value={briefing.timeline_expectations || ''}
              onChange={(e) => handleInputChange('timeline_expectations', e.target.value)}
              placeholder="Qual o prazo esperado para conclusão? Há marcos importantes ou datas críticas? Ex: Fechamento do balanço, auditoria, reunião com investidores..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="budget_expectations">
              Expectativas de Investimento
              <span className="text-xs text-gray-500 ml-2">(Faixa orçamentária e forma de pagamento)</span>
            </Label>
            <Textarea
              id="budget_expectations"
              value={briefing.budget_expectations || ''}
              onChange={(e) => handleInputChange('budget_expectations', e.target.value)}
              placeholder="Faixa de investimento esperada, forma de pagamento preferida, se há orçamento aprovado..."
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contexto Técnico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Contexto Técnico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Disponibilidade de Dados Financeiros</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_organized_data"
                  checked={briefing.financial_data_availability?.has_organized_data || false}
                  onChange={(e) => handleInputChange('financial_data_availability', {
                    ...briefing.financial_data_availability,
                    has_organized_data: e.target.checked
                  })}
                />
                <Label htmlFor="has_organized_data" className="text-sm">
                  Dados organizados
                </Label>
              </div>
            </div>
            
            <div className="mt-3">
              <Label className="text-sm">Sistemas utilizados</Label>
              <Input
                placeholder="Ex: Excel, ERP específico, sistema contábil..."
                value={briefing.financial_data_availability?.systems_used?.join(', ') || ''}
                onChange={(e) => {
                  const systems = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  handleInputChange('financial_data_availability', {
                    ...briefing.financial_data_availability,
                    systems_used: systems
                  });
                }}
                className="mt-1"
              />
            </div>

            <div className="mt-3">
              <Label className="text-sm">Observações sobre qualidade dos dados</Label>
              <Textarea
                placeholder="Ex: Dados auditados, inconsistências conhecidas, limitações..."
                value={briefing.financial_data_availability?.data_quality_notes || ''}
                onChange={(e) => handleInputChange('financial_data_availability', {
                  ...briefing.financial_data_availability,
                  data_quality_notes: e.target.value
                })}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contexto Regulatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Contexto Regulatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Regulamentações específicas do setor</Label>
            <Input
              placeholder="Ex: BACEN, ANVISA, ANS, CVM..."
              value={briefing.regulatory_context?.industry_regulations?.join(', ') || ''}
              onChange={(e) => {
                const regulations = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                handleInputChange('regulatory_context', {
                  ...briefing.regulatory_context,
                  industry_regulations: regulations
                });
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">Status de compliance</Label>
            <Select 
              value={briefing.regulatory_context?.compliance_status || ''} 
              onValueChange={(value) => handleInputChange('regulatory_context', {
                ...briefing.regulatory_context,
                compliance_status: value
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o status atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_dia">Em dia com todas as obrigações</SelectItem>
                <SelectItem value="pendencias_menores">Pendências menores</SelectItem>
                <SelectItem value="pendencias_criticas">Pendências críticas</SelectItem>
                <SelectItem value="nao_sei">Não tenho certeza</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Desafios regulatórios</Label>
            <Textarea
              placeholder="Ex: Dificuldades específicas com compliance, mudanças regulatórias recentes..."
              value={briefing.regulatory_context?.regulatory_challenges || ''}
              onChange={(e) => handleInputChange('regulatory_context', {
                ...briefing.regulatory_context,
                regulatory_challenges: e.target.value
              })}
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informações Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="additional_context">
              Outras informações relevantes
              <span className="text-xs text-gray-500 ml-2">(Contexto adicional, preocupações específicas, experiências anteriores)</span>
            </Label>
            <Textarea
              id="additional_context"
              value={briefing.additional_context || ''}
              onChange={(e) => handleInputChange('additional_context', e.target.value)}
              placeholder="Qualquer informação adicional que possa ser relevante para a consultoria..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status e Alertas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {completionScore >= 80 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Briefing completo e pronto para análise
                  </span>
                </>
              ) : completionScore >= 50 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-yellow-700 font-medium">
                    Algumas informações importantes ainda podem ser adicionadas
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">
                    Informações essenciais ainda precisam ser preenchidas
                  </span>
                </>
              )}
            </div>
            
            {onSave && (
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="ml-4"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}