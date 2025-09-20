import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { IngestEnvelope } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Shield,
  Download,
  Eye,
  RefreshCw,
  Hash,
  User,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIGS = {
  pending: { 
    icon: Clock, 
    color: 'bg-yellow-100 text-yellow-800', 
    label: 'Pendente' 
  },
  processing: { 
    icon: RefreshCw, 
    color: 'bg-blue-100 text-blue-800', 
    label: 'Processando' 
  },
  completed: { 
    icon: CheckCircle2, 
    color: 'bg-green-100 text-green-800', 
    label: 'Concluído' 
  },
  failed: { 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800', 
    label: 'Falhou' 
  },
  quarantine: { 
    icon: Shield, 
    color: 'bg-orange-100 text-orange-800', 
    label: 'Quarentena' 
  }
};

export default function IngestEnvelopeViewer({ 
  envelopeId = null, 
  showDetails = true,
  onProcessingComplete = () => {},
  className = ""
}) {
  const { user } = useSession();
  const [envelopes, setEnvelopes] = useState([]);
  const [selectedEnvelope, setSelectedEnvelope] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEnvelopes = useCallback(async () => {
    if (!user?.data?.agencyId) return;

    try {
      setLoading(true);
      
      let query = { agencyId: user.data.agencyId };
      if (envelopeId) {
        query.envelope_id = envelopeId;
      }

      const envelopeData = await IngestEnvelope.filter(query, '-created_date', 50);
      setEnvelopes(envelopeData || []);
      
      if (envelopeId && envelopeData.length > 0) {
        setSelectedEnvelope(envelopeData[0]);
      }
    } catch (error) {
      console.error('Error loading envelopes:', error);
      toast.error('Erro ao carregar envelopes de ingestão');
    } finally {
      setLoading(false);
    }
  }, [user?.data?.agencyId, envelopeId]);

  useEffect(() => {
    loadEnvelopes();
  }, [loadEnvelopes]);

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIGS[status] || STATUS_CONFIGS.pending;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800', 
      error: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900'
    };
    return colors[severity] || colors.info;
  };

  const EnvelopeCard = ({ envelope }) => {
    const statusConfig = getStatusConfig(envelope.processing_status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card className={`cursor-pointer transition-all hover:shadow-md ${
        selectedEnvelope?.id === envelope.id ? 'ring-2 ring-blue-500' : ''
      }`} onClick={() => setSelectedEnvelope(envelope)}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-sm truncate">
                {envelope.file_identity.original_name}
              </span>
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Tamanho:</span>
              <span>{formatFileSize(envelope.file_identity.file_size_bytes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Formato:</span>
              <span className="uppercase">{envelope.payload.detected_format}</span>
            </div>
            <div className="flex justify-between">
              <span>Enviado:</span>
              <span>{format(new Date(envelope.created_date), 'dd/MM/yy HH:mm')}</span>
            </div>
            {envelope.extraction_results?.extracted_records_count > 0 && (
              <div className="flex justify-between">
                <span>Registros:</span>
                <span className="font-medium text-green-600">
                  {envelope.extraction_results.extracted_records_count}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const EnvelopeDetails = ({ envelope }) => {
    if (!envelope) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Selecione um envelope para ver os detalhes</p>
          </CardContent>
        </Card>
      );
    }

    const statusConfig = getStatusConfig(envelope.processing_status);
    const StatusIcon = statusConfig.icon;

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {envelope.file_identity.original_name}
              </CardTitle>
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-gray-700">ID do Envelope:</label>
                <div className="flex items-center gap-1 text-gray-600 font-mono text-xs">
                  <Hash className="w-3 h-3" />
                  {envelope.envelope_id}
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700">Hash SHA256:</label>
                <div className="text-gray-600 font-mono text-xs truncate">
                  {envelope.file_identity.sha256_hash}
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700">Enviado por:</label>
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="w-3 h-3" />
                  {envelope.provenance.uploaded_by_email}
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700">Data/Hora:</label>
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(envelope.provenance.upload_timestamp), 'dd/MM/yyyy HH:mm:ss')}
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700">Tamanho:</label>
                <div className="text-gray-600">
                  {formatFileSize(envelope.file_identity.file_size_bytes)}
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700">Tipo MIME:</label>
                <div className="text-gray-600 font-mono text-xs">
                  {envelope.file_identity.mime_type}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="w-3 h-3 mr-1" />
                Download Original
              </Button>
              <Button size="sm" variant="outline">
                <Eye className="w-3 h-3 mr-1" />
                Visualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados da Extração */}
        {envelope.extraction_results && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Extração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {envelope.extraction_results.extracted_records_count || 0}
                  </div>
                  <div className="text-sm text-green-700">Registros Extraídos</div>
                </div>

                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {envelope.extraction_results.confidence_score || 0}%
                  </div>
                  <div className="text-sm text-blue-700">Confiança</div>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {envelope.extraction_results.target_entities?.length || 0}
                  </div>
                  <div className="text-sm text-orange-700">Entidades Afetadas</div>
                </div>
              </div>

              {envelope.extraction_results.target_entities?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Entidades Processadas:</h4>
                  <div className="space-y-2">
                    {envelope.extraction_results.target_entities.map((entity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{entity.entity_name}</span>
                        <div className="flex gap-2 text-sm">
                          {entity.records_created > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              +{entity.records_created} criados
                            </Badge>
                          )}
                          {entity.records_updated > 0 && (
                            <Badge className="bg-blue-100 text-blue-800">
                              {entity.records_updated} atualizados
                            </Badge>
                          )}
                          {entity.records_failed > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              {entity.records_failed} falharam
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Issues de Validação */}
        {envelope.validation_results?.detected_issues?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Issues Detectados ({envelope.validation_results.detected_issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {envelope.validation_results.detected_issues.map((issue, index) => (
                  <div key={index} className="border-l-4 border-l-orange-400 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <span className="font-medium text-sm">{issue.issue_type}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{issue.description}</p>
                    {issue.suggested_fix && (
                      <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                        💡 {issue.suggested_fix}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs Relacionados */}
        {envelope.job_references && (
          <Card>
            <CardHeader>
              <CardTitle>Jobs de Processamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {envelope.job_references.import_job_id && (
                  <div className="flex justify-between">
                    <span>Job de Importação:</span>
                    <span className="font-mono text-xs">{envelope.job_references.import_job_id}</span>
                  </div>
                )}
                {envelope.job_references.extraction_job_id && (
                  <div className="flex justify-between">
                    <span>Job de Extração:</span>
                    <span className="font-mono text-xs">{envelope.job_references.extraction_job_id}</span>
                  </div>
                )}
                {envelope.job_references.validation_job_id && (
                  <div className="flex justify-between">
                    <span>Job de Validação:</span>
                    <span className="font-mono text-xs">{envelope.job_references.validation_job_id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Lista de Envelopes */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">
          Envelopes de Ingestão ({envelopes.length})
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {envelopes.map((envelope) => (
            <EnvelopeCard key={envelope.id} envelope={envelope} />
          ))}
        </div>
      </div>

      {/* Detalhes do Envelope */}
      <div className="lg:col-span-2">
        {showDetails && <EnvelopeDetails envelope={selectedEnvelope} />}
      </div>
    </div>
  );
}