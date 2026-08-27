
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { AuditLog } from '@/api/entities';

const AUDIT_ACTIONS = [
  { value: 'all', label: 'Todas as Ações' },
  { value: 'KPI_CREATED', label: 'KPI Criado' },
  { value: 'KPI_UPDATED', label: 'KPI Atualizado' },
  { value: 'KPI_VALUE_UPDATED', label: 'Valor Atualizado' },
  { value: 'KPI_DELETED', label: 'KPI Deletado' },
  { value: 'KPI_THRESHOLD_EXCEEDED', label: 'Limite Excedido' }
];

const SEVERITY_LEVELS = [
  { value: 'all', label: 'Todos os Níveis' },
  { value: 'low', label: 'Baixo', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Médio', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'Alto', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', color: 'bg-red-100 text-red-800', label: 'Crítico' }
];

const TIME_RANGES = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' }
];

export default function KPIAuditViewer({ 
  clientId, 
  serviceId,
  entityId,
  className = "" 
}) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);

      const filters = {
        entity_type: 'FinancialKPI'
      };

      if (clientId) filters.agencyId = clientId;
      if (entityId) filters.entity_id = entityId;

      // Aplicar filtro de tempo
      if (selectedTimeRange !== 'all' && selectedTimeRange !== 'custom') {
        const days = parseInt(selectedTimeRange.replace('d', '')) || 1;
        const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        filters.created_date = { $gte: fromDate.toISOString() };
      }

      // Mock de dados de auditoria para demonstração
      const mockLogs = [
        {
          id: 'audit_001',
          entity_type: 'FinancialKPI',
          entity_id: 'kpi_margem_liquida',
          action: 'KPI_VALUE_UPDATED',
          actor_id: 'user@empresa.com',
          actor_ip: '192.168.1.100',
          created_date: new Date(Date.now() - 3600000).toISOString(),
          before_data: { current_value: 15.5 },
          after_data: { current_value: 16.2 },
          meta_json: {
            calculation_method: 'automatic',
            confidence_score: 95,
            data_source: 'dre_upload'
          },
          severity: 'medium',
          category: 'business'
        },
        {
          id: 'audit_002',
          entity_type: 'FinancialKPI',
          entity_id: 'kpi_faturamento',
          action: 'KPI_THRESHOLD_EXCEEDED',
          actor_id: 'system',
          created_date: new Date(Date.now() - 7200000).toISOString(),
          meta_json: {
            threshold_type: 'critical_low',
            threshold_value: 100000,
            actual_value: 85000,
            alert_sent: true
          },
          severity: 'high',
          category: 'business'
        },
        {
          id: 'audit_003',
          entity_type: 'FinancialKPI',
          entity_id: 'kpi_margem_bruta',
          action: 'KPI_CREATED',
          actor_id: 'admin@empresa.com',
          created_date: new Date(Date.now() - 86400000).toISOString(),
          after_data: {
            name: 'ROAS',
            category: 'performance',
            target_value: 3.5
          },
          meta_json: {
            created_from_template: true,
            template_id: 'marketing_360'
          },
          severity: 'low',
          category: 'business'
        }
      ];

      setAuditLogs(mockLogs);

    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, entityId, selectedTimeRange]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = auditLogs;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.meta_json).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por ação
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Filtro por severidade
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === selectedSeverity);
    }

    // Filtro por usuário
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.actor_id === selectedUser);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [auditLogs, searchTerm, selectedAction, selectedSeverity, selectedUser]);

  const exportAuditLogs = async () => {
    try {
      setExporting(true);

      // Simular export
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Em uma implementação real, aqui seria feita a exportação
      const csvContent = filteredLogs.map(log => ({
        data: new Date(log.created_date).toLocaleString('pt-BR'),
        acao: log.action,
        usuario: log.actor_id,
        severidade: log.severity,
        detalhes: JSON.stringify(log.meta_json)
      }));

      console.log('Exportando logs:', csvContent);

    } catch (err) {
      console.error('Erro na exportação:', err);
    } finally {
      setExporting(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'KPI_CREATED': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'KPI_UPDATED': return <Edit3 className="w-4 h-4 text-blue-600" />;
      case 'KPI_DELETED': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'KPI_VALUE_UPDATED': return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case 'KPI_THRESHOLD_EXCEEDED': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action) => {
    const actionObj = AUDIT_ACTIONS.find(a => a.value === action);
    return actionObj?.label || action;
  };

  const getSeverityColor = (severity) => {
    const severityObj = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityObj?.color || 'bg-gray-100 text-gray-800';
  };

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <CardTitle>Log de Auditoria - KPIs de Performance</CardTitle>
            </div>
            <Button
              onClick={exportAuditLogs}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Ação</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIT_ACTIONS.map(action => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severidade</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map(severity => (
                    <SelectItem key={severity.value} value={severity.value}>
                      {severity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Período</Label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Mostrando {paginatedLogs.length} de {filteredLogs.length} registros
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {paginatedLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 border-b border-gray-100 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getActionIcon(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {getActionLabel(log.action)}
                        </span>
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{log.actor_id}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(log.created_date).toLocaleString('pt-BR')}</span>
                          </span>
                        </div>
                      </div>

                      {(log.before_data || log.after_data) && (
                        <div className="mt-2 text-xs text-gray-500">
                          {log.before_data && (
                            <div>Antes: {JSON.stringify(log.before_data)}</div>
                          )}
                          {log.after_data && (
                            <div>Depois: {JSON.stringify(log.after_data)}</div>
                          )}
                        </div>
                      )}

                      {log.meta_json && Object.keys(log.meta_json).length > 0 && (
                        <div className="mt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600">
                              Ver detalhes
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.meta_json, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {paginatedLogs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum log de auditoria encontrado</p>
                <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
