import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { ClientDocument } from '@/api/entities';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, Download, Search, Calendar, 
  Eye, CheckCircle, AlertTriangle, Filter 
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ClientPortalServiceDocumentsPage() {
  const { user, isAuthenticated } = useSession();
  const [service, setService] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  // Extrair serviceId da URL
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('serviceId');

  useEffect(() => {
    if (!isAuthenticated || !serviceId) return;

    const loadDocuments = async () => {
      try {
        setLoading(true);

        if (user.role !== 'client') {
          throw new Error('Access denied - Client only area');
        }

        const [serviceData, documentsData] = await Promise.all([
          Service.get(serviceId),
          ClientDocument.filter({ 
            serviceId, 
            clientId: user.data.clientId,
            visibility: ['client', 'public']
          }, '-created_date')
        ]);

        if (!serviceData || serviceData.clientId !== user.data.clientId) {
          throw new Error('Service not found or access denied');
        }

        setService(serviceData);
        setDocuments(documentsData || []);
        setFilteredDocuments(documentsData || []);

      } catch (err) {
        console.error('Error loading documents:', err);
        setError({
          type: err.message.includes('not found') ? '404' : '403',
          message: err.message
        });
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [isAuthenticated, serviceId, user]);

  // Filtrar documentos
  useEffect(() => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (groupFilter !== 'all') {
      filtered = filtered.filter(doc => doc.group === groupFilter);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, groupFilter]);

  const getBreadcrumbs = () => [
    { label: 'Portal do Cliente', href: createPageUrl('client-portal-overview') },
    { label: service?.name, href: createPageUrl('client-portal-service-overview', { serviceId }) },
    { label: 'Documentos' }
  ];

  const getDocumentGroups = () => {
    const groups = [...new Set(documents.map(doc => doc.group))];
    return groups.filter(Boolean);
  };

  const getGroupLabel = (group) => {
    const labels = {
      'diagnostic': 'Diagnóstico',
      'report': 'Relatórios',
      'deliverable': 'Entregáveis',
      'contract': 'Contratos',
      'presentation': 'Apresentações',
      'analysis': 'Análises'
    };
    return labels[group] || group;
  };

  const getStatusBadge = (doc) => {
    if (doc.status === 'approved') {
      return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
    }
    if (doc.status === 'review') {
      return <Badge className="bg-orange-100 text-orange-800">Em Revisão</Badge>;
    }
    return <Badge variant="outline">Rascunho</Badge>;
  };

  const handleDownload = async (doc) => {
    try {
      // TODO: Implementar download seguro via signed URL
      window.open(doc.fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingState 
          variant="skeleton" 
          size="page"
          message="Carregando documentos..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <ErrorState
          type={error.type}
          message={error.message}
          backUrl={createPageUrl('client-portal-service-overview', { serviceId })}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-gray-900">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
                {index < getBreadcrumbs().length - 1 && (
                  <span className="text-gray-400">/</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
              <p className="text-gray-600">{service?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas as categorias</option>
                  {getDocumentGroups().map(group => (
                    <option key={group} value={group}>
                      {getGroupLabel(group)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Documentos */}
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'Nenhum documento disponível' : 'Nenhum documento encontrado'}
              </h3>
              <p className="text-gray-600">
                {documents.length === 0 
                  ? 'Os documentos aparecerão aqui conforme o projeto avança.'
                  : 'Tente ajustar os filtros de busca.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                        {getStatusBadge(doc)}
                        <Badge variant="outline" className="text-xs">
                          {getGroupLabel(doc.group)}
                        </Badge>
                      </div>
                      
                      {doc.description && (
                        <p className="text-gray-600 mb-3">{doc.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(doc.created_date).toLocaleDateString('pt-BR')}
                        </span>
                        <span>v{doc.version}</span>
                        {doc.fileSize && (
                          <span>{Math.round(doc.fileSize / 1024)} KB</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                      
                      {doc.share_settings?.share_token && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
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
    </div>
  );
}