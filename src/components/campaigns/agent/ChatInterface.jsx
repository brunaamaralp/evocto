import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

/**
 * Chat do agent — adaptado para Brainstorm.
 *
 * @param {{
 *   conversationId: string,
 *   initialMessages?: Array<{ role: string, content: string }>,
 *   contextoEnriquecido?: object,
 *   onSaveAsBrief?: () => void,
 *   onGenerateRoteiros?: () => void,
 *   onMessagesChange?: (messages: Array<{ role: string, content: string }>) => void,
 * }} props
 */
export default function ChatInterface({
  conversationId,
  initialMessages = [],
  contextoEnriquecido,
  onSaveAsBrief,
  onGenerateRoteiros,
  onMessagesChange,
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() =>
    Array.isArray(initialMessages) ? initialMessages : []
  );
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const handleSaveBrief = async () => {
    if (onSaveAsBrief) {
      onSaveAsBrief();
      return;
    }

    if (loading || !conversationId) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== 'assistant') {
      alert('Nenhuma resposta do agente pra salvar');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await postAgent('save-brief', { conversationId });
      if (data.success && (data.cycleId || data.briefId)) {
        if (data.cycleId) {
          navigate(`/campaigns/cycles/${data.cycleId}`);
        } else {
          navigate(
            createPageUrl(`client-briefing?briefingId=${data.briefId}`) ||
              `/campaigns/${data.briefId}`
          );
        }
      } else {
        setError('Não foi possível salvar o brief');
      }
    } catch (err) {
      console.error('[ChatInterface] save-brief', err);
      setError(err?.message || 'Falha ao salvar brief');
    } finally {
      setLoading(false);
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
      <div style={{ padding: 24, color: '#888', textAlign: 'center' }}>
        conversationId é obrigatório
      </div>
    );
  }

  const canSend = Boolean(inputValue.trim()) && !loading && Boolean(conversationId);
  const isRefinada = String(contextoEnriquecido?.status || '').toLowerCase() === 'refinada';
  const empresaNome = contextoEnriquecido?.empresa?.nome;
  const ciclo = contextoEnriquecido?.ciclo_proximo;
  const mesAno =
    contextoEnriquecido?.mesAtual != null
      ? `${contextoEnriquecido.mesAtual}/${contextoEnriquecido.anoAtual || ''}`.replace(/\/$/, '')
      : null;

  return (
    <div className="chat-interface" style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.headerTitle}>
            {empresaNome || 'Brainstorm'}
            {isRefinada ? (
              <span className="chat-refinada-badge" style={styles.badge}>
                ✓ Refinada
              </span>
            ) : null}
          </div>
          {(mesAno || ciclo) && (
            <div style={styles.headerMeta}>
              {mesAno ? <span>{mesAno}</span> : null}
              {mesAno && ciclo ? <span> · </span> : null}
              {ciclo ? <span>ciclo {String(ciclo).toUpperCase()}</span> : null}
            </div>
          )}
        </div>
      </header>

      {/* Message list */}
      <div ref={listRef} style={styles.list}>
        {messages.length === 0 && !loading ? (
          <p style={styles.empty}>Comece descrevendo o que precisa para a campanha.</p>
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
                  color: isUser ? '#fff' : '#000',
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={styles.loadingBubble}>
              <span style={spinnerStyle} aria-hidden />
              Pensando…
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

      {/* Input */}
      <div style={styles.inputArea}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Diga o que quer..."
          disabled={loading || !conversationId}
          rows={3}
          style={{
            ...styles.textarea,
            background: loading ? '#fafafa' : '#fff',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={btnPrimary(!canSend)}
        >
          Enviar
        </button>
      </div>

      {/* Floating actions */}
      <div className="chat-actions" style={styles.chatActions}>
        <button
          type="button"
          className="chat-action-btn"
          onClick={handleSaveBrief}
          disabled={loading || !conversationId}
          style={styles.floatBtn}
        >
          Salvar como Brief
        </button>
        <button
          type="button"
          className="chat-action-btn"
          onClick={handleGerarRoteiros}
          disabled={loading || !conversationId}
          style={styles.floatBtn}
        >
          Gerar Roteiros
        </button>
      </div>

      <style>{`
        .chat-action-btn:hover:not(:disabled) {
          background: #0056b3 !important;
        }
        .chat-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .agent-chat-bubble {
            font-size: 13px !important;
            padding: 0.6rem 0.85rem !important;
            max-width: 92% !important;
          }
          .chat-actions {
            left: 12px !important;
            right: 12px !important;
            bottom: 12px !important;
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
    minHeight: 320,
    gap: '0.75rem',
    color: '#333',
    paddingBottom: 56,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #eee',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 16,
    fontWeight: 700,
  },
  headerMeta: { marginTop: 2, fontSize: 12, color: '#666' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.15rem 0.5rem',
    borderRadius: 999,
    background: '#e8f8ef',
    color: '#1e7e34',
    fontSize: 11,
    fontWeight: 700,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem 0.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  empty: { margin: 0, fontSize: 13, color: '#888', textAlign: 'center' },
  bubble: {
    maxWidth: 'min(85%, 520px)',
    padding: '0.75rem 1rem',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
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
  inputArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    padding: '1rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    resize: 'vertical',
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  chatActions: {
    position: 'fixed',
    right: 24,
    bottom: 24,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  floatBtn: {
    padding: '0.65rem 1rem',
    borderRadius: 8,
    border: 'none',
    background: '#007bff',
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.35)',
    whiteSpace: 'nowrap',
  },
};

function btnPrimary(disabled) {
  return {
    alignSelf: 'flex-start',
    padding: '0.55rem 1rem',
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
