import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  X,
  Eye,
  Download,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Modal para upload de relatórios financeiros
 */
export default function FinancialReportUploadModal({ 
  isOpen, 
  onClose, 
  clientId, 
  serviceId,
  onDataExtracted 
}) {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  // Tipos de arquivo aceitos
  const acceptedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/json'
  ];

  const handleFileUpload = useCallback(async (files) => {
    setUploading(true);
    setError(null);

    try {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => 
        acceptedTypes.includes(file.type) || 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.csv')
      );

      if (validFiles.length === 0) {
        throw new Error('Nenhum arquivo válido selecionado. Aceitos: PDF, Excel, CSV');
      }

      // Simular upload (substituir pela API real)
      const uploadedFilesData = await Promise.all(
        validFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('clientId', clientId);
          formData.append('serviceId', serviceId);
          formData.append('uploadedBy', user.email);

          // Simular chamada da API
          const response = await fetch('/api/financial-reports/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.token}`
            },
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Erro no upload: ${response.statusText}`);
          }

          const result = await response.json();
          return {
            id: result.id,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
          };
        })
      );

      setUploadedFiles(uploadedFilesData);
      toast.success(`${validFiles.length} arquivo(s) enviado(s) com sucesso!`);

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }, [clientId, serviceId, user]);

  const handleAnalyzeWithAI = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Nenhum arquivo para analisar');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Simular análise de IA (substituir pela API real)
      const response = await fetch('/api/financial-reports/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          fileIds: uploadedFiles.map(f => f.id),
          clientId,
          serviceId,
          analysisType: 'kpi_extraction'
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na análise: ${response.statusText}`);
      }

      const analysisResult = await response.json();
      
      // Simular dados extraídos (substituir pelos dados reais da IA)
      const mockExtractedData = {
        confidence: 0.87,
        extractedKPIs: [
          {
            key: 'receita_mensal',
            label: 'Receita mensal',
            value: 128000,
            unit: 'BRL',
            confidence: 0.92,
            source: 'DRE - Linha 1',
            period: '2025-09'
          },
          {
            key: 'margem_percent',
            label: 'Margem (%)',
            value: 15.2,
            unit: '%',
            confidence: 0.89,
            source: 'Cálculo automático',
            period: '2025-09'
          },
          {
            key: 'fluxo_saldo',
            label: 'Fluxo de caixa (saldo)',
            value: 24500,
            unit: 'BRL',
            confidence: 0.85,
            source: 'Demonstrativo de Fluxo de Caixa',
            period: '2025-09'
          },
          {
            key: 'inadimplencia_percent',
            label: 'Inadimplência (%)',
            value: 11.0,
            unit: '%',
            confidence: 0.78,
            source: 'Relatório de Cobrança',
            period: '2025-09'
          }
        ],
        insights: [
          'Margem operacional identificada em 15,2%, abaixo da meta de 18%',
          'Receita mensal de R$ 128.000 com crescimento de 4,1% vs mês anterior',
          'Inadimplência em 11% - atenção para controle de crédito'
        ],
        metadata: {
          analyzedAt: new Date().toISOString(),
          filesAnalyzed: uploadedFiles.length,
          totalPages: 12,
          processingTime: '2.3s'
        }
      };

      setExtractedData(mockExtractedData);
      toast.success('Análise concluída com sucesso!');

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [uploadedFiles, clientId, serviceId, user]);

  const handleConfirmData = useCallback(async () => {
    if (!extractedData) return;

    try {
      // Salvar dados extraídos no sistema
      const response = await fetch('/api/financial-reports/save-extracted-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          clientId,
          serviceId,
          extractedKPIs: extractedData.extractedKPIs,
          insights: extractedData.insights,
          metadata: extractedData.metadata,
          confirmedBy: user.email
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar dados: ${response.statusText}`);
      }

      toast.success('Dados salvos com sucesso!');
      onDataExtracted(extractedData);
      onClose();

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  }, [extractedData, clientId, serviceId, user, onDataExtracted, onClose]);

  const handleClose = () => {
    setUploadedFiles([]);
    setExtractedData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload de Relatórios Financeiros
          </DialogTitle>
          <DialogDescription>
            Faça upload de relatórios financeiros para extrair KPIs automaticamente com IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload de Arquivos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Upload de Arquivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-700">
                      Clique para selecionar arquivos
                    </span>
                    <p className="text-sm text-gray-500 mt-2">
                      PDF, Excel (.xlsx), CSV - Máximo 10MB por arquivo
                    </p>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.csv"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>

                {/* Arquivos Enviados */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Arquivos Enviados:</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">{file.name}</p>
                          <p className="text-sm text-green-700">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.uploadedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Análise com IA */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Análise com IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Brain className="w-6 h-6 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">Inteligência Artificial</h4>
                      <p className="text-sm text-blue-700">
                        Nossa IA irá analisar os relatórios e extrair automaticamente os KPIs financeiros
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyzeWithAI}
                    disabled={analyzing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analisando com IA...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Iniciar Análise com IA
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados Extraídos */}
          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Dados Extraídos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Resumo da Análise */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900">Análise Concluída</h4>
                      <p className="text-sm text-green-700">
                        Confiança geral: {(extractedData.confidence * 100).toFixed(1)}% • 
                        {extractedData.extractedKPIs.length} KPIs encontrados
                      </p>
                    </div>
                  </div>

                  {/* KPIs Extraídos */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">KPIs Identificados:</h4>
                    {extractedData.extractedKPIs.map((kpi, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {kpi.unit === 'BRL' && <DollarSign className="w-4 h-4 text-green-600" />}
                            {kpi.unit === '%' && <Percent className="w-4 h-4 text-blue-600" />}
                            <span className="font-medium text-gray-900">{kpi.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">
                              {kpi.unit === 'BRL' 
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpi.value)
                                : `${kpi.value}${kpi.unit}`
                              }
                            </span>
                            <Badge variant="outline" className={
                              kpi.confidence >= 0.9 ? 'text-green-600 border-green-200' :
                              kpi.confidence >= 0.8 ? 'text-yellow-600 border-yellow-200' :
                              'text-red-600 border-red-200'
                            }>
                              {(kpi.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p><strong>Fonte:</strong> {kpi.source}</p>
                          <p><strong>Período:</strong> {kpi.period}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Insights */}
                  {extractedData.insights && extractedData.insights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Insights da IA:</h4>
                      {extractedData.insights.map((insight, index) => (
                        <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">{insight}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {extractedData && (
            <Button 
              onClick={handleConfirmData}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar e Salvar Dados
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

