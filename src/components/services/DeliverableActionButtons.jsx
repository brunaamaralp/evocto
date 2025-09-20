import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, XCircle, MessageCircle, Clock, 
  AlertTriangle, ChevronDown 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PermissionGuard, usePermissions } from '@/components/utils/PermissionGuard';
import { toast } from 'sonner';
import { processDeliverableApproval } from '@/api/functions';

export default function DeliverableActionButtons({ 
  deliverable, 
  serviceId, 
  onActionComplete,
  compact = false 
}) {
  const { canApproveDeliverables, user } = usePermissions();
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const canShowActions = () => {
    const status = deliverable.status;
    return ['ready_for_approval', 'in_review', 'ready_for_review'].includes(status);
  };

  const getStatusColor = (status) => {
    const colors = {
      'not_started': 'bg-gray-100 text-gray-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'ready_for_review': 'bg-orange-100 text-orange-700',
      'ready_for_approval': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
      'completed': 'bg-emerald-100 text-emerald-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const handleAction = async (action) => {
    if (['approve', 'reject', 'request_changes'].includes(action)) {
      setPendingAction(action);
      setShowCommentDialog(true);
    }
  };

  const executeAction = async () => {
    if (!pendingAction) return;

    setLoading(true);
    try {
      const response = await processDeliverableApproval({
        deliverableId: deliverable.id,
        serviceId,
        action: pendingAction,
        comment: comment.trim(),
        approverRole: user.role
      });

      if (response.data?.success) {
        toast.success(response.data.message || `Entregável ${getActionLabel(pendingAction)} com sucesso!`);
        onActionComplete?.(response.data.deliverable);
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro ao processar ação:', error);
      
      // Mensagens de erro específicas baseadas no código
      if (error.message.includes('Access denied')) {
        toast.error('Você não tem permissão para esta ação');
      } else if (error.message.includes('Invalid state transition')) {
        toast.error('Esta ação não é permitida no estado atual do entregável');
      } else {
        toast.error(error.message || 'Erro ao processar ação');
      }
    } finally {
      setLoading(false);
      setShowCommentDialog(false);
      setPendingAction(null);
      setComment('');
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'approve': 'aprovado',
      'reject': 'rejeitado', 
      'request_changes': 'solicitadas alterações'
    };
    return labels[action] || action;
  };

  const getActionIcon = (action) => {
    const icons = {
      'approve': CheckCircle,
      'reject': XCircle,
      'request_changes': MessageCircle
    };
    return icons[action] || Clock;
  };

  if (!canShowActions()) {
    return (
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
          {deliverable.status?.replace('_', ' ') || 'Não iniciado'}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
          {deliverable.status?.replace('_', ' ') || 'Não iniciado'}
        </div>

        <PermissionGuard 
          requiredRoles={['owner', 'admin', 'team']}
          disabledMessage="Apenas membros da equipe podem aprovar entregáveis"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAction('approve')}>
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Aprovar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('request_changes')}>
                <MessageCircle className="w-4 h-4 mr-2 text-orange-600" />
                Solicitar Alterações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAction('reject')}>
                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                Rejeitar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGuard>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deliverable.status)}`}>
          {deliverable.status?.replace('_', ' ') || 'Não iniciado'}
        </div>

        <div className="flex gap-2">
          <PermissionGuard 
            requiredRoles={['owner', 'admin', 'team']}
            disabledMessage="Apenas membros da equipe podem aprovar entregáveis"
          >
            <Button 
              size="sm" 
              onClick={() => handleAction('approve')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
          </PermissionGuard>

          <PermissionGuard 
            requiredRoles={['owner', 'admin', 'team']}
            disabledMessage="Apenas membros da equipe podem solicitar alterações"
          >
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAction('request_changes')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Solicitar Alterações
            </Button>
          </PermissionGuard>

          <PermissionGuard 
            requiredRoles={['owner', 'admin', 'team']}
            disabledMessage="Apenas membros da equipe podem rejeitar entregáveis"
          >
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleAction('reject')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Dialog para comentário */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction && React.createElement(getActionIcon(pendingAction), { className: "w-5 h-5" })}
              {pendingAction === 'approve' && 'Aprovar Entregável'}
              {pendingAction === 'reject' && 'Rejeitar Entregável'}
              {pendingAction === 'request_changes' && 'Solicitar Alterações'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'approve' && 'Confirme a aprovação deste entregável. Adicione um comentário se necessário.'}
              {pendingAction === 'reject' && 'Explique o motivo da rejeição deste entregável.'}
              {pendingAction === 'request_changes' && 'Descreva as alterações necessárias para este entregável.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">
                Comentário {pendingAction !== 'approve' ? '(obrigatório)' : '(opcional)'}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  pendingAction === 'approve' ? 'Comentário adicional...' :
                  pendingAction === 'reject' ? 'Explique o motivo da rejeição...' :
                  'Descreva as alterações necessárias...'
                }
                rows={4}
                required={pendingAction !== 'approve'}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowCommentDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={executeAction}
                disabled={loading || (pendingAction !== 'approve' && !comment.trim())}
                className={
                  pendingAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  pendingAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {React.createElement(getActionIcon(pendingAction), { className: "w-4 h-4 mr-2" })}
                    {pendingAction === 'approve' && 'Confirmar Aprovação'}
                    {pendingAction === 'reject' && 'Confirmar Rejeição'}
                    {pendingAction === 'request_changes' && 'Solicitar Alterações'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}