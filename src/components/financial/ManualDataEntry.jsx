
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Percent,
  Hash
} from 'lucide-react';
import { FinancialKPI } from '@/api/entities';
import { updateKPIWithHistory } from '@/api/functions';
import { calculateKPIs } from '@/api/functions';

const INPUT_MODES = {
  VALUE: 'value', // Inserção direta do valor final
  COMPONENTS: 'components', // Inserção dos componentes da fórmula
  FORMULA: 'formula' // Inserção com cálculo automático
};

const FINANCIAL_PERIODS = [
  { value: 'current', label: 'Mês Atual' },
  { value: 'previous', label: 'Mês Anterior' },
  { value: 'custom', label: 'Período Personalizado' }
];

export default function ManualDataEntry({ 
  clientId, 
  serviceId,
  selectedKPIs = [],
  onDataSaved,
  onError,
  className = "" 
}) {
  const [kpis, setKpis] = useState([]);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [inputMode, setInputMode] = useState(INPUT_MODES.VALUE);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [customPeriod, setCustomPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados dos formulários
  const [directValue, setDirectValue] = useState('');
  const [componentsData, setComponentsData] = useState({});
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState(100);

  const loadKPIs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = { clientId, is_current: true };
      if (serviceId) filters.service_instance_id = serviceId;

      let kpiData = await FinancialKPI.filter(filters, '-name', 50);

      // Filtrar pelos KPIs selecionados se especificados
      if (selectedKPIs.length > 0) {
        kpiData = kpiData.filter(kpi => selectedKPIs.includes(kpi.id));
      }

      setKpis(kpiData);

      if (kpiData.length > 0) {
        setSelectedKPI(kpiData[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
      setError('Erro ao carregar KPIs para entrada manual');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, selectedKPIs]);

  const resetForm = useCallback(() => {
    setDirectValue(selectedKPI?.current_value?.toString() || '');
    setComponentsData({});
    setNotes('');
    setConfidence(100);
    setSuccess(null);
    setError(null);

    // Se o KPI tem fórmula, inicializar componentes
    if (selectedKPI?.calc_formula_id && selectedKPI?.formula_definition?.required_inputs) {
      const initialComponents = {};
      selectedKPI.formula_definition.required_inputs.forEach(input => {
        initialComponents[input.field_name] = '';
      });
      setComponentsData(initialComponents);
    }
  }, [selectedKPI]);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  useEffect(() => {
    if (selectedKPI) {
      resetForm();
    }
  }, [selectedKPI, resetForm]);

  const formatCurrency = (value) => {
    if (!value) return '';
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const formatPercentage = (value) => {
    if (!value) return '';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const getUnitDisplay = (unit, value) => {
    switch (unit) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'ratio':
        return `${value}:1`;
      case 'days':
        return `${value} dias`;
      default:
        return value;
    }
  };

  const validateInput = (value, kpi) => {
    const errors = [];

    if (!value || value === '') {
      errors.push('Valor é obrigatório');
      return errors;
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      errors.push('Valor deve ser um número válido');
      return errors;
    }

    // Validações específicas por tipo
    if (kpi.unit === 'percentage' && (numValue < 0 || numValue > 100)) {
      errors.push('Percentual deve estar entre 0 e 100');
    }

    if (kpi.alert_thresholds) {
      if (kpi.alert_thresholds.critical_low && numValue < kpi.alert_thresholds.critical_low) {
        errors.push(`Valor abaixo do limite crítico (${kpi.alert_thresholds.critical_low})`);
      }
      if (kpi.alert_thresholds.critical_high && numValue > kpi.alert_thresholds.critical_high) {
        errors.push(`Valor acima do limite crítico (${kpi.alert_thresholds.critical_high})`);
      }
    }

    return errors;
  };

  const calculateFromComponents = async () => {
    if (!selectedKPI?.calc_formula_id) {
      setError('KPI não possui fórmula de cálculo definida');
      return;
    }

    try {
      setCalculating(true);
      setError(null);

      // Simular cálculo (seria feito pelo backend)
      const result = await calculateKPIs({
        kpiIds: [selectedKPI.id],
        forceRecalculate: true
      });

      if (result.success && result.results.length > 0) {
        const calculatedValue = result.results[0].newValue;
        setDirectValue(calculatedValue.toString());
        setSuccess(`Valor calculado: ${getUnitDisplay(selectedKPI.unit, calculatedValue)}`);
      } else {
        throw new Error(result.error || 'Erro no cálculo');
      }
    } catch (err) {
      console.error('Erro ao calcular:', err);
      setError('Erro ao calcular valor automaticamente');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedKPI) return;

    const validationErrors = validateInput(directValue, selectedKPI);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const value = parseFloat(directValue);
      const updateData = {
        current_value: value,
        data_source: 'manual_entry',
        calculation_notes: notes,
        last_calculated_at: new Date().toISOString()
      };

      // Adicionar metadados da entrada manual
      const manualMetadata = {
        input_mode: inputMode,
        period: selectedPeriod,
        custom_period: customPeriod,
        confidence_score: confidence,
        components_data: inputMode === INPUT_MODES.COMPONENTS ? componentsData : null,
        entered_by: 'manual',
        entry_timestamp: new Date().toISOString()
      };

      const result = await updateKPIWithHistory({
        kpiId: selectedKPI.id,
        updates: updateData,
        reason: `Entrada manual de dados - ${inputMode === INPUT_MODES.VALUE ? 'valor direto' : 'componentes calculados'}`,
        preserveHistory: true
      });

      if (result.success) {
        setSuccess(`Valor salvo com sucesso: ${getUnitDisplay(selectedKPI.unit, value)}`);
        
        // Atualizar a lista local
        setKpis(prev => prev.map(kpi => 
          kpi.id === selectedKPI.id 
            ? { ...kpi, current_value: value, ...updateData }
            : kpi
        ));

        if (onDataSaved) {
          onDataSaved({
            kpiId: selectedKPI.id,
            value,
            metadata: manualMetadata
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError(`Erro ao salvar: ${err.message}`);
      if (onError) onError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedKPI) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Nenhum KPI disponível para entrada manual
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Seletor de KPI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Entrada Manual de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kpi-selector">Selecionar KPI</Label>
              <Select
                value={selectedKPI.id}
                onValueChange={(value) => {
                  const kpi = kpis.find(k => k.id === value);
                  setSelectedKPI(kpi);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um KPI" />
                </SelectTrigger>
                <SelectContent>
                  {kpis.map((kpi) => (
                    <SelectItem key={kpi.id} value={kpi.id}>
                      <div className="flex items-center gap-2">
                        <span>{kpi.name}</span>
                        <Badge variant="outline">{kpi.category}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period-selector">Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriod === 'custom' && (
                <Input
                  type="month"
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Informações do KPI Selecionado */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium">{selectedKPI.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedKPI.description}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {getUnitDisplay(selectedKPI.unit, selectedKPI.current_value || 0)}
                </div>
                <div className="text-sm text-gray-600">Valor Atual</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {getUnitDisplay(selectedKPI.unit, selectedKPI.target_value || 0)}
                </div>
                <div className="text-sm text-gray-600">Meta</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modos de Entrada */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de Entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={inputMode} onValueChange={setInputMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value={INPUT_MODES.VALUE} className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Valor Direto
              </TabsTrigger>
              <TabsTrigger 
                value={INPUT_MODES.COMPONENTS} 
                className="flex items-center gap-2"
                disabled={!selectedKPI?.calc_formula_id}
              >
                <Calculator className="w-4 h-4" />
                Por Componentes
              </TabsTrigger>
            </TabsList>

            {/* Entrada de Valor Direto */}
            <TabsContent value={INPUT_MODES.VALUE} className="space-y-4 mt-6">
              <div>
                <Label htmlFor="direct-value">
                  Valor do KPI {selectedKPI.unit === 'currency' && '(R$)'}
                  {selectedKPI.unit === 'percentage' && '(%)'}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="direct-value"
                    type="number"
                    step={selectedKPI.unit === 'currency' ? '0.01' : 'any'}
                    placeholder={`Digite o valor${selectedKPI.unit === 'percentage' ? ' (0-100)' : ''}`}
                    value={directValue}
                    onChange={(e) => setDirectValue(e.target.value)}
                  />
                  {selectedKPI.unit === 'currency' && (
                    <div className="flex items-center px-3 bg-gray-100 rounded-md">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  {selectedKPI.unit === 'percentage' && (
                    <div className="flex items-center px-3 bg-gray-100 rounded-md">
                      <Percent className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
                {directValue && (
                  <p className="text-sm text-gray-600 mt-1">
                    Valor formatado: <strong>{getUnitDisplay(selectedKPI.unit, directValue)}</strong>
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Entrada por Componentes */}
            <TabsContent value={INPUT_MODES.COMPONENTS} className="space-y-4 mt-6">
              {selectedKPI?.formula_definition?.required_inputs ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Insira os valores dos componentes para calcular automaticamente:
                  </p>

                  {selectedKPI.formula_definition.required_inputs.map((input) => (
                    <div key={input.field_name}>
                      <Label htmlFor={`component-${input.field_name}`}>
                        {input.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {input.data_type === 'currency' && ' (R$)'}
                        {input.data_type === 'percentage' && ' (%)'}
                        {input.required && ' *'}
                      </Label>
                      <Input
                        id={`component-${input.field_name}`}
                        type="number"
                        step="0.01"
                        placeholder={`Digite ${input.field_name}`}
                        value={componentsData[input.field_name] || ''}
                        onChange={(e) => 
                          setComponentsData(prev => ({
                            ...prev,
                            [input.field_name]: e.target.value
                          }))
                        }
                      />
                    </div>
                  ))}

                  <Button
                    onClick={calculateFromComponents}
                    disabled={calculating}
                    className="w-full"
                  >
                    {calculating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4 mr-2" />
                        Calcular KPI
                      </>
                    )}
                  </Button>

                  {directValue && (
                    <Alert>
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertDescription>
                        Resultado calculado: <strong>{getUnitDisplay(selectedKPI.unit, directValue)}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Este KPI não possui fórmula de cálculo definida. Use o modo de valor direto.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          {/* Campos Adicionais */}
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="confidence">Nível de Confiança (%)</Label>
              <Input
                id="confidence"
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="mt-1"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0% - Baixa</span>
                <span className="font-medium">{confidence}%</span>
                <span>100% - Alta</span>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre este valor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 mt-6">
            <Button 
              onClick={handleSave} 
              disabled={saving || !directValue}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Valor
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={resetForm}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
