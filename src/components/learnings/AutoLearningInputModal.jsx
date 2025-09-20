
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { LearningEntry, AuditLog } from '@/api/entities';
import { UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import { handleRobustAIError, withRobustAICall } from '@/components/ai/AIErrorHandler';
import ConfidenceIndicator from '@/components/ai/ConfidenceIndicator';
import { randomUUID } from '../debug/CryptoShim'; // ✅ Browser-safe crypto
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UploadCloud, File, Loader2, CheckCircle, AlertTriangle, FileText, Image, BarChart3, Hash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Safe development detection
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const learningSchema = {
    type: "object",
    properties: {
        title: { type: "string", description: "Um título conciso e informativo para o aprendizado." },
        description: { type: "string", description: "Uma descrição detalhada do aprendizado extraído do arquivo." },
        niche: { type: "string", description: "O nicho de mercado (ex: SaaS B2B, E-commerce de moda). Se não estiver explícito, tente inferir do contexto." },
        format: { type: "string", description: "Formato/canal de comunicação (ex: post orgânico, stories, e-mail, anúncio pago). SEMPRE tente identificar." },
        trigger: { type: "string", description: "Gatilho psicológico usado (ex: urgência, escassez, prova social, autoridade). Se não identificar, deixe vazio." },
        promise: { type: "string", description: "Principal promessa ou benefício comunicado. Se não for claro, deixe vazio." },
        rationale: { type: "string", description: "Explicação do porquê funcionou - contexto, timing, audiência. MUITO IMPORTANTE: sempre tente fornecer uma explicação mesmo que básica." },
        tags: { type: "array", items: { type: "string" }, description: "Uma lista de 3 a 5 tags relevantes para categorização." }
    },
    required: ["title", "description", "tags"]
};

const FileTypeIcon = ({ fileName }) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return <FileText className="w-5 h-5 text-red-500" />;
  if (['png', 'jpg', 'jpeg'].includes(ext)) return <Image className="w-5 h-5 text-blue-500" />;
  if (['csv'].includes(ext)) return <BarChart3 className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-slate-500" />;
};

const ProcessingSteps = ({ currentStep, progress }) => {
  const steps = [
    { id: 'upload', label: 'Enviando arquivo', threshold: 30 },
    { id: 'extract', label: 'Analisando conteúdo', threshold: 70 },
    { id: 'structure', label: 'Estruturando dados', threshold: 90 },
    { id: 'complete', label: 'Finalizando', threshold: 100 }
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isActive = progress >= step.threshold;
        const isCurrent = progress < step.threshold && (index === 0 || progress >= steps[index - 1]?.threshold);
        
        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isActive ? 'bg-green-100 text-green-700' : 
              isCurrent ? 'bg-blue-100 text-blue-700 animate-pulse' : 
              'bg-slate-100 text-slate-400'
            }`}>
              {isActive ? '✓' : index + 1}
            </div>
            <span className={`text-sm ${isActive ? 'text-slate-900 font-medium' : isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>
              {step.label}
            </span>
            {isCurrent && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </div>
        );
      })}
    </div>
  );
};

// ✅ Função browser-safe para gerar ID único
const generateUniqueId = () => {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
};

export default function AutoLearningInputModal({ onClose, onSuccess }) {
  const { agency, user } = useSession();
  const [step, setStep] = useState('upload'); // upload, processing, success, error, duplicate
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingDetails, setProcessingDetails] = useState({
    startTime: null,
    fileHash: null,
    extractedData: null,
    retryCount: 0
  });

  // Added useEffect and checkSession as per outline
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    // Remove debug code in production
    if (isDevelopment) {
      // Development session checking
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Validate file size (100MB)
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "O tamanho máximo permitido é 100MB." });
      setFile(null);
      e.target.value = null;
      return;
    }
    
    // Validate file type
    const allowedTypes = ['.pdf', '.csv', '.png', '.jpg', '.jpeg', '.txt'];
    const fileExt = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      toast.error("Formato de arquivo não suportado", { 
        description: `Por favor, envie um dos seguintes formatos: ${allowedTypes.join(', ')}` 
      });
      setFile(null);
      e.target.value = null;
      return;
    }
    
    setFile(selectedFile);
  };

  // ✅ Generate file hash for idempotency using Web Crypto API
  const generateFileHash = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fullHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return {
        short: fullHash.substring(0, 16),
        full: fullHash,
        size: file.size,
        name: file.name
      };
    } catch (error) {
      // Only log in development
      if (isDevelopment) {
        console.warn('Web Crypto não disponível, usando fallback:', error);
      }
      
      const fallbackHash = btoa(file.name + file.size + file.lastModified).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
      return {
        short: fallbackHash,
        full: fallbackHash + '_fallback',
        size: file.size,
        name: file.name
      };
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const startTime = Date.now();
    setStep('processing');
    setProgress(10);
    setProcessingDetails({ startTime, fileHash: null, extractedData: null, retryCount: 0 }); 

    let learningRecord;
    const correlationId = `corr-xtr-${generateUniqueId()}`;
    
    try {
      // 1. Generate file hash for deduplication
      const fileHashData = await generateFileHash(file);
      setProcessingDetails(prev => ({ ...prev, fileHash: fileHashData.short }));
      
      const idempotencyKey = `learning-upload-${fileHashData.short}`;
      setProgress(20);
      
      // 2. Check for existing learning with same hash
      const existingLearnings = await LearningEntry.filter({ 
        agencyId: agency.id,
        sourceRef: fileHashData.short
      });
      
      if (existingLearnings.length > 0) {
        const existing = existingLearnings[0];
        setProgress(100);
        setStep('duplicate');
        setProcessingDetails(prev => ({ 
          ...prev, 
          extractedData: existing,
          processingTime: Date.now() - startTime
        }));
        onSuccess(existing);
        return;
      }
      
      // 3. Upload file
      setProgress(30);
      const { file_url } = await UploadFile({ file });
      setProgress(50);
      
      // 4. Create LearningEntry with processing status
      learningRecord = await LearningEntry.create({
          agencyId: agency.id,
          title: `Processando: ${file.name}`,
          description: "Extraindo dados do arquivo...",
          sourceType: "auto_upload",
          sourceRef: fileHashData.short,
          fileUrl: file_url,
          status: 'processing',
          metadata: {
            originalFileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadedBy: user.email,
            uploadedAt: new Date().toISOString(),
            fileHash: fileHashData.full
          }
      }, { idempotencyKey });

      onSuccess(learningRecord);
      setProgress(60);

      // 5. Contextual prompt based on file type
      const contextualPrompt = buildContextualPrompt(file.name, file.type);
      
      const extractionResult = await withRobustAICall(
        async (attempt) => {
          setProcessingDetails(prev => ({ ...prev, retryCount: attempt - 1 }));
          return await ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: learningSchema,
            prompt: contextualPrompt
          });
        },
        3,
        { 
          context: 'learning_extraction', 
          fileName: file.name, 
          fileSize: file.size,
          learningId: learningRecord?.id,
          correlationId
        }
      );

      if (extractionResult.status === 'error') {
          throw new Error(extractionResult.details || "Falha na extração de dados.");
      }
      
      setProgress(90);
      
      // 6. Quality validation
      const extractedData = extractionResult.output;
      const qualityScore = calculateExtractionQuality(extractedData);
      
      const finalData = {
          ...extractedData,
          status: 'ready',
          confidence_score: Math.round((extractionResult.confidence || qualityScore) * 100),
          description: extractedData.description || 'Descrição não extraída automaticamente.',
          niche: extractedData.niche || 'Não identificado',
          rationale: extractedData.rationale || 'Contexto específico não disponível nos dados fornecidos.',
          metadata: {
            ...learningRecord.metadata,
            processingCompletedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
            extractionConfidence: extractionResult.confidence || qualityScore,
            qualityScore: qualityScore,
            aiMetadata: {
              model: extractionResult.model || 'unknown',
              tokensUsed: extractionResult.tokensUsed || 0,
              processingTime: extractionResult.processingTime || 0,
              promptType: getPromptType(file.name, file.type)
            }
          }
      };

      const updatedLearning = await LearningEntry.update(learningRecord.id, finalData);
      setProgress(100);
      setStep('success');
      
      setProcessingDetails(prev => ({ 
        ...prev, 
        extractedData: updatedLearning,
        processingTime: Date.now() - startTime
      }));
      
      // Audit log
      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'LearningEntry',
        entity_id: updatedLearning.id,
        action: 'AI_EXTRACTION_COMPLETED',
        actor_id: user.email,
        meta_json: {
          correlationId,
          promptVersion: '1.2',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          confidence: finalData.confidence_score,
          qualityScore: qualityScore,
          processingTimeMs: Date.now() - startTime,
          retryCount: processingDetails.retryCount,
          fieldsExtracted: Object.keys(extractedData).filter(key => 
            extractedData[key] && extractedData[key] !== '' &&
            !['title', 'description', 'tags', 'niche', 'format', 'trigger', 'promise', 'rationale'].includes(key)
          ).length,
          aiMetadata: finalData.metadata.aiMetadata
        }
      });
      
      // Remove technical success toast, keep user-friendly one
      // The original code did not have a success toast, so no change here.
      
      onSuccess(updatedLearning);

    } catch (err) {
      // Only log technical details in development
      if (isDevelopment) {
        console.error("Erro no pipeline de ingestão:", err);
      }
      
      const errorAnalysis = handleRobustAIError(err, { // errorAnalysis is kept for AuditLog below
        context: 'learning_extraction',
        fileName: file?.name,
        fileSize: file?.size,
        learningId: learningRecord?.id,
        correlationId
      });
      
      // User-friendly error message only
      setErrorMessage('Não foi possível processar o arquivo. Tente novamente ou entre em contato com o suporte.');
      
      // Preserve duplicate check via 409 status if it occurs during API call
      if (err.status === 409) {
        setStep('duplicate');
      } else {
        setStep('error'); // Generic error step
      }
      
      if (learningRecord) {
        await LearningEntry.update(learningRecord.id, {
            status: 'failed',
            last_error: errorAnalysis.config?.message || err.message,
            metadata: {
              ...learningRecord.metadata,
              failedAt: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              errorType: errorAnalysis.type,
              retryCount: processingDetails.retryCount
            }
        });

        await AuditLog.create({
          agencyId: agency.id,
          entity_type: 'LearningEntry',
          entity_id: learningRecord.id,
          action: 'AI_EXTRACTION_FAILED',
          actor_id: user.email,
          meta_json: {
            correlationId,
            promptVersion: '1.2',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            errorType: errorAnalysis.type,
            errorMessage: err.message,
            processingTimeMs: Date.now() - startTime,
            retryCount: processingDetails.retryCount
          }
        });
        
        onSuccess(await LearningEntry.get(learningRecord.id));
      }
    }
  };

  // Build contextual prompt based on file type
  const buildContextualPrompt = (fileName, fileType) => {
    const basePrompt = "Extraia aprendizados de marketing/comunicação deste arquivo.";
    
    if (fileType === 'application/pdf') {
      return `${basePrompt} 
      
CONTEXTO: Este é um PDF, provavelmente um relatório, estudo de caso ou documento. Foque em:
- Estratégias e táticas de marketing ou comunicação mencionadas.
- Resultados e métricas específicas (ex: aumento de vendas, engajamento, ROI).
- Conclusões, insights e recomendações.
- Contexto de mercado/público-alvo, setor ou campanha.

Se houver dados numéricos importantes, extraia-os para o campo 'description' ou 'rationale' de forma descritiva.`;
    }
    
    if (fileType.startsWith('image/')) {
      return `${basePrompt}

CONTEXTO: Esta é uma imagem, provavelmente um anúncio, post de rede social, criativo de campanha ou captura de tela de interface. Foque em:
- Texto visível na imagem (OCR) - transcreva-o fielmente.
- Elementos visuais notáveis (cores, layout, uso de pessoas, produtos, call to action - CTA).
- Formato/canal inferido (ex: anúncio de Facebook, post de Instagram, banner de site, email marketing) - use o campo 'format'.
- Gatilhos psicológicos ou técnicas de persuasão aparentes (ex: urgência, escassez, prova social) - use o campo 'trigger'.
- A principal promessa ou benefício comunicado na imagem - use o campo 'promise'.
- Inferências sobre por que este criativo pode ter funcionado ('rationale').

IMPORTANTE: Se a qualidade do texto for baixa, mencione no campo 'rationale'.`;
    }
    
    if (fileType === 'text/csv') {
      return `${basePrompt}

CONTEXTO: Este é um CSV com dados estruturados. Foque em:
- Interpretar as colunas e métricas presentes.
- Identificar padrões, tendências ou anomalias nos dados.
- Inferir o contexto da campanha/estratégia de marketing pelos nomes das colunas e valores.
- Resumir os principais insights ou resultados que podem ser extraídos.
- No campo 'description', detalhe o que os dados representam e as principais descobertas.
- No campo 'rationale', explique como os dados contribuem para um aprendizado de marketing, mesmo que seja sobre "a importância de X métrica".
- Tente inferir 'niche' e 'format' pelos nomes das colunas ou valores, se possível.

IMPORTANTE: Como dados brutos podem ser limitados, seja honesto sobre as limitações e foque na interpretação possível.`;
    }
    
    // Default prompt for other text-based files like .txt
    if (fileType === 'text/plain') {
      return `${basePrompt}

CONTEXTO: Este é um arquivo de texto simples. Foque em:
- Ideias de marketing, estratégias, ou observações presentes no texto.
- Extraia a essência do conteúdo para 'description'.
- Identifique o 'niche', 'format', 'trigger' ou 'promise' se explicitamente mencionados.
- Forneça um 'rationale' que explique o valor do aprendizado contido no texto.`;
    }

    return basePrompt;
  };

  // Calculate extraction quality
  const calculateExtractionQuality = (data) => {
    const criticalFields = ['title', 'description', 'tags']; 
    const importantFields = ['niche', 'format', 'rationale'];
    const optionalFields = ['trigger', 'promise'];
    
    let score = 0;
    
    // Critical fields (max 60%)
    criticalFields.forEach(field => {
      if (data[field] && (Array.isArray(data[field]) ? data[field].length > 0 : data[field].length > 10)) {
        score += 0.2;
      }
    });
    
    // Important fields (max 30%)
    importantFields.forEach(field => {
      if (data[field] && data[field].length > 5) {
        score += 0.1;
      }
    });
    
    // Optional fields (max 10%)
    optionalFields.forEach(field => {
      if (data[field] && data[field].length > 3) {
        score += 0.05;
      }
    });
    
    return Math.min(score, 1.0);
  };

  // Get prompt type for logging
  const getPromptType = (fileName, fileType) => {
    if (fileType === 'application/pdf') return 'pdf_report';
    if (fileType.startsWith('image/')) return 'image_ocr';
    if (fileType === 'text/csv') return 'csv_analysis';
    if (fileType === 'text/plain') return 'text_document';
    return 'generic';
  };

  const renderContent = () => {
    switch (step) {
      case 'processing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                {file && <FileTypeIcon fileName={file.name} />}
                <div>
                  <h3 className="font-semibold">{file?.name}</h3>
                  <p className="text-sm text-slate-500">
                    {(file?.size / 1024 / 1024).toFixed(1)}MB • 
                    {processingDetails.fileHash && ` Hash: ${processingDetails.fileHash}`}
                  </p>
                </div>
              </div>
            </div>
            
            <ProcessingSteps progress={progress} />
            
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Progresso</span>
                <span className="text-sm text-slate-500">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
            
            {processingDetails.startTime && (
              <p className="text-xs text-slate-400 text-center">
                Processando há {Math.floor((Date.now() - processingDetails.startTime) / 1000)}s
                {processingDetails.retryCount > 0 && (
                  <span className="ml-1 opacity-75">({processingDetails.retryCount}ª tentativa)</span>
                )}
              </p>
            )}
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
            <div>
              <h3 className="font-semibold text-lg">Aprendizado Criado!</h3>
              <p className="text-sm text-slate-500 mt-2">
                {processingDetails.extractedData?.title}
              </p>
            </div>
            
            {processingDetails.extractedData?.confidence_score && (
              <div className="max-w-xs mx-auto">
                <ConfidenceIndicator 
                  score={processingDetails.extractedData.confidence_score}
                  context="extração de aprendizado"
                  compact={false}
                />
              </div>
            )}
            
            {processingDetails.extractedData?.tags && (
              <div className="flex flex-wrap gap-1 justify-center">
                {processingDetails.extractedData.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                Processado em {Math.floor(processingDetails.processingTime / 1000)}s
                {processingDetails.retryCount > 0 && (
                  <span className="ml-1 opacity-75">
                    ({processingDetails.retryCount} tentativas)
                  </span>
                )}
              </div>
            </div>
            
            <Button onClick={onClose} className="w-full">Fechar</Button>
          </div>
        );
        
      case 'duplicate':
        return (
          <div className="text-center space-y-4">
            <Hash className="w-12 h-12 mx-auto text-blue-600" />
            <div>
              <h3 className="font-semibold">Arquivo já processado</h3>
              <p className="text-sm text-slate-500 mt-2">
                Este arquivo foi enviado anteriormente e já está na biblioteca.
              </p>
            </div>
            
            {processingDetails.extractedData && (
              <div className="bg-blue-50 rounded-lg p-3 text-left">
                <h4 className="font-medium text-blue-900">
                  {processingDetails.extractedData.title}
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  Criado {formatDistanceToNow(new Date(processingDetails.extractedData.created_date), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }} className="flex-1">
                Enviar Outro
              </Button>
              <Button onClick={onClose} className="flex-1">Fechar</Button>
            </div>
          </div>
        );
        
      case 'error':
        return (
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-600" />
            <div>
              <h3 className="font-semibold">Erro no Processamento</h3>
              <Alert variant="destructive" className="mt-3 text-left">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
            <Button onClick={() => { setStep('upload'); setFile(null); }}>
              Tentar com Outro Arquivo
            </Button>
          </div>
        );
        
      case 'upload':
      default:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload" className="block text-sm font-medium text-slate-700 mb-2">
                Arquivo para Análise
              </Label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <div className="flex items-center gap-3">
                        <FileTypeIcon fileName={file.name} />
                        <div>
                          <p className="font-semibold text-purple-600">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500">
                          <span className="font-semibold">Clique para enviar</span> ou arraste
                        </p>
                        <p className="text-xs text-slate-500">
                          PDF, CSV, PNG, JPG, TXT • Max 100MB
                        </p>
                      </>
                    )}
                  </div>
                  <Input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept=".pdf,.csv,.png,.jpg,.jpeg,.txt" 
                  />
                </label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={!file} className="min-w-[120px]">
                <File className="w-4 h-4 mr-2" /> 
                Processar Arquivo
              </Button>
            </DialogFooter>
          </div>
        );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload de Aprendizado</DialogTitle>
          <DialogDescription>
            Envie documentos e nossa IA extrairá insights automaticamente
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
