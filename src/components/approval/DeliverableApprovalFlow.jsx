import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, 
  Send, MessageSquare, FileText, User
} from 'lucide-react';
import { toast } from 'sonner';
import { processDeliverableApproval } from '@/api/functions';

const DELIVERABLE_STATUS = {
  'not_started': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700', icon: Clock },
  'in_progress': { label: 'Em Progresso', color: 'bg-blue-100 text-blue-700', icon: Clock },
  'ready_for_review': { label: 'Pronto para Revisão', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  'pending_approval': { label: 'Aguardando Aprovação', color: 'bg-purple-100 text-purple-700', icon: Clock },
  'approved': { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  'rejected': { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: XCircle },
  'completed': { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle }
};

export default function DeliverableApprovalFlow({ 
  service, 
  deliverable, 
  onUpdate,
  userRole = 'team'
}) {
  const [showMarkReadyModal, setShowMarkReadyModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const currentStatus = deliverable.status || 'not_started';
  const statusConfig = DELIVERABLE_STATUS[currentStatus];
  const StatusIcon = statusConfig?.icon || Clock;

  const canMarkReady = () => {
    return ['team', 'admin', 'owner'].includes(userRole) && 
           ['in_progress', 'rejected'].includes(currentStatus);
  };

  const canApprove = () => {
    return ['client', 'admin', 'owner'].includes(userRole) && 
           currentStatus === 'pending_approval';
  };

  const handleMarkReady = async () => {
    setProcessing(true);
    try {
      const result = await processDeliverableApproval({
        action: 'mark_ready',
        serviceId: service.id,
        deliverableId: deliverable.id,
        comment: comment.trim()
      });

      if (result.data?.success) {
        toast.success(result.data.message || 'Entregável marcado como pronto');
        onUpdate?.();
        setShowMarkReadyModal(false);
        setComment('');
      } else {
        throw new Error(result.data?.error || 'Erro ao processar');
      }
    } catch (error) {
      console.error('Erro ao marcar como pronto:', error);
      toast.error('Erro ao marcar entregável como pronto');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproval = async (action) => {
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
        toast.success(
          action === 'approve' 
            ? 'Entregável aprovado com sucesso' 
            : 'Entregável rejeitado. Tarefas foram reabertas'
        );
        onUpdate?.();
        setShowApprovalModal(false);
        setComment('');
        setRejectionReason('');
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

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <Badge className={`${statusConfig.color} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </Badge>
        
        {deliverable.requires_approval && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Requer Aprovação
          </Badge>
        )}
      </div>

      {/* Approval Timeline */}
      {deliverable.requires_approval && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Fluxo de Aprovação
              </h4>
              
              <div className="space-y-2 text-sm">
                {deliverable.completed_at && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Concluído em {new Date(deliverable.completed_at).toLocaleDateString('pt-BR')}
                      {deliverable.completed_by && ` por ${deliverable.completed_by}`}
                    </span>
                  </div>
                )}
                
                {deliverable.approved_at && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Aprovado em {new Date(deliverable.approved_at).toLocaleDateString('pt-BR')}
                      {deliverable.approved_by && ` por ${deliverable.approved_by}`}
                    </span>
                  </div>
                )}
                
                {deliverable.rejected_at && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>
                      Rejeitado em {new Date(deliverable.rejected_at).toLocaleDateString('pt-BR')}
                      {deliverable.rejected_by && ` por ${deliverable.rejected_by}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Comments */}
              {(deliverable.approval_comment || deliverable.rejection_reason) && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">
                        {deliverable.approval_comment || deliverable.rejection_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {canMarkReady() && (
          <Button 
            onClick={() => setShowMarkReadyModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Marcar como Pronto
          </Button>
        )}

        {canApprove() && (
          <Button 
            onClick={() => setShowApprovalModal(true)}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <User className="w-4 h-4 mr-2" />
            Revisar Aprovação
          </Button>
        )}
      </div>

      {/* Mark Ready Modal */}
      <Dialog open={showMarkReadyModal} onOpenChange={setShowMarkReadyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Entregável como Pronto</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {deliverable.requires_approval 
                  ? 'Este entregável será enviado para aprovação do cliente após ser marcado como pronto.'
                  : 'Este entregável será marcado como concluído diretamente.'
                }
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="comment">Comentários (opcional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicione comentários sobre a conclusão do entregável..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkReadyModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMarkReady} 
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? 'Processando...' : 'Marcar como Pronto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Entregável: {deliverable.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Sobre este entregável:</h4>
              <p className="text-sm text-blue-700">{deliverable.description}</p>
              {deliverable.expected_outcome && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-blue-900">Resultado esperado: </span>
                  <span className="text-sm text-blue-700">{deliverable.expected_outcome}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="approvalComment">Comentários da Aprovação</Label>
                <Textarea
                  id="approvalComment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicione comentários sobre sua aprovação..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="rejectionReason">Motivo da Rejeição (se aplicável)</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva os motivos para rejeição e o que precisa ser ajustado..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleApproval('reject')} 
              disabled={processing || !rejectionReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {processing ? 'Processando...' : 'Rejeitar'}
            </Button>
            <Button 
              onClick={() => handleApproval('approve')} 
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {processing ? 'Processando...' : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}