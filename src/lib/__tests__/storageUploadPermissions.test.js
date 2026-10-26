import { describe, it, expect } from 'vitest';
import { buildStorageUploadPermissions } from '../storageUploadPermissions.js';

const Permission = {
  read: (r) => `read(${r})`,
  update: (r) => `update(${r})`,
  delete: (r) => `delete(${r})`,
};
const Role = {
  team: (id) => `team:${id}`,
  user: (id) => `user:${id}`,
  users: () => 'users',
};

describe('storageUploadPermissions', () => {
  it('scopes files to agency team + uploader', () => {
    const perms = buildStorageUploadPermissions(
      { agencyId: 'ag1', userId: 'u1' },
      { Permission, Role }
    );
    const joined = perms.join(' ');
    expect(joined).toContain('team:ag1');
    expect(joined).toContain('user:u1');
    expect(joined).not.toContain('users');
  });

  it('allows uploader-only when agency missing', () => {
    const perms = buildStorageUploadPermissions(
      { userId: 'u1' },
      { Permission, Role }
    );
    expect(perms.join(' ')).toContain('user:u1');
    expect(perms.join(' ')).not.toMatch(/\busers\b/);
  });

  it('fails closed without agency or user', () => {
    expect(() =>
      buildStorageUploadPermissions({}, { Permission, Role })
    ).toThrow(/permissões/);
  });
});
