
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building, Mail, Phone, MapPin, Calendar, 
  Settings, ArrowLeft, RefreshCw,
  LayoutDashboard, Briefcase, FileText, CheckSquare, FolderOpen // New imports for tabs
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientHeader({ 
  client, 
  services = [], 
  onRefresh, 
  refreshing = false,
  showBackButton = true,
  activeTab, // New prop
  onTabChange, // New prop
  actions = [] // New prop (not used in this component's logic, but added as per outline)
}) {
  if (!client) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'inativo': return 'bg-gray-100 text-gray-800';
      case 'prospecto': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompanySizeLabel = (size) => {
    const labels = {
      startup: 'Startup',
      pequena: 'Pequena',
      media: 'Média',
      grande: 'Grande',
      multinacional: 'Multinacional'
    };
    return labels[size] || size;
  };

  const getRevenueRangeLabel = (range) => {
    const labels = {
      ate_1m: 'Até R$ 1M',
      '1m_5m': 'R$ 1M - 5M',
      '5m_20m': 'R$ 5M - 20M',
      '20m_100m': 'R$ 20M - 100M',
      acima_100m: 'Acima de R$ 100M'
    };
    return labels[range] || range;
  };

  // Tabs definition as per outline
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'services', label: 'Serviços', icon: Briefcase },
    { id: 'briefing', label: 'Briefing', icon: FileText },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'documents', label: 'Documentos', icon: FolderOpen },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            {showBackButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="mt-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-6 h-6 text-white" />
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {client.name}
                </h1>
                <Badge className={getStatusColor(client.status)}>
                  {client.status?.charAt(0).toUpperCase() + client.status?.slice(1)}
                </Badge>
              </div>
              
              <p className="text-gray-600 mb-2">
                {client.legal_name}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {client.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span>{client.email}</span>
                  </div>
                )}
                
                {client.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                
                {client.sector && (
                  <div className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    <span>{client.sector}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Cliente desde {format(new Date(client.created_date), 'MMM yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {/* The standalone Settings button is removed as it's now part of the tabs navigation below */}
          </div>
        </div>
        
        {/* Informações complementares */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">CNPJ</div>
            <div className="font-medium text-gray-900">{client.cnpj || 'Não informado'}</div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Porte</div>
            <div className="font-medium text-gray-900">
              {client.company_size ? getCompanySizeLabel(client.company_size) : 'Não informado'}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Faturamento</div>
            <div className="font-medium text-gray-900">
              {client.revenue_range ? getRevenueRangeLabel(client.revenue_range) : 'Não informado'}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Serviços</div>
            <div className="font-medium text-gray-900">
              {services.length > 0 ? `${services.length} ativo${services.length !== 1 ? 's' : ''}` : 'Nenhum'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-t border-gray-100 px-6">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={`rounded-none border-b-2 h-10 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
