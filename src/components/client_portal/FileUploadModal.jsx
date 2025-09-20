import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Image, 
  File,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Folder
} from 'lucide-react';
import { useClientFileManagement } from '@/hooks/useClientFileManagement';
import { toast } from 'sonner';

/**
 * Modal para upload de arquivos
 */
export default function FileUploadModal({ 
  isOpen, 
  onClose, 
  clientId, 
  serviceId,
  onSuccess 
}) {
  const { uploadFile, uploading } = useClientFileManagement();
  const fileInputRef = useRef(null);
  
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    category: 'other',
    description: '',
    tags: [],
    visibility: 'client'
  });
  const [errors, setErrors] = useState({});

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Validar arquivos
    const validFiles = selectedFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} é muito grande (máximo 10MB)`);
        return false;
      }
      return true;
    });

    // Adicionar arquivos à lista
    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setErrors({ files: 'Selecione pelo menos um arquivo' });
      return;
    }

    try {
      // Upload de cada arquivo
      for (const fileItem of files) {
        await uploadFile(fileItem.file, {
          ...metadata,
          clientId,
          serviceId
        });
      }
      
      onSuccess();
      handleClose();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleClose = () => {
    setFiles([]);
    setMetadata({
      category: 'other',
      description: '',
      tags: [],
      visibility: 'client'
    });
    setErrors({});
    onClose();
  };

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
      case 'deliverable': return Folder;
      case 'contract': return FileText;
      case 'presentation': return FileText;
      case 'analysis': return FileText;
      default: return File;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'diagnostic': return 'Diagnóstico';
      case 'report': return 'Relatório';
      case 'deliverable': return 'Entregável';
      case 'contract': return 'Contrato';
      case 'presentation': return 'Apresentação';
      case 'analysis': return 'Análise';
      default: return 'Outro';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Enviar Arquivos
          </DialogTitle>
          <DialogDescription>
            Selecione os arquivos que deseja enviar e configure as informações.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Arquivos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Arquivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecionar Arquivos</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 mb-1">Clique para selecionar arquivos</p>
                  <p className="text-sm text-gray-500">ou arraste e solte aqui</p>
                  <p className="text-xs text-gray-400 mt-2">Máximo 10MB por arquivo</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                />
                {errors.files && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.files}
                  </p>
                )}
              </div>

              {/* Lista de Arquivos Selecionados */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Arquivos Selecionados ({files.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {files.map((fileItem) => {
                      const FileIcon = getFileIcon(fileItem.type);
                      return (
                        <motion.div
                          key={fileItem.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <FileIcon className="w-5 h-5 text-gray-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {fileItem.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getFileSize(fileItem.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFile(fileItem.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informações dos Arquivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select 
                    value={metadata.category} 
                    onValueChange={(value) => setMetadata(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnostic">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Diagnóstico
                        </div>
                      </SelectItem>
                      <SelectItem value="report">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Relatório
                        </div>
                      </SelectItem>
                      <SelectItem value="deliverable">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4" />
                          Entregável
                        </div>
                      </SelectItem>
                      <SelectItem value="contract">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Contrato
                        </div>
                      </SelectItem>
                      <SelectItem value="presentation">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Apresentação
                        </div>
                      </SelectItem>
                      <SelectItem value="analysis">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Análise
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4" />
                          Outro
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibilidade</Label>
                  <Select 
                    value={metadata.visibility} 
                    onValueChange={(value) => setMetadata(prev => ({ ...prev, visibility: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Apenas Cliente</SelectItem>
                      <SelectItem value="public">Público</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea
                  id="description"
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o conteúdo dos arquivos..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (Opcional)</Label>
                <Input
                  id="tags"
                  value={metadata.tags.join(', ')}
                  onChange={(e) => setMetadata(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                  }))}
                  placeholder="Ex: importante, revisar, final"
                />
                <p className="text-xs text-gray-500">Separe as tags por vírgula</p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {files.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-900">Preview do Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {React.createElement(getCategoryIcon(metadata.category), { 
                      className: "w-5 h-5 text-blue-600" 
                    })}
                    <span className="font-medium text-blue-900">
                      {getCategoryLabel(metadata.category)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-blue-800">
                    <p><strong>Arquivos:</strong> {files.length} arquivo(s)</p>
                    <p><strong>Tamanho total:</strong> {getFileSize(files.reduce((sum, f) => sum + f.size, 0))}</p>
                    <p><strong>Visibilidade:</strong> {metadata.visibility === 'client' ? 'Apenas Cliente' : 'Público'}</p>
                    {metadata.description && (
                      <p><strong>Descrição:</strong> {metadata.description}</p>
                    )}
                    {metadata.tags.length > 0 && (
                      <p><strong>Tags:</strong> {metadata.tags.join(', ')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Enviando...' : `Enviar ${files.length} Arquivo(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

