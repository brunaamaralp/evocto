import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function ServicePoliciesPage() {
  const { agency } = useSession();
  const [policies, setPolicies] = useState({
    rc_expiry_days: 7,
    learning_triage_sla_hours: 48,
    ai_confidence_thresholds: {
      additive: 0.75,
      disruptive: 0.85
    },
    default_shared_visibility: true,
    auto_cycle_start: false,
    budget_variance_threshold: 20,
    approval_reminder_days: [3, 1]
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Em produção, salvaria as políticas na entidade Agency ou numa entidade GlobalPolicies
      // await Agency.update(agency.id, { global_policies: policies });
      
      // Mock do salvamento
      await new Promise(res => setTimeout(res, 1000));
      
      toast.success('Políticas globais atualizadas com sucesso!');
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao salvar políticas:', error);
      toast.error('Erro ao salvar políticas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (key, value) => {
    setPolicies(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const updateAIThreshold = (type, value) => {
    setPolicies(prev => ({
      ...prev,
      ai_confidence_thresholds: {
        ...prev.ai_confidence_thresholds,
        [type]: value
      }
    }));
    setHasChanges(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="p-2">
          <Link to={createPageUrl('services')}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Políticas Globais</h1>
          <p className="text-slate-600 mt-1">Configure padrões que afetam todos os serviços da agência.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* RC & Approval Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Aprovações & RC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiração padrão do RC (dias)</Label>
                  <Input
                    type="number"
                    value={policies.rc_expiry_days}
                    onChange={(e) => updatePolicy('rc_expiry_days', parseInt(e.target.value))}
                    min="1"
                    max="30"
                  />
                  <p className="text-xs text-slate-500">
                    Após este período, o RC expira e precisa ser renovado
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Limiar de variação de orçamento (%)</Label>
                  <Input
                    type="number"
                    value={policies.budget_variance_threshold}
                    onChange={(e) => updatePolicy('budget_variance_threshold', parseInt(e.target.value))}
                    min="5"
                    max="50"
                  />
                  <p className="text-xs text-slate-500">
                    Variações acima deste % exigem validação manual
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={policies.auto_cycle_start}
                  onCheckedChange={(checked) => updatePolicy('auto_cycle_start', checked)}
                />
                <div>
                  <Label>Início automático do próximo ciclo</Label>
                  <p className="text-xs text-slate-500">Quando um ciclo é aprovado, inicia o próximo automaticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Confidence Thresholds */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Níveis de Confiança da IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Configure os thresholds que determinam quando a IA pode aplicar mudanças automaticamente vs. quando precisa de validação manual.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Threshold Aditivo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.0"
                      value={policies.ai_confidence_thresholds.additive}
                      onChange={(e) => updateAIThreshold('additive', parseFloat(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-500">
                      ({(policies.ai_confidence_thresholds.additive * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mudanças incrementais (reordenar prioridades, ajustar mix)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Threshold Disruptivo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.0"
                      value={policies.ai_confidence_thresholds.disruptive}
                      onChange={(e) => updateAIThreshold('disruptive', parseFloat(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-500">
                      ({(policies.ai_confidence_thresholds.disruptive * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mudanças estruturais (personas, claims, objetivos)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning & Visibility */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Aprendizados & Visibilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>SLA de triagem de aprendizados (horas)</Label>
                <Select
                  value={policies.learning_triage_sla_hours.toString()}
                  onValueChange={(value) => updatePolicy('learning_triage_sla_hours', parseInt(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="48">48 horas (padrão)</SelectItem>
                    <SelectItem value="72">72 horas</SelectItem>
                    <SelectItem value="168">1 semana</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Após este período, aprendizados não triados aparecem na view Actionable
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={policies.default_shared_visibility}
                  onCheckedChange={(checked) => updatePolicy('default_shared_visibility', checked)}
                />
                <div>
                  <Label>Visibilidade compartilhada por padrão</Label>
                  <p className="text-xs text-slate-500">Novos aprendizados ficam visíveis para clientes automaticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Salvar Políticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Estas configurações afetam todos os serviços da agência e são aplicadas imediatamente.
              </p>
              
              <Button 
                onClick={handleSave} 
                disabled={saving || !hasChanges}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Políticas
                  </>
                )}
              </Button>
              
              {!hasChanges && (
                <p className="text-xs text-slate-500 text-center">
                  Todas as alterações foram salvas
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Impacto das Políticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">RC expira em:</p>
                <p className="text-xs text-slate-600">{policies.rc_expiry_days} dias após criação</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">IA aplica automaticamente:</p>
                <p className="text-xs text-slate-600">
                  Mudanças com ≥{(policies.ai_confidence_thresholds.additive * 100).toFixed(0)}% confiança (aditivas)
                </p>
                <p className="text-xs text-slate-600">
                  Mudanças com ≥{(policies.ai_confidence_thresholds.disruptive * 100).toFixed(0)}% confiança (disruptivas)
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Aprendizados pendentes:</p>
                <p className="text-xs text-slate-600">
                  Aparecem na agenda após {policies.learning_triage_sla_hours}h
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}