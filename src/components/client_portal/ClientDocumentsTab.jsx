
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { ClientDocument } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Download, Eye, Calendar, Search, 
  Filter, Folder, Star, Clock, CheckCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DOCUMENT_GROUPS = {
  'diagnostic': { 
    label: 'Diagnóstico', 
    icon: FileText, 
    color: 'bg-blue-100 text-blue-700',
    description: 'Análises e avaliações iniciais'
  },
  'report': { 
    label: 'Relatórios', 
    icon: FileText, 
    color: 'bg-green-100 text-green-700',
    description: 'Relatórios periódicos e de resultados'
  },
  'deliverable': { 
    label: 'Entregáveis', 
    icon: Folder, 
    color: 'bg-purple-100 text-purple-700',
    description: 'Documentos finais de cada etapa'
  },
  'contract': { 
    label: 'Contratos', 
    icon: FileText, 
    color: 'bg-orange-100 text-orange-700',
    description: 'Documentos contratuais e legais'
  },
  'presentation': { 
    label: 'Apresentações', 
    icon: FileText, 
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Slides e materiais de apresentação'
  },
  'analysis': { 
    label: 'Análises', 
    icon: FileText, 
    color: 'bg-teal-100 text-teal-700',
    description: 'Estudos e análises detalhadas'
  },
  'other': { 
    label: 'Outros', 
    icon: FileText, 
    color: 'bg-gray-100 text-gray-700',
    description: 'Documentos diversos'
  }
};

const STATUS_CONFIG = {
  'draft': { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: Clock },
  'review': { label: 'Em Revisão', color: 'bg-yellow-100 text-yellow-700', icon: Eye },
  'approved': { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  'archived': { label: 'Arquivado', color: 'bg-blue-100 text-blue-700', icon: FileText }
};

export default function ClientDocumentsTab({ clientId, serviceId }) {
  const { user } = useSession();
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // all, by-group, favorites

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {
        agencyId: user?.data?.agencyId, // Use optional chaining for user.data
        clientId: clientId,
        visibility: { $in: ['client', 'public'] }
      };

      if (serviceId) {
        filters.serviceId = serviceId;
      }

      const documentsData = await ClientDocument.filter(filters, '-created_date');
      setDocuments(documentsData || []);
      
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, user?.data?.agencyId]); // Add user?.data?.agencyId to dependencies

  const filterDocuments = useCallback(() => {
    let filtered = [...documents];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por grupo
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(doc => doc.group === selectedGroup);
    }

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === selectedStatus);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedGroup, selectedStatus]);

  useEffect(() => {
    if (clientId && user?.data?.agencyId) { // Ensure clientId and agencyId are available
      loadDocuments();
    }
  }, [loadDocuments, clientId, user?.data?.agencyId]); // loadDocuments is stable, but adding clientId and user?.data?.agencyId ensures it triggers if they change and loadDocuments doesn't re-create for some reason (though it should due to its own dependencies)

  useEffect(() => {
    filterDocuments();
  }, [filterDocuments]); // filterDocuments is now a stable callback, useEffect will re-run when it changes (which only happens when its internal dependencies change)

  const handleDownload = async (document) => {
    try {
      toast.info('Iniciando download...');
      // TODO: Implementar download seguro
      console.log('Download:', document);
      
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao fazer download');
    }
  };

  const handleView = async (document) => {
    try {
      // TODO: Implementar visualização
      toast.info('Abrindo documento...');
      
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      toast.error('Erro ao abrir documento');
    }
  };

  const getDocumentsByGroup = () => {
    const grouped = {};
    
    Object.keys(DOCUMENT_GROUPS).forEach(group => {
      grouped[group] = filteredDocuments.filter(doc => doc.group === group);
    });
    
    return grouped;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${Math.round(mb * 10) / 10} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const documentsByGroup = getDocumentsByGroup();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Documentos</h2>
          <p className="text-gray-600">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} disponível{documents.length !== 1 ? 'eis' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(DOCUMENT_GROUPS).map(([key, group]) => (
                  <SelectItem key={key} value={key}>{group.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, status]) => (
                  <SelectItem key={key} value={key}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">Lista Completa</TabsTrigger>
          <TabsTrigger value="by-group">Por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {documents.length === 0 ? 'Nenhum documento encontrado' : 'Nenhum resultado'}
                </h3>
                <p className="text-gray-600">
                  {documents.length === 0 
                    ? 'Documentos serão disponibilizados conforme o progresso do projeto'
                    : 'Tente ajustar os filtros de busca'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map((document) => {
                const GroupIcon = DOCUMENT_GROUPS[document.group]?.icon || FileText;
                const groupConfig = DOCUMENT_GROUPS[document.group] || DOCUMENT_GROUPS.other;
                const statusConfig = STATUS_CONFIG[document.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card key={document.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg ${groupConfig.color}`}>
                            <GroupIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{document.title}</h3>
                              
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              
                              <Badge variant="outline">
                                {groupConfig.label}
                              </Badge>
                            </div>
                            
                            <p className="text-gray-600 mb-3">{document.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(document.created_date).toLocaleDateString('pt-BR')}
                              </div>
                              <span>•</span>
                              <span>v{document.version}</span>
                              <span>•</span>
                              <span>{formatFileSize(document.fileSize)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(document)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          
                          <Button
                            size="sm"
                            onClick={() => handleDownload(document)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-group" className="space-y-6">
          {Object.entries(documentsByGroup).map(([groupKey, groupDocs]) => {
            const groupConfig = DOCUMENT_GROUPS[groupKey];
            const GroupIcon = groupConfig.icon;
            
            if (groupDocs.length === 0) return null;
            
            return (
              <Card key={groupKey}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${groupConfig.color}`}>
                      <GroupIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3>{groupConfig.label}</h3>
                      <p className="text-sm text-gray-600 font-normal">
                        {groupConfig.description} • {groupDocs.length} documento{groupDocs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {groupDocs.map((document) => {
                    const statusConfig = STATUS_CONFIG[document.status] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{document.title}</h4>
                            <Badge className={statusConfig.color} variant="secondary">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{new Date(document.created_date).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span>v{document.version}</span>
                            <span>•</span>
                            <span>{formatFileSize(document.fileSize)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleView(document)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(document)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
