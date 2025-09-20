import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const severityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800', 
  high: 'bg-red-100 text-red-800'
};

const guardrailCategories = [
  'Orçamento',
  'Persona/Público',
  'Objetivos',
  'Claims/Mensagens',
  'Canais',
  'Cronograma',
  'Conteúdo'
];

export default function RulesGuardrails({ service, onUpdate }) {
  const [newGuardrail, setNewGuardrail] = useState({
    category: '',
    rule: '',
    severity: 'medium'
  });

  const addGuardrail = () => {
    if (newGuardrail.category && newGuardrail.rule) {
      const updatedGuardrails = [...service.rules_guardrails.guardrails, newGuardrail];
      onUpdate({
        rules_guardrails: {
          ...service.rules_guardrails,
          guardrails: updatedGuardrails
        }
      });
      setNewGuardrail({ category: '', rule: '', severity: 'medium' });
    }
  };

  const removeGuardrail = (index) => {
    const updatedGuardrails = service.rules_guardrails.guardrails.filter((_, i) => i !== index);
    onUpdate({
      rules_guardrails: {
        ...service.rules_guardrails,
        guardrails: updatedGuardrails
      }
    });
  };

  const updateEffortFactors = (factors) => {
    onUpdate({
      rules_guardrails: {
        ...service.rules_guardrails,
        effort_impact_matrix: {
          ...service.rules_guardrails.effort_impact_matrix,
          effort_factors: factors
        }
      }
    });
  };

  const updateImpactFactors = (factors) => {
    onUpdate({
      rules_guardrails: {
        ...service.rules_guardrails,
        effort_impact_matrix: {
          ...service.rules_guardrails.effort_impact_matrix,
          impact_factors: factors
        }
      }
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Guardrails de IA & Validação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Prompt */}
        <div className="space-y-2">
          <Label>Prompt de Validação</Label>
          <Textarea
            value={service.rules_guardrails.validation_prompt}
            onChange={(e) => onUpdate({
              rules_guardrails: {
                ...service.rules_guardrails,
                validation_prompt: e.target.value
              }
            })}
            placeholder="Instruções para a IA validar planos de ciclo deste serviço..."
            rows={3}
          />
          <p className="text-xs text-slate-500">
            Este prompt será usado pela IA para validar automaticamente os planos gerados.
          </p>
        </div>

        {/* Existing Guardrails */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Guardrails Configurados</Label>
            <Badge variant="outline">{service.rules_guardrails.guardrails.length} regras</Badge>
          </div>
          
          {service.rules_guardrails.guardrails.length > 0 ? (
            <div className="space-y-3">
              {service.rules_guardrails.guardrails.map((guardrail, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {guardrail.category}
                      </Badge>
                      <Badge className={`${severityColors[guardrail.severity]} text-xs`}>
                        {guardrail.severity === 'low' ? 'Baixa' : 
                         guardrail.severity === 'medium' ? 'Média' : 'Alta'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700">{guardrail.rule}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGuardrail(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhum guardrail configurado ainda.</p>
            </div>
          )}
        </div>

        {/* Add New Guardrail */}
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="text-blue-900">Adicionar Novo Guardrail</Label>
          <div className="grid md:grid-cols-3 gap-3">
            <Select 
              value={newGuardrail.category}
              onValueChange={(value) => setNewGuardrail({...newGuardrail, category: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {guardrailCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={newGuardrail.severity}
              onValueChange={(value) => setNewGuardrail({...newGuardrail, severity: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa Severidade</SelectItem>
                <SelectItem value="medium">Média Severidade</SelectItem>
                <SelectItem value="high">Alta Severidade</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={addGuardrail}
              disabled={!newGuardrail.category || !newGuardrail.rule}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <Textarea
            value={newGuardrail.rule}
            onChange={(e) => setNewGuardrail({...newGuardrail, rule: e.target.value})}
            placeholder="Descreva a regra que a IA deve seguir..."
            rows={2}
          />
        </div>

        {/* Effort/Impact Matrix Configuration */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Fatores de Esforço</Label>
            {service.rules_guardrails.effort_impact_matrix.effort_factors.map((factor, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={factor}
                  onChange={(e) => {
                    const newFactors = [...service.rules_guardrails.effort_impact_matrix.effort_factors];
                    newFactors[index] = e.target.value;
                    updateEffortFactors(newFactors);
                  }}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newFactors = service.rules_guardrails.effort_impact_matrix.effort_factors.filter((_, i) => i !== index);
                    updateEffortFactors(newFactors);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateEffortFactors([...service.rules_guardrails.effort_impact_matrix.effort_factors, ''])}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fator
            </Button>
          </div>
          
          <div className="space-y-3">
            <Label>Fatores de Impacto</Label>
            {service.rules_guardrails.effort_impact_matrix.impact_factors.map((factor, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={factor}
                  onChange={(e) => {
                    const newFactors = [...service.rules_guardrails.effort_impact_matrix.impact_factors];
                    newFactors[index] = e.target.value;
                    updateImpactFactors(newFactors);
                  }}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newFactors = service.rules_guardrails.effort_impact_matrix.impact_factors.filter((_, i) => i !== index);
                    updateImpactFactors(newFactors);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateImpactFactors([...service.rules_guardrails.effort_impact_matrix.impact_factors, ''])}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fator
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}