
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ApprovalRequest } from '@/api/entities';
import { approvalWorkflow } from '@/api/functions';
import { showToast } from '@/components/feedback/EnhancedFeedback';
import { 
  Send, Mail, Clock, CheckCircle, XCircle,
  AlertTriangle, Copy, Download, FileText,
  Calendar, Users, Building, Eye, Loader2
} from 'lucide-react';

const ApprovalStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { color: 'bg-amber-100 text-amber-800', label: 'Pendente', icon: Clock },
    approved: { color: 'bg-green-100 text-green-800', label: 'Aprovado', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejeitado', icon: XCircle },
    expired: { color: 'bg-slate-100 text-slate-800', label: 'Expirado', icon: AlertTriangle },
    revoked: { color: 'bg-slate-100 text-slate-800', label: 'Revogado', icon: XCircle }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

const ApprovalCard = ({ approval, onResend, onRevoke }) => {
  const [loading, setLoading] = useState(false);

  const handleCopyLink = () => {
    const approvalUrl = `${window.location.origin}/approval/${approval.token}`;
    navigator.clipboard.writeText(approvalUrl);
    showToast.success('Link copiado para área de transferência!');
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await approvalWorkflow(`?action=notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: approval.id,
          customMessage: 'Lembrança: você possui uma aprovação pendente.'
        })
      });
      
      showToast.success('Lembrete enviado com sucesso!');
      if (onResend) onResend(approval.id);
    } catch (error) {
      showToast.error('Erro ao enviar lembrete');
    } finally {
      setLoading(false);
    }
  };

  const isExpiringSoon = () => {
    if (!approval.expiresAt) return false;
    const expiryDate = new Date(approval.expiresAt);
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    return expiryDate <= oneDayFromNow && approval.status === 'pending';
  };

  return (
    <Card className={`${isExpiringSoon() ? 'border-amber-300 bg-amber-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              {approval.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <ApprovalStatusBadge status={approval.status} />
              {isExpiringSoon() && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Expira em breve
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Aprovador:</span>
              <p className="font-medium">{approval.approverName}</p>
              <p className="text-slate-600">{approval.approverEmail}</p>
            </div>
            <div>
              <span className="text-slate-500">Criado em:</span>
              <p>{new Date(approval.created_date).toLocaleString('pt-BR')}</p>
              
              {approval.expiresAt && (
                <>
                  <span className="text-slate-500">Expira em:</span>
                  <p className={isExpiringSoon() ? 'text-amber-700 font-medium' : ''}>
                    {new Date(approval.expiresAt).toLocaleString('pt-BR')}
                  </p>
                </>
              )}
            </div>
          </div>

          {approval.customMessage && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-700">{approval.customMessage}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Eye className="w-4 h-4" />
            {approval.accessCount || 0} visualizações
            {approval.lastAccessedAt && (
              <span>• Último acesso: {new Date(approval.lastAccessedAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>

          {approval.status === 'pending' && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCopyLink}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleResend}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Reenviar
              </Button>
            </div>
          )}

          {approval.status === 'approved' && approval.approverComment && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Comentário da aprovação:</p>
                  <p className="text-sm text-green-700 mt-1">{approval.approverComment}</p>
                </div>
              </div>
            </div>
          )}

          {approval.status === 'rejected' && approval.approverComment && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Motivo da rejeição:</p>
                  <p className="text-sm text-red-700 mt-1">{approval.approverComment}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CreateApprovalForm = ({ contentType, contentId, onCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    approverEmail: '',
    approverName: '',
    customMessage: '',
    expiryDays: 7,
    requiresSignature: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.approverEmail || !formData.approverName) {
      showToast.error('Email e nome do aprovador são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const response = await approvalWorkflow(`?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          ...formData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showToast.success('Solicitação de aprovação criada e enviada!');
        if (onCreated) onCreated(data.approval);
      } else {
        throw new Error(data.error || 'Erro ao criar aprovação');
      }
    } catch (error) {
      console.error('Erro:', error);
      showToast.error(error.message || 'Erro ao criar aprovação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-600" />
          Criar Solicitação de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="approverName">Nome do Aprovador *</Label>
              <Input
                id="approverName"
                value={formData.approverName}
                onChange={(e) => setFormData(prev => ({...prev, approverName: e.target.value}))}
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <Label htmlFor="approverEmail">Email do Aprovador *</Label>
              <Input
                id="approverEmail"
                type="email"
                value={formData.approverEmail}
                onChange={(e) => setFormData(prev => ({...prev, approverEmail: e.target.value}))}
                placeholder="aprovador@cliente.com"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customMessage">Mensagem Personalizada</Label>
            <Textarea
              id="customMessage"
              value={formData.customMessage}
              onChange={(e) => setFormData(prev => ({...prev, customMessage: e.target.value}))}
              placeholder="Adicione uma mensagem personalizada para o aprovador..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="expiryDays">Prazo de Expiração (dias)</Label>
            <Input
              id="expiryDays"
              type="number"
              min="1"
              max="30"
              value={formData.expiryDays}
              onChange={(e) => setFormData(prev => ({...prev, expiryDays: parseInt(e.target.value)}))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Aprovação
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { ApprovalCard, CreateApprovalForm, ApprovalStatusBadge };

export default function ApprovalWorkflow({ contentType, contentId, existingApprovals = [] }) {
  const [approvals, setApprovals] = useState(existingApprovals);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const approvalsData = await ApprovalRequest.filter({ 
        contentType,
        contentId 
      }, '-created_date');
      
      setApprovals(approvalsData);
    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId]); // Dependencies for useCallback

  useEffect(() => {
    if (contentId) {
      loadApprovals();
    }
  }, [contentId, loadApprovals]); // Dependencies for useEffect

  const handleApprovalCreated = (newApproval) => {
    setApprovals(prev => [newApproval, ...prev]);
    setShowCreateForm(false);
  };

  if (loading && approvals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">Carregando aprovações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Aprovações</h3>
          <p className="text-sm text-slate-600">
            {approvals.length} solicitação(ões) de aprovação
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Send className="w-4 h-4 mr-2" />
          Nova Aprovação
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateApprovalForm
          contentType={contentType}
          contentId={contentId}
          onCreated={handleApprovalCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">
                Nenhuma aprovação criada ainda
              </h4>
              <p className="text-slate-600 mb-4">
                Crie uma solicitação de aprovação para enviar este conteúdo para seu cliente.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Send className="w-4 h-4 mr-2" />
                Criar Primeira Aprovação
              </Button>
            </CardContent>
          </Card>
        ) : (
          approvals.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onResend={() => loadApprovals()}
            />
          ))
        )}
      </div>
    </div>
  );
}
