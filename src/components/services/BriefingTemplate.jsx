import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  X, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  GripVertical
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const planSectionOptions = [
  { id: 'resumo_anterior', label: 'Resumo do Ciclo Anterior', default: true },
  { id: 'prioridades', label: 'Prioridades Estratégicas', default: true },
  { id: 'ajustes_estrategicos', label: 'Ajustes (Manter/Pivotar/Testar)', default: true },
  { id: 'pendencias_cliente', label: 'Pendências do Cliente', default: true },
  { id: 'sugestoes_ia', label: 'Sugestões da IA', default: false },
  { id: 'metricas_foco', label: 'Métricas de Foco', default: false },
  { id: 'cronograma', label: 'Cronograma de Execução', default: false }
];

const metricsOptions = [
  'CTR', 'CPL', 'CPA', 'ROAS', 'Leads', 'Vendas', 'Alcance', 
  'Engajamento', 'Impressões', 'Cliques', 'Conversões'
];

export default function BriefingTemplate({ service, onUpdate }) {
  const [isOpen, setIsOpen] = useState(true);
  const [newScopeIN, setNewScopeIN] = useState('');
  const [newScopeOUT, setNewScopeOUT] = useState('');

  const updatePlanSections = (sectionId, enabled) => {
    const currentSections = service.briefing_template?.plan_sections || [];
    let updatedSections;
    
    if (enabled) {
      if (!currentSections.includes(sectionId)) {
        updatedSections = [...currentSections, sectionId];
      } else {
        updatedSections = currentSections;
      }
    } else {
      updatedSections = currentSections.filter(id => id !== sectionId);
    }

    onUpdate({
      briefing_template: {
        ...service.briefing_template,
        plan_sections: updatedSections
      }
    });
  };

  const addScopeItem = (type) => {
    const newItem = type === 'IN' ? newScopeIN : newScopeOUT;
    if (!newItem.trim()) return;

    const currentScope = service.briefing_template?.scope || { IN: [], OUT: [] };
    const updatedScope = {
      ...currentScope,
      [type]: [...(currentScope[type] || []), newItem.trim()]
    };

    onUpdate({
      briefing_template: {
        ...service.briefing_template,
        scope: updatedScope
      }
    });

    if (type === 'IN') setNewScopeIN('');
    if (type === 'OUT') setNewScopeOUT('');
  };

  const removeScopeItem = (type, index) => {
    const currentScope = service.briefing_template?.scope || { IN: [], OUT: [] };
    const updatedItems = (currentScope[type] || []).filter((_, i) => i !== index);
    
    onUpdate({
      briefing_template: {
        ...service.briefing_template,
        scope: {
          ...currentScope,
          [type]: updatedItems
        }
      }
    });
  };

  const updateKeyMetrics = (metrics) => {
    onUpdate({
      briefing_template: {
        ...service.briefing_template,
        key_metrics: metrics
      }
    });
  };

  const addKeyMetric = (metric) => {
    const current = service.briefing_template?.key_metrics || [];
    if (!current.includes(metric)) {
      updateKeyMetrics([...current, metric]);
    }
  };

  const removeKeyMetric = (metric) => {
    const current = service.briefing_template?.key_metrics || [];
    updateKeyMetrics(current.filter(m => m !== metric));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-lg">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Escopo & Plano de Execução
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Escopo IN/OUT */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-green-700 font-medium">✅ Escopo Incluído (IN)</Label>
                <div className="space-y-2">
                  {(service.briefing_template?.scope?.IN || []).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="flex-1 text-sm text-green-800">{item}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScopeItem('IN', index)}
                        className="h-6 w-6 p-0 text-green-600 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newScopeIN}
                      onChange={(e) => setNewScopeIN(e.target.value)}
                      placeholder="Ex: 10 posts para Instagram"
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => addScopeItem('IN')}
                      disabled={!newScopeIN.trim()}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-red-700 font-medium">❌ Fora do Escopo (OUT)</Label>
                <div className="space-y-2">
                  {(service.briefing_template?.scope?.OUT || []).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <span className="flex-1 text-sm text-red-800">{item}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScopeItem('OUT', index)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newScopeOUT}
                      onChange={(e) => setNewScopeOUT(e.target.value)}
                      placeholder="Ex: Stories em tempo real"
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => addScopeItem('OUT')}
                      disabled={!newScopeOUT.trim()}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Seções do Plano de Execução */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">Seções do Plano de Execução</Label>
              <p className="text-sm text-slate-600">Configure quais seções aparecem por padrão nos planos deste serviço.</p>
              
              <div className="grid md:grid-cols-2 gap-3">
                {planSectionOptions.map(section => {
                  const isEnabled = (service.briefing_template?.plan_sections || []).includes(section.id);
                  return (
                    <div key={section.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{section.label}</p>
                        {section.default && (
                          <Badge variant="outline" className="text-xs mt-1">Recomendado</Badge>
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => updatePlanSections(section.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Métricas-chave */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">Métricas-chave do Serviço</Label>
              <p className="text-sm text-slate-600">Selecione as métricas mais importantes para acompanhar neste serviço.</p>
              
              <div className="flex flex-wrap gap-2">
                {(service.briefing_template?.key_metrics || []).map(metric => (
                  <Badge key={metric} variant="default" className="flex items-center gap-1">
                    {metric}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-300" 
                      onClick={() => removeKeyMetric(metric)}
                    />
                  </Badge>
                ))}
              </div>
              
              <Select onValueChange={addKeyMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Adicionar métrica..." />
                </SelectTrigger>
                <SelectContent>
                  {metricsOptions
                    .filter(metric => !(service.briefing_template?.key_metrics || []).includes(metric))
                    .map(metric => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Política de Aprovação */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">Política de Aprovação</Label>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <input
                    type="radio"
                    id="auto_approval"
                    name="approval_policy"
                    checked={(service.briefing_template?.approval_policy || 'auto') === 'auto'}
                    onChange={() => onUpdate({
                      briefing_template: {
                        ...service.briefing_template,
                        approval_policy: 'auto'
                      }
                    })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="auto_approval" className="font-medium text-green-800 cursor-pointer">
                      Auto-aprovação com Guardrails
                    </label>
                    <p className="text-sm text-green-700 mt-1">
                      Planos são aprovados automaticamente se não alterarem persona, claims ou objetivos centrais.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <input
                    type="radio"
                    id="manual_approval"
                    name="approval_policy"
                    checked={(service.briefing_template?.approval_policy || 'auto') === 'manual'}
                    onChange={() => onUpdate({
                      briefing_template: {
                        ...service.briefing_template,
                        approval_policy: 'manual'
                      }
                    })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="manual_approval" className="font-medium text-amber-800 cursor-pointer">
                      Sempre Pedir Aprovação
                    </label>
                    <p className="text-sm text-amber-700 mt-1">
                      Todos os planos deste serviço exigem aprovação manual do cliente (mais conservador).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}