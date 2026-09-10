import { useState, useEffect } from 'react';
import { WorkOrder, Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Briefcase } from 'lucide-react';
import WorkOrderCard from '../components/workorders/WorkOrderCard';

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');
  const { agency } = useSession();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const agencyId = agency?.id || "agency_demo_01";
      
      const [workOrdersData, clientsData] = await Promise.all([
        WorkOrder.filter({ agencyId }, "-created_date"),
        Client.filter({ agencyId })
      ]);
      
      setWorkOrders(workOrdersData);
      setClients(clientsData);
    } catch (error) {
      console.error("Erro ao carregar work orders:", error);
      setWorkOrders([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filterWorkOrders = (status) => {
    if (status === 'todos') return workOrders;
    if (status === 'ativos') return workOrders.filter(wo => ['definindo_escopo', 'rc_pendente', 'aprovado', 'em_execucao'].includes(wo.status));
    if (status === 'concluidos') return workOrders.filter(wo => wo.status === 'concluido');
    return workOrders.filter(wo => wo.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Gerencie trabalhos pontuais e projetos únicos.</p>
        </div>
        <Button className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Work Order
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:max-w-md sm:grid-cols-4 gap-1 h-auto">
            <TabsTrigger value="todos" className="shrink-0 whitespace-nowrap">Todos</TabsTrigger>
            <TabsTrigger value="ativos" className="shrink-0 whitespace-nowrap">Ativos</TabsTrigger>
            <TabsTrigger value="concluidos" className="shrink-0 whitespace-nowrap">Concluídos</TabsTrigger>
            <TabsTrigger value="cancelados" className="shrink-0 whitespace-nowrap">Cancelados</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="pt-6">
          {filterWorkOrders(activeTab).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterWorkOrders(activeTab).map((workOrder) => {
                const client = clients.find(c => c.id === workOrder.clientId);
                return (
                  <WorkOrderCard 
                    key={workOrder.id} 
                    workOrder={workOrder} 
                    clientName={client?.name || 'Cliente não encontrado'} 
                  />
                );
              })}
            </div>
          ) : (
            <Card className="text-center p-12 bg-gradient-to-br from-slate-50 to-slate-100">
              <Briefcase className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold">
                {activeTab === 'todos' ? 'Nenhum work order encontrado' : `Nenhum work order ${activeTab}`}
              </h3>
              <p className="text-slate-500 mt-2">
                {activeTab === 'todos' 
                  ? 'Clique em "Novo Work Order" para começar.' 
                  : `Não há work orders com status ${activeTab} no momento.`
                }
              </p>
              {activeTab === 'todos' && (
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Work Order
                </Button>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}