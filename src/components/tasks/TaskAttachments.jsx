import React, { useState, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, File, FileImage, FileText, Download,
  Trash2, Eye, Plus, X, Check, AlertCircle,
  Camera, Shield
} from 'lucide-react';
import { toast } from 'sonner';

const FILE_TYPE_ICONS = {
  'image/': FileImage,
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument': FileText,
  'text/': FileText,
  default: File
};

const FILE_TYPE_COLORS = {
  'image/': 'bg-green-100 text-green-700',
  'application/pdf': 'bg-red-100 text-red-700',
  'application/msword': 'bg-blue-100 text-blue-700',
  'application/vnd.openxmlformats-officedocument': 'bg-blue-100 text-blue-700',
  'text/': 'bg-gray-100 text-gray-700',
  default: 'bg-gray-100 text-gray-700'
};

const ATTACHMENT_TYPES = {
  document: { label: 'Documento', color: 'bg-blue-100 text-blue-700' },
  image: { label: 'Imagem', color: 'bg-green-100 text-green-700' },
  evidence: { label: 'Evidência', color: 'bg-purple-100 text-purple-700' },
  reference: { label: 'Referência', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Outro', color: 'bg-gray-100 text-gray-700' }
};

export default function TaskAttachments({ task, onUpdate }) {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentType, setAttachmentType] = useState('document');
  const [description, setDescription] = useState('');
  const [isEvidence, setIsEvidence] = useState(false);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const attachments = task.attachments || [];
      const newAttachments = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);

        try {
          const uploadResult = await UploadFile({ file });
          
          const attachment = {
            id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: uploadResult.file_url,
            type: attachmentType,
            mimeType: file.type,
            size: file.size,
            uploadedBy: user.id,
            uploadedByName: user.full_name || user.email,
            uploadedAt: new Date().toISOString(),
            description: description.trim() || '',
            isEvidence: isEvidence
          };

          newAttachments.push(attachment);
        } catch (fileError) {
          console.error(`Erro ao fazer upload de ${file.name}:`, fileError);
          toast.error(`Erro ao fazer upload de ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        const updatedAttachments = [...attachments, ...newAttachments];
        
        await Task.update(task.id, { 
          attachments: updatedAttachments 
        });

        // Adicionar comentário automático
        const comments = task.comments || [];
        comments.push({
          id: `comment_${Date.now()}`,
          userId: user.id,
          userEmail: user.email,
          userName: user.full_name || user.email,
          content: `Adicionou ${newAttachments.length} anexo(s): ${newAttachments.map(a => a.name).join(', ')}`,
          type: 'system',
          attachments: newAttachments.map(a => a.id),
          createdAt: new Date().toISOString(),
          isEdited: false
        });

        const updatedTask = { 
          ...task, 
          attachments: updatedAttachments,
          comments 
        };
        onUpdate(updatedTask);
        
        setSelectedFiles([]);
        setDescription('');
        setShowUploadForm(false);
        toast.success(`${newAttachments.length} arquivo(s) enviado(s) com sucesso!`);
      }

    } catch (error) {
      console.error('Erro geral no upload:', error);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteAttachment = async (attachmentId) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      const attachments = task.attachments || [];
      const attachment = attachments.find(a => a.id === attachmentId);
      const updatedAttachments = attachments.filter(a => a.id !== attachmentId);

      await Task.update(task.id, { 
        attachments: updatedAttachments 
      });

      // Adicionar comentário automático
      const comments = task.comments || [];
      comments.push({
        id: `comment_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: `Removeu o anexo: ${attachment?.name || 'arquivo'}`,
        type: 'system',
        createdAt: new Date().toISOString(),
        isEdited: false
      });

      const updatedTask = { 
        ...task, 
        attachments: updatedAttachments,
        comments
      };
      onUpdate(updatedTask);
      
      toast.success('Anexo excluído!');

    } catch (error) {
      console.error('Erro ao excluir anexo:', error);
      toast.error('Erro ao excluir anexo');
    }
  };

  const getFileIcon = (mimeType) => {
    const iconKey = Object.keys(FILE_TYPE_ICONS).find(key => 
      mimeType?.startsWith(key)
    ) || 'default';
    return FILE_TYPE_ICONS[iconKey];
  };

  const getFileColor = (mimeType) => {
    const colorKey = Object.keys(FILE_TYPE_COLORS).find(key => 
      mimeType?.startsWith(key)
    ) || 'default';
    return FILE_TYPE_COLORS[colorKey];
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Tamanho desconhecido';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const attachments = task.attachments || [];
  const evidences = attachments.filter(a => a.isEvidence);
  const documents = attachments.filter(a => !a.isEvidence);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Anexos e Evidências</CardTitle>
            <Button 
              size="sm"
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>

        {showUploadForm && (
          <CardContent className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input').click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">
                Arraste arquivos aqui ou <span className="text-blue-600 underline">clique para selecionar</span>
              </p>
              <p className="text-sm text-gray-500">
                Suporte para documentos, imagens e outros arquivos
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Anexo
                    </label>
                    <select
                      value={attachmentType}
                      onChange={(e) => setAttachmentType(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {Object.entries(ATTACHMENT_TYPES).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-evidence"
                      checked={isEvidence}
                      onChange={(e) => setIsEvidence(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="is-evidence" className="text-sm font-medium flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      É uma evidência
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição (opcional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o conteúdo ou propósito destes arquivos..."
                    className="h-20 resize-none"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium mb-2">Arquivos selecionados:</h4>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file.type);
                      return (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <FileIcon className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Enviando arquivos...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    onClick={uploadFiles}
                    disabled={uploading || selectedFiles.length === 0}
                    className="flex items-center gap-1"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Enviando...' : `Enviar ${selectedFiles.length} arquivo(s)`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFiles([]);
                      setShowUploadForm(false);
                      setDescription('');
                    }}
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Evidências Section */}
      {evidences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Evidências ({evidences.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {evidences.map((attachment) => {
                const FileIcon = getFileIcon(attachment.mimeType);
                const typeConfig = ATTACHMENT_TYPES[attachment.type] || ATTACHMENT_TYPES.other;
                
                return (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${getFileColor(attachment.mimeType)}`}>
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{attachment.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.size)}</span>
                          <Badge className={typeConfig.color} variant="secondary">
                            {typeConfig.label}
                          </Badge>
                          <span>por {attachment.uploadedByName}</span>
                        </div>
                        {attachment.description && (
                          <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <a href={attachment.url} download={attachment.name}>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAttachment(attachment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentos Section */}
      {documents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Documentos ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {documents.map((attachment) => {
                const FileIcon = getFileIcon(attachment.mimeType);
                const typeConfig = ATTACHMENT_TYPES[attachment.type] || ATTACHMENT_TYPES.other;
                
                return (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${getFileColor(attachment.mimeType)}`}>
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{attachment.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.size)}</span>
                          <Badge className={typeConfig.color} variant="secondary">
                            {typeConfig.label}
                          </Badge>
                          <span>por {attachment.uploadedByName}</span>
                        </div>
                        {attachment.description && (
                          <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <a href={attachment.url} download={attachment.name}>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAttachment(attachment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : !evidences.length && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum anexo ainda</p>
              <p className="text-sm">Adicione documentos, imagens ou evidências</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}