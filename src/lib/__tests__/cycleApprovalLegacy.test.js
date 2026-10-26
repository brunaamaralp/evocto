import { describe, it, expect } from 'vitest';
import {
  canStaffMutateLegacyCycleApproval,
  resolveCycleApprovalEntryMode,
  staffCycleApprovalHref,
} from '../cycleApprovalLegacy.js';

describe('cycleApprovalLegacy', () => {
  it('maps staff href without public token', () => {
    const href = staffCycleApprovalHref('c1', (p) => `/${p}`);
    expect(href).toBe('/cycle-approval?id=c1');
    expect(href).not.toContain('token=');
  });

  it('resolves entry modes', () => {
    expect(resolveCycleApprovalEntryMode({ id: 'c1' }).mode).toBe('staff_id');
    expect(resolveCycleApprovalEntryMode({ token: 'tok' }).mode).toBe('legacy_token');
    expect(resolveCycleApprovalEntryMode({}).mode).toBe('invalid');
  });

  it('blocks client role and cross-agency staff', () => {
    expect(
      canStaffMutateLegacyCycleApproval(
        { role: 'client', agencyId: 'ag1' },
        { agencyId: 'ag1' }
      )
    ).toBe(false);
    expect(
      canStaffMutateLegacyCycleApproval(
        { role: 'admin', agencyId: 'ag1' },
        { agencyId: 'ag2' }
      )
    ).toBe(false);
    expect(
      canStaffMutateLegacyCycleApproval(
        { role: 'admin', agencyId: 'ag1' },
        { agencyId: 'ag1' }
      )
    ).toBe(true);
  });
});
