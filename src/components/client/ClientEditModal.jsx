import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { toast } from 'sonner';
import ClientBillingSection from '@/components/clients/ClientBillingSection';
import {
  buildClientPayerAliases,
  isClientBillingEnabled,
} from '@/lib/financeDomain';
import { serializePayerAliases } from '@/lib/studentPayerAliases';
import { useStudentStore } from '@/store/useStudentStore';
import { loadMergedFinanceConfigForAcademy } from '@/lib/prefetchFinanceConfig';

const EMPTY_FORM = {
  name: '',
  legal_name: '',
  cnpj: '',
  email: '',
  phone: '',
  sector: '',
  company_size: 'pequena',
  status: 'ativo',
  timezone: 'America/Sao_Paulo',
  billing_enabled: false,
  plan: '',
  plan_price: '',
  due_day: 10,
  discount_amount: '',
  billing_contact_name: '',
  preferred_payment_method: '',
  preferred_payment_account: '',
};

function clientToForm(client) {
  if (!client) return { ...EMPTY_FORM };
  return {
    name: client.name || '',
    legal_name: client.legal_name || '',
    cnpj: client.cnpj || '',
    email: client.email || '',
    phone: client.phone || '',
    sector: client.sector || '',
    company_size: client.company_size || 'pequena',
    status: client.status || 'ativo',
    timezone: client.timezone || 'America/Sao_Paulo',
    billing_enabled: isClientBillingEnabled(client),
    plan: client.plan || client.billing_plan || client.service_plan || '',
    plan_price:
      client.plan_price != null && client.plan_price !== ''
        ? Number(client.plan_price)
        : client.retainer_value != null
          ? Number(client.retainer_value)
          : '',
    due_day: Number(client.due_day ?? client.billing_due_day ?? 10) || 10,
    discount_amount:
      client.discount_amount != null && client.discount_amount !== ''
        ? Number(client.discount_amount)
        : '',
    billing_contact_name: client.billing_contact_name || '',
    preferred_payment_method: client.preferred_payment_method || '',
    preferred_payment_account: client.preferred_payment_account || '',
  };
}

function buildSavePayload(formData, agencyId) {
  const billing_enabled = Boolean(formData.billing_enabled);
  const payload = {
    name: formData.name.trim(),
    legal_name: formData.legal_name.trim(),
    cnpj: formData.cnpj.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    sector: formData.sector.trim(),
    company_size: formData.company_size,
    status: formData.status,
    timezone: formData.timezone,
    agencyId,
    billing_enabled,
  };

  if (billing_enabled) {
    const plan_price = Number(formData.plan_price);
    const discount_amount = Number(formData.discount_amount);
    const due_day = Number(formData.due_day);
    payload.plan = String(formData.plan || '').trim();
    payload.plan_price =
      Number.isFinite(plan_price) && plan_price >= 0 ? Math.round(plan_price * 100) / 100 : 0;
    payload.due_day =
      Number.isFinite(due_day) && due_day >= 1 && due_day <= 31 ? Math.trunc(due_day) : 10;
    payload.discount_amount =
      Number.isFinite(discount_amount) && discount_amount >= 0
        ? Math.round(discount_amount * 100) / 100
        : 0;
    payload.billing_contact_name = String(formData.billing_contact_name || '').trim();
    payload.preferred_payment_method = String(formData.preferred_payment_method || '').trim();
    payload.preferred_payment_account = String(formData.preferred_payment_account || '')
      .trim()
      .slice(0, 128);
    payload.payer_aliases_json = serializePayerAliases(buildClientPayerAliases(payload));
  } else {
    payload.plan = String(formData.plan || '').trim();
    payload.plan_price =
      formData.plan_price === '' || formData.plan_price == null
        ? undefined
        : Number(formData.plan_price) || 0;
    payload.due_day = Number(formData.due_day) || 10;
    payload.discount_amount =
      formData.discount_amount === '' || formData.discount_amount == null
        ? 0
        : Number(formData.discount_amount) || 0;
    payload.billing_contact_name = String(formData.billing_contact_name || '').trim();
    payload.preferred_payment_method = String(formData.preferred_payment_method || '').trim();
    payload.preferred_payment_account = String(formData.preferred_payment_account || '').trim();
  }

  // Remove undefined so merge does not wipe accidentally
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  return payload;
}

export default function ClientEditModal({ isOpen, onClose, onSuccess, client = null }) {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (!isOpen) return;
    setFormData(clientToForm(client));
    setError('');
    if (agencyId) {
      void loadMergedFinanceConfigForAcademy(agencyId);
    }
  }, [isOpen, client, agencyId]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um email válido');
      return false;
    }

    if (formData.billing_enabled) {
      if (!String(formData.plan || '').trim()) {
        setError('Selecione o pacote de serviço para ativar a cobrança');
        return false;
      }
      const due = Number(formData.due_day);
      if (!Number.isFinite(due) || due < 1 || due > 31) {
        setError('Dia de vencimento deve ser entre 1 e 31');
        return false;
      }
      const price = Number(formData.plan_price);
      const discount = Number(formData.discount_amount) || 0;
      if (Number.isFinite(price) && price > 0 && discount >= price) {
        setError('O desconto não pode ser maior ou igual ao valor do pacote');
        return false;
      }
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
      const clientData = buildSavePayload(formData, agencyId);

      if (client) {
        await Client.update(client.id, clientData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await Client.create(clientData);
        toast.success('Cliente criado com sucesso!');
      }

      try {
        await useStudentStore.getState().fetchStudents({ reset: true });
      } catch {
        // roster refresh is best-effort
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);

      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setError('Já existe um cliente com este CNPJ ou email');
      } else if (err.message?.includes('validation')) {
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <ClientBillingSection
            formData={formData}
            onChange={handleInputChange}
            agencyId={agencyId}
            disabled={loading}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.name.trim() ||
                !formData.legal_name.trim() ||
                !formData.email.trim()
              }
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {client ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
