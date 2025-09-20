
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, User, Building, Mail, Phone, MapPin,
  RefreshCw, Save, AlertCircle, CheckCircle, Trash2,
  ArrowLeft, CheckSquare, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';

export default function ClientSettingsPage() {
  const { user, isAuthenticated, agencyId } = useSession();
  const [clientId, setClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});

  // Extrair clientId da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('clientId');
    
    if (id) {
      setClientId(id);
    } else {
      setError('ID do cliente não encontrado na URL.');
      setLoading(false);
    }
  }, []);

  // Carregar dados do cliente
  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId || !isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        const [clientData, servicesData] = await Promise.all([
          Client.get(clientId),
          Service.filter({ clientId, agencyId })
        ]);

        if (!clientData) {
          throw new Error('Cliente não encontrado');
        }

        if (clientData.agencyId !== agencyId) {
          throw new Error('Este cliente não pertence à sua agência');
        }

        setClient(clientData);
        setServices(servicesData);
        setFormData({
          name: clientData.name || '',
          legal_name: clientData.legal_name || '',
          cnpj: clientData.cnpj || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
          sector: clientData.sector || '',
          company_size: clientData.company_size || '',
          revenue_range: clientData.revenue_range || '',
          status: clientData.status || 'ativo'
        });

      } catch (err) {
        console.error('Erro ao carregar dados do cliente:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadClientData();
  }, [clientId, isAuthenticated, agencyId]);

  // Salvar alterações
  const handleSave = async () => {
    try {
      setSaving(true);
      
      await Client.update(clientId, formData);
      
      toast.success('Dados do cliente atualizados com sucesso');
      
      // Recarregar dados
      const updatedClient = await Client.get(clientId);
      setClient(updatedClient);
      
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar alterações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle form changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <LoadingState message="Carregando configurações do cliente..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.href = '/clients'}>
              Voltar para Clientes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
              <p className="text-gray-600">Gerencie os dados e configurações de {client?.name}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = `/client-overview?clientId=${clientId}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Fantasia *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social *
                    </label>
                    <Input
                      value={formData.legal_name}
                      onChange={(e) => handleInputChange('legal_name', e.target.value)}
                      placeholder="Razão social completa"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ
                    </label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Setor
                    </label>
                    <Input
                      value={formData.sector}
                      onChange={(e) => handleInputChange('sector', e.target.value)}
                      placeholder="Ex: Tecnologia, Varejo, Indústria"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Porte da Empresa
                    </label>
                    <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o porte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup</SelectItem>
                        <SelectItem value="pequena">Pequena</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="grande">Grande</SelectItem>
                        <SelectItem value="multinacional">Multinacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Faixa de Faturamento
                    </label>
                    <Select value={formData.revenue_range} onValueChange={(value) => handleInputChange('revenue_range', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a faixa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ate_1m">Até R$ 1M</SelectItem>
                        <SelectItem value="1m_5m">R$ 1M - 5M</SelectItem>
                        <SelectItem value="5m_20m">R$ 5M - 20M</SelectItem>
                        <SelectItem value="20m_100m">R$ 20M - 100M</SelectItem>
                        <SelectItem value="acima_100m">Acima de R$ 100M</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status do cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="prospecto">Prospecto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Serviços Contratados</CardTitle>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900">{service.name}</h3>
                          <p className="text-sm text-gray-600">{service.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline">
                              {service.category}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Configurar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum serviço contratado ainda</p>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Serviço
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Zona de Perigo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-900 mb-2">Desativar Cliente</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Desativar o cliente irá pausar todos os serviços e impedir novos acessos. 
                    Esta ação pode ser revertida posteriormente.
                  </p>
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Desativar Cliente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
