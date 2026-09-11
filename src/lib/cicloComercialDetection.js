/**
 * Detecção e resolução de ciclo comercial a partir da ideia (ideia → ciclo).
 * Mantém ciclo_comercial como alias operacional de ciclo_final.
 */
import { CICLOS_COMERCIAIS, normalizeCiclo } from '@/lib/campanhaAnualSchema';

export { CICLOS_COMERCIAIS };

/** Palavras-chave por ciclo (PT-BR). Scores acumulam por match. */
export const CICLO_DETECTION_PATTERNS = Object.freeze({
  vendas: [
    /\bvendas?\b/i,
    /\boferta\b/i,
    /\bpromo(?:[cç][aã]o|cional)?\b/i,
    /\bdesconto\b/i,
    /\burg[eê]ncia\b/i,
    /\bconvers[aã]o\b/i,
    /\bcheckout\b/i,
    /\bfrete\s+gr[aá]tis\b/i,
    /\b%?\s*off\b/i,
    /\bescassez\b/i,
    /\bcontagem\s+regressiva\b/i,
    /\bblack\s*friday\b/i,
    /\blançamento\s+comercial\b/i,
    /\bcta\b/i,
    /\bcomprar\b/i,
  ],
  engajamento: [
    /\bengajamento\b/i,
    /\bcomunidade\b/i,
    /\bugc\b/i,
    /\blive\b/i,
    /\bwhatsapp\b/i,
    /\bparticipa(?:r|ção)\b/i,
    /\binteraja?\b/i,
    /\bcoment[aá]rios?\b/i,
    /\bdesafio\b/i,
    /\benquete\b/i,
    /\bsurpresa\b/i,
    /\breels?\b/i,
    /\bstories?\b/i,
    /\bdm\b/i,
    /\bcaixa\s+de\s+perguntas\b/i,
  ],
  autoridade: [
    /\bautoridade\b/i,
    /\beduca(?:r|ção|cional)\b/i,
    /\bposicionamento\b/i,
    /\bconfian[cç]a\b/i,
    /\bexpertise\b/i,
    /\bbastidores\b/i,
    /\bentrevista\b/i,
    /\bcomo\s+fazer\b/i,
    /\bdica(?:s)?\b/i,
    /\btutorial\b/i,
    /\bcase\b/i,
    /\bprova\s+social\b/i,
    /\bespecialista\b/i,
  ],
  reconhecimento: [
    /\breconhecimento\b/i,
    /\bbrand(?:ing)?\b/i,
    /\bawareness\b/i,
    /\bidentidade\b/i,
    /\bmarca\b/i,
    /\blembran[cç]a\b/i,
    /\bvisibilidade\b/i,
    /\btop\s+of\s+mind\b/i,
    /\binstitucional\b/i,
    /\bcampanha\s+de\s+imagem\b/i,
  ],
});

/**
 * Analisa texto livre e sugere ciclo comercial.
 * @returns {{ ciclo: string, confianca: number, scores: Record<string, number>, matches: string[] }}
 */
export function inferCicloComercialFromText(...parts) {
  const text = parts
    .flat()
    .filter((p) => p != null && String(p).trim())
    .map((p) => String(p))
    .join('\n');

  if (!text.trim()) {
    return { ciclo: '', confianca: 0, scores: {}, matches: [] };
  }

  const scores = {};
  const matches = [];

  for (const ciclo of CICLOS_COMERCIAIS) {
    let score = 0;
    for (const re of CICLO_DETECTION_PATTERNS[ciclo] || []) {
      const found = text.match(re);
      if (found) {
        score += 1;
        matches.push(`${ciclo}:${found[0]}`);
      }
    }
    scores[ciclo] = score;
  }

  let best = '';
  let bestScore = 0;
  for (const ciclo of CICLOS_COMERCIAIS) {
    if ((scores[ciclo] || 0) > bestScore) {
      bestScore = scores[ciclo];
      best = ciclo;
    }
  }

  if (!best || bestScore <= 0) {
    return { ciclo: '', confianca: 0, scores, matches };
  }

  // Confiança: base 55 + 12 por hit, capped; boost se bem à frente do 2º
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const second = sorted[1] || 0;
  let confianca = Math.min(95, 55 + bestScore * 12);
  if (bestScore >= second + 2) confianca = Math.min(98, confianca + 8);
  if (bestScore === 1 && second === 0) confianca = Math.min(confianca, 68);

  return {
    ciclo: best,
    confianca: Math.round(confianca),
    scores,
    matches,
  };
}

/**
 * Resolve ciclo operacional a partir de plano + detecção + escolha humana.
 */
export function resolveCicloComercial({
  ciclo_plano = '',
  ciclo_detectado = '',
  escolha = null,
  confianca = 0,
} = {}) {
  const plano = normalizeCiclo(ciclo_plano) || '';
  const detectado = normalizeCiclo(ciclo_detectado) || '';
  const chosen = escolha != null ? normalizeCiclo(escolha) || '' : null;

  let ciclo_final = '';
  let ciclo_override = false;

  if (chosen) {
    ciclo_final = chosen;
    ciclo_override = Boolean(plano && chosen !== plano);
  } else if (detectado && (!plano || detectado === plano || confianca >= 75)) {
    ciclo_final = detectado;
    ciclo_override = Boolean(plano && detectado !== plano);
  } else if (plano) {
    ciclo_final = plano;
    ciclo_override = false;
  } else if (detectado) {
    ciclo_final = detectado;
    ciclo_override = false;
  }

  return {
    ciclo_plano: plano,
    ciclo_detectado: detectado,
    ciclo_final,
    ciclo_override,
    ciclo_comercial: ciclo_final,
    confianca: Number(confianca) || 0,
    precisa_validacao: Boolean(plano && detectado && plano !== detectado),
  };
}

/** Normaliza bloco de ciclo em seeds/temas/briefs. */
export function normalizeCicloResolucao(raw = {}, fallbackPlano = '') {
  const plano = normalizeCiclo(raw.ciclo_plano || fallbackPlano) || '';
  const detectado = normalizeCiclo(raw.ciclo_detectado) || '';
  const final =
    normalizeCiclo(raw.ciclo_final) ||
    normalizeCiclo(raw.ciclo_comercial) ||
    normalizeCiclo(raw.ciclo) ||
    '';
  const override =
    raw.ciclo_override === true ||
    (Boolean(plano && final) && plano !== final);

  return {
    ciclo_plano: plano,
    ciclo_detectado: detectado,
    ciclo_final: final || plano || detectado || '',
    ciclo_override: override,
    ciclo_comercial: final || plano || detectado || '',
    ciclo_confianca: Number(raw.ciclo_confianca ?? raw.confianca) || 0,
  };
}

/**
 * Aplica detecção + resolução a partir de textos de ideia.
 */
export function detectAndResolveCiclo({
  textoParts = [],
  ciclo_plano = '',
  escolha = null,
  existing = null,
} = {}) {
  const inferred = inferCicloComercialFromText(...textoParts);
  return resolveCicloComercial({
    ciclo_plano: ciclo_plano || existing?.ciclo_plano || '',
    ciclo_detectado: inferred.ciclo || existing?.ciclo_detectado || '',
    escolha:
      escolha ??
      (existing?.ciclo_override ? existing.ciclo_final : null),
    confianca: inferred.confianca || existing?.ciclo_confianca || 0,
  });
}
