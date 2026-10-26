/**
 * Kit de marca — Estudio Narrativa (tokens canonicos).
 * Espelha skills/narrativa-marca para prompts e UI.
 */

export const NARRATIVA_BRAND = {
  name: 'narrativa',
  displayName: 'Estudio Narrativa',
  colors: {
    burntGrape: '#C02807',
    orangeRose: '#FF643D',
    skyBlue: '#BBD9F4',
    cloud: '#FFFCFC',
    /** Aliases legados (materiais / skill) */
    vinho: '#C02807',
    vinhoEscuro: '#8A1C05',
    creme: '#FFFCFC',
    coral: '#FF643D',
    lima: '#BBD9F4',
    preto: '#1A0D0B',
  },
  fonts: {
    display: 'Archivo ExtraBold',
    body: 'Manrope',
    bodyBold: 'Manrope Bold',
  },
  assets: {
    logoVinho: 'logo_vinho.png',
    logoCreme: 'logo_creme.png',
    logoVinhoSvg: 'logo_vinho.svg',
    logoCremeSvg: 'logo_creme.svg',
    isotipoVinho: 'isotipo_vinho.svg',
    aspasCereja: 'aspas_cereja.png',
    aspasAzulClaro: 'aspas_azul_claro.png',
    aspasAzulJeans: 'aspas_azul_jeans.png',
    rrLaranja: 'rr_laranja.png',
    rrLima: 'rr_lima.png',
    rrBrush: 'rr_brush.png',
    rrGiz: 'rr_giz.png',
    fundo: 'fundo.jpg',
  },
  skillDir: 'skills/narrativa-marca',
};

/**
 * Bloco de diretrizes para system/user prompts de geracao de material.
 */
export function narrativaBrandPromptBlock() {
  const c = NARRATIVA_BRAND.colors;
  const f = NARRATIVA_BRAND.fonts;
  return [
    '## Kit de marca — Estudio Narrativa (obrigatorio)',
    '',
    `Agencia: ${NARRATIVA_BRAND.displayName}. Logotipo sempre em minusculas ("narrativa").`,
    '',
    'Cores oficiais (nao invente outras):',
    `- burnt grape ${c.burntGrape} (primaria)`,
    `- orange rose ${c.orangeRose} (secundaria)`,
    `- sky blue ${c.skyBlue} (acento)`,
    `- cloud ${c.cloud} (neutro / fundo)`,
    `- preto suave ${c.preto} (fundos profundos)`,
    '',
    `Tipografia: titulos ${f.display}; corpo ${f.body} / ${f.bodyBold}.`,
    'Evite Inter, Roboto, Arial, Calibri e paletas roxo/azul-eletrico de SaaS generico.',
    '',
    'Assets da skill `narrativa-marca` (quando disponivel no container):',
    '- assets/logo_vinho.* em fundo claro; assets/logo_creme.* em fundo escuro',
    '- assets/isotipo_vinho.svg e assets/aspas_*.png / rr_*.png para acentos tateis',
    '- assets/fundo.jpg para capas',
    '',
    'Aplique o visual Narrativa na capa e nos slides/paginas; mantenha o conteudo do cliente intacto.',
  ].join('\n');
}

export default NARRATIVA_BRAND;
