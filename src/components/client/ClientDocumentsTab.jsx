import React, { useState, useEffect, useCallback } from 'react';
import { ClientDocument } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, Upload, Download, Eye, EyeOff, History, 
  Plus, Search, Filter, ExternalLink, Shield, 
  Clock, User, Folder, Archive, Settings, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/api/integrations';
import { saveDocumentAutomatically } from '@/api/functions';

const DOCUMENT_GROUPS = {
  diagnostic: { label: 'Diagnósticos', icon: FileText, color: 'blue' },
  report: { label: 'Relatórios', icon: Archive, color: 'green' },
  deliverable: { label: 'Entregáveis', icon: Folder, color: 'purple' },
  contract: { label: 'Contratos', icon: Shield, color: 'red' },
  presentation: { label: 'Apresentações', icon: Eye, color: 'yellow' },
  analysis: { label: 'Análises', icon: Settings, color: 'indigo' },
  other: { label: 'Outros', icon: FileText, color: 'gray' }
};

const VISIBILITY_CONFIG = {
  internal: { label: 'Interno', icon: EyeOff, color: 'gray', description: 'Apenas a equipe pode ver' },
  client: { label: 'Cliente', icon: Eye, color: 'blue', description: 'Cliente pode visualizar' },
  public: { label: 'Público', icon: ExternalLink, color: 'green', description: 'Link público compartilhável' }
};

export default function ClientDocumentsTab({ clientId, serviceId, deliverables = [] }) {
  const { user } = useSession();
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedVisibility, setSelectedVisibility] = useState('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const loadDocuments = useCallback(async () => {
    if (!clientId || !user?.data?.agencyId) return;

    try {
      setLoading(true);
      
      const filters = {
        agencyId: user.data.agencyId,
        clientId: clientId
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
  }, [clientId, serviceId, user?.data?.agencyId]);

  const filterDocuments = useCallback(() => {
    let filtered = [...documents];

    // Filtro por termo de busca
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

    // Filtro por visibilidade
    if (selectedVisibility !== 'all') {
      filtered = filtered.filter(doc => doc.visibility === selectedVisibility);
    }

    // Agrupar por deliverable_id
    const grouped = {};
    filtered.forEach(doc => {
      const key = doc.deliverable_id || 'general';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(doc);
    });

    // Ordenar por versão dentro de cada grupo
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const versionA = parseFloat(a.version || '1.0');
        const versionB = parseFloat(b.version || '1.0');
        return versionB - versionA; // Mais recente primeiro
      });
    });

    setFilteredDocuments(grouped);
  }, [documents, searchTerm, selectedGroup, selectedVisibility]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    filterDocuments();
  }, [filterDocuments]);

  const handleUpload = async (files, metadata) => {
    try {
      if (!files || files.length === 0) {
        toast.error('Selecione pelo menos um arquivo');
        return;
      }

      const file = files[0];
      
      // Upload do arquivo
      const uploadResult = await UploadFile({ file });
      
      // Salvar documento automaticamente
      const saveResult = await saveDocumentAutomatically({
        clientId,
        serviceId,
        deliverable_id: metadata.deliverableId || null,
        group: metadata.group || 'other',
        title: metadata.title || file.name,
        description: metadata.description || '',
        fileName: file.name,
        fileBlob: file,
        fileType: file.type,
        visibility: metadata.visibility || 'internal',
        tags: metadata.tags || [],
        metadata: {
          uploaded_manually: true,
          file_size: file.size
        }
      });

      if (saveResult.data?.success) {
        toast.success('Documento enviado com sucesso!');
        setUploadModalOpen(false);
        loadDocuments();
      } else {
        throw new Error('Falha ao salvar documento');
      }
      
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar documento');
    }
  };

  const toggleVisibility = async (document, newVisibility) => {
    try {
      await ClientDocument.update(document.id, {
        visibility: newVisibility
      });
      
      toast.success(`Visibilidade alterada para ${VISIBILITY_CONFIG[newVisibility].label}`);
      loadDocuments();
      
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade');
    }
  };

  const handleDownload = async (document) => {
    try {
      // Criar signed URL para download seguro
      const { createFileSignedUrl } = await import('@/api/functions/createFileSignedUrl');
      const signedUrl = await createFileSignedUrl({
        file_uri: document.fileUrl,
        expires_in: 300 // 5 minutos
      });
      
      if (signedUrl.data?.signed_url) {
        window.open(signedUrl.data.signed_url, '_blank');
      } else {
        throw new Error('Não foi possível gerar link de download');
      }
      
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  const getDeliverableName = (deliverableId) => {
    if (!deliverableId) return 'Documentos Gerais';
    const deliverable = deliverables.find(d => d.id === deliverableId);
    return deliverable?.name || `Entregável ${deliverableId}`;
  };

  const DocumentCard = ({ document, isLatest }) => {
    const groupConfig = DOCUMENT_GROUPS[document.group] || DOCUMENT_GROUPS.other;
    const visibilityConfig = VISIBILITY_CONFIG[document.visibility];
    
    return (
      <Card className={`transition-all hover:shadow-md ${isLatest ? 'ring-2 ring-blue-200' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-${groupConfig.color}-100`}>
                <groupConfig.icon className={`w-4 h-4 text-${groupConfig.color}-600`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 truncate">
                  {document.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {document.fileName}
                </p>
                {document.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {document.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-3">
              <Badge variant="outline" className="text-xs">
                v{document.version}
              </Badge>
              {isLatest && (
                <Badge className="text-xs bg-green-100 text-green-700">
                  Atual
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <visibilityConfig.icon className="w-3 h-3" />
                <span className={`text-${visibilityConfig.color}-600`}>
                  {visibilityConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{document.uploadedBy || 'Sistema'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(document.created_date).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(document)}
                className="h-7 w-7 p-0"
              >
                <Download className="w-3 h-3" />
              </Button>
              
              <Select
                value={document.visibility}
                onValueChange={(value) => toggleVisibility(document, value)}
              >
                <SelectTrigger className="h-7 w-7 p-0 border-0">
                  <Settings className="w-3 h-3" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedDocument(document);
                  setHistoryModalOpen(true);
                }}
                className="h-7 w-7 p-0"
              >
                <History className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
      {/* Header com filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Documentos do Cliente</h3>
          <p className="text-sm text-gray-600">
            {documents.length} documento{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Filtros */}
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {Object.entries(DOCUMENT_GROUPS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Visibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de documentos agrupados */}
      <div className="space-y-6">
        {Object.entries(filteredDocuments).map(([deliverableId, docs]) => (
          <Card key={deliverableId}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" />
                {getDeliverableName(deliverableId)}
                <Badge variant="outline">{docs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {docs.map((document, index) => (
                <DocumentCard 
                  key={document.id} 
                  document={document} 
                  isLatest={index === 0}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(filteredDocuments).length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedGroup !== 'all' || selectedVisibility !== 'all' 
                ? 'Tente alterar os filtros para ver mais resultados.'
                : 'Comece fazendo upload do primeiro documento.'
              }
            </p>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Fazer Upload
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Upload */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        deliverables={deliverables}
      />

      {/* Modal de Histórico */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        document={selectedDocument}
        onDownload={handleDownload}
      />
    </div>
  );
}

const UploadModal = ({ isOpen, onClose, onUpload, deliverables }) => {
  const [files, setFiles] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    group: 'other',
    visibility: 'internal',
    deliverableId: '',
    tags: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      toast.error('Selecione um arquivo');
      return;
    }
    onUpload(files, metadata);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    if (selectedFiles.length > 0 && !metadata.title) {
      setMetadata(prev => ({
        ...prev,
        title: selectedFiles[0].name.replace(/\.[^/.]+$/, "")
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">Arquivo</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
              required
            />
          </div>

          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group">Grupo</Label>
              <Select
                value={metadata.group}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, group: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_GROUPS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visibility">Visibilidade</Label>
              <Select
                value={metadata.visibility}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {deliverables.length > 0 && (
            <div>
              <Label htmlFor="deliverable">Entregável (opcional)</Label>
              <Select
                value={metadata.deliverableId}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, deliverableId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um entregável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Documento geral</SelectItem>
                  {deliverables.map(deliverable => (
                    <SelectItem key={deliverable.id} value={deliverable.id}>
                      {deliverable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              <Upload className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const HistoryModal = ({ isOpen, onClose, document, onDownload }) => {
  if (!document) return null;

  const versions = document.version_history || [
    {
      version: document.version,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.created_date,
      changes: 'Versão inicial',
      fileSize: document.fileSize
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico de Versões</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {versions.reverse().map((version, index) => (
            <Card key={index} className={index === 0 ? 'ring-2 ring-blue-200' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={index === 0 ? 'default' : 'outline'}>
                      v{version.version}
                    </Badge>
                    {index === 0 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownload(document)}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{version.uploadedBy || 'Sistema'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(version.uploadedAt).toLocaleString('pt-BR')}</span>
                  </div>
                  {version.fileSize && (
                    <div className="text-xs text-gray-500">
                      {(version.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
                
                {version.changes && (
                  <p className="text-xs text-gray-700 mt-2 italic">
                    {version.changes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};