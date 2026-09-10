import { useMemo, useState } from 'react';

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

function produtoNome(p) {
  if (p == null) return '';
  if (typeof p === 'string') return p;
  return p.nome || p.name || p.linha || '';
}

function cicloBadgeStyle() {
  return {
    display: 'inline-block',
    padding: '0.2rem 0.55rem',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: '#007bff',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  };
}

function campaignKey(c, index) {
  return `${c?.ano ?? ''}-${c?.mes ?? ''}-${c?.nome_campanha ?? index}`;
}

/**
 * Sidebar de contexto enriquecido para o agent de campanha.
 *
 * @param {{
 *   contextoEnriquecido: object,
 *   conversationStatus?: string,
 * }} props
 */
export default function ContextSidebar({
  contextoEnriquecido,
  conversationStatus,
}) {
  const ctx = contextoEnriquecido || {};
  const ultima = ctx.ultima_campanha || null;
  const historico = Array.isArray(ctx.campanhas_anteriores)
    ? ctx.campanhas_anteriores.slice(0, 6)
    : [];
  const produtos = useMemo(() => {
    const list = Array.isArray(ctx.empresa?.produtos)
      ? ctx.empresa.produtos
      : Array.isArray(ctx.produtos)
        ? ctx.produtos
        : [];
    return list.map(produtoNome).filter(Boolean);
  }, [ctx.empresa?.produtos, ctx.produtos]);

  const [expandedUltima, setExpandedUltima] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const [hoverUltima, setHoverUltima] = useState(false);

  const mesLabel = `${MES_NOMES[ctx.mesAtual] || ctx.mesAtual || '—'}/${ctx.anoAtual || '—'}`;

  const toggleKey = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      style={{
        background: '#f9f9f9',
        width: '100%',
        maxWidth: 300,
        padding: '1.5rem',
        borderRadius: 8,
        color: '#1a1a1a',
        overflowY: 'auto',
        maxHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      <section style={{ marginBottom: '1.25rem' }}>
        <h3 style={sectionTitle}>Resumo</h3>
        <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: 15, color: '#111' }}>
          {ctx.empresa?.nome || '—'}
        </p>
        <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#555' }}>{mesLabel}</p>
        {ctx.ciclo_proximo ? (
          <span style={cicloBadgeStyle()}>{ctx.ciclo_proximo}</span>
        ) : null}
      </section>

      <section style={{ marginBottom: '1.25rem' }}>
        <h3 style={sectionTitle}>Última Campanha</h3>
        {ultima ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpandedUltima((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpandedUltima((v) => !v);
              }
            }}
            onMouseEnter={() => setHoverUltima(true)}
            onMouseLeave={() => setHoverUltima(false)}
            style={{
              ...cardBase,
              borderLeft: '3px solid #007bff',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, color: '#111' }}>{ultima.nome_campanha || '—'}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              {ultima.ciclo_comercial || '—'}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#111' }}>
              Nota:{' '}
              <span style={{ fontWeight: 700 }}>
                {ultima.resultado?.nota_geral ?? '—'}/10
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Vendas {ultima.resultado?.vendas_realizado ?? '—'}% · Engajamento{' '}
              {ultima.resultado?.engajamento_realizado ?? '—'}%
            </div>

            <div
              style={{
                ...detailsBox,
                maxHeight: hoverUltima || expandedUltima ? 120 : 0,
                opacity: hoverUltima || expandedUltima ? 1 : 0,
              }}
            >
              <div style={{ paddingTop: 8, fontSize: 12, color: '#1a1a1a' }}>
                <strong>O que funcionou:</strong>{' '}
                {ultima.resultado?.o_que_funcionou || '—'}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Nenhuma campanha anterior</p>
        )}
      </section>

      <section style={{ marginBottom: '1.25rem' }}>
        <h3 style={sectionTitle}>Histórico</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {historico.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Sem histórico</p>
          ) : (
            historico.map((c, index) => {
              const key = campaignKey(c, index);
              const open = expandedKeys.has(key);
              const isUltima = index === 0;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleKey(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleKey(key);
                    }
                  }}
                  style={{
                    ...cardBase,
                    borderLeft: `3px solid ${isUltima ? '#007bff' : '#c8c8c8'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>
                      {c.nome_campanha || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: '#111', fontWeight: 700 }}>
                      {c.resultado?.nota_geral ?? '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                    {c.mes}/{c.ano}
                  </div>

                  <div
                    style={{
                      ...detailsBox,
                      maxHeight: open ? 220 : 0,
                      opacity: open ? 1 : 0,
                    }}
                  >
                    <div style={{ paddingTop: 8, fontSize: 12, color: '#1a1a1a', lineHeight: 1.45 }}>
                      <div>
                        <strong>Ciclo:</strong> {c.ciclo_comercial || '—'}
                      </div>
                      <div>
                        <strong>Vendas:</strong> {c.resultado?.vendas_realizado ?? '—'}%
                      </div>
                      <div>
                        <strong>Engajamento:</strong>{' '}
                        {c.resultado?.engajamento_realizado ?? '—'}%
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <strong>Funcionou:</strong> {c.resultado?.o_que_funcionou || '—'}
                      </div>
                      <div>
                        <strong>Não funcionou:</strong>{' '}
                        {c.resultado?.o_que_nao_funcionou || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section style={{ marginBottom: '1.25rem' }}>
        <h3 style={sectionTitle}>Padrões</h3>
        <p style={{ margin: '0 0 0.35rem', fontSize: 13, color: '#1a1a1a' }}>
          Melhor VENDAS:{' '}
          <strong>
            {ctx.padroes_performance?.melhor_ciclo_vendas ||
              ctx.padroes?.melhor_ciclo_vendas ||
              '—'}
          </strong>
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#1a1a1a' }}>
          Melhor ENGAJAMENTO:{' '}
          <strong>
            {ctx.padroes_performance?.melhor_ciclo_engajamento ||
              ctx.padroes?.melhor_ciclo_engajamento ||
              '—'}
          </strong>
        </p>
      </section>

      <section style={{ marginBottom: conversationStatus ? '1.25rem' : 0 }}>
        <h3 style={sectionTitle}>Produtos</h3>
        {produtos.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Nenhum produto</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.6, color: '#1a1a1a' }}>
            {produtos.map((nome) => (
              <li key={nome}>{nome}</li>
            ))}
          </ul>
        )}
      </section>

      {conversationStatus ? (
        <section>
          <p style={{ margin: 0, fontSize: 12, color: '#555' }}>
            Status:{' '}
            <strong style={{ textTransform: 'capitalize', color: '#111' }}>
              {conversationStatus}
            </strong>
          </p>
        </section>
      ) : null}
    </aside>
  );
}

const sectionTitle = {
  margin: '0 0 0.6rem',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#007bff',
};

const cardBase = {
  background: '#fff',
  borderRadius: 6,
  padding: '0.75rem 0.85rem',
};

const detailsBox = {
  overflow: 'hidden',
  transition: 'max-height 0.25s ease, opacity 0.25s ease',
};
