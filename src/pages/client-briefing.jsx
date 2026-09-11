
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Loader2,
  PenLine,
} from 'lucide-react';
import { Brief } from '@/api/entities';
import { Client } from '@/api/entities';
import { PublicBriefingToken } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { isCampanhaAnual } from '@/lib/campanhaAnual';
import { BRIEF_KIND_INICIAL } from '@/lib/briefingInicial';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { generatePublicBriefingToken, syncClientFromPublicBriefing } from '@/api/functions';
import { toast } from 'sonner';

/**
 * Hub do cliente: briefing inicial + plano anual + campanhas.
 * Briefing inicial: link para o cliente ou preenchimento interno pela equipe.
 */
export default function ClientBriefingPage() {
  const { _user, agencyId } = useSession();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const briefingId = urlParams.get('briefingId');

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [briefings, setBriefings] = useState([]);
  const [briefingTokens, setBriefingTokens] = useState([]);
  const [error, setError] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const loadClientBriefings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientId) {
        throw new Error('ID do cliente não fornecido');
      }

      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado ou sem permissão');
      }
      setClient(clientData);

      const [byClient, byProject] = await Promise.all([
        Brief.filter({ agencyId, clientId }).catch(() => []),
        Brief.filter({ agencyId, projectId: clientId }).catch(() => []),
      ]);
      const map = new Map();
      for (const b of [...(byClient || []), ...(byProject || [])]) {
        if (b?.id) map.set(b.id, b);
      }
      setBriefings(Array.from(map.values()));

      const tokens = await PublicBriefingToken.filter({
        agencyId,
        clientId,
      }).catch(() => []);
      setBriefingTokens(tokens || []);

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
  }, [clientId, agencyId]);

  useEffect(() => {
    loadClientBriefings();
  }, [loadClientBriefings]);

  useEffect(() => {
    if (loading || !briefingId) return;
    const el = document.getElementById(`briefing-${briefingId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, briefingId, briefings]);

  const inicialTokens = useMemo(
    () =>
      (briefingTokens || []).filter(
        (t) => (t.metadata?.briefKind || BRIEF_KIND_INICIAL) === BRIEF_KIND_INICIAL
      ),
    [briefingTokens]
  );

  const hasSubmittedInicial = useMemo(
    () =>
      inicialTokens.some(
        (t) =>
          t.last_submission ||
          t.metadata?.submittedAt ||
          t.status === 'used' ||
          t.status === 'completed'
      ) ||
      (briefings || []).some(
        (b) =>
          b.brief_kind === 'campanha_anual' &&
          b.origem_briefing_inicial &&
          ['input_pronto', 'temas_prontos', 'ia_gerou', 'aprovado', 'aprovado_parcial'].includes(
            b.status_anual
          )
      ),
    [inicialTokens, briefings]
  );

  const planosAnuais = useMemo(
    () => (briefings || []).filter((b) => isCampanhaAnual(b) || b.brief_kind === 'campanha_anual'),
    [briefings]
  );

  const campanhas = useMemo(
    () => (briefings || []).filter((b) => b.brief_kind === 'campanha_mensal'),
    [briefings]
  );

  const statusAnualLabel = (status) =>
    ({
      rascunho: 'Rascunho',
      input_pronto: 'Pronto para temas',
      temas_prontos: 'Temas escolhidos',
      gerando: 'Gerando…',
      ia_gerou: 'Campanhas geradas',
      revisao: 'Em revisão',
      aprovado_parcial: 'Parcialmente materializado',
      aprovado: 'Aprovado',
      erro: 'Erro na geração',
    })[status] || status;

  const getStatusBadge = (brief) => {
    const statusMap = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Rascunho' },
      IN_REVIEW: { color: 'bg-yellow-100 text-yellow-800', icon: Eye, label: 'Em Revisão' },
      READY: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Finalizado' },
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
    if (token.last_submission || token.metadata?.submittedAt) {
      return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
    }
    if (token.status === 'expired' || new Date(token.expiresAt) < new Date()) {
      return <Badge className="bg-red-100 text-red-800">Expirado</Badge>;
    }
    if (token.status === 'revoked') {
      return <Badge className="bg-gray-100 text-gray-800">Revogado</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
  };

  const handleCreateCampanha = () => {
    navigate(`${createPageUrl('briefing-campanha')}?clientId=${clientId}`);
  };

  const handleCreatePlanoAnual = () => {
    const existing = planosAnuais[0];
    if (existing?.id) {
      navigate(
        `${createPageUrl('briefing-campanha-anual')}?clientId=${clientId}&briefingId=${existing.id}`
      );
      return;
    }
    navigate(`${createPageUrl('briefing-campanha-anual')}?clientId=${clientId}`);
  };

  const handleFillInicialInterno = () => {
    const existing = planosAnuais.find((b) => b.origem_briefing_inicial) || planosAnuais[0];
    const qs = existing?.id
      ? `clientId=${clientId}&briefingId=${existing.id}`
      : `clientId=${clientId}`;
    navigate(`${createPageUrl('briefing-inicial')}?${qs}`);
  };

  const handleEditBriefing = (brief) => {
    if (isCampanhaAnual(brief) || brief.brief_kind === 'campanha_anual') {
      navigate(
        `${createPageUrl('briefing-campanha-anual')}?clientId=${clientId}&briefingId=${brief.id}`
      );
      return;
    }
    // Campanhas mensais → Workspace (redirect via campaignHref se sem serviceId)
    navigate(
      createPageUrl(
        buildClientCampaignHref({
          clientId,
          briefingId: brief.id,
          serviceId: brief.serviceId || null,
        })
      )
    );
  };

  const handleGenerateInicialLink = async () => {
    try {
      setGeneratingLink(true);
      const result = await generatePublicBriefingToken({
        clientId,
        language: 'pt',
        expiresInHours: 168,
        reuseIfActiveExists: true,
        agencyId,
        briefKind: BRIEF_KIND_INICIAL,
      });
      const url = result.publicUrl || result.data?.publicUrl;
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      toast.success(
        result.reused
          ? 'Link do briefing inicial copiado (já existia)'
          : 'Link do briefing inicial gerado e copiado'
      );
      await loadClientBriefings();
    } catch (err) {
      console.error('Erro ao gerar token:', err);
      toast.error(err.message || 'Erro ao gerar link do briefing inicial');
      setError('Erro ao gerar link do briefing inicial');
    } finally {
      setGeneratingLink(false);
    }
  };

  const renderBriefRow = (brief) => (
    <div
      key={brief.id}
      id={`briefing-${brief.id}`}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-2xl hover:bg-[#F5F2FC] ${
        briefingId === brief.id ? 'ring-2 ring-[#6C47D8] border-[#D4CBF5] bg-[#F5F2FC]' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="font-medium text-[#18162A] truncate">
            {brief.nome_campanha || brief.title || 'Campanha'}
          </h3>
          {brief.brief_kind === 'campanha_mensal' && (
            <Badge variant="secondary">Campanha</Badge>
          )}
          {(brief.brief_kind === 'campanha_anual' || isCampanhaAnual(brief)) && (
            <Badge className="bg-[#F5F2FC] text-[#6C47D8] border border-[#D4CBF5]">
              Plano anual {brief.ano ? brief.ano : ''}
            </Badge>
          )}
          {brief.status_anual && brief.brief_kind === 'campanha_anual' && (
            <Badge variant="outline">{statusAnualLabel(brief.status_anual)}</Badge>
          )}
          {getStatusBadge(brief)}
        </div>
        <p className="text-sm text-[#7A7595]">
          Criado em {new Date(brief.created_date).toLocaleDateString('pt-BR')}
          {brief.updated_date && brief.updated_date !== brief.created_date && (
            <span>
              {' '}
              • Atualizado em {new Date(brief.updated_date).toLocaleDateString('pt-BR')}
            </span>
          )}
        </p>
        {(brief.objetivo || brief.business_context) && (
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {brief.objetivo || brief.business_context}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 self-start sm:self-center"
        onClick={() => handleEditBriefing(brief)}
      >
        <Edit className="w-4 h-4 mr-1" />
        {isCampanhaAnual(brief) || brief.brief_kind === 'campanha_anual'
          ? 'Abrir plano'
          : 'Abrir ficha'}
      </Button>
    </div>
  );

  if (loading) {
    return <LoadingState message="Carregando hub do cliente..." />;
  }

  if (error) {
    return (
      <div>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const journeySteps = [
    {
      id: 'inicial',
      label: 'Briefing inicial',
      done: hasSubmittedInicial || planosAnuais.length > 0,
    },
    {
      id: 'anual',
      label: 'Plano anual',
      done: planosAnuais.some(
        (b) =>
          b.status_anual === 'ia_gerou' ||
          b.status_anual === 'temas_prontos' ||
          b.status_anual === 'aprovado' ||
          b.status_anual === 'aprovado_parcial'
      ),
    },
    {
      id: 'campanhas',
      label: 'Campanhas',
      done: campanhas.length > 0,
    },
  ];

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-4 px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight">
              Campanhas & plano
            </h1>
            <p className="text-xs text-[#7A7595]">
              Briefing inicial, plano anual e campanhas do cliente
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!hasSubmittedInicial && (
              <Button
                size="sm"
                onClick={handleGenerateInicialLink}
                className="bg-[#6C47D8] hover:bg-[#5A3BC0] text-white"
                disabled={generatingLink}
              >
                {generatingLink ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4 mr-1" />
                )}
                Link inicial
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleCreatePlanoAnual}>
              <CalendarRange className="w-4 h-4 mr-1" />
              Plano anual
            </Button>
            <Button size="sm" variant="outline" onClick={handleCreateCampanha}>
              <Plus className="w-4 h-4 mr-1" />
              Nova campanha
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl bg-[#F5F2FC] p-3">
          {journeySteps.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                s.done
                  ? 'bg-white text-[#18162A] border border-[#D4CBF5]'
                  : 'bg-transparent text-[#7A7595]'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  s.done ? 'bg-[#6C47D8] text-white' : 'bg-white text-[#7A7595]'
                }`}
              >
                {s.done ? '✓' : i + 1}
              </span>
              {s.label}
            </div>
          ))}
        </div>

        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <LinkIcon className="w-5 h-5 text-[#6C47D8]" />
              Briefing inicial
              <Badge variant="outline">{inicialTokens.length}</Badge>
            </CardTitle>
            <p className="text-sm text-[#7A7595] font-normal">
              Pode ser preenchido pela empresa (link) ou pela equipe.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerateInicialLink}
                className="bg-[#6C47D8] hover:bg-[#5A3BC0] text-white"
                disabled={generatingLink}
              >
                {generatingLink ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4 mr-2" />
                )}
                Gerar link
              </Button>
              <Button variant="outline" onClick={handleFillInicialInterno}>
                <PenLine className="w-4 h-4 mr-2" />
                Preencher internamente
              </Button>
            </div>

            {inicialTokens.length === 0 ? (
              <div className="text-center py-6 rounded-2xl border border-dashed border-[#E8E4F4]">
                <LinkIcon className="w-8 h-8 text-[#D4CBF5] mx-auto mb-2" />
                <p className="text-sm text-[#7A7595] max-w-md mx-auto">
                  Ainda sem link. Envie um para o cliente ou preencha o DNA da empresa e o
                  calendário do ano por aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inicialTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-2xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-[#18162A]">
                          Briefing inicial
                        </h3>
                        {getTokenStatusBadge(token)}
                      </div>
                      <p className="text-sm text-[#7A7595]">
                        Criado em {new Date(token.created_date).toLocaleDateString('pt-BR')}
                        {' · '}
                        Expira em {new Date(token.expiresAt).toLocaleDateString('pt-BR')}
                        {' · '}
                        {token.accessCount || 0} acessos
                      </p>
                    </div>
                    {token.status === 'active' &&
                      new Date(token.expiresAt) > new Date() &&
                      !token.last_submission &&
                      !token.metadata?.submittedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            const url = `${window.location.origin}/public-briefing?token=${token.token}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Link copiado');
                          }}
                        >
                          <LinkIcon className="w-4 h-4 mr-1" />
                          Copiar link
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarRange className="w-5 h-5 text-[#6C47D8]" />
              Plano anual
              <Badge variant="outline">{planosAnuais.length}</Badge>
            </CardTitle>
            <p className="text-sm text-[#7A7595] font-normal">
              Temas com IA e campanhas do ano — uso interno da equipe.
            </p>
          </CardHeader>
          <CardContent>
            {planosAnuais.length === 0 ? (
              <div className="text-center py-8">
                <CalendarRange className="w-10 h-10 text-[#D4CBF5] mx-auto mb-3" />
                <h3 className="text-lg font-medium text-[#18162A] mb-2">
                  Nenhum plano anual
                </h3>
                <p className="text-[#7A7595] mb-4 max-w-md mx-auto">
                  Depois do briefing inicial, monte o plano aqui e peça sugestão de temas à IA.
                </p>
                <Button onClick={handleCreatePlanoAnual}>
                  <CalendarRange className="w-4 h-4 mr-2" />
                  Criar plano anual
                </Button>
              </div>
            ) : (
              <div className="space-y-3">{planosAnuais.map(renderBriefRow)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-5 h-5 text-[#6C47D8]" />
              Campanhas
              <Badge variant="outline">{campanhas.length}</Badge>
            </CardTitle>
            <p className="text-sm text-[#7A7595] font-normal">
              Campanhas do mês — operação interna, sem link público.
            </p>
          </CardHeader>
          <CardContent>
            {campanhas.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-[#D4CBF5] mx-auto mb-3" />
                <h3 className="text-lg font-medium text-[#18162A] mb-2">
                  Nenhuma campanha
                </h3>
                <p className="text-[#7A7595] mb-4 max-w-md mx-auto">
                  No plano anual, materialize o mês ou crie uma campanha nova.
                </p>
                <Button variant="outline" onClick={handleCreateCampanha}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova campanha
                </Button>
              </div>
            ) : (
              <div className="space-y-3">{campanhas.map(renderBriefRow)}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
