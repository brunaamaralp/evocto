import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuditLog, Agency } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { AlertTriangle, DollarSign, Activity, Shield, Zap, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function AIUsageMonitor() {
  const { agency, user } = useSession();
  const [usageData, setUsageData] = useState({
    monthlyExecutions: 0,
    estimatedCost: 0,
    riskLevel: 'low',
    recentExecutions: []
  });
  const [quotaSettings, setQuotaSettings] = useState({
    monthlyLimit: 100, // R$ 100 por mês
    warningThreshold: 80, // 80% do limite
    enabled: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'owner' || user?.role === 'admin') {
      loadUsageData();
      loadQuotaSettings();
    }
  }, [user]);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      // Buscar logs de execução de IA do último mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const aiLogs = await AuditLog.filter({
        agencyId: agency.id,
        action: { $in: ['AI_PLAN_SUGGESTED', 'AI_EXTRACTION_COMPLETED', 'AI_INSIGHTS_GENERATED'] },
        created_date: { $gte: startOfMonth.toISOString() }
      }, '-created_date', 100);

      // Estimativa de custo (simulada - na implementação real viria do billing)
      const estimatedCostPerExecution = 0.15; // R$ 0,15 por execução
      const totalCost = aiLogs.length * estimatedCostPerExecution;
      
      // Determinar nível de risco baseado no uso vs limite
      let riskLevel = 'low';
      const usagePercent = (totalCost / quotaSettings.monthlyLimit) * 100;
      if (usagePercent > quotaSettings.warningThreshold) riskLevel = 'medium';
      if (usagePercent > 95) riskLevel = 'high';

      setUsageData({
        monthlyExecutions: aiLogs.length,
        estimatedCost: totalCost,
        riskLevel,
        recentExecutions: aiLogs.slice(0, 10),
        usagePercent
      });

    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotaSettings = async () => {
    try {
      const agencyData = await Agency.get(agency.id);
      setQuotaSettings({
        monthlyLimit: agencyData.ai_quotas?.monthlyLimit || 100,
        warningThreshold: agencyData.ai_quotas?.warningThreshold || 80,
        enabled: agencyData.ai_quotas?.enabled !== false
      });
    } catch (error) {
      console.error('Erro ao carregar configurações de quota:', error);
    }
  };

  const handleSaveQuotas = async () => {
    try {
      await Agency.update(agency.id, {
        ai_quotas: quotaSettings
      });
      toast.success('Configurações de limite salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    }
  };

  const riskColors = {
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-red-600 bg-red-50 border-red-200'
  };

  const riskLabels = {
    low: 'Uso Normal',
    medium: 'Próximo ao Limite',
    high: 'Limite Excedido'
  };

  if (!user?.role || (user.role !== 'owner' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Monitoramento de Uso da IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{usageData.monthlyExecutions}</div>
              <div className="text-sm text-slate-500">Execuções este mês</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                R$ {usageData.estimatedCost.toFixed(2)}
              </div>
              <div className="text-sm text-slate-500">Custo estimado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{usageData.usagePercent?.toFixed(1)}%</div>
              <div className="text-sm text-slate-500">Do limite mensal</div>
            </div>
            <div className="text-center">
              <Badge className={riskColors[usageData.riskLevel]}>
                {riskLabels[usageData.riskLevel]}
              </Badge>
            </div>
          </div>

          {usageData.riskLevel === 'high' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Limite de uso atingido:</strong> O uso da IA está próximo ou acima do limite mensal configurado.
                Novas execuções podem ser bloqueadas automaticamente.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Execuções Recentes</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {usageData.recentExecutions.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-purple-500" />
                    <span>{log.action.replace('AI_', '').replace('_', ' ')}</span>
                  </div>
                  <div className="text-slate-500">
                    {new Date(log.created_date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NOVO: Configurações de Quotas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Limite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Limite Mensal (R$)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                value={quotaSettings.monthlyLimit}
                onChange={(e) => setQuotaSettings({...quotaSettings, monthlyLimit: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warningThreshold">Alerta em (%)</Label>
              <Input
                id="warningThreshold"
                type="number"
                value={quotaSettings.warningThreshold}
                onChange={(e) => setQuotaSettings({...quotaSettings, warningThreshold: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Kill Switch</h4>
              <p className="text-xs text-slate-500">Bloqueia automaticamente execuções ao atingir o limite</p>
            </div>
            <Button
              variant={quotaSettings.enabled ? "default" : "outline"}
              onClick={() => setQuotaSettings({...quotaSettings, enabled: !quotaSettings.enabled})}
            >
              {quotaSettings.enabled ? 'Ativado' : 'Desativado'}
            </Button>
          </div>
          <Button onClick={handleSaveQuotas} className="w-full">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Compliance e Segurança - mantido do código anterior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Compliance e Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">RLS (Row-Level Security)</span>
            </div>
            <Badge className="bg-green-100 text-green-800">Ativo</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Logs Sanitizados</span>
            </div>
            <Badge className="bg-green-100 text-green-800">Sem PII</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Timeout & Retry</span>
            </div>
            <Badge className="bg-green-100 text-green-800">30s / 3x</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Versionamento de Prompts</span>
            </div>
            <Badge className="bg-green-100 text-green-800">v{agency?.ai_personality?.prompt_version || '1.0'}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}