import { Empresa, AuditLog } from '@/api/entities';
import { normalizeProdutosLinhas } from '@/lib/campanhaAnualSchema';

export const EMPTY_FORMATO = {
  num_videos: 5,
  num_designs: 2,
  duracao_videos: '30-45s',
};

export const EMPTY_EMPRESA_FORM = {
  nome: '',
  publico_alvo: '',
  formato_padrao: { ...EMPTY_FORMATO },
  orcamento_padrao_mensal: '',
  tom_brand: '',
  restricoes_criativas: '',
  produtos_linhas: [],
  brand_guidelines: null,
};

export function normalizeFormato(formato = {}) {
  return {
    num_videos: Number(formato?.num_videos) || 0,
    num_designs: Number(formato?.num_designs) || 0,
    duracao_videos: String(formato?.duracao_videos || '').trim() || EMPTY_FORMATO.duracao_videos,
  };
}

export function empresaToForm(empresa, clientName = '') {
  if (!empresa) {
    return {
      ...EMPTY_EMPRESA_FORM,
      nome: clientName || '',
      formato_padrao: { ...EMPTY_FORMATO },
      produtos_linhas: [],
    };
  }
  return {
    nome: empresa.nome || clientName || '',
    publico_alvo: empresa.publico_alvo || '',
    formato_padrao: normalizeFormato(empresa.formato_padrao || EMPTY_FORMATO),
    orcamento_padrao_mensal:
      empresa.orcamento_padrao_mensal != null ? Number(empresa.orcamento_padrao_mensal) : '',
    tom_brand: empresa.tom_brand || '',
    restricoes_criativas: empresa.restricoes_criativas || '',
    produtos_linhas: normalizeProdutosLinhas(empresa.produtos_linhas),
    brand_guidelines: empresa.brand_guidelines || null,
  };
}

export function validateEmpresaForm(form) {
  const errors = {};
  const nome = String(form.nome || '').trim();
  const publico = String(form.publico_alvo || '').trim();
  const tom = String(form.tom_brand || '').trim();
  const orcamento = Number(form.orcamento_padrao_mensal);
  const videos = Number(form.formato_padrao?.num_videos);
  const designs = Number(form.formato_padrao?.num_designs);
  const duracao = String(form.formato_padrao?.duracao_videos || '').trim();

  if (!nome) errors.nome = 'Nome obrigatório';
  if (!publico) errors.publico_alvo = 'Público-alvo obrigatório';
  if (!tom) errors.tom_brand = 'Tom de marca obrigatório';
  if (!Number.isFinite(orcamento) || orcamento <= 0) {
    errors.orcamento_padrao_mensal = 'Orçamento deve ser um número positivo';
  }
  if (!Number.isFinite(videos) || videos < 0) {
    errors.num_videos = 'Número de vídeos inválido';
  }
  if (!Number.isFinite(designs) || designs < 0) {
    errors.num_designs = 'Número de designs inválido';
  }
  if (!duracao) errors.duracao_videos = 'Duração obrigatória';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isEmpresaFormComplete(form) {
  return validateEmpresaForm(form).valid;
}

export async function getEmpresaByClientId(clientId, agencyId) {
  if (!clientId) return null;
  const filter = agencyId ? { clientId, agencyId } : { clientId };
  const rows = await Empresa.filter(filter).catch(() => []);
  return rows?.[0] || null;
}

export function configFromEmpresa(empresa) {
  if (!empresa) return null;
  return {
    publico_alvo: empresa.publico_alvo || '',
    formato: normalizeFormato(empresa.formato_padrao || EMPTY_FORMATO),
    orcamento: Number(empresa.orcamento_padrao_mensal) || 0,
    tom_brand: empresa.tom_brand || '',
    restricoes_criativas: empresa.restricoes_criativas || '',
    produtos_linhas: normalizeProdutosLinhas(empresa.produtos_linhas),
  };
}

export function formatOrcamento(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatFormatoLabel(formato) {
  const f = normalizeFormato(formato);
  return `${f.num_videos} vídeos + ${f.num_designs} designs (${f.duracao_videos})`;
}

export async function writeEmpresaAudit({
  agencyId,
  entityId,
  action,
  actorId,
  before = null,
  after = null,
}) {
  try {
    await AuditLog.create({
      agencyId,
      entity_type: 'Empresa',
      entity_id: entityId,
      action,
      actor_id: actorId || null,
      meta_json: { before, after },
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('AuditLog Empresa falhou:', err?.message || err);
  }
}

export async function saveEmpresa({
  empresaId,
  agencyId,
  clientId,
  form,
  userId,
}) {
  const { valid, errors } = validateEmpresaForm(form);
  if (!valid) {
    const err = new Error('Validação falhou');
    err.errors = errors;
    throw err;
  }

  const payload = {
    agencyId,
    clientId,
    nome: String(form.nome).trim(),
    publico_alvo: String(form.publico_alvo).trim(),
    formato_padrao: normalizeFormato(form.formato_padrao),
    orcamento_padrao_mensal: Number(form.orcamento_padrao_mensal),
    tom_brand: String(form.tom_brand).trim(),
    restricoes_criativas: String(form.restricoes_criativas || '').trim(),
    produtos_linhas: normalizeProdutosLinhas(form.produtos_linhas),
    brand_guidelines: form.brand_guidelines || null,
  };

  if (empresaId) {
    const before = await Empresa.get(empresaId).catch(() => null);
    const updated = await Empresa.update(empresaId, {
      ...payload,
      editado_em: new Date().toISOString(),
      editado_por: userId || null,
    });
    await writeEmpresaAudit({
      agencyId,
      entityId: empresaId,
      action: 'update',
      actorId: userId,
      before,
      after: updated,
    });
    return updated;
  }

  const created = await Empresa.create({
    ...payload,
    criado_em: new Date().toISOString(),
    criado_por: userId || null,
    editado_em: null,
    editado_por: null,
  });
  await writeEmpresaAudit({
    agencyId,
    entityId: created.id,
    action: 'create',
    actorId: userId,
    before: null,
    after: created,
  });
  return created;
}
