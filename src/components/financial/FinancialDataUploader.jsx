
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Image, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { createIngestEnvelope } from '@/api/functions';
import { processIngestEnvelope } from '@/api/functions';
import { createImportJob } from '@/api/functions';

const SUPPORTED_FORMATS = [
  {
    type: 'xlsx',
    name: 'Excel (.xlsx, .xls)',
    icon: FileSpreadsheet,
    description: 'Planilhas de DRE, Balanço, Fluxo de Caixa',
    maxSize: '10MB'
  },
  {
    type: 'csv',
    name: 'CSV',
    icon: FileSpreadsheet,
    description: 'Dados tabulares separados por vírgula',
    maxSize: '5MB'
  },
  {
    type: 'pdf',
    name: 'PDF',
    icon: FileText,
    description: 'Relatórios financeiros, DREs, Balanços',
    maxSize: '15MB'
  },
  {
    type: 'image',
    name: 'Imagens (JPG, PNG)',
    icon: Image,
    description: 'Fotos de relatórios, extratos bancários',
    maxSize: '8MB'
  }
];

const DATA_TEMPLATES = [
  {
    id: 'dre_template',
    name: 'DRE (Demonstrativo de Resultado)',
    description: 'Template para upload de DRE completo',
    fields: ['receita_bruta', 'receita_liquida', 'custos_variaveis', 'custos_fixos', 'lucro_liquido'],
    downloadUrl: '/templates/dre_template.xlsx'
  },
  {
    id: 'balanco_template',
    name: 'Balanço Patrimonial',
    description: 'Template para ativos, passivos e patrimônio',
    fields: ['ativo_circulante', 'passivo_circulante', 'patrimonio_liquido'],
    downloadUrl: '/templates/balanco_template.xlsx'
  },
  {
    id: 'fluxo_caixa_template',
    name: 'Fluxo de Caixa',
    description: 'Template para entradas e saídas de caixa',
    fields: ['entradas_caixa', 'saidas_caixa', 'saldo_inicial'],
    downloadUrl: '/templates/fluxo_caixa_template.xlsx'
  }
];

export default function FinancialDataUploader({ 
  clientId, 
  serviceId,
  onUploadComplete,
  onError,
  className = "" 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [processingResults, setProcessingResults] = useState(null);
  const [error, setError] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const errors = [];
    
    // Validar tamanho
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      errors.push(`Arquivo muito grande. Máximo: ${formatFileSize(maxSizeBytes)}`);
    }

    // Validar tipo
    const extension = file.name.split('.').pop().toLowerCase();
    const supportedExtensions = ['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png'];
    if (!supportedExtensions.includes(extension)) {
      errors.push(`Formato não suportado: ${extension}`);
    }

    return errors;
  };

  const uploadFiles = useCallback(async (files) => {
    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const uploadResults = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 0.5) / files.length) * 100);

        // Criar envelope de ingestão
        const formData = new FormData();
        formData.append('file', file);

        const envelopeResult = await createIngestEnvelope(formData);
        
        if (!envelopeResult.success) {
          throw new Error(`Erro no upload: ${envelopeResult.error}`);
        }

        uploadResults.push({
          file: file.name,
          envelopeId: envelopeResult.envelope_id,
          status: 'uploaded',
          size: file.size,
          type: file.type
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setUploadedFiles(prev => [...prev, ...uploadResults]);
      
      if (onUploadComplete) {
        onUploadComplete(uploadResults);
      }

    } catch (err) {
      console.error('Erro no upload:', err);
      setError(err.message);
      if (onError) onError(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete, onError]);

  const handleFiles = useCallback(async (files) => {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      const fileErrors = validateFile(file);
      if (fileErrors.length === 0) {
        validFiles.push(file);
      } else {
        errors.push({ file: file.name, errors: fileErrors });
      }
    }

    if (errors.length > 0) {
      setError(`Alguns arquivos têm problemas: ${errors.map(e => `${e.file}: ${e.errors.join(', ')}`).join('; ')}`);
      if (validFiles.length === 0) return;
    }

    await uploadFiles(validFiles);
  }, [uploadFiles, setError]); // Added setError here, as it's used inside. validateFile is a pure function.

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const processUploadedFile = async (uploadedFile) => {
    try {
      setProcessing(true);
      setError(null);

      // Determinar entidades alvo baseado no template selecionado
      const targetEntities = selectedTemplate 
        ? ['FinancialKPI'] // Mapear para KPIs específicos
        : ['FinancialKPI']; // Detecção automática

      // Criar job de importação
      const importResult = await createImportJob({
        envelopeId: uploadedFile.envelopeId,
        clientId,
        serviceId,
        targetEntities,
        processingConfig: {
          auto_mapping: true,
          skip_duplicates: true,
          template_id: selectedTemplate?.id
        }
      });

      if (!importResult.success) {
        throw new Error(`Erro no processamento: ${importResult.error}`);
      }

      // Processar envelope
      const processResult = await processIngestEnvelope({
        envelopeId: uploadedFile.envelopeId,
        targetEntity: 'FinancialKPI'
      });

      setProcessingResults(processResult);

      // Atualizar status do arquivo
      setUploadedFiles(prev => prev.map(file => 
        file.envelopeId === uploadedFile.envelopeId
          ? { ...file, status: 'processed', results: processResult }
          : file
      ));

    } catch (err) {
      console.error('Erro no processamento:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const removeUploadedFile = (envelopeId) => {
    setUploadedFiles(prev => prev.filter(file => file.envelopeId !== envelopeId));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Seletor de Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Templates de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DATA_TEMPLATES.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{template.fields.length} campos</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(template.downloadUrl, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedTemplate && (
            <Alert className="mt-4">
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>
                Template selecionado: <strong>{selectedTemplate.name}</strong>. 
                Os dados serão mapeados automaticamente para os campos: {selectedTemplate.fields.join(', ')}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Área de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Dados Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {dragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
            </h3>
            <p className="text-gray-600 mb-4">
              Suporta Excel, CSV, PDF e imagens até 15MB
            </p>
            
            <Input
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                Selecionar Arquivos
              </Button>
            </Label>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Enviando arquivos...</span>
                <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Formatos Suportados */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Formatos Suportados:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SUPPORTED_FORMATS.map((format) => {
                const IconComponent = format.icon;
                return (
                  <div key={format.type} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <IconComponent className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-sm">{format.name}</h5>
                      <p className="text-xs text-gray-600">{format.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Máx: {format.maxSize}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Arquivos Enviados */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Arquivos Processados ({uploadedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div 
                  key={file.envelopeId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                    <div>
                      <h5 className="font-medium">{file.file}</h5>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        file.status === 'processed' ? 'success' :
                        file.status === 'uploaded' ? 'default' :
                        'destructive'
                      }
                    >
                      {file.status === 'processed' ? 'Processado' :
                       file.status === 'uploaded' ? 'Enviado' :
                       'Erro'}
                    </Badge>

                    {file.status === 'uploaded' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processUploadedFile(file)}
                        disabled={processing}
                      >
                        {processing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        Processar
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadedFile(file.envelopeId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados do Processamento */}
      {processingResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Resultados do Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-lg text-green-800">
                  {processingResults.extraction_results?.extracted_records_count || 0}
                </h4>
                <p className="text-sm text-green-600">Registros Extraídos</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-lg text-blue-800">
                  {processingResults.validation_results?.data_quality_score || 0}%
                </h4>
                <p className="text-sm text-blue-600">Qualidade dos Dados</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-lg text-purple-800">
                  {processingResults.extraction_results?.confidence_score || 0}%
                </h4>
                <p className="text-sm text-purple-600">Confiança</p>
              </div>
            </div>

            {processingResults.next_steps && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h5 className="font-medium mb-2">Próximos Passos:</h5>
                <ul className="text-sm space-y-1">
                  {processingResults.next_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Erros */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
