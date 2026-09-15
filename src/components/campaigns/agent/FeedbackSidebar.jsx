/**
 * PI-3 — últimas campanhas com aprendizado/feedback (Nova Campanha / Brainstorm).
 *
 * @param {{
 *   items?: Array<{
 *     id?: string|null,
 *     label?: string,
 *     title?: string,
 *     mes?: number|null,
 *     ano?: number|null,
 *     aprendizado?: string,
 *     feedbackCliente?: string,
 *     resultado?: object|null,
 *     ciclo?: string|null,
 *   }>,
 *   compact?: boolean,
 * }} props
 */
export default function FeedbackSidebar({ items = [], compact = false }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <aside
      style={{
        padding: compact ? '8px 10px 12px' : '12px',
        fontSize: 12,
        color: '#334155',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#64748b',
        }}
      >
        Feedback recente
      </p>

      {list.length === 0 ? (
        <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.4 }}>
          Ainda sem aprendizados gravados. Após o fechamento no Workspace, as
          últimas 3 campanhas aparecem aqui.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
          {list.map((item, idx) => {
            const key = item.id || `${item.ano}-${item.mes}-${idx}`;
            const meta = [
              item.label,
              item.ano,
              item.ciclo ? String(item.ciclo).replace(/_/g, ' ') : null,
            ]
              .filter(Boolean)
              .join(' · ');
            const nota = item.resultado?.nota_geral;
            return (
              <li
                key={key}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  background: '#fff',
                  padding: '8px 10px',
                }}
              >
                <p
                  style={{
                    margin: '0 0 2px',
                    fontWeight: 600,
                    color: '#0f172a',
                    lineHeight: 1.3,
                  }}
                >
                  {item.title || 'Campanha'}
                  {nota != null ? ` · nota ${nota}` : ''}
                </p>
                {meta ? (
                  <p style={{ margin: '0 0 6px', fontSize: 10, color: '#94a3b8' }}>
                    {meta}
                  </p>
                ) : null}
                {item.aprendizado ? (
                  <p style={{ margin: '0 0 4px', lineHeight: 1.35 }}>
                    <span style={{ color: '#64748b' }}>Aprendizado: </span>
                    {item.aprendizado}
                  </p>
                ) : null}
                {item.feedbackCliente ? (
                  <p style={{ margin: 0, lineHeight: 1.35 }}>
                    <span style={{ color: '#64748b' }}>Cliente: </span>
                    {item.feedbackCliente}
                  </p>
                ) : null}
                {!item.aprendizado &&
                !item.feedbackCliente &&
                item.resultado?.o_que_funcionou ? (
                  <p style={{ margin: 0, lineHeight: 1.35 }}>
                    <span style={{ color: '#64748b' }}>Funcionou: </span>
                    {item.resultado.o_que_funcionou}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
