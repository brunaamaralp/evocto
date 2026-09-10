import { useEffect, useMemo, useState } from 'react';

const API_BASE = '/api/campaigns-agent';

const MES_NOMES = [
  '',
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

async function postAgent(route, body) {
  const response = await fetch(`${API_BASE}?route=${encodeURIComponent(route)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || data?.error || `http_${response.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'refinada') return { text: 'refinada', badge: true };
  if (s === 'finalizada') return { text: 'finalizada', badge: false };
  if (s === 'arquivada') return { text: 'arquivada', badge: false };
  return { text: s || 'explorando', badge: false };
}

function exportConversationPdf(conversation, contextData) {
  const titulo = conversation?.titulo || 'Conversa';
  const ctx = contextData || conversation?.contextoEnriquecido || {};
  const campanhas = (ctx.campanhas_anteriores || []).slice(0, 3);
  const lines = [
    titulo,
    `Empresa: ${conversation?.empresa || ctx.empresa?.nome || '—'}`,
    `Mês/Ano: ${conversation?.mes || ctx.mesAtual || '—'}/${conversation?.ano || ctx.anoAtual || '—'}`,
    `Status: ${conversation?.status || '—'}`,
    `Ciclo: ${ctx.ciclo_proximo || '—'}`,
    '',
    'Últimas campanhas:',
    ...campanhas.map(
      (c) =>
        `- ${c.mes}/${c.ano} ${c.nome_campanha || '—'} (${c.ciclo_comercial || '—'}) nota ${c.resultado?.nota_geral ?? '—'}`
    ),
    '',
    `Melhor VENDAS: ${ctx.padroes?.melhor_ciclo_vendas || ctx.padroes_performance?.melhor_ciclo_vendas || '—'}`,
    `Melhor ENGAJAMENTO: ${ctx.padroes?.melhor_ciclo_engajamento || ctx.padroes_performance?.melhor_ciclo_engajamento || '—'}`,
  ];

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#333} h1{font-size:18px} pre{white-space:pre-wrap}</style>
    </head><body><h1>${titulo}</h1><pre>${lines.join('\n')}</pre>
    <script>window.onload=()=>{window.print()}</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) {
    alert('Permita pop-ups para exportar PDF');
    return;
  }
  w.document.write(html);
  w.document.close();
}

/**
 * Sidebar esquerda — lista de conversas do agent.
 *
 * @param {{
 *   conversations: Array<object>,
 *   activeConversationId: string,
 *   onSelectConversation: (id: string) => void,
 *   onNewConversation: (payload: { empresa: string, mes: number, ano: number }) => void,
 *   contextData?: object,
 *   empresas?: Array<{ id?: string, nome?: string, name?: string } | string>,
 *   onRefresh?: () => void,
 * }} props
 */
export default function ConversationList({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  contextData,
  empresas = [],
  onRefresh,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [formEmpresa, setFormEmpresa] = useState('');
  const [formMes, setFormMes] = useState(new Date().getMonth() + 1);
  const [formAno, setFormAno] = useState(new Date().getFullYear());

  const empresaOptions = useMemo(() => {
    if (Array.isArray(empresas) && empresas.length) {
      return empresas.map((e) =>
        typeof e === 'string'
          ? { value: e, label: e }
          : { value: e.id || e.nome || e.name, label: e.nome || e.name || e.id }
      );
    }
    const fromConv = new Map();
    for (const c of conversations) {
      const key = c.empresa || c.empresa_nome;
      if (key) fromConv.set(key, key);
    }
    return [...fromConv.entries()].map(([value, label]) => ({ value, label }));
  }, [empresas, conversations]);

  useEffect(() => {
    if (!isCreatingNew) return;
    if (!formEmpresa && empresaOptions[0]?.value) {
      setFormEmpresa(empresaOptions[0].value);
    }
  }, [isCreatingNew, formEmpresa, empresaOptions]);

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    if (!menuOpenId) return undefined;
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpenId]);

  const active = conversations.find((c) => c.id === activeConversationId);
  const ctx = contextData || active?.contextoEnriquecido || {};
  const campanhas = Array.isArray(ctx.campanhas_anteriores)
    ? ctx.campanhas_anteriores.slice(0, 3)
    : [];
  const padroes = ctx.padroes || ctx.padroes_performance || {};

  const runMenuAction = async (action, conversation) => {
    setMenuOpenId(null);
    if (!conversation?.id) return;

    if (action === 'export') {
      exportConversationPdf(conversation, conversation.id === activeConversationId ? ctx : conversation.contextoEnriquecido);
      return;
    }

    if (action === 'delete') {
      const ok = window.confirm(`Deletar conversa "${conversation.titulo || conversation.id}"?`);
      if (!ok) return;
    }

    setBusyId(conversation.id);
    try {
      if (action === 'clone') {
        const data = await postAgent('clone-conversation', {
          conversationId: conversation.id,
        });
        onRefresh?.();
        if (data.conversationId) onSelectConversation?.(data.conversationId);
      } else if (action === 'archive') {
        await postAgent('archive-conversation', { conversationId: conversation.id });
        onRefresh?.();
      } else if (action === 'delete') {
        await postAgent('delete-conversation', { conversationId: conversation.id });
        onRefresh?.();
        if (activeConversationId === conversation.id) {
          onSelectConversation?.(null);
        }
      }
    } catch (err) {
      console.error('[ConversationList]', action, err);
      alert(err?.message || `Falha ao ${action}`);
    } finally {
      setBusyId(null);
    }
  };

  const submitNew = (e) => {
    e.preventDefault();
    if (!formEmpresa || !formMes) return;
    onNewConversation?.({
      empresa: formEmpresa,
      mes: Number(formMes),
      ano: Number(formAno) || new Date().getFullYear(),
    });
    setIsCreatingNew(false);
  };

  return (
    <aside style={styles.sidebar}>
      <header style={styles.header}>
        <h2 style={styles.headerTitle}>💡 Minhas Conversas</h2>
      </header>

      <button type="button" style={styles.newBtn} onClick={() => setIsCreatingNew(true)}>
        + Nova Conversa
      </button>

      <div style={styles.list}>
        {(conversations || []).length === 0 ? (
          <p style={styles.empty}>Nenhuma conversa ainda</p>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            const st = statusLabel(c.status);
            return (
              <div
                key={c.id}
                style={{
                  ...styles.item,
                  ...(isActive ? styles.itemActive : null),
                  opacity: busyId === c.id ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderLeftColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderLeftColor = '#999';
                }}
              >
                <button
                  type="button"
                  style={styles.itemMain}
                  onClick={() => onSelectConversation?.(c.id)}
                >
                  <div style={styles.itemTitle}>{c.titulo || 'Sem título'}</div>
                  <div style={styles.itemMeta}>
                    {c.empresa || '—'} · {MES_NOMES[c.mes] || c.mes}/{c.ano || '—'}
                  </div>
                  <div style={styles.statusRow}>
                    <span style={styles.statusText}>{st.text}</span>
                    {st.badge ? <span style={styles.badge}>✓</span> : null}
                  </div>
                </button>

                <div style={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    style={styles.menuBtn}
                    aria-label="Menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((id) => (id === c.id ? null : c.id));
                    }}
                  >
                    ⋮
                  </button>
                  {menuOpenId === c.id ? (
                    <div style={styles.menu}>
                      <button type="button" style={styles.menuItem} onClick={() => runMenuAction('clone', c)}>
                        Clonar
                      </button>
                      <button type="button" style={styles.menuItem} onClick={() => runMenuAction('export', c)}>
                        Exportar PDF
                      </button>
                      <button type="button" style={styles.menuItem} onClick={() => runMenuAction('archive', c)}>
                        Arquivar
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.menuItem, color: '#c0392b' }}
                        onClick={() => runMenuAction('delete', c)}
                      >
                        Deletar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contexto da conversa ativa */}
      <section style={styles.contextBox}>
        <h3 style={styles.sectionTitle}>Contexto</h3>
        {active || contextData ? (
          <>
            <p style={styles.ctxLine}>
              <strong>{ctx.empresa?.nome || active?.empresa || '—'}</strong>
            </p>
            <p style={styles.ctxLine}>
              {MES_NOMES[ctx.mesAtual || active?.mes] || ctx.mesAtual || active?.mes || '—'}/
              {ctx.anoAtual || active?.ano || '—'} · ciclo{' '}
              <span style={styles.ciclo}>{String(ctx.ciclo_proximo || '—').toUpperCase()}</span>
            </p>

            <div style={{ marginTop: 10 }}>
              <div style={styles.miniLabel}>Últimas campanhas</div>
              {campanhas.length === 0 ? (
                <p style={styles.emptyMini}>Sem histórico</p>
              ) : (
                campanhas.map((c, i) => (
                  <div key={`${c.mes}-${c.ano}-${i}`} style={styles.miniCard}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>
                      {c.nome_campanha || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>
                      {c.mes}/{c.ano} · {c.ciclo_comercial || '—'} · nota{' '}
                      {c.resultado?.nota_geral ?? '—'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={styles.miniLabel}>Padrões</div>
              <p style={styles.ctxLine}>
                Melhor VENDAS: <strong>{padroes.melhor_ciclo_vendas || '—'}</strong>
              </p>
              <p style={styles.ctxLine}>
                Melhor ENGAJAMENTO: <strong>{padroes.melhor_ciclo_engajamento || '—'}</strong>
              </p>
            </div>
          </>
        ) : (
          <p style={styles.emptyMini}>Selecione uma conversa</p>
        )}
      </section>

      {isCreatingNew ? (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <form style={styles.modal} onSubmit={submitNew}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 16 }}>Nova conversa</h3>

            <label style={styles.label}>
              Empresa
              {empresaOptions.length ? (
                <select
                  value={formEmpresa}
                  onChange={(e) => setFormEmpresa(e.target.value)}
                  style={styles.input}
                  required
                >
                  <option value="">Selecione…</option>
                  {empresaOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={formEmpresa}
                  onChange={(e) => setFormEmpresa(e.target.value)}
                  placeholder="Nome ou ID da empresa"
                  style={styles.input}
                  required
                />
              )}
            </label>

            <label style={styles.label}>
              Mês
              <input
                type="number"
                min={1}
                max={12}
                value={formMes}
                onChange={(e) => setFormMes(Number(e.target.value))}
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Ano
              <input
                type="number"
                min={2020}
                max={2100}
                value={formAno}
                onChange={(e) => setFormAno(Number(e.target.value))}
                style={styles.input}
                required
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" style={styles.primaryBtn}>
                Criar
              </button>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setIsCreatingNew(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 300,
    background: '#f9f9f9',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
    padding: '1rem',
    color: '#333',
    overflow: 'hidden',
  },
  header: { marginBottom: '0.75rem' },
  headerTitle: { margin: 0, fontSize: 16, fontWeight: 700 },
  newBtn: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    borderRadius: 8,
    border: 'none',
    background: '#007bff',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  list: {
    flex: '1 1 auto',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
  },
  empty: { margin: 0, fontSize: 13, color: '#888' },
  item: {
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    background: '#fff',
    borderLeft: '3px solid #999',
    borderRadius: 6,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  itemActive: {
    background: '#e3f2fd',
    borderLeft: '3px solid #007bff',
  },
  itemMain: {
    flex: 1,
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    padding: '0.65rem 0.5rem 0.65rem 0.75rem',
    cursor: 'pointer',
    color: 'inherit',
  },
  itemTitle: { fontWeight: 600, fontSize: 13, lineHeight: 1.3 },
  itemMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 },
  statusText: { fontSize: 11, color: '#555', textTransform: 'capitalize' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#27ae60',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
  },
  menuWrap: { position: 'relative', padding: '0.25rem 0.25rem 0.25rem 0' },
  menuBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    padding: '0.35rem 0.45rem',
    color: '#666',
  },
  menu: {
    position: 'absolute',
    right: 4,
    top: 28,
    zIndex: 20,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    minWidth: 140,
    overflow: 'hidden',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: '#fff',
    padding: '0.5rem 0.75rem',
    fontSize: 13,
    cursor: 'pointer',
  },
  contextBox: {
    marginTop: '0.85rem',
    paddingTop: '0.85rem',
    borderTop: '1px solid #e0e0e0',
    overflowY: 'auto',
    maxHeight: '42%',
  },
  sectionTitle: {
    margin: '0 0 0.5rem',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#007bff',
  },
  ctxLine: { margin: '0 0 0.25rem', fontSize: 12 },
  ciclo: { color: '#007bff', fontWeight: 700 },
  miniLabel: { fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 },
  emptyMini: { margin: 0, fontSize: 12, color: '#888' },
  miniCard: {
    background: '#fff',
    borderLeft: '3px solid #007bff',
    borderRadius: 4,
    padding: '0.4rem 0.55rem',
    marginBottom: 6,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: '1.25rem',
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 10,
  },
  input: {
    padding: '0.55rem 0.65rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: 'inherit',
  },
  primaryBtn: {
    flex: 1,
    padding: '0.55rem 0.75rem',
    borderRadius: 8,
    border: 'none',
    background: '#007bff',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    padding: '0.55rem 0.75rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    background: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
