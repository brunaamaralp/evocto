/**
 * Smoke test P1 — mock de geração + apply no payload anual.
 * node scripts/test-campanha-anual-ia.mjs
 */
import {
  DEFAULT_CICLOS_COMERCIAIS,
  buildCampanhaAnualBriefPayload,
  applyGeracaoIaToAnual,
  buildInputIaFromAnual,
  validateGeracaoIaOutput,
} from '../src/lib/campanhaAnualSchema.js';
import { buildMockGeracaoFromInput } from '../src/lib/campanhaAnualMock.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const empresa = {
  id: 'emp1',
  nome: 'MALU',
  publico_alvo: 'Mulheres 25-45',
  tom_brand: 'Warm',
  formato_padrao: { num_videos: 5, num_designs: 2, duracao_videos: '30-45s' },
  orcamento_padrao_mensal: 2500,
  restricoes_criativas: 'Sem atores',
  produtos_linhas: [
    { nome: 'Premium', preco_faixa: { min: 300, max: 400 }, margem: 60 },
    { id: 'classica', nome: 'Clássica', preco_faixa: { min: 120, max: 180 }, margem: 45 },
  ],
};

const input = buildInputIaFromAnual({
  empresa,
  ciclos_comerciais: DEFAULT_CICLOS_COMERCIAIS,
  ano: 2026,
});

const mock = buildMockGeracaoFromInput(input);
assert(mock.campanhas.length === 12, '12 campanhas mock');
assert(mock.campanhas[0]['01_estrategia'].objetivo, 'dim estrategia');
assert(mock.campanhas[1].ciclo_comercial === 'vendas', 'fev vendas');

const val = validateGeracaoIaOutput(mock, DEFAULT_CICLOS_COMERCIAIS);
assert(val.valid, `validação: ${JSON.stringify(val.errors)}`);

const brief = buildCampanhaAnualBriefPayload({
  agencyId: 'a',
  clientId: 'c',
  empresa,
  ano: 2026,
  ciclos_comerciais: DEFAULT_CICLOS_COMERCIAIS,
});

const applied = applyGeracaoIaToAnual(brief, mock, { model: 'mock' });
assert(applied.status_anual === 'ia_gerou', applied.status_anual);
assert(applied.campanhas[0].nome_campanha, 'nome após apply');
assert(applied.geracao.model === 'mock', 'model');

console.log('OK campanhaAnualIa smoke test');
