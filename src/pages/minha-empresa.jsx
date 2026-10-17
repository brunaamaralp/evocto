/**
 * Hub canônico "Minha empresa" (SPEC_CONTROLE_AGENCIA P0.2).
 * Abas: Geral · Equipe · Marca
 * Consolida my-agency / agency-management / team-management.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Agency } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Clock,
  Loader2,
  Palette,
  Plus,
  Save,
  Shield,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { sendInvite } from '@/api/functions';
import TeamMemberManagement from '@/components/team/TeamMemberManagement';
import InviteMemberModal from '@/components/team/InviteMemberModal';
import { createPageUrl } from '@/utils';

const VALID_TABS = new Set(['geral', 'equipe', 'marca']);

function emptyAgencyForm() {
  return {
    agencyName: '',
    logoUrl: '',
    primaryColor: '#6C47D8',
    secondaryColor: '#F5F2FC',
    contactEmail: '',
    contactPhone: '',
  };
}

export default function MinhaEmpresaPage() {
  const { user, agency, agencyId, isOwner, isAdmin } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = String(searchParams.get('tab') || 'geral').trim();
  const activeTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'geral';

  const canEdit = Boolean(isOwner?.() || isAdmin?.());
  const canInvite = ['owner', 'admin'].includes(user?.role || '');

  const [saving, setSaving] = useState(false);
  const [agencyData, setAgencyData] = useState(emptyAgencyForm);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!agency) return;
    setAgencyData({
      agencyName: agency.agencyName || '',
      logoUrl: agency.logoUrl || '',
      primaryColor: agency.primaryColor || '#6C47D8',
      secondaryColor: agency.secondaryColor || '#F5F2FC',
      contactEmail: agency.contactEmail || '',
      contactPhone: agency.contactPhone || '',
    });
  }, [agency]);

  const handleTabChange = (value) => {
    const nextTab = VALID_TABS.has(value) ? value : 'geral';
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      },
      { replace: true }
    );
  };

  const handleSaveAgency = async () => {
    if (!agencyId) {
      toast.error('ID da agência não encontrado');
      return;
    }
    if (!canEdit) {
      toast.error('Sem permissão para editar');
      return;
    }

    try {
      setSaving(true);
      await Agency.update(agencyId, {
        agencyName: agencyData.agencyName,
        logoUrl: agencyData.logoUrl,
        primaryColor: agencyData.primaryColor,
        secondaryColor: agencyData.secondaryColor,
        contactEmail: agencyData.contactEmail,
        contactPhone: agencyData.contactPhone,
      });
      toast.success('Dados da empresa salvos');
    } catch (error) {
      console.error('[minha-empresa] save failed:', error);
      toast.error('Erro ao salvar dados da empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = useCallback(
    async (inviteData) => {
      try {
        const { data } = await sendInvite(inviteData);
        if (data?.success) {
          if (data.temporaryPassword) {
            toast.success(data.message || 'Membro criado com senha para compartilhar.');
            setRefreshKey((k) => k + 1);
            return data;
          }
          toast.success(data.message || 'Convite enviado.');
          setShowInviteModal(false);
          setRefreshKey((k) => k + 1);
          return data;
        }
        toast.error(data?.message || 'Erro ao adicionar membro');
        return data;
      } catch (error) {
        toast.error(error?.message || 'Erro ao adicionar membro');
        return { success: false };
      }
    },
    []
  );

  if (!agencyId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[#7A7595]">Organização não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-1 sm:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#18162A] sm:text-[1.5rem]">
            Minha empresa
          </h1>
          <p className="text-sm text-[#7A7595]">
            Identidade, equipe e marca da agência
            {agency?.agencyName ? ` · ${agency.agencyName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="border-[#E8E5F5]">
            <Link to={createPageUrl('hours-hub')}>
              <Clock className="mr-1.5 h-4 w-4" />
              Horas
            </Link>
          </Button>
          {canInvite && activeTab === 'equipe' ? (
            <Button
              size="sm"
              className="bg-[#6C47D8] hover:bg-[#5A3BC0]"
              onClick={() => setShowInviteModal(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar membro
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex h-auto w-max min-w-full gap-1 bg-[#F5F2FC] p-1 sm:grid sm:w-full sm:grid-cols-3">
            <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-white">
              <Building2 className="h-4 w-4 shrink-0" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="equipe" className="gap-2 data-[state=active]:bg-white">
              <Users className="h-4 w-4 shrink-0" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="marca" className="gap-2 data-[state=active]:bg-white">
              <Palette className="h-4 w-4 shrink-0" />
              Marca
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="geral" className="mt-6 space-y-4">
          <div className="rounded-xl border border-[#E8E5F5] bg-white p-5 space-y-4">
            <div>
              <Label htmlFor="agencyName">Nome da agência</Label>
              <Input
                id="agencyName"
                value={agencyData.agencyName}
                onChange={(e) =>
                  setAgencyData((prev) => ({ ...prev, agencyName: e.target.value }))
                }
                placeholder="Nome da sua agência"
                disabled={!canEdit}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contactEmail">E-mail de contato</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={agencyData.contactEmail}
                  onChange={(e) =>
                    setAgencyData((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  placeholder="contato@agencia.com"
                  disabled={!canEdit}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Telefone</Label>
                <Input
                  id="contactPhone"
                  value={agencyData.contactPhone}
                  onChange={(e) =>
                    setAgencyData((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  placeholder="(11) 99999-9999"
                  disabled={!canEdit}
                  className="mt-1.5"
                />
              </div>
            </div>
            {!canEdit ? (
              <p className="flex items-center gap-2 text-xs text-[#7A7595]">
                <Shield className="h-3.5 w-3.5" />
                Somente owner/admin podem editar estes dados.
              </p>
            ) : (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveAgency}
                  disabled={saving}
                  className="bg-[#6C47D8] hover:bg-[#5A3BC0]"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-[#7A7595]">
            Preferências pessoais e integrações ficam em{' '}
            <Link to={createPageUrl('settings')} className="font-medium text-[#6C47D8] hover:underline">
              Configurações
            </Link>
            . Financeiro operacional em{' '}
            <Link to={createPageUrl('financeiro')} className="font-medium text-[#6C47D8] hover:underline">
              Financeiro
            </Link>
            .
          </p>
        </TabsContent>

        <TabsContent value="equipe" className="mt-6 space-y-4">
          <TeamMemberManagement
            key={refreshKey}
            showTitle={false}
            showInviteButton={false}
            onInviteClick={() => setShowInviteModal(true)}
          />
        </TabsContent>

        <TabsContent value="marca" className="mt-6 space-y-4">
          <div className="rounded-xl border border-[#E8E5F5] bg-white p-5 space-y-4">
            <div>
              <Label htmlFor="logoUrl">URL do logo</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="logoUrl"
                  value={agencyData.logoUrl}
                  onChange={(e) =>
                    setAgencyData((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  disabled={!canEdit}
                />
                <Button variant="outline" size="icon" type="button" disabled aria-hidden>
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {agencyData.logoUrl ? (
                <div className="mt-3">
                  <img
                    src={agencyData.logoUrl}
                    alt="Preview do logo"
                    className="h-14 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="primaryColor">Cor principal</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={agencyData.primaryColor}
                    onChange={(e) =>
                      setAgencyData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="h-10 w-14"
                    disabled={!canEdit}
                  />
                  <Input
                    value={agencyData.primaryColor}
                    onChange={(e) =>
                      setAgencyData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="font-mono"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondaryColor">Cor secundária</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={agencyData.secondaryColor}
                    onChange={(e) =>
                      setAgencyData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                    }
                    className="h-10 w-14"
                    disabled={!canEdit}
                  />
                  <Input
                    value={agencyData.secondaryColor}
                    onChange={(e) =>
                      setAgencyData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                    }
                    className="font-mono"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className="flex h-20 items-center justify-center rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: agencyData.primaryColor }}
              >
                Principal
              </div>
              <div
                className="flex h-20 items-center justify-center rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: agencyData.secondaryColor,
                  color: agencyData.primaryColor,
                }}
              >
                Secundária
              </div>
            </div>

            {canEdit ? (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveAgency}
                  disabled={saving}
                  className="bg-[#6C47D8] hover:bg-[#5A3BC0]"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar marca
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-xs text-[#7A7595]">
                <Shield className="h-3.5 w-3.5" />
                Somente owner/admin podem editar a marca.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
