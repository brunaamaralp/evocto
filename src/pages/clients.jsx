import { useState, useEffect, useCallback } from 'react';
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
import { getCardPastel } from '@/lib/modulePastels';

export default function ClientsPage() {
  const { agencyId, loading: sessionLoading } = useSession();
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
      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
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
        return <Badge className="bg-[#E6F7F0] text-[#085041] hover:bg-[#E6F7F0] border-0">Ativo</Badge>;
      case 'inativo':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'prospecto':
        return <Badge className="bg-[#EAF2FB] text-[#2E5A7A] hover:bg-[#EAF2FB] border-0">Prospecto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C47D8] mx-auto mb-4"></div>
          <p className="text-[#7A7595]">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Clientes</h1>
          <p className="text-[#7A7595] mt-1">
            Gerencie sua carteira de clientes e prospectos
          </p>
        </div>
        <Button onClick={handleCreateClient}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7595] w-4 h-4" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full bg-[#F5F2FC] border-transparent"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-full">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredClients.map((client, index) => {
          const pastel = getCardPastel(index);
          return (
            <Card
              key={client.id}
              className={`hover:shadow-[var(--shadow-elevated)] transition-shadow border-transparent ${pastel.bg}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#7A7595] shrink-0" />
                      <span className="truncate">{client.name}</span>
                    </CardTitle>
                    {client.legal_name && client.legal_name !== client.name && (
                      <p className="text-sm text-[#7A7595] mt-1 truncate">{client.legal_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getStatusBadge(client.status)}
                      {client.company_size && (
                        <Badge variant="outline" className="text-xs bg-white/60">
                          {client.company_size}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to={createPageUrl(`client-detail?clientId=${client.id}`)}>
                      <Button variant="outline" size="sm" className="gap-1 bg-white/80 border-white/60">
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                    </Link>
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
                    <div className="flex items-center gap-2 text-sm text-[#4A4068]">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-[#4A4068]">
                      <Phone className="w-3 h-3" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.sector && (
                    <div className="text-sm text-[#4A4068]">
                      <strong>Setor:</strong> {client.sector}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 rounded-2xl bg-[#F5F2FC]">
          <Users className="w-12 h-12 text-[#AFA9EC] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#18162A] mb-2">
            Nenhum cliente encontrado
          </h3>
          <p className="text-[#7A7595] mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione seu primeiro cliente para começar'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button onClick={handleCreateClient}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Cliente
            </Button>
          )}
        </div>
      )}

      <ClientEditModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleClientCreated}
        client={null}
      />

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
  );
}
