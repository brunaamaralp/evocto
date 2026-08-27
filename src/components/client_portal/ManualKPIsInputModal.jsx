import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  Calendar,
  CheckCircle, 
  AlertCircle,
  Save,
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Modal para inserção manual de KPIs de performance
 */
export default function ManualKPIsInputModal({ 
  isOpen, 
  onClose, 
  clientId, 
  serviceId,
  serviceType,
  onDataSaved 
}) {
  const { user } = useSession();
  const [kpiData, setKpiData] = useState({});
  const [period, setPeriod] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const diagnosticoKPIs = [
    { key: 'clareza_posicionamento', label: 'Clareza de Posicionamento', unit: 'score', required: true },
    { key: 'consistencia_canais', label: 'Consistência entre Canais', unit: '%', required: true },
    { key: 'engajamento_medio', label: 'Engajamento Médio', unit: '%', required: true },
    { key: 'share_of_voice', label: 'Share of Voice', unit: '%', required: false }
  ];

  const conteudoKPIs = [
    { key: 'taxa_publicacao', label: 'Taxa de Publicação no Prazo', unit: '%', required: true },
    { key: 'engajamento_medio', label: 'Engajamento Médio', unit: '%', required: true },
    { key: 'leads_qualificados', label: 'Leads Qualificados', unit: 'número', required: true },
    { key: 'trafego_organico', label: 'Tráfego Orgânico', unit: 'número', required: true }
  ];

  const marketing360KPIs = [
    { key: 'roas', label: 'ROAS', unit: 'ratio', required: true },
    { key: 'cac', label: 'CAC', unit: 'BRL', required: true },
    { key: 'leads_qualificados', label: 'Leads Qualificados', unit: 'número', required: true },
    { key: 'taxa_aprovacao_ciclo', label: 'Taxa de Aprovação no Ciclo', unit: '%', required: true }
  ];

  // KPIs por tipo de serviço (novos + legados)
  const serviceKPIs = {
    diagnostico_comunicacao: diagnosticoKPIs,
    diagnostico_avulso: diagnosticoKPIs,
    estrategia_conteudo: conteudoKPIs,
    mentoria_margem: conteudoKPIs,
    marketing_360: marketing360KPIs,
    gestao_360: marketing360KPIs
  };

  const currentKPIs = serviceKPIs[serviceType] || serviceKPIs['diagnostico_comunicacao'];

  useEffect(() => {
    if (isOpen) {
      // Inicializar com período atual
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setPeriod(currentPeriod);
      
      // Limpar dados anteriores
      setKpiData({});
      setValidationErrors({});
      setError(null);
    }
  }, [isOpen, serviceType]);

  const handleKPIChange = (key, value) => {
    setKpiData(prev => ({ ...prev, [key]: value }));
    
    // Limpar erro do campo quando usuário digita
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const validateData = () => {
    const errors = {};
    
    // Validar período
    if (!period) {
      errors.period = 'Período é obrigatório';
    }
    
    // Validar KPIs obrigatórios
    currentKPIs.forEach(kpi => {
      if (kpi.required && (!kpiData[kpi.key] || kpiData[kpi.key] === '')) {
        errors[kpi.key] = `${kpi.label} é obrigatório`;
      }
      
      // Validar formato numérico
      if (kpiData[kpi.key] && isNaN(parseFloat(kpiData[kpi.key]))) {
        errors[kpi.key] = `${kpi.label} deve ser um número válido`;
      }
      
      // Validar valores positivos para a maioria dos KPIs
      if (kpiData[kpi.key] && parseFloat(kpiData[kpi.key]) < 0) {
        errors[kpi.key] = `${kpi.label} deve ser um valor positivo`;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatValue = (value, unit) => {
    if (!value) return '';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    
    if (unit === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    }
    
    if (unit === '%') {
      return `${numValue.toFixed(1)}%`;
    }
    
    if (unit === 'dias') {
      return `${numValue} dias`;
    }
    
    if (unit === 'vezes') {
      return `${numValue.toFixed(1)}x`;
    }

    if (unit === 'ratio') {
      return `${numValue.toFixed(2)}x`;
    }

    if (unit === 'score') {
      return `${numValue.toFixed(1)}/10`;
    }

    if (unit === 'número') {
      return new Intl.NumberFormat('pt-BR').format(numValue);
    }
    
    return new Intl.NumberFormat('pt-BR').format(numValue);
  };

  const handleSave = async () => {
    if (!validateData()) {
      toast.error('Por favor, corrija os erros antes de salvar');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Preparar dados para envio
      const dataToSave = {
        clientId,
        serviceId,
        period,
        kpis: currentKPIs.map(kpi => ({
          key: kpi.key,
          label: kpi.label,
          unit: kpi.unit,
          value: kpiData[kpi.key] ? parseFloat(kpiData[kpi.key]) : null,
          source: 'manual_input',
          inputBy: user.email,
          inputAt: new Date().toISOString()
        })).filter(kpi => kpi.value !== null),
        metadata: {
          inputMethod: 'manual',
          inputBy: user.email,
          inputAt: new Date().toISOString(),
          serviceType
        }
      };

      // Simular chamada da API (substituir pela API real)
      const response = await fetch('/api/financial-kpis/save-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar dados: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast.success('KPIs salvos com sucesso!');
      onDataSaved(result);
      onClose();

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setKpiData({});
    setPeriod('');
    setValidationErrors({});
    setError(null);
    onClose();
  };

  const getTrendIcon = (kpi) => {
    // Simular tendência baseada no valor (para demonstração)
    const value = parseFloat(kpiData[kpi.key]);
    if (!value) return null;
    
    if (['roas', 'engajamento', 'clareza', 'share_of_voice', 'leads', 'trafego', 'taxa_publicacao'].some(k => kpi.key.includes(k))) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    }
    if (['cac'].some(k => kpi.key.includes(k))) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Inserção Manual de KPIs
          </DialogTitle>
          <DialogDescription>
            Insira manualmente os indicadores de marketing e performance para o período selecionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="period">Mês/Ano *</Label>
                <Input
                  id="period"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className={validationErrors.period ? 'border-red-500' : ''}
                />
                {validationErrors.period && (
                  <p className="text-sm text-red-600">{validationErrors.period}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Indicadores de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentKPIs.map((kpi, index) => (
                  <motion.div
                    key={kpi.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {kpi.unit === 'BRL' && <DollarSign className="w-4 h-4 text-green-600" />}
                        {kpi.unit === '%' && <Percent className="w-4 h-4 text-blue-600" />}
                        {kpi.unit === 'dias' && <Calendar className="w-4 h-4 text-purple-600" />}
                        <Label htmlFor={kpi.key} className="font-medium">
                          {kpi.label} {kpi.required && <span className="text-red-500">*</span>}
                        </Label>
                        {getTrendIcon(kpi)}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          id={kpi.key}
                          type="number"
                          step="0.01"
                          value={kpiData[kpi.key] || ''}
                          onChange={(e) => handleKPIChange(kpi.key, e.target.value)}
                          placeholder={`Digite o valor em ${kpi.unit}`}
                          className={`flex-1 ${validationErrors[kpi.key] ? 'border-red-500' : ''}`}
                        />
                        <div className="w-32 text-sm text-gray-600 text-right">
                          {kpiData[kpi.key] && formatValue(kpiData[kpi.key], kpi.unit)}
                        </div>
                      </div>
                      
                      {validationErrors[kpi.key] && (
                        <p className="text-sm text-red-600">{validationErrors[kpi.key]}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          {Object.keys(kpiData).length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">Resumo dos Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-800">Período:</span>
                    <span className="font-medium text-blue-900">
                      {period ? new Date(period + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">KPIs preenchidos:</span>
                    <span className="font-medium text-blue-900">
                      {Object.values(kpiData).filter(v => v && v !== '').length} / {currentKPIs.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Método:</span>
                    <span className="font-medium text-blue-900">Inserção manual</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || Object.keys(kpiData).length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar KPIs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

