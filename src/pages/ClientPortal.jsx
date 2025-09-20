import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Service } from '@/api/entities';
import { Client } from '@/api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Home, Clock, CheckSquare, FileText, User, 
  AlertCircle, Settings, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Portal Components
import ClientProgressStepper from '@/components/client_portal/ClientProgressStepper';
import ClientPendingActions from '@/components/client_portal/ClientPendingActions';
import ClientDocumentsTab from '@/components/client_portal/ClientDocumentsTab';
import DashboardOverview from '@/components/client_portal/DashboardOverview';
import ApprovalsView from '@/components/client_portal/ApprovalsView';
import CycleReportsView from '@/components/client_portal/CycleReportsView';
import HelpSupport from '@/components/client_portal/HelpSupport';

export default function ClientPortal() {
  const { user } = useSession();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [clientData, setClientData] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadClientData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.data?.clientId || !user?.data?.agencyId) {
        toast.error('Dados de acesso não encontrados');
        return;
      }

      // Carregar dados do cliente
      const client = await Client.get(user.data.clientId);
      if (!client) {
        toast.error('Cliente não encontrado');
        return;
      }
      setClientData(client);

      // Carregar serviços ativos
      const activeServices = await Service.filter({
        agencyId: user.data.agencyId,
        clientId: user.data.clientId,
        is_active: true
      });
      setServices(activeServices || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar informações');
    } finally {
      setLoading(false);
    }
  }, [user?.data?.clientId, user?.data?.agencyId]);

  useEffect(() => {
    if (user?.data?.clientId && user?.data?.agencyId) {
      loadClientData();
    }
  }, [loadClientData]);

  const handleActionComplete = () => {
    // Recarregar dados após ação completa
    loadClientData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seu portal...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar os dados do cliente. Entre em contato com o suporte.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const primaryService = services.find(s => s.is_active) || services[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Olá, {clientData.name} 👋
                </h1>
                <p className="text-gray-600">
                  {clientData.company && `${clientData.company} • `}
                  Bem-vindo ao seu portal
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-8 h-8 p-2 bg-gray-100 rounded-full" />
                <span className="text-sm text-gray-600">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Column - Progress & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Service Progress */}
            {primaryService && (
              <ClientProgressStepper 
                service={primaryService}
                showContext={true}
              />
            )}
            
            {/* Pending Actions */}
            <ClientPendingActions
              clientId={clientData.id}
              serviceId={primaryService?.id}
              onActionComplete={handleActionComplete}
            />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="approvals" className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Aprovações</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Documentos</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Relatórios</span>
                </TabsTrigger>
                <TabsTrigger value="help" className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Ajuda</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <DashboardOverview 
                  client={clientData}
                  services={services}
                  primaryService={primaryService}
                />
              </TabsContent>

              <TabsContent value="approvals">
                <ApprovalsView 
                  clientId={clientData.id}
                  onApprovalComplete={handleActionComplete}
                />
              </TabsContent>

              <TabsContent value="documents">
                <ClientDocumentsTab 
                  clientId={clientData.id}
                  serviceId={primaryService?.id}
                />
              </TabsContent>

              <TabsContent value="reports">
                <CycleReportsView 
                  clientId={clientData.id}
                  serviceId={primaryService?.id}
                />
              </TabsContent>

              <TabsContent value="help">
                <HelpSupport 
                  client={clientData}
                  service={primaryService}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}