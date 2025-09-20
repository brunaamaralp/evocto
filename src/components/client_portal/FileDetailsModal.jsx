import React from 'react';
import { motion } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  FileText,
  Image,
  File,
  HardDrive,
  Tag,
  Clock
} from 'lucide-react';

/**
 * Modal para exibir detalhes de um arquivo
 */
export default function FileDetailsModal({ 
  isOpen, 
  onClose, 
  file, 
  onDownload, 
  onDelete 
}) {
  if (!file) return null;

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileText;
    return File;
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'diagnostic': return FileText;
      case 'report': return FileText;
      case 'deliverable': return FileText;
      case 'contract': return FileText;
      case 'presentation': return FileText;
      case 'analysis': return FileText;
      default: return File;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'diagnostic': return 'bg-blue-100 text-blue-700';
      case 'report': return 'bg-green-100 text-green-700';
      case 'deliverable': return 'bg-purple-100 text-purple-700';
      case 'contract': return 'bg-orange-100 text-orange-700';
      case 'presentation': return 'bg-indigo-100 text-indigo-700';
      case 'analysis': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'diagnostic': return 'Diagnóstico';
      case 'report': return 'Relatórios';
      case 'deliverable': return 'Entregáveis';
      case 'contract': return 'Contratos';
      case 'presentation': return 'Apresentações';
      case 'analysis': return 'Análises';
      default: return 'Outros';
    }
  };

  const FileIcon = getFileIcon(file.fileType);
  const CategoryIcon = getCategoryIcon(file.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {file.fileName}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {file.description || 'Sem descrição'}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detalhes completos do arquivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Categoria:</span>
                <Badge className={getCategoryColor(file.category)}>
                  <CategoryIcon className="w-3 h-3 mr-1" />
                  {getCategoryLabel(file.category)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tamanho:</span>
                <span className="text-sm text-gray-600">{getFileSize(file.fileSize)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tipo:</span>
                <span className="text-sm text-gray-600">{file.fileType}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Enviado em:</span>
                <span className="text-sm text-gray-600">
                  {new Date(file.uploadedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Enviado por:</span>
                <span className="text-sm text-gray-600">{file.uploadedBy}</span>
              </div>
              
              {file.lastModified && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Modificado:</span>
                  <span className="text-sm text-gray-600">
                    {new Date(file.lastModified).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tags adicionais */}
          {file.tags && file.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Versões do arquivo */}
          {file.versions && file.versions.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Versões:</h4>
              <div className="space-y-2">
                {file.versions.map((version, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">v{version.version}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(version.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{getFileSize(version.size)}</span>
                      <Button size="sm" variant="ghost" onClick={() => onDownload(version.id)}>
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentários */}
          {file.comments && file.comments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Comentários:</h4>
              <div className="space-y-2">
                {file.comments.map((comment, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">{comment.author}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview do arquivo */}
          {file.fileType.startsWith('image/') && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={file.previewUrl || file.url} 
                  alt={file.fileName}
                  className="max-w-full max-h-64 mx-auto rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              onDownload(file.id);
            }}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              if (window.confirm('Tem certeza que deseja remover este arquivo?')) {
                onDelete();
              }
            }}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



