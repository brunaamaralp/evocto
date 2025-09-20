
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Filter, 
  Users,
  Eye,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import ClientEditModal from '@/components/client/ClientEditModal';
import ClientActionButtons from '@/components/clients/ClientActionButtons';

export default function ClientsPage() {
  const { user, agencyId, loading: sessionLoading } = useSession();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const clientsData = await Client.filter({ agencyId });
      
      console.log('👥 Clientes carregados:', clientsData.length);
      setClients(clientsData);
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (agencyId) {
      loadClients();
    }
  }, [agencyId, loadClients]);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowCreateModal(true);
  };

  const handleClientCreated = () => {
    setShowCreateModal(false);
    loadClients();
    toast.success('Cliente criado com sucesso!');
  };

  const handleClientUpdated = () => {
    setShowEditModal(false);
    setEditingClient(null);
    loadClients();
    toast.success('Cliente atualizado com sucesso!');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'inativo':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'prospecto':
        return <Badge variant="outline">Prospecto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 ml-6"> {/* Espaçamento aumentado da sidebar */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-1">
              Gerencie sua carteira de clientes e prospectos
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateClient}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="prospecto">Prospecto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      {client.name}
                    </CardTitle>
                    {client.legal_name && client.legal_name !== client.name && (
                      <p className="text-sm text-gray-500 mt-1">{client.legal_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(client.status)}
                      {client.company_size && (
                        <Badge variant="outline" className="text-xs">
                          {client.company_size}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Botão de Ver Detalhes - CORRIGIDO */}
                    <Link to={createPageUrl(`client-detail?clientId=${client.id}`)}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                    </Link>
                    {/* Menu de Ações */}
                    <ClientActionButtons 
                      client={client}
                      onEdit={() => handleEditClient(client)}
                      onUpdate={loadClients}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3 h-3" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.sector && (
                    <div className="text-sm text-gray-600">
                      <strong>Setor:</strong> {client.sector}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum cliente encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Adicione seu primeiro cliente para começar'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={handleCreateClient}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Cliente
              </Button>
            )}
          </div>
        )}

        {/* Modal de Criação de Cliente */}
        <ClientEditModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleClientCreated}
          client={null} // null para criação
        />

        {/* Modal de Edição de Cliente */}
        <ClientEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }}
          onSuccess={handleClientUpdated}
          client={editingClient}
        />
      </div>
    </div>
  );
}
