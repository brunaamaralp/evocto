import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { ClientDocument } from '@/api/entities';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, Download, Upload, Eye,
  Search, User, 
  File, Image, Archive, Share2,
  ArrowLeft, RefreshCw, Loader2
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
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getCardPastel } from '@/lib/modulePastels';
import { UploadFile } from '@/api/integrations';

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

const DocumentCard = ({ document, onView, onDownload, onEdit, _onDelete, highlighted = false }) => {
  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <File className="w-5 h-5 text-red-500" />;
    if (fileType?.includes('image')) return <Image className="w-5 h-5 text-[#6C47D8]" />;
    if (fileType?.includes('word') || fileType?.includes('doc')) return <FileText className="w-5 h-5 text-[#6C47D8]" />;
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
    <Card
      id={`document-${document.id}`}
      className={`rounded-2xl border-transparent shadow-sm hover:shadow-md transition-shadow ${
        highlighted ? 'ring-2 ring-[#6C47D8] border-[#D4CBF5]' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {getFileIcon(document.fileType)}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[#18162A] truncate">
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
            <span className="text-[#7A7595]">Grupo:</span>
            <Badge variant="secondary" className="text-xs">
              {DOCUMENT_GROUPS[document.group] || document.group}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7A7595]">Visibilidade:</span>
            <span className="font-medium">
              {VISIBILITY_LABELS[document.visibility]}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7A7595]">Tamanho:</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7A7595]">Criado em:</span>
            <span>{new Date(document.created_date).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {document.description && (
          <p className="text-sm text-[#7A7595] mb-4 line-clamp-2">
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
  const { user, agencyId, userId } = useSession();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const serviceId = urlParams.get('serviceId');
  const documentId = urlParams.get('documentId');

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [client, setClient] = useState(null);
  const [_services, setServices] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVisibility, setSelectedVisibility] = useState('all');

  const loadData = useCallback(async () => {
    if (!clientId) return;

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
  }, [clientId, agencyId]);

  useEffect(() => {
    if (!clientId) {
      toast.error('ID do cliente não fornecido');
      return;
    }

    loadData();
  }, [clientId, loadData]);

  useEffect(() => {
    if (loading || !documentId) return;
    const el = window.document.getElementById(`document-${documentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, documentId, documents]);

  const handleUploadDocument = async (file, metadata) => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }
    if (!agencyId || !clientId) {
      toast.error('Cliente ou agência não identificados');
      return;
    }

    try {
      setUploading(true);

      const uploaded = await UploadFile({ file });
      const fileUrl = uploaded.file_url || uploaded.url;
      if (!fileUrl) throw new Error('URL do arquivo não retornada');

      await ClientDocument.create({
        agencyId,
        clientId,
        serviceId: serviceId || metadata.serviceId || null,
        group: metadata.group || 'other',
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        description: metadata.description || '',
        fileName: file.name,
        fileUrl,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size || 0,
        version: '1.0',
        visibility: metadata.visibility || 'internal',
        status: metadata.status || 'approved',
        metadata: {
          uploaded_manually: true,
          file_size: file.size,
        },
        uploadedBy: userId || user?.id || user?.email || 'Sistema',
      });

      toast.success('Documento enviado com sucesso!');
      setUploadModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error?.message || 'Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (_document) => {
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

  const handleEditDocument = (_document) => {
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -ml-1.5"
            >
              <Link
                to={createPageUrl(`client-detail?clientId=${clientId}`)}
                aria-label="Voltar ao cliente"
              >
                <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight">
                Documentos
              </h1>
              <p className="text-xs text-[#7A7595]">
                {stats.total || 0} documento{(stats.total || 0) === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: FileText, label: 'Total de Documentos', value: stats.total, idx: 0 },
            { icon: Eye, label: 'Visíveis ao Cliente', value: stats.byVisibility.client || 0, idx: 2 },
            { icon: Archive, label: 'Relatórios', value: stats.byGroup.report || 0, idx: 3 },
            { icon: User, label: 'Documentos Internos', value: stats.byVisibility.internal || 0, idx: 1 },
          ].map(({ icon: Icon, label, value, idx }) => {
            const pastel = getCardPastel(idx);
            return (
              <Card key={label} className={`rounded-2xl border-transparent shadow-sm ${pastel.bg}`}>
                <CardContent className="p-6 text-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${pastel.tag}`}>
                    <Icon className={`w-5 h-5 ${pastel.text}`} />
                  </div>
                  <div className="text-2xl font-bold text-[#18162A]">{value}</div>
                  <div className="text-sm text-[#7A7595]">{label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filtros */}
        <Card className="rounded-2xl border-transparent shadow-sm">
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
                highlighted={documentId === document.id}
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
              onClick: () => setUploadModalOpen(true),
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

        <DocumentUploadModal
          isOpen={uploadModalOpen}
          onClose={() => !uploading && setUploadModalOpen(false)}
          onUpload={handleUploadDocument}
          uploading={uploading}
        />
    </div>
  );
}

function DocumentUploadModal({ isOpen, onClose, onUpload, uploading }) {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    group: 'other',
    visibility: 'internal',
    status: 'approved',
  });

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setMetadata({
        title: '',
        description: '',
        group: 'other',
        visibility: 'internal',
        status: 'approved',
      });
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected && !metadata.title) {
      setMetadata((prev) => ({
        ...prev,
        title: selected.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }
    if (!metadata.title.trim()) {
      toast.error('Informe o título do documento');
      return;
    }
    onUpload(file, metadata);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-file">Arquivo</Label>
            <Input
              id="document-file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip"
              required
              disabled={uploading}
            />
            {file && (
              <p className="text-xs text-[#7A7595]">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-title">Título</Label>
            <Input
              id="document-title"
              value={metadata.title}
              onChange={(e) => setMetadata((prev) => ({ ...prev, title: e.target.value }))}
              required
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-description">Descrição (opcional)</Label>
            <Textarea
              id="document-description"
              value={metadata.description}
              onChange={(e) => setMetadata((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select
                value={metadata.group}
                onValueChange={(value) => setMetadata((prev) => ({ ...prev, group: value }))}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_GROUPS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visibilidade</Label>
              <Select
                value={metadata.visibility}
                onValueChange={(value) => setMetadata((prev) => ({ ...prev, visibility: value }))}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={metadata.status}
              onValueChange={(value) => setMetadata((prev) => ({ ...prev, status: value }))}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
