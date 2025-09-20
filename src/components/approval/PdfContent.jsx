import React from 'react';

// Este componente é apenas para estruturar o HTML que será enviado para a geração do PDF.
// Ele não é renderizado diretamente na UI.
export default function PdfContent({ version, project, client }) {
  const content = version.content_json || {};
  const insights = version.insights_json || {};
  const scope = version.scope_json || {};
  const titles = version.title_suggestions_json || {};
  const inScopeItems = scope.deliverables?.filter(d => d.type === 'in_scope') || [];
  const outScopeItems = scope.deliverables?.filter(d => d.type === 'out_of_scope') || [];

  return (
    `<html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: auto; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
          .header h1 { font-size: 28px; color: #111; margin: 0; }
          .header p { font-size: 14px; color: #666; margin: 5px 0; }
          .section-title { font-size: 20px; font-weight: 600; color: #005A9C; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-top: 40px; margin-bottom: 20px; }
          .sub-section-title { font-size: 16px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          .scope-col h3 { font-size: 16px; margin-bottom: 15px; }
          .scope-item { border-left: 3px solid; padding: 10px 15px; margin-bottom: 15px; background-color: #fcfcfc; }
          .scope-item p { margin: 0 0 5px 0; font-weight: 500; }
          .scope-item small { color: #555; font-style: italic; }
          .in-scope { border-color: #22c55e; }
          .in-scope h3 { color: #166534; }
          .out-of-scope { border-color: #ef4444; }
          .out-of-scope h3 { color: #991b1b; }
          .badge { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 600; border-radius: 12px; margin-right: 5px; text-transform: uppercase; }
          .badge-channel { background-color: #e0f2fe; color: #0c4a6e; }
          .badge-effort { background-color: #ffedd5; color: #9a3412; }
          .badge-impact { background-color: #dcfce7; color: #166534; }
          .guardrail { border-left: 3px solid #f59e0b; padding: 10px 15px; margin-bottom: 10px; background-color: #fffbeb; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #888; }
          .footer code { background: #eee; padding: 2px 4px; border-radius: 3px; }
          .title-item { border: 1px solid #ddd; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
          .approved-title { border-color: #2563eb; background-color: #eff6ff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${version.approved_title || project.title}</h1>
            <p><strong>Cliente:</strong> ${client.name} | <strong>Projeto:</strong> ${project.title}</p>
            <p><strong>Versão:</strong> ${version.version_number} | <strong>Data:</strong> ${new Date(version.created_date).toLocaleString('pt-BR')}</p>
          </div>

          <h2 class="section-title">Resumo do Projeto</h2>
          <p><strong>Objetivo:</strong> ${content.objectives || 'Não definido'}</p>
          <p><strong>Persona:</strong> ${insights.persona || 'Não definido'}</p>

          <h2 class="section-title">Insights Estratégicos</h2>
          <div class="grid">
            <div>
              <h3 class="sub-section-title">Principais Necessidades</h3>
              <ul>${(insights.dores || []).map(d => `<li>${d}</li>`).join('')}</ul>
            </div>
            <div>
              <h3 class="sub-section-title">Objeções Comuns</h3>
              <ul>${(insights.objecoes || []).map(o => `<li>${o}</li>`).join('')}</ul>
            </div>
          </div>
          ${insights.tom_de_voz ? `<p><strong>Tom de voz recomendado:</strong> ${insights.tom_de_voz}</p>` : ''}


          <h2 class="section-title">Escopo do Projeto</h2>
          <div class="grid">
            <div class="scope-col in-scope">
              <h3>✅ Incluído no Projeto (In Scope)</h3>
              ${inScopeItems.map(item => `
                <div class="scope-item in-scope">
                  <p>${item.description}</p>
                  <div>
                    ${item.channel ? `<span class="badge badge-channel">${item.channel}</span>` : ''}
                    ${item.effort ? `<span class="badge badge-effort">Esforço: ${item.effort}</span>` : ''}
                    ${item.impact ? `<span class="badge badge-impact">Impacto: ${item.impact}</span>` : ''}
                  </div>
                  <small>${item.rationale || ''}</small>
                </div>
              `).join('')}
            </div>
            <div class="scope-col out-of-scope">
              <h3>❌ Fora do Projeto (Out of Scope)</h3>
              ${outScopeItems.map(item => `
                <div class="scope-item out-of-scope">
                  <p>${item.description}</p>
                  <small>${item.rationale || ''}</small>
                </div>
              `).join('')}
            </div>
          </div>

          <h2 class="section-title">Diretrizes (Guardrails)</h2>
          ${(scope.guardrails || []).map(g => `<div class="guardrail"><p>${g}</p></div>`).join('')}
          
          ${titles.titles?.length > 0 ? `
          <h2 class="section-title">Sugestões de Título</h2>
          ${titles.titles.map(t => `
            <div class="title-item ${version.approved_title === t ? 'approved-title' : ''}">
              <p>${t}</p>
            </div>
          `).join('')}` : ''}

          <div class="footer">
            <p>Documento aprovado por <strong>${version.approved_by}</strong> em ${new Date(version.approved_at).toLocaleString('pt-BR')}.</p>
            <p>Hash de Integridade (SHA-256): <code>${version.version_hash}</code></p>
          </div>
        </div>
      </body>
    </html>`
  );
}