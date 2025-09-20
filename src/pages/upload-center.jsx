
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Image,
  Table
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createIngestEnvelope } from '@/api/functions';
import { processIngestEnvelope } from '@/api/functions';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function UploadCenter() {
  const { user } = useSession();
  const [uploadQueue, setUploadQueue] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Validações de arquivo - mover para fora do componente ou usar useMemo
  const ALLOWED_TYPES = useMemo(() => ({
    'text/csv': '.csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'text/plain': '.txt'
  }), []);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 5;

  const handleFileSelect = useCallback((files) => {
    const validateFile = (file) => {
      const errors = [];
      
      if (!ALLOWED_TYPES[file.type]) {
        errors.push(`Tipo não permitido. Use: ${Object.values(ALLOWED_TYPES).join(', ')}`);
      }
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
      
      return errors;
    };

    const fileArray = Array.from(files);
    
    if (uploadQueue.length + fileArray.length > MAX_FILES) {
      alert(`Máximo ${MAX_FILES} arquivos por lote`);
      return;
    }

    const newUploads = fileArray.map(file => {
      const errors = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: errors.length > 0 ? 'error' : 'ready',
        progress: 0,
        errors,
        result: null
      };
    });

    setUploadQueue(prev => [...prev, ...newUploads]);
  }, [uploadQueue.length, ALLOWED_TYPES, MAX_FILE_SIZE]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const removeFile = (id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  const processUploads = async () => {
    const validUploads = uploadQueue.filter(item => item.status === 'ready');
    if (validUploads.length === 0) return;

    setProcessing(true);

    for (const upload of validUploads) {
      try {
        // Atualizar status para uploading
        setUploadQueue(prev => prev.map(item => 
          item.id === upload.id 
            ? { ...item, status: 'uploading', progress: 25 }
            : item
        ));

        // 1. Criar envelope de ingestão
        const formData = new FormData();
        formData.append('file', upload.file);

        const envelopeResponse = await createIngestEnvelope(formData);
        
        if (!envelopeResponse.data.success) {
          throw new Error(envelopeResponse.data.error || 'Erro ao criar envelope');
        }

        // Atualizar progresso
        setUploadQueue(prev => prev.map(item => 
          item.id === upload.id 
            ? { ...item, progress: 50 }
            : item
        ));

        // 2. Processar envelope
        const processResponse = await processIngestEnvelope({
          envelopeId: envelopeResponse.data.envelope_database_id,
          targetEntity: 'Client', // Por enquanto, default para Client
          extractionSchema: null
        });

        if (!processResponse.data.success) {
          throw new Error(processResponse.data.error || 'Erro ao processar arquivo');
        }

        // Sucesso
        setUploadQueue(prev => prev.map(item => 
          item.id === upload.id 
            ? { 
                ...item, 
                status: 'completed', 
                progress: 100,
                result: {
                  envelopeId: envelopeResponse.data.envelope_database_id,
                  extractedRecords: processResponse.data.extraction_results?.extracted_records_count || 0,
                  qualityScore: processResponse.data.validation_results?.data_quality_score || 0
                }
              }
            : item
        ));

      } catch (error) {
        console.error(`Erro ao processar ${upload.name}:`, error);
        setUploadQueue(prev => prev.map(item => 
          item.id === upload.id 
            ? { 
                ...item, 
                status: 'failed', 
                errors: [error.message || 'Erro desconhecido']
              }
            : item
        ));
      }
    }

    setProcessing(false);
  };

  const StatusBadge = ({ status }) => {
    const variants = {
      ready: { variant: 'secondary', text: 'Pronto' },
      uploading: { variant: 'default', text: 'Processando...' },
      completed: { variant: 'default', text: 'Concluído', className: 'bg-green-100 text-green-800' },
      failed: { variant: 'destructive', text: 'Erro' },
      error: { variant: 'destructive', text: 'Inválido' }
    };

    const config = variants[status] || variants.ready;
    
    return (
      <Badge 
        variant={config.variant}
        className={config.className}
      >
        {config.text}
      </Badge>
    );
  };

  const getFileIcon = (type) => {
    if (type.includes('csv') || type.includes('spreadsheet') || type.includes('excel')) {
      return <Table className="w-5 h-5 text-green-600" />;
    }
    if (type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    if (type.includes('image')) {
      return <Image className="w-5 h-5 text-blue-600" />;
    }
    return <File className="w-5 h-5 text-gray-600" />;
  };

  const completedUploads = uploadQueue.filter(item => item.status === 'completed');
  const hasReadyFiles = uploadQueue.some(item => item.status === 'ready');

  return (
    <div className="container-page py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Central de Upload
          </h1>
          <p className="text-gray-600">
            Faça upload de arquivos CSV, Excel, PDF ou imagens para extrair dados automaticamente
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Selecionar Arquivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input').click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Suportados: CSV, Excel, PDF, PNG, JPG (máx. 10MB cada)
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept={Object.keys(ALLOWED_TYPES).join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {uploadQueue.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Arquivos ({uploadQueue.length}/{MAX_FILES})
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setUploadQueue([])}
                      variant="outline"
                      size="sm"
                      disabled={processing}
                    >
                      Limpar Tudo
                    </Button>
                    <Button
                      onClick={processUploads}
                      disabled={!hasReadyFiles || processing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {processing ? 'Processando...' : 'Processar Arquivos'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getFileIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(item.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {item.errors.length > 0 && (
                            <div className="mt-1">
                              {item.errors.map((error, idx) => (
                                <p key={idx} className="text-sm text-red-600">
                                  {error}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.result && (
                            <div className="mt-1 text-sm text-green-600">
                              {item.result.extractedRecords} registros extraídos
                              {item.result.qualityScore > 0 && (
                                ` • Qualidade: ${item.result.qualityScore}%`
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        
                        {item.status === 'uploading' && (
                          <div className="w-20">
                            <Progress value={item.progress} className="h-2" />
                          </div>
                        )}

                        <Button
                          onClick={() => removeFile(item.id)}
                          variant="ghost"
                          size="sm"
                          disabled={processing && item.status === 'uploading'}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Passos */}
        {completedUploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                Upload Concluído
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {completedUploads.length} arquivo(s) processado(s) com sucesso. 
                  Agora você pode revisar os dados extraídos e fazer o mapeamento final.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button asChild>
                  <Link to={createPageUrl('data-review')}>
                    Revisar Dados Extraídos
                  </Link>
                </Button>
                
                <Button asChild variant="outline">
                  <Link to={createPageUrl('mapping-wizard')}>
                    Assistente de Mapeamento
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
