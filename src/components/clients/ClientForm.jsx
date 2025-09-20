import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';

const ClientForm = ({ client, onSave, onCancel, loading: externalLoading = false }) => {
  const { user, agencyId, isAuthenticated } = useSession();
  const [formData, setFormData] = useState({
    name: client?.name || '',
    legal_name: client?.legal_name || '',
    cnpj: client?.cnpj || '',
    email: client?.email || '',
    phone: client?.phone || '',
    sector: client?.sector || '',
    company_size: client?.company_size || 'pequena',
    revenue_range: client?.revenue_range || 'ate_1m',
    status: client?.status || 'ativo',
    timezone: client?.timezone || 'America/Sao_Paulo'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verificações de segurança
  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center text-red-600">
        Você precisa estar logado para criar clientes.
      </div>
    );
  }

  if (!agencyId) {
    return (
      <div className="p-4 text-center text-red-600">
        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
        ID da agência não encontrado. Verifique se você está logado corretamente.
        <div className="text-sm text-gray-500 mt-2">
          AgencyId: {agencyId || 'undefined'}<br/>
          User: {user?.email || 'undefined'}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.legal_name || !formData.email) {
      setError('Nome, Razão Social e E-mail são obrigatórios');
      return;
    }

    if (!agencyId) {
      setError('ID da agência não encontrado. Tente recarregar a página.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Criando cliente com dados:', { ...formData, agencyId });
      
      const clientData = {
        ...formData,
        agencyId // GARANTIR que agencyId está sendo enviado
      };

      if (client?.id) {
        // Atualizar cliente existente
        const updatedClient = await Client.update(client.id, clientData);
        onSave && onSave(updatedClient);
      } else {
        // Criar novo cliente
        const newClient = await Client.create(clientData);
        onSave && onSave(newClient);
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setError(`Erro ao salvar cliente: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormLoading = loading || externalLoading;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {client?.id ? 'Editar Cliente' : 'Novo Cliente'}
        </CardTitle>
        {agencyId && (
          <div className="text-xs text-gray-500">
            Organização: {agencyId}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Fantasia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Tech Solutions"
                required
              />
            </div>

            <div>
              <Label htmlFor="legal_name">Razão Social *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => handleChange('legal_name', e.target.value)}
                placeholder="Ex: Tech Solutions Ltda"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contato@empresa.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="sector">Setor</Label>
              <Input
                id="sector"
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                placeholder="Ex: Tecnologia, Varejo, Indústria"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="company_size">Porte da Empresa</Label>
              <Select value={formData.company_size} onValueChange={(value) => handleChange('company_size', value)}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="revenue_range">Faturamento Anual</Label>
              <Select value={formData.revenue_range} onValueChange={(value) => handleChange('revenue_range', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ate_1m">Até R$ 1M</SelectItem>
                  <SelectItem value="1m_5m">R$ 1M - 5M</SelectItem>
                  <SelectItem value="5m_20m">R$ 5M - 20M</SelectItem>
                  <SelectItem value="20m_100m">R$ 20M - 100M</SelectItem>
                  <SelectItem value="acima_100m">Acima R$ 100M</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isFormLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isFormLoading}
            >
              {isFormLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {client?.id ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ClientForm;