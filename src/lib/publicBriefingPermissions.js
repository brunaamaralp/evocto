/**
 * Row ACLs for public briefing artifacts.
 * Public guests must use /api/public-briefing (admin key) — never Role.any().
 */

/**
 * @param {string} agencyId
 * @param {{ Permission: { read: Function, update: Function, delete: Function }, Role: { team: Function } }} sdk
 * @returns {string[]}
 */
export function buildAgencyTeamRowPermissions(agencyId, sdk) {
  const { Permission, Role } = sdk || {};
  const tid = String(agencyId || '').trim();
  if (!tid || !Permission || !Role) {
    throw new Error('agencyId e SDK (Permission/Role) são obrigatórios');
  }
  return [
    Permission.read(Role.team(tid)),
    Permission.update(Role.team(tid)),
    Permission.delete(Role.team(tid)),
  ];
}

/**
 * Table-level defaults for NEW setups only.
 * Do not apply to production without an approved migration/rollback plan.
 * @param {{ Permission: { create: Function }, Role: { users: Function } }} sdk
 */
export function buildPublicBriefingTableCreatePerms(sdk) {
  const { Permission, Role } = sdk || {};
  if (!Permission || !Role) {
    throw new Error('SDK (Permission/Role) obrigatório');
  }
  // Staff authenticated users may create rows; read/update only via row ACL or API key.
  return [Permission.create(Role.users())];
}
