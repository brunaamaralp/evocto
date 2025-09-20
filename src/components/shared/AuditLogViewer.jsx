import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useAuthorization } from '@/components/auth/useAuthorization';
import { AuditLog } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield, Eye, Download, Search, Filter,
  Clock, User, AlertTriangle, CheckCircle,
  XCircle, Info, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700', 
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const SEVERITY_ICONS = {
  low: CheckCircle,
  medium: Info,
  high: AlertTriangle,
  critical: XCircle
};

const ACTION_COLORS = {
  CREATED: 'bg-green-100 text-green-700',
  UPDATED: 'bg-blue-100 text-blue-700',
  DELETED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PERMISSION_DENIED: 'bg-red-100 text-red-700',
  PDF_EXPORTED: 'bg-purple-100 text-purple-700'
};

export default function AuditLogViewer({ 
  entityType = null, 
  entityId = null,
  maxHeight = 'max-h-96'
}) {
  const { user } = useSession();
  const { hasPermission, requirePermission } = useAuthorization();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    severity: '',
    category: '',
    actor: '',
    search: ''
  });

  const loadAuditLogs = useCallback(async () => {
    try {
      // Verificar permissão
      await requirePermission('audit', 'read');
      
      setLoading(true);
      
      const filterParams = {
        agencyId: user.data.agencyId
      };
      
      // Filtros específicos
      if (entityType) filterParams.entity_type = entityType;
      if (entityId) filterParams.entity_id = entityId;
      if (filters.action) filterParams.action = filters.action;
      if (filters.severity) filterParams.severity = filters.severity;
      if (filters.category) filterParams.category = filters.category;
      if (filters.actor) filterParams.actor_id = { $regex: filters.actor, $options: 'i' };
      
      const auditData = await AuditLog.filter(filterParams, '-created_date', 100);
      setLogs(auditData || []);
      
    } catch (error) {
      if (error.message.includes('Access denied')) {
        console.warn('User does not have permission to view audit logs');
        setLogs([]);
        return;
      }
      console.error('Error loading audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, filters, user?.data?.agencyId, requirePermission]);

  useEffect(() => {
    if (user?.data?.agencyId) {
      loadAuditLogs();
    }
  }, [loadAuditLogs, user?.data?.agencyId]);

  const handleExportLogs = async () => {
    try {
      if (!hasPermission('export', 'audit_logs')) {
        toast.error('Você não tem permissão para exportar logs de auditoria');
        return;
      }
      
      const csvData = generateCSVExport(logs);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Logs exportados com sucesso');
      
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  const generateCSVExport = (logs) => {
    const headers = [
      'Timestamp',
      'Entity Type',
      'Entity ID', 
      'Action',
      'Actor',
      'Severity',
      'Category',
      'Changes',
      'IP Address',
      'User Agent'
    ];
    
    const rows = logs.map(log => [
      log.created_date,
      log.entity_type,
      log.entity_id,
      log.action,
      log.actor_id,
      log.severity,
      log.category,
      log.changes ? log.changes.length : 0,
      log.actor_ip || '',
      log.user_agent || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const renderChangesSummary = (changes) => {
    if (!changes || changes.length === 0) return '-';
    
    return (
      <div className="space-y-1">
        {changes.slice(0, 3).map((change, index) => (
          <div key={index} className="text-xs">
            <span className="font-medium">{change.field}:</span>
            <span className="text-gray-600 ml-1">
              {change.is_sensitive ? '[MASKED]' : String(change.old_value).substring(0, 20)}
            </span>
            <span className="mx-1">→</span>
            <span className="text-gray-900">
              {change.is_sensitive ? '[MASKED]' : String(change.new_value).substring(0, 20)}
            </span>
          </div>
        ))}
        {changes.length > 3 && (
          <div className="text-xs text-gray-500">
            +{changes.length - 3} mais mudanças...
          </div>
        )}
      </div>
    );
  };

  const renderLogDetails = (log) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Badge className={SEVERITY_COLORS[log.severity]}>
          {log.severity}
        </Badge>
        <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>
          {log.action}
        </Badge>
        <span className="text-sm text-gray-600">
          {formatDistance(new Date(log.created_date), new Date(), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </span>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Entidade:</span>
          <span className="ml-2">{log.entity_type}:{log.entity_id}</span>
        </div>
        <div>
          <span className="font-medium">Ator:</span>
          <span className="ml-2">{log.actor_id}</span>
        </div>
        <div>
          <span className="font-medium">IP:</span>
          <span className="ml-2">{log.actor_ip || 'N/A'}</span>
        </div>
        <div>
          <span className="font-medium">Categoria:</span>
          <span className="ml-2">{log.category}</span>
        </div>
      </div>

      {/* Changes Details */}
      {log.changes && log.changes.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Mudanças Detalhadas</h4>
          <div className="space-y-2">
            {log.changes.map((change, index) => (
              <div key={index} className="border rounded p-3 bg-gray-50">
                <div className="font-medium text-sm mb-2">{change.field}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Antes:</span>
                    <pre className="mt-1 bg-red-50 p-2 rounded text-red-800">
                      {change.is_sensitive ? '[DADOS SENSÍVEIS]' : JSON.stringify(change.old_value, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-gray-600">Depois:</span>
                    <pre className="mt-1 bg-green-50 p-2 rounded text-green-800">
                      {change.is_sensitive ? '[DADOS SENSÍVEIS]' : JSON.stringify(change.new_value, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {log.meta_json && Object.keys(log.meta_json).length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Metadados</h4>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
            {JSON.stringify(log.meta_json, null, 2)}
          </pre>
        </div>
      )}

      {/* Related Entities */}
      {log.related_entities && log.related_entities.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Entidades Relacionadas</h4>
          <div className="space-y-2">
            {log.related_entities.map((entity, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{entity.relationship}</Badge>
                <span>{entity.entity_type}:{entity.entity_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Flags */}
      {log.compliance_flags && log.compliance_flags.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Flags de Compliance</h4>
          <div className="flex flex-wrap gap-2">
            {log.compliance_flags.map((flag, index) => (
              <Badge key={index} variant="outline" className="text-purple-700 border-purple-200">
                <Shield className="w-3 h-3 mr-1" />
                {flag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!hasPermission('audit', 'read')) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">Você não tem permissão para visualizar logs de auditoria</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar por ator..."
              value={filters.actor}
              onChange={(e) => setFilters({...filters, actor: e.target.value})}
              className="md:col-span-2"
            />
            
            <Select value={filters.action} onValueChange={(value) => setFilters({...filters, action: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas as ações</SelectItem>
                <SelectItem value="CREATED">Criado</SelectItem>
                <SelectItem value="UPDATED">Atualizado</SelectItem>
                <SelectItem value="DELETED">Deletado</SelectItem>
                <SelectItem value="APPROVED">Aprovado</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
                <SelectItem value="PDF_EXPORTED">PDF Exportado</SelectItem>
                <SelectItem value="PERMISSION_DENIED">Acesso Negado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.severity} onValueChange={(value) => setFilters({...filters, severity: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadAuditLogs}>
                <Search className="w-4 h-4 mr-1" />
                Buscar
              </Button>
              {hasPermission('export', 'audit_logs') && (
                <Button variant="outline" size="sm" onClick={handleExportLogs}>
                  <Download className="w-4 h-4 mr-1" />
                  CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Logs de Auditoria
            {logs.length > 0 && (
              <Badge variant="secondary">{logs.length} registros</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`overflow-auto ${maxHeight}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Mudanças</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhum log de auditoria encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const SeverityIcon = SEVERITY_ICONS[log.severity] || Info;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatDistance(new Date(log.created_date), new Date(), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-xs">
                          <div>
                            <div className="font-medium">{log.entity_type}</div>
                            <div className="text-gray-500">{log.entity_id}</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-gray-400" />
                            {log.actor_id}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={SEVERITY_COLORS[log.severity]}>
                            <SeverityIcon className="w-3 h-3 mr-1" />
                            {log.severity}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-xs max-w-48">
                          {renderChangesSummary(log.changes)}
                        </TableCell>
                        
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Detalhes do Log de Auditoria
              {selectedLog && (
                <Badge className={ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-700'}>
                  {selectedLog.action}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && renderLogDetails(selectedLog)}
        </DialogContent>
      </Dialog>
    </div>
  );
}