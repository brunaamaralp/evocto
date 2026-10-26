import { describe, it, expect } from 'vitest';
import {
  buildAgencyTeamRowPermissions,
  buildPublicBriefingTableCreatePerms,
} from '../publicBriefingPermissions.js';

const Permission = {
  read: (r) => `read(${r})`,
  update: (r) => `update(${r})`,
  delete: (r) => `delete(${r})`,
  create: (r) => `create(${r})`,
};
const Role = {
  team: (id) => `team:${id}`,
  users: () => 'users',
  any: () => 'any',
};

describe('publicBriefingPermissions', () => {
  it('grants only agency team on rows (no Role.any)', () => {
    const perms = buildAgencyTeamRowPermissions('ag1', { Permission, Role });
    expect(perms.join(' ')).toContain('team:ag1');
    expect(perms.join(' ')).not.toContain('any');
  });

  it('rejects missing agencyId', () => {
    expect(() => buildAgencyTeamRowPermissions('', { Permission, Role })).toThrow(/agencyId/);
  });

  it('table create perms are users-create only', () => {
    const perms = buildPublicBriefingTableCreatePerms({ Permission, Role });
    expect(perms).toEqual(['create(users)']);
    expect(perms.join(' ')).not.toContain('any');
  });
});
