/**
 * Parser regex dos 5 campos únicos de campanha (modo texto livre).
 */

const MONTHS =
  'janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro';

export const PATTERNS_CAMPANHA = {
  nome: {
    regex:
      /outono|black\s*friday|natal|primavera|ver[aã]o|anivers[aá]rio|halloween|p[aá]scoa|dia\s+das\s+m[aã]es|dia\s+dos\s+pais|rituais|lan[cç]amento|cole[cç][aã]o(?!\s+gold)/i,
    minConfianca: 70,
    descricao: 'Nome ou tema da campanha',
  },
  objetivo: {
    regex:
      /aumentar\s+(?:as\s+)?(?:vendas|convers[aã]o|engajamento)|gerar\s+(?:leads|tr[aá]fego|visibilidade|reconhecimento)|impulsionar|promover|vender\s+mais|vender\s+muito/i,
    minConfianca: 70,
    descricao: 'Objetivo comercial',
  },
  acoes_comerciais: {
    regex:
      /lan[cç]a(?:\s+a)?\s+linha[^.]{0,80}|promove[^.]{0,60}|desconto\s*\d+%?|oferece[^.]{0,60}|frete\s+gr[aá]tis|\d+%\s*(?:off|de\s+desconto)|cole[cç][aã]o[^.]{0,40}|promo[cç][aã]o[^.]{0,40}/i,
    minConfianca: 65,
    descricao: 'O que a marca faz durante a campanha',
  },
  talento_locacao: {
    regex:
      /(?:dona|dono|influencer|modelo|artista)[^.]{0,50}|(?:aparece)[^.]{0,40}|(?:interior|exterior|fachada|porta|rua|est[uú]dio|loja)[^.]{0,40}/i,
    minConfianca: 60,
    descricao: 'Quem aparece e onde grava',
  },
  data: {
    regex: new RegExp(
      `(\\d{1,2})\\s*[-–/]\\s*(\\d{1,2})(?:\\s*de\\s*(?:${MONTHS}))?|semana\\s+que\\s+vem|pr[oó]xima\\s+semana|(\\d{1,2})\\s*de\\s*(${MONTHS})`,
      'i'
    ),
    minConfianca: 70,
    descricao: 'Data de gravação',
  },
};

/**
 * Calcula confiança da detecção (0-100)
 */
export function calcularConfianca(campo, match, texto) {
  const matchLength = match[0].length;
  const escaped = match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const frequencia = (texto.match(new RegExp(escaped, 'gi')) || []).length;

  let confianca = 70;
  confianca += Math.min(15, matchLength / 4);
  confianca += Math.min(10, frequencia * 5);

  // Boosts por campo / padrões fortes
  if (campo === 'nome') {
    if (/black\s*friday|natal|outono|primavera|ver[aã]o|halloween|p[aá]scoa/i.test(match[0])) {
      confianca += 12;
    } else {
      confianca += 5;
    }
  }
  if (campo === 'objetivo' && /aumentar|vender|gerar|impulsionar/i.test(match[0])) {
    confianca += 10;
  }
  if (campo === 'acoes_comerciais' && /(desconto|\d+%|linha|cole[cç]|frete)/i.test(match[0])) {
    confianca += 10;
  }
  if (campo === 'data') {
    if (/\d/.test(match[0])) confianca += 12;
    if (/semana/i.test(match[0])) confianca += 5;
  }
  if (campo === 'talento_locacao' && /dona|dono|influencer|interior|loja/i.test(match[0])) {
    confianca += 8;
  }

  return Math.min(100, Math.round(confianca));
}

function capitalizeCampaignName(value) {
  const v = String(value || '').trim();
  if (/black\s*friday/i.test(v)) return 'Black Friday';
  if (!v) return v;
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function expandMatchContext(texto, match, campo) {
  const raw = match[0].trim();
  if (campo === 'nome') return capitalizeCampaignName(raw);

  // Tenta pegar a frase completa ao redor do match
  const start = Math.max(0, match.index);
  const sliceStart = texto.lastIndexOf('.', start - 1);
  const sliceEnd = texto.indexOf('.', start + raw.length);
  const sentence = texto
    .slice(sliceStart === -1 ? 0 : sliceStart + 1, sliceEnd === -1 ? texto.length : sliceEnd)
    .trim();

  if (campo === 'objetivo' && sentence.length > raw.length && sentence.length < 120) {
    return sentence.replace(/^objetivo\s+(é|e|eh)\s+/i, '').trim();
  }
  if (campo === 'acoes_comerciais' && sentence.length > raw.length && sentence.length < 160) {
    return sentence.trim();
  }
  if (campo === 'talento_locacao') {
    const talentBits = [];
    if (/dona|dono/i.test(texto)) talentBits.push(/dona/i.test(texto) ? 'Dona' : 'Dono');
    if (/influencer/i.test(texto)) talentBits.push('Influencer');
    if (/interior/i.test(texto)) talentBits.push('interior da loja');
    else if (/loja/i.test(texto)) talentBits.push('loja');
    if (talentBits.length) return talentBits.join(', ');
  }
  if (campo === 'data') {
    const range = texto.match(
      new RegExp(`(\\d{1,2})\\s*[-–/]\\s*(\\d{1,2})\\s*de\\s*(${MONTHS})`, 'i')
    );
    if (range) return `${range[1]}-${range[2]} de ${range[3].toLowerCase()}`;
    if (/semana\s+que\s+vem|pr[oó]xima\s+semana/i.test(texto)) {
      const weekday = texto.match(/segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo/i);
      return weekday ? `semana que vem, ${weekday[0].toLowerCase()}` : 'semana que vem';
    }
  }
  return raw;
}

/**
 * Parse texto livre e retorna campos detectados
 * @param {string} texto
 * @returns {Object} { campo: { valor, confianca, match, descricao } }
 */
export function parseBriefingCampanha(texto = '') {
  const resultado = {};
  const input = String(texto || '');
  if (!input.trim()) return resultado;

  for (const [campo, config] of Object.entries(PATTERNS_CAMPANHA)) {
    const match = input.match(config.regex);
    if (!match) continue;

    const confianca = calcularConfianca(campo, match, input);
    if (confianca >= config.minConfianca) {
      resultado[campo] = {
        valor: expandMatchContext(input, match, campo),
        confianca,
        match: match[0],
        descricao: config.descricao,
      };
    }
  }

  return resultado;
}

/**
 * Converte resultado do parser em valores de formulário editáveis
 */
export function parsedToFormValues(parsed = {}) {
  return {
    nome_campanha: parsed.nome?.valor || '',
    objetivo: parsed.objetivo?.valor || '',
    acoes_comerciais: parsed.acoes_comerciais?.valor || '',
    talento_locacao: parsed.talento_locacao?.valor || '',
    data_gravacao_texto: parsed.data?.valor || '',
    data_gravacao_inicio: '',
    data_gravacao_fim: '',
  };
}

export default parseBriefingCampanha;
