
import React, { useState, useEffect, useCallback } from 'react';
import { ApprovalRequest } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Eye, Calendar, Clock, CheckCircle, XCircle, 
  FileText, AlertTriangle, Download, ExternalLink,
  MessageSquare, User, Building
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Importar função de processamento
import { processClientApproval } from '@/api/functions';

export default function ApprovalsView({ clientId, dashboardData }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalContent, setApprovalContent] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar aprovações do cliente
      const approvalsList = await ApprovalRequest.filter({ 
        clientId: clientId,
        status: { $in: ['pending'] }
      }, '-created_date');

      setApprovals(approvalsList);
    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
      toast.error('Erro ao carregar aprovações');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Usar dados do dashboard se disponível
  useEffect(() => {
    if (dashboardData?.approvals?.pending) {
      setApprovals(dashboardData.approvals.pending);
      setLoading(false);
    } else {
      loadApprovals();
    }
  }, [dashboardData, clientId, loadApprovals]);

  const handleViewApproval = async (approval) => {
    setSelectedApproval(approval);
    setPreviewLoading(true);
    setShowDialog(true);
    
    try {
      // Carregar conteúdo para preview baseado no tipo
      let content = null;
      
      switch (approval.contentType) {
        case 'briefing':
          const { BriefingVersion } = await import('@/api/entities');
          content = await BriefingVersion.get(approval.contentId);
          break;
          
        case 'cycle_plan':
          const { CyclePlan } = await import('@/api/entities');
          content = await CyclePlan.get(approval.contentId);
          break;
          
        default:
          content = { message: 'Preview não disponível para este tipo de conteúdo.' };
      }
      
      setApprovalContent(content);
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
      setApprovalContent({ error: 'Erro ao carregar conteúdo para preview.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApproval = async (action) => {
    if (!selectedApproval) return;
    
    // Confirmação antes de aprovar/rejeitar
    const confirmMessage = action === 'approve' 
      ? 'Tem certeza que deseja aprovar este documento? Esta ação não pode ser desfeita.'
      : 'Tem certeza que deseja rejeitar este documento?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await processClientApproval({
        approvalId: selectedApproval.id,
        action,
        comment: comment.trim()
      });
      
      if (response.data?.success) {
        toast.success(
          action === 'approve' 
            ? 'Documento aprovado com sucesso!' 
            : 'Documento rejeitado com sucesso!'
        );
        
        // Atualizar lista de aprovações
        setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id));
        
        // Fechar dialog
        setShowDialog(false);
        setSelectedApproval(null);
        setApprovalContent(null);
        setComment('');
        
      } else {
        throw new Error(response.data?.message || 'Erro ao processar aprovação');
      }
      
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
      toast.error(error.message || 'Erro ao processar aprovação');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status, expiresAt) => {
    const isExpiringSoon = expiresAt && new Date(expiresAt) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    switch (status) {
      case 'pending':
        return (
          <Badge variant={isExpiringSoon ? "destructive" : "secondary"} className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isExpiringSoon ? 'Expira em breve' : 'Pendente'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'briefing':
        return <FileText className="w-4 h-4" />;
      case 'cycle_plan':
        return <Calendar className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (type) => {
    switch (type) {
      case 'briefing':
        return 'Briefing';
      case 'cycle_plan':
        return 'Plano de Ciclo';
      default:
        return 'Documento';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-64" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Todas as aprovações em dia!
        </h3>
        <p className="text-gray-500">
          Você não tem aprovações pendentes no momento.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aprovações Pendentes</h2>
          <p className="text-gray-600">
            {approvals.length} documento{approvals.length !== 1 ? 's' : ''} aguardando sua aprovação
          </p>
        </div>
        
        {/* Alertas de urgência */}
        {dashboardData?.approvals?.urgent && dashboardData.approvals.urgent.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50 max-w-sm">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {dashboardData.approvals.urgent.length} aprovação(ões) expiram em breve
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Lista de aprovações */}
      <div className="grid gap-4">
        {approvals.map((approval, index) => {
          const isUrgent = approval.expiresAt && 
            new Date(approval.expiresAt) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          
          return (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`hover:shadow-md transition-shadow ${
                isUrgent ? 'border-orange-200 bg-orange-50/30' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getContentTypeIcon(approval.contentType)}
                          <span className="text-sm font-medium text-gray-600">
                            {getContentTypeLabel(approval.contentType)}
                          </span>
                        </div>
                        {getStatusBadge(approval.status, approval.expiresAt)}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {approval.title}
                      </h3>
                      
                      {approval.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {approval.description}
                        </p>
                      )}
                      
                      {approval.customMessage && (
                        <div className="bg-blue-50 border-l-4 border-blue-200 p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">Mensagem da equipe:</p>
                              <p className="text-sm text-blue-700 mt-1">{approval.customMessage}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Criado em {format(new Date(approval.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        
                        {approval.expiresAt && (
                          <div className={`flex items-center gap-1 ${
                            isUrgent ? 'text-orange-600 font-medium' : ''
                          }`}>
                            <Clock className="w-3 h-3" />
                            Expira em {format(new Date(approval.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewApproval(approval)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </Button>
                      
                      {approval.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={approval.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Dialog de visualização e aprovação */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedApproval && getContentTypeIcon(selectedApproval.contentType)}
              {selectedApproval?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.description}
            </DialogDescription>
          </DialogHeader>
          
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Carregando preview...</span>
            </div>
          ) : approvalContent ? (
            <div className="space-y-6">
              {/* Preview do conteúdo */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <h4 className="font-medium mb-3">Preview do Documento:</h4>
                
                {approvalContent.error ? (
                  <div className="text-red-600 text-sm">{approvalContent.error}</div>
                ) : approvalContent.message ? (
                  <div className="text-gray-600 text-sm">{approvalContent.message}</div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {selectedApproval?.contentType === 'cycle_plan' && approvalContent.planData && (
                      <>
                        <div>
                          <strong>Período:</strong> {approvalContent.cyclePeriod}
                        </div>
                        <div>
                          <strong>Mudança Chave:</strong> {approvalContent.planData.mudancaChave}
                        </div>
                        {approvalContent.planData.prioridades && (
                          <div>
                            <strong>Prioridades:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {approvalContent.planData.prioridades.map((prioridade, i) => (
                                <li key={i}>{typeof prioridade === 'string' ? prioridade : prioridade.tarefa}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedApproval?.contentType === 'briefing' && approvalContent.snapshot_data && (
                      <div>
                        <strong>Briefing - Versão:</strong> {approvalContent.version_name}
                        <pre className="mt-2 text-xs bg-white p-3 rounded overflow-x-auto">
                          {JSON.stringify(approvalContent.snapshot_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Campo de comentário */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Comentário (opcional)
                </label>
                <Textarea
                  placeholder="Adicione um comentário sobre sua decisão..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
              
              {/* Warning sobre ação irreversível */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> A aprovação ou rejeição deste documento não pode ser desfeita. 
                  Certifique-se de revisar todo o conteúdo antes de tomar sua decisão.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={submitting}
            >
              Fechar
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleApproval('reject')}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Rejeitar
              </Button>
              
              <Button
                onClick={() => handleApproval('approve')}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Aprovar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
