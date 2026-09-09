
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarRange,
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Link as LinkIcon,
  Building2,
  Loader2,
} from 'lucide-react';
import { Brief } from '@/api/entities';
import { Client } from '@/api/entities';
import { PublicBriefingToken } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ConfigurarEmpresaModal from '@/components/empresa/ConfigurarEmpresaModal';
import { getEmpresaByClientId } from '@/lib/empresaConfig';
import { isCampanhaAnual } from '@/lib/campanhaAnual';
import { generatePublicBriefingToken, syncClientFromPublicBriefing } from '@/api/functions';
import { toast } from 'sonner';

/**
 * Página principal de briefings do cliente
 * Lista briefings existentes e permite criar novos
 */
export default function ClientBriefingPage() {
  const { user, agencyId } = useSession();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const briefingId = urlParams.get('briefingId');
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [briefings, setBriefings] = useState([]);
  const [briefingTokens, setBriefingTokens] = useState([]);
  const [error, setError] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const loadClientBriefings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientId) {
        throw new Error('ID do cliente não fornecido');
      }

      // Carregar cliente
      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado ou sem permissão');
      }
      setClient(clientData);

      const empresaData = await getEmpresaByClientId(clientId, agencyId).catch(() => null);
      setEmpresa(empresaData);

      // Briefings: clientId e/ou projectId (= clientId no legado)
      const [byClient, byProject] = await Promise.all([
        Brief.filter({ agencyId, clientId }).catch(() => []),
        Brief.filter({ agencyId, projectId: clientId }).catch(() => []),
      ]);
      const map = new Map();
      for (const b of [...(byClient || []), ...(byProject || [])]) {
        if (b?.id) map.set(b.id, b);
      }
      setBriefings(Array.from(map.values()));

      // Buscar tokens de briefing público
      const tokens = await PublicBriefingToken.filter({
        agencyId,
        clientId
      }).catch(() => []);
      setBriefingTokens(tokens || []);

      // Sincroniza cadastro a partir de envios públicos pendentes
      for (const t of tokens || []) {
        if ((t.pending_client_sync || t.pending_brief_sync) && t.briefId) {
          await syncClientFromPublicBriefing(t.briefId, t).catch(() => null);
        }
      }

    } catch (err) {
      console.error('Erro ao carregar briefings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]); // Dependencies for useCallback

  useEffect(() => {
    loadClientBriefings();
  }, [loadClientBriefings]); // useEffect now depends on the memoized function

  useEffect(() => {
    if (loading || !briefingId) return;
    const el = document.getElementById(`briefing-${briefingId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, briefingId, briefings]);

  const getStatusBadge = (brief) => {
    const statusMap = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Rascunho' },
      IN_REVIEW: { color: 'bg-yellow-100 text-yellow-800', icon: Eye, label: 'Em Revisão' },
      READY: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Finalizado' }
    };
    
    const config = statusMap[brief.status] || statusMap.DRAFT;
    const StatusIcon = config.icon;
    
    return (
      <Badge className={config.color}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTokenStatusBadge = (token) => {
    if (token.status === 'expired' || new Date(token.expiresAt) < new Date()) {
      return <Badge className="bg-red-100 text-red-800">Expirado</Badge>;
    }
    if (token.status === 'revoked') {
      return <Badge className="bg-gray-100 text-gray-800">Revogado</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
  };

  const handleCreateBriefing = () => {
    navigate(`${createPageUrl('briefing-campanha')}?clientId=${clientId}`);
  };

  const handleCreatePlanoAnual = () => {
    navigate(`${createPageUrl('briefing-campanha-anual')}?clientId=${clientId}`);
  };

  const handleCreateBriefingLegacy = () => {
    navigate(`${createPageUrl('briefing-editor')}?clientId=${clientId}`);
  };

  const handleEditBriefing = (brief) => {
    if (isCampanhaAnual(brief)) {
      navigate(
        `${createPageUrl('briefing-campanha-anual')}?clientId=${clientId}&briefingId=${brief.id}`
      );
      return;
    }
    navigate(`${createPageUrl('briefing-editor')}?briefingId=${brief.id}`);
  };

  const handleGenerateToken = async () => {
    if (!empresa) {
      toast.error('Configure a empresa antes de gerar o link');
      setEmpresaModalOpen(true);
      return;
    }
    try {
      setGeneratingLink(true);
      const result = await generatePublicBriefingToken({
        clientId,
        language: 'pt',
        expiresInHours: 168,
        reuseIfActiveExists: true,
        agencyId,
      });
      const url = result.publicUrl || result.data?.publicUrl;
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      toast.success(
        result.reused
          ? 'Link ativo copiado (já existia)'
          : 'Link gerado e copiado para a área de transferência'
      );
      await loadClientBriefings();
    } catch (err) {
      console.error('Erro ao gerar token:', err);
      toast.error(err.message || 'Erro ao gerar link público');
      setError('Erro ao gerar link público');
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando briefings..." />;
  }

  if (error) {
    return (
      <div>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18162A]">
              Briefings - {client?.name}
            </h1>
            <p className="text-[#7A7595] mt-1">
              Gerencie briefings e formulários de coleta de informações
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEmpresaModalOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              {empresa ? 'Empresa' : 'Configurar Empresa'}
            </Button>
            <Button onClick={handleGenerateToken} variant="outline" disabled={generatingLink}>
              {generatingLink ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4 mr-2" />
              )}
              Gerar Link Público
            </Button>
            <Button variant="outline" onClick={handleCreateBriefingLegacy}>
              Briefing completo
            </Button>
            <Button variant="outline" onClick={handleCreatePlanoAnual}>
              <CalendarRange className="w-4 h-4 mr-2" />
              Plano anual
            </Button>
            <Button onClick={handleCreateBriefing}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Briefing
            </Button>
          </div>
        </div>

        {/* Briefings Internos */}
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Briefings Internos
              <Badge variant="outline">{briefings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {briefings.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#18162A] mb-2">
                  Nenhum briefing criado
                </h3>
                <p className="text-[#7A7595] mb-4">
                  Crie um briefing para coletar informações do cliente
                </p>
                <Button onClick={handleCreateBriefing}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Briefing
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {briefings.map((brief) => (
                  <div
                    key={brief.id}
                    id={`briefing-${brief.id}`}
                    className={`flex items-center justify-between p-4 border rounded-2xl hover:bg-[#F5F2FC] ${
                      briefingId === brief.id ? 'ring-2 ring-[#6C47D8] border-[#D4CBF5] bg-[#F5F2FC]' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-[#18162A]">
                          {brief.nome_campanha || brief.title || 'Briefing'}
                        </h3>
                        {brief.brief_kind === 'campanha_mensal' && (
                          <Badge variant="secondary">Campanha</Badge>
                        )}
                        {brief.brief_kind === 'campanha_anual' && (
                          <Badge className="bg-violet-100 text-violet-800">
                            Plano anual {brief.ano ? brief.ano : ''}
                          </Badge>
                        )}
                        {brief.status_anual && brief.brief_kind === 'campanha_anual' && (
                          <Badge variant="outline">{brief.status_anual}</Badge>
                        )}
                        {getStatusBadge(brief)}
                        {brief.completion_score !== undefined && (
                          <Badge variant="outline">
                            {brief.completion_score}% completo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#7A7595]">
                        Criado em {new Date(brief.created_date).toLocaleDateString('pt-BR')}
                        {brief.updated_date && brief.updated_date !== brief.created_date && (
                          <span> • Atualizado em {new Date(brief.updated_date).toLocaleDateString('pt-BR')}</span>
                        )}
                      </p>
                      {(brief.objetivo || brief.business_context) && (
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {brief.objetivo || brief.business_context}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBriefing(brief)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {isCampanhaAnual(brief) ? 'Abrir plano' : 'Editar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Links Públicos */}
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Links Públicos
              <Badge variant="outline">{briefingTokens.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {briefingTokens.length === 0 ? (
              <div className="text-center py-8">
                <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#18162A] mb-2">
                  Nenhum link público gerado
                </h3>
                <p className="text-[#7A7595] mb-4">
                  Gere um link público para o cliente preencher o briefing
                </p>
                <Button onClick={handleGenerateToken} variant="outline">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Gerar Primeiro Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {briefingTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-4 border rounded-2xl"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-[#18162A]">
                          Link Público #{token.id.slice(-8)}
                        </h3>
                        {getTokenStatusBadge(token)}
                      </div>
                      <p className="text-sm text-[#7A7595]">
                        Criado em {new Date(token.created_date).toLocaleDateString('pt-BR')} •
                        Expira em {new Date(token.expiresAt).toLocaleDateString('pt-BR')} •
                        {token.accessCount || 0} acessos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {token.status === 'active' && new Date(token.expiresAt) > new Date() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/public-briefing?token=${token.token}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copiado!');
                          }}
                        >
                          <LinkIcon className="w-4 h-4 mr-1" />
                          Copiar Link
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfigurarEmpresaModal
        open={empresaModalOpen}
        onOpenChange={setEmpresaModalOpen}
        clientId={clientId}
        clientName={client?.name}
        empresa={empresa}
        onSaved={(saved) => setEmpresa(saved)}
      />
    </ErrorBoundary>
  );
}
