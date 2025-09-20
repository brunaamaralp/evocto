
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  AlertCircle, 
  Check, 
  X, 
  Edit2,
  RotateCcw,
  Info
} from 'lucide-react';

const KPICustomizationPanel = ({ 
  templateKPIs = [], 
  onKPIsChange,
  className = '' 
}) => {
  const [customizedKPIs, setCustomizedKPIs] = useState([]);
  const [editingKPI, setEditingKPI] = useState(null);

  // Inicializar KPIs customizados baseados no template
  useEffect(() => {
    if (templateKPIs.length > 0) {
      const initialKPIs = templateKPIs.map(kpi => ({
        ...kpi,
        // Valores customizáveis
        customTarget: kpi.target_value || 0,
        customFrequency: kpi.frequency || 'monthly',
        customPriority: kpi.priority || 'medium',
        customDescription: kpi.description || '',
        isEnabled: !kpi.is_mandatory, // KPIs obrigatórios sempre habilitados
        isCustomized: false,
        // Metadados
        originalValues: {
          target_value: kpi.target_value,
          frequency: kpi.frequency,
          priority: kpi.priority,
          description: kpi.description
        }
      }));
      
      setCustomizedKPIs(initialKPIs);
      onKPIsChange?.(initialKPIs);
    }
  }, [templateKPIs, onKPIsChange]); // Fixed: Added onKPIsChange to dependency array

  const handleKPIChange = (kpiIndex, field, value) => {
    const updatedKPIs = [...customizedKPIs];
    const kpi = updatedKPIs[kpiIndex];
    
    // Atualizar valor
    kpi[field] = value;
    
    // Marcar como customizado se mudou do valor original
    let originalField = field.replace('custom', '').toLowerCase();
    if (originalField === 'target') originalField = 'target_value';
    
    const hasChanged = kpi.originalValues[originalField] !== value;
    kpi.isCustomized = hasChanged || 
      kpi.originalValues.target_value !== kpi.customTarget ||
      kpi.originalValues.frequency !== kpi.customFrequency ||
      kpi.originalValues.priority !== kpi.customPriority ||
      kpi.originalValues.description !== kpi.customDescription;
    
    setCustomizedKPIs(updatedKPIs);
    onKPIsChange?.(updatedKPIs);
  };

  const handleToggleKPI = (kpiIndex) => {
    const updatedKPIs = [...customizedKPIs];
    const kpi = updatedKPIs[kpiIndex];
    
    // Não permitir desabilitar KPIs obrigatórios
    if (kpi.is_mandatory) return;
    
    kpi.isEnabled = !kpi.isEnabled;
    setCustomizedKPIs(updatedKPIs);
    onKPIsChange?.(updatedKPIs);
  };

  const resetKPI = (kpiIndex) => {
    const updatedKPIs = [...customizedKPIs];
    const kpi = updatedKPIs[kpiIndex];
    
    // Resetar para valores originais
    kpi.customTarget = kpi.originalValues.target_value || 0;
    kpi.customFrequency = kpi.originalValues.frequency || 'monthly';
    kpi.customPriority = kpi.originalValues.priority || 'medium';
    kpi.customDescription = kpi.originalValues.description || '';
    kpi.isCustomized = false;
    
    setCustomizedKPIs(updatedKPIs);
    onKPIsChange?.(updatedKPIs);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      liquidez: '💧',
      rentabilidade: '📈',
      endividamento: '⚖️',
      atividade: '⚡',
      crescimento: '🚀'
    };
    return icons[category] || '📊';
  };

  if (templateKPIs.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este template não possui KPIs padrão configurados. Você pode adicionar KPIs manualmente após criar a instância.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Personalizar Indicadores (KPIs)</h3>
          <p className="text-sm text-gray-600">
            Ajuste os KPIs que serão herdados do template para este cliente específico
          </p>
        </div>
        <Badge variant="outline" className="ml-2">
          {customizedKPIs.filter(k => k.isEnabled).length} de {customizedKPIs.length} ativos
        </Badge>
      </div>

      <div className="grid gap-3">
        {customizedKPIs.map((kpi, index) => (
          <Card 
            key={`${kpi.name}-${index}`} 
            className={`transition-all ${
              !kpi.isEnabled ? 'opacity-50 bg-gray-50' : 
              kpi.isCustomized ? 'border-orange-200 bg-orange-50' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(kpi.category)}</span>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {kpi.name}
                      {kpi.is_mandatory && (
                        <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                      )}
                      {kpi.isCustomized && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          <Edit2 className="w-3 h-3 mr-1" />
                          Personalizado
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600 capitalize">
                      {kpi.category} • {kpi.unit || 'número'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {kpi.isCustomized && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetKPI(index)}
                      className="h-8 w-8 p-0"
                      title="Resetar para valores originais"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Switch
                    checked={kpi.isEnabled}
                    onCheckedChange={() => handleToggleKPI(index)}
                    disabled={kpi.is_mandatory}
                  />
                </div>
              </div>
            </CardHeader>
            
            {kpi.isEnabled && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Meta/Target */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs">
                      <Target className="h-3 w-3" />
                      Meta
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={kpi.customTarget}
                      onChange={(e) => handleKPIChange(index, 'customTarget', parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 1.5"
                      className="h-8"
                    />
                  </div>
                  
                  {/* Frequência */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      Frequência
                    </Label>
                    <Select 
                      value={kpi.customFrequency} 
                      onValueChange={(value) => handleKPIChange(index, 'customFrequency', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Prioridade */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      Prioridade
                    </Label>
                    <Select 
                      value={kpi.customPriority} 
                      onValueChange={(value) => handleKPIChange(index, 'customPriority', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Descrição customizada */}
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Observações específicas deste cliente</Label>
                  <Textarea
                    value={kpi.customDescription}
                    onChange={(e) => handleKPIChange(index, 'customDescription', e.target.value)}
                    placeholder="Ex: Para este cliente, considerar sazonalidade do setor..."
                    className="h-16 text-sm resize-none"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      
      {/* Resumo das customizações */}
      {customizedKPIs.some(k => k.isCustomized || !k.isEnabled) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Personalizações aplicadas:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              {customizedKPIs.filter(k => k.isCustomized).map(k => (
                <li key={k.name} className="text-xs">
                  <span className="font-medium">{k.name}</span> foi personalizado
                </li>
              ))}
              {customizedKPIs.filter(k => !k.isEnabled && !k.is_mandatory).map(k => (
                <li key={k.name} className="text-xs text-red-600">
                  <span className="font-medium">{k.name}</span> foi desabilitado
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default KPICustomizationPanel;
