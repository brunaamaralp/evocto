import { mesParaCicloMap, normalizeTemaMesSugestao } from './campanhaAnualSchema.js';

/**
 * Mock local de sugestão de temas (DEV / VITE_CAMPANHA_IA_MOCK=1).
 */
export function buildMockTemasFromInput(inputIa) {
  const map = mesParaCicloMap(inputIa.ciclos_comerciais);
  const seedsByMes = new Map(
    (inputIa.briefings_mes || []).map((s) => [Number(s.mes), s])
  );
  const produtos = inputIa.produtos_linhas || [];

  const temas = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const seed = seedsByMes.get(mes) || {};
    const est = seed['01_estrategia'] || {};
    const con = seed['02_conceito'] || {};
    const ciclo = est.ciclo_comercial || map[mes] || 'reconhecimento';
    const produto =
      est.produto_focal ||
      produtos[mes % Math.max(produtos.length, 1)]?.nome ||
      'Linha principal';
    const baseNome =
      seed.nome_campanha_sugerido ||
      con.nome_sugerido ||
      `${ciclo.charAt(0).toUpperCase() + ciclo.slice(1)} ${mes}`;

    return normalizeTemaMesSugestao({
      mes,
      ciclo,
      origem: 'ia',
      selecionado_id: 'principal',
      selecionado: true,
      opcoes: [
        {
          id: 'principal',
          titulo: baseNome,
          ideia_central:
            con.ideia_central ||
            `Tema de ${ciclo} com foco em ${produto} (mock).`,
          produto_focal: produto,
        },
        {
          id: 'alternativa',
          titulo: `${baseNome} · Alt`,
          ideia_central: `Alternativa de ${ciclo} para ${produto} (mock).`,
          produto_focal: produto,
        },
      ],
    });
  });

  return { status: 'sucesso', temas };
}
