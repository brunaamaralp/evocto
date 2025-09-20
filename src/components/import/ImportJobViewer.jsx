import React, { useState, useEffect, useCallback } from 'react';
import { ImportJob } from '@/api/entities';
import { getImportJobStatus } from '@/api/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  FileText,
  Database,
  TrendingUp,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIGS = {
  queued: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Na Fila' },
  initializing: { icon: RefreshCw, color: 'bg-blue-100 text-blue-800', label: 'Inicializando' },
  processing: { icon: RefreshCw, color: 'bg-blue-100 text-blue-800', label: 'Processando' },
  mapping: { icon: Database, color: 'bg-blue-100 text-blue-800', label: 'Mapeando' },
  validating: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-800', label: 'Validando' },
  saving: { icon: Database, color: 'bg-blue-100 text-blue-800', label: 'Salvando' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Concluído' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Falhou' },
  cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: 'Cancelado' },
  timeout: { icon: Clock, color: 'bg-red-100 text-red-800', label: 'Timeout' }
};

export default function ImportJobViewer({ jobId, onComplete = () => {} }) {
  const [jobStatus, setJobStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const { data } = await getImportJobStatus(jobId);
      setJobStatus(data);
      
      if (data.status === 'completed') {
        onComplete(data);
        setAutoRefresh(false);
      }
    } catch (error) {
      console.error('Error loading job status:', error);
      toast.error('Erro ao carregar status do job');
    } finally {
      setLoading(false);
    }
  }, [jobId, onComplete]);

  useEffect(() => {
    loadJobStatus();
  }, [loadJobStatus]);

  useEffect(() => {
    if (!autoRefresh || !jobStatus || ['completed', 'failed', 'cancelled'].includes(jobStatus.status)) {
      return;
    }

    const interval = setInterval(loadJobStatus, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, jobStatus, loadJobStatus]);

  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIGS[status] || STATUS_CONFIGS.processing;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Carregando status do job...</p>
        </CardContent>
      </Card>
    );
  }

  if (!jobStatus) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Job não encontrado</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(jobStatus.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Status Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {jobStatus.file_info.original_name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusConfig.label}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={loadJobStatus}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progresso */}
          {['processing', 'mapping', 'validating', 'saving'].includes(jobStatus.status) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{jobStatus.progress.current_step}</span>
                <span>{jobStatus.progress.total_progress}%</span>
              </div>
              <Progress value={jobStatus.progress.total_progress} className="h-2" />
              {jobStatus.timing.estimated_remaining_ms > 0 && (
                <p className="text-xs text-gray-600 text-center">
                  Tempo restante estimado: {formatDuration(jobStatus.timing.estimated_remaining_ms)}
                </p>
              )}
            </div>
          )}

          {/* Informações do Arquivo */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-gray-700">ID do Job:</label>
              <div className="font-mono text-xs text-gray-600">{jobStatus.job_id}</div>
            </div>
            <div>
              <label className="font-medium text-gray-700">Tamanho:</label>
              <div className="text-gray-600">{formatFileSize(jobStatus.file_info.file_size_bytes)}</div>
            </div>
            <div>
              <label className="font-medium text-gray-700">Formato:</label>
              <div className="text-gray-600 uppercase">{jobStatus.file_info.detected_format}</div>
            </div>
            <div>
              <label className="font-medium text-gray-700">Tempo Decorrido:</label>
              <div className="text-gray-600">{formatDuration(jobStatus.timing.elapsed_ms)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {jobStatus.results && (jobStatus.results.records_extracted > 0 || jobStatus.status === 'completed') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Resultados do Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {jobStatus.results.records_extracted || 0}
                </div>
                <div className="text-sm text-blue-700">Extraídos</div>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {jobStatus.results.records_created || 0}
                </div>
                <div className="text-sm text-green-700">Criados</div>
              </div>

              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {jobStatus.results.records_skipped || 0}
                </div>
                <div className="text-sm text-orange-700">Pulados</div>
              </div>

              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {jobStatus.results.records_failed || 0}
                </div>
                <div className="text-sm text-red-700">Falharam</div>
              </div>
            </div>

            {/* Scores */}
            {(jobStatus.results.confidence_score || jobStatus.results.data_quality_score) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobStatus.results.confidence_score && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Score de Confiança</label>
                    <Progress value={jobStatus.results.confidence_score} className="h-2 mt-1" />
                    <div className="text-xs text-gray-600 text-right">{jobStatus.results.confidence_score}%</div>
                  </div>
                )}
                {jobStatus.results.data_quality_score && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Qualidade dos Dados</label>
                    <Progress value={jobStatus.results.data_quality_score} className="h-2 mt-1" />
                    <div className="text-xs text-gray-600 text-right">{jobStatus.results.data_quality_score}%</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Erros e Warnings */}
      {(jobStatus.error_summary.total_errors > 0 || jobStatus.warning_summary.total_warnings > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Erros e Avisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobStatus.error_summary.total_errors > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-red-800">Erros</span>
                    <Badge className="bg-red-100 text-red-800">
                      {jobStatus.error_summary.total_errors}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(jobStatus.error_summary.error_types).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-red-700">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jobStatus.warning_summary.total_warnings > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-yellow-800">Avisos</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {jobStatus.warning_summary.total_warnings}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(jobStatus.warning_summary.warning_types).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-yellow-700">
                        <span className="capitalize">{type}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {jobStatus.statistics && jobStatus.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="font-medium text-gray-700">Taxa de Sucesso:</label>
                <div className="text-lg font-semibold text-green-600">
                  {jobStatus.statistics.success_rate.toFixed(1)}%
                </div>
              </div>
              
              <div>
                <label className="font-medium text-gray-700">Throughput:</label>
                <div className="text-lg font-semibold text-blue-600">
                  {jobStatus.statistics.throughput_records_per_second.toFixed(1)} rec/s
                </div>
              </div>
              
              <div>
                <label className="font-medium text-gray-700">Eficiência:</label>
                <div className="text-lg font-semibold text-purple-600">
                  {jobStatus.statistics.quality_metrics.processing_efficiency.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {jobStatus.next_actions.map((action, index) => (
              <Button key={index} variant="outline" size="sm">
                {action}
              </Button>
            ))}
            
            {jobStatus.can_retry && (
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                <RefreshCw className="w-3 h-3 mr-1" />
                Tentar Novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log de Auditoria */}
      {jobStatus.recent_steps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Últimas Etapas ({jobStatus.recent_steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {jobStatus.recent_steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'failed' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium">{step.step_name}</div>
                    {step.notes && <div className="text-gray-600">{step.notes}</div>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.duration_ms ? formatDuration(step.duration_ms) : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}