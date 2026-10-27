/**
 * Extrai o fileId de um id cru ou de uma URL do Appwrite Storage.
 * Aceita .../files/{id}/view|download|preview e ids sem slash.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function extractAppwriteFileId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  // Preferir path canônico: /storage/buckets/{bucket}/files/{fileId}/…
  // (bucket id "files" também contém /files/ — não usar o primeiro match genérico)
  const fromStorage = raw.match(
    /\/storage\/buckets\/[^/?#]+\/files\/([^/?#]+)/i
  );
  if (fromStorage?.[1]) {
    try {
      return decodeURIComponent(fromStorage[1]);
    } catch {
      return fromStorage[1];
    }
  }

  const fromPath = raw.match(/\/files\/([^/?#]+)(?:\/(?:view|download|preview))?(?:[?#]|$)/i);
  if (fromPath?.[1] && fromPath[1].toLowerCase() !== 'files') {
    try {
      return decodeURIComponent(fromPath[1]);
    } catch {
      return fromPath[1];
    }
  }

  // Id direto (sem URL)
  if (!/[/?#]/.test(raw) && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(raw)) {
    return raw;
  }

  return '';
}
