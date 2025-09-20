import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { ApprovalRequest, Client, Agency } from '@/api/entities';
import ApprovalWorkflow from '@/components/approval/ApprovalWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle, Calendar,
  FileText, Users, TrendingUp, TrendingDown,
  Eye, Send, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  }
};

// Card de estatísticas
const StatsCard = ({ title, value, change, icon: Icon, trend }) => {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <Icon className="h-4 w-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
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

// Tabela de aprovações
const ApprovalsTable = ({ approvals, onAction }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {approval.title || 'Sem título'}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {approval.contentType.replace('_', ' ')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(approval.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {daysLeft !== null ? (
                      <span className={daysLeft <= 1 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {daysLeft > 0 ? `${daysLeft} dia(s)` : 'Expirado'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAction('view', approval)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {approval.status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => onAction('resend', approval)}>
                              <Send className="h-4 w-4 mr-2" />
                              Reenviar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onAction('revoke', approval)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Revogar
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => onAction('download', approval)}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma aprovação encontrada</h3>
          <p className="text-gray-600">Crie sua primeira solicitação de aprovação</p>
        </div>
      )}
    </div>
  );
};

// Componente principal
export default function ApprovalDashboard() {
  const t = useT();
  const { user } = useSession();
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

  // Carregar dados
  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      
      // Simular dados por enquanto
      const mockApprovals = [
        {
          id: '1',
          title: 'Briefing - Cliente ABC',
          contentType: 'briefing',
          status: 'pending',
          approverName: 'João Silva',
          approverEmail: 'joao@clienteabc.com',
          created_date: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          title: 'Plano Janeiro 2024 - Cliente XYZ',
          contentType: 'cycle_plan',
          status: 'approved',
          approverName: 'Maria Santos',
          approverEmail: 'maria@clientexyz.com',
          created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setApprovals(mockApprovals);

      // Calcular estatísticas
      const total = mockApprovals.length;
      const pending = mockApprovals.filter(a => a.status === 'pending').length;
      const approved = mockApprovals.filter(a => a.status === 'approved').length;
      const expired = mockApprovals.filter(a => a.status === 'expired').length;
      const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      setStats({ total, pending, approved, expired, approvalRate });

    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

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

  // Ações da tabela
  const handleAction = async (action, approval) => {
    switch (action) {
      case 'view':
        // Implementar visualização
        toast.info('Visualização em desenvolvimento');
        break;
      case 'resend':
        try {
          // Implementar reenvio
          toast.success('Convite reenviado!');
        } catch (error) {
          toast.error('Erro ao reenviar');
        }
        break;
      case 'revoke':
        if (confirm('Tem certeza que deseja revogar esta aprovação?')) {
          try {
            // Implementar revogação
            toast.success('Aprovação revogada');
            await loadApprovals();
          } catch (error) {
            toast.error('Erro ao revogar');
          }
        }
        break;
      case 'download':
        // Implementar download do PDF
        toast.info('Download em desenvolvimento');
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-600">Carregando dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Aprovações</h1>
            <p className="text-gray-600">Gerencie todas as solicitações de aprovação</p>
          </div>
          <Button>
            <Send className="w-4 h-4 mr-2" />
            Nova Aprovação
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            change={stats.approvalRate > 75 ? 5 : -2}
            trend={stats.approvalRate > 75 ? 'up' : 'down'}
            icon={BarChart3}
          />
        </div>

        {/* Filtros */}
        <ApprovalFilters filters={filters} onFiltersChange={setFilters} />

        {/* Tabela */}
        <ApprovalsTable approvals={filteredApprovals} onAction={handleAction} />
      </div>
    </div>
  );
}