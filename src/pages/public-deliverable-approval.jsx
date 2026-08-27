import React, { useState, useEffect, useCallback } from 'react';
import { ApprovalRequest } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, FileText, Calendar, 
  AlertTriangle, Clock, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { processDeliverableApproval } from '@/api/functions';

export default function PublicDeliverableApprovalPage() {
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [service, setService] = useState(null);
  const [deliverable, setDeliverable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [status, setStatus] = useState('pending');

  const urlParams = new URLSearchParams(window.location.search);
  const token = window.location.pathname.split('/').pop();

  const loadApprovalData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar approval request pelo token
      const approvals = await ApprovalRequest.filter({ token: token });
      
      if (!approvals || approvals.length === 0) {
        setStatus('not_found');
        return;
      }

      const approval = approvals[0];
      setApprovalRequest(approval);

      // Verificar se já foi processado
      if (approval.status !== 'pending') {
        setStatus(approval.status);
        return;
      }

      // Verificar expiração
      if (new Date(approval.expiresAt) < new Date()) {
        setStatus('expired');
        return;
      }

      // Extrair serviceId e deliverableId do contentId
      const [serviceId, deliverableId] = approval.contentId.split('_');
      
      // Carregar serviço e entregável
      const serviceData = await Service.get(serviceId);
      setService(serviceData);
      
      const deliverableData = serviceData.deliverables?.find(d => d.id === deliverableId);
      setDeliverable(deliverableData);

    } catch (error) {
      console.error('Erro ao carregar dados da aprovação:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadApprovalData();
    }
  }, [loadApprovalData, token]);

  const handleApproval = async (action) => {
    if (!approvalRequest || !service || !deliverable) return;

    setProcessing(true);
    try {
      const payload = {
        action,
        serviceId: service.id,
        deliverableId: deliverable.id
      };

      if (action === 'approve') {
        payload.comment = comment.trim();
      } else if (action === 'reject') {
        payload.rejectionReason = rejectionReason.trim();
      }

      const result = await processDeliverableApproval(payload);

      if (result.data?.success) {
        setStatus(action === 'approve' ? 'approved' : 'rejected');
        toast.success(
          action === 'approve' 
            ? 'Entregável aprovado com sucesso!' 
            : 'Entregável rejeitado. A equipe foi notificada.'
        );
      } else {
        throw new Error(result.data?.error || 'Erro ao processar');
      }
    } catch (error) {
      console.error('Erro no processo de aprovação:', error);
      toast.error('Erro ao processar aprovação');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Link Inválido
            </h2>
            <p className="text-gray-600">
              O link de aprovação não foi encontrado ou não é mais válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Link Expirado
            </h2>
            <p className="text-gray-600 mb-4">
              Este link de aprovação expirou. Entre em contato com a equipe para obter um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'approved' || status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            {status === 'approved' ? (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Entregável Aprovado!
                </h2>
                <p className="text-gray-600">
                  Obrigado por sua aprovação. A equipe foi notificada e dará continuidade ao projeto.
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Entregável Rejeitado
                </h2>
                <p className="text-gray-600">
                  Seus comentários foram enviados para a equipe. Eles farão os ajustes necessários.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error' || !approvalRequest || !service || !deliverable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erro ao Carregar
            </h2>
            <p className="text-gray-600">
              Ocorreu um erro ao carregar as informações. Tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Aprovação de Entregável
              </h1>
            </div>
            <p className="text-gray-600">
              Revise o entregável abaixo e forneça sua aprovação ou feedback
            </p>
          </CardHeader>
        </Card>

        {/* Service Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Serviço:</Label>
                <p className="text-gray-900">{service.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Data de Solicitação:</Label>
                <p className="text-gray-900">
                  {new Date(approvalRequest.created_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            
            {service.description && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-700">Descrição do Serviço:</Label>
                <p className="text-gray-600 mt-1">{service.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliverable Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Entregável: {deliverable.name}</span>
              <Badge className="bg-blue-100 text-blue-700">
                Fase {deliverable.phase}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliverable.description && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Descrição:</Label>
                <p className="text-gray-600 mt-1">{deliverable.description}</p>
              </div>
            )}

            {deliverable.expected_outcome && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Resultado Esperado:</Label>
                <p className="text-gray-600 mt-1">{deliverable.expected_outcome}</p>
              </div>
            )}

            {deliverable.completion_criteria && deliverable.completion_criteria.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Critérios de Conclusão:</Label>
                <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                  {deliverable.completion_criteria.map((criterion, index) => (
                    <li key={index}>{criterion}</li>
                  ))}
                </ul>
              </div>
            )}

            {approvalRequest.customMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label className="text-sm font-medium text-blue-900">Mensagem da Equipe:</Label>
                <p className="text-blue-800 mt-1">{approvalRequest.customMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sua Decisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Approval Comments */}
            <div>
              <Label htmlFor="approvalComment">Comentários da Aprovação</Label>
              <Textarea
                id="approvalComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicione comentários sobre sua aprovação (opcional)..."
                rows={3}
              />
            </div>

            {/* Rejection Reason */}
            <div>
              <Label htmlFor="rejectionReason">Motivo da Rejeição</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Se for rejeitar, descreva os motivos e o que precisa ser ajustado..."
                rows={4}
              />
            </div>

            <Alert>
              <Calendar className="w-4 h-4" />
              <AlertDescription>
                <strong>Importante:</strong> Sua decisão notificará automaticamente a equipe da agência. 
                Em caso de rejeição, as tarefas relacionadas serão reabertas para ajustes.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                variant="destructive"
                onClick={() => handleApproval('reject')} 
                disabled={processing || !rejectionReason.trim()}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {processing ? 'Processando...' : 'Rejeitar Entregável'}
              </Button>
              
              <Button 
                onClick={() => handleApproval('approve')} 
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {processing ? 'Processando...' : 'Aprovar Entregável'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}