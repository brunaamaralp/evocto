import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import BriefingTokenManager from '@/components/briefing/BriefingTokenManager';

export default function BriefingTokensPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId');
  const serviceId = urlParams.get('serviceId');

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      setSelectedClient(client);
      
      if (client) {
        loadServicesForClient(clientId);
      }
    }
  }, [clientId, clients]);

  useEffect(() => {
    if (serviceId && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      setSelectedService(service);
    }
  }, [serviceId, services]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const clientsData = await Client.filter({ status: 'ativo' }, '-updated_date', 100);
      setClients(clientsData);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError('Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadServicesForClient = async (clientId) => {
    try {
      const servicesData = await Service.filter({ 
        clientId, 
        is_template: false, 
        is_active: true 
      });
      setServices(servicesData);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
      setServices([]);
    }
  };

  const handleClientChange = (newClientId) => {
    const client = clients.find(c => c.id === newClientId);
    setSelectedClient(client);
    setSelectedService(null);
    setServices([]);
    
    if (client) {
      loadServicesForClient(newClientId);
    }
  };

  const handleServiceChange = (newServiceId) => {
    const service = services.find(s => s.id === newServiceId);
    setSelectedService(service);
  };

  const handleTokenGenerated = (tokenData) => {
    console.log('Token gerado:', tokenData);
  };

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-48 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="sm" asChild>
          <Link to={createPageUrl('clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tokens de Briefing Público
          </h1>
          <p className="text-gray-600 mt-1">
            Gere links seguros para que clientes preencham briefings
          </p>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Seleção de Cliente e Serviço */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedClient?.id || ''} 
              onValueChange={handleClientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Serviço (Opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedService?.id || ''} 
              onValueChange={handleServiceChange}
              disabled={!selectedClient}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  selectedClient 
                    ? "Selecione um serviço ou deixe em branco..." 
                    : "Primeiro selecione um cliente"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum serviço específico</SelectItem>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Informações */}
      {selectedClient && (
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Cliente selecionado:</strong> {selectedClient.name}
            {selectedService && (
              <>
                <br />
                <strong>Serviço:</strong> {selectedService.name}
              </>
            )}
            <br />
            O token será gerado especificamente para este cliente{selectedService ? ' e serviço' : ''}.
          </AlertDescription>
        </Alert>
      )}

      {/* Gerenciador de Tokens */}
      {selectedClient ? (
        <BriefingTokenManager
          clientId={selectedClient.id}
          serviceId={selectedService?.id}
          onTokenGenerated={handleTokenGenerated}
        />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <InfoIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Selecione um Cliente</h3>
              <p>Escolha um cliente acima para gerar tokens de briefing público.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}