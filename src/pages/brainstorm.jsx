import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConversationList from '@/components/campaigns/agent/ConversationList';
import ChatInterface from '@/components/campaigns/agent/ChatInterface';
import ContextSidebar from '@/components/campaigns/agent/ContextSidebar';

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
 * Brainstorm de campanhas — layout 3 colunas.
 * Esquerda: ConversationList | Centro: ChatInterface | Direita: ContextSidebar
 */
export default function BrainstormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const empresaFilter = searchParams.get('empresa') || '';

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [contextoEnriquecido, setContextoEnriquecido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mobilePanel, setMobilePanel] = useState('center'); // left | center | right
  const [savingBrief, setSavingBrief] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentFetch('get-conversations', {
        method: 'GET',
        empresa: empresaFilter || undefined,
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
  }, [empresaFilter]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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
    const empresa = payload?.empresa;
    const mes = Number(payload?.mes);
    const ano = Number(payload?.ano) || new Date().getFullYear();
    if (!empresa || !mes) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await agentFetch('init', {
        method: 'POST',
        body: { empresa, mes, ano },
      });

      const nova = {
        id: data.conversationId,
        titulo: `${data.contextoEnriquecido?.empresa?.nome || empresa} - Ideas`,
        empresa: data.contextoEnriquecido?.empresa?.nome || empresa,
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
      setSuccess('Brief salvo');
      await new Promise((r) => setTimeout(r, 800));
      if (data.cycleId) {
        navigate(`/campaigns/cycles/${data.cycleId}`);
      } else if (data.briefId) {
        navigate(`/client-briefing?briefingId=${data.briefId}`);
      }
    } catch (err) {
      console.error('[Brainstorm] save-brief', err);
      setError(err?.message || 'Falha ao salvar brief');
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

  const openCreateFromEmpty = () => {
    setCreateOpen(true);
    setMobilePanel('left');
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Brainstorm de Campanhas</h1>
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
        className={`brainstorm-grid panel-${mobilePanel}`}
        style={styles.grid}
      >
        <div className="brainstorm-col brainstorm-left" style={styles.col}>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            contextData={contextoEnriquecido}
            onRefresh={loadConversations}
            onError={(msg) => setError(msg)}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
          />
        </div>

        <div className="brainstorm-col brainstorm-center" style={styles.centerCol}>
          {loading && !activeConversationId ? (
            <div style={styles.placeholder}>Carregando conversas…</div>
          ) : activeConversationId ? (
            <ChatInterface
              key={activeConversationId}
              conversationId={activeConversationId}
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
            <div style={styles.emptyState}>
              <h2 style={styles.emptyTitle}>Comece um brainstorm</h2>
              <p style={styles.emptyText}>
                Crie uma conversa para gerar ideias de campanha com contexto da empresa.
              </p>
              <button type="button" style={styles.emptyCta} onClick={openCreateFromEmpty}>
                Começar brainstorm
              </button>
            </div>
          )}
          {savingBrief ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: '#555' }}>
              Salvando brief e criando ciclo…
            </p>
          ) : null}
        </div>

        <div className="brainstorm-col brainstorm-right" style={styles.col}>
          <ContextSidebar
            contextoEnriquecido={contextoEnriquecido}
            conversationStatus={activeConversation?.status}
          />
        </div>
      </div>

      <style>{`
        .brainstorm-mobile-toggles { display: none; }
        @media (max-width: 1024px) {
          .brainstorm-grid {
            grid-template-columns: 1fr !important;
          }
          .brainstorm-left,
          .brainstorm-right { display: none !important; }
          .brainstorm-grid.panel-left .brainstorm-left { display: flex !important; }
          .brainstorm-grid.panel-left .brainstorm-center { display: none !important; }
          .brainstorm-grid.panel-right .brainstorm-right { display: flex !important; }
          .brainstorm-grid.panel-right .brainstorm-center { display: none !important; }
          .brainstorm-grid.panel-center .brainstorm-center { display: flex !important; }
          .brainstorm-mobile-toggles { display: flex !important; }
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
    color: '#1a1a1a',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '0.85rem 1.25rem',
    borderBottom: '1px solid #eee',
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#111' },
  mobileToggles: { gap: 6 },
  toggle: {
    padding: '0.5rem 0.85rem',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    color: '#1a1a1a',
  },
  toggleActive: {
    padding: '0.5rem 0.85rem',
    borderRadius: 6,
    border: '1px solid #007bff',
    background: '#e3f2fd',
    color: '#007bff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    padding: '0.5rem 1.25rem',
    background: '#fdecea',
    color: '#c0392b',
    fontSize: 13,
  },
  success: {
    margin: 0,
    padding: '0.5rem 1.25rem',
    background: '#e8f8ef',
    color: '#1e7e34',
    fontSize: 13,
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '300px 1fr 300px',
    minHeight: 0,
    overflow: 'hidden',
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
    padding: '1.5rem',
    borderRight: '1px solid #eee',
  },
  placeholder: {
    margin: 'auto',
    textAlign: 'center',
    color: '#555',
    fontSize: 14,
    padding: 24,
  },
  emptyState: {
    margin: 'auto',
    textAlign: 'center',
    maxWidth: 360,
    padding: 24,
  },
  emptyTitle: {
    margin: '0 0 0.5rem',
    fontSize: 20,
    fontWeight: 700,
    color: '#111',
  },
  emptyText: {
    margin: '0 0 1.25rem',
    fontSize: 14,
    color: '#555',
    lineHeight: 1.45,
  },
  emptyCta: {
    padding: '0.7rem 1.25rem',
    borderRadius: 8,
    border: 'none',
    background: '#007bff',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
};
