import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { toast } from 'sonner';

export default function ClientEditModal({ isOpen, onClose, onSuccess, client = null }) {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    cnpj: '',
    email: '',
    phone: '',
    sector: '',
    company_size: 'pequena',
    status: 'ativo',
    timezone: 'America/Sao_Paulo'
  });

  // Inicializar formulário quando o modal abrir ou cliente mudar
  useEffect(() => {
    if (isOpen) {
      if (client) {
        // Modo edição - preencher com dados do cliente
        setFormData({
          name: client.name || '',
          legal_name: client.legal_name || '',
          cnpj: client.cnpj || '',
          email: client.email || '',
          phone: client.phone || '',
          sector: client.sector || '',
          company_size: client.company_size || 'pequena',
          status: client.status || 'ativo',
          timezone: client.timezone || 'America/Sao_Paulo'
        });
      } else {
        // Modo criação - valores padrão
        setFormData({
          name: '',
          legal_name: '',
          cnpj: '',
          email: '',
          phone: '',
          sector: '',
          company_size: 'pequena',
          status: 'ativo',
          timezone: 'America/Sao_Paulo'
        });
      }
      setError('');
    }
  }, [isOpen, client]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro quando usuário começar a digitar
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome da empresa é obrigatório');
      return false;
    }
    if (!formData.legal_name.trim()) {
      setError('Razão social é obrigatória');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    
    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um email válido');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const clientData = {
        ...formData,
        agencyId
      };

      if (client) {
        // Editar cliente existente
        console.log('✏️ Editando cliente:', client.id, clientData);
        await Client.update(client.id, clientData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente
        console.log('➕ Criando novo cliente:', clientData);
        await Client.create(clientData);
        toast.success('Cliente criado com sucesso!');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error);
      
      // Tratar diferentes tipos de erro
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        setError('Já existe um cliente com este CNPJ ou email');
      } else if (error.message?.includes('validation')) {
        setError('Dados inválidos. Verifique as informações preenchidas');
      } else {
        setError('Erro ao salvar cliente. Tente novamente');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Fantasia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome da empresa"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão Social *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => handleInputChange('legal_name', e.target.value)}
                placeholder="Razão social completa"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contato@empresa.com"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Setor</Label>
              <Input
                id="sector"
                value={formData.sector}
                onChange={(e) => handleInputChange('sector', e.target.value)}
                placeholder="Ex: Tecnologia, Varejo, Indústria"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_size">Porte da Empresa</Label>
              <Select
                value={formData.company_size}
                onValueChange={(value) => handleInputChange('company_size', value)}
                disabled={loading}
              >
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.legal_name.trim() || !formData.email.trim()}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {client ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}