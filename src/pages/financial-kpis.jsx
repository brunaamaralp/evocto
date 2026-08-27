import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@/api/entities";
import { Service } from "@/api/entities";
import {
  TrendingUp,
  Settings,
  Upload,
  Edit3,
  BarChart3
} from "lucide-react";

import KPIDashboard from '@/components/financial/KPIDashboard';
import KPIManager from '@/components/financial/KPIManager';
import FinancialDataUploader from '@/components/financial/FinancialDataUploader';
import ManualDataEntry from '@/components/financial/ManualDataEntry';
import ExecutiveDashboard from '@/components/financial/ExecutiveDashboard';

// A simple placeholder for LoadingState component, as it's used in the outline but not provided.
const LoadingState = ({ message }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-lg shadow-sm p-6">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mb-4"></div>
    <p className="text-lg text-gray-700 font-medium">{message || "Carregando dados..."}</p>
    <p className="text-sm text-gray-500 mt-2">Aguarde enquanto preparamos as informações.</p>
  </div>
);

export default function FinancialKPIsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extrair parâmetros da URL
  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId');
  const serviceId = urlParams.get('serviceId');
  const view = urlParams.get('view') || 'dashboard';

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        if (clientId) {
          const client = await Client.get(clientId);
          setSelectedClient(client);
        } else {
          setSelectedClient(null);
        }

        if (serviceId) {
          const service = await Service.get(serviceId);
          setSelectedService(service);
        } else {
          setSelectedService(null);
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [clientId, serviceId]);

  const handleViewChange = (newView) => {
    const params = new URLSearchParams(location.search);
    params.set('view', newView);
    if (clientId) params.set('clientId', clientId);
    if (serviceId) params.set('serviceId', serviceId);
    
    navigate(`/performance-kpis?${params.toString()}`);
  };

  const renderContent = () => {
    const commonProps = {
      clientId,
      serviceId,
      selectedClient,
      selectedService
    };

    switch (view) {
      case 'dashboard':
        return <KPIDashboard {...commonProps} />;
      case 'manager':
        return <KPIManager {...commonProps} />;
      case 'upload':
        return <FinancialDataUploader {...commonProps} />;
      case 'manual':
        return <ManualDataEntry {...commonProps} />;
      case 'executive':
        return <ExecutiveDashboard {...commonProps} />;
      default:
        return <KPIDashboard {...commonProps} />;
    }
  };

  if (loading) {
    return <LoadingState message="Carregando KPIs de performance..." />;
  }

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          KPIs de Performance
          {selectedClient && <span className="text-lg text-gray-600 ml-2">- {selectedClient.name}</span>}
          {selectedService && <span className="text-lg text-gray-600 ml-2">({selectedService.name})</span>}
        </h1>
        <p className="text-gray-600 mt-2">
          Sistema completo de gestão e monitoramento de indicadores de marketing e performance
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'manager', label: 'Gerenciar KPIs', icon: Settings },
              { id: 'upload', label: 'Upload de Dados', icon: Upload },
              { id: 'manual', label: 'Entrada Manual', icon: Edit3 },
              { id: 'executive', label: 'Visão Executiva', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleViewChange(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  view === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="mr-2 h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow">
        {renderContent()}
      </div>
    </div>
  );
}