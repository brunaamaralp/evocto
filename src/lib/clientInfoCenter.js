/**
 * Resumo da "Central do cliente" para a Visão Geral.
 * Não inclui plaintext de senhas nem preview de notas (podem conter dados sensíveis).
 */

const GENERAL_NOTES_FIELD = 'acessos_info_geral';

function docDate(doc) {
  const raw =
    doc?.updated_date ||
    doc?.created_date ||
    doc?.uploadedAt ||
    doc?.$updatedAt ||
    doc?.$createdAt ||
    null;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : 0;
}

/**
 * @param {object} opts
 * @param {object[]} [opts.documents]
 * @param {object[]} [opts.accesses] — DTOs de list (com hasPassword, sem senha)
 * @param {string} [opts.generalNotes]
 * @param {object} [opts.client] — fallback de notas via acessos_info_geral
 * @param {object[]} [opts.learnings]
 * @param {number} [opts.recentLimit]
 */
export function deriveClientInfoCenter({
  documents = [],
  accesses = [],
  generalNotes = '',
  client = null,
  learnings = [],
  recentLimit = 3,
} = {}) {
  const docs = Array.isArray(documents) ? documents.filter((d) => d?.id) : [];
  const accessList = Array.isArray(accesses) ? accesses.filter((a) => a?.id) : [];
  const learningList = Array.isArray(learnings) ? learnings.filter((l) => l?.id) : [];

  const notesFromApi = String(generalNotes ?? '').trim();
  const notesFromClient = String(
    client?.[GENERAL_NOTES_FIELD] ?? client?.generalNotes ?? ''
  ).trim();
  const notesText = notesFromApi || notesFromClient;

  const recentDocuments = [...docs]
    .sort((a, b) => docDate(b) - docDate(a))
    .slice(0, Math.max(0, recentLimit))
    .map((doc) => ({
      id: doc.id,
      title: String(doc.title || doc.fileName || 'Documento').trim() || 'Documento',
      group: doc.group || doc.category || null,
      created_date: doc.created_date || doc.uploadedAt || null,
    }));

  return {
    documentsCount: docs.length,
    accessesCount: accessList.length,
    accessesWithPassword: accessList.filter((a) => Boolean(a.hasPassword)).length,
    learningsCount: learningList.length,
    hasNotes: notesText.length > 0,
    recentDocuments,
  };
}

export { GENERAL_NOTES_FIELD as CLIENT_INFO_NOTES_FIELD };
