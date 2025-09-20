import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckCircle, XCircle, Eye, MessageSquare, 
  Clock, Shield, Target, FileText, Calendar,
  ThumbsUp, ThumbsDown, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { processDeliverableApproval } from '@/api/functions';

export default function ClientDeliverablePortal({ 
  serviceId, 
  deliverables = [], 
  onApprovalAction,
  userRole = 'client' 
}) {
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Filtrar apenas deliverables que requerem aprovação e estão pendentes
  const pendingApprovals = deliverables.filter(d => 
    d.requires_approval && d.status === 'pending_approval'
  );

  const handleApprovalAction = async (action) => {
    if (!selectedDeliverable || !serviceId) return;

    try {
      setLoading(true);
      
      const payload = {
        action,
        serviceId,
        deliverableId: selectedDeliverable.id
      };

      if (action === 'approve') {
        payload.comment = comment;
      } else if (action === 'reject') {
        payload.rejectionReason = comment;
      }

      const response = await processDeliverableApproval(payload);

      if (response.data?.success) {
        toast.success(response.data.message);
        setApprovalModalOpen(false);
        setComment('');
        setSelectedDeliverable(null);
        
        if (onApprovalAction) {
          onApprovalAction(selectedDeliverable.id, action);
        }
      } else {
        toast.error(response.data?.error || 'Erro ao processar aprovação');
      }
    } catch (error) {
      console.error('Erro na aprovação:', error);
      toast.error('Erro ao processar aprovação');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (deliverable, action) => {
    setSelectedDeliverable(deliverable);
    setApprovalAction(action);
    setApprovalModalOpen(true);
    setComment('');
  };

  if (pendingApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma aprovação pendente
          </h3>
          <p className="text-gray-600">
            Todas as etapas foram aprovadas ou não requerem aprovação no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold">Aprovações Pendentes</h2>
          <Badge className="bg-purple-100 text-purple-800">
            {pendingApprovals.length} pendente{pendingApprovals.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {pendingApprovals.map((deliverable) => (
          <Card key={deliverable.id} className="border-l-4 border-l-purple-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{deliverable.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Fase {deliverable.phase} • {deliverable.category?.replace('_', ' ') || 'Geral'}
                  </p>
                </div>
                <Badge className="bg-purple-100 text-purple-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Aguardando Aprovação
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {deliverable.description && (
                <p className="text-gray-700 mb-4">{deliverable.description}</p>
              )}

              {deliverable.expected_outcome && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Resultado Esperado:</p>
                      <p className="text-sm text-blue-800">{deliverable.expected_outcome}</p>
                    </div>
                  </div>
                </div>
              )}

              {deliverable.completion_comment && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Comentários da Equipe:</p>
                      <p className="text-sm text-gray-700">{deliverable.completion_comment}</p>
                    </div>
                  </div>
                </div>
              )}

              {deliverable.ready_at && (
                <div className="mb-4 text-xs text-gray-500">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Concluído em {new Date(deliverable.ready_at).toLocaleDateString('pt-BR')}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => openApprovalModal(deliverable, 'approve')}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  disabled={loading}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  onClick={() => openApprovalModal(deliverable, 'reject')}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 flex-1"
                  disabled={loading}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Solicitar Correção
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Aprovação */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Aprovar Etapa' : 'Solicitar Correção'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedDeliverable && (
              <>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedDeliverable.name}</p>
                  <p className="text-sm text-gray-600">Fase {selectedDeliverable.phase}</p>
                </div>

                {approvalAction === 'approve' && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Ao aprovar, a próxima etapa do projeto será liberada automaticamente.
                    </AlertDescription>
                  </Alert>
                )}

                {approvalAction === 'reject' && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Ao solicitar correção, esta etapa retornará para a equipe fazer os ajustes necessários.
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="approval_comment">
                    {approvalAction === 'approve' ? 'Comentários (opcional)' : 'Motivo da solicitação de correção'}
                  </Label>
                  <Textarea
                    id="approval_comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      approvalAction === 'approve' 
                        ? 'Adicione comentários sobre a aprovação...'
                        : 'Descreva o que precisa ser corrigido...'
                    }
                    rows={3}
                    required={approvalAction === 'reject'}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => handleApprovalAction(approvalAction)}
                    disabled={loading || (approvalAction === 'reject' && !comment.trim())}
                    className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {loading ? (
                      'Processando...'
                    ) : (
                      <>
                        {approvalAction === 'approve' ? (
                          <>
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Confirmar Aprovação
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Solicitação
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}