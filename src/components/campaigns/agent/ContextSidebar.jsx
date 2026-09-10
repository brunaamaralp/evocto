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

function campaignKey(c, index) {
  return `${c?.ano ?? ''}-${c?.mes ?? ''}-${c?.nome_campanha ?? index}`;
}

/**
 * Sidebar de contexto — versão enxuta: próximo passo + sinais úteis.
 * Histórico/produtos ficam atrás de detalhes colapsáveis.
 *
 * @param {{
 *   contextoEnriquecido: object,
 *   conversationStatus?: string,
 *   compact?: boolean,
 * }} props
 */
export default function ContextSidebar({
  contextoEnriquecido,
  conversationStatus,
  compact = false,
}) {
  const ctx = contextoEnriquecido || {};
  const status = String(conversationStatus || ctx.status || '').toLowerCase();
  const isRefinada = status === 'refinada';
  const isFinalizada = status === 'finalizada';
  const ultima = ctx.ultima_campanha || null;
  const historico = Array.isArray(ctx.campanhas_anteriores)
    ? ctx.campanhas_anteriores.slice(0, 4)
    : [];
  const produtos = useMemo(() => {
    const list = Array.isArray(ctx.empresa?.produtos)
      ? ctx.empresa.produtos
      : Array.isArray(ctx.produtos)
        ? ctx.produtos
        : [];
    return list.map(produtoNome).filter(Boolean);
  }, [ctx.empresa?.produtos, ctx.produtos]);

  const [showDetails, setShowDetails] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const mesLabel = `${MES_NOMES[ctx.mesAtual] || ctx.mesAtual || '—'}/${ctx.anoAtual || '—'}`;
  const melhorVendas =
    ctx.padroes_performance?.melhor_ciclo_vendas ||
    ctx.padroes?.melhor_ciclo_vendas ||
    null;
  const melhorEngaj =
    ctx.padroes_performance?.melhor_ciclo_engajamento ||
    ctx.padroes?.melhor_ciclo_engajamento ||
    null;

  const toggleKey = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const nextStepCopy = isFinalizada
    ? 'Campanha criada. Siga no ciclo.'
    : isRefinada
      ? 'Use Criar campanha no chat (brief + ciclo).'
      : 'Refine no chat até o status Refinada.';

  return (
    <aside
      style={{
        background: compact ? 'transparent' : '#f9f9f9',
        width: '100%',
        padding: compact ? '0.55rem 0.65rem 0.85rem' : '1rem',
        color: '#1a1a1a',
        overflowY: 'auto',
        maxHeight: '100%',
        boxSizing: 'border-box',
        flex: 1,
        minHeight: 0,
      }}
    >
      <section style={{ marginBottom: '0.85rem' }}>
        <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: 13, color: '#111' }}>
          {ctx.empresa?.nome || '—'}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
          {mesLabel}
          {ctx.ciclo_proximo ? ` · ${String(ctx.ciclo_proximo).toUpperCase()}` : ''}
        </p>
      </section>

      <section style={nextCard}>
        <h3 style={sectionTitle}>Próximo passo</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#333', lineHeight: 1.4 }}>
          {nextStepCopy}
        </p>
      </section>

      {ultima ? (
        <section style={{ marginBottom: '0.85rem' }}>
          <h3 style={sectionTitle}>Última campanha</h3>
          <div style={signalCard}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#111' }}>
              {ultima.nome_campanha || '—'}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              Nota {ultima.resultado?.nota_geral ?? '—'}/10
              {ultima.ciclo_comercial ? ` · ${ultima.ciclo_comercial}` : ''}
            </div>
          </div>
        </section>
      ) : null}

      {(melhorVendas || melhorEngaj) && (
        <section style={{ marginBottom: '0.85rem' }}>
          <h3 style={sectionTitle}>Padrões</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#333', lineHeight: 1.4 }}>
            {melhorVendas ? (
              <>
                Vendas: <strong>{melhorVendas}</strong>
              </>
            ) : null}
            {melhorVendas && melhorEngaj ? ' · ' : null}
            {melhorEngaj ? (
              <>
                Engaj.: <strong>{melhorEngaj}</strong>
              </>
            ) : null}
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        style={detailsToggle}
      >
        {showDetails ? 'Ocultar detalhes' : 'Mais contexto'}
      </button>

      {showDetails ? (
        <div style={{ marginTop: '0.75rem' }}>
          <section style={{ marginBottom: '0.85rem' }}>
            <h3 style={sectionTitle}>Histórico</h3>
            {historico.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#555' }}>Sem histórico</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {historico.map((c, index) => {
                  const key = campaignKey(c, index);
                  const open = expandedKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleKey(key)}
                      style={{ ...signalCard, textAlign: 'left', cursor: 'pointer', width: '100%' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>
                          {c.nome_campanha || '—'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>
                          {c.resultado?.nota_geral ?? '—'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        {c.mes}/{c.ano}
                      </div>
                      {open ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#444', lineHeight: 1.4 }}>
                          Ciclo: {c.ciclo_comercial || '—'}
                          <br />
                          Funcionou: {c.resultado?.o_que_funcionou || '—'}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 style={sectionTitle}>Produtos</h3>
            {produtos.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#555' }}>Nenhum produto</p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#333', lineHeight: 1.45 }}>
                {produtos.slice(0, 6).join(' · ')}
                {produtos.length > 6 ? ` · +${produtos.length - 6}` : ''}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </aside>
  );
}

const sectionTitle = {
  margin: '0 0 0.4rem',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#007bff',
};

const nextCard = {
  marginBottom: '0.85rem',
  background: '#fff',
  borderRadius: 8,
  padding: '0.65rem 0.7rem',
  border: '1px solid #e8e8e8',
};

const signalCard = {
  background: '#fff',
  borderRadius: 6,
  padding: '0.55rem 0.65rem',
  border: '1px solid #eee',
  borderLeft: '3px solid #007bff',
};

const detailsToggle = {
  border: 'none',
  background: 'transparent',
  color: '#007bff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  textAlign: 'left',
};
