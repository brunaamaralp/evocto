/**
 * Anthropic Messages API + Agent Skills (pptx/docx/pdf) + Files download.
 * Skills exigem code_execution; o loop de tool roda no lado da Anthropic.
 */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_VERSION = '2023-06-01';
const CODE_EXECUTION_TOOL = {
  type: process.env.ANTHROPIC_CODE_EXECUTION_TOOL || 'code_execution_20260521',
  name: 'code_execution',
};

const BUILTIN_SKILL_BY_TIPO = {
  proposta: 'docx',
  apresentacao: 'pptx',
};

/**
 * Resolve skill Anthropic ou custom via env (fase 2).
 * ANTHROPIC_SKILL_PROPOSTA_ID / ANTHROPIC_SKILL_APRESENTACAO_ID
 * ANTHROPIC_SKILL_PROPOSTA_TYPE / ANTHROPIC_SKILL_APRESENTACAO_TYPE = anthropic|custom
 */
export function resolveSkillForTipo(tipo) {
  const key = tipo === 'apresentacao' ? 'APRESENTACAO' : 'PROPOSTA';
  const builtin = BUILTIN_SKILL_BY_TIPO[tipo] || 'docx';
  const skillId =
    String(process.env[`ANTHROPIC_SKILL_${key}_ID`] || '').trim() || builtin;
  const typeRaw = String(process.env[`ANTHROPIC_SKILL_${key}_TYPE`] || '').trim().toLowerCase();
  const type =
    typeRaw === 'custom' || skillId.startsWith('skill_') ? 'custom' : 'anthropic';
  const version =
    String(process.env[`ANTHROPIC_SKILL_${key}_VERSION`] || '').trim() || 'latest';
  return { type, skill_id: skillId, version };
}

/**
 * Skill opcional do kit de marca Narrativa (assets + guidelines).
 * ANTHROPIC_SKILL_MARCA_ID / TYPE / VERSION
 * @returns {{ type: string, skill_id: string, version: string } | null}
 */
export function resolveBrandSkill() {
  const skillId = String(process.env.ANTHROPIC_SKILL_MARCA_ID || '').trim();
  if (!skillId) return null;
  const typeRaw = String(process.env.ANTHROPIC_SKILL_MARCA_TYPE || '').trim().toLowerCase();
  const type =
    typeRaw === 'custom' || skillId.startsWith('skill_') ? 'custom' : 'anthropic';
  const version = String(process.env.ANTHROPIC_SKILL_MARCA_VERSION || '').trim() || 'latest';
  return { type, skill_id: skillId, version };
}

/**
 * Lista de skills do container: documento (+ marca Narrativa se configurada).
 */
export function resolveSkillsForTipo(tipo) {
  const primary = resolveSkillForTipo(tipo);
  const brand = resolveBrandSkill();
  if (!brand || brand.skill_id === primary.skill_id) return [primary];
  return [primary, brand];
}

export function mimeAndExtForTipo(tipo) {
  if (tipo === 'apresentacao') {
    return {
      ext: 'pptx',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }
  const skill = resolveSkillForTipo('proposta');
  if (skill.skill_id === 'pdf' || process.env.ANTHROPIC_SKILL_PROPOSTA_FORMAT === 'pdf') {
    return { ext: 'pdf', mime: 'application/pdf' };
  }
  return {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

function requireApiKey() {
  if (!ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY não configurada');
    err.code = 'anthropic_not_configured';
    throw err;
  }
}

/**
 * Extrai file_ids dos blocos de resultado do code execution / Skills.
 * Cobre formatos atuais e legados da API.
 */
export function extractFileIdsFromMessage(data) {
  const ids = [];
  const seen = new Set();

  const push = (id) => {
    const s = String(id || '').trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    ids.push(s);
  };

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.file_id) push(node.file_id);
    if (node.fileId) push(node.fileId);
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') walk(v);
    }
  };

  walk(data?.content);
  return ids;
}

/**
 * @param {{
 *   skill?: { type: string, skill_id: string, version?: string },
 *   skills?: Array<{ type: string, skill_id: string, version?: string }>,
 *   system?: string,
 *   userContent: string,
 *   model?: string,
 *   max_tokens?: number,
 * }} opts
 */
export async function createMessageWithSkills(opts = {}) {
  requireApiKey();
  const {
    skill,
    skills: skillsOpt,
    system,
    userContent,
    model = process.env.ANTHROPIC_MATERIAL_MODEL ||
      process.env.ANTHROPIC_AGENT_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      'claude-sonnet-4-6',
    max_tokens = 16000,
  } = opts;

  const skillsList = Array.isArray(skillsOpt) && skillsOpt.length
    ? skillsOpt
    : skill
      ? [skill]
      : [];
  if (!skillsList.length || !skillsList[0]?.skill_id) {
    throw new Error('skill.skill_id obrigatório');
  }
  if (!userContent) {
    throw new Error('userContent obrigatório');
  }

  const body = {
    model,
    max_tokens,
    container: {
      skills: skillsList.map((s) => ({
        type: s.type === 'custom' ? 'custom' : 'anthropic',
        skill_id: s.skill_id,
        version: s.version || 'latest',
      })),
    },
    tools: [CODE_EXECUTION_TOOL],
    messages: [{ role: 'user', content: userContent }],
  };
  if (system) body.system = system;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || data?.error || `anthropic_http_${response.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'anthropic_error');
    err.status = response.status;
    err.code = 'anthropic_error';
    err.details = data;
    throw err;
  }

  return data;
}

/**
 * GET /v1/files/{file_id}/content
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
export async function downloadAnthropicFile(fileId) {
  requireApiKey();
  const id = String(fileId || '').trim();
  if (!id) throw new Error('file_id obrigatório');

  const response = await fetch(`https://api.anthropic.com/v1/files/${id}/content`, {
    method: 'GET',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err = new Error(text || `anthropic_files_http_${response.status}`);
    err.status = response.status;
    err.code = 'anthropic_files_error';
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Gera documento via Skill e devolve o último arquivo criado.
 */
export async function generateMaterialFile({
  tipo,
  system,
  userContent,
  preferredExt,
} = {}) {
  const skills = resolveSkillsForTipo(tipo);
  const skill = skills[0];
  const message = await createMessageWithSkills({ skills, system, userContent });
  const fileIds = extractFileIdsFromMessage(message);
  if (!fileIds.length) {
    const err = new Error('A IA não retornou arquivo gerado');
    err.code = 'anthropic_no_file';
    err.details = { stop_reason: message?.stop_reason, content_types: (message?.content || []).map((b) => b?.type) };
    throw err;
  }

  const fileId = fileIds[fileIds.length - 1];
  const { buffer, contentType } = await downloadAnthropicFile(fileId);
  const { ext, mime } = mimeAndExtForTipo(tipo);
  return {
    buffer,
    fileId,
    contentType: contentType || mime,
    ext: preferredExt || ext,
    mime,
    skill,
    skills,
    brandSkill: skills.find((s) => s !== skill) || null,
    messageId: message?.id || null,
  };
}

export default {
  resolveSkillForTipo,
  resolveBrandSkill,
  resolveSkillsForTipo,
  mimeAndExtForTipo,
  extractFileIdsFromMessage,
  createMessageWithSkills,
  downloadAnthropicFile,
  generateMaterialFile,
};
