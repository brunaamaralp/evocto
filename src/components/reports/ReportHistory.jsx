import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { ClientDocument } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Download, Eye, Calendar, 
  Filter, Search, Archive
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ReportHistory({ clientId, serviceId }) {
  const { user } = useSession();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {
        agencyId: user.data.agencyId,
        clientId,
        group: 'report'
      };

      if (serviceId) {
        filters.serviceId = serviceId;
      }

      const documentsData = await ClientDocument.filter(filters, '-created_date');
      setReports(documentsData || []);
      
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar histórico de relatórios');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, user?.data?.agencyId]);

  const filterReports = useCallback(() => {
    let filtered = [...reports];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(report => 
        report.metadata?.report_type === filterType
      );
    }

    // Filtro por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(report => report.status === filterStatus);
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, filterType, filterStatus]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

  const handleDownload = async (report) => {
    try {
      // Implementar download seguro via função
      toast.info('Iniciando download...');
      // TODO: Implementar download via signed URL
      
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao fazer download do relatório');
    }
  };

  const getReportTypeLabel = (reportType) => {
    const types = {
      'service_status': 'Status do Serviço',
      'tasks_schedule': 'Cronograma',
      'diagnostic_final': 'Diagnóstico Final',
      'margin_implementation': 'Implementação Margem',
      'gf360_monthly': 'GF360 Mensal',
      'gf360_final': 'GF360 Final'
    };
    return types[reportType] || reportType;
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-700',
      'approved': 'bg-green-100 text-green-700',
      'archived': 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Relatórios</h3>
          <p className="text-sm text-gray-600">
            {reports.length} relatório{reports.length !== 1 ? 's' : ''} gerado{reports.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar relatórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="service_status">Status do Serviço</SelectItem>
                <SelectItem value="tasks_schedule">Cronograma</SelectItem>
                <SelectItem value="diagnostic_final">Diagnóstico Final</SelectItem>
                <SelectItem value="margin_implementation">Implementação Margem</SelectItem>
                <SelectItem value="gf360_monthly">GF360 Mensal</SelectItem>
                <SelectItem value="gf360_final">GF360 Final</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Relatórios */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {reports.length === 0 ? 'Nenhum relatório encontrado' : 'Nenhum resultado'}
            </h3>
            <p className="text-gray-600">
              {reports.length === 0 
                ? 'Gere relatórios personalizados para este cliente'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-lg">{report.title}</h4>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      {report.metadata?.report_type && (
                        <Badge variant="outline">
                          {getReportTypeLabel(report.metadata.report_type)}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{report.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.created_date).toLocaleDateString('pt-BR')}
                      </div>
                      <span>•</span>
                      <span>Versão {report.version}</span>
                      {report.fileSize && (
                        <>
                          <span>•</span>
                          <span>{Math.round(report.fileSize / 1024)} KB</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(report)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    
                    {report.visibility === 'client' && (
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Visualizar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}