/**
 * Aba Histórico — versões / eventos gravados no Brief da campanha.
 */
export default function CampaignWorkspaceHistorico({ historico = [] }) {
  const rows = Array.isArray(historico) ? [...historico].reverse() : [];

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Histórico</h2>
        <p className="text-sm text-slate-500 mt-1">
          Versões e eventos registrados nesta campanha.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((entry, idx) => {
            const when = entry?.data || entry?.at || entry?.created_at || null;
            const action = entry?.acao || entry?.action || 'evento';
            const field = entry?.campo || entry?.field || null;
            return (
              <li
                key={`${when || 'e'}-${idx}`}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800 capitalize">
                    {String(action).replace(/_/g, ' ')}
                  </span>
                  {when ? (
                    <time className="text-xs text-slate-500 shrink-0">
                      {new Date(when).toLocaleString('pt-BR')}
                    </time>
                  ) : null}
                </div>
                {field ? (
                  <p className="text-xs text-slate-500 mt-1">Campo: {field}</p>
                ) : null}
                {(entry?.antes != null || entry?.depois != null) && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                    {entry.antes != null ? `Antes: ${String(entry.antes)}` : ''}
                    {entry.antes != null && entry.depois != null ? ' → ' : ''}
                    {entry.depois != null ? `Depois: ${String(entry.depois)}` : ''}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
