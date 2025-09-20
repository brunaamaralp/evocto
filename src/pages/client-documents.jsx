import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { ClientDocument } from '@/api/entities';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Download, Upload, Eye, Edit, Trash2,
  Search, Filter, Calendar, User, Tag, 
  FolderOpen, File, Image, Archive, Share2,
  ArrowLeft, Plus, RefreshCw, ExternalLink
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const DOCUMENT_GROUPS = {
  diagnostic: 'Diagnóstico',
  report: 'Relatórios',
  deliverable: 'Entregáveis',
  contract: 'Contratos',
  presentation: 'Apresentações', 
  analysis: 'Análises',
  other: 'Outros'
};

const VISIBILITY_LABELS = {
  internal: 'Interno',
  client: 'Cliente',
  public: 'Público'
};

const STATUS_LABELS = {
  draft: 'Rascunho',
  review: 'Em Revisão',
  approved: 'Aprovado',
  archived: 'Arquivado'
};

const DocumentCard = ({ document, onView, onDownload, onEdit, onDelete }) => {
  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <File className="w-5 h-5 text-red-500" />;
    if (fileType?.includes('image')) return <Image className="w-5 h-5 text-blue-500" />;
    if (fileType?.includes('word') || fileType?.includes('doc')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (fileType?.includes('excel') || fileType?.includes('sheet')) return <FileText className="w-5 h-5 text-green-600" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {getFileIcon(document.fileType)}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {document.title}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {document.fileName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusBadge status={document.status} type="document" size="sm" />
            <Badge variant="outline" className="text-xs">
              v{document.version}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Grupo:</span>
            <Badge variant="secondary" className="text-xs">
              {DOCUMENT_GROUPS[document.group] || document.group}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Visibilidade:</span>
            <span className="font-medium">
              {VISIBILITY_LABELS[document.visibility]}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tamanho:</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Criado em:</span>
            <span>{new Date(document.created_date).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {document.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {document.description}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(document)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(document)}
          >
            <Download className="w-4 h-4" />
          </Button>
          
          {document.visibility === 'client' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(document)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ClientDocumentsPage() {
  const { user, agencyId } = useSession();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVisibility, setSelectedVisibility] = useState('all');

  useEffect(() => {
    if (!clientId) {
      toast.error('ID do cliente não fornecido');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const [clientData, documentsData, servicesData] = await Promise.all([
          Client.get(clientId),
          ClientDocument.filter({ agencyId, clientId }, '-created_date'),
          Service.filter({ agencyId, clientId, is_template: false })
        ]);

        setClient(clientData);
        setDocuments(documentsData || []);
        setServices(servicesData || []);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar documentos do cliente');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, agencyId]);

  const handleViewDocument = async (document) => {
    // TODO: Implementar visualização do documento
    toast.info('Visualização em desenvolvimento');
  };

  const handleDownloadDocument = async (document) => {
    try {
      // Criar link para download
      const link = window.document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.fileName;
      link.click();
      
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  const handleEditDocument = (document) => {
    // TODO: Implementar edição/compartilhamento
    toast.info('Edição em desenvolvimento');
  };

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === 'all' || doc.group === selectedGroup;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    const matchesVisibility = selectedVisibility === 'all' || doc.visibility === selectedVisibility;
    
    return matchesSearch && matchesGroup && matchesStatus && matchesVisibility;
  });

  // Estatísticas
  const stats = {
    total: documents.length,
    byGroup: Object.keys(DOCUMENT_GROUPS).reduce((acc, group) => {
      acc[group] = documents.filter(d => d.group === group).length;
      return acc;
    }, {}),
    byVisibility: Object.keys(VISIBILITY_LABELS).reduce((acc, visibility) => {
      acc[visibility] = documents.filter(d => d.visibility === visibility).length;
      return acc;
    }, {})
  };

  if (loading) {
    return <LoadingState message="Carregando documentos..." />;
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <EmptyState
            icon={FileText}
            title="Cliente não encontrado"
            description="O cliente solicitado não existe ou você não tem permissão para acessá-lo."
            primaryAction={{
              label: 'Voltar aos Clientes',
              onClick: () => window.location.href = createPageUrl('clients')
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.location.href = createPageUrl('client-detail') + `?clientId=${clientId}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-blue-600" />
              Documentos - {client.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie todos os documentos deste cliente
            </p>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documento
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total de Documentos</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Eye className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.byVisibility.client || 0}</div>
              <div className="text-sm text-gray-600">Visíveis ao Cliente</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Archive className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.byGroup.report || 0}</div>
              <div className="text-sm text-gray-600">Relatórios</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <User className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.byVisibility.internal || 0}</div>
              <div className="text-sm text-gray-600">Documentos Internos</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Grupos</SelectItem>
                  {Object.entries(DOCUMENT_GROUPS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
                <SelectTrigger>
                  <SelectValue placeholder="Visibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Visibilidades</SelectItem>
                  {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGroup('all');
                  setSelectedStatus('all');
                  setSelectedVisibility('all');
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Documentos */}
        {filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onView={handleViewDocument}
                onDownload={handleDownloadDocument}
                onEdit={handleEditDocument}
                onDelete={() => {}} // TODO: Implementar exclusão
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={searchTerm || selectedGroup !== 'all' ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
            description={
              searchTerm || selectedGroup !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Este cliente ainda não possui documentos cadastrados.'
            }
            primaryAction={{
              label: 'Upload Documento',
              onClick: () => toast.info('Upload em desenvolvimento'),
              icon: Upload
            }}
            secondaryAction={
              searchTerm || selectedGroup !== 'all' ? {
                label: 'Limpar Filtros',
                onClick: () => {
                  setSearchTerm('');
                  setSelectedGroup('all');
                  setSelectedStatus('all');
                  setSelectedVisibility('all');
                }
              } : null
            }
          />
        )}
      </div>
    </div>
  );
}