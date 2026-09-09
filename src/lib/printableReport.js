/**
 * Gera HTML de relatório e abre diálogo de impressão / Salvar como PDF.
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{ title: string, subtitle?: string, sections: Array<{ heading: string, html?: string, paragraphs?: string[] }> }} doc
 */
export function openPrintableReport(doc) {
  const sectionsHtml = (doc.sections || [])
    .map((s) => {
      const body =
        s.html ||
        (s.paragraphs || [])
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('');
      return `<section><h2>${escapeHtml(s.heading)}</h2>${body}</section>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; margin: 40px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 28px; }
    h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    p, li { font-size: 13px; margin: 0 0 8px; }
    ul { padding-left: 18px; margin: 0 0 8px; }
    .meta { font-size: 12px; color: #475569; }
    @media print {
      body { margin: 16mm; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  ${doc.subtitle ? `<p class="sub">${escapeHtml(doc.subtitle)}</p>` : ''}
  ${sectionsHtml}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) {
    throw new Error('Pop-up bloqueado. Permita pop-ups para exportar o PDF.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return win;
}

/**
 * Relatório mensal de ciclo para o cliente.
 */
export function buildCycleReportPrintDoc({ cycle, client, service, learnings = [] }) {
  const closing = cycle?.closing_data || {};
  const results = closing.results || {};
  const clientName = client?.name || 'Cliente';
  const serviceName = service?.name || 'Serviço';
  const period = cycle?.cyclePeriod || '—';

  const metricLines = [
    results.deliveryRate != null && `Taxa de entrega: ${results.deliveryRate}%`,
    results.satisfactionScore != null && `Satisfação: ${results.satisfactionScore}/5`,
    results.hoursPlanned != null &&
      `Horas: ${results.hoursActual ?? '—'} / ${results.hoursPlanned} planejadas`,
  ].filter(Boolean);

  const learningItems = (learnings || [])
    .slice(0, 8)
    .map((l) => l.title || l.description || l.insight)
    .filter(Boolean);

  return {
    title: `Relatório mensal — ${clientName}`,
    subtitle: `${serviceName} · Ciclo ${period}`,
    sections: [
      {
        heading: 'Resumo',
        paragraphs: [
          closing.achievements || 'Ciclo concluído. Detalhes de conquistas não preenchidos no fechamento.',
          closing.challenges ? `Desafios: ${closing.challenges}` : null,
          closing.nextMonthFocus ? `Foco do próximo mês: ${closing.nextMonthFocus}` : null,
        ].filter(Boolean),
      },
      metricLines.length
        ? {
            heading: 'Métricas',
            html: `<ul>${metricLines.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`,
          }
        : null,
      learningItems.length
        ? {
            heading: 'Aprendizados',
            html: `<ul>${learningItems.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`,
          }
        : null,
      {
        heading: 'Próximos passos',
        paragraphs: [
          closing.nextActions ||
            'Agendar reunião de alinhamento e gerar o plano do próximo ciclo no Evocto.',
        ],
      },
    ].filter(Boolean),
  };
}

/**
 * Histórico de decisões do cliente (mês a mês / por tarefas).
 */
export function buildClientHistoryPrintDoc({ client, periodLabel, entries = [] }) {
  const clientName = client?.name || 'Cliente';
  const byMonth = new Map();

  for (const e of entries) {
    const key = e.monthKey || 'Geral';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(e);
  }

  const sections = [...byMonth.entries()].map(([month, items]) => ({
    heading: month,
    html: `<ul>${items
      .map(
        (i) =>
          `<li><span class="meta">${escapeHtml(i.dateLabel || '')}</span> — <strong>${escapeHtml(
            i.actor || 'Sistema'
          )}</strong>: ${escapeHtml(i.text)}</li>`
      )
      .join('')}</ul>`,
  }));

  if (sections.length === 0) {
    sections.push({
      heading: 'Histórico',
      paragraphs: ['Nenhuma decisão registrada no período selecionado.'],
    });
  }

  return {
    title: `Histórico de decisões — ${clientName}`,
    subtitle: periodLabel || 'Exportação Evocto',
    sections,
  };
}

export default openPrintableReport;
