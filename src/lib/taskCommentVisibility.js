/**
 * Visibilidade de comentários de tarefa (payload JSON — sem coluna tipada).
 * Default conservador: interno (não destinado ao cliente).
 */

export const COMMENT_VISIBILITY = Object.freeze({
  INTERNAL: 'internal',
  CLIENT: 'client',
});

/**
 * @param {object|null|undefined} comment
 * @returns {'internal'|'client'}
 */
export function getCommentVisibility(comment) {
  const explicit = String(comment?.visibility || '')
    .toLowerCase()
    .trim();
  if (
    explicit === 'client' ||
    explicit === 'cliente' ||
    explicit === 'external'
  ) {
    return COMMENT_VISIBILITY.CLIENT;
  }
  if (explicit === 'internal' || explicit === 'interno') {
    return COMMENT_VISIBILITY.INTERNAL;
  }
  if (comment?.clientVisible === true) {
    return COMMENT_VISIBILITY.CLIENT;
  }
  return COMMENT_VISIBILITY.INTERNAL;
}

/**
 * @param {object} comment
 * @param {'internal'|'client'} visibility
 */
export function withCommentVisibility(comment, visibility) {
  const next =
    visibility === COMMENT_VISIBILITY.CLIENT
      ? COMMENT_VISIBILITY.CLIENT
      : COMMENT_VISIBILITY.INTERNAL;
  return {
    ...comment,
    visibility: next,
    clientVisible: next === COMMENT_VISIBILITY.CLIENT,
  };
}

/**
 * Filtra comentários para superfície cliente (portal).
 * Sistema/histórico interno nunca vazam.
 * @param {object[]} comments
 */
export function filterCommentsForClient(comments = []) {
  return (Array.isArray(comments) ? comments : []).filter((c) => {
    if (!c || c.type === 'system') return false;
    return getCommentVisibility(c) === COMMENT_VISIBILITY.CLIENT;
  });
}
