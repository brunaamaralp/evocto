import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Brief } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { launchCampanhaFromBrief } from '@/lib/launchCampanhaFromBrief';
import { clientCampaignPageUrl, buildClientCampaignHref } from '@/lib/campaignHref';
import AgentMarkdown from '@/components/campaigns/agent/AgentMarkdown';

const API_BASE = '/api/campaigns-agent';

async function postAgent(route, body) {
  const response = await fetch(`${API_BASE}?route=${encodeURIComponent(route)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || data?.error || `http_${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

const ROTEIROS_PROMPT =
  'Com base no que alinhamos até agora, gere os ROTEIROS detalhados da campanha (hooks, cenas, falas, CTAs) e, se já estiver completo, finalize com o JSON das 9 dimensões.';

function statusPillLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'refinada') return 'Refinada';
  if (s === 'finalizada') return 'Finalizada';
  if (s === 'arquivada') return 'Arquivada';
  return 'Explorando';
}

/**
 * Chat do agent — adaptado para Brainstorm.
 *
 * @param {{
 *   conversationId: string,
 *   clientId?: string,
 *   initialMessages?: Array<{ role: string, content: string }>,
 *   contextoEnriquecido?: object,
 *   onSaveAsBrief?: () => void,
 *   onGenerateRoteiros?: () => void,
 *   onMessagesChange?: (messages: Array<{ role: string, content: string }>) => void,
 * }} props
 */
function FlowStepper({ isRefinada, isFinalizada, hasMessages }) {
  const steps = [
    {
      id: 1,
      label: 'Explorar',
      done: hasMessages || isRefinada || isFinalizada,
      current: !isRefinada && !isFinalizada && !hasMessages,
    },
    {
      id: 2,
      label: 'Refinar',
      done: isRefinada || isFinalizada,
      current: !isRefinada && !isFinalizada && hasMessages,
    },
    {
      id: 3,
      label: 'Criar campanha',
      done: isFinalizada,
      current: isRefinada && !isFinalizada,
    },
  ];

  return (
    <nav aria-label="Fluxo do brainstorm" style={styles.stepper}>
      {steps.map((step, index) => (
        <div key={step.id} style={styles.stepItem}>
          {index > 0 ? <span style={styles.stepLine} aria-hidden /> : null}
          <span
            style={{
              ...styles.stepDot,
              ...(step.done
                ? styles.stepDotDone
                : step.current
                  ? styles.stepDotCurrent
                  : null),
            }}
            aria-current={step.current ? 'step' : undefined}
          >
            {step.done ? '✓' : step.id}
          </span>
          <span
            style={{
              ...styles.stepLabel,
              ...(step.current || step.done ? styles.stepLabelActive : null),
            }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </nav>
  );
}

function flowHint({ isRefinada, isFinalizada }) {
  if (isFinalizada) {
    return 'Campanha criada a partir desta ideia. Continue no ciclo ou no briefing.';
  }
  if (isRefinada) {
    return 'Ideia refinada. Opcional: gere roteiros. Depois, crie a campanha no ciclo do mês.';
  }
  return 'Converse até fechar foco, público, formato e ciclo. Quando estiver clara, o status vira Refinada.';
}

export default function ChatInterface({
  conversationId,
  clientId,
  serviceId = null,
  initialMessages = [],
  contextoEnriquecido,
  onSaveAsBrief,
  onGenerateRoteiros,
  onMessagesChange,
}) {
  const navigate = useNavigate();
  const { agencyId, userId } = useSession();
  const [messages, setMessages] = useState(() =>
    Array.isArray(initialMessages) ? initialMessages : []
  );
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (Array.isArray(initialMessages)) {
      setMessages(initialMessages);
    }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  const sendMessage = async (text) => {
    const userMessage = String(text || '').trim();
    if (!userMessage || loading || !conversationId) return;

    setError(null);
    setInputValue('');
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', content: userMessage }]);

    try {
      const data = await postAgent('message', {
        conversationId,
        message: userMessage,
      });
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.assistantMessage || '' },
      ]);
    } catch (err) {
      console.error('[ChatInterface] message', err);
      setError(err?.message || 'Falha ao enviar mensagem');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Desculpe, não consegui responder agora. Tente de novo.',
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = () => sendMessage(inputValue);

  const handleGerarRoteiros = () => {
    if (onGenerateRoteiros) {
      onGenerateRoteiros();
      return;
    }
    sendMessage(ROTEIROS_PROMPT);
  };

  const canSaveBriefComputed = () => {
    const status = String(contextoEnriquecido?.status || '').toLowerCase();
    return (
      status === 'refinada' &&
      !loading &&
      !savingCampaign &&
      Boolean(conversationId)
    );
  };

  const openCreateCampaign = () => {
    if (!canSaveBriefComputed()) return;
    setConfirmOpen(true);
  };

  const executeCreateCampaign = async () => {
    setConfirmOpen(false);
    setError(null);

    if (onSaveAsBrief) {
      setSavingCampaign(true);
      try {
        await onSaveAsBrief();
      } finally {
        setSavingCampaign(false);
      }
      return;
    }

    if (loading || !conversationId) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== 'assistant') {
      setError('Nenhuma resposta do agente para criar a campanha');
      return;
    }

    setLoading(true);
    setSavingCampaign(true);
    try {
      const data = await postAgent('save-brief', { conversationId });
      if (!data.success || !data.briefId) {
        setError('Não foi possível criar a campanha');
        return;
      }

      const briefing = await Brief.get(data.briefId);
      const resolvedAgencyId = data.agencyId || agencyId;
      const resolvedClientId = data.clientId || clientId;
      if (!resolvedAgencyId || !resolvedClientId) {
        navigate(
          createPageUrl(
            clientId
              ? buildClientCampaignHref({
                  clientId,
                  briefingId: data.briefId,
                })
              : `client-briefing?briefingId=${data.briefId}`
          )
        );
        return;
      }

      const launched = await launchCampanhaFromBrief({
        briefing,
        agencyId: resolvedAgencyId,
        clientId: resolvedClientId,
        userId,
        generateTasks: true,
        empresaNome: data.empresaNome || contextoEnriquecido?.empresa?.nome,
        serviceId: data.serviceId || serviceId || null,
      });

      if (data.modo === 'plano') {
        try {
          await postAgent('update-plan-month', {
            planId: data.planId || undefined,
            clientId: resolvedClientId,
            mes: data.mes,
            ano: data.ano,
            brief_mensal_id: briefing.id,
            ciclo_entrega_id: launched.cyclePlan?.id || null,
            status_mes: 'materializado',
            nome_campanha: data.nome || briefing.nome_campanha,
          });
        } catch (planErr) {
          console.warn('[ChatInterface] update-plan-month', planErr);
        }
      }

      if (launched.briefing?.id) {
        navigate(
          clientCampaignPageUrl({
            clientId: resolvedClientId,
            briefingId: launched.briefing.id,
          })
        );
      } else if (launched.cyclePlan?.id) {
        navigate(`/campaigns/cycles/${launched.cyclePlan.id}`);
      } else {
        navigate(
          clientCampaignPageUrl({
            clientId: resolvedClientId,
            briefingId: data.briefId,
          })
        );
      }
    } catch (err) {
      console.error('[ChatInterface] save-brief', err);
      setError(err?.message || 'Falha ao criar campanha');
    } finally {
      setLoading(false);
      setSavingCampaign(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div style={{ padding: 24, color: '#555', textAlign: 'center' }}>
        conversationId é obrigatório
      </div>
    );
  }

  const statusRaw = String(contextoEnriquecido?.status || '').toLowerCase();
  const isRefinada = statusRaw === 'refinada';
  const isFinalizada = statusRaw === 'finalizada';
  const canSaveBrief =
    isRefinada && !isFinalizada && !loading && !savingCampaign && Boolean(conversationId);
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;
  const showGerarRoteiros =
    !isFinalizada && (isRefinada || assistantCount >= 2);
  const canSend = Boolean(inputValue.trim()) && !loading && Boolean(conversationId);
  const empresaNome = contextoEnriquecido?.empresa?.nome;
  const ciclo = contextoEnriquecido?.ciclo_proximo;
  const mesAno =
    contextoEnriquecido?.mesAtual != null
      ? `${contextoEnriquecido.mesAtual}/${contextoEnriquecido.anoAtual || ''}`.replace(/\/$/, '')
      : null;
  const hint = flowHint({ isRefinada, isFinalizada });

  return (
    <div className="chat-interface" style={styles.root}>
      <header style={styles.header}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.headerTitle}>
            {empresaNome || 'Brainstorm'}
            <span style={styles.statusPill}>{statusPillLabel(statusRaw)}</span>
          </div>
          {(mesAno || ciclo) && (
            <div style={styles.headerMeta}>
              {mesAno ? <span>{mesAno}</span> : null}
              {mesAno && ciclo ? <span> · </span> : null}
              {ciclo ? <span>ciclo {String(ciclo).toUpperCase()}</span> : null}
            </div>
          )}
          <FlowStepper
            isRefinada={isRefinada}
            isFinalizada={isFinalizada}
            hasMessages={messages.length > 0}
          />
          <p style={styles.flowHint}>{hint}</p>
        </div>
      </header>

      <div ref={listRef} style={styles.list}>
        {messages.length === 0 && !loading ? (
          <p style={styles.empty}>
            Descreva o que precisa para a campanha deste mês. Depois refinamos juntos e
            transformamos em brief + ciclo.
          </p>
        ) : null}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={`${msg.role}-${i}`}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                className="agent-chat-bubble"
                style={{
                  ...styles.bubble,
                  background: isUser ? '#007bff' : '#f0f0f0',
                  color: isUser ? '#fff' : '#111',
                  whiteSpace: isUser ? 'pre-wrap' : 'normal',
                }}
              >
                <AgentMarkdown content={msg.content} isUser={isUser} />
              </div>
            </div>
          );
        })}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={styles.loadingBubble}>
              <span style={spinnerStyle} aria-hidden />
              Gerando ideias…
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? (
        <p style={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {showGerarRoteiros ? (
        <div style={styles.secondaryRow}>
          <button
            type="button"
            className="chat-secondary-btn"
            onClick={handleGerarRoteiros}
            disabled={loading || !conversationId}
            style={styles.secondaryBtn}
          >
            Gerar roteiros (opcional)
          </button>
          <span style={styles.secondaryHint}>
            Detalha hooks e cenas antes de criar a campanha
          </span>
        </div>
      ) : null}

      <div style={styles.inputArea}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ex.: foco em vendas, público X, 5 vídeos…"
          disabled={loading || !conversationId || isFinalizada}
          rows={3}
          style={{
            ...styles.textarea,
            background: loading ? '#fafafa' : '#fff',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend || isFinalizada}
          style={btnSend(!canSend || isFinalizada)}
        >
          Enviar
        </button>
      </div>

      <div style={styles.stickyBar}>
        <button
          type="button"
          className="chat-primary-btn"
          onClick={openCreateCampaign}
          disabled={!canSaveBrief}
          style={btnSave(!canSaveBrief)}
          title={
            isFinalizada
              ? 'Campanha já criada'
              : !isRefinada
                ? 'Disponível quando a ideia estiver refinada'
                : 'Cria brief e ciclo de execução'
          }
        >
          {savingCampaign
            ? 'Criando campanha…'
            : isFinalizada
              ? 'Campanha criada'
              : 'Criar campanha'}
        </button>
        {!isRefinada && !isFinalizada ? (
          <p style={styles.saveHint}>
            Liberado no passo 3, quando o status for <strong>Refinada</strong>
          </p>
        ) : null}
        {isRefinada && !isFinalizada ? (
          <p style={styles.saveHint}>
            Gera o brief e vincula ao ciclo operacional do mês (sem duplicar ciclo)
          </p>
        ) : null}
      </div>

      {confirmOpen ? (
        <div
          style={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-campaign-title"
        >
          <div style={styles.modal}>
            <h3 id="create-campaign-title" style={styles.modalTitle}>
              Criar campanha a partir desta ideia?
            </h3>
            <p style={styles.modalBody}>
              Vamos transformar o brainstorm em operação:
            </p>
            <ul style={styles.modalList}>
              <li>
                <strong>Brief de campanha</strong> com as dimensões alinhadas
              </li>
              <li>
                <strong>Ciclo do mês</strong> (reutiliza se já existir) + tarefas
              </li>
            </ul>
            <p style={styles.modalBody}>
              Em seguida você entra na campanha para seguir a execução.
            </p>
            <div style={styles.modalActions}>
              <button
                type="button"
                className="chat-primary-btn"
                style={btnSave(false)}
                onClick={executeCreateCampaign}
              >
                Confirmar e criar
              </button>
              <button
                type="button"
                style={styles.modalCancel}
                onClick={() => setConfirmOpen(false)}
              >
                Continuar conversando
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .chat-secondary-btn:hover:not(:disabled) {
          background: #f5f5f5 !important;
        }
        .chat-secondary-btn:disabled,
        .chat-primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .chat-primary-btn:hover:not(:disabled) {
          background: #0056b3 !important;
        }
        @media (max-width: 640px) {
          .agent-chat-bubble {
            font-size: 13px !important;
            padding: 0.6rem 0.85rem !important;
            max-width: 92% !important;
          }
        }
        @keyframes agent-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const spinnerStyle = {
  width: 14,
  height: 14,
  border: '2px solid #ccc',
  borderTopColor: '#007bff',
  borderRadius: '50%',
  animation: 'agent-spin 0.7s linear infinite',
  display: 'inline-block',
};

const styles = {
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    flex: 1,
    gap: '0.55rem',
    color: '#1a1a1a',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 6,
    borderBottom: '1px solid #eee',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
  },
  headerMeta: { marginTop: 2, fontSize: 12, color: '#555' },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.15rem 0.55rem',
    borderRadius: 999,
    background: '#f0f0f0',
    color: '#111',
    fontSize: 11,
    fontWeight: 600,
  },
  list: {
    flex: '1 1 0',
    minHeight: 0,
    overflowY: 'auto',
    padding: '0.35rem 0.15rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  empty: { margin: 0, fontSize: 13, color: '#555', textAlign: 'center' },
  bubble: {
    maxWidth: 'min(94%, 720px)',
    padding: '0.85rem 1.1rem',
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 1.55,
    wordBreak: 'break-word',
  },
  loadingBubble: {
    padding: '0.65rem 1rem',
    borderRadius: 12,
    background: '#f0f0f0',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#555',
  },
  error: { margin: 0, fontSize: 12, color: '#c0392b' },
  secondaryRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  secondaryBtn: {
    padding: '0.45rem 0.85rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    background: '#fff',
    color: '#111',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  inputArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  textarea: {
    width: '100%',
    minHeight: 64,
    maxHeight: 120,
    padding: '0.75rem 0.9rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    resize: 'vertical',
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    color: '#111',
  },
  stickyBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 4,
    borderTop: '1px solid #eee',
    flexShrink: 0,
  },
  saveHint: {
    margin: 0,
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  flowHint: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#555',
    lineHeight: 1.35,
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  stepItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  stepLine: {
    width: 12,
    height: 1,
    background: '#ddd',
    marginRight: 2,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '1px solid #ccc',
    background: '#fff',
    color: '#888',
    fontSize: 10,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepDotCurrent: {
    borderColor: '#007bff',
    background: '#e3f2fd',
    color: '#007bff',
  },
  stepDotDone: {
    borderColor: '#1e7e34',
    background: '#e8f8ef',
    color: '#1e7e34',
  },
  stepLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: 500,
  },
  stepLabelActive: {
    color: '#111',
    fontWeight: 600,
  },
  secondaryHint: {
    fontSize: 11,
    color: '#666',
    alignSelf: 'center',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 12,
    padding: '1.25rem 1.35rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  },
  modalTitle: {
    margin: '0 0 0.75rem',
    fontSize: 16,
    fontWeight: 700,
    color: '#111',
  },
  modalBody: {
    margin: '0 0 0.65rem',
    fontSize: 13,
    color: '#444',
    lineHeight: 1.45,
  },
  modalList: {
    margin: '0 0 0.75rem',
    paddingLeft: '1.15rem',
    fontSize: 13,
    color: '#222',
    lineHeight: 1.55,
  },
  modalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  modalCancel: {
    padding: '0.55rem 1rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    background: '#fff',
    color: '#333',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
};

function btnSend(disabled) {
  return {
    alignSelf: 'flex-end',
    padding: '0.55rem 1rem',
    borderRadius: 8,
    border: 'none',
    background: disabled ? '#d0d0d0' : '#007bff',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function btnSave(disabled) {
  return {
    width: '100%',
    padding: '0.7rem 1rem',
    borderRadius: 8,
    border: 'none',
    background: disabled ? '#9ec9f5' : '#007bff',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export { ROTEIROS_PROMPT };
