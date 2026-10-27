import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle,
  FileText, TrendingUp, TrendingDown,
  Eye, Send, MoreHorizontal, RefreshCw, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { ApprovalRequest } from '@/api/entities';
import {
  fetchPendingApprovals,
  mapPendingApprovalsForDashboard,
} from '@/lib/pendingApprovals';
import {
  resendPendingApproval,
  revokePendingApproval,
  downloadApprovalPdf,
} from '@/lib/approvalDashboardActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Status das aprovações
const APPROVAL_STATUS = {
  pending: { 
    label: 'Pendente', 
    color: 'yellow', 
    icon: Clock,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700'
  },
  approved: { 
    label: 'Aprovado', 
    color: 'green', 
    icon: CheckCircle,
    bgColor: 'bg-green-100', 
    textColor: 'text-green-700'
  },
  rejected: { 
    label: 'Rejeitado', 
    color: 'red', 
    icon: XCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700'
  },
  expired: { 
    label: 'Expirado', 
    color: 'gray', 
    icon: AlertCircle,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700'
  },
  revoked: {
    label: 'Revogado',
    color: 'gray',
    icon: XCircle,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
};

// Card de estatísticas
const StatsCard = ({ title, value, change, icon: Icon, trend }) => {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-[#7A7595]';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card className="rounded-2xl border-transparent shadow-sm bg-[#EEF4FA]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="text-sm font-medium text-[#7A7595]">{title}</div>
        <Icon className="h-4 w-4 text-[#C02807]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#18162A]">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-sm ${trendColor} mt-1`}>
            {TrendIcon && <TrendIcon className="h-3 w-3 mr-1" />}
            <span>{change > 0 ? '+' : ''}{change}% vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente de filtros
const ApprovalFilters = ({ filters, onFiltersChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Buscar aprovações..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full"
        />
      </div>
      
      <Select 
        value={filters.status} 
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendente</SelectItem>
          <SelectItem value="approved">Aprovado</SelectItem>
          <SelectItem value="rejected">Rejeitado</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.contentType} 
        onValueChange={(value) => onFiltersChange({ ...filters, contentType: value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="briefing">Briefing</SelectItem>
          <SelectItem value="cycle_plan">Plano de Ciclo</SelectItem>
          <SelectItem value="creative">Criativo</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={() => onFiltersChange({
          search: '',
          status: 'all',
          contentType: 'all'
        })}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Limpar
      </Button>
    </div>
  );
};

function ApprovalRowActions({ approval, onAction, actionBusyId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="touch-target h-11 w-11 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {approval.href ? (
          <DropdownMenuItem
            disabled={actionBusyId === approval.id}
            onClick={() => onAction('view', approval)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualizar
          </DropdownMenuItem>
        ) : null}
        {approval.status === 'pending' && (
          <>
            <DropdownMenuItem
              disabled={actionBusyId === approval.id}
              onClick={() => onAction('resend', approval)}
            >
              {actionBusyId === approval.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Reenviar
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={actionBusyId === approval.id}
              onClick={() => onAction('revoke', approval)}
              className="text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Revogar
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          disabled={actionBusyId === approval.id}
          onClick={() => onAction('download', approval)}
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Tabela de aprovações (+ cards no mobile)
const ApprovalsTable = ({ approvals, onAction, actionBusyId = null }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#FFD4C8] overflow-hidden shadow-sm">
      <div className="md:hidden divide-y divide-gray-100">
        {approvals.map((approval) => {
          const statusConfig = APPROVAL_STATUS[approval.status] || APPROVAL_STATUS.pending;
          const StatusIcon = statusConfig.icon;
          const daysLeft = approval.expiresAt
            ? Math.ceil((new Date(approval.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <div key={approval.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#18162A] truncate">
                    {approval.title || 'Sem título'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {String(approval.contentType || '').replace('_', ' ')}
                  </p>
                </div>
                <ApprovalRowActions
                  approval={approval}
                  onAction={onAction}
                  actionBusyId={actionBusyId}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#7A7595]">
                <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <span className="truncate">{approval.approverName}</span>
                <span>
                  {format(new Date(approval.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                {daysLeft !== null ? (
                  <span className={daysLeft <= 1 ? 'text-red-600 font-medium' : ''}>
                    {daysLeft > 0 ? `${daysLeft}d` : 'Expirado'}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-[#EEF4FA]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conteúdo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente/Aprovador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expira em
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {approvals.map((approval) => {
              const statusConfig = APPROVAL_STATUS[approval.status] || APPROVAL_STATUS.pending;
              const StatusIcon = statusConfig.icon;
              const daysLeft = approval.expiresAt ? 
                Math.ceil((new Date(approval.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <tr key={approval.id} className="hover:bg-[#EEF4FA]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-[#18162A]">
                        {approval.title || 'Sem título'}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {approval.contentType.replace('_', ' ')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-[#18162A]">
                        {approval.approverName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {approval.approverEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#18162A]">
                    {format(new Date(approval.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {daysLeft !== null ? (
                      <span className={daysLeft <= 1 ? 'text-red-600 font-medium' : 'text-[#7A7595]'}>
                        {daysLeft > 0 ? `${daysLeft} dia(s)` : 'Expirado'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <ApprovalRowActions
                      approval={approval}
                      onAction={onAction}
                      actionBusyId={actionBusyId}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {approvals.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#18162A] mb-2">Nenhuma aprovação encontrada</h3>
          <p className="text-[#7A7595] max-w-md mx-auto">
            Solicitações nascem no ciclo ou no conteúdo do cliente — abra o cliente para enviar uma aprovação.
          </p>
        </div>
      )}
    </div>
  );
};

// Componente principal
export default function ApprovalDashboard() {
  const _t = useT();
  const { agencyId } = useSession();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    contentType: 'all'
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    expired: 0,
    approvalRate: 0
  });
  const [actionBusyId, setActionBusyId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadApprovals = useCallback(async () => {
    if (!agencyId) {
      setApprovals([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const pendingBundle = await fetchPendingApprovals(agencyId);
      const pendingRows = mapPendingApprovalsForDashboard(pendingBundle);

      let historyRows = [];
      try {
        const history = await ApprovalRequest.filter(
          { agencyId },
          '-updated_date',
          40
        );
        historyRows = (Array.isArray(history) ? history : [])
          .filter((r) => r.status && r.status !== 'pending')
          .map((req) => ({
            id: req.id,
            title: req.title || req.contentTitle || 'Solicitação',
            contentType: req.contentType || 'approval',
            status: req.status,
            approverName: req.approverName || req.approver_name || '—',
            approverEmail: req.approverEmail || req.approver_email || '',
            created_date: req.created_date || req.$createdAt,
            expiresAt: req.expiresAt || req.expires_at || null,
            href: null,
            source: 'request',
          }));
      } catch (err) {
        console.warn('[approval-dashboard] history filter:', err?.message || err);
      }

      const seen = new Set(pendingRows.map((r) => r.id));
      const merged = [
        ...pendingRows,
        ...historyRows.filter((r) => !seen.has(r.id)),
      ];

      setApprovals(merged);

      const total = merged.length;
      const pending = merged.filter((a) => a.status === 'pending').length;
      const approved = merged.filter((a) => a.status === 'approved').length;
      const expired = merged.filter((a) => a.status === 'expired').length;
      const approvalRate =
        pending + approved > 0
          ? Math.round((approved / (pending + approved)) * 100)
          : 0;

      setStats({ total, pending, approved, expired, approvalRate });
    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // Filtrar aprovações
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = !filters.search || 
      approval.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
      approval.approverName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      approval.approverEmail?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || approval.status === filters.status;
    const matchesType = filters.contentType === 'all' || approval.contentType === filters.contentType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const confirmRevoke = async () => {
    const approval = revokeTarget;
    if (!approval) return;
    setRevokeTarget(null);
    setActionBusyId(approval.id);
    try {
      await revokePendingApproval(approval);
      toast.success(
        approval.source === 'cycle'
          ? 'Ciclo voltou para rascunho'
          : 'Aprovação revogada'
      );
      await loadApprovals();
    } catch (error) {
      toast.error(error?.message || 'Erro ao revogar');
    } finally {
      setActionBusyId(null);
    }
  };

  // Ações da tabela
  const handleAction = async (action, approval) => {
    switch (action) {
      case 'view':
        if (approval?.href) {
          navigate(approval.href);
        } else {
          toast.info('Abra o ciclo ou o conteúdo vinculado para revisar');
        }
        break;
      case 'resend':
        setActionBusyId(approval.id);
        try {
          const result = await resendPendingApproval(approval);
          if (result.mode === 'open_cycle' && result.href) {
            toast.info('Abra o ciclo para reenviar o link ao aprovador');
            navigate(result.href);
          } else {
            toast.success('Lembrete de aprovação enviado');
          }
        } catch (error) {
          toast.error(error?.message || 'Erro ao reenviar');
        } finally {
          setActionBusyId(null);
        }
        break;
      case 'revoke':
        setRevokeTarget(approval);
        break;
      case 'download': {
        const result = downloadApprovalPdf(approval);
        if (result === 'missing') {
          toast.info('PDF ainda não disponível para este item');
        }
        break;
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#C02807] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-[#7A7595]">Carregando dashboard...</span>
          </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18162A]">
              Aprovações
            </h1>
          </div>
          <Button
            className="w-full sm:w-auto shrink-0"
            variant="outline"
            onClick={() => {
              toast.info(
                'Abra o ciclo ou o conteúdo do cliente para solicitar aprovação'
              );
              navigate(createPageUrl('clients'));
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            Ir para clientes
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <StatsCard
            title="Total de Aprovações"
            value={stats.total}
            icon={FileText}
          />
          <StatsCard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
          />
          <StatsCard
            title="Aprovadas"
            value={stats.approved}
            icon={CheckCircle}
          />
          <StatsCard
            title="Expiradas"
            value={stats.expired}
            icon={AlertCircle}
          />
          <StatsCard
            title="Taxa de Aprovação"
            value={`${stats.approvalRate}%`}
            icon={BarChart3}
          />
        </div>

        {/* Filtros */}
        <ApprovalFilters filters={filters} onFiltersChange={setFilters} />

        {/* Tabela */}
        <ApprovalsTable
          approvals={filteredApprovals}
          onAction={handleAction}
          actionBusyId={actionBusyId}
        />

        <AlertDialog
          open={Boolean(revokeTarget)}
          onOpenChange={(next) => {
            if (!next) setRevokeTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar esta aprovação?</AlertDialogTitle>
              <AlertDialogDescription>
                {revokeTarget?.source === 'cycle'
                  ? 'O ciclo voltará para rascunho e o link de aprovação deixará de valer.'
                  : 'A solicitação será marcada como revogada e o aprovador não poderá mais responder.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(actionBusyId)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRevoke}
                className="bg-red-600 hover:bg-red-700"
                disabled={Boolean(actionBusyId)}
              >
                {actionBusyId ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                ) : null}
                Revogar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}