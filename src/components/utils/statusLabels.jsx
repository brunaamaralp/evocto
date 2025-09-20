
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper para mapear status internos para labels amigáveis
export const getStatusLabel = (status) => {
  const statusMap = {
    'draft': 'Rascunho',
    'IN_REVIEW': 'Em aprovação',
    'pending_approval': 'Em aprovação',
    'approved': 'Aprovado',
    'APPROVED': 'Aprovado',
    'rejected': 'Ajustes solicitados',
    'REJECTED': 'Ajustes solicitados'
  };
  
  return statusMap[status] || status;
};

export const getStatusColor = (status) => {
  const colorMap = {
    'draft': 'bg-slate-100 text-slate-800',
    'IN_REVIEW': 'bg-yellow-100 text-yellow-800', 
    'pending_approval': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'REJECTED': 'bg-red-100 text-red-800'
  };
  
  return colorMap[status] || 'bg-slate-100 text-slate-800';
};

export const getActionLabel = (status, type = 'plan') => {
  const entityLabel = type === 'brief' ? 'Briefing' : 'Plano';
  
  if (status === 'draft' || status === 'DRAFT' || status === 'REJECTED' || status === 'rejected') {
    return `Enviar ${entityLabel} para aprovação`;
  }
  if (status === 'IN_REVIEW' || status === 'pending_approval') {
    return 'Abrir link de aprovação';
  }
  if (status === 'approved' || status === 'APPROVED') {
    return `${entityLabel} aprovado`;
  }
  
  return 'Ação não disponível';
};

// Novo helper para títulos de plano dinâmicos
export const displayPlanTitle = (plan) => {
  // Assumindo que 'plan' tem 'cyclePeriod' como 'Nov/2025'
  // Lógica mais complexa para quinzenal/semanal pode ser adicionada aqui
  return `Plano de ${plan.cyclePeriod}`;
};

// Novo helper para chips de período
export const displayCycleChip = (cycle) => {
  // Assumindo que 'cycle' tem 'cyclePeriod'
  return cycle.cyclePeriod || 'N/D';
};
