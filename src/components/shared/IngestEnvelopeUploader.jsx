import React, { useState, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { createIngestEnvelope } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Check, 
  Loader2,
  X,
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

const SUPPORTED_FORMATS = {
  'text/csv': { icon: FileText, label: 'CSV', color: 'bg-green-100 text-green-800' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileText, label: 'Excel', color: 'bg-blue-100 text-blue-800' },
  'application/pdf': { icon: File, label: 'PDF', color: 'bg-red-100 text-red-800' },
  'image/png': { icon: Image, label: 'PNG', color: 'bg-purple-100 text-purple-800' },
  'image/jpeg': { icon: Image, label: 'JPG', color: 'bg-purple-100 text-purple-800' },
  'text/plain': { icon: FileText, label: 'Texto', color: 'bg-gray-100 text-gray-800' }
};

export default function IngestEnvelopeUploader({ 
  clientId = null,
  serviceId = null,
  onUploadComplete = () => {},
  onUploadError = () => {},
  acceptedTypes = Object.keys(SUPPORTED_FORMATS),
  className = ""
}) {
  const { user } = useSession();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [completedUploads, setCompletedUploads] = useState([]);
  const [uploadOptions, setUploadOptions] = useState({
    sourceType: 'upload_manual',
    tags: '',
    userIntent: 'data_import',
    targetEntity: ''
  });

  const processFile = async (file) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    // Adicionar à lista de upload
    setUploadingFiles(prev => [...prev, {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    }]);

    try {
      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);
      
      if (clientId) formData.append('clientId', clientId);
      if (serviceId) formData.append('serviceId', serviceId);
      formData.append('sourceType', uploadOptions.sourceType);
      formData.append('tags', uploadOptions.tags);
      formData.append('userIntent', uploadOptions.userIntent);
      if (uploadOptions.targetEntity) formData.append('targetEntity', uploadOptions.targetEntity);

      // Simular progresso
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 25 } : f
      ));

      // Chamar função de criação de envelope
      const { data: result } = await createIngestEnvelope(formData);

      // Atualizar progresso
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 75 } : f
      ));

      // Aguardar um pouco para simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Completar upload
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      setCompletedUploads(prev => [...prev, {
        id: fileId,
        name: file.name,
        envelope_id: result.envelope_id,
        envelope_database_id: result.envelope_database_id,
        file_identity: result.file_identity,
        processing_status: result.processing_status,
        job_id: result.job_id,
        estimated_time: result.estimated_processing_time,
        completed_at: new Date()
      }]);

      toast.success(`${file.name} enviado com sucesso!`);
      onUploadComplete(result);

    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error', error: error.message } : f
      ));

      toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
      onUploadError(error);
    }
  };

  const handleFiles = useCallback(async (files) => {
    // Filtrar arquivos suportados
    const supportedFiles = files.filter(file => 
      acceptedTypes.includes(file.type) || 
      acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.split('/')[1]))
    );

    if (supportedFiles.length !== files.length) {
      toast.warning(`${files.length - supportedFiles.length} arquivo(s) não suportado(s) foram ignorados`);
    }

    if (supportedFiles.length === 0) {
      toast.error('Nenhum arquivo suportado foi selecionado');
      return;
    }

    // Processar cada arquivo
    for (const file of supportedFiles) {
      await processFile(file);
    }
  }, [acceptedTypes, processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const retryUpload = async (fileData) => {
    // Remover da lista de erro e tentar novamente
    setUploadingFiles(prev => prev.filter(f => f.id !== fileData.id));
    toast.info('Selecione o arquivo novamente para tentar o upload');
  };

  const removeCompleted = (uploadId) => {
    setCompletedUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const getFileIcon = (fileType) => {
    const config = SUPPORTED_FORMATS[fileType] || { icon: File, label: 'Arquivo', color: 'bg-gray-100 text-gray-800' };
    return config;
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatEstimatedTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  };

  return (
    <div className={className}>
      {/* Opções de Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Fonte</Label>
              <Select value={uploadOptions.sourceType} onValueChange={(value) => 
                setUploadOptions(prev => ({ ...prev, sourceType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload_manual">Upload Manual</SelectItem>
                  <SelectItem value="drag_drop">Arrastar e Soltar</SelectItem>
                  <SelectItem value="bulk_upload">Upload em Massa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Entidade Alvo (opcional)</Label>
              <Select value={uploadOptions.targetEntity} onValueChange={(value) =>
                setUploadOptions(prev => ({ ...prev, targetEntity: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detectar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Auto-detectar</SelectItem>
                  <SelectItem value="Client">Clientes</SelectItem>
                  <SelectItem value="FinancialKPI">KPIs Financeiros</SelectItem>
                  <SelectItem value="Task">Tarefas</SelectItem>
                  <SelectItem value="ClientDocument">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={uploadOptions.tags}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="financeiro, dre, balanco, 2024"
            />
          </div>
        </CardContent>
      </Card>

      {/* Área de Drop/Upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Arrastar arquivos aqui ou clique para selecionar
        </h3>
        <p className="text-gray-600 mb-4">
          Suporta: CSV, Excel, PDF, Imagens, Texto
        </p>
        
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        
        <Button asChild>
          <label htmlFor="file-upload" className="cursor-pointer">
            Selecionar Arquivos
          </label>
        </Button>
      </div>

      {/* Files em Upload */}
      {uploadingFiles.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando Arquivos ({uploadingFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadingFiles.map((file) => {
                const fileConfig = getFileIcon(file.type);
                const IconComponent = fileConfig.icon;
                
                return (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={fileConfig.color}>
                            {fileConfig.label}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                      
                      {file.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {file.status === 'error' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-600">{file.error}</span>
                          <Button size="sm" variant="outline" onClick={() => retryUpload(file)}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Tentar Novamente
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Completed */}
      {completedUploads.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Uploads Concluídos ({completedUploads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedUploads.map((upload) => (
                <div key={upload.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Check className="w-5 h-5 text-green-600" />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{upload.name}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => removeCompleted(upload.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>ID: {upload.envelope_id}</span>
                      <span>Job: {upload.job_id}</span>
                      <span>Tempo estimado: {formatEstimatedTime(upload.estimated_time)}</span>
                      <Badge variant="outline" className="text-xs">
                        {upload.processing_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formatos Suportados */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 mb-2">Formatos suportados:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {Object.entries(SUPPORTED_FORMATS).map(([type, config]) => (
            <Badge key={type} className={config.color}>
              {config.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}