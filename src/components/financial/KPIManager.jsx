
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  History, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown, // Added TrendingDown here
  Calculator,
  Target,
  Clock,
  MoreHorizontal,
  Upload,
  Download
} from 'lucide-react';
import { FinancialKPI } from '@/api/entities';
import { KPIFormulaDefinition } from '@/api/entities';
import { calculateKPIs } from '@/api/functions';
import { updateKPIWithHistory } from '@/api/functions';
import { validateKPIFormula } from '@/api/functions';
import KPIChart from './KPIChart';
import EmptyKPIState from './EmptyKPIState';
import { PERFORMANCE_KPI_CATEGORIES, DEFAULT_KPI_CATEGORY, resolveKPICategory } from '@/constants/performanceKPIs';

const KPI_CATEGORIES = PERFORMANCE_KPI_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
  color: c.color,
}));

const getCategoryConfig = (categoryKey) =>
  KPI_CATEGORIES.find((c) => c.value === resolveKPICategory(categoryKey));

const KPI_PRIORITIES = [
  { value: 'low', label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Média', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700' }
];

const KPI_UNITS = [
  { value: 'percentage', label: 'Percentual (%)' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'ratio', label: 'Razão (x:1)' },
  { value: 'days', label: 'Dias' },
  { value: 'number', label: 'Número' }
];

export default function KPIManager({ 
  clientId, 
  serviceId, 
  onKPIUpdate,
  className = "" 
}) {
  const [kpis, setKpis] = useState([]);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [editingKPI, setEditingKPI] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Estados para edição
  const [editForm, setEditForm] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [availableFormulas, setAvailableFormulas] = useState([]);

  const loadKPIs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = { clientId, is_current: true };
      if (serviceId) filters.service_instance_id = serviceId;

      const kpiData = await FinancialKPI.filter(filters, '-priority', 50);
      setKpis(kpiData);

      if (kpiData.length > 0 && !selectedKPI) {
        setSelectedKPI(kpiData[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
      setError('Erro ao carregar KPIs');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, selectedKPI]);

  const loadFormulas = useCallback(async () => {
    try {
      const formulas = await KPIFormulaDefinition.filter({ 
        is_active: true 
      }, '-name', 100);
      setAvailableFormulas(formulas);
    } catch (err) {
      console.error('Erro ao carregar fórmulas:', err);
    }
  }, []);

  useEffect(() => {
    loadKPIs();
    loadFormulas();
  }, [loadKPIs, loadFormulas]);

  const handleEditStart = (kpi) => {
    setEditingKPI(kpi);
    setEditForm({
      name: kpi.name || '',
      description: kpi.description || '',
      category: resolveKPICategory(kpi.category) || DEFAULT_KPI_CATEGORY,
      priority: kpi.priority || 'medium',
      unit: kpi.unit || 'number',
      target_value: kpi.target_value || '',
      min_acceptable: kpi.min_acceptable || '',
      max_acceptable: kpi.max_acceptable || '',
      frequency: kpi.frequency || 'monthly',
      calc_formula_id: kpi.calc_formula_id || '',
      alert_thresholds: kpi.alert_thresholds || {
        critical_low: '',
        warning_low: '',
        warning_high: '',
        critical_high: ''
      }
    });
    setValidationResult(null);
    setActiveTab('edit');
  };

  const handleEditCancel = () => {
    setEditingKPI(null);
    setEditForm({});
    setValidationResult(null);
    setActiveTab('overview');
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validar dados antes de salvar
      if (!editForm.name?.trim()) {
        throw new Error('Nome do KPI é obrigatório');
      }

      const updateData = {
        ...editForm,
        target_value: parseFloat(editForm.target_value) || null,
        min_acceptable: parseFloat(editForm.min_acceptable) || null,
        max_acceptable: parseFloat(editForm.max_acceptable) || null
      };

      // Usar função de histórico para preservar valores anteriores
      const { data: result } = await updateKPIWithHistory({
        kpiId: editingKPI.id,
        updateData,
        reason: 'Manual edit via KPI Manager'
      });

      if (result.success) {
        await loadKPIs();
        setEditingKPI(null);
        setEditForm({});
        setActiveTab('overview');
        
        if (onKPIUpdate) {
          onKPIUpdate(result.kpi);
        }
      } else {
        throw new Error(result.error || 'Erro ao atualizar KPI');
      }

    } catch (err) {
      console.error('Erro ao salvar KPI:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateKPI = async (kpi) => {
    try {
      setCalculating(true);
      setError(null);

      const { data: result } = await calculateKPIs({
        kpiIds: [kpi.id],
        forceRecalculate: true
      });

      if (result.success && result.results?.[0]?.success) {
        await loadKPIs();
        
        if (onKPIUpdate) {
          onKPIUpdate(result.results[0]);
        }
      } else {
        const errorMsg = result.results?.[0]?.error || result.error || 'Erro no cálculo';
        throw new Error(errorMsg);
      }

    } catch (err) {
      console.error('Erro ao calcular KPI:', err);
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  const handleManualValueUpdate = async (kpi, newValue) => {
    try {
      setSaving(true);
      setError(null);

      const { data: result } = await updateKPIWithHistory({
        kpiId: kpi.id,
        updateData: {
          current_value: parseFloat(newValue),
          data_source: 'manual'
        },
        reason: 'Manual value update'
      });

      if (result.success) {
        await loadKPIs();
        
        if (onKPIUpdate) {
          onKPIUpdate(result.kpi);
        }
      } else {
        throw new Error(result.error || 'Erro ao atualizar valor');
      }

    } catch (err) {
      console.error('Erro ao atualizar valor manual:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'ratio':
        return `${value.toFixed(2)}:1`;
      case 'days':
        return `${Math.round(value)} dias`;
      default:
        return value.toLocaleString('pt-BR');
    }
  };

  const getStatusColor = (current, target, thresholds) => {
    if (!current || !target) return 'text-gray-500';
    
    const deviation = Math.abs((current - target) / target);
    if (deviation <= 0.05) return 'text-green-600';
    if (deviation <= 0.15) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <div className={className}>
        <EmptyKPIState 
          onCreateKPI={() => setActiveTab('create')}
          message="Nenhum KPI configurado para este cliente"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de KPIs */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">KPIs de Performance</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadKPIs}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  onClick={() => setSelectedKPI(kpi)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedKPI?.id === kpi.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{kpi.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatValue(kpi.current_value, kpi.unit)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={getCategoryConfig(kpi.category)?.color}
                      >
                        {getCategoryConfig(kpi.category)?.label}
                      </Badge>
                      {kpi.current_value && kpi.target_value && (
                        <div className={getStatusColor(kpi.current_value, kpi.target_value)}>
                          {kpi.current_value >= kpi.target_value ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Detalhes do KPI Selecionado */}
        <div className="lg:col-span-2">
          {selectedKPI ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="chart">Evolução</TabsTrigger>
                <TabsTrigger value="edit">Editar</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              {/* Aba: Visão Geral */}
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedKPI.name}</CardTitle>
                        <p className="text-gray-600 mt-1">{selectedKPI.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCalculateKPI(selectedKPI)}
                          disabled={calculating}
                        >
                          {calculating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Calculator className="h-4 w-4" />
                          )}
                          Calcular
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditStart(selectedKPI)}
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatValue(selectedKPI.current_value, selectedKPI.unit)}
                        </div>
                        <div className="text-sm text-gray-500">Valor Atual</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatValue(selectedKPI.target_value, selectedKPI.unit)}
                        </div>
                        <div className="text-sm text-gray-500">Meta</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {selectedKPI.current_value && selectedKPI.target_value ? (
                            <span className={getStatusColor(selectedKPI.current_value, selectedKPI.target_value)}>
                              {((selectedKPI.current_value / selectedKPI.target_value - 1) * 100).toFixed(1)}%
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </div>
                        <div className="text-sm text-gray-500">vs Meta</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Categoria:</span>
                        <Badge 
                          variant="secondary" 
                          className={`ml-2 ${getCategoryConfig(selectedKPI.category)?.color}`}
                        >
                          {getCategoryConfig(selectedKPI.category)?.label}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Prioridade:</span>
                        <Badge 
                          variant="secondary" 
                          className={`ml-2 ${KPI_PRIORITIES.find(p => p.value === selectedKPI.priority)?.color}`}
                        >
                          {KPI_PRIORITIES.find(p => p.value === selectedKPI.priority)?.label}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Frequência:</span>
                        <span className="ml-2">{selectedKPI.frequency}</span>
                      </div>
                      <div>
                        <span className="font-medium">Última Atualização:</span>
                        <span className="ml-2">
                          {selectedKPI.last_calculated_at 
                            ? new Date(selectedKPI.last_calculated_at).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Input para valor manual */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-2">Atualização Manual</h4>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Digite o novo valor..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleManualValueUpdate(selectedKPI, e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector('input');
                            if (input.value) {
                              handleManualValueUpdate(selectedKPI, input.value);
                              input.value = '';
                            }
                          }}
                          disabled={saving}
                        >
                          {saving ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba: Gráfico de Evolução */}
              <TabsContent value="chart">
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução - {selectedKPI.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KPIChart 
                      kpi={selectedKPI} 
                      height={300}
                      showTarget={true}
                      showTrend={true}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba: Edição */}
              <TabsContent value="edit">
                {editingKPI && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Editar KPI</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditCancel}
                          >
                            <X className="h-4 w-4" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleEditSave}
                            disabled={saving}
                          >
                            {saving ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome do KPI</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Nome do indicador..."
                          />
                        </div>
                        <div>
                          <Label>Categoria</Label>
                          <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KPI_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Prioridade</Label>
                          <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KPI_PRIORITIES.map(pri => (
                                <SelectItem key={pri.value} value={pri.value}>
                                  {pri.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Unidade</Label>
                          <Select value={editForm.unit} onValueChange={(value) => setEditForm({ ...editForm, unit: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KPI_UNITS.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Descrição do que este KPI mede..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Valor Meta</Label>
                          <Input
                            type="number"
                            value={editForm.target_value}
                            onChange={(e) => setEditForm({ ...editForm, target_value: e.target.value })}
                            placeholder="Meta desejada..."
                          />
                        </div>
                        <div>
                          <Label>Mínimo Aceitável</Label>
                          <Input
                            type="number"
                            value={editForm.min_acceptable}
                            onChange={(e) => setEditForm({ ...editForm, min_acceptable: e.target.value })}
                            placeholder="Valor mínimo..."
                          />
                        </div>
                        <div>
                          <Label>Máximo Aceitável</Label>
                          <Input
                            type="number"
                            value={editForm.max_acceptable}
                            onChange={(e) => setEditForm({ ...editForm, max_acceptable: e.target.value })}
                            placeholder="Valor máximo..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Frequência de Cálculo</Label>
                          <Select value={editForm.frequency} onValueChange={(value) => setEditForm({ ...editForm, frequency: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Diário</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="quarterly">Trimestral</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Fórmula de Cálculo</Label>
                          <Select value={editForm.calc_formula_id} onValueChange={(value) => setEditForm({ ...editForm, calc_formula_id: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar fórmula..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFormulas.map(formula => (
                                <SelectItem key={formula.id} value={formula.formula_id}>
                                  {formula.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Aba: Histórico */}
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Valores - {selectedKPI.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedKPI.historical_values && selectedKPI.historical_values.length > 0 ? (
                      <div className="space-y-2">
                        {selectedKPI.historical_values
                          .sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))
                          .slice(0, 10)
                          .map((entry, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">
                                {formatValue(entry.value, selectedKPI.unit)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.period} - {new Date(entry.calculated_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">
                                {entry.data_hash ? 'Calculado' : 'Manual'}
                              </div>
                              {entry.formula_version && (
                                <div className="text-xs text-gray-400">
                                  v{entry.formula_version}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum histórico disponível
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <p>Selecione um KPI para ver os detalhes</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
