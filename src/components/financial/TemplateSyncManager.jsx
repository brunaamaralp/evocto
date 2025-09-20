
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  ArrowRight,
  Eye,
  Settings,
  GitMerge
} from 'lucide-react';
import { syncTemplateKPIs } from '@/api/functions';
import { Service } from '@/api/entities';

export default function TemplateSyncManager({ 
  templateId, 
  onSyncComplete, 
  className = "" 
}) {
  const [template, setTemplate] = useState(null);
  const [instances, setInstances] = useState([]);
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [selectedKPIs, setSelectedKPIs] = useState([]);
  const [syncResults, setSyncResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [conflictResolution, setConflictResolution] = useState('manual');
  const [error, setError] = useState(null);

  const loadTemplateData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar template
      const templateData = await Service.get(templateId);
      if (!templateData || !templateData.is_template) {
        throw new Error('Template não encontrado');
      }
      setTemplate(templateData);

      // Carregar instâncias
      const instanceData = await Service.filter({
        base_service_id: templateId,
        is_template: false
      });
      setInstances(instanceData);

    } catch (err) {
      console.error('Erro ao carregar dados do template:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [templateId]); // templateId is a dependency here because it's used inside loadTemplateData

  useEffect(() => {
    loadTemplateData();
  }, [loadTemplateData]); // loadTemplateData is now a stable function thanks to useCallback

  const handlePreview = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const result = await syncTemplateKPIs({
        templateId,
        serviceInstanceIds: selectedInstances,
        selectedKPIs,
        syncMode: 'preview'
      });

      setSyncResults(result);
    } catch (err) {
      console.error('Erro na prévia:', err);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      setError(null);

      const result = await syncTemplateKPIs({
        templateId,
        serviceInstanceIds: selectedInstances,
        selectedKPIs,
        syncMode: 'apply',
        conflictResolution
      });

      setSyncResults(result);
      
      if (onSyncComplete) {
        onSyncComplete(result);
      }

    } catch (err) {
      console.error('Erro ao aplicar sincronização:', err);
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'update':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'merge':
        return <GitMerge className="w-4 h-4 text-purple-600" />;
      case 'deactivate':
        return <Minus className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action, hasConflicts = false) => {
    if (hasConflicts) {
      return <Badge className="bg-amber-100 text-amber-800">⚠ Conflito</Badge>;
    }

    const configs = {
      create: { label: 'Novo', className: 'bg-green-100 text-green-800' },
      update: { label: 'Atualizar', className: 'bg-blue-100 text-blue-800' },
      merge: { label: 'Mesclar', className: 'bg-purple-100 text-purple-800' },
      deactivate: { label: 'Desativar', className: 'bg-red-100 text-red-800' },
      no_change: { label: 'Sem mudança', className: 'bg-gray-100 text-gray-800' }
    };

    const config = configs[action] || configs.no_change;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Erro:</strong> {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sincronização de Template</span>
            <Badge className="bg-blue-100 text-blue-800">
              {template?.name} v{template?.version}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de Instâncias */}
          <div>
            <h3 className="font-medium mb-2">Instâncias para Sincronizar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {instances.map((instance) => (
                <div 
                  key={instance.id} 
                  className="flex items-center space-x-2 p-2 border rounded-lg"
                >
                  <Checkbox
                    checked={selectedInstances.includes(instance.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedInstances(prev => [...prev, instance.id]);
                      } else {
                        setSelectedInstances(prev => prev.filter(id => id !== instance.id));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{instance.name}</div>
                    <div className="text-xs text-gray-500">
                      Cliente: {instances.find(i => i.id === instance.id)?.clientId || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {instances.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma instância encontrada para este template
              </div>
            )}
          </div>

          {/* Seleção de KPIs */}
          {template?.default_kpis && template.default_kpis.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">KPIs para Sincronizar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {template.default_kpis.map((kpi, index) => (
                  <div 
                    key={index} 
                    className="flex items-center space-x-2 p-2 border rounded-lg"
                  >
                    <Checkbox
                      checked={selectedKPIs.includes(kpi.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedKPIs(prev => [...prev, kpi.name]);
                        } else {
                          setSelectedKPIs(prev => prev.filter(name => name !== kpi.name));
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{kpi.name}</div>
                      <Badge className="bg-gray-100 text-gray-700 text-xs">
                        {kpi.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedKPIs(template.default_kpis.map(k => k.name))}
                >
                  Selecionar Todos
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedKPIs([])}
                >
                  Limpar Seleção
                </Button>
              </div>
            </div>
          )}

          {/* Configurações de Sincronização */}
          <div>
            <h3 className="font-medium mb-2">Resolução de Conflitos</h3>
            <Select value={conflictResolution} onValueChange={setConflictResolution}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual - Revisar conflitos</SelectItem>
                <SelectItem value="overwrite">Sobrescrever - Usar dados do template</SelectItem>
                <SelectItem value="merge">Mesclar - Combinação inteligente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handlePreview}
              disabled={selectedInstances.length === 0 || analyzing}
            >
              {analyzing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Prévia
            </Button>

            <Button 
              onClick={handleApply}
              disabled={!syncResults || applying || selectedInstances.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {applying ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Aplicar Sincronização
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Análise/Aplicação */}
      {syncResults && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Sincronização</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="conflicts">Conflitos</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {syncResults.summary?.totalInstances || 0}
                    </div>
                    <div className="text-sm text-gray-600">Instâncias</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {syncResults.summary?.totalChanges || 0}
                    </div>
                    <div className="text-sm text-gray-600">Mudanças</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {syncResults.summary?.appliedChanges || 0}
                    </div>
                    <div className="text-sm text-gray-600">Aplicadas</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {syncResults.summary?.instancesWithErrors || 0}
                    </div>
                    <div className="text-sm text-gray-600">Erros</div>
                  </div>
                </div>

                {syncResults.summary?.instancesWithErrors > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {syncResults.summary.instancesWithErrors} instância(s) tiveram erros durante a sincronização.
                      Verifique a aba "Detalhes" para mais informações.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {syncResults.results?.map((result) => (
                  <Card key={result.instanceId} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{result.instanceName}</CardTitle>
                        {result.errors.length > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {result.errors.length} erro(s)
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.analysis && (
                        <div className="space-y-2">
                          {/* Novos KPIs */}
                          {result.analysis.new_kpis.map((kpi) => (
                            <div key={kpi.name} className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <div className="flex items-center gap-2">
                                {getActionIcon('create')}
                                <span className="font-medium">{kpi.name}</span>
                              </div>
                              {getActionBadge('create')}
                            </div>
                          ))}

                          {/* KPIs atualizados */}
                          {result.analysis.updated_kpis.map((kpi) => (
                            <div key={kpi.name} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <div className="flex items-center gap-2">
                                {getActionIcon('update')}
                                <span className="font-medium">{kpi.name}</span>
                              </div>
                              {getActionBadge('update')}
                            </div>
                          ))}

                          {/* Conflitos */}
                          {result.analysis.conflicts.map((conflict) => (
                            <div key={conflict.name} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span className="font-medium">{conflict.name}</span>
                              </div>
                              {getActionBadge('conflict', true)}
                            </div>
                          ))}

                          {/* KPIs removidos */}
                          {result.analysis.removed_kpis.map((kpi) => (
                            <div key={kpi.name} className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <div className="flex items-center gap-2">
                                {getActionIcon('deactivate')}
                                <span className="font-medium">{kpi.name}</span>
                              </div>
                              {getActionBadge('deactivate')}
                            </div>
                          ))}
                        </div>
                      )}

                      {result.errors.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-red-700 mb-2">Erros:</h4>
                          <ul className="list-disc list-inside text-sm text-red-600">
                            {result.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="conflicts" className="space-y-4">
                {syncResults.results?.some(r => r.analysis?.conflicts.length > 0) ? (
                  syncResults.results
                    .filter(r => r.analysis?.conflicts.length > 0)
                    .map((result) => (
                      <Card key={result.instanceId}>
                        <CardHeader>
                          <CardTitle className="text-lg text-amber-700">
                            {result.instanceName} - Conflitos Detectados
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {result.analysis.conflicts.map((conflict) => (
                            <div key={conflict.name} className="border rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <span className="font-medium">{conflict.name}</span>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <strong>Customizações detectadas:</strong>
                                <ul className="list-disc list-inside ml-4">
                                  {conflict.customizations.map((custom, idx) => (
                                    <li key={idx}>{custom}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="text-sm text-gray-600">
                                <strong>Mudanças no template:</strong>
                                <ul className="list-disc list-inside ml-4">
                                  {conflict.changes.map((change, idx) => (
                                    <li key={idx}>
                                      {change.field}: {change.current_value} → {change.template_value}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum conflito detectado
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
