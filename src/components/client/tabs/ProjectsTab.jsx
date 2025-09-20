import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RotateCcw, 
  Briefcase, 
  Plus,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';
import RecurringServiceView from '../../services/RecurringServiceView';

// Mock data para demonstração
const mockRecurringServices = [
  {
    id: "service_social_001",
    name: "Social Media",
    status: "ativo",
    valorMensal: 4500,
    proximoVencimento: new Date('2024-02-01'),
    cicloAtual: "Janeiro 2024",
    progresso: 75
  },
  {
    id: "service_traffic_001", 
    name: "Tráfego Pago",
    status: "pausado",
    valorMensal: 8000,
    proximoVencimento: new Date('2024-02-15'),
    cicloAtual: "Pausado desde Dez/23",
    progresso: 0
  }
];

const mockWorkOrders = [
  {
    id: "wo_001",
    name: "Identidade Visual Completa",
    status: "em_andamento", 
    valorTotal: 12000,
    prazoEntrega: new Date('2024-02-15'),
    progresso: 40
  },
  {
    id: "wo_002",
    name: "Landing Page Black Friday",
    status: "finalizado",
    valorTotal: 3500,
    dataEntrega: new Date('2023-11-20'),
    progresso: 100
  }
];

const ServiceCard = ({ service, onClick }) => (
  <Card className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-500" onClick={onClick}>
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-green-600"/>
            {service.name}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">Serviço recorrente</p>
        </div>
        <Badge variant={service.status === 'ativo' ? 'default' : 'secondary'} 
               className={service.status === 'ativo' ? 'bg-green-100 text-green-800' : ''}>
          {service.status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Ciclo Atual:</span>
          <span className="font-medium">{service.cicloAtual}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Valor Mensal:</span>
          <span className="font-semibold">R$ {service.valorMensal.toLocaleString()}</span>
        </div>
        {service.status === 'ativo' && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Progresso:</span>
              <span className="font-medium">{service.progresso}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${service.progresso}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const WorkOrderCard = ({ workOrder }) => (
  <Card className="border-l-4 border-l-blue-500">
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600"/>
            {workOrder.name}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">Trabalho pontual</p>
        </div>
        <Badge variant={workOrder.status === 'finalizado' ? 'default' : 'secondary'} 
               className={workOrder.status === 'finalizado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
          {workOrder.status === 'finalizado' ? 'Concluído' : 'Em andamento'}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Valor Total:</span>
          <span className="font-semibold">R$ {workOrder.valorTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            {workOrder.status === 'finalizado' ? 'Entregue em:' : 'Prazo:'}
          </span>
          <span className="font-medium">
            {workOrder.status === 'finalizado' 
              ? workOrder.dataEntrega.toLocaleDateString('pt-BR')
              : workOrder.prazoEntrega.toLocaleDateString('pt-BR')
            }
          </span>
        </div>
        {workOrder.status !== 'finalizado' && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Progresso:</span>
              <span className="font-medium">{workOrder.progresso}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${workOrder.progresso}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function ProjectsTab({ projects, client }) {
  const [selectedService, setSelectedService] = useState(null);
  const [activeTab, setActiveTab] = useState("recorrentes");

  if (selectedService) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedService(null)}>
          ← Voltar para Serviços
        </Button>
        <RecurringServiceView serviceId={selectedService} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Serviços & Projetos</h2>
          <p className="text-slate-600 mt-1">Serviços recorrentes e trabalhos pontuais do cliente</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2"/>
          Novo Serviço
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recorrentes">Serviços Recorrentes</TabsTrigger>
          <TabsTrigger value="pontuais">Work Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="recorrentes" className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {mockRecurringServices.map((service) => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                onClick={() => setSelectedService(service.id)}
              />
            ))}
          </div>
          
          {mockRecurringServices.length === 0 && (
            <Card className="text-center p-12">
              <RotateCcw className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold">Nenhum serviço recorrente</h3>
              <p className="text-slate-500 mt-2">Configure serviços mensais como Social Media, SEO, Tráfego Pago.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pontuais" className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {mockWorkOrders.map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
          
          {mockWorkOrders.length === 0 && (
            <Card className="text-center p-12">
              <Briefcase className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold">Nenhum trabalho pontual</h3>
              <p className="text-slate-500 mt-2">Work Orders são projetos únicos como identidade visual, sites, campanhas especiais.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}