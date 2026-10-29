/**
 * Kit de marca — Estudio Narrativa (tokens canonicos).
 * Espelha skills/narrativa-marca para prompts e UI.
 */

export const NARRATIVA_BRAND = {
  name: 'narrativa',
  displayName: 'Estudio Narrativa',
  colors: {
    cereja: '#B80015',
    laranja: '#DD4E28',
    azulClaro: '#C9D6E2',
    azulJeans: '#8FA9BE',
    marfim: '#F1EDE7',
    offWhite: '#FFF8F0',
    /** Aliases legados (materiais / skill) */
    burntGrape: '#B80015',
    orangeRose: '#DD4E28',
    skyBlue: '#C9D6E2',
    cloud: '#FFF8F0',
    vinho: '#B80015',
    vinhoEscuro: '#8A0010',
    creme: '#FFF8F0',
    coral: '#DD4E28',
    lima: '#C9D6E2',
    preto: '#16070A',
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
    `- cereja ${c.cereja} (primaria)`,
    `- laranja ${c.laranja} (secundaria / accent)`,
    `- azul claro ${c.azulClaro} (superficies suaves)`,
    `- azul jeans ${c.azulJeans} (estrutura / contexto)`,
    `- marfim ${c.marfim} (canvas)`,
    `- off-white ${c.offWhite} (paper / fundo de conteudo)`,
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
