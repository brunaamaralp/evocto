/**
 * Least-privilege file permissions for Appwrite Storage uploads.
 * Prefer agency team + uploader; never fall back to Role.users() for agency files.
 */

/**
 * @param {{ agencyId?: string, userId?: string }} opts
 * @param {{ Permission: object, Role: object }} sdk
 * @returns {string[]}
 */
export function buildStorageUploadPermissions({ agencyId = '', userId = '' } = {}, sdk) {
  const { Permission, Role } = sdk || {};
  if (!Permission || !Role) {
    throw new Error('SDK (Permission/Role) obrigatório');
  }

  const tid = String(agencyId || '').trim();
  const uid = String(userId || '').trim();
  const perms = [];

  if (tid) {
    perms.push(
      Permission.read(Role.team(tid)),
      Permission.update(Role.team(tid)),
      Permission.delete(Role.team(tid))
    );
  }
  if (uid) {
    perms.push(
      Permission.read(Role.user(uid)),
      Permission.update(Role.user(uid)),
      Permission.delete(Role.user(uid))
    );
  }

  if (perms.length === 0) {
    throw new Error(
      'Não foi possível definir permissões de arquivo (agencyId/userId ausentes)'
    );
  }
  return perms;
}
