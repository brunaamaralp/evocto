import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building, Mail, Phone, MapPin, Calendar,
  Users, Briefcase, TrendingUp, Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDetailPanel({ client, onEdit, className = '' }) {
  if (!client) {
    return (
      <div className={`p-6 ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum cliente selecionado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const variants = {
      ativo: 'bg-green-100 text-green-800',
      inativo: 'bg-red-100 text-red-800',
      prospecto: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status || 'N/A'}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {client.name || 'Nome não informado'}
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  {client.legal_name || 'Razão social não informada'}
                </p>
                <div className="mt-2">
                  {getStatusBadge(client.status)}
                </div>
              </div>
            </div>
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(client)}>
                <Settings className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Informações de Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Informações de Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="flex items-center mt-1">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{client.email || 'N/A'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Telefone</label>
              <div className="flex items-center mt-1">
                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{client.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">CNPJ</label>
              <div className="flex items-center mt-1">
                <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{client.cnpj || 'N/A'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Setor</label>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{client.sector || 'N/A'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Informações da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Porte da Empresa</label>
            <div className="mt-1">
              <span className="text-gray-900 capitalize">
                {client.company_size || 'N/A'}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Faixa de Receita</label>
            <div className="mt-1">
              <span className="text-gray-900">
                {client.revenue_range || 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Data de Criação</label>
            <div className="mt-1">
              <span className="text-gray-900">
                {formatDate(client.created_date)}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Última Atualização</label>
            <div className="mt-1">
              <span className="text-gray-900">
                {formatDate(client.updated_date)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      {client.timezone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Configurações Regionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-gray-500">Fuso Horário</label>
              <div className="mt-1">
                <span className="text-gray-900">{client.timezone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}