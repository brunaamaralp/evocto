import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';

/**
 * Página de contexto dedicado para um cliente
 * URL: /client/:clientId/:section?
 */
export default function ClientContextPage() {
  const { clientId, section = 'overview' } = useParams();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados do cliente
  useEffect(() => {
    async function loadClientData() {
      try {
        setLoading(true);
        
        const [clientData, servicesData, tasksData] = await Promise.all([
          Client.get(clientId),
          Service.filter({ clientId, is_template: false }),
          Task.filter({ clientId })
        ]);

        setClient(clientData);
        setServices(servicesData || []);
        setTasks(tasksData || []);
        
      } catch (err) {
        console.error('Erro ao carregar dados do cliente:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  if (loading) return <LoadingState message="Carregando dados do cliente..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!client) return <ErrorState message="Cliente não encontrado" />;

  // Renderizar seção específica
  const renderSection = () => {
    switch (section) {
      case 'overview':
        return <ClientOverview client={client} services={services} tasks={tasks} />;
      case 'briefing':
        return <ClientBriefing client={client} />;
      case 'services':
        return <ClientServices client={client} services={services} />;
      case 'tasks':
        return <ClientTasks client={client} tasks={tasks} />;
      case 'documents':
        return <ClientDocuments client={client} />;
      case 'reports':
        return <ClientReports client={client} />;
      case 'settings':
        return <ClientSettings client={client} />;
      default:
        return <ClientOverview client={client} services={services} tasks={tasks} />;
    }
  };

  return (
    <div className="p-6">
      {renderSection()}
    </div>
  );
}

// Componentes das seções
function ClientOverview({ client, services, tasks }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard - {client.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Serviços Ativos</h3>
          <p className="text-3xl font-bold text-blue-600">{services.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Tarefas Pendentes</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {tasks.filter(t => ['todo', 'in_progress'].includes(t.status)).length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Status</h3>
          <p className="text-lg font-semibold text-green-600 capitalize">{client.status}</p>
        </div>
      </div>

      {/* Conteúdo adicional do dashboard do cliente */}
    </div>
  );
}

function ClientBriefing({ client }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Briefing - {client.name}</h1>
      <p>Componente de briefing do cliente será implementado aqui</p>
    </div>
  );
}

function ClientServices({ client, services }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Serviços - {client.name}</h1>
      <div className="grid gap-4">
        {services.map(service => (
          <div key={service.id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-gray-600">{service.description}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded ${
              service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {service.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientTasks({ client, tasks }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tarefas - {client.name}</h1>
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-gray-600 text-sm">{task.description}</p>
            </div>
            <span className={`px-3 py-1 text-xs rounded-full ${
              task.status === 'completed' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientDocuments({ client }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Documentos - {client.name}</h1>
      <p>Sistema de documentos será implementado aqui</p>
    </div>
  );
}

function ClientReports({ client }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Relatórios - {client.name}</h1>
      <p>Relatórios do cliente serão implementados aqui</p>
    </div>
  );
}

function ClientSettings({ client }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações - {client.name}</h1>
      <p>Configurações específicas do cliente serão implementadas aqui</p>
    </div>
  );
}