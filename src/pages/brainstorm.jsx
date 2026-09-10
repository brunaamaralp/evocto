import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ConversationList from '@/components/campaigns/agent/ConversationList';
import ChatInterface from '@/components/campaigns/agent/ChatInterface';
import ContextSidebar from '@/components/campaigns/agent/ContextSidebar';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { getEmpresaByClientId } from '@/lib/empresaConfig';
import { createPageUrl } from '@/utils';

const API_BASE = '/api/campaigns-agent';

async function agentFetch(route, { method = 'GET', body, empresa } = {}) {
  const params = new URLSearchParams({ route });
  if (empresa) params.set('empresa', empresa);
  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || data?.error || `http_${response.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Brainstorm de campanhas — escopo do cliente (hub contextual).
 * Rota: /client-brainstorm?clientId=...
 */
export default function BrainstormPage() {
  const navigate = useNavigate();
  const { agencyId } = useSession();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId') || '';

  const [client, setClient] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [contextoEnriquecido, setContextoEnriquecido] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mobilePanel, setMobilePanel] = useState('center');
  const [savingBrief, setSavingBrief] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);

  const empresaKey = empresa?.id || empresa?.nome || '';

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  // Boot: exige clientId e resolve Cliente + Empresa
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!clientId) {
        setBootError('clientId_obrigatorio');
        setBootLoading(false);
        return;
      }
      setBootLoading(true);
      setBootError(null);
      try {
        const [clientData, empresaData] = await Promise.all([
          Client.get(clientId),
          getEmpresaByClientId(clientId, agencyId),
        ]);
        if (cancelled) return;
        if (!clientData) {
          setBootError('cliente_nao_encontrado');
          return;
        }
        setClient(clientData);
        setEmpresa(empresaData);
        if (!empresaData) {
          setBootError('empresa_nao_configurada');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Brainstorm] boot', err);
          setBootError(err?.message || 'falha_ao_carregar_cliente');
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [clientId, agencyId]);

  const loadConversations = useCallback(async () => {
    if (!empresaKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await agentFetch('get-conversations', {
        method: 'GET',
        empresa: empresaKey,
      });
      const list = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);

      const preferred =
        data.lastOpenConversationId &&
        list.some((c) => c.id === data.lastOpenConversationId)
          ? data.lastOpenConversationId
          : list[0]?.id || null;

      setActiveConversationId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return preferred;
      });
    } catch (err) {
      console.error('[Brainstorm] load', err);
      setError(err?.message || 'Falha ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [empresaKey]);

  useEffect(() => {
    if (empresaKey) loadConversations();
  }, [empresaKey, loadConversations]);

  useEffect(() => {
    if (!activeConversation) {
      setContextoEnriquecido(null);
      return;
    }
    setContextoEnriquecido(activeConversation.contextoEnriquecido || null);
  }, [activeConversationId, activeConversation]);

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId || null);
    setMobilePanel('center');
  };

  const handleNewConversation = async (payload) => {
    const mes = Number(payload?.mes);
    const ano = Number(payload?.ano) || new Date().getFullYear();
    const empresaInput = empresa?.id || empresa?.nome || payload?.empresa;
    if (!empresaInput || !mes) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await agentFetch('init', {
        method: 'POST',
        body: { empresa: empresaInput, mes, ano },
      });

      const nova = {
        id: data.conversationId,
        titulo: `${data.contextoEnriquecido?.empresa?.nome || empresa?.nome || client?.name} - Ideas`,
        empresa: data.contextoEnriquecido?.empresa?.nome || empresa?.nome || '',
        mes,
        ano,
        status: 'explorando',
        atualizado_em: new Date().toISOString(),
        contextoEnriquecido: data.contextoEnriquecido,
        historicoMensagens: data.historicoMensagens || [],
        mensagem_inicial: data.mensagem_inicial,
      };

      if (data.mensagem_inicial) {
        nova.historicoMensagens = [
          { role: 'assistant', content: data.mensagem_inicial },
        ];
      }

      setConversations((prev) => [nova, ...prev.filter((c) => c.id !== nova.id)]);
      setActiveConversationId(nova.id);
      setContextoEnriquecido(data.contextoEnriquecido || null);
      setMobilePanel('center');
    } catch (err) {
      console.error('[Brainstorm] init', err);
      setError(err?.message || 'Falha ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsBrief = async () => {
    if (!activeConversationId || savingBrief) return;
    setSavingBrief(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await agentFetch('save-brief', {
        method: 'POST',
        body: { conversationId: activeConversationId },
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, status: 'finalizada' } : c
        )
      );
      setSuccess('Campanha criada — brief e ciclo prontos');
      await new Promise((r) => setTimeout(r, 800));
      if (data.cycleId) {
        navigate(`/campaigns/cycles/${data.cycleId}`);
      } else if (data.briefId) {
        navigate(
          createPageUrl(
            `client-briefing?clientId=${clientId}&briefingId=${data.briefId}`
          )
        );
      }
    } catch (err) {
      console.error('[Brainstorm] save-brief', err);
      setError(err?.message || 'Falha ao criar campanha');
    } finally {
      setSavingBrief(false);
    }
  };

  const chatContexto = useMemo(() => {
    if (!contextoEnriquecido && !activeConversation) return null;
    return {
      ...(contextoEnriquecido || {}),
      status: activeConversation?.status || contextoEnriquecido?.status,
    };
  }, [contextoEnriquecido, activeConversation]);

  const initialMessages = activeConversation?.historicoMensagens || [];

  const empresaOptions = useMemo(() => {
    if (!empresa) return [];
    return [{ id: empresa.id, nome: empresa.nome || client?.name || 'Empresa' }];
  }, [empresa, client?.name]);

  if (!clientId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-lg font-semibold text-[#111]">Brainstorm</h1>
        <p className="text-sm text-[#555]">
          Abra o brainstorm a partir de um cliente (contexto do hub).
        </p>
        <Link
          to={createPageUrl('clients')}
          className="inline-flex rounded-lg bg-[#007bff] px-4 py-2 text-sm font-semibold text-white"
        >
          Ir para Clientes
        </Link>
      </div>
    );
  }

  if (bootLoading) {
    return (
      <div className="p-8 text-center text-sm text-[#666]">Carregando cliente…</div>
    );
  }

  if (bootError === 'empresa_nao_configurada') {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-lg font-semibold text-[#111]">
          {client?.name || 'Cliente'}
        </h1>
        <p className="text-sm text-[#555]">
          Configure a empresa deste cliente antes de usar o brainstorm (produtos,
          tom, formato).
        </p>
        <Link
          to={createPageUrl(`client-settings?clientId=${clientId}`)}
          className="inline-flex rounded-lg bg-[#007bff] px-4 py-2 text-sm font-semibold text-white"
        >
          Configurar empresa
        </Link>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <p className="text-sm text-[#c0392b]">{bootError}</p>
        <Link
          to={createPageUrl(`client-detail?clientId=${clientId}`)}
          className="text-sm font-semibold text-[#007bff]"
        >
          Voltar ao cliente
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Brainstorm de Campanhas</h1>
          <p style={styles.subtitle}>
            {client?.name || 'Cliente'}
            {empresa?.nome ? ` · ${empresa.nome}` : ''}
            {' — '}
            explorar → refinar → criar campanha
          </p>
        </div>
        <div style={styles.mobileToggles} className="brainstorm-mobile-toggles">
          <button
            type="button"
            style={mobilePanel === 'left' ? styles.toggleActive : styles.toggle}
            onClick={() => setMobilePanel('left')}
          >
            Conversas
          </button>
          <button
            type="button"
            style={mobilePanel === 'center' ? styles.toggleActive : styles.toggle}
            onClick={() => setMobilePanel('center')}
          >
            Chat
          </button>
          <button
            type="button"
            style={mobilePanel === 'right' ? styles.toggleActive : styles.toggle}
            onClick={() => setMobilePanel('right')}
          >
            Contexto
          </button>
        </div>
      </div>

      {error ? (
        <p style={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p style={styles.success} role="status">
          {success}
        </p>
      ) : null}

      <div
        className={`brainstorm-grid panel-${mobilePanel}${leftCollapsed ? ' left-collapsed' : ''}${rightCollapsed ? ' right-collapsed' : ''}`}
        style={{
          ...styles.grid,
          gridTemplateColumns: `${leftCollapsed ? '48px' : '200px'} minmax(0, 1fr) ${rightCollapsed ? '44px' : '240px'}`,
        }}
      >
        <div
          className="brainstorm-col brainstorm-left"
          style={{
            ...styles.col,
            flexDirection: 'column',
            background: '#fafafa',
          }}
        >
          <div style={styles.railHeader}>
            {!leftCollapsed ? (
              <span style={styles.railTitle}>Conversas</span>
            ) : null}
            <button
              type="button"
              style={styles.collapseBtn}
              onClick={() => setLeftCollapsed((v) => !v)}
              title={leftCollapsed ? 'Expandir conversas' : 'Recolher conversas'}
              aria-label={leftCollapsed ? 'Expandir conversas' : 'Recolher conversas'}
            >
              {leftCollapsed ? '»' : '«'}
            </button>
          </div>
          {leftCollapsed ? (
            <div style={styles.collapsedRail}>
              <button
                type="button"
                style={styles.railIconBtn}
                title="Nova conversa"
                onClick={() => {
                  setLeftCollapsed(false);
                  setCreateOpen(true);
                }}
              >
                +
              </button>
              <button
                type="button"
                style={styles.railIconBtn}
                title="Expandir lista"
                onClick={() => setLeftCollapsed(false)}
              >
                ≡
              </button>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              contextData={contextoEnriquecido}
              empresas={empresaOptions}
              onRefresh={loadConversations}
              createOpen={createOpen}
              onCreateOpenChange={setCreateOpen}
              compact
            />
          )}
        </div>

        <div className="brainstorm-col brainstorm-center" style={styles.centerCol}>
          {loading && !activeConversationId ? (
            <div style={styles.placeholder}>Carregando conversas…</div>
          ) : activeConversationId ? (
            <ChatInterface
              key={activeConversationId}
              conversationId={activeConversationId}
              clientId={clientId}
              initialMessages={initialMessages}
              contextoEnriquecido={chatContexto}
              onSaveAsBrief={handleSaveAsBrief}
              onMessagesChange={(msgs) => {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeConversationId
                      ? { ...c, historicoMensagens: msgs }
                      : c
                  )
                );
              }}
            />
          ) : (
            <div style={styles.placeholder}>
              <p style={{ margin: '0 0 12px' }}>
                Nenhuma conversa ainda para {client?.name}.
              </p>
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => {
                  setLeftCollapsed(false);
                  setCreateOpen(true);
                  setMobilePanel('left');
                }}
              >
                + Nova conversa
              </button>
            </div>
          )}
          {savingBrief ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: '#666' }}>
              Criando brief e ciclo de campanha…
            </p>
          ) : null}
        </div>

        <div
          className="brainstorm-col brainstorm-right"
          style={{
            ...styles.col,
            borderRight: 'none',
            borderLeft: '1px solid #eee',
            flexDirection: 'column',
            background: '#f9f9f9',
          }}
        >
          <div style={{ ...styles.railHeader, justifyContent: rightCollapsed ? 'center' : 'space-between' }}>
            {!rightCollapsed ? (
              <span style={styles.railTitle}>Contexto</span>
            ) : null}
            <button
              type="button"
              style={styles.collapseBtn}
              onClick={() => setRightCollapsed((v) => !v)}
              title={rightCollapsed ? 'Mostrar contexto' : 'Recolher contexto'}
              aria-label={rightCollapsed ? 'Mostrar contexto' : 'Recolher contexto'}
            >
              {rightCollapsed ? '«' : '»'}
            </button>
          </div>
          {rightCollapsed ? (
            <button
              type="button"
              style={styles.contextRailBtn}
              onClick={() => setRightCollapsed(false)}
              title="Abrir contexto do cliente"
            >
              i
            </button>
          ) : (
            <ContextSidebar
              contextoEnriquecido={contextoEnriquecido}
              conversationStatus={activeConversation?.status}
              compact
            />
          )}
        </div>
      </div>

      <style>{`
        .brainstorm-mobile-toggles { display: none; }
        @media (max-width: 1024px) {
          .brainstorm-grid {
            grid-template-columns: 200px 1fr !important;
          }
          .brainstorm-grid.left-collapsed {
            grid-template-columns: 48px 1fr !important;
          }
          .brainstorm-right { display: none !important; }
          .brainstorm-grid.panel-right {
            grid-template-columns: 1fr !important;
          }
          .brainstorm-grid.panel-right .brainstorm-left,
          .brainstorm-grid.panel-right .brainstorm-center { display: none !important; }
          .brainstorm-grid.panel-right .brainstorm-right { display: flex !important; }
          .brainstorm-grid.panel-left .brainstorm-center { display: none !important; }
          .brainstorm-grid.panel-center .brainstorm-left { display: none !important; }
          .brainstorm-mobile-toggles { display: flex !important; }
        }
        @media (max-width: 768px) {
          .brainstorm-grid {
            grid-template-columns: 1fr !important;
          }
          .brainstorm-left, .brainstorm-right { display: none !important; }
          .brainstorm-grid.panel-left .brainstorm-left { display: flex !important; }
          .brainstorm-grid.panel-left .brainstorm-center { display: none !important; }
          .brainstorm-grid.panel-right .brainstorm-right { display: flex !important; }
          .brainstorm-grid.panel-right .brainstorm-center { display: none !important; }
          .brainstorm-grid.panel-center .brainstorm-center { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 64px)',
    minHeight: 480,
    background: '#fff',
    color: '#333',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #eee',
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700 },
  subtitle: { margin: '2px 0 0', fontSize: 12, color: '#666' },
  mobileToggles: { gap: 6 },
  toggle: {
    padding: '0.35rem 0.65rem',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  toggleActive: {
    padding: '0.35rem 0.65rem',
    borderRadius: 6,
    border: '1px solid #007bff',
    background: '#e3f2fd',
    color: '#007bff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    padding: '0.5rem 1rem',
    background: '#fdecea',
    color: '#c0392b',
    fontSize: 13,
  },
  success: {
    margin: 0,
    padding: '0.5rem 1rem',
    background: '#e8f8ef',
    color: '#1e7e34',
    fontSize: 13,
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '200px minmax(0, 1fr) 44px',
    minHeight: 0,
    overflow: 'hidden',
    transition: 'grid-template-columns 0.2s ease',
  },
  col: {
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    borderRight: '1px solid #eee',
  },
  centerCol: {
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.25rem',
  },
  railHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    padding: '0.5rem 0.4rem',
    borderBottom: '1px solid #eee',
    minHeight: 40,
    flexShrink: 0,
  },
  railTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#666',
    paddingLeft: 4,
  },
  collapseBtn: {
    border: '1px solid #ddd',
    background: '#fff',
    borderRadius: 6,
    width: 28,
    height: 28,
    cursor: 'pointer',
    fontSize: 12,
    color: '#444',
    lineHeight: 1,
    flexShrink: 0,
  },
  collapsedRail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '0.75rem 0.35rem',
  },
  railIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
  },
  contextRailBtn: {
    margin: '0.75rem auto',
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '1px solid #ccc',
    background: '#fff',
    color: '#555',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    margin: 'auto',
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    padding: 24,
  },
  primaryBtn: {
    padding: '0.55rem 1rem',
    borderRadius: 8,
    border: 'none',
    background: '#007bff',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
