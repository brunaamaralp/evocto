
import React, { useState, useEffect, useCallback } from 'react';
import { FinancialKPI } from '@/api/entities';
import { KPIFormulaDefinition } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // This import is not used in the current code, but keeping it as it was in the original file.
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch, History, Calculator, Eye, Check, X,
  AlertTriangle, Clock, FileText, Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function KPIVersionManager({
  kpiId,
  clientId,
  onVersionChange,
  className = ''
}) {
  const [kpiHistory, setKpiHistory] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState(null);
  const [showNewVersion, setShowNewVersion] = useState(false);

  const [newVersionForm, setNewVersionForm] = useState({
    target_value: '',
    min_acceptable: '',
    max_acceptable: '',
    alert_thresholds: {
      critical_low: '',
      warning_low: '',
      warning_high: '',
      critical_high: ''
    },
    change_reason: '',
    effective_from: new Date().toISOString().split('T')[0]
  });

  // Memoize loadKPIVersions to be stable across re-renders for useEffect dependencies
  const loadKPIVersions = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar todas as versões do KPI (SCD2)
      const versions = await FinancialKPI.filter({
        clientId,
        name: kpiId // Assumindo que estamos passando o nome como ID
      }, '-version');

      setKpiHistory(versions || []);

      // Encontrar versão ativa atual
      const current = versions.find(v => v.is_current);
      setActiveVersion(current);

      // Pré-preencher form com valores atuais
      if (current) {
        setNewVersionForm(prev => ({
          ...prev,
          target_value: current.target_value || '',
          min_acceptable: current.min_acceptable || '',
          max_acceptable: current.max_acceptable || '',
          alert_thresholds: {
            critical_low: current.alert_thresholds?.critical_low || '',
            warning_low: current.alert_thresholds?.warning_low || '',
            warning_high: current.alert_thresholds?.warning_high || '',
            critical_high: current.alert_thresholds?.critical_high || ''
          }
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar versões do KPI:', error);
      toast.error('Erro ao carregar histórico do KPI');
    } finally {
      setLoading(false);
    }
  }, [clientId, kpiId, setKpiHistory, setActiveVersion, setNewVersionForm, setLoading]); // Dependencies for useCallback

  // Memoize loadFormulas to be stable across re-renders for useEffect dependencies
  const loadFormulas = useCallback(async () => {
    try {
      const formulasList = await KPIFormulaDefinition.filter({
        is_active: true
      }, '-version');

      setFormulas(formulasList || []);
    } catch (error) {
      console.error('Erro ao carregar fórmulas:', error);
    }
  }, [setFormulas]); // Dependencies for useCallback

  // Use useEffect to load data when kpiId changes
  // Added loadKPIVersions and loadFormulas to the dependency array,
  // hence why they were wrapped in useCallback.
  useEffect(() => {
    if (kpiId) {
      loadKPIVersions();
      loadFormulas();
    }
  }, [kpiId, loadKPIVersions, loadFormulas]);

  // Memoize createNewVersion as it depends on state/props and is used in an event handler
  const createNewVersion = useCallback(async (e) => {
    e.preventDefault();

    if (!activeVersion) {
      toast.error('Versão ativa não encontrada');
      return;
    }

    try {
      const now = new Date().toISOString();

      // 1. Marcar versão atual como não-ativa
      await FinancialKPI.update(activeVersion.id, {
        is_current: false,
        effective_to: now
      });

      // 2. Criar nova versão
      const newVersion = {
        ...activeVersion,
        id: undefined, // Novo ID será gerado
        version: activeVersion.version + 1,
        target_value: parseFloat(newVersionForm.target_value) || null,
        min_acceptable: parseFloat(newVersionForm.min_acceptable) || null,
        max_acceptable: parseFloat(newVersionForm.max_acceptable) || null,
        alert_thresholds: {
          critical_low: parseFloat(newVersionForm.alert_thresholds.critical_low) || null,
          warning_low: parseFloat(newVersionForm.alert_thresholds.warning_low) || null,
          warning_high: parseFloat(newVersionForm.alert_thresholds.warning_high) || null,
          critical_high: parseFloat(newVersionForm.alert_thresholds.critical_high) || null
        },
        is_current: true,
        effective_from: new Date(newVersionForm.effective_from).toISOString(),
        effective_to: null,
        calculation_metadata: {
          ...activeVersion.calculation_metadata,
          change_reason: newVersionForm.change_reason,
          changed_at: now,
          previous_version: activeVersion.version
        }
      };

      await FinancialKPI.create(newVersion);

      toast.success(`Nova versão ${newVersion.version} criada com sucesso!`);
      setShowNewVersion(false);

      // Recarregar dados
      await loadKPIVersions();

      if (onVersionChange) {
        onVersionChange(newVersion);
      }

    } catch (error) {
      console.error('Erro ao criar nova versão:', error);
      toast.error('Erro ao criar nova versão do KPI');
    }
  }, [activeVersion, newVersionForm, loadKPIVersions, onVersionChange]); // Dependencies for useCallback

  const getVersionStatus = (version) => {
    if (version.is_current) {
      return { label: 'Ativa', color: 'bg-green-100 text-green-800', icon: Check };
    }

    if (version.effective_to) {
      return { label: 'Histórica', color: 'bg-gray-100 text-gray-700', icon: History };
    }

    return { label: 'Futura', color: 'bg-blue-100 text-blue-800', icon: Clock };
  };

  const calculateDataLineage = (version) => {
    const lineage = {
      entities_used: version.source_refs?.length || 0,
      formula_version: version.calculation_metadata?.formula_version || 'N/A',
      last_calculated: version.last_calculated_at ?
        new Date(version.last_calculated_at).toLocaleDateString() : 'Nunca',
      data_quality: version.calculation_metadata?.confidence_score || 0
    };

    return lineage;
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="versions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="versions">
            <GitBranch className="w-4 h-4 mr-2" />
            Versões ({kpiHistory.length})
          </TabsTrigger>
          <TabsTrigger value="formulas">
            <Calculator className="w-4 h-4 mr-2" />
            Fórmulas Disponíveis
          </TabsTrigger>
          <TabsTrigger value="lineage">
            <Database className="w-4 h-4 mr-2" />
            Data Lineage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Histórico de Versões</CardTitle>
                <Button onClick={() => setShowNewVersion(!showNewVersion)}>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Nova Versão
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewVersion && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Criar Nova Versão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createNewVersion} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Meta</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.target_value}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              target_value: e.target.value
                            }))}
                            placeholder="Valor da meta"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Mín. Aceitável</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.min_acceptable}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              min_acceptable: e.target.value
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Máx. Aceitável</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.max_acceptable}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              max_acceptable: e.target.value
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium">Crítico Baixo</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.alert_thresholds.critical_low}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              alert_thresholds: {
                                ...prev.alert_thresholds,
                                critical_low: e.target.value
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Alerta Baixo</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.alert_thresholds.warning_low}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              alert_thresholds: {
                                ...prev.alert_thresholds,
                                warning_low: e.target.value
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Alerta Alto</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.alert_thresholds.warning_high}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              alert_thresholds: {
                                ...prev.alert_thresholds,
                                warning_high: e.target.value
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Crítico Alto</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVersionForm.alert_thresholds.critical_high}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              alert_thresholds: {
                                ...prev.alert_thresholds,
                                critical_high: e.target.value
                              }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Data de Vigência</label>
                          <Input
                            type="date"
                            value={newVersionForm.effective_from}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              effective_from: e.target.value
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Motivo da Mudança</label>
                          <Input
                            value={newVersionForm.change_reason}
                            onChange={(e) => setNewVersionForm(prev => ({
                              ...prev,
                              change_reason: e.target.value
                            }))}
                            placeholder="Ex: Ajuste de meta trimestral"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button type="submit">
                          <Check className="w-4 h-4 mr-2" />
                          Criar Versão
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewVersion(false)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {kpiHistory.map((version, index) => {
                  const status = getVersionStatus(version);
                  const StatusIcon = status.icon;
                  const lineage = calculateDataLineage(version);

                  return (
                    <Card key={version.id} className="relative">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={status.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                            <div>
                              <h4 className="font-semibold">Versão {version.version}</h4>
                              <p className="text-sm text-gray-600">
                                {version.effective_from ?
                                  new Date(version.effective_from).toLocaleDateString() :
                                  'Data não definida'
                                }
                                {version.effective_to && (
                                  ` - ${new Date(version.effective_to).toLocaleDateString()}`
                                )}
                              </p>
                            </div>
                          </div>

                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Detalhes
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Meta:</span>
                            <span className="ml-2">{version.target_value || 'N/D'}</span>
                          </div>
                          <div>
                            <span className="font-medium">Min/Max:</span>
                            <span className="ml-2">
                              {version.min_acceptable || 'N/D'} / {version.max_acceptable || 'N/D'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Fórmula:</span>
                            <span className="ml-2">{lineage.formula_version}</span>
                          </div>
                          <div>
                            <span className="font-medium">Qualidade:</span>
                            <span className="ml-2">{lineage.data_quality}%</span>
                          </div>
                        </div>

                        {version.calculation_metadata?.change_reason && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <strong>Motivo:</strong> {version.calculation_metadata.change_reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formulas">
          <Card>
            <CardHeader>
              <CardTitle>Fórmulas de Cálculo Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formulas.map((formula) => (
                  <Card key={formula.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{formula.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{formula.description}</p>
                          <Badge variant="outline">{formula.version}</Badge>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {formula.category}
                        </Badge>
                      </div>

                      <div className="mt-3 p-3 bg-gray-50 rounded font-mono text-sm">
                        {formula.formula_expression}
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        <strong>Campos obrigatórios:</strong>{' '}
                        {formula.required_inputs?.map(input => input.field_name).join(', ')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineage">
          <Card>
            <CardHeader>
              <CardTitle>Data Lineage - Proveniência dos Dados</CardTitle>
            </CardHeader>
            <CardContent>
              {activeVersion ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold">Fontes de Dados</div>
                          <div className="text-2xl">{activeVersion.source_refs?.length || 0}</div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-semibold">Último Cálculo</div>
                          <div className="text-sm">
                            {activeVersion.last_calculated_at ?
                              new Date(activeVersion.last_calculated_at).toLocaleDateString() :
                              'Nunca'
                            }
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="font-semibold">Qualidade</div>
                          <div className="text-2xl">
                            {activeVersion.calculation_metadata?.confidence_score || 0}%
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {activeVersion.source_refs && activeVersion.source_refs.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Entidades e Campos Utilizados</h4>
                      <div className="space-y-2">
                        {activeVersion.source_refs.map((ref, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{ref.entity_type}</span>
                              <span className="mx-2">→</span>
                              <span className="text-gray-600">{ref.field_path}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {ref.accessed_at ?
                                new Date(ref.accessed_at).toLocaleDateString() :
                                'Data não registrada'
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeVersion.calculation_metadata?.data_quality_issues && (
                    <div>
                      <h4 className="font-semibold mb-3">Problemas de Qualidade Identificados</h4>
                      <div className="space-y-2">
                        {activeVersion.calculation_metadata.data_quality_issues.map((issue, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma versão ativa encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
