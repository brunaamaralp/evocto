import React, { useState, useEffect } from 'react';
import { CyclePlan, BriefingVersion } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { useClient } from '../../layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Calendar,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const ApprovalCard = ({ item, type }) => {
  const getStatusConfig = (status) => {
    const configs = {
      pending_approval: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Aguardando' },
      approved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Aprovado' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Rejeitado' },
      IN_REVIEW: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Em Revisão' },
      APPROVED: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Aprovado' },
      REJECTED: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Rejeitado' }
    };
    return configs[status] || configs.pending_approval;
  };

  const statusConfig = getStatusConfig(item.status);
  const StatusIcon = statusConfig.icon;

  const getTitle = () => {
    if (type === 'cycle') {
      return `Planejamento ${item.cyclePeriod}`;
    }
    return `Briefing ${item.version_name || 'v1.0'}`;
  };

  const getDescription = () => {
    if (type === 'cycle') {
      return item.planData?.mudancaChave || 'Planejamento mensal';
    }
    return item.release_notes || 'Atualização do briefing mestre';
  };

  const getUrl = () => {
    if (type === 'cycle') {
      return createPageUrl(`cycle-plan?id=${item.id}`);
    }
    return createPageUrl(`briefing-approval?token=${item.public_share_token}`);
  };

  const getExpirationDate = () => {
    if (type === 'cycle') {
      return item.approvalData?.token_expires_at;
    }
    return item.token_expires_at;
  };

  const expirationDate = getExpirationDate();
  const isExpiringSoon = expirationDate && new Date(expirationDate) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  return (
    <Card className="hover:shadow-md transition-shadow border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900">
              {getTitle()}
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {getDescription()}
            </p>
          </div>
          <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Criado:</span>
            <span>{new Date(item.created_date).toLocaleDateString()}</span>
          </div>
          
          {expirationDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Expira em:</span>
              <span className={isExpiringSoon ? 'text-red-600 font-medium' : ''}>
                {new Date(expirationDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {item.approved_at && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Aprovado em:</span>
              <span>{new Date(item.approved_at).toLocaleDateString()}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {type === 'cycle' ? 'Planejamento' : 'Briefing'}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to={getUrl()}>
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Link>
              </Button>
              {item.status === 'pending_approval' && (
                <Button size="sm" asChild>
                  <Link to={getUrl()}>
                    <Send className="w-4 h-4 mr-1" />
                    Enviar
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ type }) => {
  const titles = {
    pending: 'Nenhuma aprovação pendente',
    approved: 'Nenhuma aprovação registrada',
    all: 'Nenhuma aprovação encontrada'
  };
  
  const descriptions = {
    pending: 'Todas as aprovações estão em dia. Continue o bom trabalho!',
    approved: 'As aprovações aparecerão aqui conforme forem sendo processadas.',
    all: 'Não há aprovações registradas para este cliente ainda.'
  };

  return (
    <div className="text-center py-16">
      <CheckSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {titles[type] || titles.all}
      </h3>
      <p className="text-slate-600 max-w-md mx-auto">
        {descriptions[type] || descriptions.all}
      </p>
    </div>
  );
};

export default function ApprovalsTab({ customerId }) {
  const { client } = useClient();
  const { agency } = useSession();
  const { t } = useTranslation();
  
  const [approvals, setApprovals] = useState({
    cycles: [],
    briefings: []
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const loadApprovals = async () => {
      if (!customerId || !agency?.id) return;

      try {
        setLoading(true);
        
        const [cycles, briefings] = await Promise.all([
          CyclePlan.filter({
            clientId: customerId,
            agencyId: agency.id,
            status: { $in: ['pending_approval', 'approved'] }
          }, '-created_date'),
          BriefingVersion.filter({
            agencyId: agency.id,
            projectId: customerId
          }, '-created_date')
        ]);

        setApprovals({
          cycles: cycles || [],
          briefings: briefings || []
        });
      } catch (error) {
        console.error('Error loading approvals:', error);
        setApprovals({ cycles: [], briefings: [] });
      } finally {
        setLoading(false);
      }
    };

    loadApprovals();
  }, [customerId, agency?.id]);

  const filterItems = (items, filter) => {
    switch (filter) {
      case 'pending':
        return items.filter(item => 
          item.status === 'pending_approval' || item.status === 'IN_REVIEW'
        );
      case 'approved':
        return items.filter(item => 
          item.status === 'approved' || item.status === 'APPROVED'
        );
      case 'rejected':
        return items.filter(item => 
          item.status === 'rejected' || item.status === 'REJECTED'
        );
      default:
        return items;
    }
  };

  const filteredCycles = filterItems(approvals.cycles, activeFilter);
  const filteredBriefings = filterItems(approvals.briefings, activeFilter);
  const allFilteredItems = [...filteredCycles, ...filteredBriefings];

  const stats = {
    pending: approvals.cycles.filter(c => c.status === 'pending_approval').length + 
             approvals.briefings.filter(b => b.status === 'IN_REVIEW').length,
    approved: approvals.cycles.filter(c => c.status === 'approved').length + 
              approvals.briefings.filter(b => b.status === 'APPROVED').length,
    total: approvals.cycles.length + approvals.briefings.length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-slate-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Aprovações</h1>
        <p className="text-slate-600 mt-1">
          Planejamentos e briefings de {client?.name} aguardando ou já aprovados
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700">Pendentes</p>
                <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Aprovadas</p>
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Total</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: `Pendentes (${stats.pending})` },
            { key: 'approved', label: `Aprovadas (${stats.approved})` }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none ${
                activeFilter === filter.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {allFilteredItems.length === 0 ? (
        <EmptyState type={activeFilter} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCycles.map(cycle => (
            <ApprovalCard key={`cycle-${cycle.id}`} item={cycle} type="cycle" />
          ))}
          {filteredBriefings.map(briefing => (
            <ApprovalCard key={`briefing-${briefing.id}`} item={briefing} type="briefing" />
          ))}
        </div>
      )}
    </motion.div>
  );
}